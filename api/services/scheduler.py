import asyncio
import json
import time
import uuid
from pathlib import Path
from typing import Callable, Optional, Awaitable

from .executor import ExecutorService
from .crypto import encrypt_key, decrypt_key
from ..config import settings
from ..models import ScheduleRequest, ScheduledMint

SCHEDULES_FILE = Path.home() / ".mintobaby" / "schedules.json"
PERSISTED_STATUSES = {"armed", "firing", "done", "failed"}


def read_records() -> list[dict]:
    if not SCHEDULES_FILE.exists():
        return []
    try:
        return json.loads(SCHEDULES_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []


def write_records(records: list[dict]) -> None:
    SCHEDULES_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = SCHEDULES_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(records, indent=2), encoding="utf-8")
    tmp.replace(SCHEDULES_FILE)


def claim_for_execution(sched_id: str) -> bool:
    """
    Cross-process compare-and-swap: flip an armed schedule to firing in the
    shared file. Whoever wins the claim executes; everyone else skips. This
    keeps the API server and a terminal daemon from double-minting.
    """
    records = read_records()
    for record in records:
        if record.get("id") == sched_id and record.get("status") == "armed":
            record["status"] = "firing"
            record["claimed_at"] = time.time()
            write_records(records)
            return True
    return False


class SchedulerService:
    def __init__(
        self,
        executor_factory: Callable[[str], ExecutorService],
        telegram_notify: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        self.executor_factory = executor_factory
        self.telegram_notify = telegram_notify
        self._schedules: dict[str, ScheduledMint] = {}
        self._keys: dict[str, str] = {}          # in-memory private keys by schedule id
        self._tasks: dict[str, asyncio.Task] = {}
        self._load_persisted()

    # ------------------------------------------------------------------
    # Persistence — armed schedules survive restarts and are shared with
    # the terminal daemon via ~/.mintobaby/schedules.json. Keys are stored
    # AES-256-GCM encrypted with the configured encryption secret.
    # ------------------------------------------------------------------

    def _load_persisted(self):
        records = read_records()
        for record in records:
            try:
                mint = ScheduledMint(**{k: v for k, v in record.items() if k != "enc"})
            except Exception:
                continue
            self._schedules[mint.id] = mint
            enc = record.get("enc")
            if not enc:
                continue
            try:
                self._keys[mint.id] = decrypt_key(enc["encrypted_key"], enc["iv"], enc["tag"], settings.encryption_secret)
            except Exception:
                self._keys[mint.id] = ""

    def _persist(self):
        records = []
        for mint in self._schedules.values():
            record = mint.model_dump()
            key = self._keys.get(mint.id)
            if key:
                record["enc"] = encrypt_key(key, settings.encryption_secret)
            records.append(record)
        write_records(records)

    def _update(self, sched_id: str, **changes):
        mint = self._schedules.get(sched_id)
        if not mint:
            return
        for field, value in changes.items():
            setattr(mint, field, value)
        self._persist()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def schedule(self, req: ScheduleRequest) -> ScheduledMint:
        sched_id = str(uuid.uuid4())
        mint = ScheduledMint(
            id=sched_id,
            contract=req.contract,
            network=req.network,
            quantity=req.quantity,
            value_native=req.value_native,
            mint_time_ms=req.mint_time_ms,
            status="armed",
        )
        if req.network == "solana":
            mint.status = "failed"
            mint.error = "Solana scheduling is not implemented yet; no transaction will be signed."
            self._schedules[sched_id] = mint
            self._persist()
            return mint
        self._schedules[sched_id] = mint
        self._keys[sched_id] = req.private_key
        self._persist()
        task = asyncio.create_task(self._run(sched_id))
        self._tasks[sched_id] = task
        return mint

    def arm_persisted(self, sched_id: str) -> bool:
        """(Re-)arm a persisted schedule after a restart."""
        mint = self._schedules.get(sched_id)
        if not mint or mint.status != "armed" or not self._keys.get(sched_id):
            return False
        if mint.mint_time_ms < time.time() * 1000 - 60_000:
            self._update(sched_id, status="failed", error="Missed while the engine was offline.")
            return False
        if mint.id in self._tasks and not self._tasks[mint.id].done():
            return True
        self._tasks[sched_id] = asyncio.create_task(self._run(sched_id))
        return True

    def arm_due_after_restart(self):
        """Resume every armed schedule whose key is available."""
        for sched_id in list(self._schedules):
            self.arm_persisted(sched_id)

    def sync_from_file(self) -> list[str]:
        """Import schedule records added by another process (CLI/API/daemon)."""
        new_ids = []
        for record in read_records():
            sched_id = record.get("id")
            if not sched_id or sched_id in self._schedules:
                continue
            try:
                mint = ScheduledMint(**{k: v for k, v in record.items() if k != "enc"})
            except Exception:
                continue
            self._schedules[sched_id] = mint
            enc = record.get("enc")
            if enc:
                try:
                    self._keys[sched_id] = decrypt_key(enc["encrypted_key"], enc["iv"], enc["tag"], settings.encryption_secret)
                except Exception:
                    self._keys[sched_id] = ""
            new_ids.append(sched_id)
        return new_ids

    def _executor_for(self, sched_id: str) -> ExecutorService:
        return self.executor_factory(self._schedules[sched_id].network)

    def list_schedules(self) -> list[ScheduledMint]:
        return list(self._schedules.values())

    def cancel(self, sched_id: str) -> bool:
        task = self._tasks.get(sched_id)
        if task and not task.done():
            task.cancel()
        if sched_id in self._schedules:
            del self._schedules[sched_id]
            self._keys.pop(sched_id, None)
            self._tasks.pop(sched_id, None)
            self._persist()
            return True
        return False

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    async def _run(self, sched_id: str):
        mint = self._schedules.get(sched_id)
        if not mint:
            return
        private_key = self._keys.get(sched_id, "")
        if not private_key:
            self._update(sched_id, status="failed", error="No stored wallet key for this schedule.")
            return

        target_ms  = mint.mint_time_ms
        target_sec = target_ms / 1000.0

        # Phase 1: sleep until T-10s
        now = time.time()
        sleep_sec = target_sec - now - 10
        if sleep_sec > 0:
            await asyncio.sleep(sleep_sec)

        # Phase 2: 50ms strike loop
        while True:
            now = time.time()
            if now >= target_sec:
                break
            await asyncio.sleep(0.05)

        # Cross-process claim: skip if another engine already took this target.
        if not claim_for_execution(sched_id):
            return

        # Fire
        self._update(sched_id, status="firing")

        async def on_broadcast(tx_hash: str, fn: str):
            self._update(sched_id, tx_hash=tx_hash)
            await self._notify(
                f"📡 AUTO-MINT TX SENT!\n"
                f"Contract: {mint.contract}\n"
                f"Function: {fn}\n"
                f"Hash: {tx_hash}"
            )

        result = await self._executor_for(sched_id).execute_mint(
            private_key=private_key,
            contract=mint.contract,
            quantity=mint.quantity,
            value_eth=mint.value_native,
            on_broadcast=on_broadcast,
        )

        if result.success:
            self._update(
                sched_id,
                status="done",
                tx_hash=result.tx_hash,
                error=None,
            )
            await self._notify(
                f"🎉 MINT CONFIRMED!\n"
                f"Contract: {mint.contract}\n"
                f"TX: {result.tx_hash}\n"
                f"Block: {result.block_number} | Gas: {result.gas_used}"
            )
        else:
            self._update(sched_id, status="failed", tx_hash=result.tx_hash, error=result.error)
            await self._notify(f"❌ MINT FAILED\nContract: {mint.contract}\nError: {result.error}")

    async def _notify(self, msg: str):
        if self.telegram_notify:
            try:
                await self.telegram_notify(msg)
            except Exception:
                pass

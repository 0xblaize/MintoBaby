import asyncio
import time
import uuid
from typing import Callable, Optional, Awaitable

from .executor import ExecutorService
from ..models import ScheduleRequest, ScheduledMint


class SchedulerService:
    def __init__(
        self,
        executor_factory: Callable[[str], ExecutorService],
        telegram_notify: Optional[Callable[[str], Awaitable[None]]] = None,
    ):
        self.executor_factory = executor_factory
        self.telegram_notify = telegram_notify
        self._schedules: dict[str, ScheduledMint] = {}
        self._tasks:     dict[str, asyncio.Task]   = {}

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
            return mint
        self._schedules[sched_id] = mint
        task = asyncio.create_task(self._run(sched_id, req.private_key))
        self._tasks[sched_id] = task
        return mint

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
            return True
        return False

    async def _run(self, sched_id: str, private_key: str):
        mint = self._schedules.get(sched_id)
        if not mint:
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

        # Fire
        self._schedules[sched_id].status = "firing"

        async def on_broadcast(tx_hash: str, fn: str):
            self._schedules[sched_id].tx_hash = tx_hash
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
            value_native=mint.value_native,
            on_broadcast=on_broadcast,
        )

        if result.success:
            self._schedules[sched_id].status   = "done"
            self._schedules[sched_id].tx_hash  = result.tx_hash
            await self._notify(
                f"🎉 MINT CONFIRMED!\n"
                f"Contract: {mint.contract}\n"
                f"TX: {result.tx_hash}\n"
                f"Block: {result.block_number} | Gas: {result.gas_used}"
            )
        else:
            self._schedules[sched_id].status = "failed"
            self._schedules[sched_id].error  = result.error
            await self._notify(f"❌ MINT FAILED\nContract: {mint.contract}\nError: {result.error}")

    async def _notify(self, msg: str):
        if self.telegram_notify:
            try:
                await self.telegram_notify(msg)
            except Exception:
                pass

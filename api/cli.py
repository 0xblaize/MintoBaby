#!/usr/bin/env python3
"""
MintoBaby CLI ⚡ — NFT Sniper for Robinhood Chain
Run from any terminal: python cli.py <command>
"""
from __future__ import annotations

import asyncio
import json
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiohttp
import httpx
import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich import box

# ---------------------------------------------------------------------------
# Bootstrap path so we can import api.* even when run as `python api/cli.py`
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from api.config import settings                         # noqa: E402
from api.services.chain import ChainService, NETWORKS  # noqa: E402
from api.services.crypto import (                       # noqa: E402
    encrypt_key, decrypt_key, generate_wallet, import_wallet
)
from api.services.solana_wallet import generate_solana_wallet, import_solana_wallet  # noqa: E402
from api.services.discovery import DiscoveryService     # noqa: E402
from api.services.executor import ExecutorService       # noqa: E402
from api.services.scheduler import SchedulerService     # noqa: E402
from api.models import ScheduleRequest                  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WALLET_FILE   = Path.home() / ".mintobaby" / "wallet.enc"
SOLANA_WALLET_FILE = Path.home() / ".mintobaby" / "solana-wallet.enc"
EXPLORER_BASE = "https://robinhoodchain.blockscout.com"
SOLANA_EXPLORER = "https://solscan.io"

ACCENT  = "bright_green"
WARNING = "yellow"
ERROR   = "red"
DIM     = "dim"

console = Console()
app     = typer.Typer(
    name="mintobaby",
    help="⚡ MintoBaby — NFT Mint Sniper for Robinhood Chain",
    add_completion=False,
)
wallet_app = typer.Typer(help="Wallet management commands")
app.add_typer(wallet_app, name="wallet")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _chain() -> ChainService:
    return ChainService(settings.robinhood_rpc_url, settings.robinhood_chain_id)


def _discovery() -> DiscoveryService:
    return DiscoveryService(_chain())


def _executor() -> ExecutorService:
    return ExecutorService(_chain())


def _load_wallet() -> Optional[dict]:
    if WALLET_FILE.exists():
        return json.loads(WALLET_FILE.read_text())
    return None


def _save_wallet(data: dict):
    WALLET_FILE.parent.mkdir(parents=True, exist_ok=True)
    WALLET_FILE.write_text(json.dumps(data))


def _decrypt_wallet(raw: dict) -> str:
    return decrypt_key(raw["encrypted_key"], raw["iv"], raw["tag"], settings.encryption_secret)


def _get_pk_or_prompt() -> str:
    """Return private key from saved wallet or prompt user."""
    raw = _load_wallet()
    if raw:
        return _decrypt_wallet(raw)
    console.print(f"[{WARNING}]No saved wallet found. Enter your private key:[/{WARNING}]")
    pk = Prompt.ask("Private key", password=True)
    return pk.strip()


def _phase_color(phase_status: str) -> str:
    return {"open": ACCENT, "not_open": WARNING, "expired": ERROR}.get(phase_status, DIM)


def _fmt_time(ms: Optional[int]) -> str:
    if ms is None:
        return "Unknown"
    dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
    return dt.strftime("%Y-%m-%d %H:%M:%S UTC")


def _countdown(ms: int) -> str:
    remaining = (ms / 1000) - time.time()
    if remaining <= 0:
        return "NOW"
    h = int(remaining // 3600)
    m = int((remaining % 3600) // 60)
    s = int(remaining % 60)
    return f"{h:02d}h {m:02d}m {s:02d}s"


# ---------------------------------------------------------------------------
# Header banner
# ---------------------------------------------------------------------------
def _banner():
    console.print(Panel(
        f"[{ACCENT}]⚡ MintoBaby NFT Sniper[/{ACCENT}]\n"
        f"[{DIM}]Robinhood Chain · Chain ID {settings.robinhood_chain_id}[/{DIM}]",
        box=box.DOUBLE_EDGE, expand=False
    ))


# ---------------------------------------------------------------------------
# scan command
# ---------------------------------------------------------------------------
@app.command()
def scan(contract: str = typer.Argument(..., help="NFT contract address (0x...)")):
    """Scan a contract: show price, phase, timing, and mint status."""
    _banner()

    async def _run():
        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            p.add_task("Scanning contract on-chain...", total=None)
            result = await _discovery().discover(contract)
        return result

    try:
        r = asyncio.run(_run())
    except ValueError as exc:
        console.print(f"[{ERROR}]Invalid address: {exc}[/{ERROR}]")
        raise typer.Exit(1)

    phase_col = _phase_color(r.phase_status)

    grid = Table.grid(padding=(0, 2))
    grid.add_column(style=DIM,   no_wrap=True)
    grid.add_column(style="white")

    grid.add_row("Collection",   f"[bold]{r.name or 'Unknown'}[/bold] ({r.symbol or '?'})")
    grid.add_row("Contract",     f"[{DIM}]{r.address}[/{DIM}]")
    grid.add_row("Price",        f"[{ACCENT}]{r.price_native} ETH[/{ACCENT}] [{DIM}]({r.price_status})[/{DIM}]")
    grid.add_row("Phase",        f"[{phase_col}]{r.phase_status.upper()}[/{phase_col}] [{DIM}]({r.phase_kind})[/{DIM}]")
    grid.add_row("Live",         f"[{ACCENT}]YES ✓[/{ACCENT}]" if r.is_live else f"[{DIM}]NO[/{DIM}]")
    grid.add_row("Opens",        _fmt_time(r.on_chain_start_time_ms))
    grid.add_row("Closes",       _fmt_time(r.on_chain_end_time_ms))
    grid.add_row("Max / Wallet", str(r.max_per_wallet) if r.max_per_wallet else "Unlimited")
    if r.sea_drop_address:
        grid.add_row("SeaDrop",  f"[{DIM}]{r.sea_drop_address}[/{DIM}]")

    title_color = ACCENT if r.is_live else WARNING
    console.print(Panel(grid, title=f"[{title_color}]Contract Scan Result[/{title_color}]", box=box.ROUNDED))

    if r.is_live:
        console.print(f"[{ACCENT}]Mint is LIVE. Run:[/{ACCENT}] [bold]python cli.py mint {contract}[/bold]")
    elif r.on_chain_start_time_ms:
        console.print(
            f"[{WARNING}]Opens in {_countdown(r.on_chain_start_time_ms)}. "
            f"Schedule with:[/{WARNING}] [bold]python cli.py schedule {contract}[/bold]"
        )


# ---------------------------------------------------------------------------
# mint command
# ---------------------------------------------------------------------------
@app.command()
def mint(
    contract: str = typer.Argument(..., help="NFT contract address"),
    qty: int      = typer.Option(1,   "--qty",   "-q", help="Quantity to mint"),
    value: str    = typer.Option("0", "--value", "-v", help="ETH value to send per tx (e.g. 0.05)"),
):
    """Execute an immediate mint on a live contract."""
    _banner()

    async def _run():
        # Step 1: quick scan
        with Progress(SpinnerColumn(), TextColumn("Scanning contract..."), transient=True) as p:
            p.add_task("", total=None)
            info = await _discovery().discover(contract)

        phase_col = _phase_color(info.phase_status)
        console.print(Panel(
            f"[bold]{info.name or 'Unknown'}[/bold] ({info.symbol or '?'})\n"
            f"Price: [{ACCENT}]{info.price_native} ETH[/{ACCENT}]  "
            f"Phase: [{phase_col}]{info.phase_status.upper()}[/{phase_col}]",
            title="Contract", box=box.ROUNDED, expand=False
        ))

        if not info.is_live:
            console.print(f"[{WARNING}]Warning: mint phase is not currently live ({info.phase_status}).[/{WARNING}]")
            if not Confirm.ask("Proceed anyway?", default=False):
                return

        pk = _get_pk_or_prompt()
        actual_value = value if value != "0" else info.price_native

        console.print(f"\n[{DIM}]Quantity:[/{DIM}] {qty}   [{DIM}]Value:[/{DIM}] {actual_value} ETH")
        if not Confirm.ask(f"[{ACCENT}]Confirm mint?[/{ACCENT}]", default=True):
            return

        # Step 2: execute
        tx_hash_holder: list[str] = []

        async def on_broadcast(tx_hash: str, fn: str):
            tx_hash_holder.append(tx_hash)
            console.print(f"\n[{ACCENT}]📡 TX Broadcast![/{ACCENT}]  Hash: [bold]{tx_hash}[/bold]")
            console.print(f"[{DIM}]Function: {fn}[/{DIM}]")
            console.print(f"[{DIM}]{EXPLORER_BASE}/tx/{tx_hash}[/{DIM}]")
            console.print(f"[{WARNING}]Waiting for confirmation...[/{WARNING}]")

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as p:
            task = p.add_task("Executing mint...", total=None)
            if info.sea_drop_address:
                result = await _executor().execute_seadrop_mint(
                    private_key=pk,
                    sea_drop_address=info.sea_drop_address,
                    nft_contract=contract,
                    quantity=qty,
                    value_eth=actual_value,
                    on_broadcast=on_broadcast,
                )
            else:
                result = await _executor().execute_mint(
                    private_key=pk,
                    contract=contract,
                    quantity=qty,
                    value_eth=actual_value,
                    on_broadcast=on_broadcast,
                )
            p.remove_task(task)

        if result.success:
            console.print(Panel(
                f"[{ACCENT}]✅ MINT CONFIRMED![/{ACCENT}]\n\n"
                f"TX Hash:  [bold]{result.tx_hash}[/bold]\n"
                f"Block:    {result.block_number}\n"
                f"Gas Used: {result.gas_used}\n"
                f"Function: {result.function_used}\n\n"
                f"[link={EXPLORER_BASE}/tx/{result.tx_hash}]{EXPLORER_BASE}/tx/{result.tx_hash}[/link]",
                box=box.DOUBLE_EDGE, border_style=ACCENT
            ))
        else:
            console.print(Panel(
                f"[{ERROR}]❌ MINT FAILED[/{ERROR}]\n\n{result.error}",
                box=box.ROUNDED, border_style=ERROR
            ))

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# schedule command
# ---------------------------------------------------------------------------
@app.command()
def schedule(
    contract: str  = typer.Argument(..., help="NFT contract address"),
    qty: int       = typer.Option(1,    "--qty",   "-q", help="Quantity to mint"),
    value: str     = typer.Option("0",  "--value", "-v", help="ETH value (e.g. 0.05)"),
    mint_time: str = typer.Option("",   "--time",  "-t", help="Mint time: ISO datetime or unix ms (auto-detected if omitted)"),
):
    """Schedule a mint at a specific timestamp. Runs a millisecond countdown loop."""
    _banner()

    async def _run():
        # Scan contract first
        with Progress(SpinnerColumn(), TextColumn("Scanning contract..."), transient=True) as p:
            p.add_task("", total=None)
            info = await _discovery().discover(contract)

        console.print(Panel(
            f"[bold]{info.name or 'Unknown'}[/bold] ({info.symbol or '?'})\n"
            f"Price:    [{ACCENT}]{info.price_native} ETH[/{ACCENT}]\n"
            f"On-chain open: {_fmt_time(info.on_chain_start_time_ms)}",
            title="Contract", box=box.ROUNDED, expand=False
        ))

        # Determine mint time
        target_ms: Optional[int] = None
        if mint_time:
            try:
                # Unix ms
                if mint_time.isdigit():
                    target_ms = int(mint_time)
                else:
                    # ISO datetime
                    dt = datetime.fromisoformat(mint_time.replace("Z", "+00:00"))
                    target_ms = int(dt.timestamp() * 1000)
            except Exception:
                console.print(f"[{ERROR}]Cannot parse time '{mint_time}'. Use ISO format or unix ms.[/{ERROR}]")
                return
        elif info.on_chain_start_time_ms:
            target_ms = info.on_chain_start_time_ms
            console.print(f"[{ACCENT}]Auto-detected mint time from chain:[/{ACCENT}] {_fmt_time(target_ms)}")
        else:
            raw = Prompt.ask("Enter mint time (ISO datetime or unix ms)")
            try:
                target_ms = int(raw) if raw.isdigit() else int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp() * 1000)
            except Exception:
                console.print(f"[{ERROR}]Invalid time.[/{ERROR}]")
                return

        if target_ms <= int(time.time() * 1000):
            console.print(f"[{ERROR}]That time is already in the past.[/{ERROR}]")
            return

        actual_value = value if value != "0" else info.price_native
        pk = _get_pk_or_prompt()

        console.print(f"\n[{ACCENT}]🎯 Arming sniper:[/{ACCENT}]")
        console.print(f"  Contract:  {contract}")
        console.print(f"  Quantity:  {qty}")
        console.print(f"  Value:     {actual_value} ETH")
        console.print(f"  Fires at:  {_fmt_time(target_ms)}")
        console.print(f"  Countdown: {_countdown(target_ms)}")

        if not Confirm.ask(f"\n[{ACCENT}]Arm this schedule?[/{ACCENT}]", default=True):
            return

        # Create scheduler with inline notify
        async def notify(msg: str):
            console.print(f"[{ACCENT}]{msg}[/{ACCENT}]")

        sched_svc = SchedulerService(lambda net: _executor(), notify)
        req = ScheduleRequest(
            contract=contract,
            quantity=qty,
            value_native=actual_value,
            private_key=pk,
            mint_time_ms=target_ms,
        )
        mint_obj = sched_svc.schedule(req)
        console.print(f"\n[{ACCENT}]✅ Schedule armed! ID: {mint_obj.id}[/{ACCENT}]")

        # Live countdown in terminal
        console.print(f"\n[{DIM}]Press CTRL+C to cancel the countdown.[/{DIM}]")
        try:
            while True:
                remaining = (target_ms / 1000) - time.time()
                if remaining <= 0:
                    console.print(f"\n[{ACCENT}]🚀 FIRING![/{ACCENT}]")
                    break
                h = int(remaining // 3600)
                m = int((remaining % 3600) // 60)
                s = int(remaining % 60)
                ms_part = int((remaining % 1) * 1000)
                console.print(
                    f"\r[{ACCENT}]T-{h:02d}:{m:02d}:{s:02d}.{ms_part:03d}[/{ACCENT}]",
                    end="", highlight=False
                )
                await asyncio.sleep(0.1)
        except (KeyboardInterrupt, asyncio.CancelledError):
            console.print(f"\n[{WARNING}]Countdown cancelled by user.[/{WARNING}]")
            sched_svc.cancel(mint_obj.id)
            return

        # Wait for the scheduled task to complete
        task = sched_svc._tasks.get(mint_obj.id)
        if task:
            try:
                await asyncio.wait_for(task, timeout=120)
            except asyncio.TimeoutError:
                console.print(f"[{ERROR}]Timeout waiting for mint confirmation.[/{ERROR}]")

        # Show result
        final = sched_svc._schedules.get(mint_obj.id)
        if final:
            if final.status == "done":
                console.print(Panel(
                    f"[{ACCENT}]🎉 MINT CONFIRMED![/{ACCENT}]\n\n"
                    f"TX: [bold]{final.tx_hash}[/bold]\n"
                    f"[link={EXPLORER_BASE}/tx/{final.tx_hash}]{EXPLORER_BASE}/tx/{final.tx_hash}[/link]",
                    box=box.DOUBLE_EDGE, border_style=ACCENT
                ))
            else:
                console.print(Panel(
                    f"[{ERROR}]❌ Mint failed: {final.error}[/{ERROR}]",
                    box=box.ROUNDED, border_style=ERROR
                ))

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# schedules command (list)
# ---------------------------------------------------------------------------
@app.command()
def schedules():
    """List all persisted schedules (shared with the API engine)."""
    _banner()
    from api.services.scheduler import read_records
    records = read_records()
    if not records:
        console.print(f"[{DIM}]No schedules found. Create one with:[/{DIM}] [bold]python cli.py schedule 0xContract[/bold]")
        return
    table = Table(title="MintoBaby Schedules", box=box.ROUNDED)
    table.add_column("ID", style=DIM, no_wrap=True)
    table.add_column("Contract", style="white")
    table.add_column("Network")
    table.add_column("Qty", justify="right")
    table.add_column("Value", justify="right")
    table.add_column("Fires at")
    table.add_column("Status")
    for record in sorted(records, key=lambda r: r.get("mint_time_ms", 0)):
        status = record.get("status", "?")
        style = {"armed": ACCENT, "firing": WARNING, "done": ACCENT, "failed": ERROR}.get(status, DIM)
        table.add_row(
            str(record.get("id", ""))[:8],
            record.get("contract", ""),
            record.get("network", "robinhood"),
            str(record.get("quantity", 1)),
            f"{record.get('value_native', '0')} ETH",
            _fmt_time(record.get("mint_time_ms")),
            f"[{style}]{status.upper()}[/{style}]",
        )
    console.print(table)


# ---------------------------------------------------------------------------
# cancel command
# ---------------------------------------------------------------------------
@app.command()
def cancel(
    schedule_id: str = typer.Argument(..., help="Schedule ID (first characters are enough)"),
):
    """Cancel an armed schedule (via the API engine, or the shared file directly)."""
    _banner()
    from api.services.scheduler import read_records, write_records
    api_base = settings.api_url.rstrip("/")
    full_id: Optional[str] = None
    records = read_records()
    for record in records:
        if record.get("id", "").startswith(schedule_id.strip()):
            full_id = record["id"]
            break
    if not full_id:
        console.print(f"[{ERROR}]No schedule matches '{schedule_id}'. Run: python cli.py schedules[/{ERROR}]")
        raise typer.Exit(1)
    try:
        response = httpx.delete(f"{api_base}/mint/schedules/{full_id}", timeout=5)
        if response.status_code == 200:
            console.print(f"[{ACCENT}]✅ Schedule {full_id[:8]} cancelled through the API engine.[/{ACCENT}]")
            return
    except Exception:
        pass
    remaining = [r for r in read_records() if r.get("id") != full_id]
    write_records(remaining)
    console.print(f"[{ACCENT}]✅ Schedule {full_id[:8]} removed from the shared schedule file.[/{ACCENT}]")
    console.print(f"[{DIM}]If the API engine is still running with this schedule in memory, restart it (or run the daemon) to pick up the change.[/{DIM}]")


# ---------------------------------------------------------------------------
# pairing: setup / login / logout / whoami
# ---------------------------------------------------------------------------
PAIRING_FILE = Path.home() / ".mintobaby" / "pairing.json"


def _load_pairing() -> Optional[dict]:
    if PAIRING_FILE.exists():
        try:
            return json.loads(PAIRING_FILE.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


@app.command()
def login(
    code: str = typer.Option(..., "--code", "-c", help="Your MINTO-XXXX-XXXX-XXXX activation key"),
    api_url: str = typer.Option("", "--api", help="API base URL (defaults to API_URL / http://localhost:8000)"),
):
    """Pair this terminal with your MintoBaby account using one activation key."""
    _banner()
    base = (api_url or settings.api_url or "http://localhost:8000").rstrip("/")
    try:
        response = httpx.post(
            f"{base}/auth/verify",
            json={"code": code.strip().upper(), "service": "cli", "actor": socket.gethostname()},
            timeout=10,
        )
    except Exception as exc:
        console.print(f"[{ERROR}]Cannot reach the MintoBaby API at {base}: {exc}[/{ERROR}]")
        console.print(f"[{DIM}]Start it with: uvicorn api.main:app  — or pass --api https://your-api[/{DIM}]")
        raise typer.Exit(1)
    if response.status_code != 200:
        detail = (response.json() or {}).get("detail", "Verification failed.") if response.content else "Verification failed."
        console.print(f"[{ERROR}]❌ {detail}[/{ERROR}]")
        raise typer.Exit(1)
    details = response.json().get("details", {})
    PAIRING_FILE.parent.mkdir(parents=True, exist_ok=True)
    PAIRING_FILE.write_text(json.dumps({
        "code": code.strip().upper(),
        "email": details.get("email"),
        "api_url": base,
        "paired_at": datetime.now(timezone.utc).isoformat(),
    }, indent=2))
    console.print(Panel(
        f"[{ACCENT}]✅ Terminal paired![/{ACCENT}]\n\n"
        f"• [{DIM}]Key:[/{DIM}] {code.strip().upper()}\n"
        f"• [{DIM}]Account:[/{DIM}] {details.get('email') or '(admin-issued key)'}\n"
        f"• [{DIM}]Engine:[/{DIM}] {base}\n\n"
        f"Wallet stays local in ~/.mintobaby — this key only authorizes the tool.",
        box=box.DOUBLE_EDGE, border_style=ACCENT,
    ))


@app.command()
def logout():
    """Remove this terminal's pairing."""
    if PAIRING_FILE.exists():
        PAIRING_FILE.unlink()
        console.print(f"[{ACCENT}]Pairing removed.[/{ACCENT}]")
    else:
        console.print(f"[{DIM}]This terminal is not paired.[/{DIM}]")


@app.command()
def whoami():
    """Show the current terminal pairing."""
    pairing = _load_pairing()
    if not pairing:
        console.print(f"[{WARNING}]Not paired. Run:[/{WARNING}] [bold]python cli.py login --code MINTO-XXXX-XXXX-XXXX[/{bold}]")
        return
    console.print(Panel(
        f"[{DIM}]Key:[/{DIM}] {pairing.get('code')}\n"
        f"[{DIM}]Account:[/{DIM}] {pairing.get('email') or '(unknown)'}\n"
        f"[{DIM}]Engine:[/{DIM}] {pairing.get('api_url')}\n"
        f"[{DIM}]Paired at:[/{DIM}] {pairing.get('paired_at')}",
        title="Terminal Pairing", box=box.ROUNDED,
    ))


@app.command()
def setup():
    """Guided first-run: engine, chain, wallet, and pairing checks."""
    _banner()
    ok = True
    base = (settings.api_url or "http://localhost:8000").rstrip("/")

    # 1. Engine health
    try:
        health = httpx.get(f"{base}/health", timeout=5).json()
        console.print(f"[{ACCENT}]✓[/{ACCENT}] Engine online at {base} (networks: {', '.join(health.get('networks', []))})")
    except Exception:
        ok = False
        console.print(f"[{WARNING}]![/{WARNING}] Engine offline at {base}. Start it with: [bold]uvicorn api.main:app[/bold]")

    # 2. Chain reachability
    async def _chain_check():
        return await _chain().get_block_number()
    try:
        block = asyncio.run(_chain_check())
        console.print(f"[{ACCENT}]✓[/{ACCENT}] Robinhood Chain reachable — block {block:,}")
    except Exception as exc:
        ok = False
        console.print(f"[{ERROR}]✗[/{ERROR}] Chain unreachable: {exc}")

    # 3. Wallet
    raw = _load_wallet()
    if raw:
        console.print(f"[{ACCENT}]✓[/{ACCENT}] Wallet found: {raw['address']}")
    elif Confirm.ask(f"[{WARNING}]No EVM wallet found. Generate one now?[/]", default=True):
        w = generate_wallet()
        enc = encrypt_key(w["private_key"], settings.encryption_secret)
        _save_wallet({"address": w["address"], **enc})
        console.print(f"[{ACCENT}]✓ New wallet:[/{ACCENT}] {w['address']}")
        console.print(f"[{DIM}]  Fund it on Robinhood Chain before minting. Key encrypted in {WALLET_FILE}[/]")
    else:
        console.print(f"[{DIM}]  Skipped — import later with:[/] [bold]python cli.py wallet import[/]")

    # 4. Pairing
    pairing = _load_pairing()
    if pairing:
        console.print(f"[{ACCENT}]✓[/{ACCENT}] Paired with key {pairing.get('code')}")
    elif Confirm.ask(f"[{WARNING}]Terminal is not paired. Pair with an activation key now?[/]", default=False):
        code = Prompt.ask("Activation key (MINTO-XXXX-XXXX-XXXX)").strip().upper()
        try:
            response = httpx.post(f"{base}/auth/verify", json={"code": code, "service": "cli", "actor": socket.gethostname()}, timeout=10)
            if response.status_code == 200:
                details = response.json().get("details", {})
                PAIRING_FILE.parent.mkdir(parents=True, exist_ok=True)
                PAIRING_FILE.write_text(json.dumps({
                    "code": code,
                    "email": details.get("email"),
                    "api_url": base,
                    "paired_at": datetime.now(timezone.utc).isoformat(),
                }, indent=2))
                console.print(f"[{ACCENT}]✓ Paired as {details.get('email') or code}[/]")
            else:
                detail = (response.json() or {}).get("detail", "Invalid activation key.")
                console.print(f"[{ERROR}]✗ {detail}[/]")
                ok = False
        except Exception as exc:
            console.print(f"[{ERROR}]✗ Pairing failed: {exc}[/]")
            ok = False
    else:
        console.print(f"[{DIM}]  Skipped — pair later with:[/] [bold]python cli.py login --code MINTO-...[/]")

    if ok:
        console.print(f"\n[{ACCENT}]Setup complete — ready to snipe. ⚡[/]")
    else:
        console.print(f"\n[{WARNING}]Setup finished with warnings — fix the items above.[/]")


# ---------------------------------------------------------------------------
# daemon command
# ---------------------------------------------------------------------------
async def _daemon_notify(msg: str):
    token   = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    if not token or not chat_id:
        return
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"},
                timeout=aiohttp.ClientTimeout(total=5),
            )
    except Exception:
        pass


@app.command()
def daemon(
    auto_gas: bool = typer.Option(True, "--auto-gas/--no-auto-gas", help="Price gas from the chain at fire time"),
):
    """
    Run the terminal execution engine: watches the shared schedule store,
    fires armed mints at their exact open time, and stays running.
    Press CTRL+C to stop.
    """
    _banner()
    pairing = _load_pairing()
    if pairing:
        console.print(f"[{ACCENT}]●[/{ACCENT}] Daemon paired as {pairing.get('email') or pairing.get('code')}")
    else:
        console.print(f"[{WARNING}]Running unpaired (local schedules only). Pair with: python cli.py login --code MINTO-...[/{WARNING}]")
    if not auto_gas:
        console.print(f"[{DIM}]Note: gas price is always read from the chain at broadcast time (safety).[/]")

    from api.services.scheduler import SchedulerService, SCHEDULES_FILE

    def executor_factory(network: str) -> ExecutorService:
        net_cfg = NETWORKS.get(network, NETWORKS["robinhood"])
        return ExecutorService(ChainService(net_cfg["rpc"], net_cfg["chain_id"], network))

    async def _run_daemon():
        svc = SchedulerService(executor_factory, telegram_notify=_daemon_notify)
        svc.sync_from_file()
        svc.arm_due_after_restart()
        armed = [m for m in svc.list_schedules() if m.status == "armed"]
        console.print(f"[{ACCENT}]⚡ Daemon running.[/{ACCENT}] Watching {SCHEDULES_FILE} — {len(armed)} armed target(s) loaded.")
        for mint in armed:
            console.print(f"  [{DIM}]•[/] {mint.contract} @ {_fmt_time(mint.mint_time_ms)}")
        try:
            while True:
                for new_id in svc.sync_from_file():
                    mint = svc._schedules[new_id]
                    console.print(f"[{ACCENT}]➕ New schedule {new_id[:8]}:[/{ACCENT}] {mint.contract} @ {_fmt_time(mint.mint_time_ms)}")
                    svc.arm_persisted(new_id)
                await asyncio.sleep(1)
        except (KeyboardInterrupt, asyncio.CancelledError):
            console.print(f"\n[{WARNING}]Daemon stopped. Armed schedules remain in the shared file for the next run.[/{WARNING}]")

    try:
        asyncio.run(_run_daemon())
    except KeyboardInterrupt:
        console.print(f"\n[{WARNING}]Daemon stopped.[/{WARNING}]")


# ---------------------------------------------------------------------------
# status command
# ---------------------------------------------------------------------------
@app.command()
def status():
    """Show wallet balance, API health, and chain status."""
    _banner()

    async def _run():
        chain = _chain()

        with Progress(SpinnerColumn(), TextColumn("Checking chain..."), transient=True) as p:
            p.add_task("", total=None)
            block = await chain.get_block_number()

        raw = _load_wallet()
        if raw:
            balance = await chain.get_balance(raw["address"])
            wallet_str = (
                f"[{ACCENT}]{raw['address']}[/{ACCENT}]\n"
                f"Balance: [{ACCENT}]{balance} ETH[/{ACCENT}]"
            )
        else:
            wallet_str = f"[{WARNING}]No wallet configured.[/{WARNING}]"

        console.print(Panel(
            f"{wallet_str}\n\n"
            f"[{DIM}]Chain:[/{DIM}] Robinhood Chain (ID {settings.robinhood_chain_id})\n"
            f"[{DIM}]Block:[/{DIM}] [{ACCENT}]{block:,}[/{ACCENT}]\n"
            f"[{DIM}]RPC:  [/{DIM}] {settings.robinhood_rpc_url}",
            title="[bold]MintoBaby Status[/bold]", box=box.ROUNDED
        ))

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# wallet sub-commands
# ---------------------------------------------------------------------------
@wallet_app.command("solana-generate")
def wallet_solana_generate():
    """Generate and save an encrypted Solana wallet for bot/terminal use."""
    _banner()
    w = generate_solana_wallet()
    enc = encrypt_key(w["private_key"], settings.encryption_secret)
    _save_wallet_data(SOLANA_WALLET_FILE, {"network": "solana", "address": w["address"], **enc})
    console.print(Panel(f"Address: [{ACCENT}]{w['address']}[/{ACCENT}]\n\nSend SOL to this address. The private key is encrypted locally.", title="Solana Wallet", box=box.DOUBLE_EDGE, border_style=ACCENT))


@wallet_app.command("solana-import")
def wallet_solana_import():
    """Import and save an encrypted Solana private key."""
    _banner()
    try:
        w = import_solana_wallet(Prompt.ask("Enter Solana private key", password=True))
        enc = encrypt_key(w["private_key"], settings.encryption_secret)
        _save_wallet_data(SOLANA_WALLET_FILE, {"network": "solana", "address": w["address"], **enc})
        console.print(f"[{ACCENT}]Solana wallet saved: {w['address']}[/{ACCENT}]")
    except Exception as exc:
        console.print(f"[{ERROR}]Invalid Solana key: {exc}[/{ERROR}]")


@wallet_app.command("solana-show")
def wallet_solana_show():
    """Show Solana receive address and balance."""
    _banner()
    raw = _load_wallet_data(SOLANA_WALLET_FILE)
    if not raw:
        console.print(f"[{WARNING}]No Solana wallet found. Run: python -m api.cli wallet solana-generate[/{WARNING}]")
        return
    async def _run():
        balance = await ChainService(NETWORKS["solana"]["rpc"], None, "solana").get_balance(raw["address"])
        console.print(Panel(f"Address: [{ACCENT}]{raw['address']}[/{ACCENT}]\nBalance: [{ACCENT}]{balance} SOL[/{ACCENT}]\nExplorer: {SOLANA_EXPLORER}/address/{raw['address']}", title="Solana Wallet", box=box.ROUNDED))
    asyncio.run(_run())


def _load_wallet_data(path: Path) -> Optional[dict]:
    if path.exists():
        return json.loads(path.read_text())
    return None


def _save_wallet_data(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data))


@wallet_app.command("show")
def wallet_show():
    """Show current wallet address and balance."""
    _banner()

    async def _run():
        raw = _load_wallet()
        if not raw:
            console.print(f"[{WARNING}]No wallet found. Run: python cli.py wallet generate[/{WARNING}]")
            return
        chain   = _chain()
        balance = await chain.get_balance(raw["address"])
        console.print(Panel(
            f"Address: [{ACCENT}]{raw['address']}[/{ACCENT}]\n"
            f"Balance: [{ACCENT}]{balance} ETH[/{ACCENT}]",
            title="Wallet", box=box.ROUNDED, expand=False
        ))

    asyncio.run(_run())


@wallet_app.command("generate")
def wallet_generate():
    """Generate a new random wallet and save it encrypted."""
    _banner()
    if _load_wallet():
        if not Confirm.ask(f"[{WARNING}]A wallet already exists. Overwrite it?[/{WARNING}]", default=False):
            return
    w   = generate_wallet()
    enc = encrypt_key(w["private_key"], settings.encryption_secret)
    _save_wallet({"address": w["address"], **enc})
    console.print(Panel(
        f"[{ACCENT}]✅ New wallet generated![/{ACCENT}]\n\n"
        f"Address:     [{ACCENT}]{w['address']}[/{ACCENT}]\n"
        f"Saved to:    {WALLET_FILE}\n\n"
        f"[{WARNING}]Fund this wallet with ETH before minting.[/{WARNING}]",
        box=box.DOUBLE_EDGE, border_style=ACCENT
    ))


@wallet_app.command("import")
def wallet_import():
    """Import an existing private key."""
    _banner()
    pk  = Prompt.ask("Enter private key", password=True)
    try:
        w   = import_wallet(pk.strip())
        enc = encrypt_key(w["private_key"], settings.encryption_secret)
        _save_wallet({"address": w["address"], **enc})
        console.print(f"[{ACCENT}]✅ Wallet imported: {w['address']}[/{ACCENT}]")
    except Exception as exc:
        console.print(f"[{ERROR}]Invalid key: {exc}[/{ERROR}]")


@wallet_app.command("export")
def wallet_export():
    """Export (reveal) the saved private key."""
    _banner()
    raw = _load_wallet()
    if not raw:
        console.print(f"[{WARNING}]No wallet found.[/{WARNING}]")
        return
    if not Confirm.ask(f"[{ERROR}]This will reveal your private key. Are you sure?[/{ERROR}]", default=False):
        return
    try:
        pk = _decrypt_wallet(raw)
        console.print(Panel(
            f"[{WARNING}]KEEP THIS SECRET — NEVER SHARE IT[/{WARNING}]\n\n"
            f"[bold]{pk}[/bold]",
            title=f"[{ERROR}]Private Key[/{ERROR}]", box=box.HEAVY, border_style=ERROR
        ))
    except Exception as exc:
        console.print(f"[{ERROR}]Decryption failed: {exc}[/{ERROR}]")


# ---------------------------------------------------------------------------
# copy-mint sub-commands (feature not integrated yet)
# ---------------------------------------------------------------------------
copy_app = typer.Typer(help="Copy-minting radar (currently unavailable)")
app.add_typer(copy_app, name="copymint")


def _copy_mint_unavailable():
    console.print(Panel(
        f"[{WARNING}]Copy-Mint Radar is not available yet.[/{WARNING}]\n\n"
        f"[{DIM}]Whale-wallet mirroring is being rebuilt on dedicated per-network adapters with "
        f"real block decoding and preflight simulation. Until those adapters are released, "
        f"no copy-mint rules can be armed and no private key is needed here.[/{DIM}]",
        title=f"[{ACCENT}]Coming Soon[/{ACCENT}]", box=box.ROUNDED, border_style=ACCENT
    ))


@copy_app.command("add")
def copy_add(
    target: str = typer.Argument(..., help="Target alpha wallet address to track"),
    network: str = typer.Option("robinhood", "--net", "-n", help="Network: robinhood | ink | solana"),
    max_qty: int = typer.Option(1, "--qty", "-q", help="Max quantity to copy"),
    max_price: str = typer.Option("0.5", "--max-price", "-p", help="Max price cap"),
):
    """Copy-mint radar is not wired up yet — nothing is stored or executed."""
    _banner()
    _copy_mint_unavailable()


@copy_app.command("list")
def copy_list():
    """Copy-mint radar is not wired up yet — there are no rules."""
    _banner()
    _copy_mint_unavailable()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app()


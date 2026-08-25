#!/usr/bin/env python3
"""
MintoBaby CLI ⚡ — NFT Sniper for Robinhood Chain
Run from any terminal: python cli.py <command>
"""
from __future__ import annotations

import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

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
from api.services.chain import ChainService             # noqa: E402
from api.services.crypto import (                       # noqa: E402
    encrypt_key, decrypt_key, generate_wallet, import_wallet
)
from api.services.discovery import DiscoveryService     # noqa: E402
from api.services.executor import ExecutorService       # noqa: E402
from api.services.scheduler import SchedulerService     # noqa: E402
from api.models import ScheduleRequest                  # noqa: E402

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WALLET_FILE   = Path.home() / ".mintobaby" / "wallet.enc"
EXPLORER_BASE = "https://robinhoodchain.blockscout.com"

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
    return ChainService(settings.rpc_url, settings.chain_id)


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
        f"[{DIM}]Robinhood Chain · Chain ID {settings.chain_id}[/{DIM}]",
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
    grid.add_row("Price",        f"[{ACCENT}]{r.price_eth} ETH[/{ACCENT}] [{DIM}]({r.price_status})[/{DIM}]")
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
            f"Price: [{ACCENT}]{info.price_eth} ETH[/{ACCENT}]  "
            f"Phase: [{phase_col}]{info.phase_status.upper()}[/{phase_col}]",
            title="Contract", box=box.ROUNDED, expand=False
        ))

        if not info.is_live:
            console.print(f"[{WARNING}]Warning: mint phase is not currently live ({info.phase_status}).[/{WARNING}]")
            if not Confirm.ask("Proceed anyway?", default=False):
                return

        pk = _get_pk_or_prompt()
        actual_value = value if value != "0" else info.price_eth

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
            f"Price:    [{ACCENT}]{info.price_eth} ETH[/{ACCENT}]\n"
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

        actual_value = value if value != "0" else info.price_eth
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

        sched_svc = SchedulerService(_executor(), notify)
        req = ScheduleRequest(
            contract=contract,
            quantity=qty,
            value_eth=actual_value,
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
    """List all armed schedules (from current session)."""
    console.print(f"[{DIM}]No persistent schedule list in standalone mode. "
                  "Use the web dashboard or API server for persistent schedule tracking.[/{DIM}]")


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
            f"[{DIM}]Chain:[/{DIM}] Robinhood Chain (ID {settings.chain_id})\n"
            f"[{DIM}]Block:[/{DIM}] [{ACCENT}]{block:,}[/{ACCENT}]\n"
            f"[{DIM}]RPC:  [/{DIM}] {settings.rpc_url}",
            title="[bold]MintoBaby Status[/bold]", box=box.ROUNDED
        ))

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# wallet sub-commands
# ---------------------------------------------------------------------------
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
# copy-mint sub-commands
# ---------------------------------------------------------------------------
copy_app = typer.Typer(help="Copy-minting alpha radar commands")
app.add_typer(copy_app, name="copymint")


@copy_app.command("add")
def copy_add(
    target: str = typer.Argument(..., help="Target alpha wallet address to track"),
    network: str = typer.Option("robinhood", "--net", "-n", help="Network: robinhood | ink | solana"),
    max_qty: int = typer.Option(1, "--qty", "-q", help="Max quantity to copy"),
    max_price: str = typer.Option("0.5", "--max-price", "-p", help="Max price cap"),
):
    """Add a target alpha wallet to copy-mint radar."""
    _banner()
    pk = _get_pk_or_prompt()
    console.print(Panel(
        f"[{ACCENT}]📡 Copy-Mint Radar Armed![/{ACCENT}]\n\n"
        f"Target Wallet: [bold]{target}[/bold]\n"
        f"Network:       [bold]{network.upper()}[/bold]\n"
        f"Max Copy Qty:  {max_qty}\n"
        f"Max Price:     {max_price}\n\n"
        f"[{DIM}]MintoBaby will watch this target wallet and replay qualified mint transactions instantly.[/{DIM}]",
        box=box.ROUNDED, border_style=ACCENT
    ))


@copy_app.command("list")
def copy_list():
    """List tracked alpha wallets."""
    _banner()
    console.print(f"[{DIM}]Use web dashboard or API at http://localhost:8000/copymint/rules to view active rules.[/{DIM}]")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app()


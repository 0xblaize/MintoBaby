import aiohttp
from fastapi import APIRouter, HTTPException, Request

from ..config import settings
from ..models import MintRequest, MintResult, ScheduleRequest, ScheduledMint
from ..services.chain import ChainService, NETWORKS
from ..services.discovery import DiscoveryService
from ..services.executor import ExecutorService
from ..services.scheduler import SchedulerService

router = APIRouter(prefix="/mint", tags=["mint"])


def _get_services(request: Request) -> tuple[ExecutorService, SchedulerService]:
    return request.app.state.executor, request.app.state.scheduler


async def _tg_notify(msg: str):
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


@router.post("/execute", response_model=MintResult)
async def execute_mint(req: MintRequest, request: Request):
    net = NETWORKS[req.network]
    if net["type"] == "solana":
        return MintResult(network=req.network, success=False, error="Solana mint execution is not implemented yet; no transaction was signed or broadcast.")
    chain = ChainService(net["rpc"], net["chain_id"], req.network)
    executor = ExecutorService(chain)
    discovery = DiscoveryService(chain)

    async def on_broadcast(tx_hash: str, fn: str):
        await _tg_notify(
            f"📡 <b>TX BROADCAST</b>\nContract: <code>{req.contract}</code>\n"
            f"Function: <code>{fn}</code>\nHash: <code>{tx_hash}</code>"
        )

    try:
        disc = await discovery.discover(req.contract)
        if disc.sea_drop_address:
            result = await executor.execute_seadrop_mint(
                private_key=req.private_key,
                sea_drop_address=disc.sea_drop_address,
                nft_contract=req.contract,
                quantity=req.quantity,
                value_eth=req.value_native,
                on_broadcast=on_broadcast,
            )
        else:
            result = await executor.execute_mint(
                private_key=req.private_key,
                contract=req.contract,
                quantity=req.quantity,
                value_eth=req.value_native,
                on_broadcast=on_broadcast,
            )
    except Exception:
        result = await executor.execute_mint(
            private_key=req.private_key,
            contract=req.contract,
            quantity=req.quantity,
            value_eth=req.value_native,
            on_broadcast=on_broadcast,
        )

    result.network = req.network
    if result.success:
        await _tg_notify(
            f"🎉 <b>MINT CONFIRMED!</b>\n"
            f"Contract: <code>{req.contract}</code>\n"
            f"TX: <code>{result.tx_hash}</code>\n"
            f"Block: {result.block_number} | Gas: {result.gas_used}"
        )
    return result


@router.post("/schedule", response_model=ScheduledMint)
async def schedule_mint(req: ScheduleRequest, request: Request):
    _, scheduler = _get_services(request)
    try:
        return scheduler.schedule(req)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/schedules", response_model=list[ScheduledMint])
async def list_schedules(request: Request):
    _, scheduler = _get_services(request)
    return scheduler.list_schedules()


@router.delete("/schedules/{schedule_id}")
async def cancel_schedule(schedule_id: str, request: Request):
    _, scheduler = _get_services(request)
    ok = scheduler.cancel(schedule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Schedule not found.")
    return {"success": True, "message": f"Schedule {schedule_id} cancelled."}

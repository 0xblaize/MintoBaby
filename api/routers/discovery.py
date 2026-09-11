from fastapi import APIRouter, HTTPException

from ..models import ScanRequest, DiscoveryResult
from ..services.chain import ChainService, NETWORKS
from ..services.discovery import DiscoveryService

router = APIRouter(prefix="/discovery", tags=["discovery"])


@router.post("/scan", response_model=DiscoveryResult)
async def scan(req: ScanRequest):
    net = NETWORKS.get(req.network, NETWORKS["robinhood"])
    if net["type"] == "solana":
        raise HTTPException(status_code=501, detail="Solana discovery is not implemented yet.")
    chain = ChainService(net["rpc"], net["chain_id"], req.network)
    svc = DiscoveryService(chain)
    try:
        result = await svc.discover(req.address)
        result.network = req.network
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {exc}")

from fastapi import APIRouter, HTTPException, Depends
from ..config import settings
from ..models import ScanRequest, DiscoveryResult
from ..services.chain import ChainService
from ..services.discovery import DiscoveryService

router = APIRouter(prefix="/discovery", tags=["discovery"])


def get_discovery() -> DiscoveryService:
    return DiscoveryService(ChainService(settings.rpc_url, settings.chain_id))


@router.post("/scan", response_model=DiscoveryResult)
async def scan(req: ScanRequest, svc: DiscoveryService = Depends(get_discovery)):
    try:
        return await svc.discover(req.address)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Discovery failed: {exc}")

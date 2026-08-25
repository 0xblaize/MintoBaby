from fastapi import APIRouter, HTTPException, Request
from ..models import CopyMintRequest, CopyMintRule
from ..services.copy_mint import CopyMintService

router = APIRouter(prefix="/copymint", tags=["copymint"])


def _get_copy_service(request: Request) -> CopyMintService:
    return request.app.state.copy_mint


@router.post("/rules", response_model=CopyMintRule)
async def add_copy_rule(req: CopyMintRequest, request: Request):
    copy_svc = _get_copy_service(request)
    try:
        rule = copy_svc.add_rule(
            target_wallet=req.target_wallet,
            private_key=req.private_key,
            network=req.network,
            max_qty=req.max_copy_quantity,
            max_price=req.max_price_native
        )
        return rule
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/rules", response_model=list[CopyMintRule])
async def list_copy_rules(request: Request):
    copy_svc = _get_copy_service(request)
    return copy_svc.list_rules()


@router.delete("/rules/{rule_id}")
async def remove_copy_rule(rule_id: str, request: Request):
    copy_svc = _get_copy_service(request)
    ok = copy_svc.remove_rule(rule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Copy mint rule not found.")
    return {"success": True, "message": f"Rule {rule_id} removed."}

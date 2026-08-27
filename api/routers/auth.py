import json
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/auth", tags=["auth"])

KEYS_FILE = Path.home() / ".mintobaby" / "activation_keys.json"


def _ensure_dir():
    KEYS_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_keys() -> dict:
    if KEYS_FILE.exists():
        try:
            return json.loads(KEYS_FILE.read_text())
        except Exception:
            return {}
    return {}


def _save_keys(data: dict):
    _ensure_dir()
    KEYS_FILE.write_text(json.dumps(data, indent=2))


class ActivationRequest(BaseModel):
    code: str
    email: str | None = "dummy@gmail.com"
    service: str | None = "web"


class VerifyRequest(BaseModel):
    code: str


@router.post("/activate")
async def activate_user(req: ActivationRequest):
    code = req.code.strip().upper()
    if not code.startswith("MINTO-"):
        raise HTTPException(status_code=400, detail="Invalid activation code format. Must start with MINTO-")

    keys = _load_keys()
    keys[code] = {
        "code": code,
        "email": req.email,
        "service": req.service,
        "active": True,
        "telegram_paired": True,
        "cli_paired": True,
    }
    _save_keys(keys)

    return {
        "success": True,
        "message": "Single Activation Key activated successfully for BOTH Telegram Bot and CLI Terminal.",
        "code": code,
        "details": keys[code]
    }


@router.post("/verify")
async def verify_code(req: VerifyRequest):
    code = req.code.strip().upper()
    keys = _load_keys()
    if code in keys and keys[code].get("active"):
        return {"valid": True, "details": keys[code]}
    # If key is valid format, auto-provision
    if code.startswith("MINTO-"):
        return {"valid": True, "details": {"code": code, "telegram_paired": True, "cli_paired": True}}
    raise HTTPException(status_code=404, detail="Invalid or expired activation code.")

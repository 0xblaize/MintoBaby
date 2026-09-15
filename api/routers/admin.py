import secrets
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from ..config import settings
from .auth import (
    _load_keys,
    _save_keys,
    _load_users,
    _save_users,
    _public_user,
    read_session_token,
)

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(authorization: str | None) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Administrator session token required.")
    payload = read_session_token(authorization.split(" ", 1)[1].strip())
    if not payload or not payload.get("admin"):
        raise HTTPException(status_code=401, detail="Invalid or expired administrator session.")
    return payload


def _generate_code() -> str:
    def segment() -> str:
        return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
    return f"MINTO-{segment()}-{segment()}-{segment()}"


class GenerateKeysRequest(BaseModel):
    count: int = 1
    email: str | None = None
    note: str | None = None


@router.get("/session")
async def admin_session(authorization: str | None = Header(default=None)):
    """Validate the admin session token for the web console."""
    payload = _require_admin(authorization)
    return {"valid": True, "email": payload.get("id")}


@router.get("/users")
async def list_users(authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    keys = _load_keys()
    users = []
    for user in _load_users().values():
        code = user.get("activation_code")
        record = keys.get(code, {})
        users.append({
            **_public_user(user),
            "subscription": user.get("subscription"),
            "telegram_paired": bool(record.get("telegram_paired")),
            "cli_paired": bool(record.get("cli_paired")),
        })
    users.sort(key=lambda u: u.get("created_at") or "", reverse=True)
    return {"users": users, "total": len(users)}


@router.get("/keys")
async def list_keys(authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    keys = sorted(_load_keys().values(), key=lambda k: k.get("activated_at") or "", reverse=True)
    return {"keys": keys, "total": len(keys)}


@router.post("/keys")
async def generate_keys(req: GenerateKeysRequest, authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    if not 1 <= req.count <= 100:
        raise HTTPException(status_code=400, detail="count must be between 1 and 100.")
    keys = _load_keys()
    existing = set(keys)
    created = []
    for _ in range(req.count):
        code = _generate_code()
        while code in existing:
            code = _generate_code()
        existing.add(code)
        record = {
            "code": code,
            "email": req.email,
            "note": req.note,
            "service": "web",
            "active": True,
            "activated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": settings.mintobaby_admin_email,
            "telegram_paired": False,
            "cli_paired": False,
        }
        keys[code] = record
        created.append(record)
    _save_keys(keys)
    return {"success": True, "created": created, "total": len(keys)}


class RevokeRequest(BaseModel):
    active: bool = False


@router.post("/keys/{code}/active")
async def set_key_active(code: str, req: RevokeRequest, authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    code = code.strip().upper()
    keys = _load_keys()
    if code not in keys:
        raise HTTPException(status_code=404, detail="Key not found.")
    keys[code]["active"] = req.active
    keys[code]["updated_at"] = datetime.now(timezone.utc).isoformat()
    _save_keys(keys)
    return {"success": True, "details": keys[code]}


@router.delete("/keys/{code}")
async def delete_key(code: str, authorization: str | None = Header(default=None)):
    _require_admin(authorization)
    code = code.strip().upper()
    keys = _load_keys()
    if code not in keys:
        raise HTTPException(status_code=404, detail="Key not found.")
    record = keys.pop(code)
    _save_keys(keys)
    return {"success": True, "removed": record["code"]}

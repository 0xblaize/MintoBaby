import json
import random
import string
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------

MINTOBABY_DIR = Path.home() / ".mintobaby"
USERS_FILE = MINTOBABY_DIR / "users.json"
KEYS_FILE = MINTOBABY_DIR / "activation_keys.json"

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


# ---------------------------------------------------------------------------
# Storage helpers
# ---------------------------------------------------------------------------

def _ensure_dir():
    MINTOBABY_DIR.mkdir(parents=True, exist_ok=True)


def _load_users() -> dict:
    if USERS_FILE.exists():
        try:
            return json.loads(USERS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_users(data: dict):
    _ensure_dir()
    USERS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _load_keys() -> dict:
    if KEYS_FILE.exists():
        try:
            return json.loads(KEYS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _save_keys(data: dict):
    _ensure_dir()
    KEYS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Activation code generator
# ---------------------------------------------------------------------------

def _generate_activation_code() -> str:
    """Generate a unique MINTO-XXXX-XXXX-XXXX activation code."""
    def segment(length: int = 4) -> str:
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

    return f"MINTO-{segment()}-{segment()}-{segment()}"


def _unique_activation_code(users: dict) -> str:
    """Keep generating until we have one that does not already exist."""
    existing_codes = {v.get("activation_code") for v in users.values()}
    while True:
        code = _generate_activation_code()
        if code not in existing_codes:
            return code


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class GoogleTokenRequest(BaseModel):
    token: str


class ActivationRequest(BaseModel):
    code: str
    email: str | None = None
    service: str | None = "web"


class VerifyRequest(BaseModel):
    code: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/google")
async def google_login(req: GoogleTokenRequest):
    """
    Verify a Google ID token via Google's tokeninfo endpoint.
    Creates or updates the user record in ~/.mintobaby/users.json.
    Returns user profile plus their persistent activation code.
    """
    token = req.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token must not be empty.")

    # Verify token with Google
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": token},
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to reach Google token verification service: {exc}",
            )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Google token verification failed. The token may be invalid or expired.",
        )

    token_data = resp.json()

    sub = token_data.get("sub")
    email = token_data.get("email")
    name = token_data.get("name") or token_data.get("given_name", "")
    picture = token_data.get("picture", "")

    if not sub or not email:
        raise HTTPException(
            status_code=401,
            detail="Google token did not return a valid subject (sub) or email.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()

    users = _load_users()

    if sub in users:
        # Returning user — refresh mutable fields and last_login
        user = users[sub]
        user["email"] = email
        user["name"] = name
        user["picture"] = picture
        user["last_login"] = now_iso
    else:
        # First login — create full record with a new activation code
        activation_code = _unique_activation_code(users)
        user = {
            "sub": sub,
            "email": email,
            "name": name,
            "picture": picture,
            "activation_code": activation_code,
            "created_at": now_iso,
            "last_login": now_iso,
        }
        users[sub] = user

    _save_users(users)

    return {
        "success": True,
        "user": {
            "email": user["email"],
            "name": user["name"],
            "picture": user["picture"],
            "activation_code": user["activation_code"],
            "sub": user["sub"],
        },
    }


@router.get("/me")
async def get_me(code: str = Query(..., description="MINTO-XXXX-XXXX-XXXX activation code")):
    """
    Look up a user by their activation code and return their full profile.
    """
    code = code.strip().upper()
    if not code.startswith("MINTO-"):
        raise HTTPException(status_code=400, detail="Invalid activation code format. Must start with MINTO-.")

    users = _load_users()

    matched_user = next(
        (u for u in users.values() if u.get("activation_code") == code),
        None,
    )

    if matched_user is None:
        raise HTTPException(status_code=404, detail="No user found for the provided activation code.")

    return {
        "user": {
            "email": matched_user.get("email"),
            "name": matched_user.get("name"),
            "picture": matched_user.get("picture"),
            "activation_code": matched_user.get("activation_code"),
            "sub": matched_user.get("sub"),
            "created_at": matched_user.get("created_at"),
            "last_login": matched_user.get("last_login"),
        }
    }


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
        "details": keys[code],
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

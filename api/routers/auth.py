import json
import base64
import hashlib
import hmac
import os
import random
import string
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# ---------------------------------------------------------------------------
# File paths
# ---------------------------------------------------------------------------

MINTOBABY_DIR = Path.home() / ".mintobaby"
USERS_FILE = MINTOBABY_DIR / "users.json"
KEYS_FILE = MINTOBABY_DIR / "activation_keys.json"

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

SESSION_TTL_SECONDS = 7 * 24 * 3600


def make_session_token(identity: str, is_admin: bool = False) -> str:
    """HMAC-signed stateless session token: base64url(payload).base64url(sig)."""
    payload = json.dumps(
        {"id": identity, "admin": is_admin, "exp": int(time.time()) + SESSION_TTL_SECONDS},
        separators=(",", ":"),
    ).encode()
    key = hashlib.sha256(settings.encryption_secret.encode()).digest()
    signature = hmac.new(key, base64.urlsafe_b64encode(payload), hashlib.sha256).digest()
    return f"{base64.urlsafe_b64encode(payload).decode()}.{base64.urlsafe_b64encode(signature).decode()}"


def read_session_token(token: str) -> dict | None:
    """Validate an issued session token. Returns payload or None."""
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        key = hashlib.sha256(settings.encryption_secret.encode()).digest()
        expected = hmac.new(key, payload_b64.encode(), hashlib.sha256).digest()
        provided = base64.urlsafe_b64decode(signature_b64 + "==" * (-len(signature_b64) % 4))
        if not hmac.compare_digest(expected, provided):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "==" * (-len(payload_b64) % 4)))
        if int(payload.get("exp", 0)) < time.time():
            return None
        return payload
    except (ValueError, TypeError, KeyError):
        return None


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


class EmailLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


def _hash_password(password: str) -> str:
    """Store passwords as salted, slow PBKDF2-SHA256 hashes, never plaintext."""
    salt = os.urandom(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations_text, salt_text, digest_text = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        iterations = int(iterations_text)
        salt = base64.b64decode(salt_text)
        expected = base64.b64decode(digest_text)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _public_user(user: dict) -> dict:
    return {key: value for key, value in user.items() if key != "password_hash"}


class ActivationRequest(BaseModel):
    code: str
    email: str | None = None
    service: str | None = "web"


class VerifyRequest(BaseModel):
    code: str
    service: str | None = None      # telegram | cli | web — marks the pairing flag
    actor: str | None = None        # who paired (TG user id, hostname, etc.)


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
        "token": make_session_token(user["sub"]),
        "user": _public_user(user),
    }


@router.post("/email")
async def email_login(req: EmailLoginRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    # Admin credentials are environment-only and must never become a normal user.
    if settings.mintobaby_admin_email and email == settings.mintobaby_admin_email.strip().lower():
        if hmac.compare_digest(req.password, settings.mintobaby_admin_password or ""):
            token = make_session_token(email, is_admin=True)
            return {"success": True, "token": token, "user": {"email": email, "name": "Administrator", "picture": "", "activation_code": "", "sub": "admin", "isAdmin": True}}
        raise HTTPException(status_code=401, detail="Invalid administrator credentials.")

    users = _load_users()
    user_key = next((key for key, value in users.items() if value.get("email", "").lower() == email), None)
    now_iso = datetime.now(timezone.utc).isoformat()
    if user_key:
        user = users[user_key]
        if not _verify_password(req.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password.")
        user["last_login"] = now_iso
    else:
        user = {"sub": f"email:{email}", "email": email, "name": email.split("@", 1)[0], "picture": "", "activation_code": _unique_activation_code(users), "password_hash": _hash_password(req.password), "created_at": now_iso, "last_login": now_iso}
        users[user["sub"]] = user
    _save_users(users)
    token = make_session_token(user["sub"])
    return {"success": True, "token": token, "user": _public_user(user)}


@router.post("/admin")
async def admin_login(req: AdminLoginRequest):
    if not settings.mintobaby_admin_email or not settings.mintobaby_admin_password or not hmac.compare_digest(req.email.strip().lower(), settings.mintobaby_admin_email.strip().lower()) or not hmac.compare_digest(req.password, settings.mintobaby_admin_password):
        raise HTTPException(status_code=401, detail="Invalid administrator credentials.")
    email = req.email.strip().lower()
    return {"success": True, "token": make_session_token(email, is_admin=True), "user": {"email": email, "name": "Administrator", "picture": "", "activation_code": "", "sub": "admin", "isAdmin": True}}


@router.get("/me")
async def get_me(code: str = Query(..., description="MINTO-XXXX-XXXX-XXXX activation code")):
    """
    Look up a user by their activation code and return their full profile,
    including subscription state and tool pairing flags.
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

    keys = _load_keys()
    key_record = keys.get(code, {})
    return {
        "user": {
            **_public_user(matched_user),
            "created_at": matched_user.get("created_at"),
            "last_login": matched_user.get("last_login"),
            "subscription": matched_user.get("subscription"),
            "pairings": {
                "telegram": bool(key_record.get("telegram_paired")),
                "cli": bool(key_record.get("cli_paired")),
            },
        }
    }


@router.post("/activate")
async def activate_user(req: ActivationRequest):
    code = req.code.strip().upper()
    if not code.startswith("MINTO-"):
        raise HTTPException(status_code=400, detail="Invalid activation code format. Must start with MINTO-")

    keys = _load_keys()
    if code not in keys:
        # Allow redeeming the caller's own account key (issued at sign-up).
        users = _load_users()
        owned = any(value.get("activation_code") == code for value in users.values())
        if not owned:
            raise HTTPException(
                status_code=404,
                detail="Unknown activation key. Keys are issued by an administrator or created when you sign in.",
            )

    keys[code] = {
        "code": code,
        "email": req.email or keys.get(code, {}).get("email"),
        "service": req.service or keys.get(code, {}).get("service", "web"),
        "active": True,
        "activated_at": datetime.now(timezone.utc).isoformat(),
        "telegram_paired": keys.get(code, {}).get("telegram_paired", False),
        "cli_paired": keys.get(code, {}).get("cli_paired", False),
    }
    _save_keys(keys)

    return {
        "success": True,
        "message": "Activation Key activated for Telegram Bot and CLI Terminal.",
        "code": code,
        "details": keys[code],
    }


@router.post("/verify")
async def verify_code(req: VerifyRequest):
    """
    Strict activation-key verification. A code is valid only if:
      - it was issued by an administrator and is still active, or
      - it is the activation code of a real signed-up user account.
    Passcode guessing and format-only checks are rejected.
    """
    code = req.code.strip().upper()
    if not code.startswith("MINTO-"):
        raise HTTPException(status_code=404, detail="Invalid activation code.")

    keys = _load_keys()
    users = _load_users()
    owner = next((u for u in users.values() if u.get("activation_code") == code), None)
    record = keys.get(code)

    is_valid = bool(record and record.get("active")) or owner is not None
    if not is_valid:
        raise HTTPException(status_code=404, detail="Invalid or expired activation code.")

    # A key unlocks the WEB console only when an administrator issued it.
    # A user's own account code pairs Telegram/CLI but never bypasses payment.
    web_unlock = bool(record and record.get("active"))

    # Record tool pairing when a service verifies through this endpoint.
    service = (req.service or "").strip().lower()
    if service in {"telegram", "cli"}:
        record = record or {
            "code": code,
            "email": owner.get("email") if owner else None,
            "service": "web",
            "active": True,
            "activated_at": datetime.now(timezone.utc).isoformat(),
            "telegram_paired": False,
            "cli_paired": False,
        }
        flag = "telegram_paired" if service == "telegram" else "cli_paired"
        record[flag] = True
        record[f"{flag}_actor"] = req.actor
        record[f"{flag}_at"] = datetime.now(timezone.utc).isoformat()
        keys[code] = record
        _save_keys(keys)

    return {
        "valid": True,
        "web_unlock": web_unlock,
        "details": {
            "code": code,
            "email": (record or {}).get("email") or (owner or {}).get("email"),
            "telegram_paired": bool((record or {}).get("telegram_paired")),
            "cli_paired": bool((record or {}).get("cli_paired")),
            "owner": owner is not None,
            "web_unlock": web_unlock,
        },
    }


@router.get("/access")
async def check_access(code: str = Query(..., description="MINTO-XXXX-XXXX-XXXX activation code")):
    """
    Server-authoritative web-console access decision:
    active paid subscription OR active admin-issued key.
    """
    code = code.strip().upper()
    users = _load_users()
    user = next((u for u in users.values() if u.get("activation_code") == code), None)
    subscription = user.get("subscription") if user else None
    keys = _load_keys()
    record = keys.get(code)
    has_key = bool(record and record.get("active"))
    active = bool(subscription and subscription.get("active")) or has_key
    return {
        "active": active,
        "via_subscription": bool(subscription and subscription.get("active")),
        "via_key": has_key,
        "subscription": subscription,
        "user_found": user is not None,
    }

import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from ..config import settings

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])
USERS_FILE = Path.home() / ".mintobaby" / "users.json"

PLANS = {
    "starter": {"weekly": 10, "monthly": 49, "yearly": 350},
    "pro": {"weekly": 25, "monthly": 100, "yearly": 750},
    "enterprise": {"weekly": 50, "monthly": 200, "yearly": 1500},
}

class CheckoutRequest(BaseModel):
    plan: str
    billingCycle: str
    paymentMethod: str
    activationCode: str

class CryptoVerifyRequest(BaseModel):
    txHash: str
    plan: str
    billingCycle: str
    activationCode: str


def _require_user(code: str) -> dict:
    try:
        users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        raise HTTPException(status_code=401, detail="Authentication session not found.")
    user = next((item for item in users.values() if item.get("activation_code") == code.strip().upper()), None)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication session is invalid or expired.")
    return user


def _validate_request(plan: str, billing_cycle: str, payment_method: str):
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Unknown subscription plan.")
    if billing_cycle not in PLANS[plan]:
        raise HTTPException(status_code=400, detail="Unknown billing cycle.")
    if payment_method not in {"stripe", "crypto"}:
        raise HTTPException(status_code=400, detail="Unsupported payment method.")


@router.post("/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    _require_user(req.activationCode)
    _validate_request(req.plan, req.billingCycle, req.paymentMethod)
    amount_usd = PLANS[req.plan][req.billingCycle]

    if req.paymentMethod == "crypto":
        if not settings.payment_recipient:
            raise HTTPException(status_code=503, detail="Crypto payments are not configured.")
        return {
            "paymentMethod": "crypto",
            "paymentAddress": settings.payment_recipient,
            "amountUsd": amount_usd,
            "network": "Robinhood Chain",
            "instructions": f"Send ${amount_usd:.2f} in ETH or WETH to {settings.payment_recipient}, then submit the transaction hash for verification.",
        }

    try:
        import stripe
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe payments are not configured on this server.")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe payments are not configured on this server.")

    stripe.api_key = settings.stripe_secret_key
    origin = str(request.base_url).rstrip("/")
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price_data": {"currency": "usd", "product_data": {"name": f"MintoBaby {req.plan.title()} subscription"}, "unit_amount": amount_usd * 100}, "quantity": 1}],
        success_url=f"{origin}/subscriptions/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/subscriptions/cancelled",
        metadata={"plan": req.plan, "billing_cycle": req.billingCycle, "activation_code": req.activationCode.strip().upper()},
    )
    return {"paymentMethod": "stripe", "checkoutUrl": session.url, "amountUsd": amount_usd}


@router.post("/crypto/verify")
async def verify_crypto_payment(req: CryptoVerifyRequest):
    _require_user(req.activationCode)
    _validate_request(req.plan, req.billingCycle, "crypto")
    raise HTTPException(status_code=501, detail="On-chain verification provider is not configured for the web API yet.")


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str | None = Header(default=None)):
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured.")
    try:
        import stripe
        payload = await request.body()
        event = stripe.Webhook.construct_event(payload, stripe_signature or "", settings.stripe_webhook_secret)
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe payments are not configured on this server.")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}")
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        if metadata.get("activation_code"):
            _persist_subscription(metadata)
    return {"received": True}


def _persist_subscription(metadata: dict):
    user = _require_user(metadata["activation_code"])
    user["subscription"] = {
        "plan": metadata.get("plan"),
        "billingCycle": metadata.get("billing_cycle"),
        "active": True,
        "activatedAt": datetime.now(timezone.utc).isoformat(),
    }
    users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    for key, value in users.items():
        if value.get("activation_code") == user.get("activation_code"):
            users[key] = user
            break
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")

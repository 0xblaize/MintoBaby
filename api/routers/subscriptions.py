import json
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from ..config import settings
from ..services.chain import ChainService, NETWORKS
from ..services import payments

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


@router.get("/config")
async def payment_config():
    """Which payment methods are actually wired up right now."""
    return {
        "methods": {
            "crypto": bool(settings.payment_recipient),
            "stripe": bool(settings.stripe_secret_key),
        },
        "default": "crypto" if settings.payment_recipient else ("stripe" if settings.stripe_secret_key else None),
        "confirmations": settings.payment_confirmations,
    }


@router.post("/checkout")
async def create_checkout(req: CheckoutRequest, request: Request):
    _require_user(req.activationCode)
    _validate_request(req.plan, req.billingCycle, req.paymentMethod)
    amount_usd = PLANS[req.plan][req.billingCycle]

    if req.paymentMethod == "crypto":
        if not settings.payment_recipient:
            raise HTTPException(status_code=503, detail="Crypto payments are not configured.")
        amount_eth = None
        usd_quote = await payments.get_eth_usd_price()
        if usd_quote:
            amount_eth = f"{amount_usd / usd_quote:.6f}"
        return {
            "paymentMethod": "crypto",
            "paymentAddress": settings.payment_recipient,
            "amountUsd": amount_usd,
            "amountEthEstimate": amount_eth,
            "usdQuote": usd_quote,
            "network": "Robinhood Chain",
            "wethAddress": settings.weth_address,
            "confirmations": settings.payment_confirmations,
            "instructions": (
                f"Send at least ${amount_usd:.2f} worth of ETH (≈ {amount_eth or '?'} ETH) or WETH "
                f"on Robinhood Chain (4663) to {settings.payment_recipient}. "
                f"After {settings.payment_confirmations} confirmations, submit the transaction hash for verification."
            ),
        }

    try:
        import stripe
    except ImportError:
        raise HTTPException(status_code=503, detail="Stripe payments are not configured on this server.")
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe payments are not configured on this server.")

    stripe.api_key = settings.stripe_secret_key
    origin = settings.web_url.rstrip("/")
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{"price_data": {"currency": "usd", "product_data": {"name": f"MintoBaby {req.plan.title()} subscription"}, "unit_amount": amount_usd * 100}, "quantity": 1}],
        success_url=f"{origin}/subscribe?paid=1&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/subscribe?cancelled=1",
        metadata={"plan": req.plan, "billing_cycle": req.billingCycle, "activation_code": req.activationCode.strip().upper()},
    )
    return {"paymentMethod": "stripe", "checkoutUrl": session.url, "amountUsd": amount_usd}


@router.post("/crypto/verify")
async def verify_crypto_payment(req: CryptoVerifyRequest):
    user = _require_user(req.activationCode)
    _validate_request(req.plan, req.billingCycle, "crypto")
    if not settings.payment_recipient:
        raise HTTPException(status_code=503, detail="Crypto payments are not configured.")

    amount_usd = PLANS[req.plan][req.billingCycle]
    net = NETWORKS["robinhood"]
    chain = ChainService(net["rpc"], net["chain_id"], "robinhood")
    result = await payments.verify_subscription_payment(
        chain,
        tx_hash=req.txHash,
        recipient=settings.payment_recipient,
        required_usd=amount_usd,
        confirmations=settings.payment_confirmations,
        weth_address=settings.weth_address,
        activation_code=req.activationCode.strip().upper(),
    )

    if result["status"] != "accepted":
        code = {"pending": 425, "invalid": 402, "unavailable": 503}.get(result["status"], 400)
        raise HTTPException(status_code=code, detail=result.get("reason", "Payment could not be verified."))

    payment = result["payment"]
    subscription = {
        "plan": req.plan,
        "billingCycle": req.billingCycle,
        "active": True,
        "paidWith": payment["asset"],
        "amountPaidEth": f"{payment['amount_eth']:.6f}",
        "txHash": payment["tx_hash"],
        "activatedAt": datetime.now(timezone.utc).isoformat(),
    }
    user["subscription"] = subscription
    users = json.loads(USERS_FILE.read_text(encoding="utf-8"))
    for key, value in users.items():
        if value.get("activation_code") == req.activationCode.strip().upper():
            users[key] = user
            break
    USERS_FILE.write_text(json.dumps(users, indent=2), encoding="utf-8")
    return {"active": True, "subscription": subscription}


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

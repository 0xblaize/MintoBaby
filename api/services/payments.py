import json
import logging
import time
from pathlib import Path

import aiohttp

from .chain import ChainService

logger = logging.getLogger("mintobaby.payments")

MINTOBABY_DIR = Path.home() / ".mintobaby"
USED_PAYMENTS_FILE = MINTOBABY_DIR / "used_payments.json"

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

_price_cache: dict = {"price": None, "fetched_at": 0.0}
PRICE_FRESH_SECONDS = 60
PRICE_STALE_OK_SECONDS = 600

PRICE_SOURCES = [
    ("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
     lambda body: body.get("ethereum", {}).get("usd")),
    ("https://api.coinbase.com/v2/exchange-rates?currency=ETH",
     lambda body: float(body.get("data", {}).get("rates", {}).get("USD", 0))),
    ("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT",
     lambda body: float(body.get("price", 0))),
    ("https://api.kraken.com/0/public/Ticker?pair=ETHUSD",
     lambda body: float(next(iter(body.get("result", {}).values())).get("c", [0])[0])),
]


async def _fetch_json(url: str) -> dict | None:
    for attempt in range(2):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers={"accept": "application/json", "user-agent": "mintobaby-engine/1.0"},
                                       timeout=aiohttp.ClientTimeout(total=6)) as resp:
                    if resp.ok:
                        return await resp.json(content_type=None)
        except Exception as exc:
            logger.debug("price source %s attempt %s failed: %s", url, attempt + 1, exc)
        if attempt == 0:
            await _sleep(0.4)
    return None


async def _sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)


async def get_eth_usd_price() -> float | None:
    now = time.time()
    price, fetched_at = _price_cache["price"], _price_cache["fetched_at"]
    if price and now - fetched_at < PRICE_FRESH_SECONDS:
        return price
    for url, read in PRICE_SOURCES:
        body = await _fetch_json(url)
        if not body:
            continue
        try:
            value = float(read(body) or 0)
        except (TypeError, ValueError, KeyError, StopIteration):
            continue
        if value > 0:
            _price_cache.update(price=value, fetched_at=now)
            return value
    # Network flake fallback: a price fetched within the last 10 minutes is still
    # accurate enough for a subscription threshold; anything older is rejected.
    if price and now - fetched_at < PRICE_STALE_OK_SECONDS:
        return price
    return None


def _load_used() -> dict:
    if USED_PAYMENTS_FILE.exists():
        try:
            return json.loads(USED_PAYMENTS_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _mark_used(payment_id: str, activation_code: str) -> None:
    MINTOBABY_DIR.mkdir(parents=True, exist_ok=True)
    used = _load_used()
    used[payment_id] = {
        "activation_code": activation_code,
        "used_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    USED_PAYMENTS_FILE.write_text(json.dumps(used, indent=2), encoding="utf-8")


def normalize_hash(value: str) -> str | None:
    value = value.strip()
    if value.lower().startswith("http"):
        marker = "/tx/"
        if marker not in value:
            return None
        value = value.split(marker, 1)[1].split("?", 1)[0]
    if len(value) == 66 and value.startswith("0x"):
        try:
            int(value, 16)
            return value.lower()
        except ValueError:
            return None
    return None


async def verify_subscription_payment(
    chain: ChainService,
    tx_hash: str,
    recipient: str,
    required_usd: float,
    confirmations: int,
    weth_address: str | None = None,
    activation_code: str | None = None,
) -> dict:
    """
    On-chain verification of an ETH or WETH payment on the target chain,
    mirroring src/access/payment-verifier.ts. Never trusts the client.
    """
    tx = normalize_hash(tx_hash)
    if not tx:
        return {"status": "invalid", "reason": "Send the full 0x transaction hash or a Blockscout transaction URL."}

    used = _load_used()
    if any(key.startswith(f"{tx}:") for key in used):
        return {"status": "invalid", "reason": "This transaction has already been used for a payment and cannot be reused."}

    usd_quote = await get_eth_usd_price()
    if not usd_quote:
        return {"status": "unavailable", "reason": "ETH/USD price is temporarily unavailable. Try again shortly."}
    required_wei = int(-(-required_usd // usd_quote * 10**18))  # ceil

    tx_data = await chain._json_rpc("eth_getTransactionByHash", [tx])
    if not tx_data:
        return {"status": "pending", "reason": "Transaction was not found yet. Wait for it to be broadcast."}
    receipt = await chain.get_transaction_receipt(tx)
    if not receipt:
        return {"status": "pending", "reason": "Transaction is still pending confirmation."}
    if receipt.get("status") != "0x1":
        return {"status": "invalid", "reason": "The transaction reverted on-chain."}

    latest = await chain.get_block_number()
    block_number = int(receipt.get("blockNumber", "0x0"), 16)
    confs = max(0, latest - block_number + 1)
    if confs < confirmations:
        return {"status": "pending", "reason": f"Waiting for confirmations ({confs}/{confirmations})."}

    sender = (tx_data.get("from") or "").lower()
    recipient_norm = recipient.lower()

    # Native ETH transfer straight to the recipient
    if (tx_data.get("to") or "").lower() == recipient_norm and int(tx_data.get("value", "0x0"), 16) >= required_wei:
        amount_wei = int(tx_data.get("value", "0x0"), 16)
        _mark_used(f"{tx}:ETH:-1", activation_code or "unknown")
        return {
            "status": "accepted",
            "payment": {
                "tx_hash": tx, "asset": "ETH", "sender": sender,
                "amount_wei": amount_wei, "amount_eth": amount_wei / 1e18,
                "required_usd": required_usd, "usd_quote": usd_quote, "block_number": block_number,
            },
        }

    # WETH Transfer log routed to the recipient
    weth = (weth_address or "").lower()
    if weth:
        for log in receipt.get("logs") or []:
            topics = log.get("topics") or []
            if (log.get("address") or "").lower() != weth or not topics or topics[0].lower() != TRANSFER_TOPIC:
                continue
            if len(topics) < 3:
                continue
            transfer_recipient = "0x" + topics[2][-40:].lower()
            if transfer_recipient != recipient_norm:
                continue
            data = (log.get("data") or "0x0").lower()
            try:
                amount_wei = int(data, 16)
            except ValueError:
                continue
            if amount_wei < required_wei:
                continue
            log_index = int(log.get("logIndex", "0x0"), 16)
            _mark_used(f"{tx}:WETH:{log_index}", activation_code or "unknown")
            return {
                "status": "accepted",
                "payment": {
                    "tx_hash": tx, "asset": "WETH", "sender": sender,
                    "amount_wei": amount_wei, "amount_eth": amount_wei / 1e18,
                    "required_usd": required_usd, "usd_quote": usd_quote, "block_number": block_number,
                },
            }

    return {"status": "invalid", "reason": "Payment recipient, asset, or amount did not match the required subscription payment."}

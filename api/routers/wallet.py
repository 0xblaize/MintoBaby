import json
import aiohttp
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends

from ..config import settings
from ..models import WalletInfo, WalletExport, ImportKeyRequest
from ..services.crypto import encrypt_key, decrypt_key, generate_wallet, import_wallet
from ..services.chain import ChainService

router = APIRouter(prefix="/wallet", tags=["wallet"])

WALLET_FILE = Path.home() / ".mintobaby" / "wallet.enc"


def _ensure_dir():
    WALLET_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_raw() -> dict | None:
    if WALLET_FILE.exists():
        return json.loads(WALLET_FILE.read_text())
    return None


def _save_raw(data: dict):
    _ensure_dir()
    WALLET_FILE.write_text(json.dumps(data))


def get_chain() -> ChainService:
    return ChainService(settings.rpc_url, settings.chain_id)


@router.get("/", response_model=WalletInfo)
async def get_wallet(chain: ChainService = Depends(get_chain)):
    raw = _load_raw()
    if not raw:
        raise HTTPException(status_code=404, detail="No wallet found. Generate or import one first.")
    balance = await chain.get_balance(raw["address"])
    return WalletInfo(address=raw["address"], has_key=True, balance_eth=balance)


@router.post("/generate", response_model=WalletInfo)
async def generate(chain: ChainService = Depends(get_chain)):
    w   = generate_wallet()
    enc = encrypt_key(w["private_key"], settings.encryption_secret)
    _save_raw({"address": w["address"], **enc})
    balance = await chain.get_balance(w["address"])
    return WalletInfo(address=w["address"], has_key=True, balance_eth=balance)


@router.post("/import", response_model=WalletInfo)
async def import_key(req: ImportKeyRequest, chain: ChainService = Depends(get_chain)):
    try:
        w   = import_wallet(req.private_key)
        enc = encrypt_key(w["private_key"], settings.encryption_secret)
        _save_raw({"address": w["address"], **enc})
        balance = await chain.get_balance(w["address"])
        return WalletInfo(address=w["address"], has_key=True, balance_eth=balance)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid private key: {exc}")


@router.post("/export", response_model=WalletExport)
async def export_key(chain: ChainService = Depends(get_chain)):
    raw = _load_raw()
    if not raw:
        raise HTTPException(status_code=404, detail="No wallet found.")
    try:
        pk = decrypt_key(raw["encrypted_key"], raw["iv"], raw["tag"], settings.encryption_secret)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Decryption failed: {exc}")
    balance = await chain.get_balance(raw["address"])
    return WalletExport(address=raw["address"], has_key=True, balance_eth=balance, private_key=pk)


@router.delete("/")
async def delete_wallet():
    if WALLET_FILE.exists():
        WALLET_FILE.unlink()
    return {"success": True, "message": "Wallet deleted."}

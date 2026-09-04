import base58
from solders.keypair import Keypair


def generate_solana_wallet() -> dict:
    keypair = Keypair()
    secret_key = base58.b58encode(bytes(keypair)).decode()
    return {"address": str(keypair.pubkey()), "private_key": secret_key}


def import_solana_wallet(private_key: str) -> dict:
    raw = base58.b58decode(private_key.strip())
    keypair = Keypair.from_bytes(raw)
    return {"address": str(keypair.pubkey()), "private_key": private_key.strip()}

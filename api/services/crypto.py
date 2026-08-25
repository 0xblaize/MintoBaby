import os
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from eth_account import Account


def _derive_key(secret: str) -> bytes:
    """SHA-256 of the secret string → 32-byte AES key."""
    return hashlib.sha256(secret.encode()).digest()


def encrypt_key(private_key: str, secret: str) -> dict:
    """AES-256-GCM encrypt a private key. Returns {encrypted_key, iv, tag} as hex strings."""
    aes_key = _derive_key(secret)
    iv = os.urandom(12)
    aesgcm = AESGCM(aes_key)
    # AESGCM.encrypt returns ciphertext + 16-byte tag appended
    ct_with_tag = aesgcm.encrypt(iv, private_key.encode(), None)
    ct = ct_with_tag[:-16]
    tag = ct_with_tag[-16:]
    return {
        "encrypted_key": ct.hex(),
        "iv":            iv.hex(),
        "tag":           tag.hex(),
    }


def decrypt_key(encrypted_key: str, iv: str, tag: str, secret: str) -> str:
    """AES-256-GCM decrypt. Returns the original private key string."""
    aes_key = _derive_key(secret)
    aesgcm = AESGCM(aes_key)
    ct  = bytes.fromhex(encrypted_key)
    iv_b = bytes.fromhex(iv)
    tag_b = bytes.fromhex(tag)
    plaintext = aesgcm.decrypt(iv_b, ct + tag_b, None)
    return plaintext.decode()


def generate_wallet() -> dict:
    """Generate a random EVM wallet. Returns {address, private_key}."""
    account = Account.create()
    return {"address": account.address, "private_key": account.key.hex()}


def import_wallet(private_key: str) -> dict:
    """Derive address from a private key. Returns {address, private_key}."""
    clean = private_key if private_key.startswith("0x") else f"0x{private_key}"
    account = Account.from_key(clean)
    return {"address": account.address, "private_key": clean}

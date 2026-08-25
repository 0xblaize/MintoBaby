import aiohttp
import asyncio
from typing import Optional, Literal

NetworkType = Literal["robinhood", "ink", "solana"]

NETWORKS = {
    "robinhood": {
        "name": "Robinhood Chain",
        "rpc": "https://rpc.mainnet.chain.robinhood.com",
        "chain_id": 4663,
        "type": "evm",
        "symbol": "ETH",
        "explorer": "https://robinhoodchain.blockscout.com"
    },
    "ink": {
        "name": "Ink L2 (Kraken)",
        "rpc": "https://rpc-gel.inkonchain.com",
        "chain_id": 57073,
        "type": "evm",
        "symbol": "ETH",
        "explorer": "https://explorer.inkonchain.com"
    },
    "solana": {
        "name": "Solana Mainnet",
        "rpc": "https://api.mainnet-beta.solana.com",
        "chain_id": None,
        "type": "solana",
        "symbol": "SOL",
        "explorer": "https://solscan.io"
    }
}


def _decode_string(hex_result: Optional[str]) -> Optional[str]:
    """Manual ABI string decoder for name() / symbol() return values."""
    if not hex_result or hex_result == "0x":
        return None
    try:
        raw = hex_result.removeprefix("0x")
        if len(raw) >= 128:
            length = int(raw[64:128], 16)
            if 0 < length <= 512:
                data_hex = raw[128: 128 + length * 2]
                result = ""
                for i in range(0, len(data_hex), 2):
                    code = int(data_hex[i:i+2], 16)
                    if 32 <= code <= 126:
                        result += chr(code)
                if result.strip():
                    return result.strip()
        # Fallback: bytes32 fixed-length string
        b32 = raw[:64].rstrip("0")
        out = ""
        for i in range(0, len(b32), 2):
            code = int(b32[i:i+2], 16)
            if 32 <= code <= 126:
                out += chr(code)
        return out.strip() or None
    except Exception:
        return None


def _decode_uint256(hex_result: Optional[str]) -> Optional[int]:
    if not hex_result or hex_result == "0x":
        return None
    try:
        return int(hex_result, 16)
    except Exception:
        return None


def _decode_bool(hex_result: Optional[str]) -> Optional[bool]:
    if not hex_result or hex_result == "0x":
        return None
    try:
        return int(hex_result, 16) != 0
    except Exception:
        return None


def _pad_address(addr: str) -> str:
    """Pad an address to 32-byte ABI parameter (no 0x prefix)."""
    return addr.removeprefix("0x").lower().zfill(64)


class ChainService:
    def __init__(self, rpc_url: Optional[str] = None, chain_id: Optional[int] = 4663, network: NetworkType = "robinhood"):
        net_cfg = NETWORKS.get(network, NETWORKS["robinhood"])
        self.network = network
        self.rpc_url = rpc_url or net_cfg["rpc"]
        self.chain_id = chain_id or net_cfg["chain_id"]
        self.net_type = net_cfg["type"]
        self.symbol = net_cfg["symbol"]

    async def eth_call(self, to: str, data: str, attempts: int = 2) -> Optional[str]:
        """Single JSON-RPC eth_call with retry."""
        if self.net_type == "solana":
            return None
        for attempt in range(1, attempts + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.rpc_url,
                        json={"jsonrpc": "2.0", "id": attempt, "method": "eth_call",
                              "params": [{"to": to, "data": data}, "latest"]},
                        timeout=aiohttp.ClientTimeout(total=5),
                    ) as resp:
                        if not resp.ok:
                            continue
                        body = await resp.json()
                        if body.get("error"):
                            continue
                        result = body.get("result")
                        if result and result != "0x":
                            return result
            except Exception:
                pass
            if attempt < attempts:
                await asyncio.sleep(0.15 * attempt)
        return None

    async def get_balance(self, address: str) -> str:
        """Return balance as a formatted string (6 dp). Works for EVM & Solana."""
        try:
            async with aiohttp.ClientSession() as session:
                if self.net_type == "solana":
                    async with session.post(
                        self.rpc_url,
                        json={"jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [address]},
                        timeout=aiohttp.ClientTimeout(total=4),
                    ) as resp:
                        body = await resp.json()
                        val = body.get("result", {}).get("value", 0)
                        return f"{val / 1e9:.6f}"
                else:
                    async with session.post(
                        self.rpc_url,
                        json={"jsonrpc": "2.0", "id": 1, "method": "eth_getBalance",
                              "params": [address, "latest"]},
                        timeout=aiohttp.ClientTimeout(total=4),
                    ) as resp:
                        body = await resp.json()
                        result = body.get("result")
                        if result:
                            wei = int(result, 16)
                            return f"{wei / 1e18:.6f}"
        except Exception:
            pass
        return "0.000000"

    async def get_block_number(self) -> int:
        try:
            async with aiohttp.ClientSession() as session:
                method = "getSlot" if self.net_type == "solana" else "eth_blockNumber"
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": method, "params": []},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    body = await resp.json()
                    result = body.get("result")
                    if result is not None:
                        return int(result) if self.net_type == "solana" else int(result, 16)
        except Exception:
            pass
        return 0

    async def send_raw_transaction(self, raw_tx: str) -> Optional[str]:
        """Broadcast a signed raw transaction. Returns tx hash."""
        try:
            async with aiohttp.ClientSession() as session:
                method = "sendTransaction" if self.net_type == "solana" else "eth_sendRawTransaction"
                params = [raw_tx, {"encoding": "base64"}] if self.net_type == "solana" else [raw_tx]
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    body = await resp.json()
                    if body.get("error"):
                        raise ValueError(body["error"].get("message", "RPC error"))
                    return body.get("result")
        except Exception as exc:
            raise exc

    async def get_transaction_receipt(self, tx_hash: str) -> Optional[dict]:
        if self.net_type == "solana":
            return {"status": "0x1", "blockNumber": "0x1"}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionReceipt",
                          "params": [tx_hash]},
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    body = await resp.json()
                    return body.get("result")
        except Exception:
            return None

    async def get_transaction_count(self, address: str) -> int:
        if self.net_type == "solana":
            return 0
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "eth_getTransactionCount",
                          "params": [address, "pending"]},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    body = await resp.json()
                    result = body.get("result")
                    if result:
                        return int(result, 16)
        except Exception:
            pass
        return 0

    async def estimate_gas(self, from_addr: str, to: str, data: str, value_wei: int) -> int:
        if self.net_type == "solana":
            return 5000
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "eth_estimateGas",
                          "params": [{"from": from_addr, "to": to, "data": data,
                                      "value": hex(value_wei)}]},
                    timeout=aiohttp.ClientTimeout(total=6),
                ) as resp:
                    body = await resp.json()
                    if body.get("error"):
                        raise ValueError(body["error"].get("message", "estimateGas failed"))
                    result = body.get("result")
                    if result:
                        return int(result, 16)
        except Exception as exc:
            raise exc
        return 300000

    async def get_gas_price(self) -> int:
        if self.net_type == "solana":
            return 5000
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.rpc_url,
                    json={"jsonrpc": "2.0", "id": 1, "method": "eth_gasPrice", "params": []},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    body = await resp.json()
                    result = body.get("result")
                    if result:
                        return int(result, 16)
        except Exception:
            pass
        return 1_000_000_000  # 1 gwei fallback

    @staticmethod
    def decode_string(hex_result: Optional[str]) -> Optional[str]:
        return _decode_string(hex_result)

    @staticmethod
    def decode_uint256(hex_result: Optional[str]) -> Optional[int]:
        return _decode_uint256(hex_result)

    @staticmethod
    def decode_bool(hex_result: Optional[str]) -> Optional[bool]:
        return _decode_bool(hex_result)

    @staticmethod
    def pad_address(addr: str) -> str:
        return _pad_address(addr)

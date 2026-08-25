import asyncio
import aiohttp
import time
from typing import Optional

from .chain import ChainService
from ..models import DiscoveryResult

SEADROP_ADDRESS = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5"
BLOCKSCOUT_API  = "https://robinhoodchain.blockscout.com/api/v2/tokens"


class DiscoveryService:
    def __init__(self, chain: ChainService):
        self.chain = chain

    async def _blockscout_meta(self, address: str) -> dict:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{BLOCKSCOUT_API}/{address}",
                    headers={"Accept": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    if resp.ok:
                        data = await resp.json()
                        return {
                            "name":   (data.get("name") or "").strip() or None,
                            "symbol": (data.get("symbol") or "").strip() or None,
                        }
        except Exception:
            pass
        return {}

    async def _get_seadrop_address(self, nft_addr: str) -> Optional[str]:
        """Ask the NFT contract for its SeaDrop address."""
        for selector in ["0xb2490c3b", "0xb842ffc4"]:
            result = await self.chain.eth_call(nft_addr, selector)
            if not result:
                continue
            raw = result.removeprefix("0x")
            # getAllowedSeaDrop  → last 40 chars of word 0
            # getAllowedSeaDrops → word 2 (offset 128-192) last 40 chars
            word = raw[-40:] if selector == "0xb2490c3b" else raw[128:192][-40:]
            addr = "0x" + word
            if len(addr) == 42 and not addr.lower() == "0x" + "0" * 40:
                return addr
        return None

    async def _fetch_seadrop_stage(self, nft_addr: str) -> Optional[dict]:
        """Query getPublicDrop on SeaDrop. Returns {price_wei, start_ms, end_ms, max_per_wallet, address}."""
        discovered = await self._get_seadrop_address(nft_addr)
        candidates = []
        if discovered:
            candidates.append(discovered)
        candidates.append(SEADROP_ADDRESS)

        calldata = "0xbc6a629c" + self.chain.pad_address(nft_addr)

        for sea_addr in candidates:
            result = await self.chain.eth_call(sea_addr, calldata)
            if not result:
                continue
            raw = result.removeprefix("0x")
            if len(raw) < 128:
                continue
            try:
                price_wei   = int(raw[0:64],   16)
                start_sec   = int(raw[64:128],  16)
                end_sec     = int(raw[128:192], 16)
                max_wallet  = int(raw[192:256], 16) if len(raw) >= 256 else 0

                start_ms = start_sec * 1000 if 1_700_000_000 < start_sec < 1_956_528_000 else None
                end_ms   = end_sec   * 1000 if 1_700_000_000 < end_sec   < 1_956_528_000 else None
                return {
                    "price_wei":     price_wei,
                    "start_ms":      start_ms,
                    "end_ms":        end_ms,
                    "max_per_wallet": max_wallet if 0 < max_wallet <= 10000 else None,
                    "address":       sea_addr,
                }
            except Exception:
                continue
        return None

    async def discover(self, raw_address: str) -> DiscoveryResult:
        address = raw_address.strip()
        if not (address.startswith("0x") and len(address) == 42):
            raise ValueError(f"Invalid address: {address}")

        # Fire all probes concurrently
        (
            name_hex, symbol_hex,
            price_hex, cost_hex, price2_hex, pub_price_hex,
            max_w_hex, max_mw_hex,
            start_hex, pub_start_hex,
            sale_hex, sale2_hex, pub_mint_hex, paused_hex,
            blockscout, seadrop
        ) = await asyncio.gather(
            self.chain.eth_call(address, "0x06fdde03"),   # name()
            self.chain.eth_call(address, "0x95d89b41"),   # symbol()
            self.chain.eth_call(address, "0x5a1a473f"),   # mintPrice()
            self.chain.eth_call(address, "0x3e1850dc"),   # cost()
            self.chain.eth_call(address, "0xa035b1fe"),   # price()
            self.chain.eth_call(address, "0xd3d96ff4"),   # publicPrice()
            self.chain.eth_call(address, "0x8b329432"),   # maxPerWallet()
            self.chain.eth_call(address, "0xb5090f42"),   # maxMintPerWallet()
            self.chain.eth_call(address, "0x78e97925"),   # startTime()
            self.chain.eth_call(address, "0x4f4949dc"),   # publicSaleStartTime()
            self.chain.eth_call(address, "0x0374e2cf"),   # isSaleActive()
            self.chain.eth_call(address, "0xd4290740"),   # saleIsActive()
            self.chain.eth_call(address, "0xfa399587"),   # isPublicMintActive()
            self.chain.eth_call(address, "0x5c975abb"),   # paused()
            self._blockscout_meta(address),
            self._fetch_seadrop_stage(address),
        )

        c = self.chain

        # Name / Symbol
        name   = c.decode_string(name_hex)   or blockscout.get("name")
        symbol = c.decode_string(symbol_hex) or blockscout.get("symbol")

        # Price
        prices = [c.decode_uint256(h) for h in [price_hex, cost_hex, price2_hex, pub_price_hex]]
        std_price = next((p for p in prices if p is not None and p > 0), None)
        zero_price = any(p == 0 for p in prices if p is not None)
        sea_price = seadrop["price_wei"] if seadrop else None
        price_wei = (sea_price if sea_price and sea_price > 0 else None) or std_price or 0
        price_eth = f"{price_wei / 1e18:.6f}"
        price_status = "known" if (std_price is not None or zero_price or sea_price is not None) else "unavailable"

        # Max per wallet
        raw_lim = c.decode_uint256(max_w_hex) or c.decode_uint256(max_mw_hex)
        max_per_wallet: Optional[int] = None
        if raw_lim and 0 < raw_lim <= 10000:
            max_per_wallet = raw_lim
        elif seadrop and seadrop.get("max_per_wallet"):
            max_per_wallet = seadrop["max_per_wallet"]

        # Start / end time
        raw_time = c.decode_uint256(start_hex) or c.decode_uint256(pub_start_hex)
        start_ms: Optional[int] = None
        if raw_time and 1_700_000_000 < raw_time < 1_950_000_000:
            start_ms = raw_time * 1000
        if not start_ms and seadrop:
            start_ms = seadrop.get("start_ms")
        end_ms: Optional[int] = seadrop.get("end_ms") if seadrop else None

        # Phase kind
        phase_kind = "seadrop" if seadrop else "public"

        # Live / phase status
        is_paused        = c.decode_bool(paused_hex)
        sale_active      = c.decode_bool(sale_hex)
        sale_active2     = c.decode_bool(sale2_hex)
        pub_mint_active  = c.decode_bool(pub_mint_hex)
        any_active_flag  = any(x is True for x in [sale_active, sale_active2, pub_mint_active])
        any_known_flag   = any(x is not None for x in [sale_active, sale_active2, pub_mint_active])

        now_ms = int(time.time() * 1000)
        if end_ms and end_ms <= now_ms:
            phase_status = "expired"
        elif start_ms and start_ms > now_ms:
            phase_status = "not_open"
        elif is_paused or (any_known_flag and not any_active_flag):
            phase_status = "not_open"
        elif any_active_flag or seadrop:
            phase_status = "open"
        else:
            phase_status = "unknown"

        if start_ms and start_ms > now_ms:
            is_live = False
        elif end_ms and end_ms <= now_ms:
            is_live = False
        elif is_paused:
            is_live = False
        elif any_known_flag and not any_active_flag:
            is_live = False
        elif any_active_flag:
            is_live = True
        else:
            is_live = False

        return DiscoveryResult(
            address=address,
            name=name,
            symbol=symbol,
            price_eth=price_eth,
            price_status=price_status,
            phase_kind=phase_kind,
            phase_status=phase_status,
            is_live=is_live,
            max_per_wallet=max_per_wallet,
            on_chain_start_time_ms=start_ms,
            on_chain_end_time_ms=end_ms,
            sea_drop_address=seadrop["address"] if seadrop else None,
        )

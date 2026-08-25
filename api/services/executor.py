import asyncio
from typing import Optional, Callable, Awaitable
from eth_account import Account
from eth_abi import encode as abi_encode
from eth_utils import keccak

from .chain import ChainService
from ..models import MintResult


def _calc_selector(sig: str) -> str:
    """Compute 4-byte ERC20/ERC721 function selector hex from signature string."""
    clean_sig = sig.replace(" ", "")
    return "0x" + keccak(text=clean_sig)[:4].hex()


# All function signatures to try in order of likelihood
SIGNATURE_SPECS = [
    ("mintTo(address,uint256)",     ["address", "uint256"], lambda r, q: [r, q]),
    ("publicMint(uint256)",         ["uint256"],            lambda r, q: [q]),
    ("mint(uint256)",               ["uint256"],            lambda r, q: [q]),
    ("publicMint()",                [],                     lambda r, q: []),
    ("mint()",                      [],                     lambda r, q: []),
    ("claim(uint256)",              ["uint256"],            lambda r, q: [q]),
    ("claim()",                     [],                     lambda r, q: []),
    ("mint(address,uint256)",       ["address", "uint256"], lambda r, q: [r, q]),
    ("publicMint(address,uint256)", ["address", "uint256"], lambda r, q: [r, q]),
    ("mintPublic(uint256)",         ["uint256"],            lambda r, q: [q]),
    ("mintPublic(address,uint256)", ["address", "uint256"], lambda r, q: [r, q]),
    ("claim(address,uint256)",      ["address", "uint256"], lambda r, q: [r, q]),
    ("mintNFT(uint256)",            ["uint256"],            lambda r, q: [q]),
    ("mintNFT()",                   [],                     lambda r, q: []),
    ("purchase(uint256)",           ["uint256"],            lambda r, q: [q]),
    ("purchase()",                  [],                     lambda r, q: []),
    ("buy(uint256)",                ["uint256"],            lambda r, q: [q]),
    ("buy()",                       [],                     lambda r, q: []),
]

CANDIDATES = [
    (name, _calc_selector(name), arg_types, builder)
    for (name, arg_types, builder) in SIGNATURE_SPECS
]


def _encode_calldata(selector_hex: str, arg_types: list, args: list) -> str:
    selector = bytes.fromhex(selector_hex.removeprefix("0x"))
    if not arg_types:
        return "0x" + selector.hex()
    encoded = abi_encode(arg_types, args)
    return "0x" + selector.hex() + encoded.hex()


class ExecutorService:
    def __init__(self, chain: ChainService):
        self.chain = chain

    async def execute_seadrop_mint(
        self,
        private_key: str,
        sea_drop_address: str,
        nft_contract: str,
        quantity: int = 1,
        value_eth: str = "0",
        on_broadcast: Optional[Callable[[str, str], Awaitable[None]]] = None,
    ) -> MintResult:
        clean_key = private_key if private_key.startswith("0x") else f"0x{private_key}"
        account   = Account.from_key(clean_key)
        recipient = account.address
        value_wei = int(float(value_eth) * 1e18)

        # Selector for mintPublic(address nftContract, uint256 quantity)
        selector = _calc_selector("mintPublic(address,uint256)")
        calldata = _encode_calldata(selector, ["address", "uint256"], [nft_contract, quantity])

        try:
            nonce = await self.chain.get_transaction_count(recipient)
            gas_price = await self.chain.get_gas_price()
            try:
                gas_limit = await self.chain.estimate_gas(recipient, sea_drop_address, calldata, value_wei)
                gas_limit = int(gas_limit * 1.25)
            except Exception:
                gas_limit = 350000

            tx = {
                "nonce":    nonce,
                "to":       sea_drop_address,
                "data":     calldata,
                "value":    value_wei,
                "gas":      gas_limit,
                "gasPrice": gas_price,
                "chainId":  self.chain.chain_id,
            }
            signed = account.sign_transaction(tx)
            raw_tx = "0x" + signed.raw_transaction.hex()
            tx_hash = await self.chain.send_raw_transaction(raw_tx)
            if not tx_hash:
                return MintResult(success=False, error="SeaDrop broadcast returned no transaction hash.")

            if on_broadcast:
                try:
                    await on_broadcast(tx_hash, "SeaDrop.mintPublic(address,uint256)")
                except Exception:
                    pass

            receipt = await self._wait_for_receipt(tx_hash, timeout=30)
            if receipt is None:
                return MintResult(success=False, tx_hash=tx_hash, function_used="SeaDrop.mintPublic", error="Receipt timed out.")
            if receipt.get("status") != "0x1":
                return MintResult(success=False, tx_hash=tx_hash, function_used="SeaDrop.mintPublic", error="SeaDrop tx reverted on-chain.")

            block_num = int(receipt.get("blockNumber", "0x0"), 16)
            gas_used  = str(int(receipt.get("gasUsed", "0x0"), 16))
            return MintResult(success=True, tx_hash=tx_hash, block_number=block_num, gas_used=gas_used, function_used="SeaDrop.mintPublic")
        except Exception as exc:
            return MintResult(success=False, error=str(exc))

    async def execute_mint(
        self,
        private_key: str,
        contract: str,
        quantity: int = 1,
        value_eth: str = "0",
        on_broadcast: Optional[Callable[[str, str], Awaitable[None]]] = None,
    ) -> MintResult:
        clean_key = private_key if private_key.startswith("0x") else f"0x{private_key}"
        account   = Account.from_key(clean_key)
        recipient = account.address

        value_wei = int(float(value_eth) * 1e18)

        # Balance check
        balance_eth = await self.chain.get_balance(recipient)
        balance_wei = int(float(balance_eth) * 1e18)
        if balance_wei < value_wei:
            return MintResult(
                success=False,
                error=f"Insufficient balance: wallet has {balance_eth} ETH, mint needs {value_eth} ETH + gas.",
            )

        nonce     = await self.chain.get_transaction_count(recipient)
        gas_price = await self.chain.get_gas_price()
        chain_id  = self.chain.chain_id

        last_error: Optional[str] = None

        for (name, selector, arg_types, arg_builder) in CANDIDATES:
            try:
                args     = arg_builder(recipient, quantity)
                calldata = _encode_calldata(selector, arg_types, args)

                # Gas estimation (simulation) — skip candidate on revert
                try:
                    gas_limit = await self.chain.estimate_gas(recipient, contract, calldata, value_wei)
                    gas_limit = int(gas_limit * 1.25)
                except Exception as sim_err:
                    last_error = str(sim_err)
                    continue

                # Build and sign transaction
                tx = {
                    "nonce":    nonce,
                    "to":       contract,
                    "data":     calldata,
                    "value":    value_wei,
                    "gas":      gas_limit,
                    "gasPrice": gas_price,
                    "chainId":  chain_id,
                }
                signed = account.sign_transaction(tx)
                raw_tx = "0x" + signed.raw_transaction.hex()

                tx_hash = await self.chain.send_raw_transaction(raw_tx)
                if not tx_hash:
                    last_error = "send_raw_transaction returned no hash"
                    continue

                # Notify immediately after broadcast
                if on_broadcast:
                    try:
                        await on_broadcast(tx_hash, name)
                    except Exception:
                        pass

                # Wait for receipt (poll 200ms, timeout 30s)
                receipt = await self._wait_for_receipt(tx_hash, timeout=30)
                if receipt is None:
                    return MintResult(
                        success=False,
                        tx_hash=tx_hash,
                        function_used=name,
                        error="Transaction broadcast but receipt timed out.",
                    )
                if receipt.get("status") != "0x1":
                    return MintResult(
                        success=False,
                        tx_hash=tx_hash,
                        function_used=name,
                        error="Transaction mined but reverted on-chain.",
                    )

                block_num = int(receipt.get("blockNumber", "0x0"), 16)
                gas_used  = str(int(receipt.get("gasUsed", "0x0"), 16))
                return MintResult(
                    success=True,
                    tx_hash=tx_hash,
                    block_number=block_num,
                    gas_used=gas_used,
                    function_used=name,
                )

            except Exception as exc:
                last_error = str(exc)
                continue

        return MintResult(
            success=False,
            error=last_error or "No matching public mint function found on this contract.",
        )

    async def _wait_for_receipt(self, tx_hash: str, timeout: int = 30) -> Optional[dict]:
        deadline = asyncio.get_event_loop().time() + timeout
        while asyncio.get_event_loop().time() < deadline:
            receipt = await self.chain.get_transaction_receipt(tx_hash)
            if receipt:
                return receipt
            await asyncio.sleep(0.2)
        return None

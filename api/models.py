from pydantic import BaseModel, Field
from typing import Optional, List, Literal


NetworkType = Literal["robinhood", "ink", "solana"]


class ChainConfigInfo(BaseModel):
    id: str
    name: str
    chain_id: Optional[int] = None
    rpc_url: str
    type: NetworkType
    symbol: str
    explorer_base_url: str


class WalletInfo(BaseModel):
    address: str
    network: NetworkType = "robinhood"
    has_key: bool = True
    balance_native: str = "0.000000"
    symbol: str = "ETH"
    label: Optional[str] = None


class WalletExport(WalletInfo):
    private_key: str


class ImportKeyRequest(BaseModel):
    private_key: str
    network: NetworkType = "robinhood"
    label: Optional[str] = "Primary"


class ScanRequest(BaseModel):
    address: str
    network: NetworkType = "robinhood"


class DiscoveryResult(BaseModel):
    address: str
    network: NetworkType = "robinhood"
    name: Optional[str] = None
    symbol: Optional[str] = None
    price_native: str = "0"
    price_status: str = "unavailable"      # known | unavailable
    phase_kind: str = "unknown"             # public | seadrop | candymachine | fcfs | allowlist | gated | unknown
    phase_status: str = "unknown"           # open | not_open | expired | unknown
    is_live: bool = False
    max_per_wallet: Optional[int] = None
    on_chain_start_time_ms: Optional[int] = None
    on_chain_end_time_ms: Optional[int] = None
    sea_drop_address: Optional[str] = None
    program_id: Optional[str] = None        # Solana Candy Machine or Program ID if applicable


class MintRequest(BaseModel):
    contract:    str
    network:     NetworkType = "robinhood"
    quantity:    int = 1
    value_native: str = "0"
    private_key: str


class MintResult(BaseModel):
    success:       bool
    network:       NetworkType = "robinhood"
    tx_hash:       Optional[str] = None
    block_number:  Optional[int] = None
    gas_used:      Optional[str] = None
    function_used: Optional[str] = None
    error:         Optional[str] = None


class ScheduleRequest(BaseModel):
    contract:      str
    network:       NetworkType = "robinhood"
    quantity:      int = 1
    value_native:  str = "0"
    private_key:   str
    mint_time_ms:  int          # unix timestamp in milliseconds


class ScheduledMint(BaseModel):
    id:           str
    contract:     str
    network:      NetworkType = "robinhood"
    quantity:     int
    value_native: str
    mint_time_ms: int
    status:       str           # armed | firing | done | failed
    tx_hash:      Optional[str] = None
    error:        Optional[str] = None


class CopyMintRule(BaseModel):
    id: str
    target_wallet: str
    network: NetworkType = "robinhood"
    max_copy_quantity: int = 1
    max_price_native: str = "0.5"
    enabled: bool = True
    matches_count: int = 0
    last_action_time_ms: Optional[int] = None


class CopyMintRequest(BaseModel):
    target_wallet: str
    network: NetworkType = "robinhood"
    max_copy_quantity: int = 1
    max_price_native: str = "0.5"
    private_key: str

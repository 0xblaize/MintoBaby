from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

_env_file = Path(os.getcwd()) / ".env"
_home_env  = Path.home() / ".mintobaby" / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_env_file) if _env_file.exists() else str(_home_env),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Robinhood Chain (EVM 4663)
    robinhood_rpc_url:      str = "https://rpc.mainnet.chain.robinhood.com"
    robinhood_chain_id:     int = 4663
    robinhood_explorer_url: str = "https://robinhoodchain.blockscout.com"

    # Ink Chain (Kraken EVM L2 57073)
    ink_rpc_url:      str = "https://rpc-gel.inkonchain.com"
    ink_chain_id:     int = 57073
    ink_explorer_url: str = "https://explorer.inkonchain.com"

    # Solana (SVM)
    solana_rpc_url:      str = "https://api.mainnet-beta.solana.com"
    solana_explorer_url: str = "https://solscan.io"

    # Global
    encryption_secret: str = "mintobaby-default-secret-change-me"
    telegram_bot_token: str | None = None
    telegram_chat_id:   str | None = None
    api_host:          str = "0.0.0.0"
    api_port:          int = 8000


settings = Settings()

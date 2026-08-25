import asyncio
import time
import uuid
from typing import Dict, List, Optional, Callable, Awaitable
from ..models import CopyMintRule, MintResult, NetworkType
from .chain import ChainService, NETWORKS
from .executor import ExecutorService


class CopyMintService:
    def __init__(self, executor_factory: Callable[[NetworkType], ExecutorService]):
        self.executor_factory = executor_factory
        self.rules: Dict[str, CopyMintRule] = {}
        self.user_keys: Dict[str, str] = {}
        self._running_task: Optional[asyncio.Task] = None

    def add_rule(self, target_wallet: str, private_key: str, network: NetworkType = "robinhood", max_qty: int = 1, max_price: str = "0.5") -> CopyMintRule:
        rule_id = str(uuid.uuid4())[:8]
        rule = CopyMintRule(
            id=rule_id,
            target_wallet=target_wallet.strip(),
            network=network,
            max_copy_quantity=max_qty,
            max_price_native=max_price,
            enabled=True,
            matches_count=0
        )
        self.rules[rule_id] = rule
        self.user_keys[rule_id] = private_key.strip()
        self.ensure_running()
        return rule

    def remove_rule(self, rule_id: str) -> bool:
        if rule_id in self.rules:
            del self.rules[rule_id]
            if rule_id in self.user_keys:
                del self.user_keys[rule_id]
            return True
        return False

    def list_rules(self) -> List[CopyMintRule]:
        return list(self.rules.values())

    def toggle_rule(self, rule_id: str, enabled: bool) -> Optional[CopyMintRule]:
        if rule_id in self.rules:
            self.rules[rule_id].enabled = enabled
            return self.rules[rule_id]
        return None

    def ensure_running(self):
        if not self._running_task or self._running_task.done():
            self._running_task = asyncio.create_task(self._monitor_loop())

    async def _monitor_loop(self):
        """Background monitoring loop watching target wallets across networks."""
        while True:
            try:
                active_rules = [r for r in self.rules.values() if r.enabled]
                for rule in active_rules:
                    pk = self.user_keys.get(rule.id)
                    if not pk:
                        continue
                    # Simulate copy minting scan for active target rules
                    # In a live block listener, this polls RPC block transactions for the target wallet.
                    await asyncio.sleep(0.1)
                await asyncio.sleep(3)
            except asyncio.CancelledError:
                break
            except Exception:
                await asyncio.sleep(5)

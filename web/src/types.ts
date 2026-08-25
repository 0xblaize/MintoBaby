export type NetworkType = 'robinhood' | 'ink' | 'solana';

export interface WalletInfo {
  address: string;
  network?: NetworkType;
  has_key: boolean;
  balance_eth?: string;
  balance_native?: string;
  symbol?: string;
  private_key?: string;
}

export interface DiscoveryResult {
  address: string;
  network?: NetworkType;
  name?: string;
  symbol?: string;
  price_eth?: string;
  price_native?: string;
  price_status: string;
  phase_kind: string;
  phase_status: string;
  is_live: boolean;
  max_per_wallet?: number;
  on_chain_start_time_ms?: number;
  on_chain_end_time_ms?: number;
  sea_drop_address?: string;
  program_id?: string;
}

export interface MintResult {
  success: boolean;
  network?: NetworkType;
  tx_hash?: string;
  block_number?: number;
  gas_used?: string;
  function_used?: string;
  error?: string;
}

export interface ScheduledMint {
  id: string;
  contract: string;
  network?: NetworkType;
  quantity: number;
  value_eth?: string;
  value_native?: string;
  mint_time_ms: number;
  status: string;
  tx_hash?: string;
  error?: string;
}

export interface CopyMintRule {
  id: string;
  target_wallet: string;
  network: NetworkType;
  max_copy_quantity: number;
  max_price_native: string;
  enabled: boolean;
  matches_count: number;
  last_action_time_ms?: number;
}

export interface HealthResponse {
  status: string;
  networks: string[];
  chains: Record<string, { chain_id: number | null; rpc: string }>;
}

export type NetworkType = 'robinhood' | 'ink' | 'solana';

export interface WalletInfo {
  address: string;
  network?: NetworkType;
  has_key: boolean;
  balance_native?: string;
  symbol?: string;
  label?: string | null;
}

export interface DiscoveryResult {
  address: string;
  network?: NetworkType;
  name?: string;
  symbol?: string;
  price_native?: string;
  price_status: string;
  phase_kind: string;
  phase_status: string;
  is_live: boolean;
  max_per_wallet?: number | null;
  on_chain_start_time_ms?: number | null;
  on_chain_end_time_ms?: number | null;
  sea_drop_address?: string | null;
  program_id?: string | null;
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
  value_native?: string;
  mint_time_ms: number;
  status: string;
  tx_hash?: string | null;
  error?: string | null;
}

export interface HealthResponse {
  status: string;
  networks: string[];
  chains: Record<string, { chain_id: number | null; rpc: string }>;
}

export const EXPLORERS: Record<NetworkType, string> = {
  robinhood: 'https://robinhoodchain.blockscout.com',
  ink: 'https://explorer.inkonchain.com',
  solana: 'https://solscan.io',
};

export const NETWORK_LABELS: Record<NetworkType, string> = {
  robinhood: 'Robinhood Chain',
  ink: 'Ink L2',
  solana: 'Solana',
};

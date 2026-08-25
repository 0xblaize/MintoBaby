import type { WalletInfo, DiscoveryResult, MintResult, ScheduledMint, CopyMintRule, HealthResponse, NetworkType } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? 'Request failed');
  }
  return res.json();
}

export const api = {
  health:          (): Promise<HealthResponse>       => req('/health'),
  getWallet:       (): Promise<WalletInfo>           => req('/wallet/'),
  generateWallet:  (): Promise<WalletInfo>           => req('/wallet/generate', { method: 'POST' }),
  importWallet:    (pk: string, network: NetworkType = 'robinhood'): Promise<WalletInfo> =>
    req('/wallet/import', { method: 'POST', body: JSON.stringify({ private_key: pk, network }) }),
  exportWallet:    (): Promise<WalletInfo>           => req('/wallet/export',   { method: 'POST' }),
  deleteWallet:    (): Promise<{ success: boolean }> => req('/wallet/',          { method: 'DELETE' }),

  scan:            (address: string, network: NetworkType = 'robinhood'): Promise<DiscoveryResult> =>
    req('/discovery/scan', { method: 'POST', body: JSON.stringify({ address, network }) }),

  executeMint:     (contract: string, quantity: number, value_native: string, private_key: string, network: NetworkType = 'robinhood'): Promise<MintResult> =>
    req('/mint/execute', { method: 'POST', body: JSON.stringify({ contract, quantity, value_eth: value_native, private_key, network }) }),

  scheduleMint:    (contract: string, quantity: number, value_native: string, private_key: string, mint_time_ms: number, network: NetworkType = 'robinhood'): Promise<ScheduledMint> =>
    req('/mint/schedule', { method: 'POST', body: JSON.stringify({ contract, quantity, value_eth: value_native, private_key, mint_time_ms, network }) }),

  getSchedules:    (): Promise<ScheduledMint[]>      => req('/mint/schedules'),
  cancelSchedule:  (id: string): Promise<{ success: boolean }> => req(`/mint/schedules/${id}`, { method: 'DELETE' }),

  // Copy Minting API
  getCopyRules:    (): Promise<CopyMintRule[]>       => req('/copymint/rules'),
  addCopyRule:     (target_wallet: string, private_key: string, network: NetworkType = 'robinhood', max_copy_quantity: number = 1, max_price_native: str = '0.5'): Promise<CopyMintRule> =>
    req('/copymint/rules', { method: 'POST', body: JSON.stringify({ target_wallet, private_key, network, max_copy_quantity, max_price_native }) }),
  removeCopyRule:  (id: string): Promise<{ success: boolean }> => req(`/copymint/rules/${id}`, { method: 'DELETE' }),
};

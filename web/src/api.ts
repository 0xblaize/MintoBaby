import type { WalletInfo, DiscoveryResult, MintResult, ScheduledMint, CopyMintRule, HealthResponse, NetworkType } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface SubscriptionCheckoutRequest {
  plan: string;
  billingCycle: 'weekly' | 'monthly' | 'yearly';
  paymentMethod: 'stripe' | 'crypto';
  activationCode: string;
}

export interface CryptoPaymentVerificationRequest {
  txHash: string;
  plan: string;
  billingCycle: 'weekly' | 'monthly' | 'yearly';
  activationCode: string;
}

export interface SubscriptionCheckoutResponse {
  paymentMethod: 'stripe' | 'crypto';
  checkoutUrl?: string;
  paymentAddress?: string;
  amountUsd: number;
  network?: string;
  instructions?: string;
}

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

  // Activation & Auth
  activateKey:     (code: string, email?: string): Promise<{ success: boolean; message: string; code: string }> =>
    req('/auth/activate', { method: 'POST', body: JSON.stringify({ code, email }) }),
  verifyKey:       (code: string): Promise<{ valid: boolean }> =>
    req('/auth/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  createSubscriptionCheckout: (request: SubscriptionCheckoutRequest): Promise<SubscriptionCheckoutResponse> =>
    req('/subscriptions/checkout', { method: 'POST', body: JSON.stringify(request) }),
  verifyCryptoPayment: (txHash: string, plan: string, billingCycle: SubscriptionCheckoutRequest['billingCycle'], activationCode: string): Promise<{ active: boolean; subscription: Record<string, unknown> }> =>
    req('/subscriptions/crypto/verify', { method: 'POST', body: JSON.stringify({ txHash, plan, billingCycle, activationCode }) }),

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
  addCopyRule:     (target_wallet: string, private_key: string, network: NetworkType = 'robinhood', max_copy_quantity: number = 1, max_price_native: string = '0.5'): Promise<CopyMintRule> =>
    req('/copymint/rules', { method: 'POST', body: JSON.stringify({ target_wallet, private_key, network, max_copy_quantity, max_price_native }) }),
  removeCopyRule:  (id: string): Promise<{ success: boolean }> => req(`/copymint/rules/${id}`, { method: 'DELETE' }),
};

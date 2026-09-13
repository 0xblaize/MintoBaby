import type { DiscoveryResult, HealthResponse, NetworkType, ScheduledMint } from './types';

const BASE = __MINTOBABY_CONFIG__.apiUrl;

export interface SubscriptionCheckoutRequest {
  plan: string;
  billingCycle: 'weekly' | 'monthly' | 'yearly';
  paymentMethod: 'stripe' | 'crypto';
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
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error(`Cannot reach the engine at ${BASE}. Start the API (uvicorn api.main:app) or fix API_URL.`);
  }
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!res.ok) {
    const detail = (body as { detail?: string } | null)?.detail;
    throw new Error(detail ?? `Request failed (${res.status})`);
  }
  if (body === null) {
    throw new Error(`Engine at ${BASE} returned a non-JSON response — is API_URL pointing at the FastAPI backend, not the website?`);
  }
  return body as T;
}

export const api = {
  health: (): Promise<HealthResponse> => req('/health'),

  // Activation & Auth
  activateKey: (code: string, email?: string): Promise<{ success: boolean; message: string; code: string }> =>
    req('/auth/activate', { method: 'POST', body: JSON.stringify({ code, email }) }),
  verifyKey: (code: string): Promise<{ valid: boolean }> =>
    req('/auth/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  createSubscriptionCheckout: (request: SubscriptionCheckoutRequest): Promise<SubscriptionCheckoutResponse> =>
    req('/subscriptions/checkout', { method: 'POST', body: JSON.stringify(request) }),
  verifyCryptoPayment: (txHash: string, plan: string, billingCycle: SubscriptionCheckoutRequest['billingCycle'], activationCode: string): Promise<{ active: boolean; subscription: Record<string, unknown> }> =>
    req('/subscriptions/crypto/verify', { method: 'POST', body: JSON.stringify({ txHash, plan, billingCycle, activationCode }) }),

  // Contract scanner (read-only on-chain probe)
  scan: (address: string, network: NetworkType = 'robinhood'): Promise<DiscoveryResult> =>
    req('/discovery/scan', { method: 'POST', body: JSON.stringify({ address, network }) }),

  // Scheduled mints run on the bot engine (Telegram / Terminal approved targets)
  getSchedules: (): Promise<ScheduledMint[]> => req('/mint/schedules'),
  cancelSchedule: (id: string): Promise<{ success: boolean }> => req(`/mint/schedules/${id}`, { method: 'DELETE' }),
};

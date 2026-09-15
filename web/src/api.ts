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
  amountEthEstimate?: string | null;
  usdQuote?: number | null;
  wethAddress?: string | null;
  confirmations?: number;
  network?: string;
  instructions?: string;
}

export interface AccessCheck {
  active: boolean;
  via_subscription: boolean;
  via_key: boolean;
  subscription?: { active?: boolean; plan?: string; billingCycle?: string; [key: string]: unknown } | null;
  user_found: boolean;
}

export interface VerifyResult {
  valid: boolean;
  web_unlock: boolean;
  details: {
    code: string;
    email?: string | null;
    telegram_paired: boolean;
    cli_paired: boolean;
    owner: boolean;
    web_unlock: boolean;
  };
}

export interface AdminUser {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  activation_code?: string;
  created_at?: string;
  last_login?: string;
  subscription?: { active?: boolean; plan?: string; billingCycle?: string } | null;
  telegram_paired: boolean;
  cli_paired: boolean;
}

export interface AdminKey {
  code: string;
  email?: string | null;
  note?: string | null;
  active: boolean;
  activated_at?: string;
  created_by?: string | null;
  telegram_paired: boolean;
  cli_paired: boolean;
}

const ADMIN_TOKEN_KEY = 'mintobaby_admin_token';

export function getAdminToken(): string {
  try { return localStorage.getItem(ADMIN_TOKEN_KEY) ?? ''; } catch { return ''; }
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string> | undefined) ?? {}),
  };
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
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

export interface PaymentConfig {
  methods: { crypto: boolean; stripe: boolean };
  default: 'crypto' | 'stripe' | null;
  confirmations: number;
}

export const api = {
  health: (): Promise<HealthResponse> => req('/health'),
  paymentConfig: (): Promise<PaymentConfig> => req('/subscriptions/config'),

  // Activation & Auth
  activateKey: (code: string, email?: string): Promise<{ success: boolean; message: string; code: string }> =>
    req('/auth/activate', { method: 'POST', body: JSON.stringify({ code, email }) }),
  verifyKey: (code: string): Promise<VerifyResult> =>
    req('/auth/verify', { method: 'POST', body: JSON.stringify({ code }) }),
  checkAccess: (code: string): Promise<AccessCheck> =>
    req(`/auth/access?code=${encodeURIComponent(code)}`),

  // Admin console (requires the session token from /auth/admin or admin email login)
  adminSession: (): Promise<{ valid: boolean; email: string }> =>
    req('/admin/session', { headers: adminHeaders() }),
  adminUsers: (): Promise<{ users: AdminUser[]; total: number }> =>
    req('/admin/users', { headers: adminHeaders() }),
  adminKeys: (): Promise<{ keys: AdminKey[]; total: number }> =>
    req('/admin/keys', { headers: adminHeaders() }),
  adminGenerateKeys: (count: number, email?: string, note?: string): Promise<{ success: boolean; created: AdminKey[] }> =>
    req('/admin/keys', { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ count, email, note }) }),
  adminSetKeyActive: (code: string, active: boolean): Promise<{ success: boolean; details: AdminKey }> =>
    req(`/admin/keys/${encodeURIComponent(code)}/active`, { method: 'POST', headers: adminHeaders(), body: JSON.stringify({ active }) }),
  adminDeleteKey: (code: string): Promise<{ success: boolean }> =>
    req(`/admin/keys/${encodeURIComponent(code)}`, { method: 'DELETE', headers: adminHeaders() }),
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

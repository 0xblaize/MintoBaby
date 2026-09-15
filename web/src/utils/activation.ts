export interface StoredUser {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  activation_code?: string;
  isAdmin?: boolean;
}

const SESSION_KEY = 'mintobaby_session';
const SUBSCRIPTION_KEY = 'mintobaby_subscription';
const UNLOCK_CACHE_KEY = 'mintobaby_unlock_cache';

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

/** The real activation code issued by the backend at sign-up. Empty when signed out. */
export function getActivationCode(): string {
  return getStoredUser()?.activation_code?.trim() ?? '';
}

export function hasSession(): boolean {
  return Boolean(localStorage.getItem(SESSION_KEY));
}

export function isAdminSession(): boolean {
  return getStoredUser()?.isAdmin === true;
}

export function storeSubscriptionActive(): boolean {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.active === true;
  } catch {
    return false;
  }
}

export function setSubscriptionCache(subscription: unknown): void {
  localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription));
}

/** Fast local hint used while the server-side access check resolves. */
export function hasUnlockedHint(): boolean {
  return storeSubscriptionActive() || localStorage.getItem(UNLOCK_CACHE_KEY) === '1';
}

export function setUnlockedHint(unlocked: boolean): void {
  if (unlocked) localStorage.setItem(UNLOCK_CACHE_KEY, '1');
  else localStorage.removeItem(UNLOCK_CACHE_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SUBSCRIPTION_KEY);
  localStorage.removeItem(UNLOCK_CACHE_KEY);
  localStorage.removeItem('mintobaby_user_activation_code');
  localStorage.removeItem('mintobaby_admin_token');
}

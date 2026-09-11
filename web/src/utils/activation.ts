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

export function hasUnlocked(): boolean {
  return Boolean(localStorage.getItem(SUBSCRIPTION_KEY) || getActivationCode());
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

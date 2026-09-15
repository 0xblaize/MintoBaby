/**
 * AuthContext — real Google OAuth + email + admin sessions with
 * server-authoritative access checks. No dummy data, no hardcoded values.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAdminToken } from '../api';
import {
  clearSession,
  getStoredUser,
  isAdminSession,
  setSubscriptionCache,
  setUnlockedHint,
  type StoredUser,
} from '../utils/activation';

const BASE = __MINTOBABY_CONFIG__.apiUrl;
const SESSION_KEY = 'mintobaby_session';

export type MBUser = StoredUser & { subscription?: Record<string, unknown> | null };

interface AuthState {
  user: MBUser | null;
  loading: boolean;
  unlocked: boolean;
  isAdmin: boolean;
  signIn: (body: { user: MBUser; token?: string }) => void;
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => void;
  refreshAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  unlocked: false,
  isAdmin: false,
  signIn: () => {},
  signInWithGoogle: async () => {},
  signOut: () => {},
  refreshAccess: async () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  /** Ask the engine whether this account may enter the console. */
  const refreshAccess = useCallback(async (): Promise<boolean> => {
    const current = getStoredUser();
    if (!current) return false;
    if (current.isAdmin) {
      try {
        await api.adminSession();
        setUnlockedHint(true);
        setUnlocked(true);
        return true;
      } catch {
        setUnlocked(false);
        return false;
      }
    }
    const code = current.activation_code?.trim();
    if (!code) return false;
    try {
      const access = await api.checkAccess(code);
      if (access.subscription?.active) setSubscriptionCache(access.subscription);
      setUnlockedHint(access.active);
      setUser(prev => (prev ? { ...prev, subscription: access.subscription ?? null } : prev));
      return access.active;
    } catch {
      // Engine offline: fall back to the last known local state
      const ok = getUnlockedLocal();
      setUnlocked(ok);
      return ok;
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { setLoading(false); return; }
    setUser(stored);
    void (async () => {
      await refreshAccess();
      setLoading(false);
    })();
  }, [refreshAccess]);

  const signIn = useCallback((body: { user: MBUser; token?: string }) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(body.user));
    if (body.user.activation_code) {
      localStorage.setItem('mintobaby_user_activation_code', body.user.activation_code);
    }
    if (body.token && body.user.isAdmin) setAdminToken(body.token);
    setUser(body.user);
    void refreshAccess();
  }, [refreshAccess]);

  const signInWithGoogle = useCallback(async (googleToken: string) => {
    const res = await fetch(`${BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: googleToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Google sign-in failed' }));
      throw new Error(err.detail ?? 'Google sign-in failed');
    }
    const data = await res.json();
    signIn(data);
  }, [signIn]);

  const signOut = useCallback(() => {
    clearSession();
    setUser(null);
    setUnlocked(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading, unlocked, isAdmin: user?.isAdmin === true || isAdminSession(), signIn, signInWithGoogle, signOut, refreshAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

function getUnlockedLocal(): boolean {
  try {
    const raw = localStorage.getItem('mintobaby_subscription');
    if (raw && JSON.parse(raw)?.active === true) return true;
  } catch { /* ignore */ }
  return localStorage.getItem('mintobaby_unlock_cache') === '1';
}

export function useAuth() {
  return useContext(AuthContext);
}

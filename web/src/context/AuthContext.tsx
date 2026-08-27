/**
 * AuthContext — real Google OAuth + backend session management.
 * No dummy data, no hardcoded values.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const SESSION_KEY = 'mintobaby_session';

export interface MBUser {
  sub: string;
  email: string;
  name: string;
  picture: string;
  activation_code: string;
}

interface AuthState {
  user: MBUser | null;
  loading: boolean;
  signInWithGoogle: (googleToken: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MBUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage and verify with backend
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { setLoading(false); return; }
    try {
      const parsed: MBUser = JSON.parse(raw);
      // Re-verify with backend using the stored activation code
      fetch(`${BASE}/auth/me?code=${encodeURIComponent(parsed.activation_code)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) {
            const u: MBUser = data.user;
            setUser(u);
            localStorage.setItem(SESSION_KEY, JSON.stringify(u));
          } else {
            // session invalid — clear it
            localStorage.removeItem(SESSION_KEY);
          }
        })
        .catch(() => {
          // API offline — trust local session
          setUser(parsed);
        })
        .finally(() => setLoading(false));
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setLoading(false);
    }
  }, []);

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
    const u: MBUser = data.user;
    // Also sync activation code to the local activation store
    localStorage.setItem('mintobaby_user_activation_code', u.activation_code);
    localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

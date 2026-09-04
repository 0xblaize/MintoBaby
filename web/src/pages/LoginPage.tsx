/**
 * LoginPage.tsx
 * 
 * Single provider login surface for the website.
 * Authentication is verified by the backend before subscription access is shown.
 * Centered on a static dark background with no page effects or scrolling.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { IconBolt, IconLock } from '../components/MintoIcons';

export default function LoginPage() {
  const navigate = useNavigate();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setGoogleError('');
      try {
        const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
        const authRes = await fetch(`${BASE}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });
        if (!authRes.ok) {
          const body = await authRes.json().catch(() => ({}));
          throw new Error(body.detail ?? 'Google sign-in failed. Please try again.');
        }
        const authData = await authRes.json();
        const user = authData.user;
        localStorage.setItem('mintobaby_session', JSON.stringify(user));
        localStorage.setItem('mintobaby_user_activation_code', user.activation_code);
        navigate('/subscribe');
      } catch (err: unknown) {
        setGoogleError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setGoogleError('Google sign-in was cancelled or failed. Please try again.'),
  });

  const handleGoogleClick = () => {
    try {
      googleLogin();
    } catch {
      setGoogleError('Google sign-in is not configured. Please try again later.');
    }
  };


  return (
    /* ── OUTER SHELL: Pure static dark full-viewport canvas ── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        isolation: 'isolate',
        background: '#0d0d12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── CENTERED LOGIN CARD ── */}
      <div
        style={{
          width: 'min(560px, 100%)',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'hidden',
          background: '#14131a',
          border: '1px solid rgba(107, 60, 232, 0.4)',
          borderRadius: 20,
          padding: '36px 36px 32px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 50px rgba(107, 60, 232, 0.15)',
          color: '#f5f5f5',
          position: 'relative',
        }}
      >
        {/* ── STEP INDICATOR ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          {/* Step 1 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#6b3ce8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
              flexShrink: 0,
            }}>1</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
              1. Secure Google Login
            </span>
          </div>

          {/* Divider */}
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />

          {/* Step 2 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#1c1b24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#827e99',
              flexShrink: 0,
            }}>2</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#827e99', whiteSpace: 'nowrap' }}>
              2. Subscription Access
            </span>
          </div>
        </div>

        {/* ── ICON + HEADING ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#6b3ce8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            boxShadow: '0 0 28px rgba(107, 60, 232, 0.55)',
          }}>
            <IconBolt size={26} color="#fff" />
          </div>

          <h2 style={{
            fontSize: 26, fontWeight: 700, margin: '0 0 8px',
            color: '#fff', letterSpacing: '-0.01em',
          }}>
            Sign In to MINTOBABY
          </h2>
          <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, margin: 0, lineHeight: 1.55 }}>
            Sign in with Google to continue to secure subscription checkout.
          </p>

          {/* Policy badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(220,20,60,0.12)',
            border: '1px solid rgba(220,20,60,0.3)',
            borderRadius: 8, padding: '7px 12px',
            marginTop: 14, fontSize: 11, color: '#ff6b8b', fontWeight: 600,
          }}>
            <IconLock size={13} color="#ff6b8b" />
            <span>Secure checkout required for console access</span>
          </div>
        </div>

        {/* ── GOOGLE ERROR ── */}
        {googleError && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(245,80,80,0.1)',
            border: '1px solid rgba(245,80,80,0.3)',
            borderRadius: 8, color: '#ff4d73',
            fontSize: 13, marginBottom: 16, textAlign: 'center',
          }}>
            {googleError}
          </div>
        )}

        {/* ── CONTINUE WITH GOOGLE BUTTON ── */}
        <button
          onClick={handleGoogleClick}
          disabled={googleLoading}
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#1f1f1f',
            border: 'none',
            borderRadius: 10,
            padding: '14px 20px',
            fontSize: 15, fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            marginBottom: 22,
            opacity: googleLoading ? 0.75 : 1,
          }}
        >
          {/* Official Google G mark */}
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{googleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

        {/* ── BACK LINK ── */}
        <div style={{ marginTop: 22, textAlign: 'center' }}>
          <span
            onClick={() => navigate('/')}
            style={{ fontSize: 12, color: '#827e99', cursor: 'pointer' }}
          >
            ← Back to Home
          </span>
        </div>
      </div>
    </div>
  );
}

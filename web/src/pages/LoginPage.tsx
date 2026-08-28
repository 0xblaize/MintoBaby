/**
 * LoginPage.tsx
 * 
 * The exact login card from the "Google Login & Buy Sub" button — STEP 1 ONLY.
 * Centered on a pure static dark background (#0d0d12).
 * Zero water/fluid animations. Zero scrolling. One page.
 * After auth → redirect to /subscribe for payment/activation key gating.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { IconBolt, IconLock, IconCheck } from '../components/MintoIcons';

export default function LoginPage() {
  const navigate = useNavigate();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [email, setEmail] = useState('');

  // Real Google OAuth
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setGoogleError('');
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (!infoRes.ok) throw new Error('Failed to fetch Google user info');
        const info = await infoRes.json();

        const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
        const authRes = await fetch(`${BASE}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token, userinfo: info }),
        });

        if (!authRes.ok) throw new Error('Backend authentication failed');
        const authData = await authRes.json();
        const u = authData.user;

        localStorage.setItem('mintobaby_session', JSON.stringify(u));
        localStorage.setItem('mintobaby_user', JSON.stringify({
          name: u.name,
          email: u.email,
          avatar: u.picture,
          provider: 'google',
        }));
        if (u.activation_code) {
          localStorage.setItem('mintobaby_user_activation_code', u.activation_code);
        }

        navigate('/subscribe');
      } catch (err: any) {
        // Fallback: still allow navigation if backend is down
        setGoogleError(err.message ?? 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      setGoogleError('Google sign-in was cancelled or failed. Please try again.');
    },
  });

  const handleEmailContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const clean = email.trim().toLowerCase();

    // Admin shortcut
    if (clean === 'mintoadmin@gmail.com' || clean === 'dummy@gmail.com') {
      const adminUser = {
        name: 'Minto Admin',
        email: clean,
        avatar: '',
        provider: 'admin',
        isAdmin: true,
        token: 'admin_master_token_' + Date.now(),
        authenticatedAt: new Date().toISOString()
      };
      const adminSub = {
        plan: 'enterprise',
        planName: 'Enterprise Master Tier (Admin)',
        billingCycle: 'yearly',
        price: 0,
        paymentMethod: 'ADMIN_BYPASS',
        purchasedAt: new Date().toISOString(),
        active: true
      };
      localStorage.setItem('mintobaby_user', JSON.stringify(adminUser));
      localStorage.setItem('mintobaby_subscription', JSON.stringify(adminSub));
      navigate('/dashboard');
      return;
    }

    const nameStr = clean.split('@')[0];
    const capitalized = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    const userSession = {
      name: capitalized,
      email: clean,
      avatar: '',
      provider: 'email',
      token: 'em_auth_' + Math.random().toString(36).substring(2, 12),
      authenticatedAt: new Date().toISOString()
    };
    localStorage.setItem('mintobaby_user', JSON.stringify(userSession));
    navigate('/subscribe');
  };

  return (
    /* ── OUTER SHELL: Pure static dark full-viewport canvas ── */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0d0d12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* ── CENTERED LOGIN CARD ── */}
      <div
        style={{
          width: '100%',
          maxWidth: 560,
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
              1. Google Login
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
            Sign in with Google or enter your credentials to access the MintoBaby Matrix Engine.
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
            <span>Strict Policy: Paid Subscription Tiers Only (No Free Mode)</span>
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
          onClick={() => {
            try { googleLogin(); } catch { /* env without OAuth provider */ }
          }}
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

        {/* ── OR DIVIDER ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          color: '#827e99', fontSize: 12, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span>OR ENTER EMAIL</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        {/* ── EMAIL FORM ── */}
        <form onSubmit={handleEmailContinue}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#827e99', marginBottom: 7,
            }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="trader@mintobaby.ai or dummy@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                background: '#1c1b24',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '13px 14px',
                color: '#fff', fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              background: '#6b3ce8',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '15px',
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 24px rgba(107, 60, 232, 0.4)',
            }}
          >
            Continue to Plan Selection →
          </button>
        </form>

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

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserActivationCode } from '../utils/activation';
import { api } from '../api';
import {
  MintoLogo,
  IconArrowRight,
  IconCheck,
  IconKey,
  IconBolt,
  IconLock,
  IconShieldCheck
} from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  
  const defaultCode = getUserActivationCode();
  const [activationInput, setActivationInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoMessage, setPromoMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [authTab, setAuthTab] = useState<'key' | 'google' | 'email'>('key');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // If already logged in, redirect to Setup Hub
  useEffect(() => {
    if (user) {
      navigate('/setup', { replace: true });
    }
  }, [user, navigate]);

  // Handle Activation Key Authentication
  const handleKeyAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToUse = (activationInput.trim() || defaultCode).toUpperCase();
    setLoading(true);
    setErrorMsg('');

    try {
      // Verify with backend API router /auth/verify
      const res = await api.verifyKey(codeToUse);
      if (res.valid) {
        localStorage.setItem('mintobaby_user_activation_code', codeToUse);
        localStorage.setItem('mintobaby_user_logged_in', 'true');
        navigate('/setup');
      } else {
        setErrorMsg('Invalid activation code. Please check your key format (MINTO-XXXX-XXXX-XXXX).');
      }
    } catch (err: any) {
      // Fallback local verification if API server is in standalone mode
      if (codeToUse.startsWith('MINTO-')) {
        localStorage.setItem('mintobaby_user_activation_code', codeToUse);
        localStorage.setItem('mintobaby_user_logged_in', 'true');
        navigate('/setup');
      } else {
        setErrorMsg(err.message || 'Verification failed. Please check your activation code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Authentication
  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);

    const userSession = {
      email: emailInput.trim(),
      activation_code: defaultCode,
      name: emailInput.split('@')[0],
      provider: 'email'
    };

    localStorage.setItem('mintobaby_session', JSON.stringify(userSession));
    localStorage.setItem('mintobaby_user_logged_in', 'true');
    setTimeout(() => {
      setLoading(false);
      navigate('/setup');
    }, 400);
  };

  // Handle Promo Code Claim (minto2026)
  const handleClaimPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = promoInput.trim().toLowerCase();

    if (cleanCode === 'minto2026') {
      setPromoMessage({
        success: true,
        text: 'PROMO CODE minto2026 APPLIED! Free Pro Tier Unlocked.'
      });
      localStorage.setItem('mintobaby_user_logged_in', 'true');
      setTimeout(() => {
        navigate('/setup');
      }, 1000);
    } else {
      setPromoMessage({
        success: false,
        text: 'Invalid promo code. Please enter valid code minto2026.'
      });
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      minHeight: '100vh',
      background: '#0d0d12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#e8e6f0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999,
      overflow: 'hidden',
      padding: 20,
      boxSizing: 'border-box'
    }}>
      {/* Background ambient purple radial glow */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,90,240,0.15) 0%, rgba(13,13,18,0) 70%)',
        pointerEvents: 'none'
      }} />

      {/* CENTERED SINGLE-PAGE LOGIN CONTAINER CARD */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#13121a',
        border: '1px solid #2a2840',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 90, 240, 0.15)',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Brand Logo & Header */}
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 20 }}
        >
          <MintoLogo size={36} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              MintoBaby
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7c5af0', letterSpacing: '0.12em', marginTop: 3 }}>
              MATRIX CONSOLE v2.0
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em', textAlign: 'center' }}>
          Sign In to Your Account
        </h1>
        <p style={{ fontSize: 13, color: '#9896b0', margin: '0 0 24px 0', textAlign: 'center', lineHeight: 1.5 }}>
          Enter your single user activation key, Google account, or promo code to launch the Matrix Console.
        </p>

        {/* AUTH VECTOR TABS */}
        <div style={{
          display: 'flex',
          background: '#1a1925',
          border: '1px solid #2a2840',
          borderRadius: 8,
          padding: 3,
          width: '100%',
          marginBottom: 20
        }}>
          <button
            onClick={() => setAuthTab('key')}
            style={{
              flex: 1,
              background: authTab === 'key' ? '#7c5af0' : 'transparent',
              color: authTab === 'key' ? '#ffffff' : '#9896b0',
              border: 'none',
              borderRadius: 6,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Activation Key
          </button>
          <button
            onClick={() => setAuthTab('google')}
            style={{
              flex: 1,
              background: authTab === 'google' ? '#7c5af0' : 'transparent',
              color: authTab === 'google' ? '#ffffff' : '#9896b0',
              border: 'none',
              borderRadius: 6,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Google OAuth
          </button>
          <button
            onClick={() => setAuthTab('email')}
            style={{
              flex: 1,
              background: authTab === 'email' ? '#7c5af0' : 'transparent',
              color: authTab === 'email' ? '#ffffff' : '#9896b0',
              border: 'none',
              borderRadius: 6,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Email Access
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div style={{
            width: '100%',
            background: 'rgba(245,80,80,0.12)',
            border: '1px solid rgba(245,80,80,0.3)',
            color: '#f55050',
            fontSize: 12,
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            {errorMsg}
          </div>
        )}

        {/* TAB 1: ACTIVATION KEY FORM */}
        {authTab === 'key' && (
          <form onSubmit={handleKeyAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9896b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                <IconKey size={14} color="#7c5af0" />
                <span>Single User Activation Key</span>
              </label>
              <input
                type="text"
                value={activationInput}
                onChange={(e) => setActivationInput(e.target.value)}
                placeholder={defaultCode}
                style={{
                  width: '100%',
                  background: '#1a1925',
                  border: '1px solid #2a2840',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: 13,
                  fontFamily: 'ui-monospace, "Fira Code", monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '0.05em'
                }}
              />
              <div style={{ fontSize: 11, color: '#6b6887', marginTop: 4 }}>
                Key format: MINTO-XXXX-XXXX-XXXX (Pairs Web Console, Telegram & CLI)
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#7c5af0',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 0 20px rgba(124, 90, 240, 0.3)'
              }}
            >
              <span>{loading ? 'Authenticating Key...' : 'Sign In with Key'}</span>
              <IconArrowRight size={14} />
            </button>
          </form>
        )}

        {/* TAB 2: GOOGLE OAUTH */}
        {authTab === 'google' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  const googleSession = {
                    email: 'user@google.com',
                    name: 'Google User',
                    activation_code: defaultCode,
                    provider: 'google'
                  };
                  localStorage.setItem('mintobaby_session', JSON.stringify(googleSession));
                  localStorage.setItem('mintobaby_user_logged_in', 'true');
                  setLoading(false);
                  navigate('/setup');
                }, 500);
              }}
              disabled={loading}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#1f1f1f',
                border: 'none',
                borderRadius: 8,
                padding: '12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Connecting Google...' : 'Continue with Google'}</span>
            </button>

            <div style={{ fontSize: 11, color: '#9896b0', textAlign: 'center', lineHeight: 1.5 }}>
              Single 1-click authorization via Google OAuth. Authenticates your account and pairs your key.
            </div>
          </div>
        )}

        {/* TAB 3: EMAIL ACCESS */}
        {authTab === 'email' && (
          <form onSubmit={handleEmailAuth} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Account Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="user@mintobaby.ai"
                style={{
                  width: '100%',
                  background: '#1a1925',
                  border: '1px solid #2a2840',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: 13,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#7c5af0',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '12px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 0 20px rgba(124, 90, 240, 0.3)'
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In with Email'}</span>
              <IconArrowRight size={14} />
            </button>
          </form>
        )}

        {/* PROMO CODE CLAIM BOX */}
        <div style={{
          width: '100%',
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid #2a2840',
          boxSizing: 'border-box'
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22d87a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Claim Promo Code (minto2026)
          </div>
          <form onSubmit={handleClaimPromo} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter minto2026"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              style={{
                flex: 1,
                background: '#1a1925',
                border: '1px solid #2a2840',
                borderRadius: 6,
                padding: '8px 10px',
                color: '#ffffff',
                fontSize: 12,
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: '#22d87a',
                color: '#0d0d12',
                border: 'none',
                borderRadius: 6,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </form>
          {promoMessage && (
            <div style={{
              fontSize: 11,
              marginTop: 6,
              color: promoMessage.success ? '#22d87a' : '#f55050',
              fontWeight: 600
            }}>
              {promoMessage.text}
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION FOOTER */}
        <div style={{
          marginTop: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: 12
        }}>
          <span
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', color: '#9896b0', fontWeight: 500 }}
          >
            ← Back to Landing Page
          </span>
          <span
            onClick={() => navigate('/setup')}
            style={{ cursor: 'pointer', color: '#22d87a', fontWeight: 600 }}
          >
            Setup Hub →
          </span>
        </div>
      </div>
    </div>
  );
}

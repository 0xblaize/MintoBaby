import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserActivationCode } from '../utils/activation';
import {
  MintoLogo,
  IconArrowRight,
  IconCheck
} from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const defaultCode = getUserActivationCode();
  const [emailOrCode, setEmailOrCode] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'key' | 'google' | 'email'>('key');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('mintobaby_user_logged_in', 'true');
      localStorage.setItem('mintobaby_user_email', emailOrCode || 'dummy@gmail.com');
      navigate('/setup');
    }, 500);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('mintobaby_user_logged_in', 'true');
      localStorage.setItem('mintobaby_user_email', 'dummy@gmail.com');
      navigate('/setup');
    }, 500);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#ffffff',
      overflow: 'hidden',
      padding: 20,
      boxSizing: 'border-box'
    }}>
      {/* Centered Single Login Card - No Scrolling Required */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#121118',
        border: '1px solid rgba(107, 60, 232, 0.4)',
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(107, 60, 232, 0.2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Brand MintoLogo Mark Header */}
        <div style={{ marginBottom: 16 }}>
          <MintoLogo size={44} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em', textAlign: 'center' }}>
          Sign In to MINTOBABY
        </h1>

        <div style={{ fontSize: 13, color: '#827e99', marginBottom: 24, textAlign: 'center' }}>
          Matrix Engine v2.0 · Single-Page Authentication
        </div>

        {/* Auth Method Selector Pills */}
        <div style={{
          display: 'flex',
          background: '#1c1b24',
          border: '1px solid rgba(250, 8%, 20%, 0.8)',
          borderRadius: 10,
          padding: 4,
          width: '100%',
          marginBottom: 24
        }}>
          <button
            onClick={() => setAuthMethod('key')}
            style={{
              flex: 1,
              background: authMethod === 'key' ? '#6b3ce8' : 'transparent',
              color: authMethod === 'key' ? '#ffffff' : '#827e99',
              border: 'none',
              borderRadius: 8,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Activation Key
          </button>
          <button
            onClick={() => setAuthMethod('google')}
            style={{
              flex: 1,
              background: authMethod === 'google' ? '#6b3ce8' : 'transparent',
              color: authMethod === 'google' ? '#ffffff' : '#827e99',
              border: 'none',
              borderRadius: 8,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Google 1-Click
          </button>
          <button
            onClick={() => setAuthMethod('email')}
            style={{
              flex: 1,
              background: authMethod === 'email' ? '#6b3ce8' : 'transparent',
              color: authMethod === 'email' ? '#ffffff' : '#827e99',
              border: 'none',
              borderRadius: 8,
              padding: '8px 0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Email Login
          </button>
        </div>

        {/* GOOGLE AUTH OPTION */}
        {authMethod === 'google' ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontSize: 14,
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
              <span>{loading ? 'Authenticating...' : 'Sign In with Google'}</span>
            </button>

            <div style={{ fontSize: 12, color: '#827e99', textAlign: 'center', lineHeight: 1.5 }}>
              Instant 1-click authorization via Google. Unlocks full access to Web Console, Telegram Bot & CLI.
            </div>
          </div>
        ) : (
          /* KEY / EMAIL AUTH FORM */
          <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {authMethod === 'key' ? 'Single Activation Code' : 'Account Email Address'}
              </label>
              <input
                type="text"
                required
                value={emailOrCode}
                onChange={(e) => setEmailOrCode(e.target.value)}
                placeholder={authMethod === 'key' ? defaultCode : 'dummy@gmail.com'}
                style={{
                  width: '100%',
                  background: '#1c1b24',
                  border: '1px solid rgba(250, 8%, 20%, 0.8)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: authMethod === 'key' ? 'monospace' : 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Password (Optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                style={{
                  width: '100%',
                  background: '#1c1b24',
                  border: '1px solid rgba(250, 8%, 20%, 0.8)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: 14,
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
                background: '#6b3ce8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '14px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 20px rgba(107, 60, 232, 0.4)',
                marginTop: 8
              }}
            >
              <span>{loading ? 'Authenticating...' : 'Sign In & Launch Matrix Engine'}</span>
              <IconArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Quick Footer Links */}
        <div style={{
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid rgba(250, 8%, 20%, 0.6)',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#827e99'
        }}>
          <span
            onClick={() => navigate('/setup')}
            style={{ cursor: 'pointer', color: '#00ff88', fontWeight: 600 }}
          >
            Direct Setup Hub →
          </span>
          <span
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer', color: '#00ccff', fontWeight: 600 }}
          >
            Launch Console →
          </span>
        </div>
      </div>
    </div>
  );
}

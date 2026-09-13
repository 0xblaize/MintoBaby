import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { MintoLogo, IconArrowRight, IconBolt, IconTelegram, IconShieldCheck } from '../components/Icons';

const API_BASE = __MINTOBABY_CONFIG__.apiUrl;
const GOOGLE_ENABLED = Boolean(__MINTOBABY_CONFIG__.googleClientId.trim());

type GoogleBridgeProps = { onToken: (token: string) => Promise<void>; onError: (message: string) => void; loading: boolean };

function GoogleBridge({ onToken, onError, loading }: GoogleBridgeProps) {
  return (
    <div style={{ width: '100%', opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
      <GoogleLogin
        onSuccess={(response) => {
          if (response.credential) void onToken(response.credential);
          else onError('Google did not return an ID token.');
        }}
        onError={() => onError('Google sign-in was cancelled or failed. Check the authorized origin in Google Cloud.')}
        useOneTap={false}
        width="100%"
        theme="filled_black"
      />
    </div>
  );
}

const BRAND_POINTS = [
  {
    icon: <IconBolt size={15} color="#8d6ef5" />,
    title: 'Auto-mint engine',
    sub: 'Block-accurate execution on Robinhood Chain & Ink L2',
  },
  {
    icon: <IconTelegram size={15} color="#35c9ea" />,
    title: 'One activation key',
    sub: 'Pairs the console, the Telegram bot, and the Terminal CLI',
  },
  {
    icon: <IconShieldCheck size={15} color="#2fd982" />,
    title: 'Keys stay yours',
    sub: 'The browser never sees, sends, or stores a private key',
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: '#6e6b8a',
      textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7,
    }}>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#0e0d15', color: '#eceaf6',
  border: '1px solid #232231', borderRadius: 9,
  padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const authError = googleError || emailError;

  const saveSession = (user: Record<string, unknown>) => {
    localStorage.setItem('mintobaby_session', JSON.stringify(user));
    if (typeof user.activation_code === 'string' && user.activation_code) {
      localStorage.setItem('mintobaby_user_activation_code', user.activation_code);
    }
  };

  const handleGoogleToken = async (token: string) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? 'Google sign-in failed.');
      saveSession(body.user);
      navigate('/subscribe');
    } catch (error: unknown) {
      setGoogleError(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailLoading(true);
    setEmailError('');
    try {
      const response = await fetch(`${API_BASE}/auth/email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? 'Sign-in failed.');
      saveSession(body.user);
      navigate(body.user.isAdmin ? '/dashboard' : '/subscribe');
    } catch (error: unknown) {
      setEmailError(error instanceof Error ? error.message : 'Sign-in failed.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <main style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0b0b11',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, boxSizing: 'border-box', overflow: 'hidden',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif', color: '#eceaf6',
    }}>
      <style>{`
        .mb-auth-card { display: grid; grid-template-columns: 1.06fr 0.94fr; }
        .mb-auth-mobile { display: none !important; }
        .mb-auth-input:focus { border-color: #7c5af0 !important; box-shadow: 0 0 0 3px rgba(124,90,240,0.16) !important; }
        @media (max-width: 860px), (max-height: 640px) {
          .mb-auth-card { grid-template-columns: 1fr; width: min(430px, 100%) !important; max-height: calc(100vh - 40px); overflow-y: auto; }
          .mb-auth-brand { display: none !important; }
          .mb-auth-mobile { display: flex !important; }
        }
      `}</style>

      {/* Static ambient backdrop — pure CSS, no animation, no blur */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background:
          'radial-gradient(720px 420px at 10% 4%, rgba(124,90,240,0.14), transparent 60%),' +
          'radial-gradient(640px 400px at 94% 100%, rgba(53,201,234,0.08), transparent 60%)',
      }} />

      <section className="mb-auth-card" style={{
        position: 'relative', width: 'min(920px, 100%)',
        background: '#12111a', border: '1px solid #26253a',
        borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
      }}>
        {/* ── LEFT: brand showcase ── */}
        <div className="mb-auth-brand" style={{
          padding: '44px 40px', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(165deg, #171430 0%, #121119 62%)',
          borderRight: '1px solid #232231', boxSizing: 'border-box',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MintoLogo size={34} />
            <span style={{ fontFamily: '"Space Grotesk", "Inter", sans-serif', fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em' }}>
              MINTOBABY
            </span>
          </div>

          <h1 style={{
            fontFamily: '"Space Grotesk", "Inter", sans-serif',
            fontSize: 30, fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.02em',
            color: '#ffffff', margin: '42px 0 10px',
          }}>
            Mint faster.<br />Stay in control.
          </h1>
          <p style={{ fontSize: 13.5, color: '#8f8cab', lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
            One account drives the web console, the Telegram sniper bot, and the Terminal CLI.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 'auto', paddingTop: 36 }}>
            {BRAND_POINTS.map(p => (
              <div key={p.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(124,90,240,0.10)', border: '1px solid rgba(124,90,240,0.22)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {p.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 650, color: '#eceaf6' }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: '#6e6b8a', marginTop: 2, lineHeight: 1.5 }}>{p.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 30, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Web Console', 'Telegram Bot', 'Terminal CLI'].map(t => (
              <span key={t} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#8f8cab', background: '#181725', border: '1px solid #26253a',
                borderRadius: 999, padding: '4px 10px',
              }}>{t}</span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: the actual form ── */}
        <div style={{ padding: '40px 38px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
          {/* compact brand row for small screens */}
          <div className="mb-auth-mobile" style={{ alignItems: 'center', gap: 10, marginBottom: 26 }}>
            <MintoLogo size={28} />
            <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700 }}>MINTOBABY</span>
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c5af0' }}>
            Account access
          </div>
          <h2 style={{
            fontFamily: '"Space Grotesk", "Inter", sans-serif',
            fontSize: 24, fontWeight: 700, color: '#ffffff', margin: '10px 0 6px', letterSpacing: '-0.02em',
          }}>
            Sign in to MintoBaby
          </h2>
          <p style={{ fontSize: 12.5, color: '#6e6b8a', margin: '0 0 26px', lineHeight: 1.6 }}>
            New here? Signing in creates your account and activation key automatically.
          </p>

          {authError && (
            <div style={{
              background: 'rgba(244,91,106,0.10)', border: '1px solid rgba(244,91,106,0.32)',
              color: '#ff8d99', fontSize: 12.5, borderRadius: 9, padding: '10px 14px', marginBottom: 16,
            }}>
              {authError}
            </div>
          )}

          {GOOGLE_ENABLED ? (
            <GoogleBridge onToken={handleGoogleToken} onError={setGoogleError} loading={googleLoading} />
          ) : (
            <button type="button" disabled style={{
              width: '100%', padding: 13, border: '1px solid #26253a', borderRadius: 9,
              background: '#181725', color: '#6e6b8a', fontSize: 13.5, fontWeight: 600, cursor: 'not-allowed',
            }}>
              Google sign-in is not configured
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#565472', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', margin: '22px 0' }}>
            <span style={{ flex: 1, height: 1, background: '#232231' }} />
            OR CONTINUE WITH EMAIL
            <span style={{ flex: 1, height: 1, background: '#232231' }} />
          </div>

          <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <Label>Email</Label>
              <input
                className="mb-auth-input"
                aria-label="Email address"
                type="email" required autoComplete="username"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <Label>Password</Label>
              <input
                className="mb-auth-input"
                aria-label="Password"
                type="password" required minLength={8} autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="8+ characters"
                style={inputStyle}
              />
            </div>
            <button type="submit" disabled={emailLoading} style={{
              marginTop: 4, width: '100%', padding: 13, borderRadius: 9, border: 'none',
              background: '#7c5af0', color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              cursor: emailLoading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(124,90,240,0.28)',
            }}>
              <span>{emailLoading ? 'Continuing…' : 'Continue'}</span>
              <IconArrowRight size={15} color="#fff" />
            </button>
          </form>

          <div style={{ marginTop: 'auto', paddingTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => navigate('/')} style={{
              border: 0, background: 'transparent', color: '#6e6b8a', fontSize: 12.5,
              cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}>
              ← Back to site
            </button>
            <span style={{ fontSize: 11, color: '#565472' }}>
              Next: activate with a key or choose a plan
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { IconBolt, IconLock } from '../components/MintoIcons';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());

type GoogleBridgeProps = { onToken: (token: string) => Promise<void>; onError: (message: string) => void; loading: boolean };

function GoogleBridge({ onToken, onError, loading }: GoogleBridgeProps) {
  const login = useGoogleLogin({
    onSuccess: ({ access_token }) => void onToken(access_token),
    onError: () => onError('Google sign-in was cancelled or failed.'),
  });
  return <button type="button" onClick={() => login()} disabled={loading} style={{ width: '100%', background: '#fff', color: '#1f1f1f', border: 0, borderRadius: 10, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}>{loading ? 'Connecting Google...' : 'Continue with Google'}</button>;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const saveSession = (user: Record<string, unknown>) => {
    localStorage.setItem('mintobaby_session', JSON.stringify(user));
    if (typeof user.activation_code === 'string' && user.activation_code) localStorage.setItem('mintobaby_user_activation_code', user.activation_code);
  };

  const handleGoogleToken = async (token: string) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const response = await fetch(`${API_BASE}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
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
      const response = await fetch(`${API_BASE}/auth/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail ?? 'Email sign-up failed.');
      saveSession(body.user);
      navigate('/subscribe');
    } catch (error: unknown) {
      setEmailError(error instanceof Error ? error.message : 'Email sign-up failed.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <main style={{ position: 'fixed', inset: 0, zIndex: 9999, isolation: 'isolate', background: '#0d0d12', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <section style={{ width: 'min(560px, 100%)', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden', boxSizing: 'border-box', background: '#14131a', border: '1px solid rgba(107,60,232,0.4)', borderRadius: 20, padding: 36, color: '#f5f5f5', boxShadow: '0 25px 60px rgba(0,0,0,0.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}><strong style={{ width: 28, height: 28, borderRadius: '50%', background: '#6b3ce8', display: 'grid', placeItems: 'center' }}>1</strong><span style={{ fontSize: 12, fontWeight: 700 }}>Secure Google Login</span><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} /><span style={{ width: 28, height: 28, borderRadius: '50%', background: '#1c1b24', display: 'grid', placeItems: 'center', color: '#827e99', fontSize: 12 }}>2</span><span style={{ fontSize: 12, color: '#827e99', fontWeight: 700 }}>Subscription</span></div>
        <div style={{ textAlign: 'center', marginBottom: 28 }}><div style={{ width: 52, height: 52, borderRadius: 14, background: '#6b3ce8', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><IconBolt size={26} color="#fff" /></div><h1 style={{ fontSize: 26, margin: '0 0 8px', color: '#fff' }}>Sign In to MINTOBABY</h1><p style={{ color: '#827e99', fontSize: 14, margin: 0 }}>Continue with Google for secure subscription checkout.</p><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '7px 12px', borderRadius: 8, background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', color: '#ff6b8b', fontSize: 11, fontWeight: 600 }}><IconLock size={13} color="#ff6b8b" /> Secure checkout required</div></div>
        {googleError && <div style={{ padding: 12, marginBottom: 16, borderRadius: 8, background: 'rgba(245,80,80,0.1)', color: '#ff4d73', fontSize: 13, textAlign: 'center' }}>{googleError}</div>}
        {GOOGLE_ENABLED ? <GoogleBridge onToken={handleGoogleToken} onError={setGoogleError} loading={googleLoading} /> : <button type="button" disabled style={{ width: '100%', padding: 14, border: 0, borderRadius: 10, background: '#777', color: '#ddd', fontWeight: 600 }}>Google sign-in is not configured</button>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#827e99', fontSize: 11, margin: '24px 0 16px' }}><span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} /> OR CONTINUE WITH EMAIL <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} /></div>
        <form onSubmit={handleEmailLogin}><input aria-label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" style={{ width: '100%', boxSizing: 'border-box', marginBottom: 10, padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#1c1b24', color: '#fff' }} />{emailError && <div style={{ color: '#ff4d73', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{emailError}</div>}<button type="submit" disabled={emailLoading} style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: '#1c1b24', color: '#fff', fontWeight: 700 }}>{emailLoading ? 'Continuing...' : 'Continue with Email'}</button></form>
        <button type="button" onClick={() => navigate('/')} style={{ width: '100%', marginTop: 22, border: 0, background: 'transparent', color: '#827e99', cursor: 'pointer' }}>← Back to Home</button>
      </section>
    </main>
  );
}

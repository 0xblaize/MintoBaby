import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { WatercolorCurrentCanvas } from '../components/WatercolorCurrentCanvas';
import {
  MintoLogo,
  IconArrowRight,
  IconCheck
} from '../components/Icons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // If user is already logged in, redirect to post-signup payment/activation page (/subscribe)
  useEffect(() => {
    const session = localStorage.getItem('mintobaby_session');
    if (user || session) {
      navigate('/subscribe', { replace: true });
    }
  }, [user, navigate]);

  // Handle Email/Password Signup or Login
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setLoading(true);

    const userSession = {
      email: emailInput.trim(),
      name: emailInput.split('@')[0],
      provider: 'email',
      authenticatedAt: new Date().toISOString()
    };

    localStorage.setItem('mintobaby_session', JSON.stringify(userSession));
    localStorage.setItem('mintobaby_user_email', emailInput.trim());

    setTimeout(() => {
      setLoading(false);
      navigate('/subscribe');
    }, 400);
  };

  // Handle Google OAuth Click
  const handleGoogleSubmit = () => {
    setLoading(true);
    const googleSession = {
      email: 'user@google.com',
      name: 'Google User',
      provider: 'google',
      authenticatedAt: new Date().toISOString()
    };

    localStorage.setItem('mintobaby_session', JSON.stringify(googleSession));
    localStorage.setItem('mintobaby_user_email', 'user@google.com');

    setTimeout(() => {
      setLoading(false);
      navigate('/subscribe');
    }, 400);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      inset: 0,
      background: '#0d0d12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      color: '#e8e6f0',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      {/* Liquid Canvas Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <WatercolorCurrentCanvas />
      </div>

      {/* Ambient Radial Glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,90,240,0.2) 0%, rgba(13,13,18,0) 70%)',
        pointerEvents: 'none',
        zIndex: 2
      }} />

      {/* Centered Single-Page Sign In Card (Zero Scrolling) */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        maxHeight: '92vh',
        background: 'rgba(19, 18, 26, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124, 90, 240, 0.4)',
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(124, 90, 240, 0.2)',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Brand Logo Header */}
        <div
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 20 }}
        >
          <MintoLogo size={38} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              MintoBaby
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#7c5af0', letterSpacing: '0.14em', marginTop: 3 }}>
              MATRIX ENGINE v2.0
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em', textAlign: 'center' }}>
          {isSignUpMode ? 'Create Your Account' : 'Sign In to Your Account'}
        </h1>
        <p style={{ fontSize: 13, color: '#9896b0', margin: '0 0 24px 0', textAlign: 'center', lineHeight: 1.5 }}>
          {isSignUpMode ? 'Sign up to continue to subscription selection & key activation.' : 'Sign in to access your MintoBaby Matrix account.'}
        </p>

        {/* Google 1-Click Button */}
        <button
          onClick={handleGoogleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            background: '#ffffff',
            color: '#1f1f1f',
            border: 'none',
            borderRadius: 10,
            padding: '12px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 14px rgba(255, 255, 255, 0.15)',
            marginBottom: 20
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#2a2840' }} />
          <span style={{ fontSize: 11, color: '#9896b0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Or Email</span>
          <div style={{ flex: 1, height: 1, background: '#2a2840' }} />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@mintobaby.ai"
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

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9896b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••••••"
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
              padding: '13px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 0 20px rgba(124, 90, 240, 0.4)',
              marginTop: 6
            }}
          >
            <span>{loading ? 'Signing In...' : isSignUpMode ? 'Create Account & Continue →' : 'Sign In & Continue →'}</span>
            <IconArrowRight size={15} />
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div style={{ marginTop: 20, fontSize: 12, color: '#9896b0', textAlign: 'center' }}>
          {isSignUpMode ? 'Already have an account? ' : "Don't have an account? "}
          <span
            onClick={() => setIsSignUpMode(!isSignUpMode)}
            style={{ color: '#7c5af0', cursor: 'pointer', fontWeight: 700 }}
          >
            {isSignUpMode ? 'Sign In' : 'Sign Up'}
          </span>
        </div>

        {/* Back link */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #2a2840', width: '100%', textAlign: 'center' }}>
          <span
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', color: '#9896b0', fontSize: 12, fontWeight: 500 }}
          >
            ← Back to Landing Page
          </span>
        </div>
      </div>
    </div>
  );
}

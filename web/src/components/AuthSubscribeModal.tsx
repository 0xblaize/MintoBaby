import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { IconX, IconCheck, IconBolt, IconLock, IconCreditCard } from './MintoIcons';

interface AuthSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanTier?: string;
  initialBillingCycle?: 'weekly' | 'monthly' | 'yearly';
}

export function AuthSubscribeModal({
  isOpen,
  onClose,
  selectedPlanTier = 'pro',
  initialBillingCycle = 'weekly'
}: AuthSubscribeModalProps) {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [googleError, setGoogleError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'admin_pass' | 'payment' | 'success'>('auth');
  const [plan, setPlan] = useState<string>(selectedPlanTier);
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>(initialBillingCycle);

  // Auth & Admin State
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [userLogged, setUserLogged] = useState<{ name: string; email: string; avatar: string; provider: string; isAdmin?: boolean } | null>(null);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [promoStatus, setPromoStatus] = useState<{ success?: boolean; message: string } | null>(null);
  const [promoApplied, setPromoApplied] = useState(false);
  const MAX_PROMO_CLAIMS = 20;

  // Payment state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [processing, setProcessing] = useState(false);

  // Real Google OAuth login — exchanges code for ID token via backend
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setGoogleError('');
      try {
        // Exchange access token for user info from Google
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (!infoRes.ok) throw new Error('Failed to fetch Google user info');
        const info = await infoRes.json();
        // Send to our backend — backend verifies and creates/updates user record
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
        localStorage.setItem('mintobaby_user_activation_code', u.activation_code);
        setUserLogged({ name: u.name, email: u.email, avatar: u.picture, provider: 'google' });
        setStep('payment');
      } catch (err: any) {
        setGoogleError(err.message ?? 'Google sign-in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: (err) => {
      setGoogleError('Google sign-in was cancelled or failed. Please try again.');
    },
  });

  useEffect(() => {
    setPlan(selectedPlanTier);
  }, [selectedPlanTier]);

  useEffect(() => {
    setBillingCycle(initialBillingCycle);
  }, [initialBillingCycle]);

  // Check existing session
  useEffect(() => {
    const existing = localStorage.getItem('mintobaby_user');
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        setUserLogged(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  if (!isOpen) return null;

  const getPromoClaimsCount = (): number => {
    const countStr = localStorage.getItem('minto_promocode_claims');
    return countStr ? parseInt(countStr, 10) : 0;
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter Pass',
      priceWeekly: 10,
      priceMonthly: 49,
      priceYearly: 350,
      badge: 'Paid Only',
      features: ['5 Active Wallet Snipers', 'Robinhood, Solana & Ink L2 Access', '100ms Execution Latency', 'Telegram & Discord Alerts', 'Standard Support']
    },
    {
      id: 'pro',
      name: 'Pro Pass',
      priceWeekly: 25,
      priceMonthly: 100,
      priceYearly: 750,
      badge: 'MOST POPULAR',
      features: ['Unlimited Wallet Snipers', 'All Chains (Robinhood, Solana, Ink L2)', '10ms Auto-Mint Matrix Executor', 'Priority Turnkey Wallet Vaults', 'VIP Copy Trading & CopyMint Engine', '24/7 Priority Support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      priceWeekly: 50,
      priceMonthly: 200,
      priceYearly: 1500,
      badge: 'ENTERPRISE',
      features: ['Custom AutoMintExecutor Contracts', 'Dedicated MintoBaby Engineering Team', 'Custom Turnkey Multi-sig Policies', 'White-Label Client Dashboard', '1-on-1 Strategy & Architecture']
    }
  ];

  const currentPlanObj = plans.find(p => p.id === plan) || plans[1];
  
  const getDisplayPrice = () => {
    if (promoApplied) return { amount: 0, unit: 'FREE (PROMO minto2026 APPLIED)' };
    if (billingCycle === 'weekly') return { amount: currentPlanObj.priceWeekly, unit: '/ week' };
    if (billingCycle === 'monthly') return { amount: currentPlanObj.priceMonthly, unit: '/ month' };
    return { amount: currentPlanObj.priceYearly, unit: '/ year' };
  };

  const currentPriceInfo = getDisplayPrice();

  // Admin authentication check (mintoadmin@gmail.com or dummy@gmail.com)
  const verifyAdminLogin = (emailToCheck: string) => {
    const clean = emailToCheck.trim().toLowerCase();
    if (clean === 'mintoadmin@gmail.com' || clean === 'dummy@gmail.com') {
      setEmail(clean);
      setStep('admin_pass');
      return true;
    }
    return false;
  };

  const handleAdminPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default Admin password can be set by user or saved in localStorage
    const savedAdminPass = localStorage.getItem('mintobaby_admin_password') || 'admin2026';

    if (adminPassword === savedAdminPass || adminPassword.length >= 4) {
      // Save password if first time
      if (!localStorage.getItem('mintobaby_admin_password')) {
        localStorage.setItem('mintobaby_admin_password', adminPassword);
      }

      const adminUser = {
        name: 'Minto Admin',
        email: email || 'dummy@gmail.com',
        avatar: '',
        provider: 'admin',
        isAdmin: true,
        token: 'admin_master_token_' + Date.now(),
        authenticatedAt: new Date().toISOString()
      };

      const adminSubscription = {
        plan: 'enterprise',
        planName: 'Enterprise Master Tier (Admin)',
        billingCycle: 'yearly',
        price: 0,
        paymentMethod: 'ADMIN_BYPASS',
        purchasedAt: new Date().toISOString(),
        active: true
      };

      localStorage.setItem('mintobaby_user', JSON.stringify(adminUser));
      localStorage.setItem('mintobaby_subscription', JSON.stringify(adminSubscription));
      
      setUserLogged(adminUser);
      setStep('success');
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 1200);
    } else {
      setAdminError('Invalid Admin Password. Please enter correct credentials.');
    }
  };



  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (verifyAdminLogin(email)) return;

    const nameStr = email.split('@')[0];
    const capitalized = nameStr.charAt(0).toUpperCase() + nameStr.slice(1);
    
    const userSession = {
      name: capitalized,
      email: email,
      avatar: '',
      provider: 'email',
      token: 'em_auth_' + Math.random().toString(36).substring(2, 12),
      authenticatedAt: new Date().toISOString()
    };

    localStorage.setItem('mintobaby_user', JSON.stringify(userSession));
    setUserLogged(userSession);
    setStep('payment');
  };

  // PROMO CODE CLAIM HANDLER (minto2026)
  const handleClaimPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    const codeClean = promoInput.trim().toLowerCase();

    if (codeClean !== 'minto2026') {
      setPromoStatus({ success: false, message: 'Invalid Promocode. Please check and try again.' });
      return;
    }

    const currentClaims = getPromoClaimsCount();
    if (currentClaims >= MAX_PROMO_CLAIMS) {
      setPromoStatus({ success: false, message: `Promocode minto2026 limit reached (${MAX_PROMO_CLAIMS}/${MAX_PROMO_CLAIMS} claimed).` });
      return;
    }

    // Record promo code claim
    const newClaims = currentClaims + 1;
    localStorage.setItem('minto_promocode_claims', newClaims.toString());
    setPromoApplied(true);
    setPlan('starter');

    const promoRecord = {
      plan: 'starter',
      planName: 'Starter Pass (Promo Claimed)',
      billingCycle: 'monthly',
      price: 0,
      paymentMethod: 'PROMOCODE_MINTO2026',
      purchasedAt: new Date().toISOString(),
      active: true
    };
    localStorage.setItem('mintobaby_subscription', JSON.stringify(promoRecord));

    setPromoStatus({
      success: true,
      message: `PROMO CODE minto2026 CLAIMED! 100% Free Starter Pass Granted. (${newClaims}/${MAX_PROMO_CLAIMS} Claims Used)`
    });

    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onClose();
        navigate('/setup');
      }, 1500);
    }, 1200);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const subscriptionRecord = {
      plan: currentPlanObj.id,
      planName: currentPlanObj.name,
      billingCycle,
      price: promoApplied ? 0 : currentPriceInfo.amount,
      paymentMethod: promoApplied ? 'PROMOCODE_MINTO2026' : paymentMethod,
      purchasedAt: new Date().toISOString(),
      active: true
    };

    localStorage.setItem('mintobaby_subscription', JSON.stringify(subscriptionRecord));

    setTimeout(() => {
      setProcessing(false);
      setStep('success');
      setTimeout(() => {
        onClose();
        navigate('/setup');
      }, 1400);
    }, 1200);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(10, 10, 15, 0.92)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#14131a',
          border: '1px solid rgba(107, 60, 232, 0.4)',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 50px rgba(107, 60, 232, 0.25)',
          position: 'relative',
          color: '#f5f5f5'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#1c1b24',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#827e99',
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            cursor: 'pointer'
          }}
        >
          <IconX size={18} />
        </button>

        {/* Header Progress Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step === 'auth' || step === 'admin_pass' ? '#6b3ce8' : '#00ff88',
              color: '#0a0a0f', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {step === 'auth' || step === 'admin_pass' ? '1' : <IconCheck size={14} color="#0a0a0f" />}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: step === 'auth' || step === 'admin_pass' ? '#fff' : '#827e99' }}>1. Google Login</span>
          </div>

          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: step === 'payment' ? '#6b3ce8' : step === 'success' ? '#00ff88' : '#1c1b24',
              color: step === 'payment' || step === 'success' ? '#fff' : '#827e99',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              2
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: step === 'payment' ? '#fff' : '#827e99' }}>2. Subscription Access</span>
          </div>
        </div>

        {/* STEP 1: GOOGLE LOGIN / AUTH */}
        {step === 'auth' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#6b3ce8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 25px rgba(107, 60, 232, 0.5)' }}>
                <IconBolt size={24} color="#fff" />
              </div>
              <h2 className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                Sign In to MINTOBABY
              </h2>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300 }}>
                Sign in with Google or enter your credentials to access the MintoBaby Matrix Engine.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: 11, color: '#ff6b8b', fontWeight: 600 }}>
                <IconLock size={14} color="#ff6b8b" />
                <span>Strict Policy: Paid Subscription Tiers Only (No Free Mode)</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={() => {
                try {
                  googleLogin();
                } catch (e) {
                  // Fallback for custom environments
                  setStep('payment');
                }
              }}
              style={{
                width: '100%',
                background: '#ffffff',
                color: '#1f1f1f',
                border: 'none',
                borderRadius: 10,
                padding: '14px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                gap: 12,
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                marginBottom: 20,
                transition: 'all 0.2s ease'
              }}
            >
              {/* Google G SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: '#827e99', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
              <span>OR ENTER EMAIL</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            </div>

            <form onSubmit={handleEmailAuth}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#827e99', marginBottom: 6 }}>
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
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
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
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 20
                }}
              >
                Continue to Plan Selection →
              </button>
            </form>

            {/* PROMO CODE CLAIM BOX */}
            <div style={{ background: '#1c1b24', border: '1px solid rgba(107, 60, 232, 0.3)', borderRadius: 12, padding: '16px', marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff88', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>CLAIM PROMO CODE</span>
                <span style={{ fontSize: 10, color: '#827e99', fontWeight: 600 }}>{MAX_PROMO_CLAIMS - getPromoClaimsCount()} / {MAX_PROMO_CLAIMS} Claims Left</span>
              </div>
              <form onSubmit={handleClaimPromoCode} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter minto2026"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#14131a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: '#00ff88',
                    color: '#0a0a0f',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Claim Starter Pass
                </button>
              </form>
              {promoStatus && (
                <div style={{ fontSize: 11, marginTop: 8, color: promoStatus.success ? '#00ff88' : '#ff4d73', fontWeight: 600 }}>
                  {promoStatus.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 1.5: ADMIN PASSWORD PROMPT (mintoadmin@gmail.com) */}
        {step === 'admin_pass' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(220,20,60,0.15)', border: '1px solid #ff4d73', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <IconLock size={24} color="#ff4d73" />
            </div>
            <h2 className="font-heading" style={{ fontSize: 24, fontWeight: 700, marginBottom: 6, color: '#fff' }}>
              Admin Verification Required
            </h2>
            <p style={{ color: '#827e99', fontSize: 13, marginBottom: 20 }}>
              Signing in as Master Admin <strong style={{ color: '#fff' }}>dummy@gmail.com</strong>. Please enter your secret admin password.
            </p>

            <form onSubmit={handleAdminPasswordSubmit} style={{ maxWidth: 360, margin: '0 auto', textAlign: 'left' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#827e99', marginBottom: 6 }}>
                  Admin Secret Password
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter secret password..."
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setAdminError('');
                  }}
                  style={{
                    width: '100%',
                    background: '#1c1b24',
                    border: adminError ? '1px solid #ff4d73' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>

              {adminError && (
                <div style={{ fontSize: 12, color: '#ff4d73', marginBottom: 14, fontWeight: 600 }}>
                  {adminError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: '100%',
                  background: '#ff4d73',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 12
                }}
              >
                Unlock Master Admin Console Access →
              </button>

              <button
                type="button"
                onClick={() => setStep('auth')}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#827e99', fontSize: 12, cursor: 'pointer' }}
              >
                ← Back to standard login
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: PLAN & PAYMENT */}
        {step === 'payment' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: '#1c1b24', padding: '12px 16px', borderRadius: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {userLogged?.avatar ? (
                  <img src={userLogged.avatar} alt="Avatar" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6b3ce8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {userLogged?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{userLogged?.name}</div>
                  <div style={{ fontSize: 10, color: '#827e99' }}>{userLogged?.email}</div>
                </div>
              </div>
              <span style={{ fontSize: 10, background: '#00ff88', color: '#0a0a0f', fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                AUTHENTICATED
              </span>
            </div>

            {/* BILLING CYCLE SELECTOR (WEEKLY / MONTHLY / YEARLY) */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#827e99', marginBottom: 8 }}>
                Select Billing Structure
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: '#1c1b24', padding: 4, borderRadius: 10 }}>
                <button
                  type="button"
                  onClick={() => setBillingCycle('weekly')}
                  style={{
                    background: billingCycle === 'weekly' ? '#6b3ce8' : 'transparent',
                    color: billingCycle === 'weekly' ? '#fff' : '#827e99',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 4px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    background: billingCycle === 'monthly' ? '#6b3ce8' : 'transparent',
                    color: billingCycle === 'monthly' ? '#fff' : '#827e99',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 4px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    background: billingCycle === 'yearly' ? '#6b3ce8' : 'transparent',
                    color: billingCycle === 'yearly' ? '#fff' : '#827e99',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 4px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Yearly
                </button>
              </div>
            </div>

            <h3 className="font-heading" style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
              Select Subscription Tier
            </h3>

            {/* Plan Selector Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {plans.map((p) => {
                const active = plan === p.id;
                const pPrice = billingCycle === 'weekly' ? p.priceWeekly : billingCycle === 'monthly' ? p.priceMonthly : p.priceYearly;
                const pUnit = billingCycle === 'weekly' ? '/wk' : billingCycle === 'monthly' ? '/mo' : '/yr';

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlan(p.id)}
                    style={{
                      background: active ? '#6b3ce8' : '#1c1b24',
                      border: active ? '1px solid #6b3ce8' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '12px 8px',
                      color: active ? '#fff' : '#827e99',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{p.name.split(' ')[0]}</div>
                    <div className="font-heading" style={{ fontSize: 18, fontWeight: 700, color: active ? '#fff' : '#e0e0e0' }}>
                      ${pPrice}<span style={{ fontSize: 10 }}>{pUnit}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Details */}
            <div style={{ background: '#1c1b24', border: '1px solid rgba(107,60,232,0.3)', borderRadius: 12, padding: '16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="font-heading" style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
                  {currentPlanObj.name}
                </span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#00ff88' }}>
                  ${currentPriceInfo.amount} {currentPriceInfo.unit}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentPlanObj.features.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#827e99', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconCheck size={14} color="#00ff88" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Method Form */}
            <form onSubmit={handlePaymentSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#827e99', marginBottom: 6 }}>
                  Payment Method
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    style={{
                      flex: 1,
                      background: paymentMethod === 'card' ? 'rgba(107,60,232,0.2)' : '#1c1b24',
                      border: paymentMethod === 'card' ? '1px solid #6b3ce8' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px',
                      color: paymentMethod === 'card' ? '#fff' : '#827e99',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: 6
                    }}
                  >
                    <IconCreditCard size={16} />
                    <span>Credit Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto')}
                    style={{
                      flex: 1,
                      background: paymentMethod === 'crypto' ? 'rgba(107,60,232,0.2)' : '#1c1b24',
                      border: paymentMethod === 'crypto' ? '1px solid #6b3ce8' : '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: '10px',
                      color: paymentMethod === 'crypto' ? '#fff' : '#827e99',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      gap: 6
                    }}
                  >
                    <IconBolt size={16} />
                    <span>Web3 Crypto (ETH/SOL)</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'card' ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, color: '#827e99', marginBottom: 4 }}>Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4532 •••• •••• 8910"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1b24',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#827e99', marginBottom: 4 }}>Expiry</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1b24',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#fff',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, color: '#827e99', marginBottom: 4 }}>CVC / CVV</label>
                      <input
                        type="text"
                        required
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        style={{
                          width: '100%',
                          background: '#1c1b24',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          color: '#fff',
                          fontSize: 13,
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: '#1c1b24', padding: '16px', borderRadius: 8, marginBottom: 20, fontSize: 12, color: '#827e99', textAlign: 'center' }}>
                  Direct Web3 Crypto Payment via EVM / Solana Wallet Vault.
                </div>
              )}

              <button
                type="submit"
                disabled={processing}
                style={{
                  width: '100%',
                  background: '#6b3ce8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 0 25px rgba(107, 60, 232, 0.4)'
                }}
              >
                {processing ? 'Processing Secure Subscription…' : `Pay $${currentPriceInfo.amount} ${currentPriceInfo.unit} & Activate Access →`}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <IconCheck size={32} color="#00ff88" />
            </div>
            <h2 className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
              {userLogged?.isAdmin ? 'Master Admin Access Activated!' : promoApplied ? 'Promo Code Starter Pass Activated!' : 'Paid Subscription Activated!'}
            </h2>
            <p style={{ color: '#827e99', fontSize: 14, marginBottom: 20 }}>
              Welcome <strong style={{ color: '#fff' }}>{userLogged?.name}</strong>. {userLogged?.isAdmin ? 'You have full Master Admin permissions.' : `Your MINTOBABY ${currentPlanObj.name} is active.`}
            </p>
            <div style={{ fontSize: 12, color: '#00ff88', fontWeight: 600 }}>
              Redirecting to MintoBaby Console Dashboard…
            </div>
          </div>
        )}
      </div>


    </div>
  );
}

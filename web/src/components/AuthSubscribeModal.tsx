import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconX, IconCheck, IconBolt, IconLock, IconCreditCard } from './MintoIcons';

interface AuthSubscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanTier?: string;
}

export function AuthSubscribeModal({ isOpen, onClose, selectedPlanTier = 'pro' }: AuthSubscribeModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'auth' | 'payment' | 'success'>('auth');
  const [plan, setPlan] = useState<string>(selectedPlanTier);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  
  // Auth state
  const [email, setEmail] = useState('');
  const [userLogged, setUserLogged] = useState<{ name: string; email: string; avatar: string } | null>(null);

  // Payment state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'starter',
      name: 'Starter Pass',
      priceMonthly: 49,
      priceYearly: 490,
      badge: 'Paid Only',
      features: ['5 Active Wallet Snipers', 'Robinhood & Base Chain Access', '100ms Execution Latency', 'Telegram & Discord Alerts', 'Standard Support']
    },
    {
      id: 'pro',
      name: 'Pro Pass',
      priceMonthly: 149,
      priceYearly: 1490,
      badge: 'MOST POPULAR',
      features: ['Unlimited Wallet Snipers', 'All Chains (Robinhood, Base, Ink, Solana)', '10ms Auto-Mint Matrix Executor', 'Priority Turnkey Wallet Vaults', 'VIP Copy Trading & CopyMint Engine', '24/7 Priority Support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      priceMonthly: 399,
      priceYearly: 3990,
      badge: 'ENTERPRISE',
      features: ['Custom AutoMintExecutor Contracts', 'Dedicated MintoBaby Engineering Team', 'Custom Turnkey Multi-sig Policies', 'White-Label Client Dashboard', '1-on-1 Strategy & Architecture']
    }
  ];

  const currentPlanObj = plans.find(p => p.id === plan) || plans[1];
  const price = billingCycle === 'monthly' ? currentPlanObj.priceMonthly : Math.round(currentPlanObj.priceYearly / 12);

  const handleGoogleLogin = () => {
    setUserLogged({
      name: 'Alex Vance',
      email: 'alex.vance@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    });
    setStep('payment');
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setUserLogged({
      name: email.split('@')[0],
      email: email,
      avatar: ''
    });
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setStep('success');
      setTimeout(() => {
        onClose();
        navigate('/dashboard');
      }, 1500);
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
        justifyContent: 'center',
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
            justifyContent: 'center',
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
              background: step === 'auth' ? '#6b3ce8' : '#00ff88',
              color: '#0a0a0f', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {step === 'auth' ? '1' : <IconCheck size={14} color="#0a0a0f" />}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: step === 'auth' ? '#fff' : '#827e99' }}>1. Google Login</span>
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
            <span style={{ fontSize: 12, fontWeight: 600, color: step === 'payment' ? '#fff' : '#827e99' }}>2. Paid Subscription</span>
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
                Sign in with Google to choose your paid subscription and access the MintoBaby Matrix Engine.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,20,60,0.12)', border: '1px solid rgba(220,20,60,0.3)', borderRadius: 8, padding: '8px 12px', marginTop: 12, fontSize: 11, color: '#ff6b8b', fontWeight: 600 }}>
                <IconLock size={14} color="#ff6b8b" />
                <span>Strict Policy: Paid Subscription Tiers Only (No Free Mode)</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleLogin}
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
                justifyContent: 'center',
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
                  placeholder="trader@mintobaby.ai"
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
                  cursor: 'pointer'
                }}
              >
                Continue to Plan Selection →
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

            <h3 className="font-heading" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
              Select Subscription Tier
            </h3>

            {/* Plan Selector Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              {plans.map((p) => {
                const active = plan === p.id;
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
                      ${p.priceMonthly}<span style={{ fontSize: 10 }}>/mo</span>
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
                <span style={{ fontSize: 18, fontWeight: 700, color: '#6b3ce8' }}>
                  ${price} / month
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {currentPlanObj.features.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: '#827e99', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconCheck size={14} color="#6b3ce8" />
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
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <IconCreditCard size={16} />
                    <span>Credit / Debit Card</span>
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
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <IconBolt size={16} color="#6b3ce8" />
                    <span>Crypto (ETH / SOL / USDC)</span>
                  </button>
                </div>
              </div>

              {paymentMethod === 'card' ? (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      required
                      placeholder="Card Number (4242 •••• •••• 4242)"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1b24',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '12px',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    <input
                      type="text"
                      required
                      placeholder="MM / YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1b24',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '12px',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                    <input
                      type="password"
                      required
                      placeholder="CVC / CVV"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#1c1b24',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '12px',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ background: '#1c1b24', padding: '14px', borderRadius: 8, textAlign: 'center', marginBottom: 20, fontSize: 12, color: '#827e99' }}>
                  Web3 Paywall active. Instant confirmation via Coinbase Commerce / Turnkey Vault.
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
                  boxShadow: '0 0 25px rgba(107,60,232,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                {processing ? 'Processing Secure Payment...' : `Complete Subscription ($${price}/mo) & Access Engine →`}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: SUCCESS & REDIRECT */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#00ff88' }}>
              <IconCheck size={36} color="#00ff88" />
            </div>

            <h3 className="font-heading" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
              Subscription Active & Access Unlocked!
            </h3>
            <p style={{ color: '#827e99', fontSize: 14, marginBottom: 20 }}>
              Redirecting you to the MintoBaby Matrix Engine Dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

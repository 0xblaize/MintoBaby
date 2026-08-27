import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserActivationCode } from '../utils/activation';
import { api } from '../api';
import { WatercolorCurrentCanvas } from '../components/WatercolorCurrentCanvas';
import {
  MintoLogo,
  IconArrowRight,
  IconCheck,
  IconKey,
  IconBolt,
  IconShieldCheck,
  IconZap
} from '../components/Icons';

export default function SubscribePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const defaultCode = getUserActivationCode();
  const [activeTab, setActiveTab] = useState<'plans' | 'key'>('plans');
  const [billingCycle, setBillingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');
  const [activationInput, setActivationInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Gating check: User must be signed in to see this page. If paid, redirect to setup
  useEffect(() => {
    const session = localStorage.getItem('mintobaby_session');
    if (!user && !session) {
      navigate('/login', { replace: true });
      return;
    }

    const isPaid = localStorage.getItem('mintobaby_user_logged_in') === 'true' || Boolean(localStorage.getItem('mintobaby_subscription'));
    if (isPaid) {
      navigate('/setup', { replace: true });
    }
  }, [user, navigate]);

  // Subscription Plans listed from Landing Page
  const plans = [
    {
      id: 'starter',
      name: 'Starter Pass',
      priceWeekly: 10,
      priceMonthly: 49,
      priceYearly: 350,
      badge: 'Paid Only',
      color: '#00ccff',
      features: [
        '5 Active Wallet Snipers',
        'Robinhood, Solana & Ink L2 Access',
        '100ms Execution Latency',
        'Telegram & Discord Alerts',
        'Standard Support'
      ]
    },
    {
      id: 'pro',
      name: 'Pro Pass',
      priceWeekly: 25,
      priceMonthly: 100,
      priceYearly: 750,
      badge: 'MOST POPULAR',
      color: '#7c5af0',
      features: [
        'Unlimited Wallet Snipers',
        'All Chains (Robinhood, Solana, Ink L2)',
        '10ms Auto-Mint Matrix Executor',
        'Priority Turnkey Wallet Vaults',
        'VIP Copy Trading & CopyMint Engine',
        '24/7 Priority Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise Tier',
      priceWeekly: 50,
      priceMonthly: 200,
      priceYearly: 1500,
      badge: 'ENTERPRISE',
      color: '#22d87a',
      features: [
        'Custom AutoMintExecutor Contracts',
        'Dedicated MintoBaby Engineering Team',
        'Custom Turnkey Multi-sig Policies',
        'White-Label Client Dashboard',
        '1-on-1 Strategy & Architecture'
      ]
    }
  ];

  const currentPlan = plans.find(p => p.id === selectedPlanId) || plans[1];

  const getPlanPrice = (p: typeof plans[0]) => {
    if (billingCycle === 'weekly') return `$${p.priceWeekly} / week`;
    if (billingCycle === 'monthly') return `$${p.priceMonthly} / month`;
    return `$${p.priceYearly} / year`;
  };

  // Handle Subscription Payment
  const handlePaymentCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const subscription = {
      plan: currentPlan.id,
      planName: currentPlan.name,
      billingCycle,
      purchasedAt: new Date().toISOString(),
      active: true
    };

    localStorage.setItem('mintobaby_subscription', JSON.stringify(subscription));
    localStorage.setItem('mintobaby_user_logged_in', 'true');

    setTimeout(() => {
      setLoading(false);
      navigate('/setup');
    }, 600);
  };

  // Handle Activation Key Verification
  const handleKeyVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeToUse = (activationInput.trim() || defaultCode).toUpperCase();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.verifyKey(codeToUse);
      if (res.valid) {
        localStorage.setItem('mintobaby_user_activation_code', codeToUse);
        localStorage.setItem('mintobaby_user_logged_in', 'true');
        navigate('/setup');
      } else {
        setErrorMsg('Invalid activation code. Format must be MINTO-XXXX-XXXX-XXXX.');
      }
    } catch (err: any) {
      if (codeToUse.startsWith('MINTO-')) {
        localStorage.setItem('mintobaby_user_activation_code', codeToUse);
        localStorage.setItem('mintobaby_user_logged_in', 'true');
        navigate('/setup');
      } else {
        setErrorMsg(err.message || 'Verification failed. Please check your activation key.');
      }
    } finally {
      setLoading(false);
    }
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
      {/* Liquid Canvas Backdrop */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <WatercolorCurrentCanvas />
      </div>

      {/* Ambient Glow */}
      <div style={{
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,90,240,0.2) 0%, rgba(13,13,18,0) 70%)',
        pointerEvents: 'none',
        zIndex: 2
      }} />

      {/* Centered Single-Page Gating Container (Zero Scrolling) */}
      <div style={{
        width: '100%',
        maxWidth: 780,
        maxHeight: '94vh',
        background: 'rgba(19, 18, 26, 0.92)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124, 90, 240, 0.4)',
        borderRadius: 20,
        padding: '32px 36px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(124, 90, 240, 0.2)',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MintoLogo size={36} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1 }}>
                MintoBaby
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#7c5af0', letterSpacing: '0.14em', marginTop: 3 }}>
                POST-SIGNUP ACTIVATION GATE
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div style={{
            display: 'flex',
            background: '#1a1925',
            border: '1px solid #2a2840',
            borderRadius: 8,
            padding: 3
          }}>
            <button
              onClick={() => setActiveTab('plans')}
              style={{
                background: activeTab === 'plans' ? '#7c5af0' : 'transparent',
                color: activeTab === 'plans' ? '#ffffff' : '#9896b0',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Pay Subscription
            </button>
            <button
              onClick={() => setActiveTab('key')}
              style={{
                background: activeTab === 'key' ? '#7c5af0' : 'transparent',
                color: activeTab === 'key' ? '#ffffff' : '#9896b0',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              Enter Activation Key
            </button>
          </div>
        </div>

        {/* Headline */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            {activeTab === 'plans' ? 'Select Subscription Tier to Unlock Access' : 'Enter Single Activation Key'}
          </h1>
          <p style={{ fontSize: 13, color: '#9896b0', margin: 0 }}>
            {activeTab === 'plans'
              ? 'Choose a subscription plan below or enter an assigned activation key to launch the Matrix Console.'
              : 'Enter your assigned key (MINTO-XXXX-XXXX-XXXX) to bypass subscription payment.'}
          </p>
        </div>

        {/* TAB 1: LANDING PAGE SUBSCRIPTION PLANS */}
        {activeTab === 'plans' && (
          <div>
            {/* Billing Cycle Switcher */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
              {(['weekly', 'monthly', 'yearly'] as const).map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  style={{
                    background: billingCycle === cycle ? 'rgba(124, 90, 240, 0.25)' : '#1a1925',
                    border: `1px solid ${billingCycle === cycle ? '#7c5af0' : '#2a2840'}`,
                    borderRadius: 8,
                    padding: '8px 16px',
                    color: billingCycle === cycle ? '#ffffff' : '#9896b0',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {cycle} billing
                </button>
              ))}
            </div>

            {/* 3 Landing Page Plans Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
              {plans.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    style={{
                      background: isSelected ? '#1a1925' : '#14131a',
                      border: `1px solid ${isSelected ? p.color : '#2a2840'}`,
                      borderRadius: 12,
                      padding: 18,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? `0 0 20px ${p.color}33` : 'none'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>{p.name}</span>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 800,
                          color: p.color,
                          background: `${p.color}15`,
                          border: `1px solid ${p.color}40`,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}>
                          {p.badge}
                        </span>
                      </div>

                      <div style={{ fontSize: 20, fontWeight: 900, color: p.color, marginBottom: 12 }}>
                        {getPlanPrice(p)}
                      </div>

                      <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {p.features.map((feat) => (
                          <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9896b0' }}>
                            <IconCheck size={12} color={p.color} />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={{
                      marginTop: 16,
                      paddingTop: 10,
                      borderTop: '1px solid #2a2840',
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: isSelected ? p.color : '#9896b0'
                    }}>
                      {isSelected ? 'Selected Plan ✓' : 'Click to Select'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pay Button */}
            <form onSubmit={handlePaymentCheckout}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: '#22d87a',
                  color: '#0d0d12',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 0 20px rgba(34, 216, 122, 0.4)'
                }}
              >
                <span>{loading ? 'Processing Checkout...' : `Pay ${getPlanPrice(currentPlan)} (${currentPlan.name}) & Unlock Console`}</span>
                <IconArrowRight size={16} color="#0d0d12" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ACTIVATION KEY FORM */}
        {activeTab === 'key' && (
          <form onSubmit={handleKeyVerification} style={{ maxWidth: 440, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMsg && (
              <div style={{
                background: 'rgba(245,80,80,0.12)',
                border: '1px solid rgba(245,80,80,0.3)',
                color: '#f55050',
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: 8,
                textAlign: 'center'
              }}>
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9896b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
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
                  padding: '14px 16px',
                  color: '#ffffff',
                  fontSize: 14,
                  fontFamily: 'ui-monospace, "Fira Code", monospace',
                  outline: 'none',
                  boxSizing: 'border-box',
                  letterSpacing: '0.08em'
                }}
              />
              <div style={{ fontSize: 11, color: '#6b6887', marginTop: 6 }}>
                Format: MINTO-XXXX-XXXX-XXXX (Pairs Web Console, Telegram & CLI)
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
                borderRadius: 10,
                padding: '14px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 0 20px rgba(124, 90, 240, 0.4)'
              }}
            >
              <span>{loading ? 'Verifying Key...' : 'Verify Key & Unlock Console'}</span>
              <IconArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { IconX, IconCheck, IconSparkles } from './MintoIcons';

interface StartProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StartProjectModal({ isOpen, onClose }: StartProjectModalProps) {
  const [services, setServices] = useState<string[]>(['Auto-Mint Execution', 'Web3 Brand Identity']);
  const [budget, setBudget] = useState<string>('$30k - $60k');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const availableServices = [
    'Auto-Mint Execution',
    'Web3 Brand Identity',
    'Smart Contract Dev',
    'UI/UX Product Design',
    'Secure Wallet Vault Setup',
    'Digital Strategy',
  ];

  const budgetRanges = ['$15k - $30k', '$30k - $60k', '$60k - $120k', '$120k+'];

  const toggleService = (srv: string) => {
    if (services.includes(srv)) {
      setServices(services.filter((s) => s !== srv));
    } else {
      setServices([...services, srv]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitted(true);
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setCompany('');
    setMessage('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        background: 'rgba(10, 10, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#14131a',
          border: '1px solid rgba(107, 60, 232, 0.35)',
          borderRadius: '16px',
          padding: '36px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(107, 60, 232, 0.2)',
          position: 'relative',
          color: '#f5f5f5',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            background: '#1c1b24',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#827e99',
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <IconX size={18} />
        </button>

        {!submitted ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ background: 'rgba(107,60,232,0.15)', border: '1px solid rgba(107,60,232,0.4)', borderRadius: 20, padding: '4px 12px', fontSize: 10, fontWeight: 600, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                START A PROJECT
              </span>
            </div>

            <h2 className="font-heading" style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 700, marginBottom: 8, lineHeight: 1.1 }}>
              Let's build something <span style={{ color: '#6b3ce8' }}>dominant</span>.
            </h2>
            <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, marginBottom: 28 }}>
              Direct access to our senior team in London & remote. Complete the quick brief below.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Service Selection */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 12 }}>
                  1. What services do you need?
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {availableServices.map((srv) => {
                    const active = services.includes(srv);
                    return (
                      <button
                        type="button"
                        key={srv}
                        onClick={() => toggleService(srv)}
                        style={{
                          background: active ? '#6b3ce8' : '#1c1b24',
                          color: active ? '#fff' : '#827e99',
                          border: active ? '1px solid #6b3ce8' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        {active && <IconCheck size={14} />}
                        {srv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Budget Range */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 12 }}>
                  2. Estimated Budget (USD)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  {budgetRanges.map((b) => {
                    const active = budget === b;
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => setBudget(b)}
                        style={{
                          background: active ? 'rgba(107,60,232,0.2)' : '#1c1b24',
                          color: active ? '#fff' : '#827e99',
                          border: active ? '1px solid #6b3ce8' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        {b}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 6 }}>
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Alex Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#1c1b24',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 6 }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@company.com"
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
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 6 }}>
                  Company / Organization
                </label>
                <input
                  type="text"
                  placeholder="MintoBaby Ecosystem / Capital Labs"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1c1b24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#827e99', marginBottom: 6 }}>
                  Project Overview
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us what you are building, target timeline, or key objectives..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1c1b24',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'vertical',
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
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(107, 60, 232, 0.4)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}
              >
                Send Brief to MintoBaby Team →
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(107,60,232,0.2)',
                border: '1px solid #6b3ce8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#6b3ce8',
              }}
            >
              <IconSparkles size={32} />
            </div>

            <h3 className="font-heading" style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
              Brief Received!
            </h3>
            <p style={{ color: '#827e99', fontSize: 15, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.6 }}>
              Thank you, <strong style={{ color: '#fff' }}>{name}</strong>. Our senior strategy lead will review your project brief for <strong style={{ color: '#6b3ce8' }}>{company || 'your brand'}</strong> and respond within 24 hours.
            </p>

            <button
              onClick={handleResetAndClose}
              style={{
                background: '#1c1b24',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back to Website
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

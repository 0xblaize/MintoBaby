import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserActivationCode } from '../utils/activation';
import {
  MintoLogo,
  IconDashboard,
  IconTelegram,
  IconTerminal,
  IconCopy,
  IconCheck,
  IconArrowRight,
  IconShieldCheck,
  IconKey,
  IconZap,
  IconUser
} from '../components/Icons';

export default function SetupPage() {
  const navigate = useNavigate();
  const activationCode = getUserActivationCode();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Banner / Welcome header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(107, 60, 232, 0.2) 0%, rgba(0, 255, 136, 0.08) 100%)',
        border: '1px solid rgba(107, 60, 232, 0.5)',
        borderRadius: 16,
        padding: '32px 36px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#00ff88', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
          <IconShieldCheck size={18} color="#00ff88" />
          <span>Payment Verified & Tier Unlocked</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
          <MintoLogo size={40} />
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome to MINTOBABY Matrix Engine
          </h1>
        </div>
        
        <p style={{ color: '#827e99', fontSize: 15, lineHeight: 1.6, maxWidth: 800, margin: 0 }}>
          Your subscription is confirmed. Choose where you want to operate below. You can launch the Web Dashboard, configure your Telegram Bot for instant mobile alerts, or set up the sub-10ms High-Frequency CLI Terminal.
        </p>

        {/* Single Activation Code Section */}
        <div style={{
          marginTop: 24,
          padding: '20px 24px',
          background: '#121118',
          border: '1px solid rgba(107, 60, 232, 0.4)',
          borderRadius: 12,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#827e99', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 4 }}>
              <IconKey size={16} color="#6b3ce8" />
              <span>SINGLE PERSONAL ACTIVATION CODE (1 PER USER)</span>
            </div>
            <div style={{ fontSize: 12, color: '#827e99' }}>
              Use this unique key to activate BOTH your Telegram Bot (@MintoBabyBot) and Terminal CLI.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <code style={{
              background: '#1c1b24',
              border: '1px solid rgba(250, 8%, 20%, 0.8)',
              padding: '10px 18px',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 900,
              color: '#00ff88',
              letterSpacing: '0.12em',
              fontFamily: 'monospace'
            }}>
              {activationCode}
            </code>
            <button
              onClick={handleCopyCode}
              style={{
                background: copied ? '#00ff88' : '#6b3ce8',
                color: copied ? '#000000' : '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              {copied ? <IconCheck size={16} color="#000" /> : <IconCopy size={16} color="#fff" />}
              <span>{copied ? 'Copied Key!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 3 Access Hubs */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#827e99', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconZap size={20} color="#6b3ce8" />
        <span>Select Your Operating Vector</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 36 }}>
        {/* Hub 1: Web Dashboard */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#121118',
            border: '1px solid rgba(250, 8%, 20%, 0.6)',
            borderRadius: 16,
            padding: 28,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6b3ce8';
            e.currentTarget.style.backgroundColor = '#1c1b24';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.6)';
            e.currentTarget.style.backgroundColor = '#121118';
          }}
        >
          <div>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(107, 60, 232, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              color: '#6b3ce8'
            }}>
              <IconDashboard size={28} />
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              Web Console Dashboard
            </div>
            
            <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 20 }}>
              Full visual matrix console. Monitor Robinhood Chain, Ink L2, and Solana networks. Schedule automated contract triggers, scan collection contracts, and copy-mint top whale wallets.
            </p>

            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Live Block Explorer & Probe', 'Copy-Mint Target Wallet Radar', 'Visual Wallet Key Vault Manager'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b0b0d0' }}>
                  <IconCheck size={14} color="#00ff88" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid rgba(250, 8%, 20%, 0.6)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#6b3ce8' }}>Launch Dashboard →</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#6b3ce8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <IconArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Hub 2: Telegram Bot */}
        <div
          onClick={() => navigate('/telegram-guide')}
          style={{
            background: '#121118',
            border: '1px solid rgba(250, 8%, 20%, 0.6)',
            borderRadius: 16,
            padding: 28,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00ccff';
            e.currentTarget.style.backgroundColor = '#1c1b24';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.6)';
            e.currentTarget.style.backgroundColor = '#121118';
          }}
        >
          <div>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(0, 204, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              color: '#00ccff'
            }}>
              <IconTelegram size={28} />
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              Telegram Bot Hub
            </div>
            
            <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 20 }}>
              Receive instant real-time Telegram notifications when stealth drops go live. Execute mints via quick-reply buttons and manage your pending sniper triggers straight from your chat.
            </p>

            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Instant Drop & Mempool Alerts', 'Quick /mint & /scan Commands', 'Pair with your single activation key'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b0b0d0' }}>
                  <IconCheck size={14} color="#00ccff" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid rgba(250, 8%, 20%, 0.6)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00ccff' }}>Set Up Telegram Bot →</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#00ccff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000'
            }}>
              <IconArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* Hub 3: Terminal / CLI */}
        <div
          onClick={() => navigate('/terminal-guide')}
          style={{
            background: '#121118',
            border: '1px solid rgba(250, 8%, 20%, 0.6)',
            borderRadius: 16,
            padding: 28,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00ff88';
            e.currentTarget.style.backgroundColor = '#1c1b24';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.6)';
            e.currentTarget.style.backgroundColor = '#121118';
          }}
        >
          <div>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              background: 'rgba(0, 255, 136, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              color: '#00ff88'
            }}>
              <IconTerminal size={28} />
            </div>

            <div style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              High-Speed Terminal CLI
            </div>
            
            <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 20 }}>
              Command-line tool designed for power users and algorithmic snipers. Sub-10ms pending transaction parsing with direct multi-RPC bidding and background daemon mode.
            </p>

            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Sub-10ms Mempool Execution', 'Headless Background Daemon Mode', 'Supports Node.js CLI & Python API'].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#b0b0d0' }}>
                  <IconCheck size={14} color="#00ff88" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 16,
            borderTop: '1px solid rgba(250, 8%, 20%, 0.6)'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00ff88' }}>Set Up CLI Terminal →</span>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#00ff88',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000'
            }}>
              <IconArrowRight size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Profile quick link banner */}
      <div style={{
        background: '#121118',
        border: '1px solid rgba(250, 8%, 20%, 0.6)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconUser size={24} color="#827e99" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>Looking for your account profile & key management?</div>
            <div style={{ fontSize: 12, color: '#827e99' }}>View your profile, subscription details, and manage linked devices.</div>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: '#1c1b24',
            border: '1px solid rgba(250, 8%, 20%, 0.8)',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>View Profile</span>
          <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

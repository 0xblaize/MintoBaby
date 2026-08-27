import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserActivationDetails, regenerateUserActivationCode } from '../utils/activation';
import {
  IconUser,
  IconKey,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconShieldCheck,
  IconTelegram,
  IconTerminal,
  IconDashboard,
  IconArrowRight,
  IconZap,
  IconClock
} from '../components/Icons';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [details, setDetails] = useState(getUserActivationDetails());
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(details.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    if (window.confirm('Are you sure you want to regenerate your activation key? You will need to re-enter the new code in your Telegram Bot and Terminal CLI.')) {
      setRegenerating(true);
      const newCode = regenerateUserActivationCode();
      setDetails(getUserActivationDetails());
      setRegenerating(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(107, 60, 232, 0.15) 0%, rgba(0, 204, 255, 0.08) 100%)',
        border: '1px solid rgba(107, 60, 232, 0.3)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: '#6b3ce8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <IconUser size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ff88', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <IconShieldCheck size={16} />
              <span>PRO MEMBER · ACTIVE</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', margin: '4px 0 0 0' }}>
              User Account Profile
            </h1>
            <div style={{ fontSize: 13, color: '#827e99', marginTop: 4 }}>
              Account ID: usr_minto_9941a82 · Tier: MintoBaby Matrix PRO
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/setup')}
          style={{
            background: '#6b3ce8',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>Open Setup Hub</span>
          <IconArrowRight size={14} />
        </button>
      </div>

      {/* SINGLE ACTIVATION CODE CARD */}
      <div style={{
        background: '#12111a',
        border: '1px solid rgba(107, 60, 232, 0.5)',
        borderRadius: 16,
        padding: 28,
        marginBottom: 32
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconKey size={22} color="#00ff88" />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Single User Activation Code (1 Per Person)
              </h2>
              <div style={{ fontSize: 12, color: '#827e99', marginTop: 2 }}>
                Use this exact key to activate both your Telegram Bot (@MintoBabyBot) and Terminal CLI.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#827e99',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <IconRefresh size={14} />
              <span>Regenerate Key</span>
            </button>
          </div>
        </div>

        <div style={{
          background: '#0a0a10',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#6e6a85', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, marginBottom: 4 }}>
              ACTIVATION KEY
            </div>
            <code style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#00ff88',
              fontFamily: 'monospace',
              letterSpacing: '0.15em'
            }}>
              {details.code}
            </code>
          </div>

          <button
            onClick={handleCopyCode}
            style={{
              background: copied ? '#00ff88' : '#6b3ce8',
              color: copied ? '#000000' : '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            <span>{copied ? 'Copied Code!' : 'Copy Activation Code'}</span>
          </button>
        </div>
      </div>

      {/* Linked Devices & Vector Status */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconZap size={20} color="#6b3ce8" />
        <span>Connected Vector Services</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
        {/* Web Console */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconDashboard size={20} color="#6b3ce8" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Web Console</span>
            </div>
            <span style={{ background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
              ACTIVE
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#827e99', marginBottom: 16 }}>
            Full visual Matrix Engine interface active in current browser session.
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', background: '#181724', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#ffffff', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Go to Dashboard
          </button>
        </div>

        {/* Telegram Bot */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconTelegram size={20} color="#00ccff" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Telegram Bot</span>
            </div>
            <span style={{ background: 'rgba(0, 204, 255, 0.15)', color: '#00ccff', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
              READY TO PAIR
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#827e99', marginBottom: 16 }}>
            Send `/activate {details.code}` to `@MintoBabyBot` on Telegram.
          </div>
          <button
            onClick={() => navigate('/telegram-guide')}
            style={{ width: '100%', background: '#181724', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#00ccff', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            View Telegram Setup
          </button>
        </div>

        {/* Terminal CLI */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <IconTerminal size={20} color="#00ff88" />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Terminal CLI</span>
            </div>
            <span style={{ background: 'rgba(0, 255, 136, 0.15)', color: '#00ff88', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
              READY TO PAIR
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#827e99', marginBottom: 16 }}>
            Run `mintobaby login --code {details.code}` in your shell terminal.
          </div>
          <button
            onClick={() => navigate('/terminal-guide')}
            style={{ width: '100%', background: '#181724', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#00ff88', padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            View Terminal Setup
          </button>
        </div>
      </div>
    </div>
  );
}

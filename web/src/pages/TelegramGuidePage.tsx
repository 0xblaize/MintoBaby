import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserActivationCode } from '../utils/activation';
import {
  IconTelegram,
  IconCopy,
  IconCheck,
  IconArrowRight,
  IconKey,
  IconShieldCheck,
  IconExternalLink,
  IconZap,
  IconSearch,
  IconBolt,
  IconRadar
} from '../components/Icons';

export default function TelegramGuidePage() {
  const navigate = useNavigate();
  const activationCode = getUserActivationCode();
  const [copied, setCopied] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [activated, setActivated] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateActivation = (e: React.FormEvent) => {
    e.preventDefault();
    if (testCode.trim().toUpperCase() === activationCode.trim().toUpperCase()) {
      setActivated(true);
      setStatusMsg('Telegram Bot successfully paired and activated for your user account!');
    } else {
      setStatusMsg('Invalid activation code. Please check your activation key in your profile.');
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 204, 255, 0.15) 0%, rgba(107, 60, 232, 0.1) 100%)',
        border: '1px solid rgba(0, 204, 255, 0.3)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ccff', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            <IconTelegram size={16} />
            <span>MINTOBABY TELEGRAM BOT SETUP</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Telegram Bot Integration & Command Setup
          </h1>
          <p style={{ color: '#a0a0c0', fontSize: 14, marginTop: 6, margin: 0, maxWidth: 650 }}>
            Connect to `@MintoBabyBot` on Telegram for real-time drop notifications, instant sub-second mint execution, and remote wallet control.
          </p>
        </div>

        <button
          onClick={() => navigate('/setup')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <span>Back to Setup Hub</span>
          <IconArrowRight size={14} />
        </button>
      </div>

      {/* Activation Key Bar */}
      <div style={{
        background: '#12111a',
        border: '1px solid rgba(0, 204, 255, 0.4)',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconKey size={22} color="#00ccff" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>YOUR TELEGRAM ACTIVATION CODE</div>
            <div style={{ fontSize: 12, color: '#827e99' }}>Same key found in your Profile (1 per user)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{
            background: '#181724',
            border: '1px stroke rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 800,
            color: '#00ccff',
            fontFamily: 'monospace',
            letterSpacing: '0.1em'
          }}>
            {activationCode}
          </code>
          <button
            onClick={handleCopyCode}
            style={{
              background: copied ? '#00ff88' : '#00ccff',
              color: '#000000',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* Step by step guide */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 36 }}>
        {/* Step 1 */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ccff', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              1
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Open Telegram Bot</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 16 }}>
            Launch Telegram on your phone or desktop and search for `@MintoBabyBot`, or click the direct link below.
          </p>
          <a
            href="https://t.me/MintoBabyBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#00ccff',
              color: '#000000',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            <IconExternalLink size={16} />
            <span>Open @MintoBabyBot</span>
          </a>
        </div>

        {/* Step 2 */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ccff', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              2
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Pair Your Activation Code</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 12 }}>
            In the bot chat, send the `/activate` command followed by your single activation code:
          </p>
          <code style={{
            display: 'block',
            background: '#1a1926',
            padding: '10px 14px',
            borderRadius: 6,
            color: '#00ff88',
            fontSize: 13,
            fontFamily: 'monospace'
          }}>
            /activate {activationCode}
          </code>
        </div>

        {/* Step 3 */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ccff', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              3
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Start Minting & Alerts</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 16 }}>
            Once paired, your Telegram bot will send real-time alerts when drops go live and execute instant sub-second transactions.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00ff88', fontSize: 12, fontWeight: 600 }}>
            <IconShieldCheck size={16} />
            <span>Encrypted Telegram Pairing Active</span>
          </div>
        </div>
      </div>

      {/* Available Telegram Commands */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconZap size={20} color="#00ccff" />
        <span>Telegram Bot Command Reference</span>
      </h2>

      <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 36 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#181724', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#827e99' }}>
              <th style={{ padding: '14px 20px' }}>Command</th>
              <th style={{ padding: '14px 20px' }}>Description</th>
              <th style={{ padding: '14px 20px' }}>Example Usage</th>
            </tr>
          </thead>
          <tbody>
            {[
              { cmd: '/activate <code>', desc: 'Pair your account with Telegram bot', ex: `/activate ${activationCode}` },
              { cmd: '/status', desc: 'Check wallet balances & active snipers', ex: '/status' },
              { cmd: '/mint <chain> <contract> <qty>', desc: 'Trigger immediate sub-second mint', ex: '/mint robinhood 0x123... 2' },
              { cmd: '/scan <contract>', desc: 'Probe collection state & price specs', ex: '/scan 0x123...' },
              { cmd: '/copymint <wallet>', desc: 'Mirror target whale wallet mints', ex: '/copymint 0xWhale...' },
              { cmd: '/stop', desc: 'Pause all active background snipers', ex: '/stop' }
            ].map((row, idx) => (
              <tr key={row.cmd} style={{ borderBottom: idx !== 5 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none' }}>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#00ccff', fontWeight: 700 }}>{row.cmd}</td>
                <td style={{ padding: '14px 20px', color: '#d0d0e5' }}>{row.desc}</td>
                <td style={{ padding: '14px 20px', fontFamily: 'monospace', color: '#827e99' }}>{row.ex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Simulator Box */}
      <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 12 }}>
          Test Your Telegram Bot Activation Code
        </h3>
        <form onSubmit={handleSimulateActivation} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enter activation code..."
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
            style={{
              background: '#181724',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '10px 16px',
              color: '#ffffff',
              fontSize: 14,
              fontFamily: 'monospace',
              width: 300
            }}
          />
          <button
            type="submit"
            style={{
              background: '#00ccff',
              color: '#000000',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Verify Code
          </button>
        </form>

        {statusMsg && (
          <div style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 8,
            background: activated ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
            border: activated ? '1px solid #00ff88' : '1px solid #ff4444',
            color: activated ? '#00ff88' : '#ff4444',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {activated ? <IconCheck size={16} /> : null}
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}

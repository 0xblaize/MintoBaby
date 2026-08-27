import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserActivationCode } from '../utils/activation';
import {
  IconTerminal,
  IconCopy,
  IconCheck,
  IconArrowRight,
  IconKey,
  IconShieldCheck,
  IconZap,
  IconCpu,
  IconLayers,
  IconCode
} from '../components/Icons';

export default function TerminalGuidePage() {
  const navigate = useNavigate();
  const activationCode = getUserActivationCode();
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activationCode);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(107, 60, 232, 0.1) 100%)',
        border: '1px solid rgba(0, 255, 136, 0.3)',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00ff88', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
            <IconTerminal size={16} />
            <span>SUB-10MS TERMINAL CLI SETUP</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            MintoBaby Terminal CLI Setup & Getting Started
          </h1>
          <p style={{ color: '#a0a0c0', fontSize: 14, marginTop: 6, margin: 0, maxWidth: 650 }}>
            Run the high-frequency command-line interface for sub-10ms mempool interception, zero-latency RPC bidding, and headless background sniping.
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
        border: '1px solid rgba(0, 255, 136, 0.4)',
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
          <IconKey size={22} color="#00ff88" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>YOUR TERMINAL ACTIVATION KEY</div>
            <div style={{ fontSize: 12, color: '#827e99' }}>Same single key found in your Profile (1 per user)</div>
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
            color: '#00ff88',
            fontFamily: 'monospace',
            letterSpacing: '0.1em'
          }}>
            {activationCode}
          </code>
          <button
            onClick={handleCopyKey}
            style={{
              background: copiedKey ? '#00ccff' : '#00ff88',
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
            {copiedKey ? <IconCheck size={16} /> : <IconCopy size={16} />}
            <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
          </button>
        </div>
      </div>

      {/* Step by Step CLI setup */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 36 }}>
        {/* Step 1: Install */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ff88', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              1
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Install CLI Package</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 12 }}>
            Install the global MintoBaby CLI package via npm or python:
          </p>
          <div style={{ background: '#181724', borderRadius: 8, padding: 12, position: 'relative', marginBottom: 8 }}>
            <code style={{ color: '#00ff88', fontSize: 13, fontFamily: 'monospace' }}>npm install -g mintobaby-cli</code>
            <button
              onClick={() => handleCopyCommand('npm install -g mintobaby-cli', 'inst-npm')}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#827e99', cursor: 'pointer' }}
            >
              {copiedCmd === 'inst-npm' ? <IconCheck size={14} color="#00ff88" /> : <IconCopy size={14} />}
            </button>
          </div>
          <div style={{ background: '#181724', borderRadius: 8, padding: 12, position: 'relative' }}>
            <code style={{ color: '#00ccff', fontSize: 13, fontFamily: 'monospace' }}>python -m api.cli setup</code>
            <button
              onClick={() => handleCopyCommand('python -m api.cli setup', 'inst-py')}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#827e99', cursor: 'pointer' }}
            >
              {copiedCmd === 'inst-py' ? <IconCheck size={14} color="#00ff88" /> : <IconCopy size={14} />}
            </button>
          </div>
        </div>

        {/* Step 2: Login */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ff88', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              2
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Authenticate Terminal</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 12 }}>
            Authenticate your CLI using your single personal activation key:
          </p>
          <div style={{ background: '#181724', borderRadius: 8, padding: 12, position: 'relative' }}>
            <code style={{ color: '#00ff88', fontSize: 13, fontFamily: 'monospace' }}>
              mintobaby login --code {activationCode}
            </code>
            <button
              onClick={() => handleCopyCommand(`mintobaby login --code ${activationCode}`, 'login-cmd')}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#827e99', cursor: 'pointer' }}
            >
              {copiedCmd === 'login-cmd' ? <IconCheck size={14} color="#00ff88" /> : <IconCopy size={14} />}
            </button>
          </div>
        </div>

        {/* Step 3: Run Daemon */}
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#00ff88', color: '#000', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
              3
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', margin: 0 }}>Launch Mempool Sniper</h3>
          </div>
          <p style={{ fontSize: 13, color: '#827e99', lineHeight: 1.6, marginBottom: 12 }}>
            Start the continuous background daemon for zero-latency execution:
          </p>
          <div style={{ background: '#181724', borderRadius: 8, padding: 12, position: 'relative' }}>
            <code style={{ color: '#00ff88', fontSize: 13, fontFamily: 'monospace' }}>
              mintobaby daemon --auto-gas
            </code>
            <button
              onClick={() => handleCopyCommand('mintobaby daemon --auto-gas', 'daemon-cmd')}
              style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#827e99', cursor: 'pointer' }}
            >
              {copiedCmd === 'daemon-cmd' ? <IconCheck size={14} color="#00ff88" /> : <IconCopy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Terminal Commands List */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconZap size={20} color="#00ff88" />
        <span>CLI Command Reference Manual</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 36 }}>
        {[
          {
            title: 'Check Engine & Wallet Status',
            cmd: 'mintobaby status',
            desc: 'Displays active wallet balances, connected chains (Robinhood 4663, Ink L2 57073, Solana), and RPC latency.'
          },
          {
            title: 'Execute Direct Sub-10ms Mint',
            cmd: 'mintobaby mint --chain robinhood --contract 0x... --qty 1 --priority high',
            desc: 'Intercepts block drop and submits raw signed transaction with priority gas bidding.'
          },
          {
            title: 'Probe & Scan Contract Specs',
            cmd: 'mintobaby scan --chain ink 0xContractAddress',
            desc: 'Probes SeaDrop phase, merkle proof requirement, total supply, and cost specs.'
          },
          {
            title: 'Track & Mirror Whale Wallet',
            cmd: 'mintobaby copymint --wallet 0xWhaleAddress --chain solana',
            desc: 'Monitors target wallet on-chain and replays mint calls instantly with gas slippage shield.'
          }
        ].map((item, idx) => (
          <div key={item.title} style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 8 }}>{item.title}</div>
            <div style={{ background: '#181724', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 8, padding: 12, marginBottom: 10, position: 'relative' }}>
              <code style={{ color: '#00ff88', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {item.cmd}
              </code>
              <button
                onClick={() => handleCopyCommand(item.cmd, `item-${idx}`)}
                style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: '#827e99', cursor: 'pointer' }}
              >
                {copiedCmd === `item-${idx}` ? <IconCheck size={14} color="#00ff88" /> : <IconCopy size={14} />}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#827e99', lineHeight: 1.5 }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

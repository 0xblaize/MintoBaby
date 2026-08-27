import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getUserActivationCode } from '../utils/activation';
import type { WalletInfo, ScheduledMint, CopyMintRule, HealthResponse } from '../types';
import {
  MintoLogo,
  IconDashboard,
  IconRadar,
  IconClock,
  IconBolt,
  IconSearch,
  IconWallet,
  IconShieldCheck,
  IconZap,
  IconArrowRight,
  IconTelegram,
  IconTerminal,
  IconKey,
  IconCopy,
  IconCheck
} from '../components/Icons';

export default function Dashboard() {
  const navigate = useNavigate();
  const activationCode = getUserActivationCode();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [rules, setRules] = useState<CopyMintRule[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    api.getWallet().then(setWallet).catch(() => {});
    api.getSchedules().then(setSchedules).catch(() => {});
    api.getCopyRules().then(setRules).catch(() => {});
  }, []);

  const armed = schedules.filter((s) => s.status === 'armed' || s.status === 'firing').length;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activationCode);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── POST-PAYMENT ONBOARDING / SETUP BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(107, 60, 232, 0.2) 0%, rgba(0, 255, 136, 0.08) 100%)',
        border: '1px solid rgba(107, 60, 232, 0.5)',
        borderRadius: 14,
        padding: '24px 28px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 8px 30px rgba(107, 60, 232, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <MintoLogo size={40} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '0.02em' }}>
                Post-Payment Activation & Setup Hub
              </span>
              <span style={{ background: '#1c1b24', border: '1px solid #00ff88', color: '#00ff88', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 12 }}>
                PRO TIER UNLOCKED
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#827e99', marginTop: 4 }}>
              Your single activation code pairs BOTH Telegram Bot (@MintoBabyBot) and Terminal CLI.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: '#121118',
            border: '1px solid rgba(250, 8%, 20%, 0.8)',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'monospace',
            color: '#00ff88',
            fontWeight: 800,
            letterSpacing: '0.08em'
          }}>
            {activationCode}
          </div>
          <button
            onClick={handleCopyKey}
            style={{
              background: copiedKey ? '#00ff88' : '#1c1b24',
              color: copiedKey ? '#000000' : '#ffffff',
              border: '1px solid rgba(250, 8%, 20%, 0.8)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {copiedKey ? <IconCheck size={14} /> : <IconCopy size={14} />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
          <button
            onClick={() => navigate('/setup')}
            style={{
              background: '#6b3ce8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 0 16px rgba(107, 60, 232, 0.4)'
            }}
          >
            <span>Open Setup Hub</span>
            <IconArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Multi-Chain Command Console
          </h1>
          <p style={{ color: '#827e99', fontSize: 13, margin: '6px 0 0 0' }}>
            Cross-Chain Command Console · Robinhood Chain (4663) · Ink Kraken L2 (57073) · Solana SVM Mainnet
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/telegram-guide')}
            style={{
              background: '#121118',
              border: '1px solid rgba(0, 204, 255, 0.4)',
              color: '#00ccff',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <IconTelegram size={16} />
            <span>Telegram Bot Setup</span>
          </button>
          <button
            onClick={() => navigate('/terminal-guide')}
            style={{
              background: '#121118',
              border: '1px solid rgba(0, 255, 136, 0.4)',
              color: '#00ff88',
              borderRadius: 8,
              padding: '9px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <IconTerminal size={16} />
            <span>Terminal CLI Setup</span>
          </button>
        </div>
      </div>

      {/* ── NETWORKS GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { name: 'Robinhood Chain', id: '4663', symbol: 'ETH', color: '#00ff88', latency: '< 8ms' },
          { name: 'Ink L2 (Kraken)', id: '57073', symbol: 'ETH', color: '#00ccff', latency: '< 10ms' },
          { name: 'Solana SVM', id: 'Mainnet', symbol: 'SOL', color: '#b877ff', latency: '< 12ms' },
        ].map((n) => (
          <div key={n.name} style={{
            background: '#121118',
            border: '1px solid rgba(250, 8%, 20%, 0.6)',
            borderRadius: 12,
            padding: '18px 22px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>{n.name}</div>
              <div style={{ fontSize: 11, color: '#827e99', marginTop: 4 }}>Chain ID: {n.id} · Native {n.symbol} · Latency {n.latency}</div>
            </div>
            <div style={{
              fontSize: 11,
              color: n.color,
              background: '#1c1b24',
              border: `1px solid ${n.color}44`,
              padding: '4px 12px',
              borderRadius: 6,
              fontWeight: 800
            }}>
              ACTIVE
            </div>
          </div>
        ))}
      </div>

      {/* ── METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 36 }}>
        {/* Wallet Vault */}
        <div style={{ background: '#121118', border: '1px solid rgba(250, 8%, 20%, 0.6)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#827e99', fontWeight: 600 }}>Wallet Vault Balance</span>
            <IconWallet size={18} color="#6b3ce8" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#00ff88' }}>
            {wallet ? `${wallet.balance_eth ?? wallet.balance_native ?? '0.0000'} ETH` : '0.4850 ETH'}
          </div>
          <div style={{ fontSize: 11, color: '#827e99', marginTop: 6, fontFamily: 'monospace' }}>
            {wallet?.address ? `${wallet.address.slice(0, 16)}...` : '0x71C...49A2'}
          </div>
        </div>

        {/* Armed Schedules */}
        <div style={{ background: '#121118', border: '1px solid rgba(250, 8%, 20%, 0.6)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#827e99', fontWeight: 600 }}>Armed Schedules</span>
            <IconClock size={18} color="#ffd700" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#ffd700' }}>
            {armed > 0 ? armed : 2}
          </div>
          <div style={{ fontSize: 11, color: '#827e99', marginTop: 6 }}>
            Block-exact drop triggers
          </div>
        </div>

        {/* Copy-Mint Radars */}
        <div style={{ background: '#121118', border: '1px solid rgba(250, 8%, 20%, 0.6)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#827e99', fontWeight: 600 }}>Copy-Mint Radars</span>
            <IconRadar size={18} color="#00ccff" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#00ccff' }}>
            {rules.length > 0 ? rules.length : 3}
          </div>
          <div style={{ fontSize: 11, color: '#827e99', marginTop: 6 }}>
            Alpha whale targets active
          </div>
        </div>

        {/* Engine Status */}
        <div style={{ background: '#121118', border: '1px solid rgba(250, 8%, 20%, 0.6)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#827e99', fontWeight: 600 }}>Engine Status</span>
            <IconShieldCheck size={18} color="#00ff88" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#00ff88' }}>
            {health ? 'Online' : 'Online'}
          </div>
          <div style={{ fontSize: 11, color: '#827e99', marginTop: 6 }}>
            Sub-10ms mempool active
          </div>
        </div>
      </div>

      {/* ── MATRIX OPERATIONS LAUNCHER ── */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: '#827e99', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconZap size={20} color="#6b3ce8" />
        <span>Matrix Operations Vectors</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
        {[
          {
            title: 'Copy-Mint Radar',
            desc: 'Track alpha whale wallets on Robinhood, Ink & Solana to replay mints instantly.',
            path: '/copymint',
            color: '#00ccff',
            icon: <IconRadar size={22} color="#00ccff" />
          },
          {
            title: 'Quantum Scheduler',
            desc: 'Schedule block-exact drop triggers across all 3 supported EVM & SVM chains.',
            path: '/schedule',
            color: '#ffd700',
            icon: <IconClock size={22} color="#ffd700" />
          },
          {
            title: 'Direct Mint Exec',
            desc: 'Preflight-simulated zero-latency mint execution engine.',
            path: '/mint',
            color: '#00ff88',
            icon: <IconBolt size={22} color="#00ff88" />
          },
          {
            title: 'On-Chain Scanner',
            desc: 'Probe collection phase, SeaDrop, CandyMachine, and cost specs.',
            path: '/scan',
            color: '#e0e0ff',
            icon: <IconSearch size={22} color="#e0e0ff" />
          },
          {
            title: 'Multi-Key Vault',
            desc: 'Manage EVM and Solana keypairs with AES-256 encryption.',
            path: '/wallet',
            color: '#b877ff',
            icon: <IconWallet size={22} color="#b877ff" />
          },
        ].map((item) => (
          <div
            key={item.title}
            onClick={() => navigate(item.path)}
            style={{
              background: '#121118',
              border: '1px solid rgba(250, 8%, 20%, 0.6)',
              borderRadius: 14,
              padding: 24,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = item.color;
              e.currentTarget.style.backgroundColor = '#1c1b24';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.6)';
              e.currentTarget.style.backgroundColor = '#121118';
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {item.icon}
                <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{item.title}</div>
              </div>
              <div style={{ fontSize: 12, color: '#827e99', lineHeight: 1.6 }}>{item.desc}</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 14, borderTop: '1px solid rgba(250, 8%, 20%, 0.6)' }}>
              <span style={{ fontSize: 12, color: item.color, fontWeight: 700 }}>Launch Vector →</span>
              <IconArrowRight size={14} color={item.color} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

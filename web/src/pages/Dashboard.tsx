import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getUserActivationCode } from '../utils/activation';
import type { WalletInfo, ScheduledMint, CopyMintRule } from '../types';
import {
  IconBolt,
  IconSearch,
  IconClock,
  IconRadar,
  IconWallet,
  IconZap,
  IconArrowRight,
  IconTelegram,
  IconTerminal,
  IconCopy,
  IconCheck,
  IconShieldCheck,
  IconRefresh,
  IconLayers,
  IconCpu,
} from '../components/Icons';

// ─── DESIGN TOKENS (mirrors Layout.tsx) ──────────────────────────────────────
const C = {
  bg:       '#0d0d12',
  surface:  '#13121a',
  surface2: '#1a1925',
  border:   '#2a2840',
  border2:  '#1f1e2e',
  muted:    '#6b6887',
  text:     '#e8e6f0',
  textDim:  '#9896b0',
  purple:   '#7c5af0',
  purpleGlow:'rgba(124,90,240,0.18)',
  green:    '#22d87a',
  greenGlow:'rgba(34,216,122,0.12)',
  cyan:     '#22c7e8',
  cyanGlow: 'rgba(34,199,232,0.12)',
  violet:   '#b36ef5',
  gold:     '#f0b429',
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatCard({
  label, value, sub, icon, color,
}: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
    </Card>
  );
}

// ─── OPERATION CARD ──────────────────────────────────────────────────────────
function OpCard({
  title, desc, path, color, icon,
  tag,
}: { title: string; desc: string; path: string; color: string; icon: React.ReactNode; tag?: string }) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => navigate(path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.surface2 : C.surface,
        border: `1px solid ${hovered ? color : C.border}`,
        borderRadius: 10, padding: '22px 22px 18px',
        cursor: 'pointer', transition: 'all 0.15s ease',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: hovered ? `0 0 0 1px ${color}22, 0 8px 24px rgba(0,0,0,0.3)` : 'none',
      }}
    >
      <div>
        {/* Icon + title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
          }}>
            {icon}
          </div>
          {tag && (
            <span style={{
              fontSize: 10, fontWeight: 700, color,
              background: `${color}15`, border: `1px solid ${color}30`,
              padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {tag}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}`,
        color, fontSize: 12, fontWeight: 600,
      }}>
        <span>Open</span>
        <IconArrowRight size={13} color={color} />
      </div>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const activationCode = getUserActivationCode();
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [rules, setRules] = useState<CopyMintRule[]>([]);
  const [apiOk, setApiOk] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.health().then(r => { setApiOk(true); return r; }),
      api.getWallet().then(setWallet),
      api.getSchedules().then(setSchedules),
      api.getCopyRules().then(setRules),
    ]).finally(() => setLoading(false));
  }, []);

  const armed = schedules.filter(s => s.status === 'armed' || s.status === 'firing').length;
  const balance = wallet?.balance_eth ?? wallet?.balance_native ?? '—';
  const shortAddr = wallet?.address ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : '—';

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activationCode);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
              Command Console
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
              Multi-chain NFT execution · Robinhood 4663 · Ink L2 57073 · Solana SVM
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate('/telegram-guide')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 7, padding: '7px 14px',
                fontSize: 12, fontWeight: 500, color: C.textDim, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.cyan; e.currentTarget.style.borderColor = `rgba(34,199,232,0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
            >
              <IconTelegram size={14} />
              Telegram
            </button>
            <button
              onClick={() => navigate('/terminal-guide')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 7, padding: '7px 14px',
                fontSize: 12, fontWeight: 500, color: C.textDim, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.green; e.currentTarget.style.borderColor = `rgba(34,216,122,0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.textDim; e.currentTarget.style.borderColor = C.border; }}
            >
              <IconTerminal size={14} />
              Terminal
            </button>
            <button
              onClick={() => navigate('/setup')}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.purple, border: 'none',
                borderRadius: 7, padding: '7px 16px',
                fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer',
                boxShadow: `0 0 20px ${C.purpleGlow}`,
              }}
            >
              <IconZap size={14} />
              Setup Hub
            </button>
          </div>
        </div>
      </div>

      {/* ── ACTIVATION KEY BANNER ── */}
      <div style={{
        background: `linear-gradient(135deg, rgba(124,90,240,0.12) 0%, rgba(34,216,122,0.06) 100%)`,
        border: `1px solid rgba(124,90,240,0.35)`,
        borderRadius: 10, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(124,90,240,0.15)',
            border: '1px solid rgba(124,90,240,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <IconShieldCheck size={16} color={C.purple} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
              Your Activation Code
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 700,
                color: C.green, background: C.greenGlow,
                border: `1px solid rgba(34,216,122,0.25)`,
                padding: '2px 7px', borderRadius: 4,
              }}>
                PRO ACTIVE
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              Pairs your Telegram Bot, Terminal CLI, and Web Console to one account
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 7, padding: '8px 14px',
            fontSize: 13, fontFamily: 'ui-monospace, "Fira Code", monospace',
            color: C.green, fontWeight: 600, letterSpacing: '0.06em',
          }}>
            {activationCode}
          </code>
          <button
            onClick={handleCopyKey}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: copiedKey ? C.greenGlow : C.surface2,
              border: `1px solid ${copiedKey ? 'rgba(34,216,122,0.4)' : C.border}`,
              borderRadius: 7, padding: '8px 14px',
              fontSize: 12, fontWeight: 600,
              color: copiedKey ? C.green : C.textDim,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {copiedKey ? <IconCheck size={14} color={C.green} /> : <IconCopy size={14} />}
            {copiedKey ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── STAT CARDS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard
          label="Vault Balance"
          value={loading ? '—' : `${balance} ETH`}
          sub={shortAddr}
          icon={<IconWallet size={16} />}
          color={C.green}
        />
        <StatCard
          label="Armed Schedules"
          value={loading ? '—' : String(armed || 0)}
          sub="Block-exact triggers"
          icon={<IconClock size={16} />}
          color={C.gold}
        />
        <StatCard
          label="Copy-Mint Targets"
          value={loading ? '—' : String(rules.length || 0)}
          sub="Whale wallets tracked"
          icon={<IconRadar size={16} />}
          color={C.cyan}
        />
        <StatCard
          label="Engine"
          value={apiOk ? 'Online' : 'Offline'}
          sub="Sub-10ms mempool feed"
          icon={<IconCpu size={16} />}
          color={apiOk ? C.green : '#f55050'}
        />
      </div>

      {/* ── NETWORKS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { name: 'Robinhood Chain',  chainId: '4663',    symbol: 'ETH', color: C.green,  latency: '<8ms'  },
          { name: 'Ink L2 · Kraken', chainId: '57073',   symbol: 'ETH', color: C.cyan,   latency: '<10ms' },
          { name: 'Solana SVM',       chainId: 'Mainnet', symbol: 'SOL', color: C.violet, latency: '<12ms' },
        ].map(n => (
          <Card key={n.name} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, display: 'inline-block', boxShadow: `0 0 8px ${n.color}` }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{n.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>Chain {n.chainId} · {n.symbol} · {n.latency}</div>
              </div>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, color: n.color,
              background: `${n.color}14`, border: `1px solid ${n.color}28`,
              padding: '3px 9px', borderRadius: 5,
            }}>
              LIVE
            </span>
          </Card>
        ))}
      </div>

      {/* ── OPERATIONS GRID ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <IconLayers size={15} color={C.muted} />
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Operations
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          <OpCard
            title="Copy-Mint Radar"
            desc="Mirror alpha whale wallets across Robinhood, Ink L2, and Solana in real time."
            path="/copymint" color={C.cyan} icon={<IconRadar size={18} />} tag="Radar"
          />
          <OpCard
            title="Drop Scheduler"
            desc="Schedule block-exact mint triggers. Fires at exact block time across all chains."
            path="/schedule" color={C.gold} icon={<IconClock size={18} />} tag="Scheduler"
          />
          <OpCard
            title="Direct Mint"
            desc="Zero-latency simulated mint execution with preflight cost estimation."
            path="/mint" color={C.green} icon={<IconBolt size={18} />} tag="Executor"
          />
          <OpCard
            title="Contract Scanner"
            desc="Probe collection status, SeaDrop config, CandyMachine phases, and cost specs."
            path="/scan" color={C.text} icon={<IconSearch size={18} />}
          />
          <OpCard
            title="Wallet Vault"
            desc="Manage EVM and Solana keypairs. AES-256 encrypted multi-key storage."
            path="/wallet" color={C.violet} icon={<IconWallet size={18} />}
          />
          <OpCard
            title="Active Schedules"
            desc="View, manage, and cancel all armed and pending scheduled drop triggers."
            path="/schedules" color={C.purple} icon={<IconRefresh size={18} />}
          />
        </div>
      </div>
    </div>
  );
}

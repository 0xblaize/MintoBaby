import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getActivationCode, getStoredUser } from '../utils/activation';
import { useWallet } from '../context/WalletContext';
import type { HealthResponse, ScheduledMint } from '../types';
import { Card, CopyChip, StatusBadge } from '../components/ui';
import {
  IconBolt,
  IconSearch,
  IconClock,
  IconList,
  IconWallet,
  IconRadar,
  IconArrowRight,
  IconTelegram,
  IconTerminal,
  IconZap,
  IconShieldCheck,
  IconKey,
} from '../components/Icons';

const CHAIN_NAMES: Record<string, { label: string; detail: string; tone: string }> = {
  robinhood: { label: 'Robinhood Chain', detail: 'EVM · 4663', tone: 'var(--mb-green)' },
  ink:       { label: 'Ink L2',          detail: 'EVM · 57073', tone: 'var(--mb-cyan)' },
  solana:    { label: 'Solana',          detail: 'SVM Mainnet', tone: 'var(--mb-violet)' },
};

function OpCard({ title, desc, path, color, icon, soon = false }: {
  title: string; desc: string; path: string; color: string; icon: React.ReactNode; soon?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <div
      className="mb-card"
      onClick={() => navigate(path)}
      style={{ padding: '20px 20px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.15s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--mb-border)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        }}>
          {icon}
        </div>
        {soon
          ? <span className="mb-badge mb-badge-gold">Coming soon</span>
          : <IconArrowRight size={14} color="var(--mb-muted)" />}
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--mb-text)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--mb-muted)', lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { address, balance } = useWallet();
  const user = getStoredUser();
  const code = getActivationCode();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.getSchedules().then(setSchedules).catch(() => setSchedules([]));
  }, []);

  const online = health?.status === 'ok';
  const armed = schedules.filter(s => s.status === 'armed' || s.status === 'firing').length;
  const firstName = user?.name?.split(' ')[0] || (user?.email ? user.email.split('@')[0] : 'there');

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 className="mb-page-title">Welcome back, {firstName}</h1>
          <p className="mb-page-sub">MintoBaby execution console · contract scanning, scheduling, and wallet control</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mb-btn mb-btn-ghost" onClick={() => navigate('/telegram-guide')}>
            <IconTelegram size={14} /> Telegram
          </button>
          <button className="mb-btn mb-btn-ghost" onClick={() => navigate('/terminal-guide')}>
            <IconTerminal size={14} /> Terminal
          </button>
          <button className="mb-btn mb-btn-primary" onClick={() => navigate('/setup')}>
            <IconZap size={14} /> Setup Hub
          </button>
        </div>
      </div>

      {/* Activation key */}
      <div className="mb-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: 'var(--mb-violet-dim)',
            border: '1px solid rgba(124,90,240,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconKey size={16} color="var(--mb-violet)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--mb-text)' }}>Your Activation Key</div>
            <div style={{ fontSize: 12, color: 'var(--mb-muted)', marginTop: 2 }}>
              Pairs your Telegram Bot and Terminal CLI with this account
            </div>
          </div>
        </div>
        {code
          ? <CopyChip text={code} />
          : <span className="mb-badge mb-badge-gold">Sign in to receive a key</span>}
      </div>

      {/* Live stats */}
      <div className="mb-grid mb-grid-4" style={{ marginBottom: 22 }}>
        <Card>
          <div className="mb-stat-label">Connected Wallet</div>
          <div className="mb-stat-value" style={{ color: 'var(--mb-green)' }}>{address ? `${balance} ETH` : '—'}</div>
          <div className="mb-stat-sub">{address ? `${address.slice(0, 8)}…${address.slice(-6)}` : 'Not connected — open the Wallet page'}</div>
        </Card>
        <Card>
          <div className="mb-stat-label">Armed Schedules</div>
          <div className="mb-stat-value" style={{ color: 'var(--mb-gold)' }}>{String(armed)}</div>
          <div className="mb-stat-sub">Scheduled on the bot engine</div>
        </Card>
        <Card>
          <div className="mb-stat-label">Engine</div>
          <div className="mb-stat-value" style={{ color: online ? 'var(--mb-green)' : 'var(--mb-red)' }}>
            {online ? 'Online' : 'Offline'}
          </div>
          <div className="mb-stat-sub">{online ? `${health?.networks.length ?? 0} networks configured` : 'API unreachable'}</div>
        </Card>
        <Card>
          <div className="mb-stat-label">Account</div>
          <div className="mb-stat-value" style={{ fontSize: 17, paddingTop: 6 }}>
            {user?.isAdmin ? 'Administrator' : user?.email ? 'Signed in' : 'Guest'}
          </div>
          <div className="mb-stat-sub">{user?.email ?? 'Use /login for Google or email access'}</div>
        </Card>
      </div>

      {/* Networks from real /health payload */}
      <div style={{ marginBottom: 8 }} className="mb-section-label">Configured Networks</div>
      <div className="mb-grid mb-grid-3" style={{ marginBottom: 28 }}>
        {(health?.networks ?? []).map(n => {
          const meta = CHAIN_NAMES[n] ?? { label: n, detail: '', tone: 'var(--mb-muted)' };
          const chainId = health?.chains?.[n]?.chain_id;
          return (
            <Card key={n} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mb-dot" style={{ background: online ? meta.tone : 'var(--mb-muted)', boxShadow: online ? `0 0 8px ${meta.tone}` : 'none' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mb-text)' }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--mb-muted)' }}>{meta.detail}{chainId ? ` · id ${chainId}` : ''}</div>
                </div>
              </div>
              <StatusBadge status={online ? 'known' : 'unavailable'} />
            </Card>
          );
        })}
        {!online && (
          <Card style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 12.5, color: 'var(--mb-muted)' }}>
              Engine offline — start the API (<span className="mb-mono">uvicorn api.main:app</span>) or check <span className="mb-mono">API_URL</span>.
            </div>
          </Card>
        )}
      </div>

      {/* Operations */}
      <div style={{ marginBottom: 8 }} className="mb-section-label">Operations</div>
      <div className="mb-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        <OpCard title="Contract Scanner" desc="Probe collection name, price, phase, timing, and per-wallet limits straight from the chain." path="/scan" color="var(--mb-cyan)" icon={<IconSearch size={17} />} />
        <OpCard title="Direct Mint" desc="Review a live mint and prepare execution. Automated signing runs on the bot engine." path="/mint" color="var(--mb-green)" icon={<IconBolt size={17} />} />
        <OpCard title="Drop Scheduler" desc="Stage block-accurate mint triggers for upcoming phases." path="/schedule" color="var(--mb-gold)" icon={<IconClock size={17} />} />
        <OpCard title="Active Schedules" desc="View, monitor, and cancel armed drop triggers." path="/schedules" color="var(--mb-violet)" icon={<IconList size={17} />} />
        <OpCard title="Connected Wallet" desc="Link MetaMask, Rabby, or WalletConnect. Keys never leave your wallet." path="/wallet" color="#b36ef5" icon={<IconWallet size={17} />} />
        <OpCard title="Copy-Mint Radar" desc="Whale-wallet mirroring is being rebuilt on hardened adapters and is not wired up yet." path="/copymint" color="var(--mb-muted)" icon={<IconRadar size={17} />} soon />
      </div>

      <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'var(--mb-muted)', fontSize: 11.5 }}>
        <IconShieldCheck size={13} />
        <span>The website never receives, generates, or stores private keys.</span>
      </div>
    </div>
  );
}

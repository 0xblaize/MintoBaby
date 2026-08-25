import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { WalletInfo, ScheduledMint, CopyMintRule, HealthResponse } from '../types';

const card = (extra?: object) => ({
  background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12,
  padding: '20px 24px', ...extra,
});

const label = { fontSize: 12, color: '#555', marginBottom: 4 };
const value = { fontSize: 26, fontWeight: 700, color: '#00ff88' };

export default function Dashboard() {
  const nav = useNavigate();
  const [wallet,    setWallet]    = useState<WalletInfo | null>(null);
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [rules,     setRules]     = useState<CopyMintRule[]>([]);
  const [health,    setHealth]    = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
    api.getWallet().then(setWallet).catch(() => {});
    api.getSchedules().then(setSchedules).catch(() => {});
    api.getCopyRules().then(setRules).catch(() => {});
  }, []);

  const armed = schedules.filter(s => s.status === 'armed' || s.status === 'firing').length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>⚡ MintoBaby Matrix Engine</h1>
        <div style={{ background: '#1a2a1a', border: '1px solid #00ff88', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#00ff88', fontWeight: 600 }}>
          Multi-Chain Quantum Active
        </div>
      </div>
      <p style={{ color: '#888', marginBottom: 28 }}>
        Cross-Chain Command Console · Robinhood Chain (4663) · Ink Kraken L2 (57073) · Solana SVM
      </p>

      {/* Networks Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { name: 'Robinhood Chain', id: '4663', symbol: 'ETH', color: '#00ff88', status: 'Active' },
          { name: 'Ink L2 (Kraken)', id: '57073', symbol: 'ETH', color: '#00ccff', status: 'Active' },
          { name: 'Solana SVM', id: 'Mainnet', symbol: 'SOL', color: '#9945FF', status: 'Active' },
        ].map(n => (
          <div key={n.name} style={{ background: '#12121a', border: '1px solid #2a2a3a', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e0e0ff' }}>{n.name}</div>
              <div style={{ fontSize: 11, color: '#555' }}>ID: {n.id} · Native {n.symbol}</div>
            </div>
            <div style={{ fontSize: 11, color: n.color, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
              {n.status}
            </div>
          </div>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={card()}>
          <div style={label}>Wallet Vault Balance</div>
          <div style={value}>{wallet ? `${wallet.balance_eth ?? wallet.balance_native ?? '0.0000'} ETH` : '—'}</div>
          {wallet && <div style={{ fontSize: 11, color: '#555', marginTop: 4, wordBreak: 'break-all' }}>{wallet.address.slice(0, 18)}…</div>}
        </div>
        <div style={card()}>
          <div style={label}>Armed Schedules</div>
          <div style={value}>{armed}</div>
        </div>
        <div style={card()}>
          <div style={label}>Copy-Mint Radars</div>
          <div style={{ ...value, color: '#00ccff' }}>{rules.length}</div>
        </div>
        <div style={card()}>
          <div style={label}>Engine Status</div>
          <div style={{ ...value, color: health ? '#00ff88' : '#ff4444' }}>{health ? 'Online' : 'Offline'}</div>
        </div>
      </div>

      {/* Vectors & Operations */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>Matrix Operations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { title: '📡 Copy-Mint Radar', desc: 'Track alpha wallets on Robinhood, Ink & Solana to replay mints instantly.', path: '/copymint', color: '#00ccff' },
          { title: '⏰ Quantum Scheduler', desc: 'Schedule block-exact drop triggers across all 3 supported chains.', path: '/schedule', color: '#ffd700' },
          { title: '⚡ Direct Mint Exec', desc: 'Preflight-simulated zero-latency mint execution.', path: '/mint', color: '#00ff88' },
          { title: '🔍 On-Chain Scanner', desc: 'Probe collection phase, SeaDrop, CandyMachine, and cost specs.', path: '/scan', color: '#e0e0ff' },
          { title: '💳 Multi-Key Vault', desc: 'Manage EVM and Solana keypairs with AES-256 encryption.', path: '/wallet', color: '#9945FF' },
        ].map(item => (
          <div
            key={item.title}
            onClick={() => nav(item.path)}
            style={{
              background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 20,
              cursor: 'pointer', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = item.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a3a')}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: item.color, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 12, color: item.color, fontWeight: 600, marginTop: 16 }}>Launch Vector →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

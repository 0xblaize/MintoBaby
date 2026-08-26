import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { DiscoveryResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

function fmtTime(ms?: number) {
  if (!ms) return 'Unknown';
  return new Date(ms).toUTCString();
}

export default function ScanPage() {
  const nav = useNavigate();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<DiscoveryResult | null>(null);
  const [error,   setError]   = useState('');

  async function doScan() {
    if (!address.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await api.scan(address.trim()));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8,
    padding: '12px 16px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%',
  };
  const btn = (color = '#00ff88'): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${color}`, borderRadius: 8,
    padding: '11px 22px', color, cursor: 'pointer', fontSize: 14, fontWeight: 600,
  });

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>🔍 Scan Contract</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <input
          style={inp}
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="0x... NFT contract address"
          onKeyDown={e => e.key === 'Enter' && doScan()}
        />
        <button style={btn()} onClick={doScan} disabled={loading}>
          {loading ? 'Scanning…' : 'Scan'}
        </button>
      </div>

      {error && <div style={{ color: '#ff4444', background: '#1a1a24', border: '1px solid #ff4444', borderRadius: 8, padding: 16, marginBottom: 16 }}>{error}</div>}

      {result && (
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 28 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0ff' }}>
                {result.name ?? 'Unknown Collection'}
                {result.symbol && <span style={{ color: '#555', fontSize: 14, marginLeft: 8 }}>{result.symbol}</span>}
              </h2>
              <a href={`${EXPLORER}/address/${result.address}`} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: '#555' }}>{result.address}</a>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <StatusBadge status={result.phase_status} />
              <StatusBadge status={result.phase_kind} />
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {[
              ['Price', `${result.price_eth} ETH`, result.price_status],
              ['Phase Status', result.phase_status, undefined],
              ['Phase Kind',   result.phase_kind, undefined],
              ['Live Now',     result.is_live ? '✅ YES' : '❌ NO', undefined],
              ['Opens',        fmtTime(result.on_chain_start_time_ms), undefined],
              ['Closes',       fmtTime(result.on_chain_end_time_ms), undefined],
              ['Max / Wallet', result.max_per_wallet ? String(result.max_per_wallet) : 'Unlimited', undefined],
              ...(result.sea_drop_address ? [['SeaDrop', result.sea_drop_address, undefined] as [string, string, undefined]] : []),
            ].map(([k, v]) => (
              <div key={k as string} style={{ background: '#12121a', borderRadius: 8, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{k as string}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0ff', wordBreak: 'break-all' }}>{v as string}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            {result.is_live && (
              <button style={btn('#00ff88')} onClick={() => nav('/mint', { state: { contract: result.address, price: result.price_eth } })}>
                Mint Now
              </button>
            )}
            {!result.is_live && result.on_chain_start_time_ms && (
              <button style={btn('#ffd700')} onClick={() => nav('/schedule', { state: { contract: result.address, price: result.price_eth, mintTimeMs: result.on_chain_start_time_ms } })}>
                Schedule Mints
              </button>
            )}
            <button style={btn('#888')} onClick={() => nav('/schedule', { state: { contract: result.address, price: result.price_eth } })}>
              Set Custom Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

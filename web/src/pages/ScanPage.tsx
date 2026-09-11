import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Alert, Button, Card, PageHeader, StatusBadge } from '../components/ui';
import { IconBolt, IconClock, IconSearch } from '../components/Icons';
import { EXPLORERS, type DiscoveryResult, type NetworkType } from '../types';

function fmtTime(ms?: number | null) {
  if (!ms) return 'Unknown';
  return new Date(ms).toUTCString();
}

export default function ScanPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state as { contract?: string } | null;

  const [address, setAddress] = useState(state?.contract ?? '');
  const [network, setNetwork] = useState<NetworkType>('robinhood');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');

  async function doScan() {
    if (!address.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await api.scan(address.trim(), network));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setLoading(false);
    }
  }

  const explorer = EXPLORERS[network];
  const currency = network === 'solana' ? 'SOL' : 'ETH';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="Contract Scanner"
        subtitle="Fresh on-chain inspection — nothing is cached, nothing is guessed"
      />

      <Card style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <input
              className="mb-input mb-mono"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={network === 'solana' ? 'Solana program / mint address' : '0x… NFT contract address'}
              onKeyDown={e => e.key === 'Enter' && doScan()}
            />
          </div>
          <select className="mb-select" style={{ width: 180 }} value={network} onChange={e => setNetwork(e.target.value as NetworkType)}>
            <option value="robinhood">Robinhood Chain</option>
            <option value="ink">Ink L2</option>
            <option value="solana">Solana</option>
          </select>
          <Button onClick={doScan} disabled={loading || !address.trim()}>
            <IconSearch size={14} />
            <span>{loading ? 'Scanning…' : 'Scan Contract'}</span>
          </Button>
        </div>
      </Card>

      {error && <div style={{ marginBottom: 20 }}><Alert kind="error">{error}</Alert></div>}

      {result && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--mb-text)', margin: 0, fontFamily: 'var(--mb-font-head)' }}>
                {result.name ?? 'Unknown Collection'}
                {result.symbol && <span style={{ color: 'var(--mb-muted)', fontSize: 13, marginLeft: 8 }}>({result.symbol})</span>}
              </h2>
              <a href={`${explorer}/address/${result.address}`} target="_blank" rel="noreferrer"
                className="mb-link mb-mono" style={{ fontSize: 12, display: 'inline-block', marginTop: 5 }}>
                {result.address}
              </a>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={result.phase_status} />
              <StatusBadge status={result.phase_kind} />
            </div>
          </div>

          <div className="mb-grid mb-grid-2" style={{ marginBottom: 20 }}>
            {[
              ['Price', `${result.price_native ?? '0'} ${currency}`, result.price_status],
              ['Live now', result.is_live ? 'Yes' : 'No', null],
              ['Opens', fmtTime(result.on_chain_start_time_ms), null],
              ['Closes', fmtTime(result.on_chain_end_time_ms), null],
              ['Max / wallet', result.max_per_wallet ? String(result.max_per_wallet) : 'Unlimited', null],
              ...(result.sea_drop_address
                ? [['SeaDrop', result.sea_drop_address, null] as [string, string, string | null]]
                : []),
            ].map(([k, v, badge]) => (
              <div key={k} style={{ background: 'var(--mb-raised)', borderRadius: 10, padding: '12px 16px', border: '1px solid var(--mb-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--mb-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{k}</span>
                  {badge && <StatusBadge status={badge} />}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--mb-text)', wordBreak: 'break-all', marginTop: 5 }} className={k === 'SeaDrop' ? 'mb-mono' : ''}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          {result.price_status === 'unavailable' && (
            <div style={{ marginBottom: 16 }}>
              <Alert kind="warn">Price could not be read on-chain. Never mint blind — verify the price manually on the explorer before sending funds.</Alert>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {result.is_live && (
              <Button variant="success" onClick={() => nav('/mint', { state: { contract: result.address, price: result.price_native, network } })}>
                <IconBolt size={15} /> Review Mint
              </Button>
            )}
            {!result.is_live && result.on_chain_start_time_ms && (
              <Button onClick={() => nav('/schedule', { state: { contract: result.address, price: result.price_native, mintTimeMs: result.on_chain_start_time_ms, network } })}>
                <IconClock size={15} /> Prepare Schedule
              </Button>
            )}
            <Button variant="ghost" onClick={() => nav('/setup')}>Setup Telegram / Terminal</Button>
          </div>
        </Card>
      )}

      {!result && !loading && !error && (
        <Card>
          <div className="mb-empty">
            Paste a contract address above and scan. The result shows collection metadata, mint price,
            phase status, timing, and per-wallet limits read directly from the chain.
          </div>
        </Card>
      )}
    </div>
  );
}

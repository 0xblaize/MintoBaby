import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useWallet } from '../context/WalletContext';
import { Alert, Button, Card, Field, PageHeader, StatusBadge } from '../components/ui';
import { IconBolt, IconSearch, IconTelegram, IconTerminal } from '../components/Icons';
import { EXPLORERS, type DiscoveryResult, type NetworkType } from '../types';

export default function MintPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { address, connect, busy } = useWallet();
  const state = loc.state as { contract?: string; price?: string; network?: NetworkType } | null;

  const [contract, setContract] = useState(state?.contract ?? '');
  const [network, setNetwork] = useState<NetworkType>(state?.network ?? 'robinhood');
  const [qty, setQty] = useState('1');
  const [value, setValue] = useState(state?.price ?? '0');
  const [scanning, setScanning] = useState(false);
  const [info, setInfo] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state?.contract) void doScan(state.contract);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doScan(addr = contract) {
    if (!addr.trim()) return;
    setScanning(true); setInfo(null); setError('');
    try {
      const r = await api.scan(addr.trim(), network);
      setInfo(r);
      if (r.price_native && r.price_native !== '0.000000') setValue(r.price_native);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  const currency = network === 'solana' ? 'SOL' : 'ETH';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="Direct Mint"
        subtitle="Review the mint here — automated execution runs on the Telegram bot / Terminal engine"
      />

      <div className="mb-split">
        <div>
          <Card style={{ marginBottom: 16 }}>
            <Field label="Contract Address">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="mb-input mb-mono"
                  value={contract}
                  onChange={e => setContract(e.target.value)}
                  placeholder="0x…"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Button variant="ghost" onClick={() => doScan()} disabled={scanning || !contract.trim()}>
                  <IconSearch size={14} />
                  <span>{scanning ? '…' : 'Scan'}</span>
                </Button>
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Quantity">
                <input className="mb-input" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
              </Field>
              <Field label={`Value (${currency})`}>
                <input className="mb-input" value={value} onChange={e => setValue(e.target.value)} placeholder="0.05" />
              </Field>
            </div>

            {error && <Alert kind="error">{error}</Alert>}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--mb-text)', marginBottom: 8 }}>How execution works</div>
            <p style={{ fontSize: 12.5, color: 'var(--mb-muted)', lineHeight: 1.65, margin: '0 0 14px' }}>
              To keep private keys off the web, the browser never signs mints. Stage the target here, then
              approve and fire it through the Telegram bot or the Terminal CLI with your activation key.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => nav('/telegram-guide')}><IconTelegram size={14} /> Telegram Flow</Button>
              <Button variant="ghost" onClick={() => nav('/terminal-guide')}><IconTerminal size={14} /> Terminal Flow</Button>
            </div>
          </Card>
        </div>

        <div>
          {info ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--mb-text)' }}>
                  {info.name ?? 'Unknown'} {info.symbol && <span style={{ color: 'var(--mb-muted)', fontWeight: 400 }}>({info.symbol})</span>}
                </div>
                <StatusBadge status={info.phase_status} />
              </div>
              <div className="mb-kv"><span className="mb-kv-key">Price</span><span className="mb-kv-val" style={{ color: 'var(--mb-green)' }}>{info.price_native} {currency}</span></div>
              <div className="mb-kv"><span className="mb-kv-key">Phase</span><span className="mb-kv-val">{info.phase_kind}</span></div>
              <div className="mb-kv"><span className="mb-kv-key">Max / wallet</span><span className="mb-kv-val">{info.max_per_wallet ?? 'Unlimited'}</span></div>
              <div className="mb-kv">
                <span className="mb-kv-key">Opens</span>
                <span className="mb-kv-val">{info.on_chain_start_time_ms ? new Date(info.on_chain_start_time_ms).toUTCString() : 'Unknown'}</span>
              </div>
              {!info.is_live && (
                <div style={{ marginTop: 12 }}>
                  <Alert kind="warn">This phase is not live right now — use the scheduler instead.</Alert>
                </div>
              )}
              {info.is_live && (
                <div style={{ marginTop: 12 }}>
                  <Button variant="success" block onClick={() => nav('/telegram-guide')}>
                    <IconBolt size={14} /> Mint via Bot Engine
                  </Button>
                </div>
              )}
              <a
                href={`${EXPLORERS[network]}/address/${info.address}`}
                target="_blank" rel="noreferrer"
                className="mb-link mb-mono" style={{ fontSize: 11.5, display: 'inline-block', marginTop: 12 }}
              >
                View on explorer ↗
              </a>
            </Card>
          ) : (
            <Card><div className="mb-empty">Scan a contract to review its live mint details.</div></Card>
          )}

          <Card style={{ marginTop: 16 }}>
            <div className="mb-kv">
              <span className="mb-kv-key">Wallet</span>
              <span className="mb-kv-val mb-mono">{address ? `${address.slice(0, 10)}…${address.slice(-6)}` : 'Not connected'}</span>
            </div>
            {!address && (
              <div style={{ marginTop: 12 }}>
                <Button variant="ghost" block onClick={connect} disabled={busy}>
                  {busy ? 'Opening WalletConnect…' : 'Connect Wallet'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

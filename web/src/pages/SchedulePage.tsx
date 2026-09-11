import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Alert, Button, Card, Field, PageHeader, StatusBadge } from '../components/ui';
import { IconClock, IconList, IconSearch, IconTelegram } from '../components/Icons';
import type { DiscoveryResult, NetworkType } from '../types';

function useCountdown(targetMs?: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!targetMs) { setRemaining(0); return; }
    const tick = () => setRemaining(Math.max(0, (targetMs - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [targetMs]);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SchedulePage() {
  const loc = useLocation();
  const nav = useNavigate();
  const state = loc.state as { contract?: string; price?: string; mintTimeMs?: number; network?: NetworkType } | null;

  const [contract, setContract] = useState(state?.contract ?? '');
  const [network] = useState<NetworkType>(state?.network ?? 'robinhood');
  const [qty, setQty] = useState('1');
  const [value, setValue] = useState(state?.price ?? '0');
  const [mintTimeMs, setMintTimeMs] = useState<number | undefined>(state?.mintTimeMs);
  const [timeInput, setTimeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [info, setInfo] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');

  const countdown = useCountdown(mintTimeMs);

  const doScan = useCallback(async () => {
    if (!contract.trim()) return;
    setScanning(true); setInfo(null); setError('');
    try {
      const r = await api.scan(contract.trim(), network);
      setInfo(r);
      if (r.price_native && r.price_native !== '0.000000') setValue(r.price_native);
      if (r.on_chain_start_time_ms) setMintTimeMs(r.on_chain_start_time_ms);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally { setScanning(false); }
  }, [contract, network]);

  function applyTimeInput() {
    const n = Number(timeInput);
    if (!isNaN(n) && n > 1e12) { setMintTimeMs(n); return; }
    const dt = new Date(timeInput);
    if (!isNaN(dt.getTime())) { setMintTimeMs(dt.getTime()); return; }
    setError('Cannot parse time. Use an ISO datetime or a unix millisecond timestamp.');
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <PageHeader
        title="Drop Scheduler"
        subtitle="Stage a block-accurate mint trigger. Firing is handled by the bot engine after your final approval."
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
                <Button variant="ghost" onClick={doScan} disabled={scanning || !contract.trim()}>
                  <IconSearch size={14} />
                  <span>{scanning ? '…' : 'Scan'}</span>
                </Button>
              </div>
            </Field>

            <Field label="Mint Trigger Time (UTC)">
              {mintTimeMs ? (
                <div style={{ background: 'var(--mb-raised)', border: '1px solid var(--mb-border)', borderRadius: 10, padding: 14 }}>
                  <div style={{ color: 'var(--mb-gold)', fontSize: 26, fontWeight: 700, fontFamily: 'var(--mb-font-mono)', letterSpacing: '0.04em' }}>
                    {countdown}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--mb-muted)', marginTop: 4 }}>{new Date(mintTimeMs).toUTCString()}</div>
                  <Button variant="ghost" size="sm" style={{ marginTop: 10 }} onClick={() => setMintTimeMs(undefined)}>
                    Change Time
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="mb-input"
                    value={timeInput}
                    onChange={e => setTimeInput(e.target.value)}
                    placeholder="e.g. 2026-09-12T16:00:00Z or unix ms"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <Button variant="ghost" onClick={applyTimeInput} disabled={!timeInput.trim()}>Set</Button>
                </div>
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Quantity">
                <input className="mb-input" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
              </Field>
              <Field label="Value (ETH)">
                <input className="mb-input" value={value} onChange={e => setValue(e.target.value)} placeholder="0.05" />
              </Field>
            </div>

            {error && <Alert kind="error">{error}</Alert>}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--mb-text)', marginBottom: 8 }}>Arming the trigger</div>
            <p style={{ fontSize: 12.5, color: 'var(--mb-muted)', lineHeight: 1.65, margin: '0 0 14px' }}>
              Armed schedules live on the bot engine and require a private key that the website never touches.
              Confirm the details above, then arm the trigger with <span className="mb-mono">/schedule</span> in Telegram
              or <span className="mb-mono">mintobaby schedule</span> in the Terminal.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => nav('/telegram-guide')}><IconTelegram size={14} /> Arm via Telegram</Button>
              <Button variant="ghost" onClick={() => nav('/terminal-guide')}>Arm via Terminal</Button>
              <Button variant="ghost" onClick={() => nav('/schedules')}><IconList size={14} /> View Schedules</Button>
            </div>
          </Card>
        </div>

        <div>
          {info ? (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: 'var(--mb-text)', fontSize: 14 }}>
                  {info.name ?? 'Unknown'} {info.symbol && <span style={{ color: 'var(--mb-muted)', fontWeight: 400 }}>({info.symbol})</span>}
                </div>
                <StatusBadge status={info.phase_status} />
              </div>
              <div className="mb-kv"><span className="mb-kv-key">Price</span><span className="mb-kv-val">{info.price_native} ETH</span></div>
              <div className="mb-kv"><span className="mb-kv-key">Phase</span><span className="mb-kv-val">{info.phase_kind}</span></div>
              <div className="mb-kv"><span className="mb-kv-key">Max / wallet</span><span className="mb-kv-val">{info.max_per_wallet ?? 'Unlimited'}</span></div>
              <div className="mb-kv">
                <span className="mb-kv-key">On-chain open</span>
                <span className="mb-kv-val">{info.on_chain_start_time_ms ? new Date(info.on_chain_start_time_ms).toUTCString() : 'Unknown'}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <Alert kind="info">
                  {info.on_chain_start_time_ms
                    ? 'Trigger time prefilled from the on-chain start. Arrive a few seconds early — gas and mempool propagation are not instant.'
                    : 'No on-chain start time found. Set the trigger manually and double-check the official drop announcement.'}
                </Alert>
              </div>
            </Card>
          ) : (
            <Card><div className="mb-empty">Scan a contract to pull its phase timing into the scheduler.</div></Card>
          )}
        </div>
      </div>
    </div>
  );
}

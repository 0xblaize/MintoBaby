import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { DiscoveryResult, ScheduledMint } from '../types';

const inp: React.CSSProperties = {
  background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8,
  padding: '12px 16px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%',
};
const label: React.CSSProperties = { fontSize: 12, color: '#555', marginBottom: 6, display: 'block' };
const field = (extra?: object): React.CSSProperties => ({ marginBottom: 16, ...extra });
const btn = (color = '#00ff88', disabled = false): React.CSSProperties => ({
  background: 'transparent', border: `1px solid ${disabled ? '#333' : color}`, borderRadius: 8,
  padding: '12px 24px', color: disabled ? '#555' : color,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
});

function useCountdown(targetMs?: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!targetMs) return;
    const tick = () => setRemaining(Math.max(0, (targetMs - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [targetMs]);
  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = Math.floor(remaining % 60);
  const ms = Math.floor((remaining % 1) * 10);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms}`;
}

export default function SchedulePage() {
  const loc   = useLocation();
  const nav   = useNavigate();
  const state = loc.state as { contract?: string; price?: string; mintTimeMs?: number } | null;

  const [contract,  setContract]  = useState(state?.contract ?? '');
  const [qty,       setQty]       = useState('1');
  const [value,     setValue]     = useState(state?.price ?? '0');
  const [pk,        setPk]        = useState('');
  const [mintTimeMs, setMintTimeMs] = useState<number | undefined>(state?.mintTimeMs);
  const [timeInput, setTimeInput] = useState('');
  const [scanning,  setScanning]  = useState(false);
  const [arming,    setArming]    = useState(false);
  const [info,      setInfo]      = useState<DiscoveryResult | null>(null);
  const [armed,     setArmed]     = useState<ScheduledMint | null>(null);
  const [error,     setError]     = useState('');

  const countdown = useCountdown(mintTimeMs);

  const doScan = useCallback(async () => {
    if (!contract.trim()) return;
    setScanning(true); setInfo(null); setError('');
    try {
      const r = await api.scan(contract.trim());
      setInfo(r);
      if (r.price_eth && r.price_eth !== '0.000000') setValue(r.price_eth);
      if (r.on_chain_start_time_ms) setMintTimeMs(r.on_chain_start_time_ms);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally { setScanning(false); }
  }, [contract]);

  function applyTimeInput() {
    try {
      const n = Number(timeInput);
      if (!isNaN(n) && n > 1e12) { setMintTimeMs(n); return; }
      const dt = new Date(timeInput);
      if (!isNaN(dt.getTime())) { setMintTimeMs(dt.getTime()); return; }
      setError('Cannot parse time. Use ISO datetime or unix ms.');
    } catch { setError('Invalid time format.'); }
  }

  async function doArm() {
    if (!contract || !pk || !mintTimeMs) {
      setError('Contract, private key, and mint time are required.');
      return;
    }
    setArming(true); setError('');
    try {
      const r = await api.scheduleMint(contract.trim(), parseInt(qty), value, pk.trim(), mintTimeMs);
      setArmed(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scheduling failed');
    } finally { setArming(false); }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>⏰ Schedule Mint</h1>

      {armed ? (
        <div style={{ background: '#0d1f0d', border: '1px solid #00ff88', borderRadius: 12, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#00ff88', marginBottom: 8 }}>✅ Sniper Armed!</div>
          <div style={{ color: '#888', marginBottom: 16 }}>Schedule ID: <code style={{ color: '#e0e0ff' }}>{armed.id}</code></div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#ffd700', fontFamily: 'monospace', marginBottom: 16 }}>
            {countdown}
          </div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
            Contract: {armed.contract}<br />
            Qty: {armed.quantity} · Value: {armed.value_eth} ETH
          </div>
          <button style={btn()} onClick={() => nav('/schedules')}>View All Schedules</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <div style={field()}>
              <label style={label}>Contract Address</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={inp} value={contract} onChange={e => setContract(e.target.value)} placeholder="0x..." />
                <button style={{ ...btn('#888'), whiteSpace: 'nowrap' }} onClick={doScan} disabled={scanning}>
                  {scanning ? '…' : 'Scan'}
                </button>
              </div>
            </div>

            {/* Mint time */}
            <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <label style={label}>Mint Time</label>
              {mintTimeMs ? (
                <div>
                  <div style={{ color: '#ffd700', fontSize: 28, fontWeight: 700, fontFamily: 'monospace' }}>{countdown}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{new Date(mintTimeMs).toUTCString()}</div>
                  <button onClick={() => setMintTimeMs(undefined)} style={{ ...btn('#555'), padding: '4px 10px', fontSize: 12, marginTop: 8 }}>Change</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1 }} value={timeInput} onChange={e => setTimeInput(e.target.value)}
                    placeholder="ISO datetime or unix ms" />
                  <button style={{ ...btn('#ffd700'), whiteSpace: 'nowrap' }} onClick={applyTimeInput}>Set</button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={field()}>
                <label style={label}>Quantity</label>
                <input style={inp} type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
              </div>
              <div style={field()}>
                <label style={label}>Value (ETH)</label>
                <input style={inp} value={value} onChange={e => setValue(e.target.value)} placeholder="0.05" />
              </div>
            </div>
            <div style={field()}>
              <label style={label}>Private Key <span style={{ color: '#ff4444' }}>*</span></label>
              <input style={inp} type="password" value={pk} onChange={e => setPk(e.target.value)} placeholder="0x..." />
            </div>
            {error && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <button style={btn('#00ff88', arming || !contract || !pk || !mintTimeMs)}
              onClick={doArm} disabled={arming || !contract || !pk || !mintTimeMs}>
              {arming ? '⏳ Arming…' : '🎯 Arm Sniper'}
            </button>
          </div>

          {info && (
            <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 20, height: 'fit-content' }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>{info.name ?? 'Unknown'} {info.symbol && `(${info.symbol})`}</div>
              {[
                ['Price',        `${info.price_eth} ETH`],
                ['Phase',        info.phase_status],
                ['Kind',         info.phase_kind],
                ['Max/Wallet',   info.max_per_wallet ? String(info.max_per_wallet) : 'Unlimited'],
                ['On-chain open', info.on_chain_start_time_ms ? new Date(info.on_chain_start_time_ms).toUTCString() : 'Unknown'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: '#555' }}>{k}</span>
                  <span style={{ color: '#e0e0ff' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

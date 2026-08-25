import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ScheduledMint } from '../types';
import { StatusBadge } from '../components/StatusBadge';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

function Countdown({ ms }: { ms: number }) {
  const [rem, setRem] = useState(Math.max(0, (ms - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setRem(Math.max(0, (ms - Date.now()) / 1000)), 500);
    return () => clearInterval(id);
  }, [ms]);
  if (rem <= 0) return <span style={{ color: '#00ff88' }}>NOW</span>;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = Math.floor(rem % 60);
  return <span style={{ fontFamily: 'monospace', color: '#ffd700' }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setSchedules(await api.getSchedules()); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);

  async function cancel(id: string) {
    setCancelling(id);
    try { await api.cancelSchedule(id); await load(); }
    catch { /* ignore */ }
    finally { setCancelling(null); }
  }

  const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #2a2a3a' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #1a1a2a', color: '#e0e0ff' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>📋 Active Schedules</h1>
        <button onClick={load} style={{ background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 8, padding: '8px 16px', color: '#888', cursor: 'pointer', fontSize: 13 }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#555' }}>Loading…</div>
      ) : schedules.length === 0 ? (
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏰</div>
          <div style={{ color: '#555', marginBottom: 16 }}>No active schedules.</div>
          <a href="/schedule" style={{ color: '#00ff88', fontSize: 14 }}>Set one up →</a>
        </div>
      ) : (
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Contract', 'Qty', 'ETH', 'Mint Time', 'Countdown', 'Status', 'TX', 'Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{s.contract.slice(0, 10)}…</span></td>
                  <td style={td}>{s.quantity}</td>
                  <td style={td}>{s.value_eth}</td>
                  <td style={{ ...td, fontSize: 11 }}>{new Date(s.mint_time_ms).toUTCString()}</td>
                  <td style={td}><Countdown ms={s.mint_time_ms} /></td>
                  <td style={td}><StatusBadge status={s.status} /></td>
                  <td style={td}>
                    {s.tx_hash
                      ? <a href={`${EXPLORER}/tx/${s.tx_hash}`} target="_blank" rel="noreferrer"
                           style={{ color: '#00ff88', fontSize: 11 }}>View ↗</a>
                      : <span style={{ color: '#555' }}>—</span>}
                  </td>
                  <td style={td}>
                    {(s.status === 'armed') && (
                      <button
                        onClick={() => cancel(s.id)}
                        disabled={cancelling === s.id}
                        style={{ background: 'transparent', border: '1px solid #ff4444', borderRadius: 6, padding: '4px 10px', color: '#ff4444', cursor: 'pointer', fontSize: 12 }}
                      >
                        {cancelling === s.id ? '…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

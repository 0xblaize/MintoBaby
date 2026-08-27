import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { ScheduledMint } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { IconList, IconRefresh, IconClock, IconArrowRight, IconExternalLink } from '../components/Icons';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

function Countdown({ ms }: { ms: number }) {
  const [rem, setRem] = useState(Math.max(0, (ms - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setRem(Math.max(0, (ms - Date.now()) / 1000)), 500);
    return () => clearInterval(id);
  }, [ms]);
  if (rem <= 0) return <span style={{ color: '#00ff88', fontWeight: 800 }}>FIRING NOW</span>;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = Math.floor(rem % 60);
  return <span style={{ fontFamily: 'monospace', color: '#ffd700', fontWeight: 700 }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [loading, setLoading] = useState(true);
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

  const th: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#827e99', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' };
  const td: React.CSSProperties = { padding: '14px 16px', fontSize: 13, borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#ffffff' };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconList size={24} color="#ffd700" />
          <span>Active Drop Schedules</span>
        </h1>
        <button
          onClick={load}
          style={{
            background: '#12111a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#ffffff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <IconRefresh size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#827e99' }}>Loading schedules…</div>
      ) : schedules.length === 0 ? (
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 215, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ffd700' }}>
            <IconClock size={24} />
          </div>
          <div style={{ color: '#827e99', marginBottom: 16, fontSize: 14 }}>No active drop schedules currently armed.</div>
          <a href="/schedule" style={{ color: '#00ff88', fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <span>Schedule a drop now</span>
            <IconArrowRight size={14} />
          </a>
        </div>
      ) : (
        <div style={{ background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#181724' }}>
                {['Contract', 'Qty', 'ETH', 'Mint Time', 'Countdown', 'Status', 'TX', 'Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#00ff88' }}>{s.contract.slice(0, 12)}…</span></td>
                  <td style={td}>{s.quantity}</td>
                  <td style={td}>{s.value_eth}</td>
                  <td style={{ ...td, fontSize: 11, color: '#827e99' }}>{new Date(s.mint_time_ms).toUTCString()}</td>
                  <td style={td}><Countdown ms={s.mint_time_ms} /></td>
                  <td style={td}><StatusBadge status={s.status} /></td>
                  <td style={td}>
                    {s.tx_hash
                      ? <a href={`${EXPLORER}/tx/${s.tx_hash}`} target="_blank" rel="noreferrer"
                           style={{ color: '#00ff88', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                             <span>View</span>
                             <IconExternalLink size={12} />
                         </a>
                      : <span style={{ color: '#827e99' }}>—</span>}
                  </td>
                  <td style={td}>
                    {(s.status === 'armed') && (
                      <button
                        onClick={() => cancel(s.id)}
                        disabled={cancelling === s.id}
                        style={{ background: 'transparent', border: '1px solid #ff4444', borderRadius: 6, padding: '4px 10px', color: '#ff4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
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

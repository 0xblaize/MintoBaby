import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Button, Card, EmptyState, PageHeader, StatusBadge } from '../components/ui';
import { IconClock, IconExternalLink, IconList, IconRefresh } from '../components/Icons';
import { EXPLORERS, type NetworkType, type ScheduledMint } from '../types';

function Countdown({ ms }: { ms: number }) {
  const [rem, setRem] = useState(Math.max(0, (ms - Date.now()) / 1000));
  useEffect(() => {
    const id = setInterval(() => setRem(Math.max(0, (ms - Date.now()) / 1000)), 500);
    return () => clearInterval(id);
  }, [ms]);
  if (rem <= 0) return <span style={{ color: 'var(--mb-green)', fontWeight: 700 }}>Firing / Done</span>;
  const h = Math.floor(rem / 3600);
  const m = Math.floor((rem % 3600) / 60);
  const s = Math.floor(rem % 60);
  return <span className="mb-mono" style={{ color: 'var(--mb-gold)', fontWeight: 600 }}>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledMint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSchedules(await api.getSchedules());
      setLoadError('');
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Unable to load schedules from the engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  async function cancel(id: string) {
    setCancelling(id);
    try { await api.cancelSchedule(id); await load(); }
    catch { /* surfaced on next load */ }
    finally { setCancelling(null); }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Active Drop Schedules"
        subtitle="Triggers armed on the bot engine — refreshed every 5 seconds"
        actions={
          <>
            <Button variant="ghost" onClick={() => { setLoading(true); load(); }}>
              <IconRefresh size={14} /> Refresh
            </Button>
            <Button onClick={() => window.location.assign('/schedule')}>
              <IconClock size={14} /> New Schedule
            </Button>
          </>
        }
      />

      {loadError && <div style={{ marginBottom: 16 }}><Card><div style={{ fontSize: 12.5, color: 'var(--mb-red)' }}>{loadError}</div></Card></div>}

      {loading ? (
        <Card><div className="mb-empty">Loading schedules…</div></Card>
      ) : schedules.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconList size={20} />}
            title="No schedules on the engine"
            hint="Arm a drop through the Telegram bot or Terminal CLI, then manage it from here."
          />
        </Card>
      ) : (
        <Card pad={false} style={{ overflow: 'hidden' }}>
          <table className="mb-table">
            <thead>
              <tr>
                <th>Contract</th><th>Chain</th><th>Qty</th><th>Value</th><th>Trigger (UTC)</th><th>Countdown</th><th>Status</th><th>TX</th><th />
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => {
                const network = (s.network ?? 'robinhood') as NetworkType;
                return (
                  <tr key={s.id}>
                    <td><span className="mb-mono" style={{ fontSize: 12 }}>{s.contract.slice(0, 10)}…{s.contract.slice(-4)}</span></td>
                    <td><span className="mb-badge mb-badge-gray">{network}</span></td>
                    <td>{s.quantity}</td>
                    <td>{s.value_native ?? '0'}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--mb-muted)' }}>{new Date(s.mint_time_ms).toUTCString()}</td>
                    <td><Countdown ms={s.mint_time_ms} /></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      {s.tx_hash ? (
                        <a href={`${EXPLORERS[network]}/tx/${s.tx_hash}`} target="_blank" rel="noreferrer" className="mb-link" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          View <IconExternalLink size={11} />
                        </a>
                      ) : <span style={{ color: 'var(--mb-muted)' }}>—</span>}
                    </td>
                    <td>
                      {s.status === 'armed' && (
                        <Button variant="danger" size="sm" onClick={() => cancel(s.id)} disabled={cancelling === s.id}>
                          {cancelling === s.id ? '…' : 'Cancel'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

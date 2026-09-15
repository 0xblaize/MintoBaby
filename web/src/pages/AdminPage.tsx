import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAdminToken } from '../api';
import type { AdminKey, AdminUser } from '../api';
import { getStoredUser } from '../utils/activation';
import { Alert, Button, Card, CopyChip, Field, PageHeader, StatusBadge } from '../components/ui';

type Tab = 'keys' | 'users';

export default function AdminPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [tab, setTab] = useState<Tab>('keys');
  const [keys, setKeys] = useState<AdminKey[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState('1');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [justCreated, setJustCreated] = useState<AdminKey[]>([]);

  const load = useCallback(async () => {
    if (!getAdminToken()) return;
    try {
      const [keyRes, userRes] = await Promise.all([api.adminKeys(), api.adminUsers()]);
      setKeys(keyRes.keys);
      setUsers(userRes.users);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Admin API unreachable');
    }
  }, []);

  useEffect(() => {
    if (!user?.isAdmin || !getAdminToken()) {
      navigate('/login', { replace: true });
      return;
    }
    void load();
  }, [user, navigate, load]);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await api.adminGenerateKeys(Math.min(Math.max(parseInt(count, 10) || 1, 1), 100), email.trim() || undefined, note.trim() || undefined);
      setJustCreated(res.created);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleKey(code: string, active: boolean) {
    try {
      await api.adminSetKeyActive(code, active);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function removeKey(code: string) {
    if (!window.confirm(`Delete ${code}? This cannot be undone.`)) return;
    try {
      await api.adminDeleteKey(code);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  const activeKeys = keys.filter(k => k.active).length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Admin Console"
        subtitle="Issue activation keys, manage access, and review paired accounts"
        actions={<Button variant="ghost" onClick={() => void load()}>Refresh</Button>}
      />

      {error && <Alert kind="error">{error}</Alert>}

      <div style={{ display: 'flex', gap: 8, margin: '14px 0 18px' }}>
        <Button variant={tab === 'keys' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('keys')}>Activation Keys ({activeKeys}/{keys.length})</Button>
        <Button variant={tab === 'users' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('users')}>Users ({users.length})</Button>
      </div>

      {tab === 'keys' && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, marginBottom: 12, color: 'var(--mb-text)' }}>Generate new keys</div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <Field label="Count">
                <input className="mb-input" type="number" min={1} max={100} value={count} onChange={e => setCount(e.target.value)} />
              </Field>
              <Field label="Assign email (optional)">
                <input className="mb-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
              </Field>
              <Field label="Note (optional)">
                <input className="mb-input" value={note} onChange={e => setNote(e.target.value)} placeholder="TG user @handle, order id…" />
              </Field>
              <Button onClick={() => void generate()} disabled={busy}>{busy ? '…' : 'Generate'}</Button>
            </div>
            {justCreated.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--mb-green)', fontWeight: 650, marginBottom: 8 }}>✓ {justCreated.length} key(s) issued — send them to your customers now:</div>
                {justCreated.map(k => <div key={k.code} style={{ marginBottom: 6 }}><CopyChip text={k.code} /></div>)}
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 13.5, fontWeight: 650, marginBottom: 12, color: 'var(--mb-text)' }}>All issued keys</div>
            {keys.length === 0 ? (
              <div className="mb-empty">No activation keys yet. Generate one above and hand it to a Telegram or terminal customer.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="mb-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--mb-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>Key</th>
                      <th style={{ padding: '8px 10px' }}>Email / Note</th>
                      <th style={{ padding: '8px 10px' }}>Status</th>
                      <th style={{ padding: '8px 10px' }}>TG</th>
                      <th style={{ padding: '8px 10px' }}>CLI</th>
                      <th style={{ padding: '8px 10px' }}>Issued</th>
                      <th style={{ padding: '8px 10px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map(k => (
                      <tr key={k.code} style={{ borderTop: '1px solid var(--mb-border)' }}>
                        <td style={{ padding: '8px 10px' }}><span className="mb-mono">{k.code}</span></td>
                        <td style={{ padding: '8px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.email ?? '—'}{k.note ? <span style={{ color: 'var(--mb-muted)' }}> · {k.note}</span> : null}</td>
                        <td style={{ padding: '8px 10px' }}><StatusBadge status={k.active ? 'known' : 'expired'} /></td>
                        <td style={{ padding: '8px 10px' }}>{k.telegram_paired ? '✓' : '—'}</td>
                        <td style={{ padding: '8px 10px' }}>{k.cli_paired ? '✓' : '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--mb-muted)' }}>{k.activated_at ? k.activated_at.slice(0, 10) : '—'}</td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <Button size="sm" variant="ghost" onClick={() => void toggleKey(k.code, !k.active)}>{k.active ? 'Revoke' : 'Reactivate'}</Button>
                          {' '}
                          <Button size="sm" variant="danger" onClick={() => void removeKey(k.code)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'users' && (
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 650, marginBottom: 12, color: 'var(--mb-text)' }}>Registered accounts</div>
          {users.length === 0 ? (
            <div className="mb-empty">No accounts have signed in yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="mb-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--mb-muted)' }}>
                    <th style={{ padding: '8px 10px' }}>Email</th>
                    <th style={{ padding: '8px 10px' }}>Activation Code</th>
                    <th style={{ padding: '8px 10px' }}>Plan</th>
                    <th style={{ padding: '8px 10px' }}>TG</th>
                    <th style={{ padding: '8px 10px' }}>CLI</th>
                    <th style={{ padding: '8px 10px' }}>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.sub} style={{ borderTop: '1px solid var(--mb-border)' }}>
                      <td style={{ padding: '8px 10px' }}>{u.email}<div style={{ color: 'var(--mb-muted)', fontSize: 11 }}>{u.name}</div></td>
                      <td style={{ padding: '8px 10px' }}><span className="mb-mono" style={{ fontSize: 11.5 }}>{u.activation_code ?? '—'}</span></td>
                      <td style={{ padding: '8px 10px' }}>
                        {u.subscription?.active
                          ? <span className="mb-badge mb-badge-green">{u.subscription.plan} · {u.subscription.billingCycle}</span>
                          : <span className="mb-badge mb-badge-gray">free</span>}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{u.telegram_paired ? '✓' : '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{u.cli_paired ? '✓' : '—'}</td>
                      <td style={{ padding: '8px 10px', color: 'var(--mb-muted)' }}>{u.last_login ? u.last_login.slice(0, 16).replace('T', ' ') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

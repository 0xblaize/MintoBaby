import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getActivationCode, getStoredUser, storeSubscriptionActive } from '../utils/activation';
import { Alert, Button, Card, CopyChip, PageHeader, StatusBadge } from '../components/ui';
import { IconDashboard, IconKey, IconTelegram, IconTerminal } from '../components/Icons';

type PairState = 'checking' | 'paired' | 'unpaired' | 'offline';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const code = getActivationCode();
  const paid = storeSubscriptionActive();
  const [pair, setPair] = useState<PairState>(code ? 'checking' : 'unpaired');

  useEffect(() => {
    if (!code) return;
    let alive = true;
    api.verifyKey(code)
      .then(r => { if (alive) setPair(r.valid ? 'paired' : 'unpaired'); })
      .catch(() => { if (alive) setPair('offline'); });
    return () => { alive = false; };
  }, [code]);

  const pairBadge = (label: string) => {
    if (!code) return <StatusBadge status="unavailable" />;
    if (pair === 'checking') return <StatusBadge status="unknown" />;
    if (pair === 'offline') return <StatusBadge status="unavailable" />;
    return <StatusBadge status={pair === 'paired' ? 'known' : 'not_open'} />;
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <PageHeader title="Profile & Key" subtitle="Account details, activation key, and service pairing" />

      <Card style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        {user?.picture
          ? <img src={user.picture} alt="" style={{ width: 54, height: 54, borderRadius: '50%', border: '2px solid var(--mb-violet)' }} />
          : (
            <div style={{
              width: 54, height: 54, borderRadius: '50%', background: 'var(--mb-violet)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff',
            }}>
              {(user?.name || user?.email || '?').slice(0, 1).toUpperCase()}
            </div>
          )}
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--mb-text)' }}>{user?.name || 'Signed-out guest'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--mb-muted)', marginTop: 2 }}>{user?.email ?? 'Sign in to sync your profile and key'}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className={`mb-badge ${paid ? 'mb-badge-green' : 'mb-badge-gray'}`}>{paid ? 'Subscription active' : 'No active subscription'}</span>
          {user?.isAdmin && <span className="mb-badge mb-badge-violet">Admin</span>}
        </div>
      </Card>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconKey size={17} color="var(--mb-violet)" />
          <div style={{ fontSize: 14.5, fontWeight: 650, color: 'var(--mb-text)' }}>Activation Key</div>
        </div>
        {code ? (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--mb-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
              One key pairs this account everywhere. It is issued by the backend when you sign in — keep it private.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <CopyChip text={code} style={{ fontSize: 15, padding: '10px 16px', letterSpacing: '0.08em' }} />
              <span style={{ fontSize: 11.5, color: 'var(--mb-muted)' }}>
                {pair === 'paired' ? 'Registered on the engine' : pair === 'offline' ? 'Engine offline — status unknown' : pair === 'checking' ? 'Checking…' : 'Not yet registered'}
              </span>
            </div>
          </>
        ) : (
          <Alert kind="info">
            You are browsing without an account key. <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Go to sign in</Button>
          </Alert>
        )}
      </Card>

      <div className="mb-grid mb-grid-3" style={{ alignItems: 'stretch' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 650, color: 'var(--mb-text)' }}>
              <IconDashboard size={16} color="var(--mb-violet)" /> Web Console
            </span>
            <StatusBadge status={user ? 'known' : 'unavailable'} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--mb-muted)', lineHeight: 1.6, marginBottom: 14 }}>Current browser session.</div>
          <Button block variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Open Dashboard</Button>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 650, color: 'var(--mb-text)' }}>
              <IconTelegram size={16} color="var(--mb-cyan)" /> Telegram Bot
            </span>
            {pairBadge('bot')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mb-muted)', lineHeight: 1.6, marginBottom: 14 }}>
            {code ? <>Send <span className="mb-mono">/activate {code}</span> to the bot.</> : 'Requires an activation key.'}
          </div>
          <Button block variant="ghost" size="sm" onClick={() => navigate('/telegram-guide')}>View Guide</Button>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 650, color: 'var(--mb-text)' }}>
              <IconTerminal size={16} color="var(--mb-green)" /> Terminal CLI
            </span>
            {pairBadge('cli')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--mb-muted)', lineHeight: 1.6, marginBottom: 14 }}>
            {code ? <>Run <span className="mb-mono">mintobaby login --code {code}</span></> : 'Requires an activation key.'}
          </div>
          <Button block variant="ghost" size="sm" onClick={() => navigate('/terminal-guide')}>View Guide</Button>
        </Card>
      </div>
    </div>
  );
}

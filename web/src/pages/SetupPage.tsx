import { useNavigate } from 'react-router-dom';
import { getActivationCode, getStoredUser } from '../utils/activation';
import { Alert, Button, Card, CopyChip, PageHeader } from '../components/ui';
import {
  IconDashboard,
  IconTelegram,
  IconTerminal,
  IconCheck,
  IconKey,
} from '../components/Icons';

const HUBS = [
  {
    title: 'Web Console',
    desc: 'Scan contracts, review live phases, monitor armed schedules, and connect an external wallet — without the browser ever touching a private key.',
    points: ['On-chain contract scanner', 'Schedule monitor & cancel', 'WalletConnect balance view'],
    path: '/dashboard',
    cta: 'Open Dashboard',
    tone: 'var(--mb-violet)',
    icon: <IconDashboard size={22} />,
  },
  {
    title: 'Telegram Bot',
    desc: 'Pair with your activation key to stage mints, choose quantities, approve with Confirm Auto-Mint, and get instant broadcast + receipt alerts on mobile.',
    points: ['Key-pairing with /activate', 'Approval flow before any transaction', 'Instant tx hash + explorer links'],
    path: '/telegram-guide',
    cta: 'Telegram Setup Guide',
    tone: 'var(--mb-cyan)',
    icon: <IconTelegram size={22} />,
  },
  {
    title: 'Terminal CLI',
    desc: 'A power-user tool for the same engine: wallet setup, contract scanning, scheduling, and approvals from your shell.',
    points: ['Same activation key', 'Script-friendly commands', 'Direct engine API access'],
    path: '/terminal-guide',
    cta: 'Terminal Setup Guide',
    tone: 'var(--mb-green)',
    icon: <IconTerminal size={22} />,
  },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const code = getActivationCode();
  const user = getStoredUser();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Setup Hub"
        subtitle={user?.email ? `Signed in as ${user.email}` : 'Choose where you want to operate'}
      />

      <div className="mb-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: 'var(--mb-violet-dim)',
            border: '1px solid rgba(124,90,240,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IconKey size={17} color="var(--mb-violet)" />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--mb-text)' }}>One activation key · Web, Telegram & Terminal</div>
            <div style={{ fontSize: 12, color: 'var(--mb-muted)', marginTop: 2 }}>
              Send <span className="mb-mono">/activate YOUR-KEY</span> to the bot, or run <span className="mb-mono">mintobaby login --code YOUR-KEY</span>
            </div>
          </div>
        </div>
        {code ? <CopyChip text={code} /> : <Button variant="ghost" onClick={() => navigate('/login')}>Sign in to get your key</Button>}
      </div>

      {!code && (
        <div style={{ marginBottom: 22 }}>
          <Alert kind="warn">
            No backend-issued key found in this browser session. Keys are generated when you sign in —
            codes created any other way are just random text and will not pair anything.
          </Alert>
        </div>
      )}

      <div className="mb-grid mb-grid-3" style={{ alignItems: 'stretch' }}>
        {HUBS.map(hub => (
          <Card key={hub.title} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background: `color-mix(in srgb, ${hub.tone} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${hub.tone} 30%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: hub.tone,
            }}>
              {hub.icon}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--mb-text)', fontFamily: 'var(--mb-font-head)', marginBottom: 6 }}>{hub.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--mb-muted)', lineHeight: 1.6 }}>{hub.desc}</div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {hub.points.map(p => (
                <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--mb-text-dim)' }}>
                  <IconCheck size={13} color={hub.tone} /> {p}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 'auto', paddingTop: 6 }}>
              <Button block variant="ghost" onClick={() => navigate(hub.path)}>{hub.cta}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

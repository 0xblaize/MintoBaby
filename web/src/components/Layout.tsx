import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getActivationCode, getStoredUser, hasSession, hasUnlocked } from '../utils/activation';
import { useAuth } from '../context/AuthContext';
import type { HealthResponse } from '../types';
import {
  MintoLogo,
  IconDashboard,
  IconSearch,
  IconBolt,
  IconClock,
  IconRadar,
  IconList,
  IconWallet,
  IconGlobe,
  IconTelegram,
  IconTerminal,
  IconUser,
  IconZap,
  IconShieldCheck,
} from './Icons';

const MAIN_NAV = [
  { path: '/dashboard', label: 'Overview',       icon: <IconDashboard size={16} /> },
  { path: '/scan',      label: 'Contract Scanner', icon: <IconSearch size={16} /> },
  { path: '/mint',      label: 'Direct Mint',    icon: <IconBolt size={16} /> },
  { path: '/schedule',  label: 'Drop Scheduler', icon: <IconClock size={16} /> },
  { path: '/schedules', label: 'Schedules',      icon: <IconList size={16} /> },
  { path: '/wallet',    label: 'Connected Wallet', icon: <IconWallet size={16} /> },
];

const SOON_NAV = [
  { path: '/copymint', label: 'Copy-Mint Radar', icon: <IconRadar size={16} /> },
];

const TOOLS_NAV = [
  { path: '/setup',          label: 'Setup Hub',    icon: <IconZap size={16} /> },
  { path: '/telegram-guide', label: 'Telegram Bot', icon: <IconTelegram size={16} /> },
  { path: '/terminal-guide', label: 'Terminal CLI', icon: <IconTerminal size={16} /> },
  { path: '/profile',        label: 'Profile & Key', icon: <IconUser size={16} /> },
];

const CHAIN_LABELS: Record<string, string> = {
  robinhood: 'Robinhood · 4663',
  ink: 'Ink L2 · 57073',
  solana: 'Solana SVM',
};

export function Layout() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const user = getStoredUser();
  const code = getActivationCode();
  const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest');

  useEffect(() => {
    if (!hasSession()) {
      navigate('/login', { replace: true });
    } else if (!hasUnlocked()) {
      navigate('/subscribe', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let alive = true;
    const ping = () => api.health().then(h => { if (alive) setHealth(h); }).catch(() => { if (alive) setHealth(null); });
    ping();
    const id = setInterval(ping, 20000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.startsWith('0x') && q.length >= 40) {
      navigate('/scan', { state: { contract: q } });
    }
  };

  const handleLogout = () => {
    signOut();
    localStorage.removeItem('mintobaby_subscription');
    localStorage.removeItem('mintobaby_user_activation_code');
    navigate('/login', { replace: true });
  };

  const online = health?.status === 'ok';

  return (
    <div className="mb-console">
      <header className="mb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <MintoLogo size={26} />
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--mb-text)', letterSpacing: '-0.01em', fontFamily: 'var(--mb-font-head)' }}>
              MintoBaby
            </span>
          </button>

          <form onSubmit={handleSearch} className="mb-search" style={{ marginLeft: 8 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: 11, pointerEvents: 'none' }}>
                <IconSearch size={13} color="var(--mb-muted)" />
              </span>
              <input
                ref={searchRef}
                className="mb-input"
                style={{ width: 250, paddingLeft: 34, paddingRight: 46, background: 'var(--mb-inset)' }}
                placeholder="Search 0x contract…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <kbd style={{
                position: 'absolute', right: 10, background: 'var(--mb-raised)',
                border: '1px solid var(--mb-border)', borderRadius: 4, padding: '1px 5px',
                fontSize: 10, color: 'var(--mb-muted)',
              }}>Ctrl K</kbd>
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className={`mb-badge ${online ? 'mb-badge-green' : 'mb-badge-red'}`} style={{ padding: '5px 11px' }}>
            <span className="mb-dot" style={{ background: online ? 'var(--mb-green)' : 'var(--mb-red)' }} />
            {online ? 'Engine Live' : 'Engine Offline'}
          </div>

          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, background: 'var(--mb-raised)',
              border: '1px solid var(--mb-border)', borderRadius: 9, padding: '5px 11px', cursor: 'pointer',
            }}
          >
            {user?.picture
              ? <img src={user.picture} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
              : (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--mb-violet), #b36ef5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconUser size={12} color="#fff" />
                </div>
              )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--mb-text)', lineHeight: 1.25 }}>{userName}</div>
              <div style={{ fontSize: 10, color: 'var(--mb-muted)', fontFamily: 'var(--mb-font-mono)', lineHeight: 1 }}>
                {code ? code.slice(0, 14) + '…' : 'no key issued'}
              </div>
            </div>
          </button>
        </div>
      </header>

      <div className="mb-body">
        <aside className="mb-sidebar">
          <nav style={{ flex: 1 }}>
            <div className="mb-nav-group">
              <div className="mb-nav-title">Operations</div>
              {MAIN_NAV.map(({ path, label, icon }) => (
                <NavLink key={path} to={path} end={path === '/dashboard'} className={({ isActive }) => `mb-nav-item${isActive ? ' active' : ''}`}>
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            <div className="mb-nav-group">
              <div className="mb-nav-title">In Development</div>
              {SOON_NAV.map(({ path, label, icon }) => (
                <NavLink key={path} to={path} className={({ isActive }) => `mb-nav-item${isActive ? ' active' : ''}`}>
                  {icon}
                  <span style={{ flex: 1 }}>{label}</span>
                  <span className="mb-badge mb-badge-gold" style={{ fontSize: 9, padding: '1px 6px' }}>soon</span>
                </NavLink>
              ))}
            </div>

            <div className="mb-nav-group">
              <div className="mb-nav-title">Tools & Setup</div>
              {TOOLS_NAV.map(({ path, label, icon }) => (
                <NavLink key={path} to={path} className={({ isActive }) => `mb-nav-item${isActive ? ' active' : ''}`}>
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <div style={{ borderTop: '1px solid var(--mb-border)', paddingTop: 10 }}>
            {online && health && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 10px 12px' }}>
                {health.networks.map(n => (
                  <span key={n} className="mb-badge mb-badge-gray" style={{ fontSize: 9.5 }}>
                    <span className="mb-dot" style={{ background: 'var(--mb-green)' }} />
                    {CHAIN_LABELS[n] ?? n}
                  </span>
                ))}
              </div>
            )}
            <NavLink to="/" className="mb-nav-item">
              <IconGlobe size={16} />
              <span style={{ flex: 1 }}>Back to site</span>
            </NavLink>
            <button onClick={handleLogout} className="mb-nav-item" style={{ width: '100%', background: 'none', cursor: 'pointer', border: 'none', font: 'inherit' }}>
              <IconShieldCheck size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="mb-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

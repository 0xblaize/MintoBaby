import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';

const NAV: { path: string; label: string; icon: string }[] = [
  { path: '/',          label: 'Dashboard',    icon: '📊' },
  { path: '/scan',      label: 'Scan',         icon: '🔍' },
  { path: '/mint',      label: 'Mint Now',     icon: '⚡' },
  { path: '/schedule',  label: 'Schedule',     icon: '⏰' },
  { path: '/copymint',  label: 'Copy-Mint',    icon: '📡' },
  { path: '/schedules', label: 'Schedules',    icon: '📋' },
  { path: '/wallet',    label: 'Wallet',       icon: '💳' },
  { path: '/landing',   label: 'Landing Page', icon: '🍷' },
];

const S = {
  layout:  { display: 'flex', minHeight: '100vh', background: '#0f0f13' } as const,
  sidebar: { width: 220, background: '#12121a', borderRight: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column' as const, padding: '24px 0' },
  logo:    { padding: '0 20px 24px', borderBottom: '1px solid #2a2a3a', marginBottom: 16 },
  logoTxt: { fontSize: 20, fontWeight: 700, color: '#00ff88' },
  logoSub: { fontSize: 11, color: '#555', marginTop: 2 },
  nav:     { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, padding: '0 8px' },
  link:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, color: '#888', textDecoration: 'none', fontSize: 14, transition: 'all 0.15s' },
  status:  { padding: '16px 20px', borderTop: '1px solid #2a2a3a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#555' },
  dot:     (ok: boolean) => ({ width: 8, height: 8, borderRadius: '50%', background: ok ? '#00ff88' : '#ff4444' }),
  main:    { flex: 1, overflow: 'auto', padding: 32 },
};

export function Layout() {
  const [apiOk, setApiOk] = useState(false);

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    const id = setInterval(() => {
      api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={S.layout}>
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoTxt}>⚡ MintoBaby</div>
          <div style={S.logoSub}>Matrix · Robinhood | Ink | Solana</div>
        </div>
        <nav style={S.nav}>
          {NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              style={({ isActive }) => ({
                ...S.link,
                background: isActive ? '#1a2a1a' : 'transparent',
                color:      isActive ? '#00ff88' : '#888',
              })}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={S.status}>
          <div style={S.dot(apiOk)} />
          <span>{apiOk ? 'API Connected' : 'API Offline'}</span>
        </div>
      </aside>
      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  );
}

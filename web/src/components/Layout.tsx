import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import {
  IconDashboard, IconSearch, IconBolt, IconClock,
  IconRadar, IconList, IconWallet, IconGlobe
} from './Icons';

const NAV: { path: string; label: string; icon: React.ReactNode }[] = [
  { path: '/dashboard', label: 'Dashboard',    icon: <IconDashboard size={16} /> },
  { path: '/scan',      label: 'Scan',         icon: <IconSearch size={16} /> },
  { path: '/mint',      label: 'Mint Now',     icon: <IconBolt size={16} /> },
  { path: '/schedule',  label: 'Schedule',     icon: <IconClock size={16} /> },
  { path: '/copymint',  label: 'Copy-Mint',    icon: <IconRadar size={16} /> },
  { path: '/schedules', label: 'Schedules',    icon: <IconList size={16} /> },
  { path: '/wallet',    label: 'Wallet',       icon: <IconWallet size={16} /> },
  { path: '/',          label: 'MintoBaby Home', icon: <IconGlobe size={16} /> },
];

const S = {
  layout:  { display: 'flex', minHeight: '100vh', background: '#070204' } as const,
  sidebar: { width: 230, background: '#120508', borderRight: '1px solid #290b12', display: 'flex', flexDirection: 'column' as const, padding: '24px 0' },
  logo:    { padding: '0 20px 24px', borderBottom: '1px solid #290b12', marginBottom: 16 },
  logoTxt: { fontSize: 18, fontWeight: 900, color: '#f8ecee', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 },
  nav:     { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 2, padding: '0 10px' },
  link:    { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, color: '#a8858e', textDecoration: 'none', fontSize: 13, fontWeight: 600, transition: 'all 0.15s' },
  status:  { padding: '16px 20px', borderTop: '1px solid #290b12', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6e5057' },
  dot:     (ok: boolean) => ({ width: 8, height: 8, borderRadius: '50%', background: ok ? '#00ff88' : '#ff4444', boxShadow: ok ? '0 0 10px #00ff88' : 'none' }),
  main:    { flex: 1, overflow: 'auto', padding: 36, background: '#070204' },
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
          <div style={S.logoTxt}>
            <IconBolt size={20} color="#ff2a5f" /> MINTOBABY
          </div>
          <div style={{ fontSize: 10, color: '#6b3ce8', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>MATRIX ENGINE v2.0</div>
        </div>
        <nav style={S.nav}>
          {NAV.map(({ path, label, icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/dashboard'}
              style={({ isActive }) => ({
                ...S.link,
                background: isActive ? '#290b12' : 'transparent',
                color:      isActive ? '#ff2a5f' : '#a8858e',
                borderLeft: isActive ? '3px solid #ff2a5f' : '3px solid transparent',
              })}
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={S.status}>
          <div style={S.dot(apiOk)} />
          <span>{apiOk ? 'API Matrix Connected' : 'API Standby'}</span>
        </div>
      </aside>
      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  );
}

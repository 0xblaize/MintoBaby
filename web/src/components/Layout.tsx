import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getUserActivationCode } from '../utils/activation';
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
  IconKey,
  IconZap,
  IconChevronRight,
  IconBell,
  IconShieldCheck
} from './Icons';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0d12',
  surface:   '#13121a',
  surface2:  '#1a1925',
  border:    '#2a2840',
  border2:   '#1f1e2e',
  muted:     '#6b6887',
  subtle:    '#3d3b52',
  text:      '#e8e6f0',
  textDim:   '#9896b0',
  purple:    '#7c5af0',
  purpleGlow:'rgba(124,90,240,0.18)',
  green:     '#22d87a',
  greenGlow: 'rgba(34,216,122,0.14)',
  cyan:      '#22c7e8',
  cyanGlow:  'rgba(34,199,232,0.14)',
  violet:    '#b36ef5',
  gold:      '#f0b429',
  red:       '#f55050',
};

const MAIN_NAV = [
  { path: '/dashboard',  label: 'Overview',         icon: <IconDashboard size={16} /> },
  { path: '/scan',       label: 'Contract Scanner', icon: <IconSearch size={16} /> },
  { path: '/mint',       label: 'Direct Mint',      icon: <IconBolt size={16} /> },
  { path: '/schedule',   label: 'Drop Scheduler',   icon: <IconClock size={16} /> },
  { path: '/schedules',  label: 'Schedules',        icon: <IconList size={16} /> },
  { path: '/copymint',   label: 'Copy-Mint Radar',  icon: <IconRadar size={16} /> },
  { path: '/wallet',     label: 'Wallet Vault',     icon: <IconWallet size={16} /> },
];

const TOOLS_NAV = [
  { path: '/setup',          label: 'Setup Hub',      icon: <IconZap size={16} />,      accent: C.green  },
  { path: '/telegram-guide', label: 'Telegram Bot',   icon: <IconTelegram size={16} />, accent: C.cyan   },
  { path: '/terminal-guide', label: 'Terminal CLI',   icon: <IconTerminal size={16} />, accent: C.violet },
  { path: '/profile',        label: 'Profile & Key',  icon: <IconUser size={16} />,     accent: C.purple },
];

export function Layout() {
  const navigate = useNavigate();
  const [apiOk, setApiOk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const activationCode = getUserActivationCode();
  const shortCode = activationCode.slice(0, 14) + '…';

  useEffect(() => {
    const isAuthorized =
      localStorage.getItem('mintobaby_user_logged_in') === 'true' ||
      Boolean(localStorage.getItem('mintobaby_subscription')) ||
      Boolean(localStorage.getItem('mintobaby_session'));

    if (!isAuthorized) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    const id = setInterval(() => {
      api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().startsWith('0x')) {
      navigate('/scan', { state: { contract: searchQuery.trim() } });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
      fontSize: 14,
    }}>

      {/* ══════════════════════════════════════════
          TOP NAV BAR
      ══════════════════════════════════════════ */}
      <header style={{
        height: 56,
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 200,
        flexShrink: 0,
      }}>

        {/* LEFT: Logo + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {/* Brand */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 16px 0 0',
              marginRight: 4,
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <MintoLogo size={28} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              MintoBaby
            </span>
          </button>

          {/* Search bar */}
          <form onSubmit={handleSearch} style={{ marginLeft: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: searchFocused ? C.surface2 : C.bg,
              border: `1px solid ${searchFocused ? C.purple : C.border}`,
              borderRadius: 8,
              padding: '7px 12px',
              width: 240,
              transition: 'all 0.15s ease',
              boxShadow: searchFocused ? `0 0 0 3px ${C.purpleGlow}` : 'none',
            }}>
              <IconSearch size={13} color={C.muted} />
              <input
                type="text"
                placeholder="Search 0x contract..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: C.text, fontSize: 13, width: '100%', lineHeight: 1,
                }}
              />
              <kbd style={{
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 4, padding: '1px 5px', fontSize: 10,
                color: C.muted, fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>⌘K</kbd>
            </div>
          </form>
        </div>

        {/* CENTER: Network status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { label: 'Robinhood · 4663', dot: C.green },
            { label: 'Ink L2 · 57073',  dot: C.cyan  },
            { label: 'Solana SVM',       dot: C.violet },
          ].map(n => (
            <div key={n.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, color: C.textDim, fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: n.dot, display: 'inline-block', flexShrink: 0 }} />
              {n.label}
            </div>
          ))}
        </div>

        {/* RIGHT: API status + profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* API health badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: apiOk ? C.greenGlow : 'rgba(245,80,80,0.1)',
            border: `1px solid ${apiOk ? 'rgba(34,216,122,0.3)' : 'rgba(245,80,80,0.3)'}`,
            borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600,
            color: apiOk ? C.green : C.red,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: apiOk ? C.green : C.red,
              boxShadow: apiOk ? `0 0 8px ${C.green}` : 'none',
              display: 'inline-block', flexShrink: 0,
            }} />
            {apiOk ? 'Live' : 'Offline'}
          </div>

          {/* Notifications placeholder */}
          <button style={{
            background: 'none', border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '5px 8px', cursor: 'pointer',
            color: C.muted, display: 'flex', alignItems: 'center',
          }}>
            <IconBell size={15} />
          </button>

          {/* Profile chip */}
          <button
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: C.surface2, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.purple}, ${C.violet})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <IconUser size={12} color="#fff" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>My Account</div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace', lineHeight: 1 }}>{shortCode}</div>
            </div>
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          BODY: SIDEBAR + CONTENT
      ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ─── SIDEBAR ─────────────────────────── */}
        <aside style={{
          width: 220,
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflowY: 'auto',
        }}>

          {/* Main nav */}
          <nav style={{ padding: '16px 8px 0', flex: 1 }}>
            <div style={{ padding: '0 8px 8px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Operations
            </div>
            {MAIN_NAV.map(({ path, label, icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/dashboard'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 7, marginBottom: 1,
                  color: isActive ? C.text : C.textDim,
                  background: isActive ? C.surface2 : 'transparent',
                  textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.1s',
                  borderLeft: isActive ? `2px solid ${C.purple}` : '2px solid transparent',
                })}
              >
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}

            <div style={{ padding: '16px 8px 8px', fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>
              Tools & Setup
            </div>
            {TOOLS_NAV.map(({ path, label, icon, accent }) => (
              <NavLink
                key={path}
                to={path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 7, marginBottom: 1,
                  color: isActive ? C.text : C.textDim,
                  background: isActive ? C.surface2 : 'transparent',
                  textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.1s',
                  borderLeft: isActive ? `2px solid ${accent}` : '2px solid transparent',
                })}
              >
                {icon}
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom: back to site */}
          <div style={{ padding: '12px 8px 16px', borderTop: `1px solid ${C.border}` }}>
            <NavLink
              to="/"
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 10px', borderRadius: 7,
                color: C.muted, textDecoration: 'none', fontSize: 13,
                transition: 'color 0.1s',
              }}
            >
              <IconGlobe size={16} />
              <span>Back to site</span>
            </NavLink>
          </div>
        </aside>

        {/* ─── MAIN CONTENT ─────────────────────── */}
        <main style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: '32px 36px',
          background: C.bg,
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

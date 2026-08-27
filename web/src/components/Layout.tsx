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
  IconShieldCheck
} from './Icons';

const MAIN_NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: <IconDashboard size={18} /> },
  { path: '/setup', label: 'Setup & Hub Access', icon: <IconZap size={18} /> },
  { path: '/scan', label: 'Contract Scanner', icon: <IconSearch size={18} /> },
  { path: '/mint', label: 'Direct Mint', icon: <IconBolt size={18} /> },
  { path: '/schedule', label: 'Drop Scheduler', icon: <IconClock size={18} /> },
  { path: '/schedules', label: 'Active Schedules', icon: <IconList size={18} /> },
  { path: '/copymint', label: 'Copy-Mint Radar', icon: <IconRadar size={18} /> },
  { path: '/wallet', label: 'Multi-Key Wallet', icon: <IconWallet size={18} /> },
];

const INTEGRATION_NAV = [
  { path: '/telegram-guide', label: 'Telegram Bot Setup', icon: <IconTelegram size={18} /> },
  { path: '/terminal-guide', label: 'Terminal CLI Setup', icon: <IconTerminal size={18} /> },
  { path: '/profile', label: 'My Profile & Key', icon: <IconUser size={18} /> },
];

export function Layout() {
  const navigate = useNavigate();
  const [apiOk, setApiOk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const activationCode = getUserActivationCode();

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    const id = setInterval(() => {
      api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().startsWith('0x')) {
      navigate('/scan', { state: { contract: searchQuery.trim() } });
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0f', color: '#e0e0ff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── HIGH-END STUDIO TOP NAVBAR ── */}
      <header style={{
        height: 64,
        background: '#121118',
        borderBottom: '1px solid rgba(250, 8%, 20%, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Left: Official MintoLogo SVG & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          >
            <MintoLogo size={32} />
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                MINTOBABY
              </div>
              <div style={{ fontSize: 9, color: '#6b3ce8', fontWeight: 800, letterSpacing: '0.12em', marginTop: 1 }}>
                MATRIX ENGINE v2.0
              </div>
            </div>
          </div>

          {/* Top Search Command Input */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', marginLeft: 16 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#1c1b24',
              border: '1px solid rgba(250, 8%, 20%, 0.8)',
              borderRadius: 8,
              padding: '6px 14px',
              width: 260
            }}>
              <IconSearch size={14} color="#827e99" />
              <input
                type="text"
                placeholder="Search contract 0x... or vector"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: 12,
                  width: '100%'
                }}
              />
            </div>
          </form>

          {/* Network Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <span style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              Robinhood 4663
            </span>
            <span style={{ background: 'rgba(0, 204, 255, 0.1)', border: '1px solid rgba(0, 204, 255, 0.3)', color: '#00ccff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              Ink L2 57073
            </span>
            <span style={{ background: 'rgba(153, 69, 255, 0.1)', border: '1px solid rgba(153, 69, 255, 0.3)', color: '#b877ff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              Solana SVM
            </span>
          </div>
        </div>

        {/* Right: API Health & Profile Activation Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* API Status Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#1c1b24',
            border: '1px solid rgba(250, 8%, 20%, 0.6)',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: apiOk ? '#00ff88' : '#ff4444',
              boxShadow: apiOk ? '0 0 10px #00ff88' : 'none'
            }} />
            <span style={{ color: apiOk ? '#00ff88' : '#ff4444' }}>
              {apiOk ? 'API Connected' : 'API Standby'}
            </span>
          </div>

          {/* Quick Setup Hub Button */}
          <button
            onClick={() => navigate('/setup')}
            style={{
              background: '#6b3ce8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 0 16px rgba(107, 60, 232, 0.4)'
            }}
          >
            <IconZap size={14} />
            <span>Setup Hub</span>
          </button>

          {/* User Profile Key Pill */}
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#1c1b24',
              border: '1px solid rgba(107, 60, 232, 0.4)',
              padding: '6px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <IconKey size={14} color="#00ff88" />
            <div>
              <div style={{ fontSize: 9, color: '#827e99', fontWeight: 700 }}>ACTIVATION KEY</div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#00ff88', fontWeight: 800 }}>
                {activationCode.slice(0, 10)}...
              </div>
            </div>
            <IconUser size={16} color="#827e99" />
          </div>
        </div>
      </header>

      {/* ── MAIN CONTAINER: SIDEBAR + CONTENT AREA ── */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDE NAVIGATION BAR */}
        <aside style={{
          width: 230,
          background: '#121118',
          borderRight: '1px solid rgba(250, 8%, 20%, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 0'
        }}>
          <div>
            {/* Logo Header inside Sidebar */}
            <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(250, 8%, 20%, 0.6)', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                NAV CONSOLE
              </div>
            </div>

            {/* OPERATIONS Section */}
            <div style={{ fontSize: 10, fontWeight: 800, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 10px' }}>
              Operations
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', marginBottom: 24 }}>
              {MAIN_NAV.map(({ path, label, icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/dashboard'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    color: isActive ? '#ffffff' : '#827e99',
                    background: isActive ? '#1c1b24' : 'transparent',
                    borderLeft: isActive ? '3px solid #6b3ce8' : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  })}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* INTEGRATIONS & GUIDES Section */}
            <div style={{ fontSize: 10, fontWeight: 800, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 20px 10px' }}>
              Integrations & Setup
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
              {INTEGRATION_NAV.map(({ path, label, icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: 8,
                    color: isActive ? '#ffffff' : '#827e99',
                    background: isActive ? '#1c1b24' : 'transparent',
                    borderLeft: isActive ? '3px solid #00ccff' : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.15s'
                  })}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Bottom Footer Item: Return Home */}
          <div style={{ padding: '16px 20px 0', borderTop: '1px solid rgba(250, 8%, 20%, 0.6)' }}>
            <NavLink
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: '#827e99',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <IconGlobe size={18} />
              <span>MintoBaby Studio</span>
            </NavLink>
          </div>
        </aside>

        {/* MAIN ROUTE CONTENT */}
        <main style={{ flex: 1, padding: 36, overflowX: 'hidden', background: '#0a0a0f' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

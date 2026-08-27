import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { getUserActivationCode } from '../utils/activation';
import {
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
  IconShieldCheck,
  IconArrowRight,
  IconZap
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
  const activationCode = getUserActivationCode();

  useEffect(() => {
    api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    const id = setInterval(() => {
      api.health().then(() => setApiOk(true)).catch(() => setApiOk(false));
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a090f', color: '#e0e0ff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* TOP NAVIGATION BAR */}
      <header style={{
        height: 64,
        background: '#111019',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left: Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => navigate('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#6b3ce8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(107, 60, 232, 0.5)'
            }}>
              <IconBolt size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em', lineHeight: 1.1 }}>
                MINTOBABY
              </div>
              <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 800, letterSpacing: '0.12em' }}>
                MATRIX ENGINE v2.0
              </div>
            </div>
          </div>

          {/* Network Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 20 }}>
            <span style={{ background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.3)', color: '#00ff88', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              Robinhood 4663
            </span>
            <span style={{ background: 'rgba(0, 204, 255, 0.1)', border: '1px solid rgba(0, 204, 255, 0.3)', color: '#00ccff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              Ink L2 57073
            </span>
            <span style={{ background: 'rgba(153, 69, 255, 0.1)', border: '1px solid rgba(153, 69, 255, 0.3)', color: '#b877ff', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              Solana SVM
            </span>
          </div>
        </div>

        {/* Right: API Health & Profile Key Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* API Health Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#171622',
            border: '1px solid rgba(255, 255, 255, 0.08)',
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
              boxShadow: apiOk ? '0 0 8px #00ff88' : 'none'
            }} />
            <span style={{ color: apiOk ? '#00ff88' : '#ff4444' }}>
              {apiOk ? 'API Connected' : 'API Standby'}
            </span>
          </div>

          {/* Quick Setup Hub Button */}
          <button
            onClick={() => navigate('/setup')}
            style={{
              background: 'linear-gradient(135deg, #6b3ce8 0%, #4a1fb8 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
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
              background: '#171622',
              border: '1px solid rgba(107, 60, 232, 0.4)',
              padding: '5px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <IconKey size={14} color="#00ff88" />
            <div>
              <div style={{ fontSize: 10, color: '#827e99', fontWeight: 700 }}>ACTIVATION KEY</div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#00ff88', fontWeight: 800 }}>
                {activationCode.slice(0, 10)}...
              </div>
            </div>
            <IconUser size={16} color="#827e99" />
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER: SIDEBAR + CONTENT AREA */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* SIDE NAVIGATION BAR */}
        <aside style={{
          width: 240,
          background: '#111019',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 12px'
        }}>
          <div>
            {/* OPERATIONS Section */}
            <div style={{ fontSize: 10, fontWeight: 800, color: '#5e5a75', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 12px 10px' }}>
              Operations
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 24 }}>
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
                    background: isActive ? 'rgba(107, 60, 232, 0.2)' : 'transparent',
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
            <div style={{ fontSize: 10, fontWeight: 800, color: '#5e5a75', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 12px 10px' }}>
              Integrations & Setup
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                    background: isActive ? 'rgba(0, 204, 255, 0.15)' : 'transparent',
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
          <div style={{ paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <NavLink
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 8,
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
        <main style={{ flex: 1, padding: 32, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

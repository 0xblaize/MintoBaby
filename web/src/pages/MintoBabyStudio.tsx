import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowRight,
  IconSparkles,
  IconCode,
  IconFilm,
  IconFigma,
  IconEdit,
  IconCompass,
  IconStar,
  IconMenu,
  IconX,
  IconExternalLink,
  IconBolt,
  IconLayers,
  IconGlobe,
  IconShield,
  IconTerminal,
  IconCheck,
  IconLock,
  IconCpu,
  IconTelegram,
  IconTerminalScreen,
  IconMonitor
} from '../components/MintoIcons';
import { StartProjectModal } from '../components/StartProjectModal';
import { CaseStudyModal, ProjectData } from '../components/CaseStudyModal';
import { AuthSubscribeModal } from '../components/AuthSubscribeModal';
import { WatercolorCurrentCanvas } from '../components/WatercolorCurrentCanvas';

/* ── SIMPLE GEOMETRIC GOOGLE-STYLE LOGO MARK ── */
function MintoLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="9" fill="#6b3ce8" />
      <path
        d="M10 25V11L18 20L26 11V25"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="11" r="2" fill="#00ff88" />
    </svg>
  );
}

const BOT_VECTORS_DATA: ProjectData[] = [
  {
    id: 'mempool-sniper',
    name: 'Robinhood & EVM Mempool Sniper',
    category: 'Robinhood Chain',
    year: '2026',
    client: 'MINTOBABY Core',
    headline: 'Sub-10ms Pending Transaction Interception & Automated Mint Execution',
    description: 'The Mempool Sniper continuously scans pending transaction pools on Robinhood Chain, Base, and Ink L2. When a collection deployment or mint transaction is broadcast, MINTOBABY calculates gas priority and executes the mint within 10ms.',
    deliverables: ['Mempool Parser', 'Gas Priority Bidding', 'Pending Tx Interceptor', 'Multi-RPC Router'],
    metrics: [
      { label: 'Latency', value: '10ms' },
      { label: 'Mempool Parsing', value: '1,000 tx/sec' },
      { label: 'Success Rate', value: '99.4%' }
    ],
    heroGradient: 'linear-gradient(135deg, #1c1438 0%, #3e1b96 50%, #6b3ce8 100%)'
  },
  {
    id: 'wallet-engine',
    name: 'Generate & Import Sniper Wallets',
    category: 'Wallet Management',
    year: '2026',
    client: 'MINTOBABY Wallet Core',
    headline: 'Instant Sniper Wallet Creation & Secure Private Key Import',
    description: 'Generate fresh dedicated sniper wallets in 1-click or import your existing Web3 private keys (0x...). Fully compatible with Robinhood Chain, Base, Ink, and Solana for direct automated transaction execution.',
    deliverables: ['1-Click Wallet Generator', 'Private Key Importer', 'Encrypted Key Storage', 'Multi-Chain Compatibility'],
    metrics: [
      { label: 'Creation Speed', value: 'Instant' },
      { label: 'Key Control', value: '100% User Owned' },
      { label: 'Supported Inputs', value: 'Generated / Imported' }
    ],
    heroGradient: 'linear-gradient(135deg, #0d1a24 0%, #17374a 50%, #6b3ce8 100%)'
  },
  {
    id: 'copymint-mirror',
    name: 'CopyMint Whale Wallet Mirroring',
    category: 'Ink L2 & Base',
    year: '2026',
    client: 'MINTOBABY Alpha',
    headline: 'Real-Time Whale Tracking & Instantaneous Mirror Transactions',
    description: 'CopyMint tracks top-performing Web3 alpha traders and whale wallets. The moment a target wallet submits a mint or purchase transaction, MINTOBABY mirrors the exact call data with custom gas slippage protection.',
    deliverables: ['Target Wallet Tracker', 'Call Data Mirroring', 'Slippage Protection', 'Solana & EVM Support'],
    metrics: [
      { label: 'Tracking Delay', value: '< 5ms' },
      { label: 'Alpha Target List', value: 'Unlimited' },
      { label: 'Profit Multiplier', value: '4.2x Avg' }
    ],
    heroGradient: 'linear-gradient(135deg, #1a0f26 0%, #341254 50%, #6b3ce8 100%)'
  },
  {
    id: 'automint-contract',
    name: 'AutoMintExecutor.sol Gas Engine',
    category: 'Solana & EVM',
    year: '2026',
    client: 'MINTOBABY Smart Contract',
    headline: 'Custom Assembly-Optimized EVM Contract for Competitive Public Mints',
    description: 'Custom Yul/assembly smart contract bypassing standard ERC-721 overhead. Directly calls mintTo and publicMintTo functions with optimized gas packing, beating standard wallet transactions every block.',
    deliverables: ['AutoMintExecutor.sol', 'Yul Assembly Code', 'PublicMintTo ABI', 'Batch Minting Helper'],
    metrics: [
      { label: 'Gas Saved', value: '-38%' },
      { label: 'Contract Bytecode', value: '1.9 KB' },
      { label: 'Block Speed', value: 'Block 0 Entry' }
    ],
    heroGradient: 'linear-gradient(135deg, #241219 0%, #4a1931 50%, #6b3ce8 100%)'
  }
];

export default function MintoBabyStudio() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAuthPlan, setSelectedAuthPlan] = useState('pro');
  const [pricingCycle, setPricingCycle] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHeroCard, setActiveHeroCard] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openProjectModal = (proj: ProjectData) => {
    setSelectedProject(proj);
  };

  const openAuthWithPlan = (planId: string, cycle: 'weekly' | 'monthly' | 'yearly' = pricingCycle) => {
    setSelectedAuthPlan(planId);
    setPricingCycle(cycle);
    setIsAuthModalOpen(true);
  };

  return (
    <div style={{ background: '#0a0a0f', color: '#f5f5f5', minHeight: '100vh', position: 'relative', perspective: '1200px', overflowX: 'hidden' }}>
      <WatercolorCurrentCanvas />
      
      <div id="liquid-website-wrapper" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
      
      {/* ── 1. NAVBAR (WIDER & SLEEK WITH SIMPLE GEOMETRIC LOGO) ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: scrolled ? 'rgba(10, 10, 15, 0.94)' : 'rgba(10, 10, 15, 0.8)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(250, 8%, 20%, 0.6)',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1600px',
            margin: '0 auto',
            padding: '14px 5vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left Simple Geometric Logo Mark */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <MintoLogo size={32} />
            <span className="font-heading" style={{ fontSize: 21, fontWeight: 700, letterSpacing: '0.05em', color: '#ffffff' }}>
              MINTOBABY
            </span>
          </div>

          {/* Desktop Streamlined Links */}
          <nav className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 13, fontWeight: 500, color: '#827e99' }}>
            <a href="#bot-vectors" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#827e99')}>
              Capabilities
            </a>
            <a href="#interfaces" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#827e99')}>
              3 Interfaces
            </a>
            <a href="#services" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#827e99')}>
              Services
            </a>
            <a href="#process" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')} onMouseLeave={(e) => (e.currentTarget.style.color = '#827e99')}>
              How It Works
            </a>
            <a href="#pricing" style={{ color: '#00ff88', fontWeight: 600, textDecoration: 'none', transition: 'color 0.2s' }}>
              Pricing
            </a>

            {/* Clean Primary Action Button */}
            <button
              onClick={() => openAuthWithPlan('pro')}
              style={{
                background: '#6b3ce8',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 20px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 0 16px rgba(107, 60, 232, 0.35)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 0 22px rgba(107, 60, 232, 0.55)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 0 16px rgba(107, 60, 232, 0.35)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google Login & Subscribe →</span>
            </button>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'none',
            }}
            className="show-mobile-btn"
          >
            {mobileMenuOpen ? <IconX size={24} /> : <IconMenu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div
            style={{
              background: '#14131a',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 5vw',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <a href="#bot-vectors" onClick={() => setMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              Capabilities
            </a>
            <a href="#interfaces" onClick={() => setMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              3 Interfaces
            </a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              Services
            </a>
            <a href="#process" onClick={() => setMobileMenuOpen(false)} style={{ color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500 }}>
              How It Works
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ color: '#00ff88', textDecoration: 'none', fontSize: 15, fontWeight: 600 }}>
              Pricing
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openAuthWithPlan('pro');
              }}
              style={{
                background: '#6b3ce8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '12px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 4
              }}
            >
              Google Login & Subscribe →
            </button>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION (SPACED DOWN & TIGHTENED TEXT) ── */}
      <section
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 65px)',
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
          overflow: 'hidden',
          paddingTop: '40px',
          paddingBottom: '90px',
        }}
      >
        {/* Background Radial Gradient + Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: '100%',
            pointerEvents: 'none',
            background: 'radial-gradient(ellipse at 70% 50%, rgba(107,60,232,0.25) 0%, rgba(107,60,232,0.06) 50%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: '100%',
            pointerEvents: 'none',
            backgroundImage:
              'linear-gradient(rgba(107,60,232,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(107,60,232,0.04) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Hero Left Content Container (Shifted Down with paddingTop: 40px) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            paddingLeft: '5vw',
            paddingRight: '2vw',
            paddingTop: '50px',
            maxWidth: '58%',
            width: '100%',
          }}
          className="hero-left-col"
        >
          {/* Streamlined Label */}
          <div
            style={{
              fontSize: 10,
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#6b3ce8',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: 0,
              animation: 'fadeUp 0.6s ease forwards 0.1s',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block' }} />
            <span>MINTOBABY BOT · 10MS MEMPOOL EXECUTOR</span>
          </div>

          {/* Headline H1 (Shifted Down & Scaled Cleanly) */}
          <h1
            className="font-heading"
            style={{
              fontSize: 'clamp(46px, 7vw, 110px)',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 0.88,
              letterSpacing: '-0.02em',
              marginBottom: 20,
              whiteSpace: 'pre-line',
              opacity: 0,
              animation: 'fadeUp 0.6s ease forwards 0.2s',
            }}
          >
            WE BUILD{'\n'}BOTS THAT{'\n'}
            <span style={{ color: '#6b3ce8', position: 'relative', display: 'inline-block' }}>
              DOMINATE.
            </span>
          </h1>

          {/* Shortened Subtitle Paragraph */}
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              color: '#827e99',
              fontSize: 'clamp(14px, 1.3vw, 18px)',
              lineHeight: 1.5,
              maxWidth: 500,
              marginBottom: 32,
              opacity: 0,
              animation: 'fadeUp 0.6s ease forwards 0.3s',
            }}
          >
            Sub-10ms mempool sniping, 1-click sniper wallet generation, and automated multi-chain execution for Web3 traders — paid access only.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              opacity: 0,
              animation: 'fadeUp 0.6s ease forwards 0.4s',
            }}
          >
            <button
              onClick={() => openAuthWithPlan('pro')}
              style={{
                background: '#6b3ce8',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '13px 26px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 0 25px rgba(107, 60, 232, 0.45)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>Google Login & Buy Sub</span>
              <IconArrowRight size={15} />
            </button>

            <a
              href="#pricing"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                padding: '13px 22px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>View Paid Tiers</span>
            </a>
          </div>
        </div>

        {/* 3 Floating Bot Feature Cards Stacked Bottom-Right */}
        <div
          style={{
            position: 'absolute',
            right: '5vw',
            bottom: '8vh',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
          className="hero-floating-cards"
        >
          {/* Card 1: AutoMintExecutor.sol Module */}
          <div
            onClick={() => openProjectModal(BOT_VECTORS_DATA[3])}
            onMouseEnter={() => setActiveHeroCard(1)}
            onMouseLeave={() => setActiveHeroCard(null)}
            style={{
              width: '240px',
              height: '135px',
              background: '#14131a',
              border: activeHeroCard === 1 ? '1px solid #00ff88' : '1px solid rgba(0,255,136,0.4)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: activeHeroCard === 1 ? '0 12px 30px rgba(0,255,136,0.2)' : '0 10px 25px rgba(0,0,0,0.6)',
              transform: activeHeroCard === 1 ? 'rotate(-2deg) translateY(-8px) scale(1.05)' : 'rotate(-2deg)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              position: 'relative',
              opacity: 0,
              animation: 'cardSlideIn 0.7s ease forwards 0.4s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#00ff88', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBolt size={12} color="#0a0a0f" />
              </div>
              <span style={{ fontSize: 9, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>EVM ASSEMBLY</span>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 6, height: 46, padding: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-heading" style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>AutoMintExecutor.sol</span>
              <span style={{ fontSize: 9, color: '#827e99' }}>Low-Gas Public & Allowlist</span>
            </div>
            <div className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: '#f5f5f5' }}>Gas Engine Module</div>
          </div>

          {/* Card 2: Generated / Imported Wallet Card */}
          <div
            onClick={() => openProjectModal(BOT_VECTORS_DATA[1])}
            onMouseEnter={() => setActiveHeroCard(2)}
            onMouseLeave={() => setActiveHeroCard(null)}
            style={{
              width: '240px',
              height: '135px',
              background: '#14131a',
              border: activeHeroCard === 2 ? '1px solid #6b3ce8' : '1px solid rgba(107,60,232,0.4)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: activeHeroCard === 2 ? '0 12px 30px rgba(107,60,232,0.3)' : '0 10px 25px rgba(0,0,0,0.6)',
              transform: activeHeroCard === 2 ? 'rotate(1deg) translateY(-28px) scale(1.05)' : 'rotate(1deg) translateY(-20px)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              position: 'relative',
              opacity: 0,
              animation: 'cardSlideIn 0.7s ease forwards 0.55s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#1c1b24', border: '1px solid #6b3ce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconShield size={12} color="#6b3ce8" />
              </div>
              <span style={{ fontSize: 9, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>SNIPER WALLET</span>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 6, height: 46, padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>Generate / Import Wallet</div>
              <div style={{ width: '80%', height: 4, background: '#6b3ce8', borderRadius: 2 }} />
            </div>
            <div className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: '#f5f5f5' }}>Wallet Engine</div>
          </div>

          {/* Card 3: CopyMint Whale Mirror Card */}
          <div
            onClick={() => openProjectModal(BOT_VECTORS_DATA[2])}
            onMouseEnter={() => setActiveHeroCard(3)}
            onMouseLeave={() => setActiveHeroCard(null)}
            style={{
              width: '240px',
              height: '135px',
              background: '#14131a',
              border: activeHeroCard === 3 ? '1px solid #6b3ce8' : '1px solid rgba(107,60,232,0.4)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: activeHeroCard === 3 ? '0 12px 30px rgba(107,60,232,0.3)' : '0 10px 25px rgba(0,0,0,0.6)',
              transform: activeHeroCard === 3 ? 'rotate(-1deg) translateY(-48px) scale(1.05)' : 'rotate(-1deg) translateY(-40px)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              position: 'relative',
              opacity: 0,
              animation: 'cardSlideIn 0.7s ease forwards 0.7s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: '#6b3ce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconLayers size={12} color="#fff" />
              </div>
              <span style={{ fontSize: 9, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>WHALE MIRROR</span>
            </div>
            <div style={{ background: '#0a0a0f', borderRadius: 6, height: 46, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="font-heading" style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>CopyMint Engine 5ms</span>
            </div>
            <div className="font-heading" style={{ fontSize: 12, fontWeight: 700, color: '#f5f5f5' }}>Whale Tracking</div>
          </div>
        </div>
      </section>

      {/* ── 3. BOT EXECUTION VECTORS ── */}
      <section id="bot-vectors" style={{ padding: '100px 5vw', background: 'rgba(10, 10, 15, 0.55)', borderTop: '1px solid rgba(250, 8%, 20%, 0.5)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b3ce8', marginBottom: 12 }}>
                CORE BOT CAPABILITIES
              </div>
              <h2
                className="font-heading"
                style={{
                  fontSize: 'clamp(42px, 5vw, 76px)',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.0,
                  margin: 0,
                }}
              >
                Bot Execution Vectors
              </h2>
            </div>
            <span style={{ fontSize: 13, color: '#827e99', fontWeight: 300 }} className="hidden-mobile">
              04 Specialized Engines (Robinhood · Ink · Base · Solana)
            </span>
          </div>

          {/* Bot Vector Rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {BOT_VECTORS_DATA.map((proj, idx) => {
              const numStr = `0${idx + 1}`;
              return (
                <div
                  key={proj.id}
                  onClick={() => openProjectModal(proj)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1.5fr 1fr 60px',
                    alignItems: 'center',
                    padding: '34px 28px',
                    borderBottom: '1px solid hsl(var(--border))',
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                    position: 'relative',
                    borderRadius: '8px',
                  }}
                  className="project-row"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1c1b24';
                    const nameEl = e.currentTarget.querySelector('.project-name') as HTMLElement;
                    if (nameEl) nameEl.style.color = '#6b3ce8';
                    const arrowEl = e.currentTarget.querySelector('.project-arrow') as HTMLElement;
                    if (arrowEl) arrowEl.style.transform = 'translateX(6px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    const nameEl = e.currentTarget.querySelector('.project-name') as HTMLElement;
                    if (nameEl) nameEl.style.color = '#ffffff';
                    const arrowEl = e.currentTarget.querySelector('.project-arrow') as HTMLElement;
                    if (arrowEl) arrowEl.style.transform = 'none';
                  }}
                >
                  <span
                    className="font-heading"
                    style={{
                      fontSize: 'clamp(36px, 4vw, 54px)',
                      fontWeight: 700,
                      color: 'rgba(255, 255, 255, 0.08)',
                      userSelect: 'none',
                    }}
                  >
                    {numStr}
                  </span>

                  <h3
                    className="font-heading project-name"
                    style={{
                      fontSize: 'clamp(24px, 3vw, 36px)',
                      fontWeight: 700,
                      color: '#ffffff',
                      margin: 0,
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {proj.name}
                  </h3>

                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, color: '#827e99', fontSize: 'clamp(13px, 1.2vw, 15px)' }}>
                    {proj.headline.split('+')[0]} <span style={{ color: '#6b3ce8' }}>({proj.category} · {proj.year})</span>
                  </div>

                  <div
                    className="project-arrow"
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      color: '#6b3ce8',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <IconArrowRight size={24} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 3.5 THREE ECOSYSTEM INTERFACES (TERMINAL, WEB APP, TG BOT) ── */}
      <section id="interfaces" style={{ padding: '100px 5vw', background: 'rgba(10, 10, 15, 0.4)', borderTop: '1px solid rgba(250, 8%, 20%, 0.5)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '60px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b3ce8', marginBottom: 12 }}>
              TRIPLE PLATFORM ECOSYSTEM
            </div>
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(36px, 4.5vw, 68px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Three Ways To Access MINTOBABY
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", color: '#827e99', fontSize: 16, marginTop: 16, maxWidth: '750px', fontWeight: 300 }}>
              Deploy MINTOBABY across three powerful interfaces tailored to your strategy—ranked by execution speed and response latency.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '28px' }}>
            
            {/* 1. CLI TERMINAL (FASTEST) */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(28, 27, 36, 0.9) 0%, rgba(107, 60, 232, 0.18) 100%)',
                border: '1px solid rgba(107, 60, 232, 0.5)',
                borderRadius: '20px',
                padding: '36px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
              }}
            >
              <div style={{ position: 'absolute', top: 16, right: 16, background: '#6b3ce8', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                RANK 01 · FASTEST SPEED
              </div>

              <div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(107, 60, 232, 0.25)', border: '1px solid #6b3ce8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00ff88', marginBottom: 24 }}>
                  <IconTerminalScreen size={26} color="#00ff88" />
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#00ff88', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  SPEED RANK 01 · CLI TERMINAL
                </div>

                <h3 className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
                  CLI Terminal Base Engine
                </h3>

                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#827e99', lineHeight: 1.65, fontWeight: 300, marginBottom: 24 }}>
                  The absolute fastest execution mode. Direct low-level RPC WebSocket integration bypassing browser DOM overhead. Connects directly to custom Yul Assembly <code style={{ color: '#00ff88', background: 'rgba(0,255,136,0.1)', padding: '2px 6px', borderRadius: 4 }}>AutoMintExecutor.sol</code> for guaranteed block-0 mempool entry.
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#827e99' }}>Execution Latency</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#00ff88' }}>&lt; 10ms (Fastest Response)</span>
              </div>
            </div>

            {/* 2. WEB STUDIO WEBSITE (NEXT FASTEST) */}
            <div
              style={{
                background: 'rgba(20, 19, 26, 0.85)',
                border: '1px solid rgba(250, 8%, 20%, 0.6)',
                borderRadius: '20px',
                padding: '36px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
              }}
            >
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                RANK 02 · VISUAL DASHBOARD
              </div>

              <div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b3ce8', marginBottom: 24 }}>
                  <IconMonitor size={26} color="#6b3ce8" />
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  SPEED RANK 02 · WEB STUDIO
                </div>

                <h3 className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
                  Web Studio Website App
                </h3>

                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#827e99', lineHeight: 1.65, fontWeight: 300, marginBottom: 24 }}>
                  Interactive Web3 application suite. Provides visual control for CopyMint whale wallet mirroring, 1-click sniper wallet generator/importer, automated scheduled mints, and live multi-chain collection scanner.
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#827e99' }}>Execution Latency</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>~ 25ms (Next Fastest)</span>
              </div>
            </div>

            {/* 3. TELEGRAM BOT (MOBILE CONVENIENCE) */}
            <div
              style={{
                background: 'rgba(20, 19, 26, 0.85)',
                border: '1px solid rgba(250, 8%, 20%, 0.6)',
                borderRadius: '20px',
                padding: '36px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between',
              }}
            >
              <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0, 136, 204, 0.2)', color: '#0088cc', border: '1px solid rgba(0, 136, 204, 0.4)', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                RANK 03 · MOBILE SNIPING
              </div>

              <div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(0, 136, 204, 0.15)', border: '1px solid rgba(0, 136, 204, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0088cc', marginBottom: 24 }}>
                  <IconTelegram size={26} color="#0088cc" />
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: '#0088cc', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
                  SPEED RANK 03 · TELEGRAM BOT
                </div>

                <h3 className="font-heading" style={{ fontSize: 26, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
                  Telegram Bot (@MintoBabyBot)
                </h3>

                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: '#827e99', lineHeight: 1.65, fontWeight: 300, marginBottom: 24 }}>
                  On-the-go mobile sniper integration. Receive instant push notifications the second a target collection deploys, run chat-command snipes, monitor wallet balances, and configure gas limits anywhere directly on Telegram.
                </p>
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#827e99' }}>Execution Latency</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0088cc' }}>Mobile Instant Chat</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 4. PRICING & PAID SUBSCRIPTIONS SECTION ── */}
      <section id="pricing" style={{ padding: '100px 5vw', background: 'rgba(14, 13, 20, 0.55)', borderTop: '1px solid rgba(250, 8%, 20%, 0.6)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(220,20,60,0.15)', border: '1px solid rgba(220,20,60,0.4)', borderRadius: 20, padding: '6px 16px', fontSize: 11, fontWeight: 700, color: '#ff4d73', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>
              <IconLock size={14} color="#ff4d73" />
              <span>PAID SUBSCRIPTION MEMBERSHIP ONLY — NO FREE TIER MODE</span>
            </div>
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(42px, 5vw, 76px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.0,
                margin: '0 0 16px 0',
              }}
            >
              Unlock Paid Matrix Engine Access
            </h2>
            <p style={{ color: '#827e99', fontSize: 16, fontWeight: 300, maxWidth: 640, margin: '0 auto 24px auto' }}>
              Sign in with Google, choose your paid subscription plan, and complete checkout to access the MINTOBABY Bot Console.
            </p>

            {/* Billing Cycle Pill Selector */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', background: '#14131a', border: '1px solid rgba(107,60,232,0.4)', borderRadius: 30, padding: 4, boxShadow: '0 0 20px rgba(107,60,232,0.2)' }}>
                {[
                  { id: 'weekly', label: 'Weekly Billing' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'yearly', label: 'Yearly (-20% Off)' },
                ].map((cycle) => (
                  <button
                    key={cycle.id}
                    onClick={() => setPricingCycle(cycle.id as 'weekly' | 'monthly' | 'yearly')}
                    style={{
                      background: pricingCycle === cycle.id ? '#6b3ce8' : 'transparent',
                      color: pricingCycle === cycle.id ? '#ffffff' : '#827e99',
                      border: 'none',
                      borderRadius: 24,
                      padding: '10px 22px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    {cycle.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3 Pricing Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', alignItems: 'stretch' }}>
            
            {/* Plan 1: Starter */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.8)',
                borderRadius: '20px',
                padding: '44px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
                  STARTER BOT PASS
                </div>
                <div className="font-heading" style={{ fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  ${pricingCycle === 'weekly' ? '15' : pricingCycle === 'monthly' ? '49' : '490'} <span style={{ fontSize: 16, color: '#827e99', fontWeight: 400 }}>/ {pricingCycle === 'weekly' ? 'week' : pricingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p style={{ color: '#827e99', fontSize: 14, marginBottom: 24 }}>
                  Essential wallet sniper & monitoring engine for active web3 traders.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {['5 Active Wallet Snipers', 'Robinhood & Base Chain Access', '100ms Execution Latency', 'Telegram & Discord Alerts', 'Standard Support'].map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#e0e0e0' }}>
                      <IconCheck size={16} color="#6b3ce8" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => openAuthWithPlan('starter', pricingCycle)}
                style={{
                  width: '100%',
                  background: '#1c1b24',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '14px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Google Login & Buy Sub (${pricingCycle === 'weekly' ? '15/wk' : pricingCycle === 'monthly' ? '49/mo' : '490/yr'}) →
              </button>
            </div>

            {/* Plan 2: Pro (MOST POPULAR) */}
            <div
              style={{
                background: '#181426',
                border: '2px solid #6b3ce8',
                borderRadius: '20px',
                padding: '44px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                boxShadow: '0 0 35px rgba(107, 60, 232, 0.3)'
              }}
            >
              <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#6b3ce8', color: '#fff', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', padding: '4px 16px', borderRadius: 20 }}>
                MOST POPULAR
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
                  PRO BOT DOMINATOR PASS
                </div>
                <div className="font-heading" style={{ fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  ${pricingCycle === 'weekly' ? '45' : pricingCycle === 'monthly' ? '149' : '1490'} <span style={{ fontSize: 16, color: '#827e99', fontWeight: 400 }}>/ {pricingCycle === 'weekly' ? 'week' : pricingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p style={{ color: '#827e99', fontSize: 14, marginBottom: 24 }}>
                  Full multi-chain auto-mint matrix executor with 10ms priority execution.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {['Unlimited Wallet Snipers', 'All Chains (Robinhood, Base, Ink, Solana)', '10ms Auto-Mint Matrix Executor', '1-Click Generated & Imported Wallets', 'VIP Copy Trading & CopyMint', '24/7 Priority Support'].map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#ffffff', fontWeight: 500 }}>
                      <IconCheck size={16} color="#00ff88" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => openAuthWithPlan('pro', pricingCycle)}
                style={{
                  width: '100%',
                  background: '#6b3ce8',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '16px',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(107,60,232,0.5)',
                  transition: 'all 0.2s'
                }}
              >
                Google Login & Buy Sub (${pricingCycle === 'weekly' ? '45/wk' : pricingCycle === 'monthly' ? '149/mo' : '1490/yr'}) →
              </button>
            </div>

            {/* Plan 3: Enterprise */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.8)',
                borderRadius: '20px',
                padding: '44px 36px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#827e99', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
                  ENTERPRISE BOT TIER
                </div>
                <div className="font-heading" style={{ fontSize: 48, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  ${pricingCycle === 'weekly' ? '119' : pricingCycle === 'monthly' ? '399' : '3990'} <span style={{ fontSize: 16, color: '#827e99', fontWeight: 400 }}>/ {pricingCycle === 'weekly' ? 'week' : pricingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p style={{ color: '#827e99', fontSize: 14, marginBottom: 24 }}>
                  Enterprise design system, custom smart contracts, and dedicated engineering team.
                </p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {['Custom AutoMintExecutor Contracts', 'Dedicated MINTOBABY Engineering Team', 'Private Key & Multi-Wallet Setup', 'White-Label Client Dashboard', '1-on-1 Architecture Support'].map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#e0e0e0' }}>
                      <IconCheck size={16} color="#6b3ce8" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => openAuthWithPlan('enterprise', pricingCycle)}
                style={{
                  width: '100%',
                  background: '#1c1b24',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '14px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Google Login & Buy Sub (${pricingCycle === 'weekly' ? '119/wk' : pricingCycle === 'monthly' ? '399/mo' : '3990/yr'}) →
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. BOT SERVICES SECTION ── */}
      <section id="services" style={{ padding: '100px 5vw', background: 'rgba(10, 10, 15, 0.55)', borderTop: '1px solid rgba(250, 8%, 20%, 0.5)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '60px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b3ce8', marginBottom: 12 }}>
              BOT SERVICES & CAPABILITIES
            </div>
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(42px, 5vw, 76px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.0,
                margin: '0 0 16px 0',
              }}
            >
              What MINTOBABY Bot Does
            </h2>
            <p style={{ color: '#827e99', fontSize: 16, fontWeight: 300, maxWidth: 540 }}>
              End-to-end automated execution capabilities designed for high-frequency Web3 trading and minting.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '28px',
            }}
          >
            {/* 1. Mempool Sniping */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconBolt size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Mempool Sniping
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Continuous 10ms mempool transaction monitoring across Robinhood Chain, Base, and Ink L2.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Mempool', 'Robinhood', 'Base', '10ms'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 2. AutoMintExecutor.sol */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconCode size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Assembly Contract Dev
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Custom EVM Yul assembly smart contracts bypassing gas overhead to guarantee Block 0 entry.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Assembly', 'Solidity', 'Yul', 'Gas Optim'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Generated & Imported Wallet Engine */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconShield size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Sniper Wallet Control
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Instant 1-click fresh sniper wallet generation or import existing private key credentials (0x...).
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Generated Wallet', 'Import Private Key', 'Full Control', 'Zero Lock-in'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 4. CopyMint Engine */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconLayers size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                CopyMint Mirroring
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Whale wallet tracking engine mirroring top-performing Alpha wallets automatically.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['CopyMint', 'Whale Tracking', 'Auto Mirror', 'Multi-Wallet'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 5. Matrix Telemetry Dashboard */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconCpu size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Matrix Console Telemetry
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Real-time transaction log monitoring, schedule management, and instant execution toggles.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Telemetry', 'Live Dashboard', 'Schedule Manager', 'API'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* 6. Multi-Chain RPC Router */}
            <div
              style={{
                background: '#14131a',
                border: '1px solid rgba(250, 8%, 20%, 0.7)',
                borderRadius: '16px',
                padding: '40px',
                transition: 'all 0.25s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6b3ce8';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(107, 60, 232, 0.14)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(250, 8%, 20%, 0.7)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ color: '#6b3ce8', marginBottom: 20 }}>
                <IconGlobe size={28} />
              </div>
              <h3 className="font-heading" style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 10 }}>
                Multi-Chain RPC Router
              </h3>
              <p style={{ color: '#827e99', fontSize: 14, fontWeight: 300, lineHeight: 1.6, marginBottom: 20 }}>
                Redundant private RPC nodes across Robinhood Chain, Base, Ink L2, and Solana for guaranteed delivery.
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['RPC Router', 'Redundancy', 'Low Latency', 'Solana'].map((t) => (
                  <span key={t} style={{ background: '#1c1b24', color: '#827e99', fontSize: 11, padding: '4px 10px', borderRadius: 4 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. HOW THE BOT WORKS SECTION ── */}
      <section id="process" style={{ padding: '100px 5vw', background: 'rgba(10, 10, 15, 0.55)', borderTop: '1px solid rgba(250, 8%, 20%, 0.5)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          
          <div style={{ marginBottom: '60px' }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b3ce8', marginBottom: 12 }}>
              AUTOMATED EXECUTION PIPELINE
            </div>
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(42px, 5vw, 76px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.0,
                margin: 0,
              }}
            >
              How The Bot Works
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '32px' }}>
            {[
              {
                step: '01',
                title: 'Mempool Scanning',
                desc: 'Continuous real-time scanning of pending transaction pools across Robinhood Chain, Base, Ink L2, and Solana.',
              },
              {
                step: '02',
                title: 'Target Matching & Gas Bidding',
                desc: 'Instant matching of contract deployment ABIs or targeted whale wallets with dynamic gas priority calculation.',
              },
              {
                step: '03',
                title: 'Wallet Key Signing',
                desc: 'Cryptographic transaction signing using your generated sniper wallet or imported private key credentials.',
              },
              {
                step: '04',
                title: 'Sub-10ms Block 0 Execution',
                desc: 'Direct execution via AutoMintExecutor.sol Yul assembly contract with guaranteed sub-10ms latency.',
              },
            ].map((p) => (
              <div
                key={p.step}
                style={{
                  position: 'relative',
                  background: '#14131a',
                  border: '1px solid rgba(250, 8%, 20%, 0.6)',
                  borderRadius: '16px',
                  padding: '40px 32px',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="font-heading"
                  style={{
                    position: 'absolute',
                    right: 16,
                    bottom: -10,
                    fontSize: 100,
                    fontWeight: 700,
                    color: '#6b3ce8',
                    opacity: 0.06,
                    userSelect: 'none',
                    lineHeight: 1,
                    pointerEvents: 'none',
                  }}
                >
                  {p.step}
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, color: '#6b3ce8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 16 }}>
                  STAGE {p.step}
                </div>

                <h3 className="font-heading" style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', marginBottom: 12, position: 'relative', zIndex: 2 }}>
                  {p.title}
                </h3>

                <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, color: '#827e99', fontSize: 14, lineHeight: 1.6, position: 'relative', zIndex: 2 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. ABOUT SECTION ── */}
      <section id="about" style={{ padding: '100px 5vw', background: 'rgba(10, 10, 15, 0.55)', borderTop: '1px solid rgba(250, 8%, 20%, 0.5)' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '60px', alignItems: 'center' }} className="about-split">
          
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b3ce8', marginBottom: 12 }}>
              ABOUT MINTOBABY &amp; BOT INTERFACES
            </div>
            <h2
              className="font-heading"
              style={{
                fontSize: 'clamp(36px, 4.5vw, 64px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.05,
                marginBottom: 24,
              }}
            >
              Three ways to deploy. High speed by design.
            </h2>

            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300, color: '#827e99', fontSize: 16, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              <p>
                MINTOBABY was engineered to eliminate execution delays in Web3 minting. You can run and interact with the bot through <strong style={{ color: '#ffffff' }}>3 distinct interfaces ranked by speed</strong>: the <span style={{ color: '#00ff88', fontWeight: 600 }}>CLI Terminal Engine</span> for sub-10ms raw response, the <span style={{ color: '#6b3ce8', fontWeight: 600 }}>Web Studio</span> for visual CopyMint whale tracking and automated scheduling, and the <span style={{ color: '#0088cc', fontWeight: 600 }}>Telegram Bot (@MintoBabyBot)</span> for on-the-go mobile sniping.
              </p>
              <p>
                Powered by custom Solidity Yul assembly and instant wallet private key signing, MINTOBABY delivers institutional-grade mempool execution across Robinhood Chain, Base, Ink L2, and Solana.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                '#1 CLI Terminal (<10ms)',
                '#2 Web Studio (~25ms)',
                '#3 Telegram Bot (@MintoBabyBot)',
                'Yul Assembly Engine',
                'Paid Access Only'
              ].map((chip) => (
                <span
                  key={chip}
                  style={{
                    background: 'rgba(107, 60, 232, 0.12)',
                    border: '1px solid rgba(107, 60, 232, 0.35)',
                    color: '#e0e0ff',
                    fontSize: 12,
                    fontWeight: 500,
                    padding: '8px 16px',
                    borderRadius: 20,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div
            style={{
              background: '#14131a',
              border: '1px solid rgba(107, 60, 232, 0.3)',
              borderRadius: '20px',
              padding: '36px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(107, 60, 232, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>TRIPLE INTERFACE SPEED MATRIX</span>
              </div>
              <span style={{ fontSize: 11, color: '#6b3ce8', fontWeight: 600 }}>ONLINE</span>
            </div>

            <div style={{ background: '#0a0a0f', borderRadius: 12, padding: '20px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                
                <div style={{ background: '#1c1b24', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #00ff88' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>1. CLI Terminal Base</div>
                    <div style={{ fontSize: 10, color: '#827e99' }}>Fastest Raw Sub-10ms Speed</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#00ff88' }}>&lt; 10ms</span>
                </div>

                <div style={{ background: '#1c1b24', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #6b3ce8' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>2. Web Studio Website</div>
                    <div style={{ fontSize: 10, color: '#827e99' }}>Next Fastest &amp; Visual Hub</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#6b3ce8' }}>~ 25ms</span>
                </div>

                <div style={{ background: '#1c1b24', padding: '12px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #0088cc' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>3. Telegram Bot (@MintoBabyBot)</div>
                    <div style={{ fontSize: 10, color: '#827e99' }}>Mobile Chat Convenience</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0088cc' }}>Mobile Instant</span>
                </div>

              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#827e99' }}>
              <span>No Free Tier · Paid Subscriptions Only</span>
              <span style={{ color: '#6b3ce8', fontWeight: 600 }}>Multi-Chain Execution</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. START A PROJECT / PAID SUBSCRIPTION CTA ── */}
      <section
        id="contact"
        style={{
          background: 'hsl(256, 72%, 58%)',
          padding: '100px 5vw',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '1600px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 10 }}>
          
          <h2
            className="font-heading"
            style={{
              fontSize: 'clamp(42px, 5vw, 76px)',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.0,
              marginBottom: 16,
            }}
          >
            Ready to Dominate the Mempool?
          </h2>

          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              color: '#ffffff',
              fontSize: 'clamp(16px, 1.5vw, 22px)',
              maxWidth: 640,
              margin: '0 auto 40px',
              lineHeight: 1.5,
              opacity: 0.95,
            }}
          >
            Sign in with Google, buy your subscription pass, and launch the MINTOBABY Bot
          </p>

          <button
            onClick={() => openAuthWithPlan('pro')}
            style={{
              background: '#ffffff',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: 10,
              padding: '18px 36px',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>Google Login & Buy Sub ($149)</span>
            <span>→</span>
          </button>

          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 500,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: '#ffffff',
              opacity: 0.7,
              marginTop: 40,
            }}
          >
            Robinhood · Ink L2 · Base · Solana · Generated / Imported Wallets
          </div>
        </div>
      </section>

      {/* ── 9. FOOTER ── */}
      <footer
        style={{
          background: '#0a0a0f',
          padding: '60px 5vw 40px',
          borderTop: '1px solid rgba(250, 8%, 20%, 0.6)',
        }}
      >
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 24,
              marginBottom: 40,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MintoLogo size={28} />
              <span className="font-heading" style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
                MINTOBABY
              </span>
              <span style={{ fontSize: 11, color: '#827e99', marginLeft: 6 }}>BOT ENGINE</span>
            </div>

            <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#827e99' }}>
              {['Instagram', 'Behance', 'LinkedIn', 'Twitter'].map((soc) => (
                <a
                  key={soc}
                  href={`#${soc.toLowerCase()}`}
                  style={{ color: '#827e99', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#6b3ce8')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#827e99')}
                >
                  {soc}
                </a>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
              paddingTop: 24,
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: 12,
              color: '#827e99',
            }}
          >
            <div>© 2026 MINTOBABY · High-Frequency Bot Protocol · Paid Membership Only</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88' }} />
              <span>MINTOBABY Matrix Engine v2.0 Online (AutoMintExecutor.sol)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Modals */}
      <StartProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <CaseStudyModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      <AuthSubscribeModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} selectedPlanTier={selectedAuthPlan} initialBillingCycle={pricingCycle} />

      {/* Global Inline Styles */}
      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes cardSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateX(50px);
          }
          to {
            opacity: 1;
          }
        }

        @media (max-width: 900px) {
          .hidden-mobile {
            display: none !important;
          }
          .show-mobile-btn {
            display: block !important;
          }
          .hero-left-col {
            max-width: 100% !important;
            padding-right: 5vw !important;
            padding-top: 20px !important;
          }
          .hero-floating-cards {
            display: none !important;
          }
          .project-row {
            grid-template-columns: 50px 1fr 40px !important;
          }
          .project-row > div:nth-child(3) {
            display: none;
          }
          .about-split {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      </div>
    </div>
  );
}

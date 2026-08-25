import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WINE = {
  bg: '#0a0305',
  card: '#16070a',
  border: '#360d15',
  borderHover: '#731428',
  crimson: '#9b111e',
  ruby: '#dc143c',
  glow: '#ff2a5f',
  wineGlow: 'rgba(220, 20, 60, 0.25)',
  gold: '#e6c687',
  text: '#f5e6e8',
  muted: '#9e7a82',
};

export default function LandingPage() {
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<'robinhood' | 'ink' | 'solana'>('robinhood');

  return (
    <div style={{ background: WINE.bg, color: WINE.text, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>
      
      {/* ── TOP NAV BAR ── */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px', borderBottom: `1px solid ${WINE.border}`,
        backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10, 3, 5, 0.85)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${WINE.crimson}, ${WINE.glow})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${WINE.glow}`,
            fontWeight: 900, color: '#fff', fontSize: 18
          }}>⚡</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.08em', color: WINE.text }}>MINTOBABY</div>
            <div style={{ fontSize: 10, color: WINE.gold, letterSpacing: '0.15em', fontWeight: 600 }}>MATRIX ENGINE v2.0</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 32, fontSize: 14, fontWeight: 500, color: WINE.muted }}>
          <a href="#vectors" style={{ color: 'inherit', textDecoration: 'none' }}>Vectors</a>
          <a href="#multichain" style={{ color: 'inherit', textDecoration: 'none' }}>Chains</a>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Access Tiers</a>
          <a href="#cli" style={{ color: 'inherit', textDecoration: 'none' }}>Terminal CLI</a>
        </div>

        <button
          onClick={() => nav('/')}
          style={{
            background: `linear-gradient(135deg, ${WINE.crimson}, ${WINE.ruby})`,
            border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', letterSpacing: '0.05em',
            boxShadow: `0 0 24px ${WINE.wineGlow}`, transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 0 35px ${WINE.glow}`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 0 24px ${WINE.wineGlow}`; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          LAUNCH CONSOLE ↗
        </button>
      </header>

      {/* ── HERO SECTION ── */}
      <section style={{
        padding: '100px 48px 80px', maxWidth: 1200, margin: '0 auto', textAlign: 'center',
        position: 'relative'
      }}>
        {/* Background Ambient Glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 400, background: `radial-gradient(circle, ${WINE.wineGlow} 0%, transparent 70%)`,
          pointerEvents: 'none', filter: 'blur(60px)'
        }} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20,
          background: WINE.card, border: `1px solid ${WINE.border}`, marginBottom: 28, fontSize: 12,
          color: WINE.gold, fontWeight: 600, letterSpacing: '0.05em'
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: WINE.glow, boxShadow: `0 0 10px ${WINE.glow}` }} />
          MULTI-CHAIN QUANTUM MATRIX · ROBINHOOD · INK L2 · SOLANA
        </div>

        <h1 style={{
          fontSize: 'clamp(42px, 6vw, 76px)', fontWeight: 900, lineHeight: 1.05,
          letterSpacing: '-0.02em', marginBottom: 24,
          background: `linear-gradient(180deg, #ffffff 30%, ${WINE.text} 70%, ${WINE.muted} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          DOMINATE THE ON-CHAIN WINDOW.<br />
          <span style={{
            background: `linear-gradient(135deg, ${WINE.glow}, ${WINE.ruby}, ${WINE.gold})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            COPY-MINT & BLOCK-SNIPE IN MILLISECONDS.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: WINE.muted, maxWidth: 760, margin: '0 auto 40px', lineHeight: 1.6 }}>
          MintoBaby is an elite cross-chain execution matrix. Track alpha wallets, automate copy-mints, schedule block-exact launches, and execute through military-grade AES-256 encrypted fleet vectors.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 60 }}>
          <button
            onClick={() => nav('/')}
            style={{
              background: `linear-gradient(135deg, ${WINE.ruby}, ${WINE.glow})`,
              border: 'none', borderRadius: 10, padding: '16px 36px', color: '#fff',
              fontSize: 15, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.05em',
              boxShadow: `0 0 35px ${WINE.wineGlow}`
            }}
          >
            ENTER MATRIX CONSOLE →
          </button>
          <a
            href="#cli"
            style={{
              background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 10,
              padding: '16px 36px', color: WINE.text, fontSize: 15, fontWeight: 700,
              textDecoration: 'none', display: 'inline-block'
            }}
          >
            TERMINAL CLI GUIDE
          </a>
        </div>

        {/* Live Latency Telemetry Banner */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
          background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 16,
          padding: 24, textAlign: 'left'
        }}>
          {[
            { label: 'AVERAGE LATENCY', val: '0.04 ms', sub: 'Direct Sequencer Route' },
            { label: 'SUPPORTED CHAINS', val: 'Robinhood · Ink · Solana', sub: 'EVM 4663 / 57073 + SVM' },
            { label: 'COPY-MINT SPEED', val: '< 50 ms', sub: 'Sub-Block Replay Mirror' },
            { label: 'ENCRYPTION VAULT', val: 'AES-256-GCM', sub: 'Zero-Server Key Storage' }
          ].map((s, i) => (
            <div key={i} style={{ borderRight: i < 3 ? `1px solid ${WINE.border}` : 'none', paddingRight: 16 }}>
              <div style={{ fontSize: 10, color: WINE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: WINE.text, margin: '4px 0' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: WINE.muted }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4 COMMAND VECTORS SECTION ── */}
      <section id="vectors" style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>ARCHITECTURE</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: WINE.text }}>THE 4 COMMAND VECTORS</h2>
          <p style={{ color: WINE.muted, fontSize: 15, marginTop: 8 }}>Engineered from first principles for competitive on-chain operators.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {[
            {
              num: 'VECTOR 01',
              title: '📡 Alpha Copy-Mint Radar',
              desc: 'Monitor target whale or alpha minter wallets across Robinhood Chain, Ink L2, and Solana. The instant an alpha wallet mints, MintoBaby parses the calldata, validates max price caps, and mirrors the transaction across your wallet fleet within milliseconds.',
              tag: 'REPLAY ENGINE'
            },
            {
              num: 'VECTOR 02',
              title: '⏰ 50ms Quantum Block Scheduler',
              desc: 'Target exact drop opening blocks on ERC721 contracts, SeaDrop v1.0, and Solana Candy Machines. Wakes up 10 seconds before launch and engages an ultra-fast 50ms strike loop to guarantee top-of-block positioning.',
              tag: 'PRECISION TIMING'
            },
            {
              num: 'VECTOR 03',
              title: '💳 Multi-Key Fleet Vault',
              desc: 'Group, seed, fund, and sweep wallets across EVM and Solana SVM. All private keys are encrypted locally using AES-256-GCM. Your keys never leave your machine unencrypted.',
              tag: 'FLEET SECURITY'
            },
            {
              num: 'VECTOR 04',
              title: '🔍 Preflight Guard & Simulator',
              desc: 'Simulate gas, verify ETH/SOL balance, detect anti-bot reverts, and inspect spending limits before broadcasting. Prevents wasted gas fees and failed transactions during high-stakes runs.',
              tag: 'SAFETY RAIL'
            }
          ].map(v => (
            <div
              key={v.num}
              style={{
                background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 16,
                padding: 32, position: 'relative', overflow: 'hidden', transition: 'border-color 0.3s'
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = WINE.glow)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = WINE.border)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: WINE.gold, letterSpacing: '0.15em' }}>{v.num}</span>
                <span style={{ fontSize: 10, background: WINE.border, color: WINE.text, padding: '4px 10px', borderRadius: 12, fontWeight: 700 }}>{v.tag}</span>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: WINE.text, marginBottom: 12 }}>{v.title}</h3>
              <p style={{ color: WINE.muted, fontSize: 14, lineHeight: 1.7 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MULTI-CHAIN ARSENAL TABBED SECTION ── */}
      <section id="multichain" style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 24, padding: 48 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
            <div>
              <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>CROSS-CHAIN SUPPORT</div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: WINE.text }}>MULTI-CHAIN ARSENAL</h2>
            </div>
            <div style={{ display: 'flex', gap: 8, background: WINE.bg, padding: 6, borderRadius: 12, border: `1px solid ${WINE.border}` }}>
              {(['robinhood', 'ink', 'solana'] as const).map(net => (
                <button
                  key={net}
                  onClick={() => setActiveTab(net)}
                  style={{
                    background: activeTab === net ? `linear-gradient(135deg, ${WINE.crimson}, ${WINE.ruby})` : 'transparent',
                    border: 'none', borderRadius: 8, padding: '8px 20px', color: activeTab === net ? '#fff' : WINE.muted,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'robinhood' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: WINE.glow, marginBottom: 12 }}>Robinhood Chain (Chain ID 4663)</h3>
                <p style={{ color: WINE.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  Robinhood Chain uses a ultra-fast FIFO sequencer ordering model. Whoever reaches the RPC sequencer first gets included. MintoBaby establishes direct WebSocket & raw JSON-RPC connections to execute sub-second mints.
                </p>
                <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                  <li>Direct raw transaction serialization via <code>eth-account</code></li>
                  <li>Support for SeaDrop v1.0 contracts and ERC721 public mints</li>
                  <li>Automatic gas estimation + 25% safety buffer</li>
                </ul>
              </div>
              <div style={{ background: WINE.bg, border: `1px solid ${WINE.border}`, borderRadius: 16, padding: 24, fontFamily: 'monospace', fontSize: 13, color: WINE.gold }}>
                <div>RPC: https://rpc.mainnet.chain.robinhood.com</div>
                <div>Chain ID: 4663</div>
                <div>Sequencer: FIFO (First In, First Out)</div>
                <div style={{ color: WINE.glow, marginTop: 12 }}>STATUS: OPTIMIZED & READY</div>
              </div>
            </div>
          )}

          {activeTab === 'ink' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#00ccff', marginBottom: 12 }}>Ink L2 — Kraken (Chain ID 57073)</h3>
                <p style={{ color: WINE.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  Kraken’s high-throughput L2 built on OP Stack. High liquidity and fast block times require instant calldata submission and priority fee matching.
                </p>
                <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                  <li>Optimism Superchain L2 priority gas routing</li>
                  <li>Full ERC721, ERC1155 & custom launchpad compatibility</li>
                  <li>Cross-fleet ETH auto-funding</li>
                </ul>
              </div>
              <div style={{ background: WINE.bg, border: `1px solid ${WINE.border}`, borderRadius: 16, padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#00ccff' }}>
                <div>RPC: https://rpc-gel.inkonchain.com</div>
                <div>Chain ID: 57073</div>
                <div>Stack: OP Stack L2</div>
                <div style={{ color: WINE.glow, marginTop: 12 }}>STATUS: OPTIMIZED & READY</div>
              </div>
            </div>
          )}

          {activeTab === 'solana' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 24, fontWeight: 800, color: '#9945FF', marginBottom: 12 }}>Solana SVM Mainnet</h3>
                <p style={{ color: WINE.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  High-speed non-EVM execution vector. Supports Solana Candy Machine v3, Launchpads, and direct program instruction minting via Base58 keypairs.
                </p>
                <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
                  <li>Base58 keypair encryption & fleet management</li>
                  <li>Priority fee escalation for high-congestion mints</li>
                  <li>Candy Machine guard verification & auto-minting</li>
                </ul>
              </div>
              <div style={{ background: WINE.bg, border: `1px solid ${WINE.border}`, borderRadius: 16, padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#9945FF' }}>
                <div>RPC: https://api.mainnet-beta.solana.com</div>
                <div>Architecture: SVM</div>
                <div>Key Format: Base58 Ed25519</div>
                <div style={{ color: WINE.glow, marginTop: 12 }}>STATUS: OPTIMIZED & READY</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TERMINAL CLI DEMO SECTION ── */}
      <section id="cli" style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>STANDALONE TOOLING</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: WINE.text }}>TERMINAL CLI ARSENAL</h2>
          <p style={{ color: WINE.muted, fontSize: 15, marginTop: 8 }}>Run directly from your terminal on any server, laptop, or SSH session. Zero web dependencies.</p>
        </div>

        <div style={{
          background: '#070204', border: `1px solid ${WINE.border}`, borderRadius: 16,
          padding: 28, fontFamily: 'monospace', fontSize: 13, color: WINE.text,
          boxShadow: `0 0 40px rgba(0,0,0,0.8)`
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff4444' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffd700' }} />
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#00ff88' }} />
            <span style={{ color: WINE.muted, marginLeft: 12, fontSize: 12 }}>mintobaby-cli — bash</span>
          </div>

          <div style={{ color: WINE.gold }}># 1. Arm Copy-Mint Radar for a target alpha wallet on Robinhood Chain</div>
          <div style={{ color: WINE.glow, marginBottom: 12 }}>$ python api/cli.py copymint add 0xAlphaWalletAddress --net robinhood --qty 2 --max-price 0.1</div>

          <div style={{ color: WINE.gold }}># 2. Schedule a block-exact strike loop for an upcoming drop on Ink L2</div>
          <div style={{ color: WINE.glow, marginBottom: 12 }}>$ python api/cli.py schedule 0xInkNFTContractAddress --net ink</div>

          <div style={{ color: WINE.gold }}># 3. Direct zero-latency mint execution</div>
          <div style={{ color: WINE.glow, marginBottom: 12 }}>$ python api/cli.py mint 0xContractAddress --qty 1 --value 0.05</div>

          <div style={{ color: '#00ff88', marginTop: 16 }}>⚡ [STATUS] Matrix armed. Listening to sequencer block stream...</div>
        </div>
      </section>

      {/* ── ACCESS TIERS / PRICING ── */}
      <section id="pricing" style={{ padding: '80px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 8 }}>ACCESS TIERS</div>
          <h2 style={{ fontSize: 36, fontWeight: 900, color: WINE.text }}>CHOOSE YOUR MATRIX PASS</h2>
          <p style={{ color: WINE.muted, fontSize: 15, marginTop: 8 }}>Transparent plans for single operators and high-volume wallet fleet managers.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {/* Tier 1 */}
          <div style={{ background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 20, padding: 32 }}>
            <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>EXPLORER</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: WINE.text, margin: '16px 0 8px' }}>FREE</div>
            <p style={{ color: WINE.muted, fontSize: 13, marginBottom: 24 }}>For single operators starting on Robinhood Chain.</p>
            <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 2, paddingLeft: 20, marginBottom: 32 }}>
              <li>Robinhood Chain (`4663`) Support</li>
              <li>Single Wallet Execution</li>
              <li>Terminal CLI & Scan Engine</li>
              <li>Community Support</li>
            </ul>
            <button onClick={() => nav('/')} style={{ width: '100%', background: 'transparent', border: `1px solid ${WINE.border}`, borderRadius: 10, padding: 14, color: WINE.text, fontWeight: 700, cursor: 'pointer' }}>
              GET STARTED
            </button>
          </div>

          {/* Tier 2 */}
          <div style={{ background: WINE.card, border: `2px solid ${WINE.glow}`, borderRadius: 20, padding: 32, position: 'relative', boxShadow: `0 0 35px ${WINE.wineGlow}` }}>
            <div style={{ position: 'absolute', top: -12, right: 24, background: WINE.glow, color: '#fff', fontSize: 10, fontWeight: 900, padding: '4px 12px', borderRadius: 12, letterSpacing: '0.1em' }}>MOST POPULAR</div>
            <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>OPERATOR PRO</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: WINE.text, margin: '16px 0 8px' }}>0.05 ETH <span style={{ fontSize: 14, color: WINE.muted, fontWeight: 400 }}>/ month</span></div>
            <p style={{ color: WINE.muted, fontSize: 13, marginBottom: 24 }}>For active snipers wanting multi-chain copy-minting.</p>
            <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 2, paddingLeft: 20, marginBottom: 32 }}>
              <li>All 3 Chains: Robinhood, Ink, Solana</li>
              <li>Copy-Minting Alpha Radar (10 Rules)</li>
              <li>50ms Quantum Block Scheduler</li>
              <li>Fleet Matrix (15 Wallets)</li>
              <li>Web Console + Telegram Bot</li>
            </ul>
            <button onClick={() => nav('/')} style={{ width: '100%', background: `linear-gradient(135deg, ${WINE.ruby}, ${WINE.glow})`, border: 'none', borderRadius: 10, padding: 14, color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 20px ${WINE.wineGlow}` }}>
              LAUNCH PRO CONSOLE
            </button>
          </div>

          {/* Tier 3 */}
          <div style={{ background: WINE.card, border: `1px solid ${WINE.border}`, borderRadius: 20, padding: 32 }}>
            <div style={{ fontSize: 12, color: WINE.gold, fontWeight: 700, letterSpacing: '0.1em' }}>ENTERPRISE FLEET</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: WINE.text, margin: '16px 0 8px' }}>0.25 ETH <span style={{ fontSize: 14, color: WINE.muted, fontWeight: 400 }}>/ month</span></div>
            <p style={{ color: WINE.muted, fontSize: 13, marginBottom: 24 }}>For high-volume funds & professional mint teams.</p>
            <ul style={{ color: WINE.text, fontSize: 13, lineHeight: 2, paddingLeft: 20, marginBottom: 32 }}>
              <li>Unlimited Multi-Chain Fleet Matrix</li>
              <li>Unlimited Copy-Minting Rules</li>
              <li>Dedicated Private RPC Failover</li>
              <li>Custom Transaction Serialization</li>
              <li>Priority Direct Support</li>
            </ul>
            <button onClick={() => nav('/')} style={{ width: '100%', background: 'transparent', border: `1px solid ${WINE.gold}`, borderRadius: 10, padding: 14, color: WINE.gold, fontWeight: 700, cursor: 'pointer' }}>
              CONTACT ENTERPRISE
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: `1px solid ${WINE.border}`, padding: '48px 48px',
        maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ fontSize: 13, color: WINE.muted }}>
          © 2026 MINTOBABY MATRIX ENGINE · MULTI-CHAIN NFT SNIPER & COPY-MINT RADAR
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
          <button onClick={() => nav('/')} style={{ background: 'none', border: 'none', color: WINE.glow, fontWeight: 700, cursor: 'pointer' }}>
            Open Web Console →
          </button>
        </div>
      </footer>

    </div>
  );
}

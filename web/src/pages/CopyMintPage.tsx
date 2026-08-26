import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { CopyMintRule, NetworkType } from '../types';

const inp: React.CSSProperties = {
  background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8,
  padding: '12px 16px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%',
};
const label: React.CSSProperties = { fontSize: 12, color: '#555', marginBottom: 6, display: 'block' };
const field = (extra?: object): React.CSSProperties => ({ marginBottom: 16, ...extra });
const btn = (color = '#00ff88', disabled = false): React.CSSProperties => ({
  background: 'transparent', border: `1px solid ${disabled ? '#333' : color}`, borderRadius: 8,
  padding: '12px 24px', color: disabled ? '#555' : color,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
});

export default function CopyMintPage() {
  const [targetWallet, setTargetWallet] = useState('');
  const [network,      setNetwork]      = useState<NetworkType>('robinhood');
  const [maxQty,       setMaxQty]       = useState('1');
  const [maxPrice,     setMaxPrice]     = useState('0.5');
  const [pk,           setPk]           = useState('');
  const [rules,        setRules]        = useState<CopyMintRule[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [msg,          setMsg]          = useState('');

  const load = useCallback(async () => {
    try {
      setRules(await api.getCopyRules());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddRule() {
    if (!targetWallet.trim() || !pk.trim()) {
      setError('Target wallet address and your private key are required.');
      return;
    }
    setSubmitting(true); setError(''); setMsg('');
    try {
      await api.addCopyRule(targetWallet.trim(), pk.trim(), network, parseInt(maxQty), maxPrice);
      setTargetWallet(''); setPk('');
      setMsg('Alpha wallet copy-mint rule active!');
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add rule');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveRule(id: string) {
    try {
      await api.removeCopyRule(id);
      await load();
    } catch {
      /* ignore */
    }
  }

  const th: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #2a2a3a' };
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #1a1a2a', color: '#e0e0ff' };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📡 Copy-Minting Radar</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>
        Track alpha & whale minters across Robinhood Chain, Ink L2, and Solana. Replay qualified mints automatically.
      </p>

      {msg && <div style={{ background: '#0d1f0d', border: '1px solid #00ff88', borderRadius: 8, padding: 12, marginBottom: 16, color: '#00ff88', fontSize: 13 }}>{msg}</div>}
      {error && <div style={{ background: '#1f0d0d', border: '1px solid #ff4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#ff4444', fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 40 }}>
        {/* Form */}
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#00ff88' }}>+ Add Target Alpha Wallet</h2>

          <div style={field()}>
            <label style={label}>Network / Chain</label>
            <select
              style={{ ...inp, cursor: 'pointer' }}
              value={network}
              onChange={e => setNetwork(e.target.value as NetworkType)}
            >
              <option value="robinhood">Robinhood Chain (EVM 4663)</option>
              <option value="ink">Ink L2 — Kraken (EVM 57073)</option>
              <option value="solana">Solana (SVM Mainnet)</option>
            </select>
          </div>

          <div style={field()}>
            <label style={label}>Target Alpha Wallet Address</label>
            <input
              style={inp}
              value={targetWallet}
              onChange={e => setTargetWallet(e.target.value)}
              placeholder={network === 'solana' ? 'Solana address (base58)...' : '0x... EVM address'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={field()}>
              <label style={label}>Max Copy Qty</label>
              <input style={inp} type="number" min={1} value={maxQty} onChange={e => setMaxQty(e.target.value)} />
            </div>
            <div style={field()}>
              <label style={label}>Max Price ({network === 'solana' ? 'SOL' : 'ETH'})</label>
              <input style={inp} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
          </div>

          <div style={field()}>
            <label style={label}>Your Execution Key <span style={{ color: '#ff4444' }}>*</span></label>
            <input
              style={inp}
              type="password"
              value={pk}
              onChange={e => setPk(e.target.value)}
              placeholder="0x... or base58 private key"
            />
          </div>

          <button style={btn('#00ff88', submitting || !targetWallet || !pk)} onClick={handleAddRule} disabled={submitting || !targetWallet || !pk}>
            {submitting ? 'Arming Copy Radar…' : '📡 Arm Copy Mirror'}
          </button>
        </div>

        {/* Info panel */}
        <div style={{ background: '#12121a', border: '1px solid #2a2a3a', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e0e0ff' }}>How Copy-Minting Works</h2>
          <ul style={{ color: '#888', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
            <li><b>Real-Time Monitoring:</b> MintoBaby watches target wallets block-by-block.</li>
            <li><b>Calldata Decoding:</b> Evaluates function calls, contract safety, and mint price.</li>
            <li><b>Preflight Safety Check:</b> Verifies max price cap & balance before sending transaction.</li>
            <li><b>Multi-Chain Execution:</b> Works across Robinhood Chain, Ink Kraken L2, and Solana.</li>
          </ul>
        </div>
      </div>

      {/* Rules list */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tracked Alpha Wallets ({rules.length})</h2>
      {loading ? (
        <div style={{ color: '#555' }}>Loading rules…</div>
      ) : rules.length === 0 ? (
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 32, textAlign: 'center', color: '#555' }}>
          No target wallets are currently tracked. Add one above to enable automatic copy-minting.
        </div>
      ) : (
        <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Target Wallet', 'Chain', 'Max Qty', 'Max Price', 'Status', 'Matches', 'Action'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td style={td}><span style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.target_wallet}</span></td>
                  <td style={td}><span style={{ textTransform: 'uppercase', fontSize: 11, color: '#00ff88', fontWeight: 600 }}>{r.network}</span></td>
                  <td style={td}>{r.max_copy_quantity}</td>
                  <td style={td}>{r.max_price_native}</td>
                  <td style={td}><span style={{ color: r.enabled ? '#00ff88' : '#888', fontWeight: 600 }}>{r.enabled ? 'ACTIVE' : 'PAUSED'}</span></td>
                  <td style={td}>{r.matches_count}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleRemoveRule(r.id)}
                      style={{ background: 'transparent', border: '1px solid #ff4444', borderRadius: 6, padding: '4px 10px', color: '#ff4444', cursor: 'pointer', fontSize: 12 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

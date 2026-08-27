import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { WalletInfo } from '../types';
import { IconWallet, IconKey, IconShieldCheck, IconExternalLink } from '../components/Icons';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

const card: React.CSSProperties = { background: '#12111a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, padding: 24, marginBottom: 16 };
const inp: React.CSSProperties = { background: '#181724', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 8, padding: '10px 14px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%' };
const btn = (color: string, disabled = false): React.CSSProperties => ({
  background: disabled ? '#171622' : 'transparent', border: `1px solid ${disabled ? '#2a2a3a' : color}`, borderRadius: 8,
  padding: '10px 20px', color: disabled ? '#555' : color,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 6
});

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [importKey, setImportKey] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exportedPk, setExportedPk] = useState<string | null>(null);
  const [showPk, setShowPk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setWallet(await api.getWallet()); }
    catch { setWallet(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(''), 4000); }

  async function generate() {
    if (wallet && !confirm('This will replace your current wallet. Are you sure?')) return;
    setBusy(true); setError('');
    try { setWallet(await api.generateWallet()); flash('New wallet generated!'); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  }

  async function doImport() {
    if (!importKey.trim()) return;
    setBusy(true); setError('');
    try {
      setWallet(await api.importWallet(importKey.trim()));
      setShowImport(false); setImportKey(''); flash('Wallet imported!');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Import failed'); }
    finally { setBusy(false); }
  }

  async function doExport() {
    if (!confirm('This will reveal your private key in the browser. Never share it.')) return;
    setBusy(true); setError('');
    try { const r = await api.exportWallet(); setExportedPk(r.private_key ?? null); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Export failed'); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    if (!confirm('Delete wallet from server? You will need to import a new one.')) return;
    setBusy(true);
    try { await api.deleteWallet(); setWallet(null); setExportedPk(null); flash('Wallet deleted.'); }
    catch { /* ignore */ }
    finally { setBusy(false); }
  }

  if (loading) return <div style={{ color: '#827e99' }}>Loading wallet details…</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24, color: '#ffffff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <IconWallet size={24} color="#b877ff" />
        <span>Multi-Key Wallet Vault</span>
      </h1>

      {msg && <div style={{ background: '#0d1f0d', border: '1px solid #00ff88', borderRadius: 8, padding: 12, marginBottom: 16, color: '#00ff88', fontSize: 13 }}>{msg}</div>}
      {error && <div style={{ background: '#1f0d0d', border: '1px solid #ff4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#ff4444', fontSize: 13 }}>{error}</div>}

      {wallet ? (
        <div style={card}>
          <div style={{ fontSize: 12, color: '#827e99', marginBottom: 4, fontWeight: 600 }}>Wallet Public Address</div>
          <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#ffffff', wordBreak: 'break-all', marginBottom: 6, fontWeight: 700 }}>{wallet.address}</div>
          <a href={`${EXPLORER}/address/${wallet.address}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#00ccff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span>View on Blockscout</span>
            <IconExternalLink size={12} />
          </a>
          <div style={{ marginTop: 20, fontSize: 32, fontWeight: 900, color: '#00ff88' }}>{wallet.balance_eth} ETH</div>
        </div>
      ) : (
        <div style={{ ...card, textAlign: 'center', color: '#827e99' }}>
          No wallet configured. Generate or import one below.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button style={btn('#00ff88', busy)} onClick={generate} disabled={busy}>Generate New Keypair</button>
        <button style={btn('#827e99', busy)} onClick={() => setShowImport(v => !v)} disabled={busy}>Import Keypair</button>
        {wallet && <button style={btn('#ffd700', busy)} onClick={doExport} disabled={busy}>Export Key</button>}
      </div>

      {showImport && (
        <div style={{ ...card, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <div style={{ fontSize: 12, color: '#827e99', marginBottom: 8, fontWeight: 600 }}>Paste private key (EVM 0x... or Solana base58)</div>
          <input style={{ ...inp, marginBottom: 12 }} type="password" value={importKey} onChange={e => setImportKey(e.target.value)} placeholder="0x..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn('#00ff88', busy || !importKey)} onClick={doImport} disabled={busy || !importKey}>Import Key</button>
            <button style={btn('#827e99')} onClick={() => setShowImport(false)}>Cancel</button>
          </div>
        </div>
      )}

      {exportedPk && (
        <div style={{ ...card, border: '1px solid #ff4444', background: '#1f0d0d' }}>
          <div style={{ color: '#ff4444', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconShieldCheck size={18} />
            <span>PRIVATE KEY - KEEP CONFIDENTIAL</span>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', filter: showPk ? 'none' : 'blur(6px)', userSelect: showPk ? 'text' : 'none', color: '#ffffff', background: '#000000', padding: 12, borderRadius: 6 }}>
            {exportedPk}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={btn('#ffd700')} onClick={() => setShowPk(v => !v)}>{showPk ? 'Hide Key' : 'Reveal Key'}</button>
            <button style={btn('#827e99')} onClick={() => { setExportedPk(null); setShowPk(false); }}>Close</button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      {wallet && (
        <div style={{ ...card, border: '1px solid rgba(255, 68, 68, 0.3)', marginTop: 32 }}>
          <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 8 }}>Danger Zone</div>
          <button style={{ ...btn('#ff4444'), padding: '8px 16px', fontSize: 13 }} onClick={doDelete}>Delete Wallet from Server</button>
        </div>
      )}
    </div>
  );
}

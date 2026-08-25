import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { WalletInfo } from '../types';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

const card: React.CSSProperties = { background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 24, marginBottom: 16 };
const inp: React.CSSProperties  = { background: '#12121a', border: '1px solid #2a2a3a', borderRadius: 8, padding: '10px 14px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%' };
const btn = (color: string, disabled = false): React.CSSProperties => ({
  background: 'transparent', border: `1px solid ${disabled ? '#333' : color}`, borderRadius: 8,
  padding: '10px 20px', color: disabled ? '#555' : color,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
});

export default function WalletPage() {
  const [wallet,     setWallet]     = useState<WalletInfo | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [importKey,  setImportKey]  = useState('');
  const [showImport, setShowImport] = useState(false);
  const [exportedPk, setExportedPk] = useState<string | null>(null);
  const [showPk,     setShowPk]     = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState('');
  const [msg,        setMsg]        = useState('');

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

  if (loading) return <div style={{ color: '#555' }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>💳 Wallet</h1>

      {msg   && <div style={{ background: '#0d1f0d', border: '1px solid #00ff88', borderRadius: 8, padding: 12, marginBottom: 16, color: '#00ff88', fontSize: 13 }}>{msg}</div>}
      {error && <div style={{ background: '#1f0d0d', border: '1px solid #ff4444', borderRadius: 8, padding: 12, marginBottom: 16, color: '#ff4444', fontSize: 13 }}>{error}</div>}

      {wallet ? (
        <div style={card}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Address</div>
          <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#e0e0ff', wordBreak: 'break-all', marginBottom: 4 }}>{wallet.address}</div>
          <a href={`${EXPLORER}/address/${wallet.address}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#555' }}>View on Blockscout ↗</a>
          <div style={{ marginTop: 16, fontSize: 28, fontWeight: 700, color: '#00ff88' }}>{wallet.balance_eth} ETH</div>
        </div>
      ) : (
        <div style={{ ...card, textAlign: 'center', color: '#555' }}>
          No wallet configured. Generate or import one below.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button style={btn('#00ff88', busy)} onClick={generate} disabled={busy}>⊕ Generate</button>
        <button style={btn('#888',    busy)} onClick={() => setShowImport(v => !v)} disabled={busy}>↓ Import</button>
        {wallet && <button style={btn('#ffd700', busy)} onClick={doExport} disabled={busy}>↑ Export Key</button>}
      </div>

      {showImport && (
        <div style={{ ...card, border: '1px solid #444' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>Paste private key</div>
          <input style={{ ...inp, marginBottom: 12 }} type="password" value={importKey} onChange={e => setImportKey(e.target.value)} placeholder="0x..." />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btn('#00ff88', busy || !importKey)} onClick={doImport} disabled={busy || !importKey}>Import</button>
            <button style={btn('#555')} onClick={() => setShowImport(false)}>Cancel</button>
          </div>
        </div>
      )}

      {exportedPk && (
        <div style={{ ...card, border: '1px solid #ff4444', background: '#1f0d0d' }}>
          <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 8 }}>⚠ PRIVATE KEY — NEVER SHARE</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', filter: showPk ? 'none' : 'blur(6px)', userSelect: showPk ? 'text' : 'none', color: '#e0e0ff' }}>
            {exportedPk}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={btn('#ffd700')} onClick={() => setShowPk(v => !v)}>{showPk ? 'Hide' : 'Reveal'}</button>
            <button style={btn('#888')} onClick={() => { setExportedPk(null); setShowPk(false); }}>Close</button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      {wallet && (
        <div style={{ ...card, border: '1px solid #2a1a1a', marginTop: 32 }}>
          <div style={{ color: '#ff4444', fontWeight: 600, marginBottom: 8 }}>Danger Zone</div>
          <button style={{ ...btn('#ff4444'), padding: '8px 16px', fontSize: 13 }} onClick={doDelete}>Delete Wallet from Server</button>
        </div>
      )}
    </div>
  );
}

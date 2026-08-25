import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api';
import type { MintResult, DiscoveryResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';

const EXPLORER = 'https://robinhoodchain.blockscout.com';

const inp: React.CSSProperties = {
  background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 8,
  padding: '12px 16px', color: '#e0e0ff', fontSize: 14, outline: 'none', width: '100%',
};
const label: React.CSSProperties = { fontSize: 12, color: '#555', marginBottom: 6, display: 'block' };
const field = (extra?: object): React.CSSProperties => ({ marginBottom: 16, ...extra });
const btn = (color = '#00ff88', disabled = false): React.CSSProperties => ({
  background: disabled ? '#1a1a24' : 'transparent',
  border: `1px solid ${disabled ? '#333' : color}`,
  borderRadius: 8, padding: '12px 24px', color: disabled ? '#555' : color,
  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
});

export default function MintPage() {
  const loc      = useLocation();
  const state    = loc.state as { contract?: string; price?: string } | null;

  const [contract, setContract] = useState(state?.contract ?? '');
  const [qty,      setQty]      = useState('1');
  const [value,    setValue]    = useState(state?.price ?? '0');
  const [pk,       setPk]       = useState('');
  const [scanning, setScanning] = useState(false);
  const [minting,  setMinting]  = useState(false);
  const [info,     setInfo]     = useState<DiscoveryResult | null>(null);
  const [result,   setResult]   = useState<MintResult | null>(null);
  const [error,    setError]    = useState('');

  async function doScan() {
    if (!contract.trim()) return;
    setScanning(true); setInfo(null); setError('');
    try {
      const r = await api.scan(contract.trim());
      setInfo(r);
      if (r.price_eth && r.price_eth !== '0.000000') setValue(r.price_eth);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally { setScanning(false); }
  }

  async function doMint() {
    if (!contract || !pk) { setError('Contract address and private key are required.'); return; }
    setMinting(true); setResult(null); setError('');
    try {
      const r = await api.executeMint(contract.trim(), parseInt(qty), value, pk.trim());
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Mint failed');
    } finally { setMinting(false); }
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>⚡ Mint Now</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>

        {/* Left: form */}
        <div>
          <div style={field()}>
            <label style={label}>Contract Address</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={inp} value={contract} onChange={e => setContract(e.target.value)} placeholder="0x..." />
              <button style={{ ...btn('#888'), whiteSpace: 'nowrap' }} onClick={doScan} disabled={scanning}>
                {scanning ? '…' : 'Scan'}
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={field()}>
              <label style={label}>Quantity</label>
              <input style={inp} type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div style={field()}>
              <label style={label}>Value (ETH)</label>
              <input style={inp} value={value} onChange={e => setValue(e.target.value)} placeholder="0.05" />
            </div>
          </div>
          <div style={field()}>
            <label style={label}>Private Key <span style={{ color: '#ff4444' }}>*</span></label>
            <input style={inp} type="password" value={pk} onChange={e => setPk(e.target.value)} placeholder="0x... (never stored)" />
          </div>
          {error && <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button style={btn('#00ff88', minting || !contract || !pk)} onClick={doMint} disabled={minting || !contract || !pk}>
            {minting ? '⏳ Minting…' : '⚡ Execute Mint'}
          </button>
        </div>

        {/* Right: info + result */}
        <div>
          {info && (
            <div style={{ background: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>{info.name ?? 'Unknown'} {info.symbol && `(${info.symbol})`}</div>
                <StatusBadge status={info.phase_status} />
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>Price: <span style={{ color: '#00ff88' }}>{info.price_eth} ETH</span></div>
              {!info.is_live && <div style={{ fontSize: 12, color: '#ffd700', marginTop: 8 }}>⚠ Mint is not currently live</div>}
            </div>
          )}

          {result && (
            <div style={{
              background: result.success ? '#0d1f0d' : '#1f0d0d',
              border: `1px solid ${result.success ? '#00ff88' : '#ff4444'}`,
              borderRadius: 12, padding: 20,
            }}>
              {result.success ? (
                <>
                  <div style={{ color: '#00ff88', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>✅ MINT CONFIRMED!</div>
                  <div style={{ fontSize: 13, display: 'grid', gap: 6 }}>
                    <div>Block: <span style={{ color: '#e0e0ff' }}>{result.block_number}</span></div>
                    <div>Gas: <span style={{ color: '#e0e0ff' }}>{result.gas_used}</span></div>
                    <div>Function: <span style={{ color: '#e0e0ff', fontFamily: 'monospace' }}>{result.function_used}</span></div>
                    <div style={{ marginTop: 8 }}>
                      <a href={`${EXPLORER}/tx/${result.tx_hash}`} target="_blank" rel="noreferrer"
                        style={{ color: '#00ff88', fontSize: 12 }}>
                        View on Blockscout ↗
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ color: '#ff4444', fontWeight: 700, marginBottom: 8 }}>❌ MINT FAILED</div>
                  <div style={{ fontSize: 13, color: '#ccc' }}>{result.error}</div>
                  {result.tx_hash && (
                    <a href={`${EXPLORER}/tx/${result.tx_hash}`} target="_blank" rel="noreferrer"
                      style={{ color: '#ff8888', fontSize: 12, marginTop: 8, display: 'block' }}>
                      View TX on Blockscout ↗
                    </a>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

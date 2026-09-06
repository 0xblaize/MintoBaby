import { IconWallet, IconExternalLink } from '../components/Icons';
import { useWallet } from '../context/WalletContext';

const EXPLORER = 'https://robinhoodchain.blockscout.com';
const card: React.CSSProperties = { background: '#12111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 16 };
const button: React.CSSProperties = { background: '#7c5af0', border: 0, borderRadius: 8, padding: '11px 20px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 };

export default function WalletPage() {
  const { address, balance, busy, error, connect, disconnect } = useWallet();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}><IconWallet size={24} color="#b877ff" /><span>External Wallet Connection</span></h1>
      <div style={{ ...card, border: '1px solid rgba(124,90,240,0.4)' }}>
        <div style={{ fontSize: 13, color: '#9896b0', lineHeight: 1.6, marginBottom: 20 }}>Connect MetaMask, Rabby, WalletConnect, or another compatible external wallet. MintoBaby never receives, generates, stores, or exports your private key.</div>
        {address ? <><div style={{ fontSize: 12, color: '#827e99', marginBottom: 4, fontWeight: 600 }}>Connected Public Address</div><div style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', wordBreak: 'break-all', marginBottom: 8 }}>{address}</div><a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#00ccff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View on Blockscout <IconExternalLink size={12} /></a><div style={{ marginTop: 20, fontSize: 30, fontWeight: 900, color: '#00ff88' }}>{balance} ETH</div><button type="button" onClick={disconnect} style={{ ...button, marginTop: 20, background: 'transparent', border: '1px solid #827e99', color: '#9896b0' }}>Disconnect Wallet</button></> : <button type="button" onClick={connect} disabled={busy} style={{ ...button, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Opening WalletConnect...' : 'Connect External Wallet'}</button>}
        {error && <div style={{ marginTop: 16, color: '#ff5555', fontSize: 13 }}>{error}</div>}
      </div>
      <div style={{ ...card, color: '#9896b0', fontSize: 13, lineHeight: 1.6 }}>Website transactions should be approved in your connected wallet. Automated private-key workflows remain available separately through the existing Terminal and Telegram bot flows.</div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import EthereumProvider from '@walletconnect/ethereum-provider';
import { IconWallet, IconExternalLink } from '../components/Icons';

type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;

const EXPLORER = 'https://robinhoodchain.blockscout.com';
const CHAIN_ID = 4663;
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';
const card: React.CSSProperties = { background: '#12111a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24, marginBottom: 16 };
const button: React.CSSProperties = { background: '#7c5af0', border: 0, borderRadius: 8, padding: '11px 20px', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 };

export default function WalletPage() {
  const [provider, setProvider] = useState<WalletConnectProvider | null>(null);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshBalance = async (walletProvider: WalletConnectProvider, walletAddress: string) => {
    const raw = await walletProvider.request<string>({ method: 'eth_getBalance', params: [walletAddress, 'latest'] });
    setBalance((Number(BigInt(raw)) / 1e18).toFixed(6));
  };

  const disconnect = async () => {
    await provider?.disconnect();
    setProvider(null);
    setAddress('');
    setBalance('0');
  };

  const connect = async () => {
    setBusy(true);
    setError('');
    try {
      const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
      if (!projectId) throw new Error('WalletConnect is not configured. Add VITE_WALLETCONNECT_PROJECT_ID to the root .env.');
      const walletProvider = await EthereumProvider.init({
        projectId,
        chains: [CHAIN_ID],
        optionalChains: [CHAIN_ID],
        rpcMap: { [CHAIN_ID]: RPC_URL },
        showQrModal: true,
        metadata: { name: 'MintoBaby', description: 'MintoBaby website wallet connection', url: window.location.origin, icons: [] },
      });
      await walletProvider.connect();
      const accounts = await walletProvider.request<string[]>({ method: 'eth_accounts' });
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error('No wallet account was returned.');
      setProvider(walletProvider);
      setAddress(walletAddress);
      await refreshBalance(walletProvider, walletAddress);
      walletProvider.on('accountsChanged', (accounts: string[]) => {
        const next = accounts[0] || '';
        setAddress(next);
        if (next) void refreshBalance(walletProvider, next);
        else setBalance('0');
      });
      walletProvider.on('chainChanged', () => {
        if (address) void refreshBalance(walletProvider, address);
      });
      walletProvider.on('disconnect', () => {
        setProvider(null);
        setAddress('');
        setBalance('0');
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect wallet.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => { void provider?.disconnect(); }, [provider]);

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 24, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}><IconWallet size={24} color="#b877ff" /><span>Website Wallet Connection</span></h1>
      <div style={{ ...card, border: '1px solid rgba(124,90,240,0.4)' }}>
        <div style={{ fontSize: 13, color: '#9896b0', lineHeight: 1.6, marginBottom: 20 }}>Connect your external wallet to the website. Your private key never enters or gets stored by MintoBaby.</div>
        {address ? <><div style={{ fontSize: 12, color: '#827e99', marginBottom: 4, fontWeight: 600 }}>Connected Public Address</div><div style={{ fontFamily: 'monospace', fontSize: 15, color: '#fff', wordBreak: 'break-all', marginBottom: 8 }}>{address}</div><a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#00ccff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View on Blockscout <IconExternalLink size={12} /></a><div style={{ marginTop: 20, fontSize: 30, fontWeight: 900, color: '#00ff88' }}>{balance} ETH</div><button type="button" onClick={disconnect} style={{ ...button, marginTop: 20, background: 'transparent', border: '1px solid #827e99', color: '#9896b0' }}>Disconnect Wallet</button></> : <button type="button" onClick={connect} disabled={busy} style={{ ...button, cursor: busy ? 'wait' : 'pointer' }}>{busy ? 'Opening WalletConnect...' : 'Connect Wallet'}</button>}
        {error && <div style={{ marginTop: 16, color: '#ff5555', fontSize: 13 }}>{error}</div>}
      </div>
      <div style={{ ...card, color: '#9896b0', fontSize: 13, lineHeight: 1.6 }}>Private-key import, export, and signing remain available only through the Terminal and Telegram bot flows.</div>
    </div>
  );
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import EthereumProvider from '@walletconnect/ethereum-provider';

type WalletConnectProvider = Awaited<ReturnType<typeof EthereumProvider.init>>;

const CHAIN_ID = 4663;
const RPC_URL = 'https://rpc.mainnet.chain.robinhood.com';

type WalletState = {
  provider: WalletConnectProvider | null;
  address: string;
  balance: string;
  busy: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<WalletConnectProvider | null>(null);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshBalance = useCallback(async (walletProvider: WalletConnectProvider, walletAddress: string) => {
    const raw = await walletProvider.request<string>({ method: 'eth_getBalance', params: [walletAddress, 'latest'] });
    setBalance((Number(BigInt(raw)) / 1e18).toFixed(6));
  }, []);

  const clearWallet = useCallback(() => {
    setProvider(null);
    setAddress('');
    setBalance('0');
  }, []);

  const disconnect = useCallback(async () => {
    await provider?.disconnect();
    clearWallet();
  }, [clearWallet, provider]);

  const connect = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const projectId = __MINTOBABY_CONFIG__.walletConnectProjectId.trim();
      if (!projectId) throw new Error('WalletConnect is not configured. Add WALLETCONNECT_PROJECT_ID to the root .env.');
      const walletProvider = await EthereumProvider.init({
        projectId,
        chains: [CHAIN_ID],
        optionalChains: [CHAIN_ID],
        rpcMap: { [CHAIN_ID]: RPC_URL },
        showQrModal: true,
        metadata: { name: 'MintoBaby', description: 'MintoBaby external wallet connection', url: window.location.origin, icons: [] },
      });
      await walletProvider.connect();
      const accounts = await walletProvider.request<string[]>({ method: 'eth_accounts' });
      const walletAddress = accounts[0];
      if (!walletAddress) throw new Error('No wallet account was returned.');
      setProvider(walletProvider);
      setAddress(walletAddress);
      await refreshBalance(walletProvider, walletAddress);
      walletProvider.on('accountsChanged', (nextAccounts: string[]) => {
        const nextAddress = nextAccounts[0] || '';
        setAddress(nextAddress);
        if (nextAddress) void refreshBalance(walletProvider, nextAddress);
        else setBalance('0');
      });
      walletProvider.on('chainChanged', () => {
        const currentAddress = walletProvider.accounts?.[0] || '';
        if (currentAddress) void refreshBalance(walletProvider, currentAddress);
      });
      walletProvider.on('disconnect', clearWallet);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect wallet.');
    } finally {
      setBusy(false);
    }
  }, [clearWallet, refreshBalance]);

  useEffect(() => () => { void provider?.disconnect(); }, [provider]);

  const value = useMemo(() => ({ provider, address, balance, busy, error, connect, disconnect }), [address, balance, busy, connect, disconnect, error, provider]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}

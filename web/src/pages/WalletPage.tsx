import { useWallet } from '../context/WalletContext';
import { Alert, Button, Card, PageHeader } from '../components/ui';
import { IconExternalLink, IconWallet } from '../components/Icons';
import { EXPLORERS } from '../types';

export default function WalletPage() {
  const { address, balance, busy, error, connect, disconnect } = useWallet();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title="Connected Wallet"
        subtitle="Link an external wallet to view balances and approve website transactions"
      />

      <Card style={{ borderColor: 'rgba(124, 90, 240, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: 'var(--mb-violet-dim)',
            border: '1px solid rgba(124,90,240,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--mb-violet)',
          }}>
            <IconWallet size={20} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--mb-text)' }}>
              {address ? 'Wallet Connected' : 'No wallet connected'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--mb-muted)' }}>Robinhood Chain (4663) via WalletConnect</div>
          </div>
        </div>

        {address ? (
          <>
            <div className="mb-kv">
              <span className="mb-kv-key">Address</span>
              <a className="mb-kv-val mb-mono mb-link" href={`${EXPLORERS.robinhood}/address/${address}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {address} <IconExternalLink size={12} />
              </a>
            </div>
            <div className="mb-kv">
              <span className="mb-kv-key">Balance</span>
              <span className="mb-kv-val" style={{ color: 'var(--mb-green)', fontSize: 16 }}>{balance} ETH</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <Button variant="ghost" onClick={disconnect}>Disconnect Wallet</Button>
            </div>
          </>
        ) : (
          <Button onClick={connect} disabled={busy}>
            {busy ? 'Opening WalletConnect…' : 'Connect External Wallet'}
          </Button>
        )}

        {error && <div style={{ marginTop: 16 }}><Alert kind="error">{error}</Alert></div>}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12.5, color: 'var(--mb-muted)', lineHeight: 1.7 }}>
          MintoBaby never receives, generates, stores, or exports your private key. Website transactions are
          always approved inside your own wallet. Automated key-custody workflows (Telegram bot, Terminal CLI)
          are handled separately by the bot engine.
        </div>
      </Card>
    </div>
  );
}

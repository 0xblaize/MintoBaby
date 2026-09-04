import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

void bs58;
import type { Config } from '../config.js';

export type SolanaWallet = { address: string; privateKey: string };

export class SolanaWalletManager {
  constructor(private readonly config: Config) {}

  generate(): SolanaWallet {
    const keypair = Keypair.generate();
    const privateKey = bs58.encode(keypair.secretKey);
    return { address: keypair.publicKey.toBase58(), privateKey };
  }

  import(privateKey: string): SolanaWallet {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey.trim()));
    return { address: keypair.publicKey.toBase58(), privateKey: privateKey.trim() };
  }

  async getBalance(address: string): Promise<string> {
    const response = await fetch(this.config.solanaRpcUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }) });
    if (!response.ok) throw new Error('Solana RPC request failed.');
    const body = await response.json() as { result?: { value?: number }; error?: { message?: string } };
    if (body.error) throw new Error(body.error.message ?? 'Solana RPC error.');
    return ((body.result?.value ?? 0) / 1e9).toFixed(6);
  }
}

import { Wallet } from 'ethers';

export type UserWallet = {
  address: `0x${string}`;
  encryptedKey: string;
  iv: string;
  tag: string;
  createdAt: number;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export class CryptoWalletManager {
  private keyPromise?: Promise<CryptoKey>;

  constructor(private readonly secretKey: string = 'mintobot-default-secret-salt-2026-rh-chain') {}

  private async getKey(): Promise<CryptoKey> {
    if (!this.keyPromise) {
      this.keyPromise = (async () => {
        const enc = new TextEncoder();
        const keyData = enc.encode(this.secretKey);
        const hash = await crypto.subtle.digest('SHA-256', keyData);
        return await crypto.subtle.importKey(
          'raw',
          hash,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      })();
    }
    return this.keyPromise;
  }

  /**
   * Encrypts a private key using Web Crypto AES-GCM (100% native on Cloudflare Workers).
   */
  async encrypt(privateKey: string): Promise<{ encryptedKey: string; iv: string; tag: string }> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(privateKey);

    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    const encryptedBytes = new Uint8Array(ciphertextBuffer);
    return {
      encryptedKey: bytesToHex(encryptedBytes),
      iv: bytesToHex(iv),
      tag: 'webcrypto-aes-gcm'
    };
  }

  /**
   * Decrypts an AES-GCM encrypted private key using Web Crypto.
   */
  async decrypt(encryptedKey: string, ivHex: string, _tagHex?: string): Promise<string> {
    const key = await this.getKey();
    const iv = hexToBytes(ivHex);
    const ciphertext = hexToBytes(encryptedKey);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }

  /**
   * Generates a new random EVM wallet for Robinhood Chain.
   */
  async generateWallet(): Promise<{ address: `0x${string}`; privateKey: string; encrypted: { encryptedKey: string; iv: string; tag: string } }> {
    const randomWallet = Wallet.createRandom();
    const address = randomWallet.address as `0x${string}`;
    const privateKey = randomWallet.privateKey;
    const encrypted = await this.encrypt(privateKey);
    return { address, privateKey, encrypted };
  }

  /**
   * Imports an existing private key.
   */
  async importWallet(privateKey: string): Promise<{ address: `0x${string}`; privateKey: string; encrypted: { encryptedKey: string; iv: string; tag: string } }> {
    const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const importedWallet = new Wallet(cleanKey);
    const address = importedWallet.address as `0x${string}`;
    const encrypted = await this.encrypt(cleanKey);
    return { address, privateKey: cleanKey, encrypted };
  }
}

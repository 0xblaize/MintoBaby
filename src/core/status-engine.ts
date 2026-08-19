import type { PublicClient } from 'viem';
import { CursorStore } from '../chain/cursor-store.js';
import { TRANSACTION_LIFECYCLE_STATES } from './storage-schema.js';

export class StatusEngine {
  constructor(private readonly store: CursorStore) {}

  registerIntent(userId: string, walletId: string, contractAddress: string): boolean {
    return this.store.registerTransactionIntent(userId, walletId, contractAddress);
  }

  transition(userId: string, contractAddress: string, status: keyof typeof TRANSACTION_LIFECYCLE_STATES, metadata: { nonce?: bigint; txHash?: string; failureReason?: string } = {}): void {
    this.store.updateTransactionStatus(userId, contractAddress, TRANSACTION_LIFECYCLE_STATES[status], metadata);
  }

  async trackReceipt(client: PublicClient, userId: string, contractAddress: string, txHash: `0x${string}`, timeoutMs = 120_000): Promise<{ success: boolean; reason?: string }> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash });
        if (receipt.status === 'success') {
          this.transition(userId, contractAddress, 'MINED_CONFIRMED', { txHash });
          return { success: true };
        }
        this.transition(userId, contractAddress, 'FAILED_TERMINATED', { txHash, failureReason: 'Transaction reverted on-chain' });
        return { success: false, reason: 'reverted' };
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    this.transition(userId, contractAddress, 'FAILED_TERMINATED', { txHash, failureReason: 'Receipt tracking timed out' });
    return { success: false, reason: 'timeout' };
  }
}

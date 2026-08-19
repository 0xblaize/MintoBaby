import { describe, expect, it } from 'vitest';
import { discoverRobinhoodContract } from '../src/core/discovery-engine.js';

const address = '0x0000000000000000000000000000000000000001' as `0x${string}`;

describe('Robinhood contract discovery', () => {
  it('rejects a non-Robinhood RPC', async () => {
    const client = { getChainId: async () => 1 } as never;
    await expect(discoverRobinhoodContract(client, address)).resolves.toMatchObject({ status: 'UNCLASSIFIED_DISABLED' });
  });
  it('rejects invalid addresses', async () => {
    const client = { getChainId: async () => 4663 } as never;
    await expect(discoverRobinhoodContract(client, 'bad')).resolves.toMatchObject({ status: 'UNCLASSIFIED_DISABLED' });
  });

  it('returns optional collection and wallet preflight data when exposed', async () => {
    const values: Record<string, unknown> = {
      mintPrice: 1000000000000000n,
      isPublicMintActive: true,
      name: 'Example Collection',
      symbol: 'EX',
      totalSupply: 25n,
      maxSupply: 100n,
      maxMintAmountPerWallet: 5n,
      mintedPerWallet: 2n
    };
    const client = {
      getChainId: async () => 4663,
      getBytecode: async () => '0x6000',
      readContract: async ({ functionName }: { functionName: string }) => {
        if (!(functionName in values)) throw new Error('method unavailable');
        return values[functionName];
      }
    } as never;
    const result = await discoverRobinhoodContract(client, address, address);
    expect(result).toMatchObject({
      status: 'CLASSIFIED_SAFE',
      metadata: { name: 'Example Collection', symbol: 'EX', totalSupply: 25n, maxSupply: 100n, maxPerWallet: 5n, alreadyMintedByWallet: 2n }
    });
  });
});

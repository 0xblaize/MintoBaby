import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const source = readFileSync(resolve(root, 'contracts/AutoMintExecutor.sol'), 'utf8');
const artifact = JSON.parse(readFileSync(resolve(root, 'contracts/AutoMintExecutor.json'), 'utf8')) as {
  contractName: string;
  abi: Array<{ name?: string; type: string }>;
};

describe('AutoMintExecutor safety boundary', () => {
  it('exposes only the typed recipient-aware mint entrypoint', () => {
    expect(artifact.contractName).toBe('AutoMintExecutor');
    expect(artifact.abi.some((item) => item.name === 'executeMintTo')).toBe(true);
    expect(artifact.abi.some((item) => item.name === 'executeMintToByRecipient')).toBe(true);
    expect(source).toContain('executeMintToByRecipient');
    expect(artifact.abi.some((item) => item.name === 'execute')).toBe(false);
    expect(artifact.abi.some((item) => item.name === 'call')).toBe(false);
  });

  it('does not use tx.origin or arbitrary calldata forwarding', () => {
    expect(source).not.toContain('tx.origin');
    expect(source).not.toContain('bytes calldata');
    expect(source).toContain('IMintTo(target).mintTo');
    expect(source).toContain('require(config.enabled, "Target disabled")');
    expect(source).toContain('require(expectedNonce == nonce, "Invalid nonce")');
  });
});

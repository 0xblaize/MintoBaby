import { describe, expect, it } from 'vitest';
import { AUTO_MINT_VAULT_ABI, ROBINHOOD_CHAIN_ID, runAutoMint } from '../src/vault/auto-mint-vault.js';
import { CursorStore } from '../src/chain/cursor-store.js';
import { existsSync, unlinkSync } from 'node:fs';

describe('AutoMintVault safety boundary', () => {
  it('describes the vault read methods and restricted inspection ABI', () => {
    const names = AUTO_MINT_VAULT_ABI.map((item) => item.type === 'function' ? item.name : undefined);
    expect(names).toContain('owner');
    expect(names).toContain('botAddress');
    expect(names).toContain('executeAutoMint');
    expect(names).toContain('configureTarget');
    expect(names).not.toContain('executeCall');
  });

  it('uses Robinhood Chain mainnet', () => {
    expect(ROBINHOOD_CHAIN_ID).toBe(4663);
  });

  it('refuses arbitrary vault execution', () => {
    expect(runAutoMint()).toEqual({
      success: false,
      error: expect.stringContaining('arbitrary target addresses and calldata')
    });
  });
});

describe('CursorStore Smart Vault Persistence', () => {
  const dbPath = './test-vault.sqlite';

  it('persists and retrieves user vaults', () => {
    if (existsSync(dbPath)) unlinkSync(dbPath);
    const store = new CursorStore(dbPath);
    const userId = 'user_12345';
    const vaultAddress = '0x2222222222222222222222222222222222222222';
    const ownerAddress = '0x3333333333333333333333333333333333333333';
    store.saveUserVault(userId, vaultAddress, ownerAddress);
    expect(store.getUserVault(userId)).toEqual({ vaultAddress, ownerAddress, isActive: true });
    expect(store.getAllActiveVaults()).toHaveLength(1);
    store.setVaultActive(userId, false);
    expect(store.getUserVault(userId)?.isActive).toBe(false);
    expect(store.getAllActiveVaults()).toHaveLength(0);
    store.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });
});

import { describe, expect, it } from 'vitest';
import { isAllowedUserId, parseAllowlist } from '../src/telegram/allowlist.js';

describe('Telegram allowlist', () => {
  it('deduplicates IDs and preserves large values as strings', () => {
    expect(parseAllowlist('1, 9007199254740993,1')).toEqual(['1', '9007199254740993']);
    expect(isAllowedUserId('9007199254740993', ['9007199254740993'])).toBe(true);
  });
  it('rejects unknown IDs', () => expect(isAllowedUserId('2', ['1'])).toBe(false));
});

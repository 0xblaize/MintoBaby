import { describe, expect, it } from 'vitest';
import { parseEventAbi } from '../src/chain/contract.js';

describe('event ABI parsing', () => {
  it('parses a valid event signature', () => {
    expect(parseEventAbi('Minted(address,uint256)')).toHaveLength(1);
  });
  it('rejects malformed signatures', () => {
    expect(() => parseEventAbi('not an event')).toThrow('Invalid event signature');
  });
});

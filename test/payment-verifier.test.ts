import { describe, expect, it, vi } from 'vitest';
import { keccak256, stringToHex } from 'viem';
import { verifyAccessPayment } from '../src/access/payment-verifier.js';

const hash = `0x${'a'.repeat(64)}` as `0x${string}`;
const recipient = '0x1111111111111111111111111111111111111111' as `0x${string}`;
const weth = '0x2222222222222222222222222222222222222222' as `0x${string}`;
const sender = '0x3333333333333333333333333333333333333333' as `0x${string}`;
const transferTopic = keccak256(stringToHex('Transfer(address,address,uint256)'));

function client(overrides: Record<string, unknown> = {}) {
  return {
    getChainId: vi.fn(async () => 4663),
    getTransaction: vi.fn(async () => ({ from: sender, to: recipient, value: 100000000000000000n })),
    getTransactionReceipt: vi.fn(async () => ({ status: 'success', blockNumber: 10n, logs: [] })),
    getBlockNumber: vi.fn(async () => 12n),
    ...overrides
  } as never;
}

function mockPrice() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ethereum: { usd: 100000 } }), { status: 200 })));
}

describe('access payment verification', () => {
  it('accepts a confirmed native ETH payment to the configured recipient', async () => {
    mockPrice();
    const result = await verifyAccessPayment(client(), { recipient, wethAddress: weth, usdAmount: 5, confirmations: 3n }, hash);
    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') expect(result.payment.asset).toBe('ETH');
  });

  it('accepts WETH only from the configured WETH Transfer log', async () => {
    mockPrice();
    const amount = 100000000000000000n.toString(16).padStart(64, '0');
    const receipt = {
      status: 'success', blockNumber: 10n,
      logs: [{
        address: weth,
        topics: [transferTopic, `0x${sender.slice(2).padStart(64, '0')}`, `0x${recipient.slice(2).padStart(64, '0')}`],
        data: `0x${amount}`,
        logIndex: 4
      }]
    };
    const result = await verifyAccessPayment(client({
      getTransaction: vi.fn(async () => ({ from: sender, to: weth, value: 0n })),
      getTransactionReceipt: vi.fn(async () => receipt)
    }), { recipient, wethAddress: weth, usdAmount: 5, confirmations: 3n }, `https://robinhoodchain.blockscout.com/tx/${hash}`);
    expect(result.status).toBe('accepted');
    if (result.status === 'accepted') expect(result.payment).toMatchObject({ asset: 'WETH', logIndex: 4 });
  });

  it('rejects wrong recipient, underpayment, reverts, and insufficient confirmations', async () => {
    mockPrice();
    const wrongRecipient = '0x4444444444444444444444444444444444444444' as `0x${string}`;
    const wrong = await verifyAccessPayment(client({ getTransaction: vi.fn(async () => ({ from: sender, to: wrongRecipient, value: 1n })) }), { recipient, wethAddress: weth, usdAmount: 5, confirmations: 3n }, hash);
    expect(wrong.status).toBe('invalid');

    const reverted = await verifyAccessPayment(client({ getTransactionReceipt: vi.fn(async () => ({ status: 'reverted', blockNumber: 10n, logs: [] })) }), { recipient, wethAddress: weth, usdAmount: 5, confirmations: 3n }, hash);
    expect(reverted.status).toBe('invalid');

    const pending = await verifyAccessPayment(client({ getBlockNumber: vi.fn(async () => 11n) }), { recipient, wethAddress: weth, usdAmount: 5, confirmations: 3n }, hash);
    expect(pending.status).toBe('pending');
  });
});

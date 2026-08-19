import { getAddress, keccak256, stringToHex, type PublicClient } from 'viem';
import { getEthUsdPrice } from '../finance/eth-price.js';

const TRANSFER_TOPIC = keccak256(stringToHex('Transfer(address,address,uint256)'));

export type PaymentVerifierConfig = {
  recipient: `0x${string}`;
  wethAddress?: `0x${string}`;
  usdAmount: number;
  confirmations: bigint;
};

export type VerifiedPayment = {
  paymentId: string;
  txHash: `0x${string}`;
  asset: 'ETH' | 'WETH';
  logIndex: number;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  amountWei: bigint;
  requiredWei: bigint;
  usdQuote: number;
  blockNumber: bigint;
};

function normalizeHash(input: string): `0x${string}` | undefined {
  const value = input.trim();
  const urlMatch = value.match(/^https:\/\/robinhoodchain\.blockscout\.com\/tx\/(0x[a-fA-F0-9]{64})\/?(?:\?.*)?$/i);
  const hash = urlMatch?.[1] ?? (value.match(/^0x[a-fA-F0-9]{64}$/)?.[0]);
  return hash ? (`0x${hash.replace(/^0x/i, '').toLowerCase()}` as `0x${string}`) : undefined;
}

function wordAddress(topic?: string): `0x${string}` | undefined {
  if (!topic || !/^0x[a-fA-F0-9]{64}$/.test(topic)) return undefined;
  return getAddress(`0x${topic.slice(-40)}`) as `0x${string}`;
}

export async function verifyAccessPayment(
  client: PublicClient,
  config: PaymentVerifierConfig,
  input: string
): Promise<{ status: 'accepted'; payment: VerifiedPayment } | { status: 'pending' | 'invalid' | 'unavailable'; reason: string }> {
  const txHash = normalizeHash(input);
  if (!txHash) return { status: 'invalid', reason: 'Send a Robinhood Blockscout transaction URL or the full 0x transaction hash.' };
  if (!Number.isFinite(config.usdAmount) || config.usdAmount <= 0) return { status: 'unavailable', reason: 'Payment configuration is incomplete.' };

  try {
    if (await client.getChainId() !== 4663) return { status: 'invalid', reason: 'The transaction is not on Robinhood Chain.' };
    const transaction = await client.getTransaction({ hash: txHash });
    if (!transaction) return { status: 'pending', reason: 'Transaction was not found yet. Wait for it to be broadcast.' };
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt) return { status: 'pending', reason: 'Transaction is still pending confirmation.' };
    if (receipt.status !== 'success') return { status: 'invalid', reason: 'The transaction reverted on-chain.' };

    const latest = await client.getBlockNumber();
    const confirmations = latest >= receipt.blockNumber ? latest - receipt.blockNumber + 1n : 0n;
    if (confirmations < config.confirmations) return { status: 'pending', reason: `Waiting for confirmations (${confirmations.toString()}/${config.confirmations.toString()}).` };

    const usdQuote = await getEthUsdPrice();
    if (!usdQuote) return { status: 'unavailable', reason: 'ETH/USD price is temporarily unavailable. Try again shortly.' };
    const requiredWei = BigInt(Math.ceil((config.usdAmount / usdQuote) * 1e18));
    const recipient = config.recipient;
    const weth = config.wethAddress?.toLowerCase();

    if (transaction.to?.toLowerCase() === recipient.toLowerCase() && transaction.value >= requiredWei) {
      return {
        status: 'accepted',
        payment: {
          paymentId: `${txHash}:ETH:-1`, txHash, asset: 'ETH', logIndex: -1,
          sender: transaction.from, recipient, amountWei: transaction.value, requiredWei, usdQuote,
          blockNumber: receipt.blockNumber
        }
      };
    }

    for (const log of receipt.logs) {
      if (!weth || log.address.toLowerCase() !== weth || log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC.toLowerCase()) continue;
      const sender = wordAddress(log.topics[1]);
      const transferRecipient = wordAddress(log.topics[2]);
      if (!sender || !transferRecipient || transferRecipient.toLowerCase() !== recipient.toLowerCase()) continue;
      if (!log.data || !/^0x[a-fA-F0-9]{64}$/.test(log.data)) continue;
      const amountWei = BigInt(log.data);
      if (amountWei < requiredWei) continue;
      const logIndex = Number(log.logIndex ?? 0);
      return {
        status: 'accepted',
        payment: {
          paymentId: `${txHash}:WETH:${logIndex}`, txHash, asset: 'WETH', logIndex,
          sender, recipient, amountWei, requiredWei, usdQuote, blockNumber: receipt.blockNumber
        }
      };
    }

    return { status: 'invalid', reason: 'Payment recipient, asset, or amount did not match the required access payment.' };
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) };
  }
}

export function parsePaymentAddress(value: string | undefined): `0x${string}` | undefined {
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) return undefined;
  return getAddress(value) as `0x${string}`;
}

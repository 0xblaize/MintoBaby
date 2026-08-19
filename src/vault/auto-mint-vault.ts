import { createPublicClient, formatEther, http, type Abi, type PublicClient } from 'viem';
import { robinhoodMainnet } from '../chain/client.js';

export const ROBINHOOD_RPC_URL = process.env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
export const ROBINHOOD_CHAIN_ID = 4663;

export const AUTO_MINT_VAULT_ABI = [
  { type: 'function', name: 'owner', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'botAddress', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'ROBINHOOD_CHAIN_ID', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approveBot', stateMutability: 'nonpayable', inputs: [{ name: '_botAddress', type: 'address' }], outputs: [] },
  { type: 'function', name: 'revokeBot', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { type: 'function', name: 'executeAutoMint', stateMutability: 'nonpayable', inputs: [{ name: 'quantity', type: 'uint256' }, { name: 'value', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'expectedNonce', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'withdrawETH', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
  { type: 'function', name: 'configureTarget', stateMutability: 'nonpayable', inputs: [{ name: 'target', type: 'address' }, { name: 'quantityLimit', type: 'uint256' }, { name: 'valueLimit', type: 'uint256' }], outputs: [] }
] as const satisfies Abi;

export const provider = createPublicClient({ chain: robinhoodMainnet, transport: http(ROBINHOOD_RPC_URL) });

export type MintResult = { success: false; error: string };

export type VaultDetails = {
  vaultAddress: `0x${string}`;
  owner: `0x${string}`;
  botAddress: `0x${string}`;
  balanceWei: bigint;
  balanceEth: string;
  isBotApproved: boolean;
};

export function getVaultContract(vaultAddress: `0x${string}`, client: PublicClient = provider): { address: `0x${string}`; abi: typeof AUTO_MINT_VAULT_ABI; client: PublicClient } {
  return { address: vaultAddress, abi: AUTO_MINT_VAULT_ABI, client };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readWithRetry<T>(read: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const rateLimited = /too many requests|429|rate limit/i.test(message);
      if (!rateLimited || attempt >= attempts - 1) throw error;
      await wait(800 * (attempt + 1));
    }
  }
}

export async function getVaultDetails(vaultAddress: string, expectedBotAddress?: string): Promise<VaultDetails> {
  const address = vaultAddress as `0x${string}`;
  const contract = getVaultContract(address);
  const owner = await readWithRetry(() => contract.client.readContract({ address: contract.address, abi: contract.abi, functionName: 'owner' }));
  const onChainBotAddress = await readWithRetry(() => contract.client.readContract({ address: contract.address, abi: contract.abi, functionName: 'botAddress' }));
  const balanceWei = await readWithRetry(() => contract.client.getBalance({ address: contract.address }));
  return {
    vaultAddress: address,
    owner,
    botAddress: onChainBotAddress,
    balanceWei,
    balanceEth: formatEther(balanceWei),
    isBotApproved: Boolean(expectedBotAddress && onChainBotAddress.toLowerCase() === expectedBotAddress.toLowerCase())
  };
}

export function runAutoMint(): MintResult {
  return {
    success: false,
    error: 'Live auto-mint execution is disabled: this vault accepts arbitrary target addresses and calldata. Deploy a constrained vault before enabling signing.'
  };
}

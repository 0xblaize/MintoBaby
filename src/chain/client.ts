import { createPublicClient, http, type PublicClient } from 'viem';
import { defineChain } from 'viem';
import type { Config } from '../config.js';

export const robinhoodMainnet = defineChain({
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } }
});

export function createChainClient(config: Config): PublicClient {
  return createPublicClient({ chain: robinhoodMainnet, transport: http(config.rpcUrl) });
}

export async function verifyMainnet(client: PublicClient, config: Config): Promise<void> {
  const chainId = await client.getChainId();
  if (chainId !== config.chainId || chainId !== robinhoodMainnet.id) {
    throw new Error(`RPC chain ID ${chainId} does not match configured Robinhood mainnet ${config.chainId}`);
  }
  const bytecode = await client.getBytecode({ address: config.contractAddress });
  if (!bytecode) throw new Error(`No deployed bytecode found at ${config.contractAddress}`);
}

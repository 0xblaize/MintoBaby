import { createPublicClient, formatEther, http, type PublicClient } from 'viem';
import { defineChain } from 'viem';
import type { Config } from '../config.js';

export type ChainMatch = { name: string; chainId: number; balance: string; explorerBaseUrl: string };

function clientFor(chain: Config['chains'][number]): PublicClient {
  const definition = defineChain({
    id: chain.chainId,
    name: chain.name,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: chain.rpcUrls } }
  });
  return createPublicClient({ chain: definition, transport: http(chain.rpcUrls[0]) });
}

export async function findContractChains(config: Config, address: `0x${string}`, wallet?: `0x${string}`): Promise<ChainMatch[]> {
  const matches: ChainMatch[] = [];
  for (const chain of config.chains) {
    try {
      const client = clientFor(chain);
      const bytecode = await client.getBytecode({ address });
      if (!bytecode) continue;
      const balance = wallet ? formatEther(await client.getBalance({ address: wallet })) : '0';
      matches.push({ name: chain.name, chainId: chain.chainId, balance, explorerBaseUrl: chain.explorerBaseUrl });
    } catch {
      continue;
    }
  }
  return matches;
}

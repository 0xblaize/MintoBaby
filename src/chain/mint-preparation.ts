import { encodeFunctionData, formatEther, getAddress, type Abi, type PublicClient } from 'viem';

export type MintPreparation = {
  eligible: boolean;
  reason?: string;
  chainId: number;
  targetAddress: `0x${string}`;
  value?: string;
  data?: `0x${string}`;
  gas?: string;
  balance: string;
};

export async function prepareMint(
  client: PublicClient,
  chainId: number,
  contractAddress: `0x${string}`,
  abi: Abi,
  walletAddress: `0x${string}`,
  mintFunction: string,
  quantity: bigint,
  value: bigint
): Promise<MintPreparation> {
  const address = getAddress(walletAddress);
  const balance = await client.getBalance({ address });
  const base = { chainId, targetAddress: contractAddress, balance: formatEther(balance) };
  if (balance < value) return { ...base, eligible: false, reason: `Insufficient funds. Need ${formatEther(value)} ETH.` };

  const data = encodeFunctionData({ abi, functionName: mintFunction, args: [quantity] });
  const gas = await client.estimateGas({ account: address, to: contractAddress, data, value });
  return { ...base, eligible: true, value: value.toString(), data, gas: gas.toString() };
}

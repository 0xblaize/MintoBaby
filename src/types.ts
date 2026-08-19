import type { Log } from 'viem';

export type DecodedEvent = {
  key: string;
  eventName: string;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  args: Record<string, unknown>;
  log: Log;
};

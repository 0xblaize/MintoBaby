import { parseAbi, type Abi, type AbiEvent } from 'viem';
import type { Config } from '../config.js';

export type MonitoredContract = { address: `0x${string}`; abi: Abi; event: AbiEvent };

export function createMonitoredContract(config: Config): MonitoredContract {
  const abi = config.abi as Abi;
  const events = abi.filter((item): item is AbiEvent => item.type === 'event');
  const event = events.find((item) => item.name === config.eventName);
  if (!event) throw new Error(`Event ${config.eventName} was not found in the supplied ABI`);
  return { address: config.contractAddress, abi, event };
}

export function parseEventAbi(eventSignature: string): Abi {
  if (!/^[A-Za-z_][A-Za-z0-9_]*\([^;]*\)$/.test(eventSignature)) throw new Error('Invalid event signature');
  const declaration = `event ${eventSignature}` as `event ${string}(${string})`;
  return parseAbi([declaration]);
}

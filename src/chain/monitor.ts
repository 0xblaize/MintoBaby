import { decodeEventLog, type Abi, type PublicClient } from 'viem';
import type { Config } from '../config.js';
import type { MonitoredContract } from './contract.js';
import { CursorStore } from './cursor-store.js';
import { formatEventNotification } from '../telegram/formatter.js';
import { TelegramClient } from '../telegram/client.js';

export async function pollOnce(client: PublicClient, config: Config, contract: MonitoredContract, store: CursorStore, telegram: TelegramClient): Promise<void> {
  const latest = await client.getBlockNumber();
  const safeHead = latest > config.confirmations ? latest - config.confirmations : 0n;
  let from = store.getCursor(config.startBlock) + 1n;
  if (from > safeHead) return;

  while (from <= safeHead) {
    const to = from + config.maxBlockRange - 1n > safeHead ? safeHead : from + config.maxBlockRange - 1n;
    const logs = await client.getLogs({ address: contract.address, event: contract.event, fromBlock: from, toBlock: to });
    for (const log of logs) {
      if (log.blockNumber === null || log.transactionHash === null || log.logIndex === undefined) continue;
      const decoded = decodeEventLog({ abi: contract.abi as Abi, data: log.data, topics: log.topics, eventName: config.eventName });
      const key = `${config.chainId}:${contract.address.toLowerCase()}:${log.transactionHash}:${log.logIndex}`;
      if (!store.insertIfNew({ key, blockNumber: log.blockNumber, txHash: log.transactionHash, logIndex: Number(log.logIndex), payload: JSON.stringify(decoded.args, (_, value) => typeof value === 'bigint' ? value.toString() : value) })) continue;
      const message = formatEventNotification({ eventName: config.eventName, address: contract.address, blockNumber: log.blockNumber, txHash: log.transactionHash, args: decoded.args, explorerBaseUrl: config.explorerBaseUrl });
      for (const userId of config.telegramUserIds) await telegram.sendMessage(userId, message);
    }
    store.setCursor(to);
    from = to + 1n;
  }
}

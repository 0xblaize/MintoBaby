import 'dotenv/config';
import { z } from 'zod';
import { privateKeyToAccount } from 'viem/accounts';

const envSchema = z.object({
  ROBINHOOD_RPC_URL: z.string().url().refine((value) => value.startsWith('https://'), 'RPC URL must use HTTPS').default('https://rpc.mainnet.chain.robinhood.com'),
  ROBINHOOD_CHAIN_ID: z.coerce.number().int().positive().default(4663),
  SOLANA_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
  SOLANA_EXPLORER_URL: z.string().url().default('https://solscan.io'),
  INK_RPC_URL: z.string().url().default('https://rpc-gel.inkonchain.com'),
  INK_CHAIN_ID: z.coerce.number().int().positive().default(57073),
  INK_EXPLORER_URL: z.string().url().default('https://explorer.inkonchain.com'),
  CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional().default('0x0000000000000000000000000000000000000000'),
  CONTRACT_ABI_JSON: z.string().optional().default('[]'),
  MONITORED_EVENT_NAME: z.string().optional().default('AutoMintExecuted'),
  START_BLOCK: z.coerce.bigint().nonnegative().default(0n),
  CONFIRMATIONS: z.coerce.bigint().positive().default(12n),
  POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  MAX_BLOCK_RANGE: z.coerce.bigint().positive().default(2000n),
  REORG_REWIND_BLOCKS: z.coerce.bigint().nonnegative().default(20n),
  DB_PATH: z.string().min(1).default('./data/monitor.sqlite'),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_ALLOWLIST_USER_IDS: z.string().optional().default(''),
  TELEGRAM_ADMIN_USER_IDS: z.string().min(1),
  BOT_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  EVM_CHAINS_JSON: z.string().optional().default('[{"name":"Robinhood Chain","chainId":4663,"rpcUrls":["https://rpc.mainnet.chain.robinhood.com"],"explorerBaseUrl":"https://robinhoodchain.blockscout.com"}]'),
  TELEGRAM_EXPLORER_BASE_URL: z.string().url().default('https://robinhoodchain.blockscout.com'),
  WEBHOOK_PORT: z.coerce.number().int().min(1).max(65535).optional().default(8787),
  PAYMENT_RECIPIENT: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  WETH_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  PAYMENT_USD_AMOUNT: z.coerce.number().positive().default(20),
  PAYMENT_CONFIRMATIONS: z.coerce.bigint().positive().default(3n),
  ENCRYPTION_SECRET: z.string().min(16).optional().default('mintobot-super-secure-key-robinhood-2026')
});

export type Config = {
  encryptionSecret: string;
  rpcUrl: string;
  chainId: number;
  solanaRpcUrl: string;
  solanaExplorerUrl: string;
  inkRpcUrl: string;
  inkChainId: number;
  inkExplorerUrl: string;
  contractAddress: `0x${string}`;
  abi: readonly unknown[];
  eventName: string;
  startBlock: bigint;
  confirmations: bigint;
  pollIntervalMs: number;
  maxBlockRange: bigint;
  reorgRewindBlocks: bigint;
  dbPath: string;
  telegramBotToken: string;
  telegramUserIds: string[];
  explorerBaseUrl: string;
  adminUserIds: string[];
  botAddress: `0x${string}`;
  botPrivateKey?: `0x${string}`;
  chains: readonly { name: string; chainId: number; rpcUrls: string[]; explorerBaseUrl: string }[];
  webhookPort: number;
  vaultAddress?: `0x${string}`;
  paymentRecipient?: `0x${string}`;
  wethAddress?: `0x${string}`;
  paymentUsdAmount: number;
  paymentConfirmations: bigint;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const values = envSchema.parse(env);
  let abi: readonly unknown[];
  try {
    const parsed: unknown = JSON.parse(values.CONTRACT_ABI_JSON);
    if (!Array.isArray(parsed)) throw new Error('ABI must be an array');
    abi = parsed;
  } catch (error) {
    throw new Error(`Invalid CONTRACT_ABI_JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const telegramUserIds = [...new Set(values.TELEGRAM_ALLOWLIST_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean))];
  const adminUserIds = [...new Set(values.TELEGRAM_ADMIN_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean))];
  if (adminUserIds.length === 0) throw new Error('TELEGRAM_ADMIN_USER_IDS must contain at least one ID');
  let chains: readonly { name: string; chainId: number; rpcUrls: string[]; explorerBaseUrl: string }[];
  try {
    const parsed: unknown = JSON.parse(values.EVM_CHAINS_JSON);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('EVM_CHAINS_JSON must be a non-empty array');
    chains = parsed.map((chain) => {
      if (!chain || typeof chain !== 'object') throw new Error('Invalid chain entry');
      const item = chain as Record<string, unknown>;
      if (typeof item.name !== 'string' || typeof item.chainId !== 'number' || !Array.isArray(item.rpcUrls) || typeof item.explorerBaseUrl !== 'string') throw new Error('Invalid chain entry');
      return { name: item.name, chainId: item.chainId, rpcUrls: item.rpcUrls.map(String), explorerBaseUrl: item.explorerBaseUrl };
    });
  } catch (error) {
    throw new Error(`Invalid EVM_CHAINS_JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  let botAddress: `0x${string}` = '0x0123456789abcdef0123456789abcdef01234567';
  if (values.BOT_PRIVATE_KEY) {
    try {
      const acc = privateKeyToAccount(values.BOT_PRIVATE_KEY as `0x${string}`);
      botAddress = acc.address;
    } catch {}
  }

  return {
    rpcUrl: values.ROBINHOOD_RPC_URL,
    chainId: values.ROBINHOOD_CHAIN_ID,
    solanaRpcUrl: values.SOLANA_RPC_URL,
    solanaExplorerUrl: values.SOLANA_EXPLORER_URL,
    inkRpcUrl: values.INK_RPC_URL,
    inkChainId: values.INK_CHAIN_ID,
    inkExplorerUrl: values.INK_EXPLORER_URL,
    contractAddress: values.CONTRACT_ADDRESS as `0x${string}`,
    abi,
    eventName: values.MONITORED_EVENT_NAME,
    startBlock: values.START_BLOCK,
    confirmations: values.CONFIRMATIONS,
    pollIntervalMs: values.POLL_INTERVAL_MS,
    maxBlockRange: values.MAX_BLOCK_RANGE,
    reorgRewindBlocks: values.REORG_REWIND_BLOCKS,
    dbPath: values.DB_PATH,
    telegramBotToken: values.TELEGRAM_BOT_TOKEN,
    telegramUserIds,
    adminUserIds,
    botAddress,
    botPrivateKey: values.BOT_PRIVATE_KEY as `0x${string}` | undefined,
    chains,
    explorerBaseUrl: values.TELEGRAM_EXPLORER_BASE_URL.replace(/\/$/, ''),
    webhookPort: values.WEBHOOK_PORT,
    encryptionSecret: values.ENCRYPTION_SECRET,
    paymentRecipient: values.PAYMENT_RECIPIENT as `0x${string}` | undefined,
    wethAddress: values.WETH_ADDRESS as `0x${string}` | undefined,
    paymentUsdAmount: values.PAYMENT_USD_AMOUNT,
    paymentConfirmations: values.PAYMENT_CONFIRMATIONS
  };
}

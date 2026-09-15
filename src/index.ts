import { loadConfig } from './config.js';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import 'dotenv/config';
import { createSqliteD1Adapter } from './chain/sqlite-d1-adapter.js';
import { D1WalletStore } from './chain/d1-wallet-store.js';
import { runSniperCycle } from './core/sniper-cycle.js';
import { TelegramClient } from './telegram/client.js';
import { CommandHandler } from './telegram/commands.js';
import { startWebhookServer } from './webhook.js';

{
  const missing: string[] = [];
  if (!process.env.TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN (from @BotFather)');
  if (!process.env.TELEGRAM_ADMIN_USER_IDS) missing.push('TELEGRAM_ADMIN_USER_IDS (numeric ID from @userinfobot)');
  if (missing.length) {
    console.error(`Missing required environment variables in .env:\n  - ${missing.join('\n  - ')}\nAdd them to ${process.cwd()}/.env and re-run: npm run dev`);
    process.exit(1);
  }
}

const config = loadConfig();
mkdirSync(dirname(config.dbPath), { recursive: true });

// The local SQLite database speaks the D1 interface, so the bot runs the
// exact same durable store + sniper engine as the Cloudflare Worker.
const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');
const store = new D1WalletStore(createSqliteD1Adapter(sqlite));

const telegram = new TelegramClient(config.telegramBotToken);
const commands = new CommandHandler(telegram, [...new Set([...config.telegramUserIds, ...config.adminUserIds])], config, store);

console.log(`Mintobot engine ready — Robinhood Chain (${config.chainId}) · SQLite store ${config.dbPath} · activation service ${config.apiBaseUrl}`);
const webhookServer = startWebhookServer(config, store, telegram);

// Long polling cannot receive updates while a Telegram webhook is active.
try {
  await telegram.deleteWebhook(false);
} catch (error) {
  console.warn('Telegram webhook cleanup failed:', error);
}

// Push commands menu directly to Telegram Bot API
try {
  await telegram.setMyCommands([
  { command: 'start', description: 'Open your sniper dashboard' },
  { command: 'activate', description: 'Pair with your MINTO activation key' },
  { command: 'pay', description: 'View access payment instructions' },
  { command: 'verifyaccess', description: 'Verify access payment on-chain' },
  { command: 'wallet', description: 'View wallet address & live balance' },
  { command: 'automint', description: 'Arm an NFT contract for auto-minting' },
  { command: 'confirmtarget', description: 'Confirm staged target and activate mint' },
  { command: 'schedules', description: 'View armed auto-mint targets' },
  { command: 'sellnft', description: 'Auto-sell or transfer an NFT' },
  { command: 'withdraw', description: 'Withdraw ETH to your cold wallet' },
  { command: 'importkey', description: 'Import your private key (AES-256-GCM)' },
  { command: 'exportkey', description: 'Back up your private key' },
  { command: 'status', description: 'View bot & drop status' },
  { command: 'cancel', description: 'Cancel active input flow' },
  { command: 'adduser', description: 'Admin: grant user access' },
  { command: 'removeuser', description: 'Admin: revoke user access' },
  { command: 'listusers', description: 'Admin: list authorized users' },
  { command: 'help', description: 'View full command manual' }
  ]);
} catch (error) {
  console.warn('Telegram command menu registration failed (bot offline or invalid token):', error);
}

let stopping = false;
let updateOffset = 0;
const stop = () => { stopping = true; };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

async function pollUpdates(): Promise<void> {
  const updates = await telegram.getUpdates(updateOffset);
  for (const update of updates) {
    updateOffset = update.update_id + 1;
    await commands.handle(update);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Telegram long polling loop
async function telegramLoop(): Promise<void> {
  while (!stopping) {
    try {
      await pollUpdates();
    } catch (error) {
      console.error('Telegram polling error:', error);
    }
    if (!stopping) await sleep(config.pollIntervalMs);
  }
}

// Auto-mint sniper loop — same execution engine as the Cloudflare Worker cron,
// running a fresh on-chain inspection every strike interval.
async function sniperLoop(): Promise<void> {
  while (!stopping) {
    const started = Date.now();
    try {
      await runSniperCycle({
        config,
        telegram,
        store,
        env: process.env as Record<string, string | undefined>
      });
    } catch (error) {
      console.error('[SNIPER] cycle error:', error);
    }
    const elapsed = Date.now() - started;
    await sleep(Math.max(250, config.sniperIntervalMs - elapsed));
  }
}

await Promise.all([telegramLoop(), sniperLoop()]);

webhookServer.close();
store.close();
sqlite.close();
console.log('Mintobot engine stopped.');

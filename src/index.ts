import { loadConfig } from './config.js';
import { CursorStore } from './chain/cursor-store.js';
import { TelegramClient } from './telegram/client.js';
import { CommandHandler } from './telegram/commands.js';
import { startWebhookServer } from './webhook.js';

const config = loadConfig();
const store = new CursorStore(config.dbPath);
const telegram = new TelegramClient(config.telegramBotToken);
const commands = new CommandHandler(telegram, [...new Set([...config.telegramUserIds, ...config.adminUserIds])], config, store);

console.log('Robinhood Chain bot ready; waiting for /automint contract targets.');
const webhookServer = startWebhookServer(config, store, telegram);

// Long polling cannot receive updates while a Telegram webhook is active.
try {
  await telegram.deleteWebhook(false);
} catch (error) {
  console.warn('Telegram webhook cleanup failed:', error);
}

// Push commands menu directly to Telegram Bot API
await telegram.setMyCommands([
  { command: 'start', description: 'Start Mintobot & connect wallet' },
  { command: 'connectwallet', description: 'Open Smart Vault setup page' },
  { command: 'vault', description: 'Check Smart Vault balance & status' },
  { command: 'verify', description: 'Verify setup transaction' },
  { command: 'automint', description: 'Stage NFT target on Robinhood Chain' },
  { command: 'confirmtarget', description: 'Confirm staged target and activate mint' },
  { command: 'status', description: 'View active bot & vault configuration' },
  { command: 'botaddress', description: 'View bot public address' },
  { command: 'setvault', description: 'Link existing AutoMintVault address' },
  { command: 'stop', description: 'Stop active target monitoring' },
  { command: 'cancel', description: 'Cancel active conversation flow' },
  { command: 'help', description: 'View full command manual' }
]);

let stopping = false;
let updateOffset = 0;
const stop = () => { stopping = true; store.close(); };
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

while (!stopping) {
  try {
    const updates = await telegram.getUpdates(updateOffset);
    for (const update of updates) {
      updateOffset = update.update_id + 1;
      await commands.handle(update);
    }
    // Contract-specific monitoring starts only after a target is classified and confirmed.
  } catch (error) {
    console.error(error);
  }
  if (!stopping) await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
}

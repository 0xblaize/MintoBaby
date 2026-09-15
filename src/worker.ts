import { TelegramClient, type TelegramUpdate } from './telegram/client.js';
import { CommandHandler, getTopCommandButtons } from './telegram/commands.js';
import { MemoryStore } from './chain/memory-store.js';
import { D1WalletStore, type D1DatabaseLike } from './chain/d1-wallet-store.js';
import { ChainExecutor } from './chain/executor.js';
import { CryptoWalletManager } from './wallet/crypto-store.js';
import type { Config } from './config.js';
import { privateKeyToAccount } from 'viem/accounts';
import { runSniperCycle } from './core/sniper-cycle.js';

type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_USER_IDS: string;
  TELEGRAM_ALLOWLIST_USER_IDS?: string;
  ROBINHOOD_RPC_URL?: string;
  ROBINHOOD_CHAIN_ID?: string;
  SOLANA_RPC_URL?: string;
  SOLANA_EXPLORER_URL?: string;
  INK_RPC_URL?: string;
  INK_CHAIN_ID?: string;
  INK_EXPLORER_URL?: string;
  BOT_PRIVATE_KEY?: string;
  ENCRYPTION_SECRET?: string;
  AUTO_MINT_EXECUTOR_ADDRESS?: string;
  AUTO_MINT_OPERATOR_PRIVATE_KEY?: string;
  AUTO_MINT_USER_PAID_EXECUTOR?: string;
  AUTO_MINT_ROUTER_TARGETS?: string;
  PAYMENT_RECIPIENT?: string;
  WETH_ADDRESS?: string;
  PAYMENT_USD_AMOUNT?: string;
  PAYMENT_CONFIRMATIONS?: string;
  API_URL?: string;
  SNIPER_INTERVAL_MS?: string;
  DB?: D1DatabaseLike;
  // GitHub Actions early-wakeup trigger
  GITHUB_PAT?: string;
  GITHUB_USER?: string;
  GITHUB_SNIPER_REPO?: string;
}

function getWorkerConfig(env: Env): Config {
  const rpcUrl = env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
  const chainId = env.ROBINHOOD_CHAIN_ID ? parseInt(env.ROBINHOOD_CHAIN_ID, 10) : 4663;
  const adminUserIds = (env.TELEGRAM_ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const telegramUserIds = (env.TELEGRAM_ALLOWLIST_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

  let botAddress: `0x${string}` = '0x0123456789abcdef0123456789abcdef01234567';
  if (env.BOT_PRIVATE_KEY && /^0x[a-fA-F0-9]{64}$/i.test(env.BOT_PRIVATE_KEY)) {
    try {
      const acc = privateKeyToAccount(env.BOT_PRIVATE_KEY as `0x${string}`);
      botAddress = acc.address;
    } catch {}
  }

  return {
    rpcUrl,
    chainId,
    solanaRpcUrl: env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    solanaExplorerUrl: env.SOLANA_EXPLORER_URL || 'https://solscan.io',
    inkRpcUrl: env.INK_RPC_URL || 'https://rpc-gel.inkonchain.com',
    inkChainId: env.INK_CHAIN_ID ? parseInt(env.INK_CHAIN_ID, 10) : 57073,
    inkExplorerUrl: env.INK_EXPLORER_URL || 'https://explorer.inkonchain.com',
    contractAddress: '0x0000000000000000000000000000000000000000',
    abi: [],
    eventName: 'AutoMintExecuted',
    startBlock: 0n,
    confirmations: 12n,
    pollIntervalMs: 5000,
    maxBlockRange: 2000n,
    reorgRewindBlocks: 20n,
    dbPath: './data/monitor.sqlite',
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramUserIds,
    adminUserIds,
    botAddress,
    botPrivateKey: env.BOT_PRIVATE_KEY as `0x${string}` | undefined,
    encryptionSecret: env.ENCRYPTION_SECRET || 'mintobot-super-secure-key-robinhood-2026',
    chains: [{ name: 'Robinhood Chain', chainId: 4663, rpcUrls: [rpcUrl], explorerBaseUrl: 'https://robinhoodchain.blockscout.com' }],
    explorerBaseUrl: 'https://robinhoodchain.blockscout.com',
    webhookPort: 8787,
    paymentRecipient: /^0x[a-fA-F0-9]{40}$/.test(env.PAYMENT_RECIPIENT || '') ? env.PAYMENT_RECIPIENT as `0x${string}` : undefined,
    wethAddress: /^0x[a-fA-F0-9]{40}$/.test(env.WETH_ADDRESS || '') ? env.WETH_ADDRESS as `0x${string}` : undefined,
    paymentUsdAmount: env.PAYMENT_USD_AMOUNT ? Number(env.PAYMENT_USD_AMOUNT) : 20,
    paymentConfirmations: env.PAYMENT_CONFIRMATIONS ? BigInt(env.PAYMENT_CONFIRMATIONS) : 3n,
    apiBaseUrl: (env.API_URL || 'http://localhost:8000').replace(/\/$/, ''),
    sniperIntervalMs: env.SNIPER_INTERVAL_MS ? parseInt(env.SNIPER_INTERVAL_MS, 10) : 2000
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

/**
 * Fires the GitHub Actions sniper runner exactly 2 minutes before an armed mint.
 * Idempotent: sets `githubTriggered = "1"` in metadata so it never fires twice.
 * Fetches each user's OWN encrypted wallet from D1 and passes it in the payload.
 * The sniper_loop.js decrypts it using ENCRYPTION_SECRET stored in GitHub Secrets.
 * This means every user's mint is signed by THEIR OWN wallet — no shared key needed.
 */
async function triggerGitHubSniper(env: Env, store: D1WalletStore, executor: ChainExecutor): Promise<void> {
  const ghPat  = env.GITHUB_PAT;
  const ghUser = env.GITHUB_USER;
  const ghRepo = env.GITHUB_SNIPER_REPO;
  const executorAddress = env.AUTO_MINT_EXECUTOR_ADDRESS;
  if (!ghPat || !ghUser || !ghRepo) return; // GitHub engine not configured — skip silently

  const now = Math.floor(Date.now() / 1000);
  const twoMinutesLater = now + 120;

  // Fetch all approved/ready targets
  const candidates = await store.getAllActiveTargets();
  if (!candidates || candidates.length === 0) return;

  for (const target of candidates) {
    const meta = target.metadata ?? {};

    // Skip if already triggered this session
    if (meta.githubTriggered === '1') continue;

    // Determine the scheduled mint time (user-set or on-chain)
    const schedMs   = meta.userScheduleTimeMs  ? parseInt(meta.userScheduleTimeMs,  10) : undefined;
    const onChainMs = meta.onChainStartTimeMs  ? parseInt(meta.onChainStartTimeMs,  10) : undefined;
    const mintMs    = schedMs ?? onChainMs;
    if (!mintMs) continue;

    const mintSec = Math.floor(mintMs / 1000);

    // Only fire if mint is within the next 2 minutes (but not already past)
    if (mintSec > twoMinutesLater || mintSec <= now) continue;

    const secsUntilMint = mintSec - now;
    console.log(`[GITHUB-TRIGGER] Waking GitHub for ${target.contractAddress} — opens in ${secsUntilMint}s`);

    // ── Fetch THIS user's encrypted wallet from D1 ───────────────────────────
    const encWallet = await store.getEncryptedWallet(target.userId);
    if (!encWallet) {
      console.warn(`[GITHUB-TRIGGER] No encrypted wallet for user ${target.userId} — skipping`);
      continue;
    }

    // Mark as triggered BEFORE the async fetch (prevents double-fire on next cron)
    const updatedMeta = { ...meta, githubTriggered: '1' };
    await store.stageTarget(target.userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, updatedMeta);

    // Build dispatch payload
    const deadline   = mintSec + 120;
    const ethValue   = meta.ethValue ?? (Number(target.pricePerNft) / 1e18).toFixed(6);
    const quantity   = meta.quantity ?? '1';
    const adapter    = meta.adapter  ?? 'MINT_TO';
    const phaseHash  = meta.phaseHash ?? ('0x' + '00'.repeat(32));

    // Pre-fetch on-chain nonce so the sniper has it ready at fire time
    let expectedNonce = 0;
    if (executorAddress) {
      try {
        expectedNonce = await executor.getOnChainExecutorNonce(executorAddress);
      } catch (e) {
        console.warn('[GITHUB-TRIGGER] Could not fetch on-chain nonce:', e);
      }
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${ghUser}/${ghRepo}/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghPat}`,
          'Accept':        'application/vnd.github+json',
          'Content-Type':  'application/json',
          'User-Agent':    'Mintobaby-Cloudflare-Worker/1.0',
        },
        body: JSON.stringify({
          event_type: 'trigger-mint',
          client_payload: {
            nft_contract:    target.contractAddress,
            mint_time:       String(mintSec),
            quantity:        quantity,
            eth_value:       ethValue,
            expected_nonce:  String(expectedNonce),
            phase_hash:      phaseHash,
            deadline:        String(deadline),
            adapter:         adapter,
            recipient:       encWallet.address,
            // Each user's OWN encrypted key — decrypted inside GitHub using ENCRYPTION_SECRET
            enc_key:         encWallet.encryptedKey,
            enc_iv:          encWallet.iv,
            enc_tag:         encWallet.tag,
          },
        }),
      });

      if (res.ok || res.status === 204) {
        console.log(`[GITHUB-TRIGGER] ✅ GitHub woken for ${target.contractAddress} (wallet: ${encWallet.address})`);
      } else {
        const body = await res.text().catch(() => '');
        console.error(`[GITHUB-TRIGGER] ❌ GitHub dispatch failed (${res.status}): ${body}`);
        // Revert flag so next cron can retry
        const revertMeta = { ...updatedMeta, githubTriggered: undefined };
        await store.stageTarget(target.userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, revertMeta);
      }
    } catch (fetchErr) {
      console.error('[GITHUB-TRIGGER] Fetch error:', fetchErr);
      const revertMeta = { ...updatedMeta, githubTriggered: undefined };
      await store.stageTarget(target.userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, revertMeta);
    }
  }
}

export default {

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(), status: 204 });
    }

    const config = getWorkerConfig(env);
    const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
    const allowlist = env.TELEGRAM_ALLOWLIST_USER_IDS ? config.telegramUserIds : [];
    const store = env.DB ? new D1WalletStore(env.DB) : new MemoryStore();
    const commands = new CommandHandler(telegram, allowlist, config, store);

    // 1. One-Click Webhook & Command Registration
    if (url.pathname === '/set-webhook') {
      const webhookUrl = `https://${url.host}/webhook`;
      await telegram.setWebhook(webhookUrl);
      await telegram.setMyCommands([
        { command: 'start', description: 'Open your sniper dashboard' },
        { command: 'activate', description: 'Pair with your MINTO activation key' },
        { command: 'pay', description: 'View one-time access payment instructions' },
        { command: 'verifyaccess', description: 'Verify your access payment' },
        { command: 'wallet', description: 'View Wallet Details & Balance' },
        { command: 'automint', description: 'Stage NFT drop on Robinhood Chain' },
        { command: 'confirmtarget', description: 'Activate auto-minting for staged drop' },
        { command: 'schedules', description: 'View armed auto-mint targets' },
        { command: 'sellnft', description: 'Auto-sell or transfer an NFT' },
        { command: 'withdraw', description: 'Withdraw ETH back to cold wallet' },
        { command: 'exportkey', description: 'View and back up private key' },
        { command: 'importkey', description: 'Import existing private key' },
        { command: 'status', description: 'View active sniper status & drop targets' },
        { command: 'cancel', description: 'Cancel active input flow' },
        { command: 'adduser', description: 'Admin: grant access to a user' },
        { command: 'removeuser', description: 'Admin: revoke user access' },
        { command: 'listusers', description: 'Admin: list access users' },
        { command: 'help', description: 'View full command guide' }
      ]);
      return new Response(`✅ Telegram Webhook registered to: ${webhookUrl}\n✅ Bot commands menu registered!`, { status: 200 });
    }

    // Telegram Webhook Handler (Receives bot messages from Telegram)
    if (request.method === 'POST' && (url.pathname === '/webhook' || url.pathname === '/')) {
      try {
        const update = await request.json() as TelegramUpdate;
        ctx.waitUntil(commands.handle(update).catch((err) => console.error('Command handle error:', err)));
        return new Response('ok', { status: 200 });
      } catch (err) {
        console.error('Webhook processing error:', err);
        return new Response('ok', { status: 200 });
      }
    }

    // 4. Manual / External Cron Trigger Route (Pingable by cron-job.org, Upstash, etc.)
    if (url.pathname === '/cron' || url.pathname === '/trigger') {
      ctx.waitUntil(this.scheduled({ cron: 'manual' }, env, ctx));
      return new Response(JSON.stringify({ status: 'triggered', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // 5. Default Status Route
    return new Response(`⚡️ Mintobot Cloudflare Worker Live!\n\nUse /set-webhook to link this worker to your Telegram bot.\nUse /cron to trigger an instant execution check.`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 200
    });
  },

  /**
   * Background Scheduled Cron Handler:
   * Monitors armed drops block-by-block and automatically executes & pushes Telegram notifications.
   * Shares one execution implementation with the local bot via runSniperCycle.
   */
  async scheduled(event: { cron?: string }, env: Env, ctx: ExecutionContext): Promise<void> {
    const config = getWorkerConfig(env);
    const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
    if (!env.DB) {
      console.error('[SNIPER] Scheduled auto-mint disabled: D1 binding is required for durable approval and claim state.');
      return;
    }
    const store = new D1WalletStore(env.DB);
    try {
      await runSniperCycle({
        config,
        telegram,
        store,
        env,
        beforeCycle: (d1store, executor) => triggerGitHubSniper(env, d1store as D1WalletStore, executor)
      });
    } catch (err) {
      console.error('Scheduled worker error:', err);
    }
  }
};

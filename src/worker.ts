import { TelegramClient, type TelegramUpdate } from './telegram/client.js';
import { CommandHandler, getMainInterfaceButtons, getTopCommandButtons } from './telegram/commands.js';
import { MemoryStore } from './chain/memory-store.js';
import { D1WalletStore, type D1DatabaseLike } from './chain/d1-wallet-store.js';
import { ChainExecutor } from './chain/executor.js';
import { CryptoWalletManager } from './wallet/crypto-store.js';
import type { Config } from './config.js';
import { privateKeyToAccount } from 'viem/accounts';
import { keccak256, stringToHex } from 'viem';
import { Wallet } from 'ethers';
import { createChainClient } from './chain/client.js';
import { discoverRobinhoodContract } from './core/discovery-engine.js';
import { formatEthUsd, formatWeiEthUsd } from './finance/eth-price.js';

type ExecutionContext = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_ADMIN_USER_IDS: string;
  TELEGRAM_ALLOWLIST_USER_IDS?: string;
  ROBINHOOD_RPC_URL?: string;
  ROBINHOOD_CHAIN_ID?: string;
  BOT_PRIVATE_KEY?: string;
  MINI_APP_BASE_URL?: string;
  ENCRYPTION_SECRET?: string;
  AUTO_MINT_EXECUTOR_ADDRESS?: string;
  AUTO_MINT_OPERATOR_PRIVATE_KEY?: string;
  AUTO_MINT_USER_PAID_EXECUTOR?: string;
  AUTO_MINT_ROUTER_TARGETS?: string;
  PAYMENT_RECIPIENT?: string;
  WETH_ADDRESS?: string;
  PAYMENT_USD_AMOUNT?: string;
  PAYMENT_CONFIRMATIONS?: string;
  DB?: D1DatabaseLike;
  // GitHub Actions early-wakeup trigger
  GITHUB_PAT?: string;
  GITHUB_USER?: string;
  GITHUB_SNIPER_REPO?: string;
}

function getWorkerConfig(env: Env, host: string): Config {
  const rpcUrl = env.ROBINHOOD_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
  const chainId = env.ROBINHOOD_CHAIN_ID ? parseInt(env.ROBINHOOD_CHAIN_ID, 10) : 4663;
  const adminUserIds = (env.TELEGRAM_ADMIN_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const telegramUserIds = (env.TELEGRAM_ALLOWLIST_USER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const miniAppBaseUrl = env.MINI_APP_BASE_URL || `https://${host}`;

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
    turnkey: { enabled: false, apiBaseUrl: 'https://turnkey.com' },
    chains: [{ name: 'Robinhood Chain', chainId: 4663, rpcUrls: [rpcUrl], explorerBaseUrl: 'https://robinhoodchain.blockscout.com' }],
    explorerBaseUrl: 'https://robinhoodchain.blockscout.com',
    webhookPort: 8787,
    miniAppBaseUrl,
    miniAppApiUrl: `https://${host}`,
    paymentRecipient: /^0x[a-fA-F0-9]{40}$/.test(env.PAYMENT_RECIPIENT || '') ? env.PAYMENT_RECIPIENT as `0x${string}` : undefined,
    wethAddress: /^0x[a-fA-F0-9]{40}$/.test(env.WETH_ADDRESS || '') ? env.WETH_ADDRESS as `0x${string}` : undefined,
    paymentUsdAmount: env.PAYMENT_USD_AMOUNT ? Number(env.PAYMENT_USD_AMOUNT) : 20,
    paymentConfirmations: env.PAYMENT_CONFIRMATIONS ? BigInt(env.PAYMENT_CONFIRMATIONS) : 3n
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

function getConfiguredRouterAdapter(env: Env, target: string): 'MINT_TO' | 'PUBLIC_MINT_TO' | undefined {
  const userPaid = env.AUTO_MINT_USER_PAID_EXECUTOR === 'true';
  if (!env.AUTO_MINT_EXECUTOR_ADDRESS || (!env.AUTO_MINT_OPERATOR_PRIVATE_KEY && !userPaid)) return undefined;
  const match = (env.AUTO_MINT_ROUTER_TARGETS || '')
    .split(',')
    .map((value) => value.trim())
    .map((value) => {
      const [address, adapter = 'MINT_TO'] = value.split(/[=:]/, 2);
      return { address: address.toLowerCase(), adapter: adapter.toUpperCase() };
    })
    .find((value) => value.address === target.toLowerCase());
  if (match?.adapter === 'MINT_TO' || match?.adapter === 'PUBLIC_MINT_TO') return match.adapter;
  return undefined;
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

    const config = getWorkerConfig(env, url.host);
    const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
    const allowlist = env.TELEGRAM_ALLOWLIST_USER_IDS ? config.telegramUserIds : [];
    const store = env.DB ? new D1WalletStore(env.DB) : new MemoryStore();
    const commands = new CommandHandler(telegram, allowlist, config, store);

    // 1. One-Click Webhook & Command Registration
    if (url.pathname === '/set-webhook') {
      const webhookUrl = `https://${url.host}/webhook`;
      await telegram.setWebhook(webhookUrl);
      await telegram.setMyCommands([
        { command: 'start', description: 'Open Sniper Wallet & Balance' },
        { command: 'pay', description: 'View one-time access payment instructions' },
        { command: 'verifyaccess', description: 'Verify your access payment' },
        { command: 'wallet', description: 'View Wallet Details & Balance' },
        { command: 'automint', description: 'Stage NFT drop on Robinhood Chain' },
        { command: 'confirmtarget', description: 'Activate auto-minting for staged drop' },
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

    // 2. Mini App Setup Notification API
    if (request.method === 'POST' && url.pathname === '/api/transaction/verify') {
      try {
        const data = await request.json() as { userId?: string; txHash?: string };
        const match = data.txHash?.match(/(?:0x|0X)?[a-fA-F0-9]{64}/)?.[0];
        if (!data.userId || !match) {
          return new Response(JSON.stringify({ error: 'Missing userId or valid txHash' }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 400 });
        }
        const hash = (`0x${match.replace(/^0x/i, '').toLowerCase()}`) as `0x${string}`;
        const client = createChainClient(config);
        if (await client.getChainId() !== 4663) {
          return new Response(JSON.stringify({ status: 'wrong_network', hash }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 400 });
        }
        const transaction = await client.getTransaction({ hash });
        if (!transaction) {
          return new Response(JSON.stringify({ status: 'not_found', hash }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 200 });
        }
        const receipt = await client.getTransactionReceipt({ hash });
        if (!receipt) {
          return new Response(JSON.stringify({ status: 'pending', hash }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 200 });
        }
        if (receipt.status !== 'success') {
          return new Response(JSON.stringify({ status: 'reverted', hash }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 200 });
        }
        if (store instanceof D1WalletStore) await store.saveWalletAsync(data.userId, receipt.from); else store.saveWallet(data.userId, receipt.from);
        await telegram.sendMessage(data.userId, `✅ <b>Transaction Verified</b>\n\n• <b>Hash:</b> <code>${hash}</code>\n• <b>Sender:</b> <code>${receipt.from}</code>\n• <b>Network:</b> Robinhood Chain (4663)\n\nThe public sender address was recorded.`, getMainInterfaceButtons(config.miniAppBaseUrl, data.userId, config.miniAppApiUrl));
        return new Response(JSON.stringify({ status: 'success', hash, sender: receipt.from, blockNumber: receipt.blockNumber.toString() }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ status: 'rpc_error', error: err instanceof Error ? err.message : String(err) }), { headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 502 });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/wallet/authorized') {
      try {
        const data = await request.json() as {
          userId?: string;
          walletAddress?: string;
          balanceEth?: string;
          provider?: string;
        };
        if (!data.userId || !data.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(data.walletAddress)) {
          return new Response(JSON.stringify({ error: 'Missing or invalid userId or walletAddress' }), {
            headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 400
          });
        }

        const walletAddress = data.walletAddress.toLowerCase();
        if (store instanceof D1WalletStore) await store.saveWalletAsync(data.userId, walletAddress, data.provider); else store.saveWallet(data.userId, walletAddress, data.provider);
        await telegram.sendMessage(
          data.userId,
          `✅ <b>Public Wallet Authorization Recorded</b>\n\n` +
          `• <b>Main Wallet:</b> <code>${walletAddress}</code>\n` +
          `• <b>Balance:</b> <b>${data.balanceEth ? await formatEthUsd(data.balanceEth) : 'Unavailable'}</b>\n` +
          `• <b>Network:</b> Robinhood Chain (4663)\n\n` +
          `The wallet provider session may expire or be revoked. Reopen the main interface to re-authorize when needed.`,
          getMainInterfaceButtons(config.miniAppBaseUrl, data.userId, config.miniAppApiUrl)
        );
        return new Response(JSON.stringify({ success: true, address: walletAddress, status: 'authorized' }), {
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 200
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, status: 400
        });
      }
    }

    // 3. Telegram Webhook Handler (Receives bot messages from Telegram)
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

    // 4. Default Status Route
    return new Response(`⚡️ Mintobot Cloudflare Worker Live!\n\nUse /set-webhook to link this worker to your Telegram bot.`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 200
    });
  },

  /**
   * Background Scheduled Cron Handler:
   * Monitors armed drops block-by-block and automatically executes & pushes Telegram notifications.
   */
  async scheduled(event: { cron?: string }, env: Env, ctx: ExecutionContext): Promise<void> {
    const config = getWorkerConfig(env, 'localhost');
    const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
    if (!env.DB) {
      console.error('[SNIPER] Scheduled auto-mint disabled: D1 binding is required for durable approval and claim state.');
      return;
    }
    const store = new D1WalletStore(env.DB);
    const executor = new ChainExecutor(config.rpcUrl);
    const walletManager = new CryptoWalletManager(config.encryptionSecret);

    try {
      // ── GitHub Early-Wakeup: fire runner 2 minutes before any armed mint ──
      await triggerGitHubSniper(env, store, executor);

      const activeTargets = await store.getAllActiveTargets();
      if (!activeTargets || activeTargets.length === 0) return;

      for (const target of activeTargets) {
        let claimed = false;
        let broadcasted = false;
        try {
          const encWallet = await store.getEncryptedWallet(target.userId);
          if (!encWallet) {
            console.log(`[SNIPER] Missing encrypted wallet for ${target.userId}; target ${target.contractAddress} cannot execute.`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT BLOCKED</b>\n\nNo encrypted sniper wallet is available for <code>${target.contractAddress}</code>. Create or import the sniper wallet before arming auto-mint.`);
            continue;
          }

          const now = Date.now();
          const freshDiscovery = await discoverRobinhoodContract(createChainClient(config), target.contractAddress, config.rpcUrl);
          if (freshDiscovery.status !== 'CLASSIFIED_SAFE') {
            const reason = freshDiscovery.reason || 'Fresh on-chain inspection failed.';
            console.log(`[SNIPER] Fresh phase inspection failed for ${target.contractAddress}: ${reason}`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\n• <b>Target:</b> <code>${target.contractAddress}</code>\n• <b>Reason:</b> ${reason}\n\nThe Worker will inspect it again on the next cycle.`);
            continue;
          }
          const onChainTimeMs = freshDiscovery.onChainStartTimeMs ?? (target.metadata?.onChainStartTimeMs ? parseInt(target.metadata.onChainStartTimeMs, 10) : undefined);
          const userScheduleTimeMs = target.metadata?.userScheduleTimeMs ? parseInt(target.metadata.userScheduleTimeMs, 10) : undefined;

          if (userScheduleTimeMs && userScheduleTimeMs > now) {
            const minsLeft = Math.ceil((userScheduleTimeMs - now) / 60000);
            console.log(`[SNIPER] User schedule for ${target.contractAddress} is in ${minsLeft}m — skipping.`);
            continue;
          }
          if (onChainTimeMs && onChainTimeMs > now) {
            const minsLeft = Math.ceil((onChainTimeMs - now) / 60000);
            console.log(`[SNIPER] On-chain opening for ${target.contractAddress} is in ${minsLeft}m — skipping.`);
            continue;
          }

          const priceStatus = freshDiscovery.priceStatus;
          if (priceStatus === 'unavailable') {
            console.log(`[SNIPER] Fresh price unavailable for ${target.contractAddress} — skipping until rediscovered.`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\nThe fresh on-chain mint price for <code>${target.contractAddress}</code> is unavailable. The Worker will retry discovery.`);
            continue;
          }

          const phaseKind = freshDiscovery.phaseKind;
          const phaseStatus = freshDiscovery.phaseStatus;
          const phaseEndTimeMs = freshDiscovery.onChainEndTimeMs ?? (target.metadata?.onChainEndTimeMs ? parseInt(target.metadata.onChainEndTimeMs, 10) : undefined);
          if (!phaseKind || phaseKind === 'unknown' || !phaseStatus || phaseStatus === 'unknown') {
            console.log(`[SNIPER] Mint phase for ${target.contractAddress} is unknown — refusing generic execution.`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\nThe Worker could not identify a supported on-chain phase for <code>${target.contractAddress}</code>. It will not guess a mint call.`);
            continue;
          }
          if (phaseEndTimeMs && phaseEndTimeMs <= now) {
            console.log(`[SNIPER] Mint phase for ${target.contractAddress} has expired — skipping.`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT STOPPED</b>\n\nThe on-chain mint phase for <code>${target.contractAddress}</code> has expired.`);
            continue;
          }
          if (phaseStatus === 'expired') continue;
          if (phaseStatus !== 'open') {
            console.log(`[SNIPER] Mint phase for ${target.contractAddress} is ${phaseStatus} — waiting for open.`);
            await telegram.sendMessage(target.userId, `⏳ <b>AUTO-MINT ARMED</b>\n\nThe phase for <code>${target.contractAddress}</code> is currently <b>${phaseStatus}</b>. The Worker will trigger it when the phase opens.`);
            continue;
          }

          const routerAdapter = getConfiguredRouterAdapter(env, target.contractAddress);
          if (env.AUTO_MINT_USER_PAID_EXECUTOR === 'true' && !routerAdapter) {
            const reason = 'User-paid executor mode is enabled, but this target is not configured in AUTO_MINT_ROUTER_TARGETS.';
            console.log(`[SNIPER] ${reason} ${target.contractAddress}`);
            await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT BLOCKED</b>\n\n• <b>Target:</b> <code>${target.contractAddress}</code>\n• <b>Reason:</b> ${reason}\n\nNo direct-wallet fallback was used.`);
            continue;
          }

          if (target.metadata?.approvalStatus !== 'approved' || target.metadata?.executionStatus === 'claimed') {
            console.log(`[SNIPER] Target ${target.contractAddress} is not claimable — skipping.`);
            continue;
          }
          if (!(await store.claimTarget?.(target.userId))) {
            console.log(`[SNIPER] Target ${target.contractAddress} was claimed by another invocation — skipping.`);
            continue;
          }
          claimed = true;
          const claimedTarget = await store.getTarget(target.userId);
          if (!claimedTarget || claimedTarget.contractAddress.toLowerCase() !== target.contractAddress.toLowerCase() || claimedTarget.metadata?.approvalStatus !== 'approved' || claimedTarget.metadata.executionStatus !== 'claimed') {
            await store.releaseTarget?.(target.userId);
            claimed = false;
            console.log(`[SNIPER] Target ${target.contractAddress} changed during preparation — refusing stale execution.`);
            continue;
          }

          const routerTarget = Boolean(routerAdapter);
          const userPaidExecutor = routerTarget && env.AUTO_MINT_USER_PAID_EXECUTOR === 'true';
          const privateKey = await walletManager.decrypt(encWallet.encryptedKey, encWallet.iv, encWallet.tag);
          const signerAddress = new Wallet(privateKey).address;
          if (signerAddress.toLowerCase() !== encWallet.address.toLowerCase()) {
            throw new Error('Stored wallet address does not match the decrypted private key.');
          }
          const maxLimit = freshDiscovery.maxPerWallet ?? (target.metadata?.maxPerWallet ? parseInt(target.metadata.maxPerWallet, 10) : 1);
          const requestedQty = target.metadata?.quantity ? parseInt(target.metadata.quantity, 10) : 1;
          const qty = Math.min(Math.max(1, requestedQty), maxLimit > 0 ? maxLimit : 1);

          const totalWei = freshDiscovery.pricePerNft * BigInt(qty);
          const totalEth = (Number(totalWei) / 1e18).toString();

          console.log(`[SNIPER] Attempting ${routerTarget ? 'on-chain executor' : 'direct-wallet'} mint for user ${target.userId} — ${target.contractAddress} qty:${qty} value:${totalEth} ETH`);

          const onBroadcast = async (txHash: string, functionSignature: string) => {
            broadcasted = true;
            await store.recordTargetBroadcast?.(target.userId, txHash, functionSignature);
            await telegram.sendMessage(
              target.userId,
              `📡 <b>AUTO-MINT TRANSACTION BROADCASTED</b>\n\n` +
              `• <b>Collection:</b> ${target.metadata?.name || 'Robinhood NFT Drop'}\n` +
              `• <b>Contract:</b> <code>${target.contractAddress}</code>\n` +
              `• <b>Quantity:</b> ${qty}\n` +
              `• <b>Mint Value:</b> ${await formatWeiEthUsd(totalWei)}\n` +
              `• <b>Mint Function:</b> <code>${functionSignature}</code>\n` +
              `• <b>Status:</b> ⏳ Waiting for on-chain confirmation\n` +
              `• <b>Transaction:</b> <code>${txHash}</code>\n\n` +
              `🔗 <a href="${config.explorerBaseUrl}/tx/${txHash}">View pending transaction</a>`,
              getTopCommandButtons()
            );
          };

          const res = routerTarget
            ? await (async () => {
                const executorAddress = env.AUTO_MINT_EXECUTOR_ADDRESS as string;
                const expectedNonce = await executor.getOnChainExecutorNonce(executorAddress);
                const phaseHash = keccak256(stringToHex(JSON.stringify({
                  contract: target.contractAddress.toLowerCase(),
                  adapter: routerAdapter,
                  phase: phaseKind,
                  start: freshDiscovery.onChainStartTimeMs ?? null,
                  end: freshDiscovery.onChainEndTimeMs ?? null,
                  price: freshDiscovery.pricePerNft.toString()
                })));
                const deadline = Math.floor(Date.now() / 1000) + 120;
                if (userPaidExecutor) {
                  return executor.executeOnChainMintToByRecipient(
                    privateKey as string,
                    executorAddress,
                    target.contractAddress,
                    encWallet.address,
                    qty,
                    totalEth,
                    deadline,
                    expectedNonce,
                    phaseHash,
                    onBroadcast
                  );
                }
                if (!env.AUTO_MINT_OPERATOR_PRIVATE_KEY) {
                  return { success: false, error: 'Executor operator key is not configured.' };
                }
                return executor.executeOnChainMintTo(
                  env.AUTO_MINT_OPERATOR_PRIVATE_KEY,
                  executorAddress,
                  target.contractAddress,
                  encWallet.address,
                  qty,
                  totalEth,
                  deadline,
                  expectedNonce,
                  phaseHash,
                  onBroadcast
                );
              })()
            : phaseKind === 'seadrop' && freshDiscovery.seaDropAddress
              ? await executor.executeSeaDropMint(privateKey as string, freshDiscovery.seaDropAddress, target.contractAddress, qty, totalEth, onBroadcast)
              : await executor.executeMint(privateKey as string, target.contractAddress, qty, totalEth, onBroadcast);

          if (res.success) {
            const newBal = await executor.getBalance(encWallet.address);

            // Safety guard: Un-arm IMMEDIATELY to prevent any double-minting
            await store.removeTarget(target.userId);

            const name = target.metadata?.name || 'Robinhood NFT Drop';
            const symbol = target.metadata?.symbol || 'NFT';

            console.log(`[SNIPER] ✅ Mint SUCCESS for user ${target.userId} — tx: ${res.txHash}`);

            // Push automatic success receipt to Telegram
            await telegram.sendMessage(
              target.userId,
              `🎉 ⚡️ <b>AUTO-MINT SUCCESSFUL!</b> 🚀\n\n` +
              `• <b>Collection:</b> <b>${name}</b> (${symbol})\n` +
              `• <b>Contract:</b> <code>${target.contractAddress}</code>\n` +
              `• <b>Quantity Minted:</b> <b>${qty} NFT${qty > 1 ? 's' : ''}</b>\n` +
              `• <b>Transaction:</b> <code>${res.txHash}</code>\n` +
              `• <b>Block Number:</b> ${res.blockNumber}\n` +
              `• <b>Gas Used:</b> ${res.gasUsed} units\n` +
              `• <b>NFT Delivered to:</b> <code>${encWallet.address}</code>\n` +
              `• <b>Updated Balance:</b> <b>${await formatEthUsd(newBal || '0')}</b>\n\n` +
              `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
              getTopCommandButtons()
            );
          } else {
            const errMsg = res.error || '';
            console.log(`[SNIPER] ❌ Mint FAILED for user ${target.userId} — ${errMsg}`);

            // A failure without a transaction hash was not broadcast and can be retried safely.
            if (!res.txHash) {
              await store.releaseTarget?.(target.userId);
            } else {
              await telegram.sendMessage(
                target.userId,
                `⚠️ <b>AUTO-MINT BROADCASTED BUT RECEIPT IS UNRESOLVED</b>\n\n` +
                `• <b>Transaction:</b> <code>${res.txHash}</code>\n` +
                `• <b>Status:</b> ⏳ Still pending or RPC receipt lookup failed\n` +
                `• <b>Safety:</b> No second mint will be attempted automatically\n\n` +
                `🔗 <a href="${config.explorerBaseUrl}/tx/${res.txHash}">Track transaction</a>`,
                getTopCommandButtons()
              );
            }

            if (
              errMsg.toLowerCase().includes('insufficient') ||
              errMsg.toLowerCase().includes('insufficient eth') ||
              errMsg.toLowerCase().includes('insufficient funds')
            ) {
              await store.removeTarget(target.userId);
              await telegram.sendMessage(
                target.userId,
                `⚠️ <b>AUTO-MINT FAILED: Insufficient ETH!</b>\n\n` +
                `• <b>Target:</b> <code>${target.contractAddress}</code>\n` +
                `• <b>Reason:</b> <i>${errMsg}</i>\n\n` +
                `Please top up your sniper wallet and re-stage the drop.`,
                getTopCommandButtons()
              );
            } else {
              await telegram.sendMessage(
                target.userId,
                `⚠️ <b>AUTO-MINT ATTEMPT FAILED</b>\n\n` +
                `• <b>Target:</b> <code>${target.contractAddress}</code>\n` +
                `• <b>Reason:</b> <i>${errMsg || 'The contract rejected the preflight transaction.'}</i>\n` +
                `• <b>Retry:</b> The approved target remains armed for the next cron cycle.`,
                getTopCommandButtons()
              );
            }
          }
        } catch (targetErr) {
          console.error(`Scheduled mint error for user ${target.userId}:`, targetErr);
          if (claimed && !broadcasted) {
            await store.releaseTarget?.(target.userId);
            const reason = targetErr instanceof Error ? targetErr.message : String(targetErr);
            await telegram.sendMessage(
              target.userId,
              `⚠️ <b>AUTO-MINT COULD NOT START</b>\n\n` +
              `• <b>Target:</b> <code>${target.contractAddress}</code>\n` +
              `• <b>Reason:</b> <i>${reason}</i>\n` +
              `• <b>Safety:</b> No transaction was broadcast; the approved target was released for retry.`,
              getTopCommandButtons()
            );
          }
        }
      }
    } catch (err) {
      console.error('Scheduled worker error:', err);
    }
  }
};

import { isAllowedUserId } from './allowlist.js';
import { TelegramClient, type TelegramUpdate, type TelegramButton } from './client.js';
import type { IStore } from '../chain/memory-store.js';
import type { Config } from '../config.js';
import { CryptoWalletManager } from '../wallet/crypto-store.js';
import { ChainExecutor } from '../chain/executor.js';
import { discoverRobinhoodContract } from '../core/discovery-engine.js';
import { createChainClient } from '../chain/client.js';
import { formatEthUsd, formatWeiEthUsd } from '../finance/eth-price.js';
import { verifyAccessPayment } from '../access/payment-verifier.js';

const publicAddressRegex = /^0x[a-fA-F0-9]{40}$/i;
const privateKeyRegex = /^(?:0x)?[a-fA-F0-9]{64}$/i;
type PriceStatus = 'known' | 'unavailable';

function getPriceStatus(pricePerNft: bigint, metadata?: Record<string, string | undefined>): PriceStatus {
  if (metadata?.priceStatus === 'known' || metadata?.priceStatus === 'unavailable') {
    return metadata.priceStatus;
  }
  return pricePerNft > 0n ? 'known' : 'unavailable';
}

function parseUserTimeString(text: string): number | null {
  const t = text.trim().toLowerCase();
  const now = Date.now();

  const inMinutesMatch = t.match(/^(?:in\s*)?(\d+)\s*(?:m|min|mins|minute|minutes)$/i);
  if (inMinutesMatch) {
    const mins = parseInt(inMinutesMatch[1], 10);
    return now + mins * 60 * 1000;
  }

  const inHoursMatch = t.match(/^(?:in\s*)?(\d+)\s*(?:h|hr|hrs|hour|hours)$/i);
  if (inHoursMatch) {
    const hrs = parseInt(inHoursMatch[1], 10);
    return now + hrs * 3600 * 1000;
  }

  const timeOnlyMatch = t.match(/^(\d{1,2}):(\d{2})(?:\s*utc)?$/i);
  if (timeOnlyMatch) {
    const hours = parseInt(timeOnlyMatch[1], 10);
    const minutes = parseInt(timeOnlyMatch[2], 10);
    const d = new Date();
    d.setUTCHours(hours, minutes, 0, 0);
    if (d.getTime() < now) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.getTime();
  }

  const parsed = Date.parse(text);
  if (!isNaN(parsed) && parsed > now - 60000) {
    return parsed;
  }

  return null;
}

export type UserState = {
  address?: `0x${string}`;
  monitoring: boolean;
  targetQty?: number;
  targetTimeMs?: number;
  currentContract?: `0x${string}`;
  flow?:
    | { type: 'withdraw'; destination?: `0x${string}`; amount?: string }
    | { type: 'importkey' }
    | { type: 'verifyaccess' }
    | { type: 'adduser' }
    | { type: 'removeuser' }
    | { type: 'automint'; contract?: `0x${string}`; quantity?: number; valueEth?: string }
    | { type: 'sellnft'; contract?: `0x${string}`; tokenId?: string }
    | { type: 'customtime'; contract?: `0x${string}`; qty?: number; pricePerNftWei?: string; isLive?: boolean };
};

export function getMainMenuButtons(isAdmin: boolean = false): TelegramButton[][] {
  const buttons: TelegramButton[][] = [
    [
      { text: '🎯 Arm Auto-Mint (/automint)', callback_data: 'cmd:automint' },
      { text: '📡 Armed Auto-Mints (/schedules)', callback_data: 'cmd:schedules' }
    ],
    [
      { text: '💰 Auto-Sell / Transfer (/sellnft)', callback_data: 'cmd:sellnft' },
      { text: '💳 Wallet Details (/wallet)', callback_data: 'cmd:wallet' }
    ],
    [
      { text: '📤 Withdraw ETH (/withdraw)', callback_data: 'cmd:withdraw' },
      { text: '📊 Bot Status (/status)', callback_data: 'cmd:status' }
    ],
    [
      { text: '🔑 Export Key', callback_data: 'cmd:exportkey' },
      { text: '📥 Import Key', callback_data: 'cmd:importkey' }
    ]
  ];

  if (isAdmin) {
    buttons.push([
      { text: '👑 Admin Dashboard (/listusers)', callback_data: 'cmd:admin' }
    ]);
  }

  return buttons;
}

export const getTopCommandButtons = getMainMenuButtons;
export function getMainInterfaceButtons(_baseUrl?: string, _userId?: string, _apiUrl?: string, isAdmin: boolean = false): TelegramButton[][] {
  return getMainMenuButtons(isAdmin);
}

export class CommandHandler {
  private readonly users = new Map<string, UserState>();
  private readonly walletCache = new Map<string, { address: `0x${string}`; privateKey: string }>();
  private readonly walletManager: CryptoWalletManager;
  private readonly executor = new ChainExecutor();

  constructor(
    private readonly telegram: TelegramClient,
    private readonly allowlist: readonly string[],
    private readonly config: Config,
    private readonly store: IStore
  ) {
    this.walletManager = new CryptoWalletManager(config.encryptionSecret);
  }

  private isFreeCommand(command: string): boolean {
    return ['/start', '/menu', '/help', '/pay', '/payment', '/verifyaccess', '/verify', '/cancel', '/adduser', '/removeuser', '/listusers'].includes(command.toLowerCase());
  }

  private async hasPaidAccess(userKey: string, isAdmin: boolean): Promise<boolean> {
    if (isAdmin || (this.allowlist.length > 0 && isAllowedUserId(userKey, this.allowlist))) return true;
    return Boolean(this.store.isDurableStore?.() && this.store.getEntitlement && await this.store.getEntitlement(userKey));
  }

  private async sendPaymentInstructions(chatId: number): Promise<void> {
    if (!this.config.paymentRecipient) {
      await this.telegram.sendMessage(chatId, '⚠️ Paid access is not configured yet. An administrator must set the payment recipient.\n\nFor help, message @damiblaize (Blaize).');
      return;
    }
    await this.telegram.sendMessage(
      chatId,
      `👋 <b>Welcome to Mintobot!</b>\n\n` +
      `The fastest NFT auto-sniper on Robinhood Chain (4663).\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 <b>One-Time Access Fee</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Send <b>$${this.config.paymentUsdAmount.toFixed(2)}</b> worth of <b>ETH or WETH</b>\n` +
      `on <b>Robinhood Chain (4663)</b> to:\n\n` +
      `<code>${this.config.paymentRecipient}</code>\n\n` +
      `${this.config.wethAddress ? `WETH contract:\n<code>${this.config.wethAddress}</code>\n\n` : ''}` +
      `Once sent, tap the button below and drop your transaction hash to get instant access. ⬇️`,
      [
        [{ text: '✅ I\'ve Paid — Verify Transaction', callback_data: 'cmd:verifyaccess' }],
        [{ text: '📖 How It Works (/help)', callback_data: 'cmd:help' }]
      ]
    );
  }

  private getMainMenuButtons(isAdmin: boolean = false): TelegramButton[][] {
    return getMainMenuButtons(isAdmin);
  }

  private getOnboardingButtons(): TelegramButton[][] {
    return [
      [
        { text: '⚡️ Create New Sniper Wallet', callback_data: 'cmd:createwallet' }
      ],
      [
        { text: '📥 Import Existing Private Key', callback_data: 'cmd:importkey' }
      ],
      [
        { text: '📖 Help Guide (/help)', callback_data: 'cmd:help' }
      ]
    ];
  }

  private formatScheduledTime(scheduledTimeMs?: number, isFromContract?: boolean, isLive?: boolean): string {
    if (isLive) {
      return '🟢 <b>LIVE NOW (Direct On-Chain Mint)</b>';
    }
    if (!scheduledTimeMs || scheduledTimeMs <= Date.now()) {
      return '⚪️ <b>Auto-Snipes exact block drop opens on-chain</b>';
    }
    const diffMins = Math.max(1, Math.round((scheduledTimeMs - Date.now()) / 60000));
    const utcStr = new Date(scheduledTimeMs).toUTCString().replace('GMT', 'UTC');
    const badge = isFromContract ? '📡 <b>On-Chain Start Time:</b> ' : '⏰ ';
    return `${badge}<b>${utcStr}</b> (in ~${diffMins} min${diffMins > 1 ? 's' : ''})`;
  }

  private getSniperSetupButtons(
    contract: string,
    qty: number,
    isLive: boolean,
    scheduledTimeMs?: number,
    maxPerWallet: number = 10,
    totalCostDisplay: string = '0.0000 ETH (USD unavailable)',
    priceStatus: PriceStatus = 'known'
  ): TelegramButton[][] {
    const rows: TelegramButton[][] = [];
    const norm = contract.toLowerCase();

    // Only show quantity selectors if maxPerWallet > 1
    if (maxPerWallet > 1) {
      rows.push([
        { text: `➖ Less`, callback_data: `q:prev:${norm}` },
        { text: `🔢 Quantity: ${qty} NFT${qty > 1 ? 's' : ''}`, callback_data: `cmd:noop` },
        { text: `➕ More`, callback_data: `q:next:${norm}` }
      ]);

      const presetRow: TelegramButton[] = [];
      const presets = [1, 2, 3, 5, 10].filter((p) => p <= maxPerWallet);
      for (const p of presets) {
        presetRow.push({
          text: qty === p ? `🔘 ${p}x` : `${p}x`,
          callback_data: `q:${p}:${norm}`
        });
      }
      if (presetRow.length > 0) {
        rows.push(presetRow);
      }
    }

    rows.push([
      { text: '⚡ Auto-Mint when on-chain mint opens', callback_data: 'cmd:noop' }
    ]);

    const now = Date.now();
    const isImmediate = !scheduledTimeMs || scheduledTimeMs <= now;

    rows.push([
      priceStatus === 'unavailable'
        ? { text: '⚠️ Price unavailable — retry lookup', callback_data: 'cmd:noop' }
        : {
            text: isImmediate
              ? `🚀 Confirm Auto-Mint ${qty} NFT${qty > 1 ? 's' : ''} (${totalCostDisplay})`
              : `🎯 Arm Auto-Mint (${qty} NFT${qty > 1 ? 's' : ''} — ${totalCostDisplay})`,
            callback_data: `arm:${norm}:${qty}`
          }
    ]);

    rows.push([
      { text: '❌ Cancel', callback_data: 'cmd:cancel' }
    ]);

    return rows;
  }

  private renderSniperSetupText(
    name: string | undefined,
    symbol: string | undefined,
    contract: string,
    qty: number,
    pricePerNftWei: bigint,
    priceStatus: PriceStatus,
    unitPriceDisplay: string,
    totalCostDisplay: string,
    isLive: boolean,
    walletAddress: string,
    walletBalanceDisplay: string,
    scheduledTimeMs?: number,
    maxPerWallet?: number,
    isOnChainSchedule?: boolean
  ): string {
    const priceDisplay = priceStatus === 'unavailable'
      ? `<i>Price unavailable — retry lookup</i>`
      : Number(pricePerNftWei) > 0
        ? `<b>${unitPriceDisplay}</b>`
        : `<i>Free</i>`;
    const timeDisplay = this.formatScheduledTime(scheduledTimeMs, isOnChainSchedule, isLive);

    const qtyNotice = (maxPerWallet && maxPerWallet > 0 && maxPerWallet <= 100)
      ? (maxPerWallet === 1
          ? `<b>1 NFT</b> (🔒 <i>On-Chain Limit: 1 per wallet</i>)`
          : `<b>${qty} NFT${qty > 1 ? 's' : ''}</b> (On-Chain Limit: ${maxPerWallet}/wallet)`)
      : `<b>${qty} NFT${qty > 1 ? 's' : ''}</b>`;

    const collectionDisplay = name
      ? `<b>${name}</b>${symbol ? ` (${symbol})` : ''}`
      : `<i>Reading from chain...</i>`;

    return (
      `🎯 <b>NFT Drop Sniper Setup — Robinhood Chain (4663)</b>\n\n` +
      `• <b>Collection:</b> ${collectionDisplay}\n` +
      `• <b>Contract:</b> <code>${contract}</code>\n` +
      `• <b>Mint Price:</b> ${priceDisplay}\n` +
      `• <b>Drop Status:</b> ${isLive ? '🟢 <b>LIVE — Mint Open Now</b>' : '⚪️ <b>PENDING — Waiting for drop to open</b>'}\n` +
      `• <b>Sniper Wallet:</b> <code>${walletAddress}</code>\n` +
      `• <b>Wallet Balance:</b> <b>${walletBalanceDisplay}</b>\n\n` +
      `⚙️ <b>Order:</b>\n` +
      `• <b>Quantity:</b> ${qtyNotice}\n` +
      `• <b>Total Cost:</b> ${priceStatus === 'unavailable' ? `<i>Unavailable until price is confirmed</i>` : Number(pricePerNftWei) > 0 ? `<b>${totalCostDisplay}</b> + gas` : `<i>Gas only</i>`}\n` +
      `• <b>Trigger:</b> ${timeDisplay}\n\n` +
      `<i>Tap Confirm Auto-Mint below to arm the automatic on-chain executor.</i>`
    );
  }

  private async sendSniperSetupCard(
    chatId: number,
    userKey: string,
    state: UserState,
    walletAddress: string,
    messageId?: number,
    contractAddress?: string
  ): Promise<void> {
    const targetAddr = contractAddress || state.currentContract;
    const target = await this.store.getTarget(userKey, targetAddr);
    if (!target) return;
    state.currentContract = target.contractAddress as `0x${string}`;

    const balance = await this.executor.getBalance(walletAddress);
    const maxPerWallet = target.metadata?.maxPerWallet ? parseInt(target.metadata.maxPerWallet, 10) : undefined;
    const onChainTimeMs = target.metadata?.onChainStartTimeMs ? parseInt(target.metadata.onChainStartTimeMs, 10) : undefined;
    const storedQty = target.metadata?.quantity ? parseInt(target.metadata.quantity, 10) : undefined;
    if (state.targetQty === undefined) {
      state.targetQty = storedQty && storedQty > 0 ? storedQty : 1;
    }
    const limit = maxPerWallet || 10;
    const qty = Math.min(Math.max(1, state.targetQty || 1), limit);
    state.targetQty = qty;
    const scheduledTimeMs = onChainTimeMs;

    const priceStatus = getPriceStatus(target.pricePerNft, target.metadata);
    const totalWei = priceStatus === 'known' ? target.pricePerNft * BigInt(qty) : 0n;
    const [balanceDisplay, unitPriceDisplay, totalCostDisplay] = await Promise.all([
      formatEthUsd(balance),
      priceStatus === 'known' ? formatWeiEthUsd(target.pricePerNft) : Promise.resolve('Unavailable'),
      priceStatus === 'known' ? formatWeiEthUsd(totalWei) : Promise.resolve('Unavailable')
    ]);

    const setupText = this.renderSniperSetupText(
      target.metadata?.name,
      target.metadata?.symbol,
      target.contractAddress,
      qty,
      target.pricePerNft,
      priceStatus,
      unitPriceDisplay,
      totalCostDisplay,
      target.isLive,
      walletAddress,
      balanceDisplay,
      scheduledTimeMs,
      maxPerWallet,
      Boolean(onChainTimeMs && scheduledTimeMs === onChainTimeMs)
    );

    const setupButtons = this.getSniperSetupButtons(
      target.contractAddress,
      qty,
      target.isLive,
      scheduledTimeMs,
      maxPerWallet,
      totalCostDisplay,
      priceStatus
    );

    if (messageId) {
      await this.telegram.editMessageText(chatId, messageId, setupText, setupButtons);
    } else {
      await this.telegram.sendMessage(chatId, setupText, setupButtons);
    }
  }

  private async renderSchedulesCard(chatId: number, userKey: string, messageId?: number): Promise<void> {
    const allTargets = await this.store.getUserTargets?.(userKey) ?? [];
    const activeTargets = allTargets.filter(t => t.contractAddress && t.verified && t.metadata?.approvalStatus === 'approved' && t.metadata?.executionStatus !== 'claimed');

    if (activeTargets.length === 0) {
      const emptyText =
        `📅 <b>Armed Auto-Mint Monitor (Robinhood Chain 4663)</b>\n\n` +
        `• <i>No auto-mint targets are currently armed.</i>\n\n` +
        `Send an NFT contract address or use /automint to stage and arm auto-mint targets.`;
      const buttons: TelegramButton[][] = [
        [{ text: '🎯 Arm Auto-Mint (/automint)', callback_data: 'cmd:automint' }],
        [{ text: '🔙 Back to Menu', callback_data: 'cmd:menu' }]
      ];
      if (messageId) {
        await this.telegram.editMessageText(chatId, messageId, emptyText, buttons);
      } else {
        await this.telegram.sendMessage(chatId, emptyText, buttons);
      }
      return;
    }

    let scheduleText = `📅 <b>Active Armed Auto-Mints (Robinhood Chain 4663)</b>\n\n` +
      `<b>Armed Targets (${activeTargets.length}):</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    const buttons: TelegramButton[][] = [];

    for (let i = 0; i < activeTargets.length; i++) {
      const t = activeTargets[i];
      const name = t.metadata?.name || 'Robinhood NFT Drop';
      const symbol = t.metadata?.symbol || 'NFT';
      const priceStatus = getPriceStatus(t.pricePerNft, t.metadata);
      const priceDisplay = priceStatus === 'unavailable' ? 'Price unavailable' : await formatWeiEthUsd(t.pricePerNft);
      const qty = t.metadata?.quantity || '1';
      const onChainTimeMs = t.metadata?.onChainStartTimeMs ? parseInt(t.metadata.onChainStartTimeMs, 10) : undefined;
      const timeDisplay = this.formatScheduledTime(onChainTimeMs, Boolean(onChainTimeMs), t.isLive);

      scheduleText += `${i + 1}️⃣ <b>${name}</b> (${symbol})\n` +
        `• <b>Contract:</b> <code>${t.contractAddress}</code>\n` +
        `• <b>Order:</b> ${qty}x | <b>Price:</b> ${priceDisplay}\n` +
        `• <b>Status:</b> ${t.isLive ? '🟢 <b>LIVE NOW</b>' : '⚪️ <b>PENDING</b>'}\n` +
        `• <b>Trigger:</b> ${timeDisplay}\n\n`;

      buttons.push([
        { text: `🗑 Cancel #${i + 1} (${name.slice(0, 18)})`, callback_data: `cmd:del:${t.contractAddress.toLowerCase()}` }
      ]);
    }

    scheduleText += `<i>The sniper engine is monitoring all targets and will fire at the exact opening block!</i>`;

    if (activeTargets.length > 1) {
      buttons.push([
        { text: '🗑 Cancel All Schedules', callback_data: 'cmd:del:all' }
      ]);
    }

    buttons.push([
      { text: '🎯 Arm Another Auto-Mint', callback_data: 'cmd:automint' },
      { text: '🔙 Menu', callback_data: 'cmd:menu' }
    ]);

    if (messageId) {
      await this.telegram.editMessageText(chatId, messageId, scheduleText, buttons);
    } else {
      await this.telegram.sendMessage(chatId, scheduleText, buttons);
    }
  }

  private async getUserWallet(userId: string): Promise<{ address: `0x${string}`; privateKey: string } | undefined> {
    const mem = this.walletCache.get(userId);
    if (mem) return mem;

    const existing = await this.store.getEncryptedWallet(userId);
    if (!existing) return undefined;
    try {
      const privateKey = await this.walletManager.decrypt(existing.encryptedKey, existing.iv, existing.tag);
      const res = { address: existing.address as `0x${string}`, privateKey };
      this.walletCache.set(userId, res);
      return res;
    } catch {
      return undefined;
    }
  }

  private async createNewUserWallet(userId: string): Promise<{ address: `0x${string}`; privateKey: string }> {
    const newWallet = await this.walletManager.generateWallet();
    await this.store.saveEncryptedWallet(userId, {
      address: newWallet.address,
      encryptedKey: newWallet.encrypted.encryptedKey,
      iv: newWallet.encrypted.iv,
      tag: newWallet.encrypted.tag,
      createdAt: Date.now()
    });
    const res = { address: newWallet.address, privateKey: newWallet.privateKey };
    this.walletCache.set(userId, res);
    return res;
  }

  async handle(update: TelegramUpdate): Promise<void> {
    if (update.callback_query) {
      const callbackUser = String(update.callback_query.from.id);
      const callbackUsername = (update.callback_query.from as { username?: string }).username;
      await this.store.recordUsername?.(callbackUser, callbackUsername);
      if (!(await this.hasPaidAccess(callbackUser, this.config.adminUserIds.includes(callbackUser)))) {
        await this.telegram.answerCallbackQuery(update.callback_query.id);
        if (update.callback_query.message?.chat.id !== undefined) await this.sendPaymentInstructions(update.callback_query.message.chat.id);
        return;
      }
      await this.handleCallback(update.callback_query);
      return;
    }
    const message = update.message;
    if (!message?.text || !message.from) return;
    const chatId = message.chat.id;
    const userKey = String(message.from.id);
    const username = (message.from as { username?: string }).username?.toLowerCase();
    await this.store.recordUsername?.(userKey, username);
    const isAdmin = this.config.adminUserIds.includes(userKey);
    const text = message.text.trim();
    const initialCommand = text.split(/\s+/, 1)[0].toLowerCase();
    if (!this.isFreeCommand(initialCommand) && !(await this.hasPaidAccess(userKey, isAdmin))) {
      await this.sendPaymentInstructions(chatId);
      return;
    }

    const state = this.users.get(userKey) ?? { monitoring: false };
    this.users.set(userKey, state);

    // Run wallet lookup in parallel with everything else — no sequential wait
    const userWallet = await this.getUserWallet(userKey);
    if (userWallet) {
      state.address = userWallet.address;
    }

    // 1. Instant Private Key Import Detection
    const cleanCandidate = text.replace(/[\s\r\n'"`]/g, '');
    const cleanHexKey = cleanCandidate.replace(/^(\/importkey|\/import)/i, '').replace(/^(?:0x|0X)/, '');
    if (/^[a-fA-F0-9]{64}$/i.test(cleanHexKey) && !text.startsWith('/automint') && !text.startsWith('/withdraw') && !text.startsWith('/sellnft')) {
      try {
        const imported = await this.walletManager.importWallet(`0x${cleanHexKey}`);
        await this.store.saveEncryptedWallet(userKey, {
          address: imported.address,
          encryptedKey: imported.encrypted.encryptedKey,
          iv: imported.encrypted.iv,
          tag: imported.encrypted.tag,
          createdAt: Date.now()
        });
        this.walletCache.set(userKey, { address: imported.address, privateKey: imported.privateKey });
        state.address = imported.address;
        state.flow = undefined;
        await this.telegram.sendMessage(
          chatId,
          `🎉 <b>Account Added & Secured!</b>\n\n` +
          `• <b>Wallet Address:</b> <code>${imported.address}</code>\n` +
          `• <b>Network:</b> Robinhood Chain (4663)\n` +
          `• <b>Encryption:</b> 🔒 AES-256-GCM Active\n\n` +
          `⚠️ <b>SECURITY TIP:</b> Please <b>delete your private key message</b> from this Telegram chat now for your safety and privacy!\n\n` +
          `You can now snipe drops directly from this wallet.`,
          this.getMainMenuButtons()
        );
        return;
      } catch (e) {
        await this.telegram.sendMessage(chatId, `❌ Failed to import private key: ${e instanceof Error ? e.message : 'Invalid format'}`);
        return;
      }
    }

    // 2. Instant Contract Address (CA) Drop Detection (Paste any 0x contract address directly)
    const cleanCA = text.replace(/[\s\r\n'"`]/g, '');
    if (publicAddressRegex.test(cleanCA) && !text.startsWith('/withdraw') && !text.startsWith('/exportkey')) {
      if (!userWallet) {
        await this.telegram.sendMessage(
          chatId,
          `⚠️ You haven't connected a wallet yet. Please create or import a wallet first before sniping drops:`,
          this.getOnboardingButtons()
        );
        return;
      }

      try {
        await this.telegram.sendMessage(chatId, `🔍 <b>Inspecting contract on Robinhood Chain (4663)...</b>\n<code>${cleanCA}</code>`);
        const client = createChainClient(this.config);
        const discovery = await discoverRobinhoodContract(client, cleanCA, this.config.rpcUrl);
        if (discovery.status !== 'CLASSIFIED_SAFE') {
          await this.telegram.sendMessage(chatId, `⚠️ Could not stage contract: ${discovery.reason}`, this.getMainMenuButtons());
          return;
        }

        await this.store.stageTarget(userKey, discovery.address, discovery.schemaId, discovery.pricePerNft, discovery.isLive, {
          name: discovery.metadata.name,
          symbol: discovery.metadata.symbol,
          maxPerWallet: discovery.maxPerWallet ? String(discovery.maxPerWallet) : undefined,
          onChainStartTimeMs: discovery.onChainStartTimeMs ? String(discovery.onChainStartTimeMs) : undefined,
          onChainEndTimeMs: discovery.onChainEndTimeMs ? String(discovery.onChainEndTimeMs) : undefined,
          seaDropAddress: discovery.seaDropAddress,
          phaseKind: discovery.phaseKind,
          phaseStatus: discovery.phaseStatus,
          priceStatus: discovery.priceStatus
        });

        state.currentContract = discovery.address;
        state.targetQty = 1;
        await this.sendSniperSetupCard(chatId, userKey, state, userWallet.address, undefined, discovery.address);
      } catch (err) {
        console.error('CA drop error:', err);
        await this.telegram.sendMessage(chatId, `⚠️ Could not inspect contract: ${err instanceof Error ? err.message : String(err)}`, this.getMainMenuButtons());
      }
      return;
    }

    // 3. Instant Direct Transfer / Auto-Sell Detection: "0xContract 42 0xRecipient"
    const words = text.split(/\s+/);
    if (words.length === 3 && publicAddressRegex.test(words[0]) && /^\d+$/.test(words[1]) && publicAddressRegex.test(words[2])) {
      if (!userWallet) {
        await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
        return;
      }
      const [nftAddr, tokenId, dest] = words;
      await this.telegram.sendMessage(chatId, `⏳ Transferring / Auto-Selling <code>${nftAddr} #${tokenId}</code> to <code>${dest}</code>...`);
      const res = await this.executor.autoSellNFT(userWallet.privateKey, nftAddr, tokenId, dest);
      if (res.success) {
        await this.telegram.sendMessage(
          chatId,
          `🎉 <b>NFT TRANSFER / AUTO-SELL COMPLETE!</b>\n\n` +
          `• <b>NFT:</b> <code>${nftAddr} #${tokenId}</code>\n` +
          `• <b>Recipient / Buyer:</b> <code>${dest}</code>\n` +
          `• <b>Tx Hash:</b> <code>${res.txHash}</code>\n\n` +
          `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
          this.getMainMenuButtons()
        );
      } else {
        await this.telegram.sendMessage(chatId, `❌ Transfer failed: ${res.error}`, this.getMainMenuButtons());
      }
      return;
    }

    // 4. Handle conversational step-by-step flows
    const flowHandled = await this.handleFlowInput(state, userKey, chatId, text);
    if (flowHandled) return;

    const [command, argument, secondArgument] = text.split(/\s+/, 3);

    switch (command.toLowerCase()) {
      case '/pay':
      case '/payment': {
        await this.sendPaymentInstructions(chatId);
        break;
      }

      case '/verifyaccess':
      case '/verify': {
        if (!argument) {
          await this.telegram.sendMessage(chatId, 'Usage: /verifyaccess <full 0x transaction hash or Robinhood Blockscout transaction URL>');
          break;
        }
        if (!this.config.paymentRecipient) {
          await this.telegram.sendMessage(chatId, '⚠️ Paid access is not configured yet. Please contact an administrator.');
          break;
        }
        await this.telegram.sendMessage(chatId, `🔍 Verifying your payment on Robinhood Chain (4663)...`);
        const verification = await verifyAccessPayment(createChainClient(this.config), {
          recipient: this.config.paymentRecipient,
          wethAddress: this.config.wethAddress,
          usdAmount: this.config.paymentUsdAmount,
          confirmations: this.config.paymentConfirmations
        }, argument);
        if (verification.status !== 'accepted') {
          await this.telegram.sendMessage(chatId, `⚠️ Payment not accepted: ${verification.reason}`);
          break;
        }
        if (!this.store.isDurableStore?.() || !this.store.consumePayment) {
          await this.telegram.sendMessage(chatId, '⚠️ Durable payment storage is unavailable. Please try again later.');
          break;
        }
        const consumed = await this.store.consumePayment({ ...verification.payment, chainId: 4663, userId: userKey });
        if (consumed === 'already_used') {
          await this.telegram.sendMessage(chatId, '⚠️ This payment has already been used for access and cannot be reused.');
          break;
        }
        await this.store.grantEntitlement?.(userKey, username, 'payment', verification.payment.paymentId);
        await this.telegram.sendMessage(
          chatId,
          `✅ <b>Access payment verified</b>\n\n` +
          `• <b>Asset:</b> ${verification.payment.asset}\n` +
          `• <b>Amount:</b> ${await formatWeiEthUsd(verification.payment.amountWei)}\n` +
          `• <b>Transaction:</b> <code>${verification.payment.txHash}</code>\n` +
          `• <b>Access:</b> Active\n\n` +
          `You can now use the wallet and auto-mint features.`,
          this.getMainMenuButtons()
        );
        break;
      }

      case '/start':
      case '/menu': {
        if (!(await this.hasPaidAccess(userKey, isAdmin))) {
          await this.sendPaymentInstructions(chatId);
          break;
        }
        if (!userWallet) {
          await this.telegram.sendMessage(
            chatId,
            `⚡️ <b>Welcome to Mintobot (Robinhood Chain 4663)</b>\n\n` +
            `The fastest automated NFT sniper on Robinhood Chain.\n\n` +
            `• <b>Direct-to-Wallet</b>: Mints execute in milliseconds directly from your wallet.\n` +
            `• <b>Zero Manual Clicks</b>: Snipes the exact block drops go live.\n` +
            `• <b>100% Encrypted</b>: Military-grade AES-256-GCM key security.\n\n` +
            `To get started, choose an option below:`,
            this.getOnboardingButtons()
          );
          break;
        }

        // ⚡️ Instant response — no RPC or price API call here
        // Balance is shown in /wallet to keep /start near-instant
        await this.telegram.sendMessage(
          chatId,
          `⚡️ <b>Mintobot — Robinhood Chain Sniper (4663)</b>\n\n` +
          `💳 <b>Sniper Wallet:</b>\n<code>${userWallet.address}</code>\n\n` +
          `🟢 <b>Network:</b> Robinhood Chain Mainnet (4663)\n` +
          `⚡️ <b>Execution:</b> Direct Sub-Second Execution\n\n` +
          `<i>Drop any NFT contract address (CA) directly into this chat to stage & auto-mint instantly!</i>`,
          this.getMainMenuButtons(isAdmin)
        );
        break;
      }

      case '/wallet': {
        if (!userWallet) {
          await this.telegram.sendMessage(
            chatId,
            `⚠️ You haven't connected a wallet yet. Choose an option below:`,
            this.getOnboardingButtons()
          );
          break;
        }
        const liveBal = await this.executor.getBalance(userWallet.address);
        await this.telegram.sendMessage(
          chatId,
          `💳 <b>Your Sniper Wallet Details:</b>\n\n` +
          `• <b>Address:</b> <code>${userWallet.address}</code>\n` +
          `• <b>Balance:</b> <b>${await formatEthUsd(liveBal)}</b>\n` +
          `• <b>Network:</b> Robinhood Chain Mainnet (4663)\n\n` +
          `<i>Send ETH to this address on Robinhood Chain to fund your auto-mints and gas.</i>`,
          this.getMainMenuButtons()
        );
        break;
      }

      case '/automint':
      case '/snipe': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        if (!argument || !publicAddressRegex.test(argument)) {
          state.flow = { type: 'automint' };
          await this.telegram.sendMessage(
            chatId,
            `🎯 <b>Prepare Contract for Auto-Minting</b>\n\n` +
            `Send the NFT contract address on Robinhood Chain:\n\n` +
            `Example: <code>0x1234567890abcdef1234567890abcdef12345678</code>\n\n` +
            `Or send /cancel.`
          );
          break;
        }

        try {
          await this.telegram.sendMessage(chatId, `🔍 <b>Inspecting contract on Robinhood Chain (4663)...</b>\n<code>${argument}</code>`);
          const client = createChainClient(this.config);
          const discovery = await discoverRobinhoodContract(client, argument, this.config.rpcUrl);
          if (discovery.status !== 'CLASSIFIED_SAFE') {
            await this.telegram.sendMessage(chatId, `⚠️ Could not stage target: ${discovery.reason}`, this.getMainMenuButtons());
            break;
          }

          await this.store.stageTarget(userKey, discovery.address, discovery.schemaId, discovery.pricePerNft, discovery.isLive, {
            name: discovery.metadata.name,
            symbol: discovery.metadata.symbol,
            priceStatus: discovery.priceStatus,
            maxPerWallet: discovery.maxPerWallet ? String(discovery.maxPerWallet) : undefined,
            onChainStartTimeMs: discovery.onChainStartTimeMs ? String(discovery.onChainStartTimeMs) : undefined,
            onChainEndTimeMs: discovery.onChainEndTimeMs ? String(discovery.onChainEndTimeMs) : undefined,
            seaDropAddress: discovery.seaDropAddress,
            phaseKind: discovery.phaseKind,
            phaseStatus: discovery.phaseStatus
          });

          state.currentContract = discovery.address;
          state.targetQty = 1;
          await this.sendSniperSetupCard(chatId, userKey, state, userWallet.address, undefined, discovery.address);
        } catch (err) {
          console.error('/automint error:', err);
          await this.telegram.sendMessage(chatId, `⚠️ Failed to inspect contract: ${err instanceof Error ? err.message : String(err)}`, this.getMainMenuButtons());
        }
        break;
      }

      case '/confirmtarget': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        const target = await this.store.getTarget(userKey);
        if (!target) {
          await this.telegram.sendMessage(chatId, 'No target is waiting. Run /automint 0xContract first.');
          break;
        }
        await this.requestAutoMintApproval(chatId, userKey, state, target);
        break;
      }

      case '/schedules':
      case '/scheduled':
      case '/targets': {
        await this.renderSchedulesCard(chatId, userKey);
        break;
      }

      case '/sellnft':
      case '/sendnft': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        const parts = text.split(/\s+/);
        if (parts.length >= 4) {
          const nftAddr = parts[1];
          const tokenId = parts[2];
          const dest = parts[3];
          if (publicAddressRegex.test(nftAddr) && /^\d+$/.test(tokenId) && publicAddressRegex.test(dest)) {
            await this.telegram.sendMessage(chatId, `⏳ Transferring / Auto-Selling <code>${nftAddr} #${tokenId}</code> to <code>${dest}</code>...`);
            const res = await this.executor.autoSellNFT(userWallet.privateKey, nftAddr, tokenId, dest);
            if (res.success) {
              await this.telegram.sendMessage(
                chatId,
                `🎉 <b>NFT TRANSFER / AUTO-SELL COMPLETE!</b>\n\n` +
                `• <b>NFT:</b> <code>${nftAddr} #${tokenId}</code>\n` +
                `• <b>Recipient / Buyer:</b> <code>${dest}</code>\n` +
                `• <b>Tx Hash:</b> <code>${res.txHash}</code>\n\n` +
                `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
                this.getMainMenuButtons()
              );
            } else {
              await this.telegram.sendMessage(chatId, `❌ Transfer failed: ${res.error}`, this.getMainMenuButtons());
            }
            break;
          }
        }
        state.flow = { type: 'sellnft' };
        await this.telegram.sendMessage(
          chatId,
          `💰 <b>Auto-Sell & NFT Transfer</b>\n\n` +
          `Step 1 of 3: Send the NFT contract address on Robinhood Chain:\n\n` +
          `Example: <code>0x1234567890abcdef1234567890abcdef12345678</code>\n\n` +
          `Or send /cancel.`
        );
        break;
      }

      case '/withdraw': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        if (!argument || !publicAddressRegex.test(argument)) {
          state.flow = { type: 'withdraw' };
          await this.telegram.sendMessage(
            chatId,
            `📤 <b>Withdraw ETH to Cold Wallet:</b>\n\n` +
            `Send your destination 0x address:\n\n` +
            `Example: <code>0xYourMainWalletAddress...</code>\n\n` +
            `Or send /cancel.`
          );
          break;
        }

        const dest = argument as `0x${string}`;
        const amt = secondArgument;
        await this.telegram.sendMessage(chatId, `⏳ Processing withdrawal to <code>${dest}</code>...`);
        const res = await this.executor.withdrawETH(userWallet.privateKey, dest, amt);
        if (res.success) {
          const withdrawalAmount = amt ? await formatEthUsd(amt) : 'All available ETH';
          await this.telegram.sendMessage(
            chatId,
            `✅ <b>Withdrawal Complete!</b>\n\n` +
            `• <b>Amount:</b> ${withdrawalAmount}\n` +
            `• <b>Tx Hash:</b> <code>${res.txHash}</code>\n` +
            `• <b>Destination:</b> <code>${dest}</code>\n\n` +
            `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
            this.getMainMenuButtons()
          );
        } else {
          await this.telegram.sendMessage(chatId, `❌ Withdrawal failed: ${res.error}`, this.getMainMenuButtons());
        }
        break;
      }

      case '/exportkey': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        await this.telegram.sendMessage(
          chatId,
          `🔐 <b>Your Private Key:</b>\n\n` +
          `<code>${userWallet.privateKey}</code>\n\n` +
          `⚠️ <b>Security Notice:</b> Never share this key with anyone. You can import this key into Rabby, Zerion, or MetaMask anytime to access your funds and NFTs.`,
          this.getMainMenuButtons()
        );
        break;
      }

      case '/importkey': {
        if (!argument || !privateKeyRegex.test(argument)) {
          state.flow = { type: 'importkey' };
          await this.telegram.sendMessage(
            chatId,
            `📥 <b>Import Existing Private Key:</b>\n\n` +
            `Paste your 64-character private key (with or without 0x):\n\n` +
            `⚠️ Send /cancel if you change your mind.`
          );
          break;
        }

        try {
          const imported = await this.walletManager.importWallet(argument);
          await this.store.saveEncryptedWallet(userKey, {
            address: imported.address,
            encryptedKey: imported.encrypted.encryptedKey,
            iv: imported.encrypted.iv,
            tag: imported.encrypted.tag,
            createdAt: Date.now()
          });
          this.walletCache.set(userKey, { address: imported.address, privateKey: imported.privateKey });
          state.address = imported.address;
          await this.telegram.sendMessage(
            chatId,
            `🎉 <b>Account Added & Secured!</b>\n\n` +
            `• <b>Wallet Address:</b> <code>${imported.address}</code>\n` +
            `• <b>Network:</b> Robinhood Chain (4663)\n` +
            `• <b>Encryption:</b> 🔒 AES-256-GCM Active\n\n` +
            `⚠️ <b>SECURITY TIP:</b> Please <b>delete your private key message</b> from this Telegram chat now for your safety and privacy!\n\n` +
            `You can now snipe drops directly from this wallet.`,
            this.getMainMenuButtons()
          );
        } catch (e) {
          await this.telegram.sendMessage(chatId, `❌ Invalid private key. Please check and try again.`);
        }
        break;
      }

      case '/status': {
        if (!userWallet) {
          await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
          break;
        }
        const liveBal = await this.executor.getBalance(userWallet.address);
        const target = await this.store.getTarget(userKey);
        const isApproved = Boolean(target?.verified && target.metadata?.approvalStatus === 'approved');
        const isMonitoring = Boolean(isApproved && target?.metadata?.executionStatus !== 'claimed');
        const targetDisplay = !target
          ? '<i>No target armed (/automint)</i>'
          : isApproved
            ? `<code>${target.contractAddress}</code> (${target.isLive ? '🟢 Live' : '⚪️ Pending'})`
            : `<code>${target.contractAddress}</code> (🟡 Prepared — not armed)`;
        await this.telegram.sendMessage(
          chatId,
          `📊 <b>Mintobot Sniper Status:</b>\n\n` +
          `• <b>Wallet:</b> <code>${userWallet.address}</code>\n` +
          `• <b>Balance:</b> <b>${await formatEthUsd(liveBal)}</b>\n` +
          `• <b>Monitoring:</b> ${isMonitoring ? '🟢 Active (Auto-Sniper Armed)' : '⚪️ Inactive'}\n` +
          `• <b>Drop:</b> ${targetDisplay}\n` +
          `• <b>Network:</b> Robinhood Chain Mainnet (4663)`,
          this.getMainMenuButtons()
        );
        break;
      }

      case '/admin':
      case '/listusers': {
        if (!isAdmin) {
          await this.telegram.sendMessage(chatId, '⛔️ Only administrators can access admin commands.');
          break;
        }
        const users = this.store.listEntitlements ? await this.store.listEntitlements() : [];
        const text = users.length
          ? users.map((user) => `${user.status === 'active' ? '✅' : '⛔️'} <code>${user.userId}</code>${user.username ? ` @${user.username}` : ''} — ${user.source}`).join('\n')
          : 'No users found.';
        await this.telegram.sendMessage(
          chatId,
          `👑 <b>Admin Dashboard — Authorized Users:</b>\n\n${text}\n\n<i>Use buttons below or /adduser /removeuser:</i>`,
          [
            [
              { text: '➕ Add User', callback_data: 'cmd:adduser' },
              { text: '➖ Remove User', callback_data: 'cmd:removeuser' }
            ],
            [
              { text: '🔙 Menu', callback_data: 'cmd:menu' }
            ]
          ]
        );
        break;
      }

      case '/adduser': {
        if (!isAdmin) {
          await this.telegram.sendMessage(chatId, '⛔️ Only administrators can authorize new users.');
          break;
        }
        if (!argument) {
          state.flow = { type: 'adduser' };
          await this.telegram.sendMessage(
            chatId,
            `👤 <b>Admin: Authorize User Access</b>\n\n` +
            `Send the Telegram Numeric User ID or @username to grant access:\n\n` +
            `Example: <code>123456789</code> or <code>@username</code>\n\n` +
            `Or send /cancel.`
          );
          break;
        }
        const rawTarget = argument.trim();
        const targetUser = /^\d+$/.test(rawTarget)
          ? rawTarget
          : await this.store.resolveUsername?.(rawTarget);
        if (!targetUser) {
          await this.telegram.sendMessage(chatId, '⚠️ Use a numeric Telegram UID, or a username the bot has already observed.');
          break;
        }
        await this.store.grantEntitlement?.(targetUser, /^\d+$/.test(rawTarget) ? undefined : rawTarget, 'admin');
        await this.telegram.sendMessage(chatId, `✅ User <b>${argument}</b> (ID: <code>${targetUser}</code>) authorized with durable access.`, this.getMainMenuButtons(true));
        break;
      }

      case '/removeuser': {
        if (!isAdmin) {
          await this.telegram.sendMessage(chatId, '⛔️ Only administrators can revoke users.');
          break;
        }
        if (!argument) {
          state.flow = { type: 'removeuser' };
          await this.telegram.sendMessage(
            chatId,
            `👤 <b>Admin: Revoke User Access</b>\n\n` +
            `Send the Telegram Numeric User ID or @username to revoke access:\n\n` +
            `Example: <code>123456789</code> or <code>@username</code>\n\n` +
            `Or send /cancel.`
          );
          break;
        }
        const rawTarget = argument.trim();
        const targetUser = /^\d+$/.test(rawTarget)
          ? rawTarget
          : await this.store.resolveUsername?.(rawTarget);
        if (!targetUser) {
          await this.telegram.sendMessage(chatId, '⚠️ Use a numeric Telegram UID, or a username the bot has already observed.');
          break;
        }
        const removed = await this.store.revokeEntitlement?.(targetUser);
        await this.telegram.sendMessage(chatId, removed ? `✅ Access revoked for <b>${argument}</b> (ID: <code>${targetUser}</code>).` : '⚠️ That user does not have active paid access.', this.getMainMenuButtons(true));
        break;
      }

      case '/cancel': {
        state.flow = undefined;
        await this.telegram.sendMessage(chatId, 'Operation cancelled.', this.getMainMenuButtons(isAdmin));
        break;
      }

      case '/help': {
        const adminHelpSection = isAdmin
          ? `\n👑 <b>Admin Controls:</b>\n` +
            `• <b>/adduser &lt;UID|@username&gt;</b> — grant user access\n` +
            `• <b>/removeuser &lt;UID|@username&gt;</b> — revoke user access\n` +
            `• <b>/listusers</b> — view all access users\n`
          : '';

        await this.telegram.sendMessage(
          chatId,
          `📖 <b>Mintobot Command Guide (Robinhood Chain 4663)</b>\n\n` +
          `💳 <b>Access:</b>\n` +
          `• <b>/pay</b> — view the one-time $${this.config.paymentUsdAmount.toFixed(2)} access payment instructions\n` +
          `• <b>/verifyaccess &lt;tx&gt;</b> — verify ETH or WETH payment on-chain\n\n` +
          `🚀 <b>Sniping & Drops:</b>\n` +
          `• <b>/start</b> — open your sniper dashboard\n` +
          `• <b>/automint 0xContract</b> — arm an NFT contract for automatic minting\n` +
          `• <b>/confirmtarget</b> — confirm automatic on-chain minting\n` +
          `• <b>/sellnft 0x... id 0x...</b> — auto-sell or transfer an NFT\n\n` +
          `💳 <b>Wallet & Funds:</b>\n` +
          `• <b>/wallet</b> — view sniper wallet address & live balance\n` +
          `• <b>/importkey 0x...</b> — import any private key (AES-256-GCM encrypted)\n` +
          `• <b>/exportkey</b> — view & back up your private key\n` +
          `• <b>/withdraw 0x... [amt]</b> — send ETH back to your cold wallet\n\n` +
          `⚙️ <b>Control:</b>\n` +
          `• <b>/status</b> — view active monitoring & drop status\n` +
          adminHelpSection +
          `\n<i>Direct-wallet execution on Robinhood Chain (4663) with zero server custody.</i>\n\n` +
          `🆘 <b>Support:</b> Message @damiblaize (Blaize) if an issue arises.`,
          this.getMainMenuButtons(isAdmin)
        );
        break;
      }

      default: {
        if (!userWallet) {
          await this.telegram.sendMessage(
            chatId,
            `👋 Send /start or choose an option below to set up your sniper wallet:`,
            this.getOnboardingButtons()
          );
        } else {
          await this.telegram.sendMessage(
            chatId,
            `💡 <b>Quick Actions:</b>\n\n• Paste any <b>Contract Address (0x...)</b> to stage an auto-mint\n• Send <code>/sellnft 0x... id 0x...</code> to transfer an NFT\n• Send /start for your wallet dashboard`,
            this.getMainMenuButtons()
          );
        }
        break;
      }
    }
  }

  private async handleFlowInput(state: UserState, userKey: string, chatId: number, text: string): Promise<boolean> {
    if (!state.flow || text.startsWith('/')) return false;

    if (state.flow.type === 'automint') {
      if (!publicAddressRegex.test(text)) {
        await this.telegram.sendMessage(chatId, 'That is not a valid 0x contract address. Send a valid contract or /cancel.');
        return true;
      }
      state.flow = undefined;
      try {
        await this.telegram.sendMessage(chatId, `🔍 <b>Inspecting contract on Robinhood Chain (4663)...</b>\n<code>${text}</code>`);
        const client = createChainClient(this.config);
        const discovery = await discoverRobinhoodContract(client, text, this.config.rpcUrl);
        if (discovery.status !== 'CLASSIFIED_SAFE') {
          await this.telegram.sendMessage(chatId, `⚠️ Could not stage target: ${discovery.reason}`, this.getMainMenuButtons());
          return true;
        }
        const wallet = await this.getUserWallet(userKey);
        await this.store.stageTarget(userKey, discovery.address, discovery.schemaId, discovery.pricePerNft, discovery.isLive, {
          name: discovery.metadata.name,
          symbol: discovery.metadata.symbol,
          maxPerWallet: discovery.maxPerWallet ? String(discovery.maxPerWallet) : undefined,
          onChainStartTimeMs: discovery.onChainStartTimeMs ? String(discovery.onChainStartTimeMs) : undefined,
          onChainEndTimeMs: discovery.onChainEndTimeMs ? String(discovery.onChainEndTimeMs) : undefined,
          seaDropAddress: discovery.seaDropAddress,
          phaseKind: discovery.phaseKind,
          phaseStatus: discovery.phaseStatus,
          priceStatus: discovery.priceStatus
        });

        state.currentContract = discovery.address;
        state.targetQty = 1;
        if (wallet) {
          await this.sendSniperSetupCard(chatId, userKey, state, wallet.address, undefined, discovery.address);
        }
      } catch (err) {
        console.error('Automint flow error:', err);
        await this.telegram.sendMessage(chatId, `⚠️ Failed to inspect contract: ${err instanceof Error ? err.message : String(err)}`, this.getMainMenuButtons());
      }
      return true;
    }

    if (state.flow.type === 'withdraw') {
      if (!state.flow.destination) {
        if (!publicAddressRegex.test(text)) {
          await this.telegram.sendMessage(chatId, 'Invalid 0x address. Send a valid destination address or /cancel.');
          return true;
        }
        state.flow.destination = text as `0x${string}`;
        await this.telegram.sendMessage(chatId, `Step 2: Enter the amount of ETH to withdraw (or type <code>all</code> to sweep all funds):`);
        return true;
      }

      const dest = state.flow.destination;
      const amt = text.toLowerCase() === 'all' ? undefined : text;
      state.flow = undefined;

      const wallet = await this.getUserWallet(userKey);
      if (!wallet) return true;
      await this.telegram.sendMessage(chatId, `⏳ Processing withdrawal to <code>${dest}</code>...`);
      const res = await this.executor.withdrawETH(wallet.privateKey, dest, amt);
      if (res.success) {
        const withdrawalAmount = amt ? await formatEthUsd(amt) : 'All available ETH';
        await this.telegram.sendMessage(
          chatId,
          `✅ <b>Withdrawal Complete!</b>\n\n` +
          `• <b>Amount:</b> ${withdrawalAmount}\n` +
          `• <b>Tx Hash:</b> <code>${res.txHash}</code>\n` +
          `• <b>Destination:</b> <code>${dest}</code>\n\n` +
          `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
          this.getMainMenuButtons()
        );
      } else {
        await this.telegram.sendMessage(chatId, `❌ Withdrawal failed: ${res.error}`, this.getMainMenuButtons());
      }
      return true;
    }

    if (state.flow.type === 'sellnft') {
      if (!state.flow.contract) {
        if (!publicAddressRegex.test(text)) {
          await this.telegram.sendMessage(chatId, 'That is not a valid 0x contract address. Send a valid address or /cancel.');
          return true;
        }
        state.flow.contract = text as `0x${string}`;
        await this.telegram.sendMessage(chatId, 'Step 2 of 3: Enter the NFT Token ID (e.g. <code>42</code>):');
        return true;
      }

      if (!state.flow.tokenId) {
        if (!/^\d+$/.test(text)) {
          await this.telegram.sendMessage(chatId, 'Token ID must be a number (e.g. 42), or /cancel.');
          return true;
        }
        state.flow.tokenId = text;
        await this.telegram.sendMessage(chatId, 'Step 3 of 3: Enter the recipient, buyer, or cold wallet address (0x...):');
        return true;
      }

      if (!publicAddressRegex.test(text)) {
        await this.telegram.sendMessage(chatId, 'Invalid destination 0x address. Send a valid address or /cancel.');
        return true;
      }

      const dest = text as `0x${string}`;
      const contract = state.flow.contract;
      const tokenId = state.flow.tokenId;
      state.flow = undefined;

      const userWallet = await this.getUserWallet(userKey);
      if (!userWallet) return true;

      await this.telegram.sendMessage(chatId, `⏳ Transferring <code>${contract} #${tokenId}</code> to <code>${dest}</code>...`);
      const res = await this.executor.autoSellNFT(userWallet.privateKey, contract, tokenId, dest);
      if (res.success) {
        await this.telegram.sendMessage(
          chatId,
          `🎉 <b>NFT TRANSFER / AUTO-SELL COMPLETE!</b>\n\n` +
          `• <b>NFT:</b> <code>${contract} #${tokenId}</code>\n` +
          `• <b>Destination:</b> <code>${dest}</code>\n` +
          `• <b>Tx Hash:</b> <code>${res.txHash}</code>\n\n` +
          `🔗 <a href="https://robinhoodchain.blockscout.com/tx/${res.txHash}">View on Blockscout Explorer</a>`,
          this.getMainMenuButtons()
        );
      } else {
        await this.telegram.sendMessage(chatId, `❌ Transfer failed: ${res.error}`, this.getMainMenuButtons());
      }
      return true;
    }

    if (state.flow.type === 'importkey') {
      const cleanKey = text.replace(/[\s\r\n'"`]/g, '').replace(/^(?:0x|0X)/, '');
      if (!/^[a-fA-F0-9]{64}$/i.test(cleanKey)) {
        await this.telegram.sendMessage(chatId, 'Invalid private key format. Send 64 hex characters or /cancel.');
        return true;
      }
      state.flow = undefined;
      try {
        const imported = await this.walletManager.importWallet(`0x${cleanKey}`);
        await this.store.saveEncryptedWallet(userKey, {
          address: imported.address,
          encryptedKey: imported.encrypted.encryptedKey,
          iv: imported.encrypted.iv,
          tag: imported.encrypted.tag,
          createdAt: Date.now()
        });
        state.address = imported.address;
        await this.telegram.sendMessage(
          chatId,
          `🎉 <b>Account Added & Secured!</b>\n\n` +
          `• <b>Wallet Address:</b> <code>${imported.address}</code>\n` +
          `• <b>Network:</b> Robinhood Chain (4663)\n` +
          `• <b>Encryption:</b> 🔒 AES-256-GCM Active\n\n` +
          `⚠️ <b>SECURITY TIP:</b> Please <b>delete your private key message</b> from this Telegram chat now for your safety and privacy!\n\n` +
          `You can now snipe drops directly from this wallet.`,
          this.getMainMenuButtons()
        );
      } catch (e) {
        await this.telegram.sendMessage(chatId, `❌ Invalid private key: ${e instanceof Error ? e.message : 'Error'}`);
      }
      return true;
    }

    if (state.flow.type === 'customtime') {
      const scheduledTimeMs = parseUserTimeString(text);
      if (!scheduledTimeMs) {
        await this.telegram.sendMessage(
          chatId,
          `⚠️ <b>Invalid time format.</b>\n\nPlease send a valid launch time (e.g. <code>in 15m</code>, <code>20:00 UTC</code>, or <code>14:30</code>) or /cancel:`
        );
        return true;
      }

      state.flow = undefined;
      state.targetTimeMs = scheduledTimeMs;
      await this.store.setTargetSchedule?.(userKey, scheduledTimeMs);

      const wallet = await this.getUserWallet(userKey);
      if (!wallet) return true;

      await this.sendSniperSetupCard(chatId, userKey, state, wallet.address);
      return true;
    }

    if (state.flow.type === 'verifyaccess') {
      // Accept raw tx hash or a Blockscout URL containing the hash
      const match = text.match(/(?:0x|0X)?[a-fA-F0-9]{64}/);
      if (!match) {
        await this.telegram.sendMessage(
          chatId,
          `⚠️ That doesn't look like a valid transaction hash.\n\nPlease paste your full transaction hash (starts with <code>0x</code>) or your Blockscout URL, or send /cancel.`
        );
        return true;
      }
      const rawHash = `0x${match[0].replace(/^0x/i, '').toLowerCase()}` as `0x${string}`;
      if (!this.config.paymentRecipient) {
        await this.telegram.sendMessage(chatId, '⚠️ Paid access is not configured yet. Contact an administrator.');
        state.flow = undefined;
        return true;
      }
      state.flow = undefined;
      await this.telegram.sendMessage(chatId, `🔍 <b>Verifying your payment on Robinhood Chain...</b>\n<code>${rawHash}</code>`);
      try {
        const verification = await verifyAccessPayment(createChainClient(this.config), {
          recipient: this.config.paymentRecipient,
          wethAddress: this.config.wethAddress,
          usdAmount: this.config.paymentUsdAmount,
          confirmations: this.config.paymentConfirmations
        }, rawHash);
        if (verification.status !== 'accepted') {
          await this.telegram.sendMessage(
            chatId,
            `⚠️ <b>Payment not accepted</b>\n\n${verification.reason}\n\nMake sure you sent to the correct address on Robinhood Chain (4663) and try again.`,
            [[{ text: '✅ Try Again — Verify Transaction', callback_data: 'cmd:verifyaccess' }]]
          );
          return true;
        }
        if (!this.store.isDurableStore?.() || !this.store.consumePayment) {
          await this.telegram.sendMessage(chatId, '⚠️ Durable payment storage is unavailable. Please try again later.');
          return true;
        }
        const consumed = await this.store.consumePayment({ ...verification.payment, chainId: 4663, userId: userKey });
        if (consumed === 'already_used') {
          await this.telegram.sendMessage(chatId, '⚠️ This transaction has already been used for access. Each payment can only be used once.');
          return true;
        }
        await this.store.grantEntitlement?.(userKey, undefined, 'payment', verification.payment.paymentId);
        // Show success then immediately open the main dashboard
        const userWallet = await this.getUserWallet(userKey);
        await this.telegram.sendMessage(
          chatId,
          `✅ <b>Access Granted!</b>\n\n` +
          `• <b>Amount paid:</b> ${await formatWeiEthUsd(verification.payment.amountWei)}\n` +
          `• <b>Tx:</b> <code>${verification.payment.txHash}</code>\n` +
          `• <b>Access:</b> 🟢 Active\n\n` +
          `Welcome to Mintobot! 🚀 Let's get your sniper wallet set up.`
        );
        if (!userWallet) {
          await this.telegram.sendMessage(
            chatId,
            `⚡️ <b>Step 1 — Set Up Your Sniper Wallet</b>\n\nChoose an option below to get started:`,
            this.getOnboardingButtons()
          );
        } else {
          const liveBal = await this.executor.getBalance(userWallet.address);
          await this.telegram.sendMessage(
            chatId,
            `⚡️ <b>Mintobot — Robinhood Chain Sniper (4663)</b>\n\n` +
            `💳 <b>Sniper Wallet:</b>\n<code>${userWallet.address}</code>\n\n` +
            `💰 <b>Balance:</b> <b>${await formatEthUsd(liveBal || '0')}</b>\n` +
            `🟢 <b>Network:</b> Robinhood Chain Mainnet (4663)\n\n` +
            `<i>Drop any NFT contract address directly into this chat to stage an auto-mint!</i>`,
            this.getMainMenuButtons()
          );
        }
      } catch (err) {
        await this.telegram.sendMessage(
          chatId,
          `❌ <b>Verification error</b>\n\n${err instanceof Error ? err.message : String(err)}\n\nPlease try again.`,
          [[{ text: '✅ Try Again', callback_data: 'cmd:verifyaccess' }]]
        );
      }
      return true;
    }

    if (state.flow.type === 'adduser') {
      state.flow = undefined;
      const rawTarget = text.trim();
      const targetUser = /^\d+$/.test(rawTarget)
        ? rawTarget
        : await this.store.resolveUsername?.(rawTarget);
      if (!targetUser) {
        await this.telegram.sendMessage(
          chatId,
          `⚠️ Could not find registered user for <b>${text}</b>.\n\nPlease send their numeric Telegram User ID, or ask them to send /start to the bot first.`,
          this.getMainMenuButtons(true)
        );
        return true;
      }
      await this.store.grantEntitlement?.(targetUser, /^\d+$/.test(rawTarget) ? undefined : rawTarget, 'admin');
      await this.telegram.sendMessage(
        chatId,
        `✅ User <b>${rawTarget}</b> (ID: <code>${targetUser}</code>) authorized with durable access!`,
        this.getMainMenuButtons(true)
      );
      return true;
    }

    if (state.flow.type === 'removeuser') {
      state.flow = undefined;
      const rawTarget = text.trim();
      const targetUser = /^\d+$/.test(rawTarget)
        ? rawTarget
        : await this.store.resolveUsername?.(rawTarget);
      if (!targetUser) {
        await this.telegram.sendMessage(
          chatId,
          `⚠️ Could not find registered user for <b>${text}</b>. Please use their numeric Telegram User ID.`,
          this.getMainMenuButtons(true)
        );
        return true;
      }
      const removed = await this.store.revokeEntitlement?.(targetUser);
      await this.telegram.sendMessage(
        chatId,
        removed
          ? `✅ Access revoked for <b>${rawTarget}</b> (ID: <code>${targetUser}</code>).`
          : `⚠️ User <b>${rawTarget}</b> did not have active access.`,
        this.getMainMenuButtons(true)
      );
      return true;
    }

    return false;
  }

  private async requestAutoMintApproval(
    chatId: number,
    userKey: string,
    state: UserState,
    target: Awaited<ReturnType<IStore['getTarget']>>,
    passedQty?: number
  ): Promise<void> {
    if (!target) return;
    if (getPriceStatus(target.pricePerNft, target.metadata) === 'unavailable') {
      await this.telegram.sendMessage(chatId, '⚠️ Mint price is unavailable for this collection. Please retry the contract lookup before arming it.');
      return;
    }

    const norm = target.contractAddress.toLowerCase();
    const maxLimit = target.metadata?.maxPerWallet ? parseInt(target.metadata.maxPerWallet, 10) : 10;
    const storedQty = target.metadata?.quantity ? parseInt(target.metadata.quantity, 10) : 1;
    const requestedQty = passedQty && passedQty > 0
      ? passedQty
      : (state.targetQty && state.targetQty > 0 ? state.targetQty : storedQty);
    const qty = Math.min(Math.max(1, requestedQty), maxLimit > 0 ? maxLimit : 1);
    state.targetQty = qty;
    const scheduledTimeMs = target.metadata?.onChainStartTimeMs ? parseInt(target.metadata.onChainStartTimeMs, 10) : undefined;
    const metadata: Record<string, string | undefined> = {
      ...(target.metadata ?? {}),
      quantity: String(qty),
      approvalStatus: 'pending',
      executionStatus: 'ready'
    };
    delete metadata.userScheduleTimeMs;
    delete metadata.scheduleSource;

    await this.store.stageTarget(userKey, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, metadata);
    const persistedApproval = await this.store.getTarget(userKey, target.contractAddress);
    if (!persistedApproval || persistedApproval.metadata?.approvalStatus !== 'pending') {
      await this.telegram.sendMessage(
        chatId,
        '⚠️ Approval could not be saved yet. Nothing was armed. Please press Auto-Mint again.',
        this.getMainMenuButtons()
      );
      return;
    }
    const approvalUnitPrice = await formatWeiEthUsd(target.pricePerNft);
    const approvalTotalPrice = await formatWeiEthUsd(target.pricePerNft * BigInt(qty));
    await this.telegram.sendMessage(
      chatId,
      `⚠️ <b>Are you sure you want to auto-mint this NFT?</b>\n\n` +
      `• <b>Collection:</b> ${metadata.name || 'Robinhood NFT Drop'} (${metadata.symbol || 'NFT'})\n` +
      `• <b>Contract:</b> <code>${target.contractAddress}</code>\n` +
      `• <b>Quantity:</b> <b>${qty} NFT${qty > 1 ? 's' : ''}</b>\n` +
      `• <b>Unit Price:</b> ${approvalUnitPrice}\n` +
      `• <b>Total Mint Cost:</b> ${approvalTotalPrice} + gas\n` +
      `• <b>Trigger:</b> ${scheduledTimeMs && scheduledTimeMs > Date.now() ? this.formatScheduledTime(scheduledTimeMs, true) : 'When the on-chain mint opens'}\n` +
      `• <b>Gas:</b> Paid from the approved sniper wallet\n\n` +
      `<i>Nothing will be armed or minted until you press Confirm Auto-Mint.</i>`,
      [[
        { text: `✅ Confirm Auto-Mint (${qty} NFT${qty > 1 ? 's' : ''})`, callback_data: `arm:confirm:${norm}:${qty}` },
        { text: '❌ Cancel', callback_data: `arm:cancel:${norm}` }
      ]]
    );
  }

  private async handleCallback(callback: NonNullable<TelegramUpdate['callback_query']>): Promise<void> {
    await this.telegram.answerCallbackQuery(callback.id);
    const userKey = String(callback.from.id);
    const chatId = callback.message?.chat.id;
    if (chatId === undefined) return;
    const state = this.users.get(userKey) ?? { monitoring: false };
    this.users.set(userKey, state);

    if (callback.data === 'cmd:createwallet') {
      const newWallet = await this.createNewUserWallet(userKey);
      state.address = newWallet.address;
      await this.telegram.sendMessage(
        chatId,
        `🎉 <b>New Sniper Wallet Created!</b>\n\n` +
        `💳 <b>Address:</b>\n<code>${newWallet.address}</code>\n\n` +
        `🔑 <b>Private Key:</b>\n<code>${newWallet.privateKey}</code>\n\n` +
        `⚠️ <b>Important:</b> Save your private key! You can view it anytime with <code>/exportkey</code> or import it into Rabby/MetaMask.\n\n` +
        `💰 <b>Balance:</b> <b>${await formatEthUsd('0')}</b>\n` +
        `🟢 <b>Network:</b> Robinhood Chain (4663)\n\n` +
        `<i>Deposit ETH to this address on Robinhood Chain to start sniping drops!</i>`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data === 'cmd:verifyaccess') {
      state.flow = { type: 'verifyaccess' };
      await this.telegram.sendMessage(
        chatId,
        `✅ <b>Verify Your Payment</b>\n\n` +
        `Drop your transaction hash or paste your Blockscout URL below:\n\n` +
        `Example:\n<code>0xabc123...def456</code>\n\n` +
        `Or send /cancel to go back.`
      );
      return;
    }

    if (callback.data === 'cmd:importkey') {
      state.flow = { type: 'importkey' };
      await this.telegram.sendMessage(
        chatId,
        `📥 <b>Import Existing Private Key:</b>\n\nSend your 64-character private key (or /cancel):`
      );
      return;
    }

    if (callback.data === 'cmd:sellnft') {
      const userWallet = await this.getUserWallet(userKey);
      if (!userWallet) {
        await this.telegram.sendMessage(chatId, `⚠️ Connect a wallet first:`, this.getOnboardingButtons());
        return;
      }
      state.flow = { type: 'sellnft' };
      await this.telegram.sendMessage(
        chatId,
        `💰 <b>Auto-Sell & NFT Transfer</b>\n\n` +
        `Step 1 of 3: Send the NFT contract address on Robinhood Chain:\n\n` +
        `Example: <code>0x1234567890abcdef1234567890abcdef12345678</code>\n\n` +
        `Or send /cancel.`
      );
      return;
    }

    const wallet = await this.getUserWallet(userKey);
    if (!wallet && callback.data !== 'cmd:help' && callback.data !== 'cmd:cancel' && callback.data !== 'cmd:verifyaccess') {
      await this.telegram.sendMessage(
        chatId,
        `⚠️ You haven't connected a wallet yet. Choose an option below to start:`,
        this.getOnboardingButtons()
      );
      return;
    }

    if (callback.data === 'cmd:automint' || callback.data === 'cmd:snipe') {
      state.flow = { type: 'automint' };
      await this.telegram.sendMessage(
        chatId,
        `🎯 <b>Prepare Contract for Auto-Minting</b>\n\n` +
        `Send the NFT contract address on Robinhood Chain:\n\n` +
        `Example: <code>0x1234567890abcdef1234567890abcdef12345678</code>\n\n` +
        `Or send /cancel.`
      );
      return;
    }

    if (callback.data && callback.data.startsWith('q:')) {
      if (!wallet) return;
      const parts = callback.data.split(':');
      const action = parts[1];
      const targetAddr = parts[2] || state.currentContract;
      const target = await this.store.getTarget(userKey, targetAddr);
      const maxLimit = target?.metadata?.maxPerWallet ? parseInt(target.metadata.maxPerWallet, 10) : 10;
      const currentQty = state.targetQty ?? (target?.metadata?.quantity ? parseInt(target.metadata.quantity, 10) : 1);
      let newQty = currentQty;
      if (action === 'prev') {
        newQty = Math.max(1, currentQty - 1);
      } else if (action === 'next') {
        newQty = Math.min(maxLimit, currentQty + 1);
      } else {
        const parsed = parseInt(action, 10);
        if (!isNaN(parsed) && parsed > 0) {
          newQty = Math.min(maxLimit, parsed);
        }
      }
      state.targetQty = newQty;
      if (target) {
        const meta = { ...(target.metadata ?? {}), quantity: String(newQty) };
        await this.store.stageTarget(userKey, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, meta);
      }
      await this.sendSniperSetupCard(chatId, userKey, state, wallet.address, callback.message?.message_id, target?.contractAddress);
      return;
    }

    if (callback.data && callback.data.startsWith('t:')) {
      if (!wallet) return;
      state.targetTimeMs = 0;
      await this.telegram.sendMessage(chatId, '⚡ Auto-Mint uses the NFT contract’s on-chain opening time. No manual schedule is required.');
      await this.sendSniperSetupCard(chatId, userKey, state, wallet.address, callback.message?.message_id);
      return;
    }

    if (callback.data && (callback.data === 'arm:confirm' || callback.data.startsWith('arm:confirm:'))) {
      if (!wallet) return;
      const parts = callback.data.split(':');
      const targetAddr = parts[2] || state.currentContract;
      const explicitQty = parts[3] ? parseInt(parts[3], 10) : undefined;
      const target = await this.store.getTarget(userKey, targetAddr);
      if (!target || target.metadata?.approvalStatus !== 'pending') {
        await this.telegram.sendMessage(chatId, '⚠️ This approval has expired or was already confirmed. Prepare the contract again.');
        return;
      }
      if (explicitQty && explicitQty > 0) {
        target.metadata = { ...(target.metadata ?? {}), quantity: String(explicitQty) };
        await this.store.stageTarget(userKey, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, target.metadata);
      }
      if (getPriceStatus(target.pricePerNft, target.metadata) === 'unavailable') {
        await this.telegram.sendMessage(chatId, '⚠️ Mint price is unavailable. The target was not approved.');
        return;
      }
      if (!(await this.store.confirmTarget(userKey, target.contractAddress))) {
        await this.telegram.sendMessage(chatId, '⚠️ Approval could not be saved. Nothing was armed.');
        return;
      }
      const confirmedQty = target.metadata?.quantity || '1';
      state.monitoring = true;
      await this.telegram.sendMessage(
        chatId,
        `✅ <b>Auto-Mint Armed & Scheduled!</b>\n\n` +
        `• <b>Collection:</b> ${target.metadata?.name || 'Robinhood NFT Drop'}\n` +
        `• <b>Target:</b> <code>${target.contractAddress}</code>\n` +
        `• <b>Quantity:</b> <b>${confirmedQty} NFT${Number(confirmedQty) > 1 ? 's' : ''}</b>\n` +
        `• <b>Status:</b> 🟢 Armed and monitoring the on-chain mint\n` +
        `• <b>Gas:</b> Paid from the approved sniper wallet\n\n` +
        `<i>The sniper engine is monitoring this drop and will strike the exact millisecond it opens! View all armed drops with /schedules.</i>`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data && (callback.data === 'arm:cancel' || callback.data.startsWith('arm:cancel:'))) {
      const targetAddr = callback.data.startsWith('arm:cancel:')
        ? callback.data.replace('arm:cancel:', '')
        : state.currentContract;
      const target = await this.store.getTarget(userKey, targetAddr);
      if (target && target.metadata?.approvalStatus === 'pending') {
        const metadata = { ...(target.metadata ?? {}) };
        delete metadata.approvalStatus;
        delete metadata.executionStatus;
        await this.store.stageTarget(userKey, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, metadata);
      }
      state.monitoring = false;
      await this.telegram.sendMessage(chatId, '❌ Auto-mint cancelled. The target remains unapproved and will not appear in schedules.', this.getMainMenuButtons());
      return;
    }

    if (callback.data && (callback.data === 'arm' || callback.data.startsWith('arm:') || callback.data.startsWith('cmd:confirmtarget'))) {
      if (!wallet) return;
      let targetAddr = state.currentContract as string | undefined;
      let explicitQty: number | undefined;
      if (callback.data.startsWith('arm:')) {
        const parts = callback.data.split(':');
        if (parts[1] && parts[1] !== 'confirm' && parts[1] !== 'cancel') {
          targetAddr = parts[1];
        }
        if (parts[2]) {
          explicitQty = parseInt(parts[2], 10);
        }
      }
      const target = await this.store.getTarget(userKey, targetAddr);
      if (!target) {
        await this.telegram.sendMessage(chatId, 'No target waiting. Drop a contract address first.');
        return;
      }
      await this.requestAutoMintApproval(chatId, userKey, state, target, explicitQty);
      return;
    }

    if (callback.data === 'cmd:schedules') {
      await this.renderSchedulesCard(chatId, userKey, callback.message?.message_id);
      return;
    }

    if (callback.data && (callback.data === 'cmd:delschedule' || callback.data.startsWith('cmd:del:'))) {
      const delParam = callback.data.startsWith('cmd:del:') ? callback.data.replace('cmd:del:', '') : 'all';
      if (delParam === 'all') {
        await this.store.removeTarget(userKey);
        state.monitoring = false;
        await this.telegram.sendMessage(chatId, '🗑 <b>All scheduled drop snipers have been cancelled and removed.</b>', this.getMainMenuButtons());
      } else {
        await this.store.removeTarget(userKey, delParam);
        await this.telegram.sendMessage(chatId, `🗑 <b>Scheduled drop <code>${delParam}</code> cancelled and removed.</b>`);
        await this.renderSchedulesCard(chatId, userKey);
      }
      return;
    }

    if (callback.data === 'cmd:admin') {
      const isAdmin = this.config.adminUserIds.includes(userKey);
      if (!isAdmin) {
        await this.telegram.sendMessage(chatId, '⛔️ Only administrators can access admin tools.');
        return;
      }
      const users = this.store.listEntitlements ? await this.store.listEntitlements() : [];
      const text = users.length
        ? users.map((user) => `${user.status === 'active' ? '✅' : '⛔️'} <code>${user.userId}</code>${user.username ? ` @${user.username}` : ''} — ${user.source}`).join('\n')
        : 'No users found.';
      await this.telegram.sendMessage(
        chatId,
        `👑 <b>Admin Dashboard — Authorized Users:</b>\n\n${text}\n\n<i>Manage access permissions:</i>`,
        [
          [
            { text: '➕ Add User', callback_data: 'cmd:adduser' },
            { text: '➖ Remove User', callback_data: 'cmd:removeuser' }
          ],
          [
            { text: '🔙 Menu', callback_data: 'cmd:menu' }
          ]
        ]
      );
      return;
    }

    if (callback.data === 'cmd:adduser') {
      const isAdmin = this.config.adminUserIds.includes(userKey);
      if (!isAdmin) return;
      state.flow = { type: 'adduser' };
      await this.telegram.sendMessage(
        chatId,
        `👤 <b>Admin: Authorize User Access</b>\n\n` +
        `Send the Telegram Numeric User ID or @username to grant access:\n\n` +
        `Example: <code>123456789</code> or <code>@username</code>\n\n` +
        `Or send /cancel.`
      );
      return;
    }

    if (callback.data === 'cmd:removeuser') {
      const isAdmin = this.config.adminUserIds.includes(userKey);
      if (!isAdmin) return;
      state.flow = { type: 'removeuser' };
      await this.telegram.sendMessage(
        chatId,
        `👤 <b>Admin: Revoke User Access</b>\n\n` +
        `Send the Telegram Numeric User ID or @username to revoke access:\n\n` +
        `Example: <code>123456789</code> or <code>@username</code>\n\n` +
        `Or send /cancel.`
      );
      return;
    }

    if (callback.data === 'cmd:menu') {
      const isAdmin = this.config.adminUserIds.includes(userKey);
      if (wallet) {
        await this.telegram.sendMessage(
          chatId,
          `⚡️ <b>Mintobot — Robinhood Chain Sniper (4663)</b>\n\n` +
          `💳 <b>Sniper Wallet:</b>\n<code>${wallet.address}</code>\n\n` +
          `🟢 <b>Network:</b> Robinhood Chain Mainnet (4663)\n` +
          `⚡️ <b>Execution:</b> Direct Sub-Second Execution\n\n` +
          `<i>Drop any NFT contract address (CA) directly into this chat to stage & auto-mint instantly!</i>`,
          this.getMainMenuButtons(isAdmin)
        );
      }
      return;
    }

    if (callback.data === 'cmd:wallet') {
      if (!wallet) return;
      const liveBal = await this.executor.getBalance(wallet.address);
      await this.telegram.sendMessage(
        chatId,
        `💳 <b>Your Sniper Wallet Details:</b>\n\n` +
        `• <b>Address:</b> <code>${wallet.address}</code>\n` +
        `• <b>Balance:</b> <b>${await formatEthUsd(liveBal)}</b>\n` +
        `• <b>Network:</b> Robinhood Chain Mainnet (4663)\n\n` +
        `<i>Send ETH to this address on Robinhood Chain to fund your auto-mints and gas.</i>`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data === 'cmd:withdraw') {
      state.flow = { type: 'withdraw' };
      await this.telegram.sendMessage(
        chatId,
        `📤 <b>Withdraw ETH:</b>\n\nSend your destination 0x address (or /cancel):`
      );
      return;
    }

    if (callback.data === 'cmd:exportkey') {
      if (!wallet) return;
      await this.telegram.sendMessage(
        chatId,
        `🔐 <b>Your Private Key:</b>\n\n` +
        `<code>${wallet.privateKey}</code>\n\n` +
        `⚠️ <b>Security Notice:</b> Never share this key. You can import it into Rabby, Zerion, or MetaMask anytime.`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data === 'cmd:status') {
      if (!wallet) return;
      const liveBal = await this.executor.getBalance(wallet.address);
      const target = await this.store.getTarget(userKey);
      const isApproved = Boolean(target?.verified && target.metadata?.approvalStatus === 'approved');
      const isMonitoring = Boolean(isApproved && target?.metadata?.executionStatus !== 'claimed');
      const targetDisplay = !target
        ? '<i>No target armed</i>'
        : isApproved
          ? `<code>${target.contractAddress}</code> (${target.isLive ? '🟢 Live' : '⚪️ Pending'})`
          : `<code>${target.contractAddress}</code> (🟡 Prepared — not armed)`;
      await this.telegram.sendMessage(
        chatId,
        `📊 <b>Mintobot Sniper Status:</b>\n\n` +
        `• <b>Wallet:</b> <code>${wallet.address}</code>\n` +
        `• <b>Balance:</b> <b>${await formatEthUsd(liveBal)}</b>\n` +
        `• <b>Monitoring:</b> ${isMonitoring ? '🟢 Active (Auto-Sniper Armed)' : '⚪️ Inactive'}\n` +
        `• <b>Drop:</b> ${targetDisplay}\n` +
        `• <b>Network:</b> Robinhood Chain (4663)`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data === 'cmd:help') {
      await this.telegram.sendMessage(
        chatId,
        `📖 <b>Mintobot Command Guide (Robinhood Chain 4663)</b>\n\n` +
        `🚀 <b>Sniping & Drops:</b>\n` +
        `• <b>/start</b> — open your sniper dashboard & balance\n` +
        `• <b>/automint 0xContract</b> — arm an NFT contract for automatic minting\n` +
        `• <b>/confirmtarget</b> — confirm automatic on-chain minting\n` +
        `• <b>/sellnft 0x... id 0x...</b> — auto-sell or transfer an NFT\n\n` +
        `💳 <b>Wallet & Funds:</b>\n` +
        `• <b>/wallet</b> — view sniper wallet address & live balance\n` +
        `• <b>/importkey 0x...</b> — import any private key (AES-256-GCM encrypted)\n` +
        `• <b>/exportkey</b> — view & back up your private key\n` +
        `• <b>/withdraw 0x... [amt]</b> — send ETH back to your cold wallet\n\n` +
        `⚙️ <b>Control:</b>\n` +
        `• <b>/status</b> — view active monitoring & drop status\n` +
        `• <b>/cancel</b> — cancel any active input flow\n\n` +
        `<i>Direct-wallet execution on Robinhood Chain (4663) with zero server custody.</i>`,
        this.getMainMenuButtons()
      );
      return;
    }

    if (callback.data === 'cmd:cancel') {
      state.flow = undefined;
      await this.telegram.sendMessage(chatId, 'Operation cancelled.', this.getMainMenuButtons());
      return;
    }
  }
}

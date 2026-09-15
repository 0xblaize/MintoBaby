import { keccak256, stringToHex } from 'viem';
import { Wallet } from 'ethers';
import type { Config } from '../config.js';
import type { IStore } from '../chain/memory-store.js';
import type { TelegramClient } from '../telegram/client.js';
import { ChainExecutor } from '../chain/executor.js';
import { CryptoWalletManager } from '../wallet/crypto-store.js';
import { createChainClient } from '../chain/client.js';
import { discoverRobinhoodContract } from './discovery-engine.js';
import { formatEthUsd, formatWeiEthUsd } from '../finance/eth-price.js';
import { getTopCommandButtons } from '../telegram/commands.js';

export type SniperRouterEnv = {
  AUTO_MINT_EXECUTOR_ADDRESS?: string;
  AUTO_MINT_OPERATOR_PRIVATE_KEY?: string;
  AUTO_MINT_USER_PAID_EXECUTOR?: string;
  AUTO_MINT_ROUTER_TARGETS?: string;
};

function getConfiguredRouterAdapter(env: SniperRouterEnv, target: string): 'MINT_TO' | 'PUBLIC_MINT_TO' | undefined {
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
 * One full sniper cycle over every armed, approved target:
 * fresh on-chain discovery, phase safety checks, atomic claim, execution,
 * broadcast + receipt Telegram notifications. Shared by the Cloudflare
 * Worker cron and the local long-polling bot so both behave identically.
 */
export async function runSniperCycle(deps: {
  config: Config;
  telegram: TelegramClient;
  store: IStore;
  env?: SniperRouterEnv;
  beforeCycle?: (store: IStore, executor: ChainExecutor) => Promise<void>;
}): Promise<number> {
  const { config, telegram, store } = deps;
  const env = deps.env ?? {};
  const executor = new ChainExecutor(config.rpcUrl);
  const walletManager = new CryptoWalletManager(config.encryptionSecret);
  let executed = 0;

  if (deps.beforeCycle) {
    await deps.beforeCycle(store, executor).catch((err) => console.error('[SNIPER] beforeCycle hook failed:', err));
  }

  const activeTargets = await store.getAllActiveTargets();
  if (!activeTargets || activeTargets.length === 0) return 0;

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
        await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\n• <b>Target:</b> <code>${target.contractAddress}</code>\n• <b>Reason:</b> ${reason}\n\nThe engine will inspect it again on the next cycle.`);
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
        await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\nThe fresh on-chain mint price for <code>${target.contractAddress}</code> is unavailable. The engine will retry discovery.`);
        continue;
      }

      const phaseKind = freshDiscovery.phaseKind;
      const phaseStatus = freshDiscovery.phaseStatus;
      const phaseEndTimeMs = freshDiscovery.onChainEndTimeMs ?? (target.metadata?.onChainEndTimeMs ? parseInt(target.metadata.onChainEndTimeMs, 10) : undefined);
      if (!phaseKind || phaseKind === 'unknown' || !phaseStatus || phaseStatus === 'unknown') {
        console.log(`[SNIPER] Mint phase for ${target.contractAddress} is unknown — refusing generic execution.`);
        await telegram.sendMessage(target.userId, `⚠️ <b>AUTO-MINT WAITING</b>\n\nThe engine could not identify a supported on-chain phase for <code>${target.contractAddress}</code>. It will not guess a mint call.`);
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
        await telegram.sendMessage(target.userId, `⏳ <b>AUTO-MINT ARMED</b>\n\nThe phase for <code>${target.contractAddress}</code> is currently <b>${phaseStatus}</b>. The engine will trigger it when the phase opens.`);
        continue;
      }

      const routerAdapter = getConfiguredRouterAdapter(env, target.contractAddress);
      const routerTarget = Boolean(routerAdapter && env.AUTO_MINT_EXECUTOR_ADDRESS);

      if (target.metadata?.approvalStatus !== 'approved' || target.metadata?.executionStatus === 'claimed') {
        console.log(`[SNIPER] Target ${target.contractAddress} is not claimable — skipping.`);
        continue;
      }
      if (!(await store.claimTarget?.(target.userId, target.contractAddress))) {
        console.log(`[SNIPER] Target ${target.contractAddress} was claimed by another invocation — skipping.`);
        continue;
      }
      claimed = true;
      const claimedTarget = await store.getTarget(target.userId, target.contractAddress);
      if (!claimedTarget || claimedTarget.contractAddress.toLowerCase() !== target.contractAddress.toLowerCase() || claimedTarget.metadata?.approvalStatus !== 'approved' || claimedTarget.metadata.executionStatus !== 'claimed') {
        await store.releaseTarget?.(target.userId, target.contractAddress);
        claimed = false;
        console.log(`[SNIPER] Target ${target.contractAddress} changed during preparation — refusing stale execution.`);
        continue;
      }

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
        await store.recordTargetBroadcast?.(target.userId, target.contractAddress, txHash, functionSignature);
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
                privateKey as string, executorAddress, target.contractAddress, encWallet.address,
                qty, totalEth, deadline, expectedNonce, phaseHash, onBroadcast
              );
            }
            if (!env.AUTO_MINT_OPERATOR_PRIVATE_KEY) {
              return { success: false, error: 'Executor operator key is not configured.' };
            }
            return executor.executeOnChainMintTo(
              env.AUTO_MINT_OPERATOR_PRIVATE_KEY, executorAddress, target.contractAddress, encWallet.address,
              qty, totalEth, deadline, expectedNonce, phaseHash, onBroadcast
            );
          })()
        : phaseKind === 'seadrop' && freshDiscovery.seaDropAddress
          ? await executor.executeSeaDropMint(privateKey as string, freshDiscovery.seaDropAddress, target.contractAddress, qty, totalEth, onBroadcast)
          : await executor.executeMint(privateKey as string, target.contractAddress, qty, totalEth, onBroadcast);

      if (res.success) {
        executed += 1;
        const newBal = await executor.getBalance(encWallet.address);

        // Safety guard: Un-arm this specific target to prevent double-minting
        await store.removeTarget(target.userId, target.contractAddress);

        const name = target.metadata?.name || 'Robinhood NFT Drop';
        const symbol = target.metadata?.symbol || 'NFT';

        console.log(`[SNIPER] ✅ Mint SUCCESS for user ${target.userId} — tx: ${res.txHash}`);

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
          `🔗 <a href="${config.explorerBaseUrl}/tx/${res.txHash}">View on Blockscout Explorer</a>`,
          getTopCommandButtons()
        );
      } else {
        const errMsg = res.error || '';
        console.log(`[SNIPER] ❌ Mint FAILED for user ${target.userId} — ${errMsg}`);

        // A failure without a transaction hash was not broadcast and can be retried safely.
        if (!res.txHash) {
          await store.releaseTarget?.(target.userId, target.contractAddress);
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

        if (errMsg.toLowerCase().includes('insufficient')) {
          await store.removeTarget(target.userId, target.contractAddress);
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
            `• <b>Retry:</b> The approved target remains armed for the next cycle.`,
            getTopCommandButtons()
          );
        }
      }
    } catch (targetErr) {
      console.error(`Sniper cycle error for user ${target.userId}:`, targetErr);
      if (claimed && !broadcasted) {
        await store.releaseTarget?.(target.userId, target.contractAddress);
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
  return executed;
}

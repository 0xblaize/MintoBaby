/**
 * sniper_loop.js
 * Mintobaby ⚡️ High-Speed NFT Sniper — GitHub Actions execution engine
 *
 * Each user's encrypted wallet key is passed in the dispatch payload from
 * the Cloudflare Worker. This script decrypts it using ENCRYPTION_SECRET
 * (stored as a GitHub Secret) and signs with that user's OWN private key.
 * No shared sniper key. Every user mints to their own wallet automatically.
 *
 * Required GitHub Secrets:
 *   ENCRYPTION_SECRET  — Same value as your Cloudflare Worker ENCRYPTION_SECRET
 *   TELEGRAM_BOT_TOKEN — Your Telegram bot token
 *   TELEGRAM_CHAT_ID   — Your Telegram user ID
 *   EXECUTOR_ADDRESS   — Deployed AutoMintExecutor contract address (optional)
 *
 * Injected by the workflow from client_payload:
 *   ENC_KEY, ENC_IV, ENC_TAG  — User's encrypted wallet data
 *   RECIPIENT                 — User's wallet address (for verification)
 *   NFT_CONTRACT, MINT_TIME, QUANTITY, ETH_VALUE
 *   EXPECTED_NONCE, PHASE_HASH, DEADLINE, ADAPTER
 */

const { ethers } = require('ethers');
const crypto     = require('crypto');

// ─── Config ────────────────────────────────────────────────────────────────────
const RPC_URL    = 'https://rpc.mainnet.chain.robinhood.com';
const CHAIN_ID   = 4663;
const BLOCKSCOUT = 'https://robinhoodchain.blockscout.com';

const EXECUTOR_ABI = [
  'function executeMintToByRecipient(address target, address recipient, uint256 quantity, uint256 value, uint256 deadline, uint256 expectedNonce, bytes32 phaseHash) external payable returns (bytes32 intentHash)',
  'function executeMintTo(address target, address recipient, uint256 quantity, uint256 value, uint256 deadline, uint256 expectedNonce, bytes32 phaseHash) external payable returns (bytes32 intentHash)',
];

const DIRECT_MINT_CANDIDATES = [
  { name: 'mintTo(address,uint256)', sig: 'mintTo(address,uint256)', args: (r, q) => [r, q] },
  { name: 'mint(uint256)', sig: 'mint(uint256)', args: (r, q) => [q] },
  { name: 'mint(address,uint256)', sig: 'mint(address,uint256)', args: (r, q) => [r, q] },
  { name: 'publicMint(address,uint256)', sig: 'publicMint(address,uint256)', args: (r, q) => [r, q] },
  { name: 'publicMint(uint256)', sig: 'publicMint(uint256)', args: (r, q) => [q] },
  { name: 'mintPublic(uint256)', sig: 'mintPublic(uint256)', args: (r, q) => [q] },
  { name: 'mintPublic(address,uint256)', sig: 'mintPublic(address,uint256)', args: (r, q) => [r, q] },
  { name: 'claim(address,uint256)', sig: 'claim(address,uint256)', args: (r, q) => [r, q] },
  { name: 'purchase(uint256)', sig: 'purchase(uint256)', args: (r, q) => [q] },
  { name: 'mint()', sig: 'mint()', args: () => [] }
];

// ─── Decrypt user's wallet key ────────────────────────────────────────────────
function decryptPrivateKey(encryptedKey, ivHex, tagHex, secret) {
  const keyBuf = crypto.createHash('sha256').update(secret).digest();
  const iv     = Buffer.from(ivHex,  'hex');
  const tag    = Buffer.from(tagHex, 'hex');
  const enc    = Buffer.from(encryptedKey, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─── Telegram notify ──────────────────────────────────────────────────────────
async function tgNotify(msg) {
  const token  = process.env.TG_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
    });
  } catch (e) {
    console.warn('[TG] Notify failed (non-fatal):', e.message);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const encryptionSecret = process.env.ENCRYPTION_SECRET;
  const encKey           = process.env.ENC_KEY;
  const encIv            = process.env.ENC_IV;
  const encTag           = process.env.ENC_TAG;
  const recipient        = process.env.RECIPIENT;
  const nftContract      = process.env.NFT_CONTRACT;
  const mintTimeSec      = parseInt(process.env.MINT_TIME, 10);
  const quantity         = process.env.QUANTITY || '1';
  const ethValue         = process.env.ETH_VALUE || '0';
  const expectedNonce    = process.env.EXPECTED_NONCE || '0';
  const phaseHash        = process.env.PHASE_HASH || ('0x' + '00'.repeat(32));
  const deadline         = process.env.DEADLINE || String(mintTimeSec + 120);
  const executorAddr     = process.env.EXECUTOR_ADDRESS;

  if (!encryptionSecret || !encKey || !encIv || !encTag) {
    console.error('❌ Missing encrypted wallet payload or ENCRYPTION_SECRET.');
    process.exit(1);
  }

  if (!nftContract || isNaN(mintTimeSec)) {
    console.error('❌ Missing NFT_CONTRACT or MINT_TIME.');
    process.exit(1);
  }

  let privateKey;
  try {
    privateKey = decryptPrivateKey(encKey, encIv, encTag, encryptionSecret);
    if (!privateKey || !/^(0x)?[a-fA-F0-9]{64}$/.test(privateKey.trim())) {
      throw new Error('Decrypted key has invalid format');
    }
    privateKey = privateKey.trim();
  } catch (err) {
    console.error('❌ Failed to decrypt wallet key:', err.message);
    await tgNotify(`❌ <b>Sniper: Wallet Decryption Failed</b>\n<i>${err.message}</i>`);
    process.exit(1);
  }

  const mintTimeMs = mintTimeSec * 1000;

  // --- Connect ---
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true });
  const wallet   = new ethers.Wallet(privateKey, provider);
  const valueWei = ethers.parseEther(ethValue);

  if (recipient && wallet.address.toLowerCase() !== recipient.toLowerCase()) {
    const errMsg = `Decrypted wallet (${wallet.address}) does not match expected recipient (${recipient})`;
    console.error('❌', errMsg);
    await tgNotify(`❌ <b>Sniper: Wallet Mismatch</b>\n<i>${errMsg}</i>`);
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('⚡️  MINTOBABY SNIPER ENGINE — GITHUB ACTIONS BOOT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🎯  NFT Contract : ${nftContract}`);
  console.log(`👤  User Wallet  : ${wallet.address}`);
  console.log(`⏰  Mint Time    : ${new Date(mintTimeMs).toISOString()} (unix: ${mintTimeSec})`);
  console.log(`📦  Quantity     : ${quantity}`);
  console.log(`💎  ETH Value    : ${ethValue} ETH`);
  console.log('───────────────────────────────────────────────────');

  await tgNotify(
    `⚡️ <b>GitHub Sniper ARMED</b>\n\n` +
    `• Contract: <code>${nftContract}</code>\n` +
    `• Wallet: <code>${wallet.address}</code>\n` +
    `• Mint opens: <b>${new Date(mintTimeMs).toUTCString()}</b>\n` +
    `• Quantity: <b>${quantity}</b> | Value: <b>${ethValue} ETH</b>`
  );

  // ─── PHASE 1: Sleep until T-10s ──────────────────────────────────────────
  const nowMs         = Date.now();
  const msUntilLaunch = mintTimeMs - nowMs;

  if (msUntilLaunch > 10_000) {
    const sleepMs = msUntilLaunch - 10_000;
    console.log(`😴  Sleeping ${(sleepMs / 1000).toFixed(1)}s (waking 10s before launch)...`);
    await sleep(sleepMs);
  }

  try {
    const block = await provider.getBlockNumber();
    console.log(`🌐  RPC warm-up OK — current block: ${block}`);
  } catch (e) {
    console.warn('[RPC] Warm-up ping failed (non-fatal):', e.message);
  }

  console.log('🔥  Entering ultra-fast 50ms strike loop...');

  // ─── PHASE 2: Strike loop ─────────────────────────────────────────────────
  let fired = false;

  while (!fired) {
    const nowSec = Math.floor(Date.now() / 1000);

    if (nowSec >= mintTimeSec) {
      const fireTs = new Date().toISOString();
      console.log(`\n🚀  MINT OPEN! Firing at ${fireTs}`);

      let tx;
      let usedMethod = 'AutoMintExecutor';

      // 1. Try AutoMintExecutor if configured
      if (executorAddr && executorAddr.startsWith('0x') && executorAddr.length === 42) {
        try {
          const executor = new ethers.Contract(executorAddr, EXECUTOR_ABI, wallet);
          tx = await executor.executeMintToByRecipient(
            nftContract,
            wallet.address,
            BigInt(quantity),
            valueWei,
            BigInt(deadline),
            BigInt(expectedNonce),
            phaseHash,
            { value: valueWei }
          );
        } catch (e) {
          console.warn(`[SNIPER] AutoMintExecutor failed (${e.message}). Falling back to direct-wallet execution...`);
        }
      }

      // 2. Direct-wallet execution fallback
      if (!tx) {
        for (const candidate of DIRECT_MINT_CANDIDATES) {
          try {
            const contract = new ethers.Contract(nftContract, [`function ${candidate.sig}`], wallet);
            const args = candidate.args(wallet.address, BigInt(quantity));
            const fnName = candidate.name.split('(')[0];
            tx = await contract[fnName](...args, { value: valueWei });
            usedMethod = candidate.name;
            console.log(`[SNIPER] Successfully dispatched direct mint via ${candidate.name}`);
            break;
          } catch (candErr) {
            // Try next signature
          }
        }
      }

      if (!tx) {
        const failMsg = `All executor and direct mint methods failed to dispatch.`;
        console.error(`❌ ${failMsg}`);
        await tgNotify(`❌ <b>Mint TX Failed</b>\n\n• Contract: <code>${nftContract}</code>\n• Error: <i>${failMsg}</i>`);
        process.exit(1);
      }

      try {
        fired = true;
        console.log(`📡  TX Broadcast! Hash: ${tx.hash} (method: ${usedMethod})`);

        await tgNotify(
          `📡 <b>AUTO-MINT TX SENT!</b>\n\n` +
          `• Wallet: <code>${wallet.address}</code>\n` +
          `• Method: <code>${usedMethod}</code>\n` +
          `• Hash: <code>${tx.hash}</code>\n` +
          `• <a href="${BLOCKSCOUT}/tx/${tx.hash}">View on Blockscout</a>\n` +
          `• Status: ⏳ Awaiting confirmation...`
        );

        console.log('⏳  Waiting for on-chain confirmation...');
        const receipt = await tx.wait();

        if (receipt && receipt.status === 1) {
          console.log(`\n🏆  MINT CONFIRMED!`);
          console.log(`    Block  : ${receipt.blockNumber}`);
          console.log(`    Gas    : ${receipt.gasUsed}`);
          console.log(`    Wallet : ${wallet.address}`);

          await tgNotify(
            `🎉⚡️ <b>MINT CONFIRMED!</b> 🚀\n\n` +
            `• Contract: <code>${nftContract}</code>\n` +
            `• Wallet: <code>${wallet.address}</code>\n` +
            `• Quantity: <b>${quantity} NFT${quantity > 1 ? 's' : ''}</b>\n` +
            `• Block: <b>${receipt.blockNumber}</b>\n` +
            `• Gas used: <b>${receipt.gasUsed}</b>\n\n` +
            `🔗 <a href="${BLOCKSCOUT}/tx/${tx.hash}">View on Blockscout</a>`
          );
        } else {
          console.error('❌  TX mined but REVERTED on-chain.');
          await tgNotify(
            `⚠️ <b>TX Mined but REVERTED</b>\n\n` +
            `• Hash: <code>${tx.hash}</code>\n` +
            `🔗 <a href="${BLOCKSCOUT}/tx/${tx.hash}">View on Blockscout</a>`
          );
          process.exit(1);
        }
      } catch (err) {
        console.error('❌  Transaction error:', err.message || err);
        await tgNotify(
          `❌ <b>Mint TX Failed</b>\n\n` +
          `• Contract: <code>${nftContract}</code>\n` +
          `• Wallet: <code>${wallet.address}</code>\n` +
          `• Error: <i>${err.message || String(err)}</i>`
        );
        process.exit(1);
      }
    } else {
      await sleep(50);
    }
  }

  console.log('\n✅  Sniper job complete. Exiting.');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await tgNotify(`❌ <b>Sniper Crash:</b> <i>${err.message || String(err)}</i>`);
  process.exit(1);
});

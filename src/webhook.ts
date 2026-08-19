import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Config } from './config.js';
import { CursorStore } from './chain/cursor-store.js';
import type { TelegramClient } from './telegram/client.js';
import { getMainInterfaceButtons, getTopCommandButtons } from './telegram/commands.js';
import { createChainClient } from './chain/client.js';

const MAX_BODY_BYTES = 256 * 1024;

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-turnkey-webhook-secret');
}

function authorized(request: IncomingMessage, secret: string): boolean {
  const provided = request.headers['x-turnkey-webhook-secret'];
  if (typeof provided !== 'string') return false;
  const expected = createHash('sha256').update(secret).digest();
  const actual = createHash('sha256').update(provided).digest();
  return timingSafeEqual(expected, actual);
}

async function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) reject(new Error('Payload too large'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

export function startWebhookServer(config: Config, store: CursorStore, telegram?: TelegramClient): ReturnType<typeof createServer> {
  const server = createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      response.writeHead(204).end();
      return;
    }

    // Mini App real transaction verification API
    if (request.method === 'POST' && request.url === '/api/transaction/verify') {
      try {
        const body = await readBody(request);
        const data = JSON.parse(body) as { userId?: string; txHash?: string };
        const match = data.txHash?.match(/(?:0x|0X)?[a-fA-F0-9]{64}/)?.[0];
        if (!data.userId || !match) {
          response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Missing userId or valid txHash' }));
          return;
        }
        const hash = (`0x${match.replace(/^0x/i, '').toLowerCase()}`) as `0x${string}`;
        const client = createChainClient(config);
        if (await client.getChainId() !== 4663) {
          response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'wrong_network', hash }));
          return;
        }
        const transaction = await client.getTransaction({ hash });
        if (!transaction) {
          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'not_found', hash }));
          return;
        }
        const receipt = await client.getTransactionReceipt({ hash });
        if (!receipt) {
          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'pending', hash }));
          return;
        }
        if (receipt.status !== 'success') {
          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'reverted', hash }));
          return;
        }
        store.saveWallet(data.userId, receipt.from);
        if (telegram) await telegram.sendMessage(data.userId, `✅ <b>Transaction Verified</b>\n\n• <b>Hash:</b> <code>${hash}</code>\n• <b>Sender:</b> <code>${receipt.from}</code>\n• <b>Network:</b> Robinhood Chain (4663)\n\nThe public sender address was recorded.`, getMainInterfaceButtons(config.miniAppBaseUrl, data.userId, config.miniAppApiUrl));
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'success', hash, sender: receipt.from, blockNumber: receipt.blockNumber.toString() }));
        return;
      } catch (err) {
        response.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ status: 'rpc_error', error: err instanceof Error ? err.message : String(err) }));
        return;
      }
    }

    // Mini App public wallet authorization notification API
    if (request.method === 'POST' && request.url === '/api/wallet/authorized') {
      try {
        const body = await readBody(request);
        const data = JSON.parse(body) as { userId?: string; walletAddress?: string; balanceEth?: string; provider?: string };
        if (!data.userId || !data.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(data.walletAddress)) {
          response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Missing or invalid userId or walletAddress' }));
          return;
        }
        const walletAddress = data.walletAddress.toLowerCase();
        store.saveWallet(data.userId, walletAddress, data.provider);
        if (telegram) {
          await telegram.sendMessage(
            data.userId,
            `✅ <b>Public Wallet Authorization Recorded</b>\n\n` +
            `• <b>Main Wallet:</b> <code>${walletAddress}</code>\n` +
            `• <b>Balance:</b> <b>${data.balanceEth || 'Unavailable'} ETH</b>\n` +
            `• <b>Network:</b> Robinhood Chain (4663)\n\n` +
            `The wallet provider session may expire or be revoked. Reopen the main interface to re-authorize when needed.`,
            getMainInterfaceButtons(config.miniAppBaseUrl, data.userId, config.miniAppApiUrl)
          );
        }
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ success: true, address: walletAddress, status: 'authorized' }));
        return;
      } catch (err) {
        response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        return;
      }
    }

    // Mini App Vault Connected Notification API
    if (request.method === 'POST' && request.url === '/api/vault/connected') {
      try {
        const body = await readBody(request);
        const data = JSON.parse(body) as {
          userId?: string;
          walletAddress?: string;
          vaultAddress?: string;
          balanceEth?: string;
          txHash?: string;
        };

        if (data.userId && data.vaultAddress) {
          store.saveUserVault(data.userId, data.vaultAddress, data.walletAddress);
          if (data.walletAddress) {
            store.saveWallet(data.userId, data.walletAddress);
          }

          if (telegram) {
            await telegram.sendMessage(
              data.userId,
              `🎉 <b>Wallet & Smart Vault Connected!</b>\n\n` +
              `• <b>Owner Wallet:</b> <code>${data.walletAddress || 'Connected'}</code>\n` +
              `• <b>Vault Address:</b> <code>${data.vaultAddress}</code>\n` +
              `• <b>Vault Balance:</b> <b>${data.balanceEth || '0.00'} ETH</b>\n` +
              `• <b>Bot Status:</b> 🟢 <b>Authorized & Active</b>\n\n` +
              `Your setup is complete! You can now run all actions directly here in Telegram. Select an action below:`,
              getTopCommandButtons()
            );
          }

          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ success: true }));
          return;
        }
        response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'Missing userId or vaultAddress' }));
        return;
      } catch (err) {
        response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
        return;
      }
    }

    if (request.method === 'POST' && request.url === '/webhooks/turnkey') {
      const webhookSecret = config.turnkeyWebhookSecret;
      if (!webhookSecret || !authorized(request, webhookSecret)) {
        response.writeHead(401).end('unauthorized');
        return;
      }
      try {
        const body = await readBody(request);
        const event: unknown = JSON.parse(body);
        if (!event || typeof event !== 'object') throw new Error('Invalid JSON event');
        const record = event as Record<string, unknown>;
        const eventId = typeof record.id === 'string' ? record.id : typeof record.activityId === 'string' ? record.activityId : undefined;
        if (!eventId) throw new Error('Missing event identifier');
        const accepted = store.insertWebhookEvent(eventId, body);
        response.writeHead(accepted ? 202 : 200, { 'content-type': 'application/json' }).end(JSON.stringify({ accepted, eventId }));
      } catch (error) {
        response.writeHead(error instanceof Error && error.message === 'Payload too large' ? 413 : 400).end('invalid webhook');
      }
      return;
    }

    response.writeHead(404).end();
  });

  server.listen(config.webhookPort, () => {
    console.log(`HTTP/Webhook server running on port ${config.webhookPort}`);
  });
  return server;
}

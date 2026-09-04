import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Config } from './config.js';
import { CursorStore } from './chain/cursor-store.js';
import type { TelegramClient } from './telegram/client.js';

const MAX_BODY_BYTES = 256 * 1024;

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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

    response.writeHead(404).end();
  });

  server.listen(config.webhookPort, () => {
    console.log(`HTTP/Webhook server running on port ${config.webhookPort}`);
  });
  return server;
}

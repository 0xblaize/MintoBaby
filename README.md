# MintoBaby ⚡ — Multi-Chain NFT Mint Sniper

One product, three front-ends, one engine:

| Surface | Path | What it does |
|---|---|---|
| **Website** | `web/` (React + Vite) | Landing, sign-in (Google / email / admin), paywall + subscriptions, contract scanner, schedule monitor, wallet view, guides, admin console. The browser **never sees a private key**. |
| **Telegram bot** | `src/` (TypeScript) | Long-polling bot with `/activate` key pairing, encrypted per-user sniper wallets, stage → quantity → **Confirm Auto-Mint** approval flow, live on-chain sniper engine, broadcast + receipt alerts. |
| **Terminal CLI** | `api/cli.py` (Python + Rich) | `setup`, `login`, `scan`, `mint`, `schedule`, `schedules`, `cancel`, `daemon`, wallet management — same activation key, keys stay encrypted in `~/.mintobaby`. |
| **Engine API** | `api/` (FastAPI) | Auth (Google / email / admin), activation keys, subscriptions (Stripe + on-chain ETH/WETH verification), wallets, discovery, minting, scheduler. Runs on `:8000`. |

Chains: **Robinhood Chain (EVM 4663)** and **Ink L2 (EVM 57073)** are fully supported. **Solana is gated as "coming soon"** across all surfaces — no endpoint pretends otherwise. Copy-mint radar is intentionally not wired yet.

## Production safety rules (enforced in code)

- Every scan is a **fresh on-chain read** (name/price/phase/timing/SeaDrop stage). Unknown price or unknown phase is never treated as free or executable.
- Mints run only after an explicit **Confirm Auto-Mint**, then are **claimed atomically** before broadcast — no double-mint, no generic retry once a tx hash exists.
- Private keys: AES-256-GCM encrypted with `ENCRYPTION_SECRET` (`~/.mintobaby/wallet.enc`, bot SQLite store, schedule files). The web console is key-free by design.
- Activation codes are only valid if **issued by the admin console** or **owned by a signed-up account** — guessing `MINTO-*` formats does nothing. Admin endpoints require an HMAC session token.
- Subscription payments are verified **on-chain**: recipient, ETH-or-WETH asset, USD→wei amount at live price, block confirmations, and single-use tx replay rejection.

## One-time setup

```bash
cp .env.example .env          # fill: TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_USER_IDS,
                              # TELEGRAM_CHAT_ID, MINTOBABY_ADMIN_EMAIL/PASSWORD,
                              # PAYMENT_RECIPIENT (+ WETH_ADDRESS), optional STRIPE/GOOGLE/WALLETCONNECT ids
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt
npm install
cd web && npm install && cd ..
```

## Run locally (all three surfaces)

```bash
# 1. Engine API — http://localhost:8000 (docs at /docs)
.venv/bin/python -m uvicorn api.main:app --port 8000

# 2. Telegram bot — long polling + in-process sniper engine
npm run dev

# 3. Website — http://localhost:5173 (proxies nothing; it calls API_URL directly)
cd web && npm run dev
```

Terminal pairing for customers (one-line installer — no repo knowledge needed):

```bash
curl -fsSL https://raw.githubusercontent.com/0xblaize/MintoBaby/main/install.sh | bash

mintobaby setup          # guided: engine URL, chain check, wallet, pairing
mintobaby login --code MINTO-XXXX-XXXX-XXXX
mintobaby scan 0xContract
mintobaby mint 0xContract --qty 1 --value 0.05
mintobaby schedule 0xContract --time 2026-09-12T16:00:00Z
mintobaby daemon --auto-gas
```

The installer clones to `~/.mintobaby/cli`, builds its own venv, generates a **per-machine** `ENCRYPTION_SECRET` into `~/.mintobaby/cli/.env`, and symlinks `mintobaby` into `~/.local/bin`. Re-running it updates in place and keeps the user's `.env`. Developers working on the repo itself can still run `python -m api.cli …` from the project venv.

## Checks

```bash
npm test          # vitest: discovery, lifecycle, payments, vault, allowlist, executor
npm run build     # tsc
cd web && npm run build
```

## Admin flow

1. Sign in at `/login` with `MINTOBABY_ADMIN_EMAIL` / `MINTOBABY_ADMIN_PASSWORD` → routed to the dashboard with an **Admin Console** nav item.
2. Generate activation keys (`/admin`), assign an email/note, hand the key to the customer.
3. Customer enters it on `/subscribe` (web unlock) and/or sends `/activate KEY` to the bot and `python -m api.cli login --code KEY` in the terminal. Pairing state (✓ Telegram, ✓ CLI) is visible live in the console.

State lives in `~/.mintobaby/` (`users.json`, `activation_keys.json`, `schedules.json`, `used_payments.json`) — back this directory up; move to Postgres/D1 before scaling horizontally.

## Deploy

- **Website**: `cd web && npm run build` → any static host (Vercel preset included). Set root `.env` `API_URL` to the public engine URL at build time.
- **Engine API**: `.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000` behind TLS/reverse proxy.
- **Telegram — option A (server bot)**: `npm run dev` (or a pm2/systemd unit) on a host that also sees `~/.mintobaby` for pairing + payments.
- **Telegram — option B (Cloudflare Worker + D1)**: copy `wrangler.example.toml` → `wrangler.toml`, create the D1 database, apply `migrations/*.sql`, `npx wrangler secret put` the env vars from `.dev.vars.example`, `npm run deploy`, hit `/set-webhook`, and keep the `/cron` trigger. Optionally wire GitHub Actions early-wakeup (`sniper_loop.js` + repo secrets) for sub-second pre-launch execution.

## Architecture

```text
 Web (key-free)          Telegram bot                Terminal CLI
      │                       │                           │
      │  scan / schedules /   │  stage → approve →        │  scan / mint / schedule /
      │  subscribe / admin    │  armed auto-mint          │  daemon (shared schedule store)
      ▼                       ▼                           ▼
 ┌──────────────────── FastAPI engine (api/) ─────────────────────┐
 │ auth · activation keys · subscriptions (Stripe + on-chain)     │
 │ discovery · executor (mintTo/publicMint/SeaDrop adapters)      │
 │ scheduler (ms-accurate strike loop, file-persisted, CAS claim) │
 └──────────────┬─────────────────────────────┬───────────────────┘
                │                             │
        Robinhood RPC 4663             Ink RPC 57073        price feeds
                ▲
 Cloudflare Worker + D1 (production keeper: fresh re-discovery,
 atomic claim, broadcast, receipt) ── GitHub Actions sniper_loop.js
```

## Security notes

Never commit `.env`, `~/.mintobaby`, or private keys. Rotate `ENCRYPTION_SECRET` before first production wallet (changing it later orphans stored keys). Set a real admin password, fund `PAYMENT_RECIPIENT` only for subscription revenue, and use Stripe test keys first.

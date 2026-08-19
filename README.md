# Robinhood NFT Auto-Mint Bot

A Telegram bot that scans NFT contracts on Robinhood Chain, shows fresh mint data, and automatically submits approved public-phase mints when they open.

## Features

- Fresh on-chain scan for every contract address
- Collection name, symbol, price, start/end time, phase status, and wallet limit
- SeaDrop public-phase inspection and exact `mintPublic(address,uint256)` execution; proof-based SeaDrop phases are refused safely
- Telegram staging, quantity selection, final Confirm Auto-Mint / Cancel approval, and scheduling
- Encrypted sniper-wallet storage
- Cloudflare Worker scheduled execution with D1 approval and claim state
- Immediate transaction-broadcast Telegram message with hash and Blockscout link
- Separate confirmed receipt notification
- Unknown phases and prices are never treated as executable or free
- No generic transaction retry after a broadcast hash exists

## Architecture

```text
Telegram user
    |
    v
Telegram webhook
    |
    v
CommandHandler
    |
    +--> Fresh Discovery and Phase Inspection
    |       +--> Robinhood RPC
    |       +--> ERC-721 status/price getters
    |       +--> SeaDrop stage getters
    |       `--> phase and price result
    |
    +--> D1 target store
    |       +--> staged/unapproved
    |       +--> approved/claimable
    |       `--> claimed/broadcast lifecycle
    |
    `--> Final Confirm Auto-Mint prompt

Cloudflare scheduled Worker
    |
    +--> Fresh phase inspection immediately before execution
    +--> Require known supported public phase
    +--> Simulate candidate calldata from the sniper wallet
    +--> Atomically claim target
    +--> Broadcast transaction
    +--> Send pending hash/link
    +--> Wait for receipt
    `--> Send confirmed/reverted result
```

## Auto-mint flow

1. Send a contract address to Telegram.
2. The bot performs a fresh RPC scan with no discovery cache.
3. Review collection metadata, price, phase, and timing.
4. Press **Arm / Set Auto-Mint**.
5. Review the final **Confirm Auto-Mint / Cancel** prompt.
6. Only **Confirm Auto-Mint** approves the target.
7. The Worker performs a fresh wallet-specific phase and gas simulation.
8. If eligible, the Worker broadcasts once and immediately sends the transaction hash and explorer link.
9. After receipt confirmation, the bot sends the final transaction result.

Search and staging never mint. Unknown phases, allowlist/signature requirements without proof, expired phases, and unavailable prices are refused. The current Worker execution adapter is intentionally limited to a verified public phase; arbitrary gated contracts require a dedicated proof-aware adapter and are not guessed.

A separate on-chain automation contract is not used as a universal solution. Arbitrary collections may require the user's wallet as `msg.sender`, Merkle proofs, signatures, or token-gating data that an on-chain forwarding contract cannot create. The Cloudflare Worker acts as the keeper/executor and D1 is required for durable safety state.

## Requirements

- Node.js 20+
- Telegram bot token
- Robinhood Chain RPC access
- Cloudflare Worker and D1 configuration
- Funded Robinhood Chain sniper wallet

## Install and run

```bash
npm install
npm run dev
```

Run checks:

```bash
npm test
npm run build
```

Deploy:

```bash
npm run deploy
npx wrangler tail
```

## Security

Keep bot tokens, encryption secrets, and private keys out of source control. Configure secrets through the deployment environment. Never share or commit private keys. Production scheduled minting requires D1; the in-memory store is not safe for Worker execution.

## Reusable build prompt

> Build a concise Telegram NFT auto-mint bot for Robinhood Chain. Every contract search must perform a fresh on-chain RPC scan with no stale cache. Inspect phase status, opening/closing times, wallet eligibility, price, quantity limits, and required proofs before execution. Require a final Confirm Auto-Mint prompt. Execute only an explicitly supported and simulated phase-specific transaction. Send a Telegram message immediately after broadcast with the transaction hash and explorer link, then send a confirmed or reverted receipt message. Persist approval, claim, transaction, and notification state in Cloudflare D1. Never treat unknown price, unknown phase, missing proof, or unsupported calldata as executable. Use TypeScript, viem or ethers, Cloudflare Workers, D1, encrypted wallet storage, and focused lifecycle tests.

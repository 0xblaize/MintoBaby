CREATE TABLE IF NOT EXISTS user_identities (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_username
  ON user_identities(username) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_entitlements (
  user_id TEXT PRIMARY KEY NOT NULL,
  username TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked')),
  source TEXT NOT NULL CHECK (source IN ('payment', 'admin')),
  payment_id TEXT,
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS access_payments (
  payment_id TEXT PRIMARY KEY NOT NULL,
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('ETH', 'WETH')),
  log_index INTEGER NOT NULL DEFAULT -1,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  amount_wei TEXT NOT NULL,
  required_wei TEXT NOT NULL,
  usd_quote REAL NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected')),
  block_number TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(chain_id, tx_hash, asset, log_index)
);

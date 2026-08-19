CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY NOT NULL,
  address TEXT NOT NULL,
  wallet_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS target_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  contract_address TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  price_per_nft TEXT NOT NULL,
  is_live INTEGER NOT NULL,
  verified INTEGER NOT NULL,
  metadata_json TEXT,
  approval_status TEXT NOT NULL DEFAULT 'none',
  execution_status TEXT NOT NULL DEFAULT 'ready',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_flows (
  user_id TEXT PRIMARY KEY NOT NULL,
  flow_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

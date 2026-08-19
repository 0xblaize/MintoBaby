ALTER TABLE target_profiles RENAME TO target_profiles_legacy;

CREATE TABLE target_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  contract_address TEXT NOT NULL,
  schema_id TEXT NOT NULL,
  price_per_nft TEXT NOT NULL,
  is_live INTEGER NOT NULL,
  verified INTEGER NOT NULL,
  metadata_json TEXT,
  approval_status TEXT NOT NULL DEFAULT 'none',
  execution_status TEXT NOT NULL DEFAULT 'ready',
  tx_hash TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO target_profiles (
  user_id,
  contract_address,
  schema_id,
  price_per_nft,
  is_live,
  verified,
  metadata_json,
  approval_status,
  execution_status,
  tx_hash,
  updated_at
)
SELECT
  user_id,
  contract_address,
  schema_id,
  price_per_nft,
  is_live,
  verified,
  metadata_json,
  'none',
  'ready',
  NULL,
  updated_at
FROM target_profiles_legacy;

DROP TABLE target_profiles_legacy;

CREATE INDEX IF NOT EXISTS idx_target_profiles_ready
  ON target_profiles(verified, approval_status, execution_status);

CREATE INDEX IF NOT EXISTS idx_target_profiles_broadcast
  ON target_profiles(execution_status, tx_hash);

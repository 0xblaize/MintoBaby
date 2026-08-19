import Database from 'better-sqlite3';

export type StoredEvent = {
  key: string;
  blockNumber: bigint;
  txHash: string;
  logIndex: number;
  payload: string;
};

export class CursorStore {
  private readonly db: Database.Database;
  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS processed_events (event_key TEXT PRIMARY KEY, block_number TEXT NOT NULL, tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, payload_json TEXT NOT NULL, notified_at TEXT NOT NULL);`);
  }
  getCursor(startBlock: bigint): bigint {
    const row = this.db.prepare('SELECT value FROM state WHERE key = ?').get('cursor') as { value?: string } | undefined;
    return row?.value ? BigInt(row.value) : startBlock - 1n;
  }
  setCursor(block: bigint): void { this.db.prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('cursor', block.toString()); }
  rewind(blocks: bigint): void { const current = this.getCursor(0n); this.setCursor(current > blocks ? current - blocks : 0n); }
  insertIfNew(event: StoredEvent): boolean {
    const result = this.db.prepare('INSERT OR IGNORE INTO processed_events(event_key,block_number,tx_hash,log_index,payload_json,notified_at) VALUES(?,?,?,?,?,?)').run(event.key, event.blockNumber.toString(), event.txHash, event.logIndex, event.payload, new Date().toISOString());
    return result.changes === 1;
  }
  registerTransactionIntent(userId: string, walletId: string, contractAddress: string): boolean {
    this.db.prepare('CREATE TABLE IF NOT EXISTS transaction_jobs (job_key TEXT PRIMARY KEY, user_id TEXT NOT NULL, wallet_id TEXT NOT NULL, contract_address TEXT NOT NULL, status TEXT NOT NULL, assigned_nonce TEXT, tx_hash TEXT, failure_reason TEXT, updated_at TEXT NOT NULL)').run();
    const key = `${userId}:${contractAddress.toLowerCase()}`;
    const result = this.db.prepare('INSERT OR IGNORE INTO transaction_jobs(job_key,user_id,wallet_id,contract_address,status,updated_at) VALUES(?,?,?,?,?,?)').run(key, userId, walletId, contractAddress.toLowerCase(), 'PRE_FLIGHT_CHECKING', new Date().toISOString());
    return result.changes === 1;
  }
  updateTransactionStatus(userId: string, contractAddress: string, status: string, metadata: { nonce?: bigint; txHash?: string; failureReason?: string } = {}): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS transaction_jobs (job_key TEXT PRIMARY KEY, user_id TEXT NOT NULL, wallet_id TEXT NOT NULL, contract_address TEXT NOT NULL, status TEXT NOT NULL, assigned_nonce TEXT, tx_hash TEXT, failure_reason TEXT, updated_at TEXT NOT NULL)').run();
    const updates = ['status = ?', 'updated_at = ?'];
    const values: unknown[] = [status, new Date().toISOString()];
    if (metadata.nonce !== undefined) { updates.push('assigned_nonce = ?'); values.push(metadata.nonce.toString()); }
    if (metadata.txHash !== undefined) { updates.push('tx_hash = ?'); values.push(metadata.txHash); }
    if (metadata.failureReason !== undefined) { updates.push('failure_reason = ?'); values.push(metadata.failureReason); }
    values.push(`${userId}:${contractAddress.toLowerCase()}`);
    this.db.prepare(`UPDATE transaction_jobs SET ${updates.join(', ')} WHERE job_key = ?`).run(...values);
  }
  getTransactionStatus(userId: string, contractAddress: string): Record<string, string> | undefined {
    this.db.prepare('CREATE TABLE IF NOT EXISTS transaction_jobs (job_key TEXT PRIMARY KEY, user_id TEXT NOT NULL, wallet_id TEXT NOT NULL, contract_address TEXT NOT NULL, status TEXT NOT NULL, assigned_nonce TEXT, tx_hash TEXT, failure_reason TEXT, updated_at TEXT NOT NULL)').run();
    const row = this.db.prepare('SELECT status, assigned_nonce, tx_hash, failure_reason, updated_at FROM transaction_jobs WHERE job_key = ?').get(`${userId}:${contractAddress.toLowerCase()}`) as Record<string, string> | undefined;
    return row;
  }
  insertWebhookEvent(eventId: string, payload: string): boolean {
    this.db.prepare('CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, payload_json TEXT NOT NULL, received_at TEXT NOT NULL)').run();
    const result = this.db.prepare('INSERT OR IGNORE INTO webhook_events(event_id,payload_json,received_at) VALUES(?,?,?)').run(eventId, payload, new Date().toISOString());
    return result.changes === 1;
  }
  stageTarget(userId: string, address: string, schemaId: string, pricePerNft: bigint, isLive: boolean): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS target_profiles (user_id TEXT PRIMARY KEY, contract_address TEXT NOT NULL, schema_id TEXT NOT NULL, price_per_nft TEXT NOT NULL, is_live INTEGER NOT NULL, verified INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    this.db.prepare('INSERT INTO target_profiles(user_id,contract_address,schema_id,price_per_nft,is_live,verified,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET contract_address=excluded.contract_address,schema_id=excluded.schema_id,price_per_nft=excluded.price_per_nft,is_live=excluded.is_live,verified=0,updated_at=excluded.updated_at').run(userId, address.toLowerCase(), schemaId, pricePerNft.toString(), isLive ? 1 : 0, 0, new Date().toISOString());
  }
  confirmTarget(userId: string): boolean {
    this.db.prepare('CREATE TABLE IF NOT EXISTS target_profiles (user_id TEXT PRIMARY KEY, contract_address TEXT NOT NULL, schema_id TEXT NOT NULL, price_per_nft TEXT NOT NULL, is_live INTEGER NOT NULL, verified INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    const result = this.db.prepare('UPDATE target_profiles SET verified=1,updated_at=? WHERE user_id=? AND verified=0').run(new Date().toISOString(), userId);
    return result.changes === 1;
  }
  getTarget(userId: string): { contractAddress: string; schemaId: string; pricePerNft: bigint; isLive: boolean; verified: boolean } | undefined {
    this.db.prepare('CREATE TABLE IF NOT EXISTS target_profiles (user_id TEXT PRIMARY KEY, contract_address TEXT NOT NULL, schema_id TEXT NOT NULL, price_per_nft TEXT NOT NULL, is_live INTEGER NOT NULL, verified INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    const row = this.db.prepare('SELECT contract_address,schema_id,price_per_nft,is_live,verified FROM target_profiles WHERE user_id=?').get(userId) as { contract_address: string; schema_id: string; price_per_nft: string; is_live: number; verified: number } | undefined;
    return row ? { contractAddress: row.contract_address, schemaId: row.schema_id, pricePerNft: BigInt(row.price_per_nft), isLive: row.is_live === 1, verified: row.verified === 1 } : undefined;
  }
  saveWallet(userId: string, address: string, walletId?: string): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_wallets (user_id TEXT PRIMARY KEY, address TEXT NOT NULL, wallet_id TEXT, updated_at TEXT NOT NULL)').run();
    this.db.prepare('INSERT INTO user_wallets(user_id,address,wallet_id,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET address=excluded.address, wallet_id=excluded.wallet_id, updated_at=excluded.updated_at').run(userId, address, walletId ?? null, new Date().toISOString());
  }
  getWallet(userId: string): { address?: string; walletId?: string } | undefined {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_wallets (user_id TEXT PRIMARY KEY, address TEXT NOT NULL, wallet_id TEXT, updated_at TEXT NOT NULL)').run();
    const row = this.db.prepare('SELECT address, wallet_id FROM user_wallets WHERE user_id = ?').get(userId) as { address?: string; wallet_id?: string } | undefined;
    return row ? { address: row.address, walletId: row.wallet_id } : undefined;
  }
  saveInvite(code: string, createdBy: string): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS invite_codes (code TEXT PRIMARY KEY, created_by TEXT NOT NULL, used_by TEXT, created_at TEXT NOT NULL, used_at TEXT)').run();
    this.db.prepare('INSERT INTO invite_codes(code,created_by,created_at) VALUES(?,?,?)').run(code, createdBy, new Date().toISOString());
  }
  redeemInvite(code: string, userId: string): boolean {
    this.db.prepare('CREATE TABLE IF NOT EXISTS invite_codes (code TEXT PRIMARY KEY, created_by TEXT NOT NULL, used_by TEXT, created_at TEXT NOT NULL, used_at TEXT)').run();
    const result = this.db.prepare('UPDATE invite_codes SET used_by = ?, used_at = ? WHERE code = ? AND used_by IS NULL').run(userId, new Date().toISOString(), code);
    return result.changes === 1;
  }
  addAllowedUser(userId: string, addedBy?: string): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS allowed_users (user_id TEXT PRIMARY KEY, added_by TEXT, added_at TEXT NOT NULL)').run();
    this.db.prepare('INSERT INTO allowed_users(user_id, added_by, added_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET added_by=excluded.added_by').run(String(userId).toLowerCase(), addedBy ?? null, new Date().toISOString());
  }
  isUserAllowed(userId: string): boolean {
    this.db.prepare('CREATE TABLE IF NOT EXISTS allowed_users (user_id TEXT PRIMARY KEY, added_by TEXT, added_at TEXT NOT NULL)').run();
    const row = this.db.prepare('SELECT 1 AS allowed FROM allowed_users WHERE user_id = ?').get(String(userId).toLowerCase()) as { allowed?: number } | undefined;
    return row?.allowed === 1;
  }
  getAllowedUsers(): string[] {
    this.db.prepare('CREATE TABLE IF NOT EXISTS allowed_users (user_id TEXT PRIMARY KEY, added_by TEXT, added_at TEXT NOT NULL)').run();
    const rows = this.db.prepare('SELECT user_id FROM allowed_users ORDER BY added_at').all() as Array<{ user_id: string }>;
    return rows.map((row) => row.user_id);
  }
  saveUserVault(userId: string, vaultAddress: string, ownerAddress?: string): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_vaults (user_id TEXT PRIMARY KEY, vault_address TEXT NOT NULL, owner_address TEXT, is_active INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    this.db.prepare('INSERT INTO user_vaults(user_id, vault_address, owner_address, is_active, updated_at) VALUES(?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET vault_address=excluded.vault_address, owner_address=coalesce(excluded.owner_address, user_vaults.owner_address), is_active=1, updated_at=excluded.updated_at').run(userId, vaultAddress.toLowerCase(), ownerAddress ? ownerAddress.toLowerCase() : null, new Date().toISOString());
  }
  getUserVault(userId: string): { vaultAddress: string; ownerAddress?: string; isActive: boolean } | undefined {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_vaults (user_id TEXT PRIMARY KEY, vault_address TEXT NOT NULL, owner_address TEXT, is_active INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    const row = this.db.prepare('SELECT vault_address, owner_address, is_active FROM user_vaults WHERE user_id = ?').get(userId) as { vault_address: string; owner_address?: string; is_active: number } | undefined;
    return row ? { vaultAddress: row.vault_address, ownerAddress: row.owner_address || undefined, isActive: row.is_active === 1 } : undefined;
  }
  getAllActiveVaults(): Array<{ userId: string; vaultAddress: string; ownerAddress?: string }> {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_vaults (user_id TEXT PRIMARY KEY, vault_address TEXT NOT NULL, owner_address TEXT, is_active INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    const rows = this.db.prepare('SELECT user_id, vault_address, owner_address FROM user_vaults WHERE is_active = 1').all() as Array<{ user_id: string; vault_address: string; owner_address?: string }>;
    return rows.map((r) => ({ userId: r.user_id, vaultAddress: r.vault_address, ownerAddress: r.owner_address || undefined }));
  }
  setVaultActive(userId: string, active: boolean): void {
    this.db.prepare('CREATE TABLE IF NOT EXISTS user_vaults (user_id TEXT PRIMARY KEY, vault_address TEXT NOT NULL, owner_address TEXT, is_active INTEGER NOT NULL, updated_at TEXT NOT NULL)').run();
    this.db.prepare('UPDATE user_vaults SET is_active = ?, updated_at = ? WHERE user_id = ?').run(active ? 1 : 0, new Date().toISOString(), userId);
  }
  close(): void { this.db.close(); }
}

export class MemoryStore {
  private readonly state = new Map<string, string>();
  private readonly userWallets = new Map<string, { address: string; walletId?: string }>();
  private readonly userVaults = new Map<string, { vaultAddress: string; ownerAddress?: string; isActive: boolean }>();
  private readonly targetProfiles = new Map<string, { contractAddress: string; schemaId: string; pricePerNft: bigint; isLive: boolean; verified: boolean }>();
  private readonly inviteCodes = new Map<string, { code: string; createdBy: string; usedBy?: string }>();

  getCursor(startBlock: bigint): bigint {
    const val = this.state.get('cursor');
    return val ? BigInt(val) : startBlock - 1n;
  }
  setCursor(block: bigint): void { this.state.set('cursor', block.toString()); }
  rewind(blocks: bigint): void {
    const current = this.getCursor(0n);
    this.setCursor(current > blocks ? current - blocks : 0n);
  }
  insertIfNew(): boolean { return true; }
  saveWallet(userId: string, address: string, walletId?: string): void {
    this.userWallets.set(userId, { address, walletId });
  }
  getWallet(userId: string): { address?: string; walletId?: string } | undefined {
    return this.userWallets.get(userId);
  }
  saveUserVault(userId: string, vaultAddress: string, ownerAddress?: string): void {
    this.userVaults.set(userId, { vaultAddress: vaultAddress.toLowerCase(), ownerAddress: ownerAddress?.toLowerCase(), isActive: true });
  }
  getUserVault(userId: string): { vaultAddress: string; ownerAddress?: string; isActive: boolean } | undefined {
    return this.userVaults.get(userId);
  }
  getAllActiveVaults(): Array<{ userId: string; vaultAddress: string; ownerAddress?: string }> {
    const results: Array<{ userId: string; vaultAddress: string; ownerAddress?: string }> = [];
    for (const [userId, vault] of this.userVaults.entries()) {
      if (vault.isActive) results.push({ userId, vaultAddress: vault.vaultAddress, ownerAddress: vault.ownerAddress });
    }
    return results;
  }
  setVaultActive(userId: string, active: boolean): void {
    const v = this.userVaults.get(userId);
    if (v) v.isActive = active;
  }
  stageTarget(userId: string, address: string, schemaId: string, pricePerNft: bigint, isLive: boolean): void {
    this.targetProfiles.set(userId, { contractAddress: address.toLowerCase(), schemaId, pricePerNft, isLive, verified: false });
  }
  confirmTarget(userId: string): boolean {
    const target = this.targetProfiles.get(userId);
    if (target && !target.verified) {
      target.verified = true;
      return true;
    }
    return false;
  }
  getTarget(userId: string): { contractAddress: string; schemaId: string; pricePerNft: bigint; isLive: boolean; verified: boolean } | undefined {
    return this.targetProfiles.get(userId);
  }
  saveInvite(code: string, createdBy: string): void {
    this.inviteCodes.set(code, { code, createdBy });
  }
  redeemInvite(code: string, userId: string): boolean {
    const inv = this.inviteCodes.get(code);
    if (inv && !inv.usedBy) {
      inv.usedBy = userId;
      return true;
    }
    return false;
  }
  close(): void {}
}


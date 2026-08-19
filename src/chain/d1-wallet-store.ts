import { MemoryStore, type AccessEntitlement, type EncryptedWalletData, type StoredTarget } from './memory-store.js';
import type { UserState } from '../telegram/commands.js';

type TargetRow = {
  user_id?: string;
  contract_address: string;
  schema_id: string;
  price_per_nft: string;
  is_live: number;
  verified: number;
  metadata_json?: string | null;
  approval_status?: string | null;
  execution_status?: string | null;
  tx_hash?: string | null;
  updated_at?: string | null;
};

export interface D1DatabaseLike {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results?: T[] }>;
      run(): Promise<unknown>;
    };
  };
}

type WalletRow = { address: string; wallet_id?: string | null };

type EncryptedWalletRow = {
  address: string;
  encrypted_key: string;
  iv: string;
  tag: string;
  created_at: number;
};

export class D1WalletStore extends MemoryStore {
  private schemaInitPromise?: Promise<void>;

  constructor(private readonly db: D1DatabaseLike) {
    super();
  }

  /**
   * Initializes database tables ONCE per worker instance (never blocks repetitive queries).
   */
  private async ensureAllTables(): Promise<void> {
    if (!this.schemaInitPromise) {
      this.schemaInitPromise = (async () => {
        try {
          await this.db.prepare(`CREATE TABLE IF NOT EXISTS encrypted_wallets (
            user_id TEXT PRIMARY KEY NOT NULL,
            address TEXT NOT NULL,
            encrypted_key TEXT NOT NULL,
            iv TEXT NOT NULL,
            tag TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`).bind().run();

          await this.db.prepare(`CREATE TABLE IF NOT EXISTS conversation_flows (
            user_id TEXT PRIMARY KEY NOT NULL,
            flow_json TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`).bind().run();

          await this.db.prepare(`CREATE TABLE IF NOT EXISTS target_profiles (
            user_id TEXT NOT NULL,
            contract_address TEXT NOT NULL,
            schema_id TEXT NOT NULL,
            price_per_nft TEXT NOT NULL,
            is_live INTEGER NOT NULL,
            verified INTEGER NOT NULL,
            metadata_json TEXT,
            approval_status TEXT NOT NULL DEFAULT 'none',
            execution_status TEXT NOT NULL DEFAULT 'ready',
            tx_hash TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (user_id, contract_address)
          )`).bind().run();

          await this.db.prepare("ALTER TABLE target_profiles ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'none'").bind().run().catch(() => {});
          await this.db.prepare("ALTER TABLE target_profiles ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'ready'").bind().run().catch(() => {});
          await this.db.prepare("ALTER TABLE target_profiles ADD COLUMN tx_hash TEXT").bind().run().catch(() => {});

          await this.db.prepare(`CREATE TABLE IF NOT EXISTS user_wallets (
            user_id TEXT PRIMARY KEY NOT NULL,
            address TEXT NOT NULL,
            wallet_id TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`).bind().run();
          await this.db.prepare(`CREATE TABLE IF NOT EXISTS user_identities (
            user_id TEXT PRIMARY KEY NOT NULL,
            username TEXT,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`).bind().run();
          await this.db.prepare(`CREATE TABLE IF NOT EXISTS user_entitlements (
            user_id TEXT PRIMARY KEY NOT NULL,
            username TEXT,
            status TEXT NOT NULL,
            source TEXT NOT NULL,
            payment_id TEXT,
            granted_at INTEGER NOT NULL,
            revoked_at INTEGER
          )`).bind().run();
          await this.db.prepare(`CREATE TABLE IF NOT EXISTS access_payments (
            payment_id TEXT PRIMARY KEY NOT NULL,
            chain_id INTEGER NOT NULL,
            tx_hash TEXT NOT NULL,
            asset TEXT NOT NULL,
            log_index INTEGER NOT NULL DEFAULT -1,
            sender TEXT NOT NULL,
            recipient TEXT NOT NULL,
            amount_wei TEXT NOT NULL,
            required_wei TEXT NOT NULL,
            usd_quote REAL NOT NULL,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL,
            block_number TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )`).bind().run();

          // Create indices for fast lookup
          await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_target_profiles_active ON target_profiles(verified, approval_status, execution_status)').bind().run().catch(() => {});
          await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_target_profiles_user ON target_profiles(user_id)').bind().run().catch(() => {});
          await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_access_payments_lookup ON access_payments(chain_id, tx_hash, log_index)').bind().run().catch(() => {});
        } catch (e) {
          console.error('Failed to initialize database tables:', e);
        }
      })();
    }
    await this.schemaInitPromise;
  }

  async saveEncryptedWallet(userId: string, wallet: EncryptedWalletData): Promise<void> {
    super.saveEncryptedWallet(userId, wallet);
    try {
      await this.ensureAllTables();
      await this.db.prepare(`INSERT INTO encrypted_wallets(user_id, address, encrypted_key, iv, tag, created_at, updated_at)
        VALUES(?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          address = excluded.address,
          encrypted_key = excluded.encrypted_key,
          iv = excluded.iv,
          tag = excluded.tag,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at`)
        .bind(userId, wallet.address.toLowerCase(), wallet.encryptedKey, wallet.iv, wallet.tag, wallet.createdAt).run();
    } catch (e) {
      console.error('Error saving encrypted wallet to D1:', e);
    }
  }

  async getEncryptedWallet(userId: string): Promise<EncryptedWalletData | undefined> {
    const inMem = super.getEncryptedWallet(userId);
    if (inMem) return inMem;
    try {
      await this.ensureAllTables();
      const row = await this.db.prepare(
        'SELECT address, encrypted_key, iv, tag, created_at FROM encrypted_wallets WHERE user_id = ?'
      ).bind(userId).first<EncryptedWalletRow>();
      if (!row) return undefined;
      const data: EncryptedWalletData = {
        address: row.address,
        encryptedKey: row.encrypted_key,
        iv: row.iv,
        tag: row.tag,
        createdAt: row.created_at
      };
      super.saveEncryptedWallet(userId, data);
      return data;
    } catch (e) {
      console.error('Error loading encrypted wallet from D1:', e);
      return undefined;
    }
  }

  async stageTarget(userId: string, address: string, schemaId: string, pricePerNft: bigint, isLive: boolean, metadata?: Record<string, string | undefined>): Promise<void> {
    const normAddr = address.toLowerCase();
    super.stageTarget(userId, address, schemaId, pricePerNft, isLive, metadata);
    try {
      await this.ensureAllTables();
      const approvalStatus = metadata?.approvalStatus ?? 'none';
      const executionStatus = metadata?.executionStatus ?? 'ready';
      const txHash = metadata?.txHash ?? null;

      // Delete previous entry for this (user_id, contract_address) to be 100% compatible across table revisions
      await this.db.prepare('DELETE FROM target_profiles WHERE user_id = ? AND LOWER(contract_address) = ?')
        .bind(userId, normAddr).run().catch(() => {});

      await this.db.prepare(`INSERT INTO target_profiles(user_id, contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash, updated_at)
        VALUES(?, ?, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now'))`)
        .bind(userId, normAddr, schemaId, pricePerNft.toString(), isLive ? 1 : 0, JSON.stringify(metadata ?? {}), approvalStatus, executionStatus, txHash).run()
        .catch(async () => {
          await this.db.prepare('DELETE FROM target_profiles WHERE user_id = ?').bind(userId).run().catch(() => {});
          await this.db.prepare(`INSERT INTO target_profiles(user_id, contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash, updated_at)
            VALUES(?, ?, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now'))`)
            .bind(userId, normAddr, schemaId, pricePerNft.toString(), isLive ? 1 : 0, JSON.stringify(metadata ?? {}), approvalStatus, executionStatus, txHash).run();
        });
    } catch (e) {
      console.error('Error staging target in D1:', e);
    }
  }

  async getTarget(userId: string, contractAddress?: string): Promise<StoredTarget | undefined> {
    try {
      await this.ensureAllTables();
      let row: TargetRow | null = null;
      if (contractAddress) {
        row = await this.db.prepare('SELECT contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash FROM target_profiles WHERE user_id = ? AND LOWER(contract_address) = ?')
          .bind(userId, contractAddress.toLowerCase()).first<TargetRow>();
      } else {
        row = await this.db.prepare('SELECT contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash FROM target_profiles WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
          .bind(userId).first<TargetRow>();
      }
      if (!row) {
        return super.getTarget(userId, contractAddress);
      }
      let metadata: Record<string, string | undefined> | undefined;
      try { metadata = row.metadata_json ? JSON.parse(row.metadata_json) as Record<string, string | undefined> : undefined; } catch { metadata = undefined; }
      metadata = { ...(metadata ?? {}), approvalStatus: row.approval_status ?? metadata?.approvalStatus ?? 'none', executionStatus: row.execution_status ?? metadata?.executionStatus ?? 'ready', txHash: row.tx_hash ?? metadata?.txHash };
      const res: StoredTarget = { contractAddress: row.contract_address, schemaId: row.schema_id, pricePerNft: BigInt(row.price_per_nft), isLive: row.is_live === 1, verified: row.verified === 1, metadata };
      super.stageTarget(userId, res.contractAddress, res.schemaId, res.pricePerNft, res.isLive, res.metadata);
      if (res.verified && res.metadata?.approvalStatus === 'approved' && res.metadata.executionStatus === 'ready') {
        const pendingMetadata = { ...(res.metadata ?? {}), approvalStatus: 'pending' };
        super.stageTarget(userId, res.contractAddress, res.schemaId, res.pricePerNft, res.isLive, pendingMetadata);
        super.confirmTarget(userId, res.contractAddress);
      }
      return res;
    } catch (e) {
      console.error('Error loading target from D1:', e);
      return super.getTarget(userId, contractAddress);
    }
  }

  async getUserTargets(userId: string): Promise<Array<StoredTarget>> {
    try {
      await this.ensureAllTables();
      const rows = (await this.db.prepare("SELECT contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash FROM target_profiles WHERE user_id = ? ORDER BY updated_at DESC")
        .bind(userId).all<TargetRow>()).results || [];
      return rows.map(r => {
        let metadata: Record<string, string | undefined> | undefined;
        try { metadata = r.metadata_json ? JSON.parse(r.metadata_json) : undefined; } catch {}
        metadata = { ...(metadata ?? {}), approvalStatus: r.approval_status ?? metadata?.approvalStatus ?? 'none', executionStatus: r.execution_status ?? metadata?.executionStatus ?? 'ready' };
        return {
          contractAddress: r.contract_address,
          schemaId: r.schema_id,
          pricePerNft: BigInt(r.price_per_nft),
          isLive: r.is_live === 1,
          verified: r.verified === 1,
          metadata
        };
      });
    } catch {
      return super.getUserTargets(userId);
    }
  }

  async confirmTarget(userId: string, contractAddress?: string): Promise<boolean> {
    const target = await this.getTarget(userId, contractAddress);
    if (!target || target.metadata?.approvalStatus !== 'pending') return false;
    try {
      await this.ensureAllTables();
      const metadata = { ...(target.metadata ?? {}), approvalStatus: 'approved', executionStatus: 'ready' };
      const normAddr = target.contractAddress.toLowerCase();
      
      await this.db.prepare("UPDATE target_profiles SET verified = 1, approval_status = 'approved', execution_status = 'ready', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ? AND LOWER(contract_address) = ?")
        .bind(JSON.stringify(metadata), userId, normAddr).run()
        .catch(async () => {
          await this.db.prepare("UPDATE target_profiles SET verified = 1, approval_status = 'approved', execution_status = 'ready', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ?")
            .bind(JSON.stringify(metadata), userId).run();
        });

      super.confirmTarget(userId, target.contractAddress);
      return true;
    } catch (e) {
      console.error('Error confirming target in D1:', e);
      super.confirmTarget(userId, target.contractAddress);
      return true;
    }
  }

  async claimTarget(userId: string, contractAddress?: string): Promise<boolean> {
    const target = await this.getTarget(userId, contractAddress);
    if (!target) return false;
    const normAddr = target.contractAddress.toLowerCase();
    try {
      await this.ensureAllTables();
      const metadata = { ...(target.metadata ?? {}), approvalStatus: 'approved', executionStatus: 'claimed' };
      await this.db.prepare("UPDATE target_profiles SET execution_status = 'claimed', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ? AND LOWER(contract_address) = ?")
        .bind(JSON.stringify(metadata), userId, normAddr).run()
        .catch(async () => {
          await this.db.prepare("UPDATE target_profiles SET execution_status = 'claimed', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ?")
            .bind(JSON.stringify(metadata), userId).run();
        });
      super.stageTarget(userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, metadata);
      return true;
    } catch (e) {
      console.error('Error claiming target in D1:', e);
      return false;
    }
  }

  async recordTargetBroadcast(userId: string, contractAddress: string, txHash: string, functionSignature: string): Promise<boolean> {
    const normAddr = contractAddress.toLowerCase();
    try {
      await this.ensureAllTables();
      await this.db.prepare("UPDATE target_profiles SET execution_status = 'broadcast', tx_hash = ?, metadata_json = json_set(COALESCE(metadata_json, '{}'), '$.executionStatus', 'broadcast', '$.txHash', ?, '$.mintFunction', ?), updated_at = datetime('now') WHERE user_id = ? AND LOWER(contract_address) = ?")
        .bind(txHash, txHash, functionSignature, userId, normAddr).run()
        .catch(async () => {
          await this.db.prepare("UPDATE target_profiles SET execution_status = 'broadcast', tx_hash = ?, updated_at = datetime('now') WHERE user_id = ?")
            .bind(txHash, userId).run();
        });
      return true;
    } catch (e) {
      console.error('Error recording broadcast in D1:', e);
      return false;
    }
  }

  async releaseTarget(userId: string, contractAddress?: string): Promise<boolean> {
    const target = await this.getTarget(userId, contractAddress);
    if (!target) return false;
    const normAddr = target.contractAddress.toLowerCase();
    try {
      await this.ensureAllTables();
      const metadata = { ...(target.metadata ?? {}), approvalStatus: 'approved', executionStatus: 'ready' };
      await this.db.prepare("UPDATE target_profiles SET execution_status = 'ready', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ? AND LOWER(contract_address) = ?")
        .bind(JSON.stringify(metadata), userId, normAddr).run()
        .catch(async () => {
          await this.db.prepare("UPDATE target_profiles SET execution_status = 'ready', metadata_json = ?, updated_at = datetime('now') WHERE user_id = ?")
            .bind(JSON.stringify(metadata), userId).run();
        });
      super.stageTarget(userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, metadata);
      return true;
    } catch (e) {
      console.error('Error releasing target claim in D1:', e);
      return false;
    }
  }

  async setTargetSchedule(userId: string, contractAddress: string, scheduledTimeMs?: number): Promise<boolean> {
    const target = await this.getTarget(userId, contractAddress);
    if (!target) return false;
    const metadata = { ...(target.metadata ?? {}) };
    if (scheduledTimeMs && scheduledTimeMs > 0) {
      metadata.userScheduleTimeMs = String(scheduledTimeMs);
      metadata.scheduleSource = 'user';
    } else {
      delete metadata.userScheduleTimeMs;
      delete metadata.scheduleSource;
    }
    const normAddr = target.contractAddress.toLowerCase();
    try {
      await this.ensureAllTables();
      await this.db.prepare("UPDATE target_profiles SET metadata_json = ?, updated_at = datetime('now') WHERE user_id = ? AND LOWER(contract_address) = ?")
        .bind(JSON.stringify(metadata), userId, normAddr).run();
      const stagedMetadata = { ...metadata, approvalStatus: target.verified ? 'pending' : (metadata.approvalStatus ?? 'none') };
      super.stageTarget(userId, target.contractAddress, target.schemaId, target.pricePerNft, target.isLive, stagedMetadata);
      if (target.verified) super.confirmTarget(userId, target.contractAddress);
      return true;
    } catch (e) {
      console.error('Error saving target schedule in D1:', e);
      return false;
    }
  }

  async removeTarget(userId: string, contractAddress?: string): Promise<void> {
    super.removeTarget(userId, contractAddress);
    try {
      await this.ensureAllTables();
      if (contractAddress) {
        await this.db.prepare('DELETE FROM target_profiles WHERE user_id = ? AND LOWER(contract_address) = ?')
          .bind(userId, contractAddress.toLowerCase()).run();
      } else {
        await this.db.prepare('DELETE FROM target_profiles WHERE user_id = ?').bind(userId).run();
      }
    } catch (e) {
      console.error('Error removing target from D1:', e);
    }
  }

  async getAllActiveTargets(): Promise<Array<{ userId: string; contractAddress: string; schemaId: string; pricePerNft: bigint; isLive: boolean; verified: boolean; metadata?: Record<string, string | undefined> }>> {
    try {
      await this.ensureAllTables();
      const rows = (await this.db.prepare("SELECT user_id, contract_address, schema_id, price_per_nft, is_live, verified, metadata_json, approval_status, execution_status, tx_hash FROM target_profiles WHERE verified = 1 AND approval_status = 'approved' AND execution_status = 'ready'").bind().all<TargetRow & { user_id: string }>()).results || [];
      return rows.map(r => {
        let metadata: Record<string, string | undefined> | undefined;
        try { metadata = r.metadata_json ? JSON.parse(r.metadata_json) : undefined; } catch {}
        metadata = { ...(metadata ?? {}), approvalStatus: r.approval_status ?? metadata?.approvalStatus ?? 'none', executionStatus: r.execution_status ?? metadata?.executionStatus ?? 'ready' };
        return {
          userId: r.user_id,
          contractAddress: r.contract_address,
          schemaId: r.schema_id,
          pricePerNft: BigInt(r.price_per_nft),
          isLive: r.is_live === 1,
          verified: r.verified === 1,
          metadata
        };
      });
    } catch {
      return super.getAllActiveTargets();
    }
  }

  async getFlowAsync(userId: string): Promise<UserState['flow'] | undefined> {
    await this.ensureAllTables();
    const row = await this.db.prepare('SELECT flow_json FROM conversation_flows WHERE user_id = ?').bind(userId).first<{ flow_json?: string | null }>();
    if (!row?.flow_json) return undefined;
    try { return JSON.parse(row.flow_json) as UserState['flow']; } catch { return undefined; }
  }

  async saveFlowAsync(userId: string, flow?: UserState['flow']): Promise<void> {
    await this.ensureAllTables();
    await this.db.prepare(
      `INSERT INTO conversation_flows(user_id, flow_json, updated_at)
       VALUES(?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         flow_json = excluded.flow_json,
         updated_at = excluded.updated_at`
    ).bind(userId, flow ? JSON.stringify(flow) : null).run();
  }

  async getWalletAsync(userId: string): Promise<{ address?: string; walletId?: string } | undefined> {
    await this.ensureAllTables();
    const row = await this.db.prepare(
      'SELECT address, wallet_id FROM user_wallets WHERE user_id = ?'
    ).bind(userId).first<WalletRow>();
    if (!row) return undefined;
    return { address: row.address, walletId: row.wallet_id ?? undefined };
  }

  async saveWalletAsync(userId: string, address: string, walletId?: string): Promise<void> {
    await this.ensureAllTables();
    await this.db.prepare(
      `INSERT INTO user_wallets(user_id, address, wallet_id, updated_at)
       VALUES(?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         address = excluded.address,
         wallet_id = COALESCE(excluded.wallet_id, user_wallets.wallet_id),
         updated_at = excluded.updated_at`
    ).bind(userId, address.toLowerCase(), walletId ?? null).run();
    super.saveWallet(userId, address, walletId);
  }

  async recordUsername(userId: string, username?: string): Promise<void> {
    const normalized = username?.replace(/^@/, '').trim().toLowerCase();
    if (!normalized) return;
    super.recordUsername(userId, normalized);
    await this.ensureAllTables();
    await this.db.prepare(`INSERT INTO user_identities(user_id, username, updated_at) VALUES(?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, updated_at = excluded.updated_at`)
      .bind(userId, normalized).run();
  }

  async resolveUsername(username: string): Promise<string | undefined> {
    await this.ensureAllTables();
    const normalized = username.replace(/^@/, '').trim().toLowerCase();
    const row = await this.db.prepare('SELECT user_id FROM user_identities WHERE username = ?').bind(normalized).first<{ user_id: string }>();
    return row?.user_id;
  }

  async getEntitlement(userId: string): Promise<AccessEntitlement | undefined> {
    await this.ensureAllTables();
    const row = await this.db.prepare('SELECT user_id, username, status, source, payment_id, granted_at, revoked_at FROM user_entitlements WHERE user_id = ? AND status = \'active\'').bind(userId).first<{ user_id: string; username?: string | null; status: 'active' | 'revoked'; source: 'payment' | 'admin'; payment_id?: string | null; granted_at: number; revoked_at?: number | null }>();
    if (!row) return undefined;
    return { userId: row.user_id, username: row.username ?? undefined, status: row.status, source: row.source, paymentId: row.payment_id ?? undefined, grantedAt: row.granted_at, revokedAt: row.revoked_at ?? undefined };
  }

  async grantEntitlement(userId: string, username: string | undefined, source: 'payment' | 'admin', paymentId?: string): Promise<void> {
    const normalized = username?.replace(/^@/, '').trim().toLowerCase() || null;
    const now = Date.now();
    await this.ensureAllTables();
    await this.db.prepare(`INSERT INTO user_entitlements(user_id, username, status, source, payment_id, granted_at, revoked_at)
      VALUES(?, ?, 'active', ?, ?, ?, NULL)
      ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, status = 'active', source = excluded.source, payment_id = excluded.payment_id, granted_at = excluded.granted_at, revoked_at = NULL`)
      .bind(userId, normalized, source, paymentId ?? null, now).run();
    if (normalized) await this.recordUsername(userId, normalized);
    super.grantEntitlement(userId, normalized ?? undefined, source, paymentId);
  }

  async revokeEntitlement(userId: string): Promise<boolean> {
    await this.ensureAllTables();
    const result = await this.db.prepare("UPDATE user_entitlements SET status = 'revoked', revoked_at = ? WHERE user_id = ? AND status = 'active' RETURNING user_id").bind(Date.now(), userId).first<{ user_id: string }>();
    if (!result) return false;
    super.revokeEntitlement(userId);
    return true;
  }

  async listEntitlements(): Promise<AccessEntitlement[]> {
    await this.ensureAllTables();
    const rows = (await this.db.prepare('SELECT user_id, username, status, source, payment_id, granted_at, revoked_at FROM user_entitlements ORDER BY granted_at DESC').bind().all<{ user_id: string; username?: string | null; status: 'active' | 'revoked'; source: 'payment' | 'admin'; payment_id?: string | null; granted_at: number; revoked_at?: number | null }>()).results ?? [];
    return rows.map((row) => ({ userId: row.user_id, username: row.username ?? undefined, status: row.status, source: row.source, paymentId: row.payment_id ?? undefined, grantedAt: row.granted_at, revokedAt: row.revoked_at ?? undefined }));
  }

  isDurableStore(): boolean {
    return true;
  }

  async consumePayment(payment: { paymentId: string; chainId: number; txHash: string; asset: string; logIndex: number; sender: string; recipient: string; amountWei: bigint; requiredWei: bigint; usdQuote: number; userId: string; blockNumber: bigint }): Promise<'accepted' | 'already_used'> {
    await this.ensureAllTables();
    try {
      await this.db.prepare(`INSERT INTO access_payments(payment_id, chain_id, tx_hash, asset, log_index, sender, recipient, amount_wei, required_wei, usd_quote, user_id, status, block_number, created_at)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?)`)
        .bind(payment.paymentId, payment.chainId, payment.txHash.toLowerCase(), payment.asset, payment.logIndex, payment.sender.toLowerCase(), payment.recipient.toLowerCase(), payment.amountWei.toString(), payment.requiredWei.toString(), payment.usdQuote, payment.userId, payment.blockNumber.toString(), Date.now()).run();
    } catch (error) {
      if (String(error).toLowerCase().includes('unique')) return 'already_used';
      throw error;
    }
    return 'accepted';
  }
}

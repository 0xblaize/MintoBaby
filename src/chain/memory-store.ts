export interface EncryptedWalletData {
  address: string;
  encryptedKey: string;
  iv: string;
  tag: string;
  createdAt: number;
}

export type StoredTarget = {
  contractAddress: string;
  schemaId: string;
  pricePerNft: bigint;
  isLive: boolean;
  verified: boolean;
  metadata?: Record<string, string | undefined>;
};

export type AccessEntitlement = {
  userId: string;
  username?: string;
  status: 'active' | 'revoked';
  source: 'payment' | 'admin';
  paymentId?: string;
  grantedAt: number;
  revokedAt?: number;
};

export interface IStore {
  getCursor(startBlock: bigint): bigint;
  setCursor(block: bigint): void;
  rewind(blocks: bigint): void;
  insertIfNew(event: { key: string; blockNumber: bigint; txHash: string; logIndex: number; payload: string }): boolean;

  // Telegram Direct Sniper Wallets
  saveEncryptedWallet(userId: string, wallet: EncryptedWalletData): Promise<void> | void;
  getEncryptedWallet(userId: string): Promise<EncryptedWalletData | undefined> | EncryptedWalletData | undefined;
  deleteWallet(userId: string): Promise<void> | void;

  saveWallet(userId: string, address: string, walletId?: string): Promise<void> | void;
  getWallet(userId: string): Promise<{ address?: string; walletId?: string } | undefined> | { address?: string; walletId?: string } | undefined;

  stageTarget(userId: string, address: string, schemaId: string, pricePerNft: bigint, isLive: boolean, metadata?: Record<string, string | undefined>): Promise<void> | void;
  confirmTarget(userId: string, contractAddress?: string): Promise<boolean> | boolean;
  claimTarget?(userId: string, contractAddress?: string): Promise<boolean> | boolean;
  releaseTarget?(userId: string, contractAddress?: string): Promise<boolean> | boolean;
  recordTargetBroadcast?(userId: string, contractAddress: string, txHash: string, functionSignature: string): Promise<boolean> | boolean;
  setTargetSchedule?(userId: string, contractAddress: string, scheduledTimeMs?: number): Promise<boolean> | boolean;
  getTarget(userId: string, contractAddress?: string): Promise<StoredTarget | undefined> | StoredTarget | undefined;
  getUserTargets?(userId: string): Promise<Array<StoredTarget>> | Array<StoredTarget>;
  removeTarget(userId: string, contractAddress?: string): Promise<void> | void;
  getAllActiveTargets(): Promise<Array<{ userId: string } & StoredTarget>> | Array<{ userId: string } & StoredTarget>;

  saveInvite(code: string, createdBy: string): void;
  redeemInvite(code: string, userId: string): boolean;
  addAllowedUser(userId: string, addedBy?: string): void;
  isUserAllowed(userId: string): boolean;
  getAllowedUsers(): string[];
  getEntitlement?(userId: string): Promise<AccessEntitlement | undefined> | AccessEntitlement | undefined;
  grantEntitlement?(userId: string, username: string | undefined, source: 'payment' | 'admin', paymentId?: string): Promise<void> | void;
  revokeEntitlement?(userId: string): Promise<boolean> | boolean;
  recordUsername?(userId: string, username?: string): Promise<void> | void;
  resolveUsername?(username: string): Promise<string | undefined> | string | undefined;
  listEntitlements?(): Promise<AccessEntitlement[]> | AccessEntitlement[];
  consumePayment?(payment: { paymentId: string; chainId: number; txHash: string; asset: string; logIndex: number; sender: string; recipient: string; amountWei: bigint; requiredWei: bigint; usdQuote: number; userId: string; blockNumber: bigint }): Promise<'accepted' | 'already_used'> | 'accepted' | 'already_used';
  isDurableStore?(): boolean;
  close(): void;
}

export class MemoryStore implements IStore {
  private readonly state = new Map<string, string>();
  private readonly userWallets = new Map<string, { address: string; walletId?: string }>();
  private readonly encryptedWallets = new Map<string, EncryptedWalletData>();
  // Keyed by `${userId}:${contractAddress.toLowerCase()}`
  private readonly targetProfiles = new Map<string, StoredTarget>();
  // Tracks most recently staged/touched contract per user for legacy single-arg callers
  private readonly lastUserTarget = new Map<string, string>();
  private readonly inviteCodes = new Map<string, { code: string; createdBy: string; usedBy?: string }>();
  private readonly allowedUsers = new Set<string>();
  private readonly processedEvents = new Set<string>();
  private readonly entitlements = new Map<string, AccessEntitlement>();
  private readonly usernames = new Map<string, string>();
  private readonly consumedPayments = new Set<string>();

  private targetKey(userId: string, contractAddress: string): string {
    return `${userId}:${contractAddress.toLowerCase()}`;
  }

  removeTarget(userId: string, contractAddress?: string): void {
    if (contractAddress) {
      this.targetProfiles.delete(this.targetKey(userId, contractAddress));
      if (this.lastUserTarget.get(userId)?.toLowerCase() === contractAddress.toLowerCase()) {
        this.lastUserTarget.delete(userId);
      }
    } else {
      for (const key of Array.from(this.targetProfiles.keys())) {
        if (key.startsWith(`${userId}:`)) {
          this.targetProfiles.delete(key);
        }
      }
      this.lastUserTarget.delete(userId);
    }
  }

  getAllActiveTargets(): Promise<Array<{ userId: string } & StoredTarget>> | Array<{ userId: string } & StoredTarget> {
    const list: Array<{ userId: string } & StoredTarget> = [];
    for (const [key, target] of this.targetProfiles.entries()) {
      const userId = key.split(':')[0];
      if (target.verified && target.metadata?.approvalStatus === 'approved' && target.metadata?.executionStatus !== 'claimed') {
        list.push({ userId, ...target });
      }
    }
    return list;
  }

  getUserTargets(userId: string): Array<StoredTarget> {
    const list: StoredTarget[] = [];
    for (const [key, target] of this.targetProfiles.entries()) {
      if (key.startsWith(`${userId}:`)) {
        list.push(target);
      }
    }
    return list;
  }

  getCursor(startBlock: bigint): bigint {
    const raw = this.state.get('cursor');
    return raw ? BigInt(raw) : startBlock;
  }

  setCursor(block: bigint): void {
    this.state.set('cursor', block.toString());
  }

  rewind(blocks: bigint): void {
    const current = this.getCursor(0n);
    const target = current > blocks ? current - blocks : 0n;
    this.setCursor(target);
  }

  insertIfNew(event: { key: string; blockNumber: bigint; txHash: string; logIndex: number; payload: string }): boolean {
    if (this.processedEvents.has(event.key)) return false;
    this.processedEvents.add(event.key);
    return true;
  }

  saveEncryptedWallet(userId: string, wallet: EncryptedWalletData): void {
    this.encryptedWallets.set(userId, wallet);
  }

  getEncryptedWallet(userId: string): Promise<EncryptedWalletData | undefined> | EncryptedWalletData | undefined {
    return this.encryptedWallets.get(userId);
  }

  deleteWallet(userId: string): void {
    this.encryptedWallets.delete(userId);
    this.userWallets.delete(userId);
  }

  saveWallet(userId: string, address: string, walletId?: string): void {
    this.userWallets.set(userId, { address, walletId });
  }

  getWallet(userId: string): { address?: string; walletId?: string } | undefined {
    return this.userWallets.get(userId);
  }

  stageTarget(userId: string, address: string, schemaId: string, pricePerNft: bigint, isLive: boolean, metadata?: Record<string, string | undefined>): void {
    const key = this.targetKey(userId, address);
    this.targetProfiles.set(key, { contractAddress: address, schemaId, pricePerNft, isLive, verified: false, metadata });
    this.lastUserTarget.set(userId, address.toLowerCase());
  }

  confirmTarget(userId: string, contractAddress?: string): Promise<boolean> | boolean {
    const target = this.getTarget(userId, contractAddress);
    if (!target || target.metadata?.approvalStatus !== 'pending') return false;
    target.verified = true;
    target.metadata = { ...(target.metadata ?? {}), approvalStatus: 'approved', executionStatus: 'ready' };
    return true;
  }

  claimTarget(userId: string, contractAddress?: string): Promise<boolean> | boolean {
    const target = this.getTarget(userId, contractAddress);
    if (!target || !target.verified || target.metadata?.approvalStatus !== 'approved' || target.metadata?.executionStatus === 'claimed') return false;
    target.metadata = { ...(target.metadata ?? {}), executionStatus: 'claimed' };
    return true;
  }

  releaseTarget(userId: string, contractAddress?: string): Promise<boolean> | boolean {
    const target = this.getTarget(userId, contractAddress);
    if (!target || target.metadata?.executionStatus !== 'claimed') return false;
    target.metadata = { ...(target.metadata ?? {}), executionStatus: 'ready' };
    return true;
  }

  recordTargetBroadcast(userId: string, contractAddress: string, txHash: string, functionSignature: string): Promise<boolean> | boolean {
    const target = this.getTarget(userId, contractAddress);
    if (!target || target.metadata?.executionStatus !== 'claimed') return false;
    target.metadata = { ...(target.metadata ?? {}), executionStatus: 'broadcast', txHash, mintFunction: functionSignature };
    return true;
  }

  setTargetSchedule(userId: string, contractAddress: string, scheduledTimeMs?: number): Promise<boolean> | boolean {
    const target = this.getTarget(userId, contractAddress);
    if (!target) return false;
    const metadata = { ...(target.metadata ?? {}) };
    if (scheduledTimeMs && scheduledTimeMs > 0) {
      metadata.userScheduleTimeMs = String(scheduledTimeMs);
      metadata.scheduleSource = 'user';
    } else {
      delete metadata.userScheduleTimeMs;
      delete metadata.scheduleSource;
    }
    target.metadata = metadata;
    return true;
  }

  getTarget(userId: string, contractAddress?: string): StoredTarget | undefined {
    if (contractAddress) {
      return this.targetProfiles.get(this.targetKey(userId, contractAddress));
    }
    const lastAddr = this.lastUserTarget.get(userId);
    if (lastAddr) {
      const found = this.targetProfiles.get(this.targetKey(userId, lastAddr));
      if (found) return found;
    }
    for (const [key, target] of this.targetProfiles.entries()) {
      if (key.startsWith(`${userId}:`)) {
        return target;
      }
    }
    return undefined;
  }

  saveInvite(code: string, createdBy: string): void {
    this.inviteCodes.set(code.toLowerCase(), { code: code.toLowerCase(), createdBy });
  }

  redeemInvite(code: string, userId: string): boolean {
    const invite = this.inviteCodes.get(code.toLowerCase());
    if (!invite || invite.usedBy) return false;
    invite.usedBy = userId;
    this.addAllowedUser(userId, invite.createdBy);
    return true;
  }

  addAllowedUser(userId: string, _addedBy?: string): void {
    this.allowedUsers.add(userId.toLowerCase());
  }

  isUserAllowed(userId: string): boolean {
    return this.allowedUsers.has(userId.toLowerCase());
  }

  getAllowedUsers(): string[] {
    return Array.from(this.allowedUsers);
  }

  getEntitlement(userId: string): Promise<AccessEntitlement | undefined> | AccessEntitlement | undefined {
    const entitlement = this.entitlements.get(userId);
    return entitlement?.status === 'active' ? entitlement : undefined;
  }

  grantEntitlement(userId: string, username: string | undefined, source: 'payment' | 'admin', paymentId?: string): void {
    this.entitlements.set(userId, { userId, username, status: 'active', source, paymentId, grantedAt: Date.now() });
    if (username) this.usernames.set(username.replace(/^@/, '').toLowerCase(), userId);
    this.allowedUsers.add(userId.toLowerCase());
  }

  revokeEntitlement(userId: string): Promise<boolean> | boolean {
    const entitlement = this.entitlements.get(userId);
    if (!entitlement || entitlement.status !== 'active') return false;
    entitlement.status = 'revoked';
    entitlement.revokedAt = Date.now();
    this.allowedUsers.delete(userId.toLowerCase());
    return true;
  }

  recordUsername(userId: string, username?: string): void {
    if (username) this.usernames.set(username.replace(/^@/, '').toLowerCase(), userId);
    const entitlement = this.entitlements.get(userId);
    if (entitlement && username) entitlement.username = username.replace(/^@/, '').toLowerCase();
  }

  resolveUsername(username: string): Promise<string | undefined> | string | undefined {
    return this.usernames.get(username.replace(/^@/, '').toLowerCase());
  }

  listEntitlements(): Promise<AccessEntitlement[]> | AccessEntitlement[] {
    return Array.from(this.entitlements.values());
  }

  consumePayment(payment: { paymentId: string; chainId: number; txHash: string; asset: string; logIndex: number; sender: string; recipient: string; amountWei: bigint; requiredWei: bigint; usdQuote: number; userId: string; blockNumber: bigint }): Promise<'accepted' | 'already_used'> | 'accepted' | 'already_used' {
    if (this.consumedPayments.has(payment.paymentId)) return 'already_used';
    this.consumedPayments.add(payment.paymentId);
    return 'accepted';
  }

  isDurableStore(): boolean {
    return false;
  }

  close(): void {}
}

import { getAddress, type PublicClient } from 'viem';

export const VERIFICATION_STATUS = {
  CLASSIFIED_SAFE: 'CLASSIFIED_SAFE',
  UNCLASSIFIED_DISABLED: 'UNCLASSIFIED_DISABLED'
} as const;

export type CollectionMetadata = {
  name?: string;
  symbol?: string;
};

export type DiscoveryResult =
  | {
      status: 'CLASSIFIED_SAFE';
      schemaId: 'STANDARD_ERC721_MINT';
      address: `0x${string}`;
      pricePerNft: bigint;
      priceStatus: 'known' | 'unavailable';
      maxPerWallet?: number;
      onChainStartTimeMs?: number;
      onChainEndTimeMs?: number;
      seaDropAddress?: `0x${string}`;
      phaseKind: 'public' | 'fcfs' | 'allowlist' | 'gated' | 'seadrop' | 'unknown';
      phaseStatus: 'open' | 'not_open' | 'expired' | 'unknown';
      isLive: boolean;
      detectedFunctions: string[];
      metadata: CollectionMetadata;
    }
  | { status: 'UNCLASSIFIED_DISABLED'; reason: string };

// SeaDrop v1.0 — canonical address on all EVM chains
const SEADROP_ADDRESS = '0x00005EA00Ac477B1030CE78506496e8C2dE24bf5';
const ROBINHOOD_RPC = 'https://rpc.mainnet.chain.robinhood.com';


// Pad an address to 32-byte ABI parameter
function padAddress(addr: string): string {
  return addr.replace(/^0x/, '').toLowerCase().padStart(64, '0');
}

// Manual ABI string decoder — supports dynamic strings and bytes32 metadata.
function decodeString(hex?: string): string | undefined {
  if (!hex || hex === '0x') return undefined;
  try {
    const raw = hex.replace(/^0x/, '');
    if (raw.length >= 128) {
      const length = parseInt(raw.slice(64, 128), 16);
      if (!isNaN(length) && length > 0 && length <= 512) {
        const dataHex = raw.slice(128, 128 + length * 2);
        let result = '';
        for (let i = 0; i < dataHex.length; i += 2) {
          const code = parseInt(dataHex.slice(i, i + 2), 16);
          if (code >= 32 && code <= 126) result += String.fromCharCode(code);
        }
        if (result.trim()) return result.trim();
      }
    }

    const bytes32Hex = raw.slice(0, 64).replace(/(00)+$/, '');
    let bytes32 = '';
    for (let i = 0; i < bytes32Hex.length; i += 2) {
      const code = parseInt(bytes32Hex.slice(i, i + 2), 16);
      if (code >= 32 && code <= 126) bytes32 += String.fromCharCode(code);
    }
    return bytes32.trim() || undefined;
  } catch { return undefined; }
}

// Manual uint256 decoder
function decodeUint256(hex?: string): bigint | undefined {
  if (!hex || hex === '0x') return undefined;
  try {
    return BigInt('0x' + hex.replace(/^0x/, '').slice(-64));
  } catch { return undefined; }
}

// Manual bool decoder
function decodeBool(hex?: string): boolean | undefined {
  if (!hex || hex === '0x') return undefined;
  try { return BigInt(hex) !== 0n; } catch { return undefined; }
}

// Single JSON-RPC eth_call via fetch — retries transient RPC failures in the same scan.
async function ethCall(to: string, data: string, rpcUrl: string = ROBINHOOD_RPC, attempts = 2): Promise<string | undefined> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: attempt,
          method: 'eth_call',
          params: [{ to, data }, 'latest']
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) continue;
      const json = await res.json() as { result?: string; error?: { message?: string } };
      if (json.error) {
        console.log(`[DISCOVERY] eth_call ${data.slice(0, 10)} → error: ${json.error.message}`);
        continue;
      }
      if (json.result && json.result !== '0x') return json.result;
    } catch (e) {
      console.log(`[DISCOVERY] eth_call ${data.slice(0, 10)} attempt ${attempt} failed: ${e}`);
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }
  return undefined;
}

/**
 * Query Blockscout for verified token metadata
 */
async function fetchBlockscoutMetadata(address: string): Promise<{ name?: string; symbol?: string } | undefined> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`https://robinhoodchain.blockscout.com/api/v2/tokens/${address}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json() as { name?: string; symbol?: string };
        const name = data.name?.trim();
        const symbol = data.symbol?.trim();
        if (name || symbol) {
          console.log(`[DISCOVERY] Blockscout hit: name="${name}" symbol="${symbol}"`);
          return { name, symbol };
        }
      }
    } catch (e) {
      console.log(`[DISCOVERY] Blockscout attempt ${attempt} failed: ${e}`);
    }
  }
  return undefined;
}

/**
 * Step 1: Call getAllowedSeaDrops() on the NFT contract to find its SeaDrop address.
 * Supports both SeaDrop NFT interface variants: getAllowedSeaDrop() and getAllowedSeaDrops().
 */
async function getAllowedSeaDropAddress(nftAddress: string, rpcUrl: string): Promise<string | undefined> {
  for (const [label, selector] of [
    ['getAllowedSeaDrop', '0xb2490c3b'],
    ['getAllowedSeaDrops', '0xb842ffc4']
  ] as const) {
    try {
      const result = await ethCall(nftAddress, selector, rpcUrl);
      if (!result) continue;

      const raw = result.replace(/^0x/, '');
      const addressWord = label === 'getAllowedSeaDrop' ? raw.slice(-64) : raw.slice(128, 192);
      const addr = '0x' + addressWord.slice(-40);
      if (addr.length === 42 && !/^0x0{40}$/i.test(addr)) {
        console.log(`[DISCOVERY] ${label} → ${addr}`);
        return addr;
      }
    } catch (e) {
      console.log(`[DISCOVERY] ${label} error: ${e}`);
    }
  }
  return undefined;
}

/**
 * Step 2: Query getPublicDrop(address nftContract) on the discovered SeaDrop address.
 * Also tries the canonical SeaDrop v1 address as fallback.
 * Returns mintPrice, startTime, maxPerWallet.
 */
async function fetchSeaDropPublicStage(nftAddress: string, rpcUrl: string): Promise<{
  mintPrice?: bigint;
  startTimeMs?: number;
  endTimeMs?: number;
  seaDropAddress?: `0x${string}`;
  maxPerWallet?: number;
} | undefined> {
  // Discover the real SeaDrop contract address from the NFT contract
  const discoveredSeaDrop = await getAllowedSeaDropAddress(nftAddress, rpcUrl);

  // Try discovered address first, then canonical SeaDrop v1 as fallback
  const candidates = [
    ...(discoveredSeaDrop ? [discoveredSeaDrop] : []),
    SEADROP_ADDRESS, // 0x00005EA00Ac477B1030CE78506496e8C2dE24bf5
  ];

  const calldata = '0xbc6a629c' + padAddress(nftAddress);

  for (const seaDropAddr of candidates) {
    try {
      console.log(`[DISCOVERY] Querying SeaDrop at ${seaDropAddr} for ${nftAddress}`);
      const result = await ethCall(seaDropAddr, calldata, rpcUrl);
      if (!result) {
        console.log(`[DISCOVERY] SeaDrop ${seaDropAddr} returned no data`);
        continue;
      }

      const raw = result.replace(/^0x/, '');
      if (raw.length < 128) continue;

      // PublicDrop ABI — each field is its own 32-byte word:
      // Word 0: mintPrice (uint80)
      // Word 1: startTime (uint48)
      // Word 2: endTime   (uint48)
      // Word 3: maxTotalMintableByWallet (uint16)
      const mintPriceRaw  = BigInt('0x' + raw.slice(0, 64));
      const startTimeSec  = Number(BigInt('0x' + raw.slice(64, 128)));
      const endTimeSec = Number(BigInt('0x' + raw.slice(128, 192)));
      const maxPerWalletRaw = raw.length >= 256 ? Number(BigInt('0x' + raw.slice(192, 256))) : undefined;

      const mintPrice = mintPriceRaw;
      const startTimeMs = startTimeSec > 1700000000 && startTimeSec < 1956528000
        ? startTimeSec * 1000 : undefined;
      const endTimeMs = endTimeSec > 1700000000 && endTimeSec < 1956528000
        ? endTimeSec * 1000 : undefined;

      console.log(`[DISCOVERY] SeaDrop hit at ${seaDropAddr}: mintPrice=${mintPrice} (${Number(mintPrice ?? 0n)/1e18} ETH) startTimeMs=${startTimeMs} endTimeMs=${endTimeMs} maxPerWallet=${maxPerWalletRaw}`);

      return {
        mintPrice,
        startTimeMs,
        endTimeMs,
        seaDropAddress: seaDropAddr as `0x${string}`,
        maxPerWallet: maxPerWalletRaw && maxPerWalletRaw > 0 && maxPerWalletRaw <= 10000 ? maxPerWalletRaw : undefined
      };
    } catch (e) {
      console.log(`[DISCOVERY] SeaDrop ${seaDropAddr} fetch error: ${e}`);
    }
  }

  return undefined;
}

export async function discoverRobinhoodContract(client: PublicClient, rawAddress: string, rpcUrl: string = ROBINHOOD_RPC): Promise<DiscoveryResult> {
  let address: `0x${string}`;
  try {
    address = getAddress(rawAddress.trim());
  } catch {
    return { status: 'UNCLASSIFIED_DISABLED', reason: 'Invalid address — must be 0x + 40 hex chars.' };
  }

  console.log(`[DISCOVERY] ─── Fresh on-chain scan ${address} ───`);

  try {
    // Fetch identity first with extra retries so the setup card never races the metadata calls.
    const nameHex = await ethCall(address, '0x06fdde03', rpcUrl, 4);
    const symbolHex = await ethCall(address, '0x95d89b41', rpcUrl, 4);

    const [
      blockscout,
      mintPriceHex, costHex, priceHex, publicPriceHex,
      maxPerWalletHex, maxMintPerWalletHex,
      startTimeHex, pubSaleStartHex,
      isSaleActiveHex, saleIsActiveHex, isPublicMintActiveHex, pausedHex
    ] = await Promise.all([
      fetchBlockscoutMetadata(address),
      ethCall(address, '0x5a1a473f', rpcUrl), // mintPrice()
      ethCall(address, '0x3e1850dc', rpcUrl), // cost()
      ethCall(address, '0xa035b1fe', rpcUrl), // price()
      ethCall(address, '0xd3d96ff4', rpcUrl), // publicPrice()
      ethCall(address, '0x8b329432', rpcUrl), // maxPerWallet()
      ethCall(address, '0xb5090f42', rpcUrl), // maxMintPerWallet()
      ethCall(address, '0x78e97925', rpcUrl), // startTime()
      ethCall(address, '0x4f4949dc', rpcUrl), // publicSaleStartTime()
      ethCall(address, '0x0374e2cf', rpcUrl), // isSaleActive()
      ethCall(address, '0xd4290740', rpcUrl), // saleIsActive()
      ethCall(address, '0xfa399587', rpcUrl), // isPublicMintActive()
      ethCall(address, '0x5c975abb', rpcUrl), // paused()
    ]);

    // Query SeaDrop after the contract probes to avoid rate-limiting the RPC with a burst of calls.
    const seaDrop = await fetchSeaDropPublicStage(address, rpcUrl);

    console.log(`[DISCOVERY] nameHex=${nameHex?.slice(0, 30)} symbolHex=${symbolHex?.slice(0, 30)}`);
    console.log(`[DISCOVERY] mintPriceHex=${mintPriceHex} costHex=${costHex} priceHex=${priceHex}`);
    console.log(`[DISCOVERY] startTimeHex=${startTimeHex} isSaleActiveHex=${isSaleActiveHex} pausedHex=${pausedHex}`);

    // ── 1. Name & Symbol ──────────────────────────────────────────
    const onChainName   = decodeString(nameHex);
    const onChainSymbol = decodeString(symbolHex);
    const name   = onChainName || blockscout?.name;
    const symbol = onChainSymbol || blockscout?.symbol;
    console.log(`[DISCOVERY] name="${name}" symbol="${symbol}"`);

    // ── 2. Mint Price (standard contract, then SeaDrop fallback) ──
    const p1 = decodeUint256(mintPriceHex);
    const p2 = decodeUint256(costHex);
    const p3 = decodeUint256(priceHex);
    const p4 = decodeUint256(publicPriceHex);
    const standardPrices = [p1, p2, p3, p4];
    const positiveStandardPrice = standardPrices.find((price) => price !== undefined && price > 0n);
    const zeroPriceDetected = standardPrices.some((price) => price === 0n);
    const seaDropPrice = seaDrop?.mintPrice;
    const positiveSeaDropPrice = seaDropPrice !== undefined && seaDropPrice > 0n ? seaDropPrice : undefined;
    const pricePerNft = positiveSeaDropPrice ?? positiveStandardPrice ?? 0n;
    const priceStatus: 'known' | 'unavailable' = positiveSeaDropPrice !== undefined || positiveStandardPrice !== undefined || zeroPriceDetected || seaDropPrice !== undefined
      ? 'known'
      : 'unavailable';
    console.log(`[DISCOVERY] pricePerNft=${pricePerNft} (${Number(pricePerNft)/1e18} ETH) status=${priceStatus} [seadrop=${seaDropPrice}]`);

    // ── 3. Max Per Wallet ─────────────────────────────────────────
    const l1 = decodeUint256(maxPerWalletHex);
    const l2 = decodeUint256(maxMintPerWalletHex);
    const rawLimit = l1 ?? l2;
    let maxPerWallet: number | undefined;
    if (rawLimit !== undefined && rawLimit > 0n && rawLimit <= 10000n) {
      maxPerWallet = Number(rawLimit);
    } else if (seaDrop?.maxPerWallet) {
      maxPerWallet = seaDrop.maxPerWallet;
    }
    console.log(`[DISCOVERY] maxPerWallet=${maxPerWallet}`);

    // ── 4. On-Chain Start Time (standard, then SeaDrop fallback) ──
    const t1 = decodeUint256(startTimeHex);
    const t2 = decodeUint256(pubSaleStartHex);
    let onChainStartTimeMs: number | undefined;
    const rawTime = t1 ?? t2;
    if (rawTime !== undefined && rawTime > 0n) {
      const ts = Number(rawTime);
      if (ts > 1700000000 && ts < 1950000000) onChainStartTimeMs = ts * 1000;
    }
    if (!onChainStartTimeMs && seaDrop?.startTimeMs) {
      onChainStartTimeMs = seaDrop.startTimeMs;
    }
    const onChainEndTimeMs = seaDrop?.endTimeMs;
    console.log(`[DISCOVERY] onChainStartTimeMs=${onChainStartTimeMs} (${onChainStartTimeMs ? new Date(onChainStartTimeMs).toISOString() : 'none'}) onChainEndTimeMs=${onChainEndTimeMs ?? 'none'}`);

    // ── 5. Live Status ────────────────────────────────────────────
    const isPaused        = decodeBool(pausedHex);
    const isSaleActive    = decodeBool(isSaleActiveHex);
    const saleIsActive    = decodeBool(saleIsActiveHex);
    const isPubMintActive = decodeBool(isPublicMintActiveHex);

    const activeSaleFlag = isSaleActive === true || saleIsActive === true || isPubMintActive === true;
    const knownSaleFlag = isSaleActive !== undefined || saleIsActive !== undefined || isPubMintActive !== undefined;
    const phaseKind: 'public' | 'fcfs' | 'allowlist' | 'gated' | 'seadrop' | 'unknown' = seaDrop
      ? 'seadrop'
      : activeSaleFlag
        ? 'public'
        : 'unknown';
    const nowMs = Date.now();
    const phaseStatus: 'open' | 'not_open' | 'expired' | 'unknown' =
      onChainEndTimeMs && onChainEndTimeMs <= nowMs
        ? 'expired'
        : onChainStartTimeMs && onChainStartTimeMs > nowMs
          ? 'not_open'
          : isPaused === true || (knownSaleFlag && !activeSaleFlag)
            ? 'not_open'
            : activeSaleFlag || seaDrop
              ? 'open'
              : 'unknown';

    let isLive: boolean;
    if (onChainStartTimeMs && onChainStartTimeMs > nowMs) {
      isLive = false; // On-chain timer says not yet
    } else if (onChainEndTimeMs && onChainEndTimeMs <= nowMs) {
      isLive = false;
    } else if (isPaused === true) {
      isLive = false;
    } else if (knownSaleFlag && !activeSaleFlag) {
      isLive = false;
    } else if (activeSaleFlag) {
      isLive = true;
    } else {
      // No status flags found — default PENDING, safer than assuming LIVE
      isLive = false;
    }
    console.log(`[DISCOVERY] isLive=${isLive} [seaDrop.startTimeMs=${seaDrop?.startTimeMs}]`);

    const result: DiscoveryResult = {
      status: 'CLASSIFIED_SAFE',
      schemaId: 'STANDARD_ERC721_MINT',
      address,
      pricePerNft,
      priceStatus,
      maxPerWallet,
      onChainStartTimeMs,
      onChainEndTimeMs,
      seaDropAddress: seaDrop?.seaDropAddress,
      phaseKind,
      phaseStatus,
      isLive,
      detectedFunctions: ['mint', 'publicMint', 'claim'],
      metadata: { name, symbol }
    };

    return result;

  } catch (err) {
    console.error('[DISCOVERY] Fatal error:', err);
    return {
      status: 'CLASSIFIED_SAFE',
      schemaId: 'STANDARD_ERC721_MINT',
      address,
      pricePerNft: 0n,
      priceStatus: 'unavailable',
      phaseKind: 'unknown',
      phaseStatus: 'unknown',
      isLive: false,
      detectedFunctions: ['mint', 'publicMint', 'claim'],
      metadata: { name: undefined, symbol: undefined }
    };
  }
}

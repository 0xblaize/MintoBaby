let cachedEthUsd: { price: number; expiresAt: number } | undefined;

async function fetchPrice(url: string, readPrice: (body: unknown) => number | undefined): Promise<number | undefined> {
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return undefined;
    const price = readPrice(await response.json());
    return price && Number.isFinite(price) && price > 0 ? price : undefined;
  } catch {
    return undefined;
  }
}

export async function getEthUsdPrice(): Promise<number | undefined> {
  if (cachedEthUsd && cachedEthUsd.expiresAt > Date.now()) return cachedEthUsd.price;

  const sources: Array<{ url: string; readPrice: (body: unknown) => number | undefined }> = [
    {
      url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      readPrice: (body) => (body as { ethereum?: { usd?: number } }).ethereum?.usd
    },
    {
      url: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
      readPrice: (body) => Number((body as { data?: { rates?: { USD?: string } } }).data?.rates?.USD)
    },
    {
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
      readPrice: (body) => Number((body as { price?: string }).price)
    },
    {
      url: 'https://api.kraken.com/0/public/Ticker?pair=ETHUSD',
      readPrice: (body) => {
        const result = (body as { result?: Record<string, { c?: string[] }> }).result;
        const ticker = result ? Object.values(result)[0] : undefined;
        return Number(ticker?.c?.[0]);
      }
    }
  ];

  for (const source of sources) {
    const price = await fetchPrice(source.url, source.readPrice);
    if (price !== undefined) {
      cachedEthUsd = { price, expiresAt: Date.now() + 60_000 };
      return price;
    }
  }
  return undefined;
}

function formatEth(value: number): string {
  if (!Number.isFinite(value)) return '0.0000';
  return value.toFixed(4);
}

export async function formatEthUsd(ethValue: string | number): Promise<string> {
  const eth = typeof ethValue === 'number' ? ethValue : Number.parseFloat(ethValue);
  const ethDisplay = `${formatEth(eth)} ETH`;
  const usd = await getEthUsdPrice();
  return usd ? `${ethDisplay} (~$${(eth * usd).toFixed(2)})` : `${ethDisplay} (USD unavailable)`;
}

export async function formatWeiEthUsd(wei: bigint): Promise<string> {
  return formatEthUsd(Number(wei) / 1e18);
}

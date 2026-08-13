import { DEFAULT_CATE_MINT } from "@/lib/cate-links";

const PAIR =
  "https://api.dexscreener.com/latest/dex/pairs/solana/hmzvseemtzhhvznw9uwbag85hctmfnkbhzux16cy7ca3";

export type CateTape = {
  usd: number;
  change24h: number;
  ts: number;
  pairUrl: string;
};

let cache: { tape: CateTape; at: number } | null = null;
const TTL_MS = 15_000;

export async function fetchCateTape(
  fetchImpl: typeof fetch = fetch,
): Promise<CateTape> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.tape;

  const res = await fetchImpl(PAIR, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("price feed unavailable");
  const data = (await res.json()) as {
    pair?: { priceUsd?: string; priceChange?: { h24?: number }; url?: string };
  };
  const usd = Number(data.pair?.priceUsd);
  const change24h = Number(data.pair?.priceChange?.h24 ?? 0);
  if (!Number.isFinite(usd) || usd <= 0) throw new Error("price feed empty");

  const tape: CateTape = {
    usd,
    change24h,
    ts: now,
    pairUrl:
      data.pair?.url ??
      `https://dexscreener.com/solana/${DEFAULT_CATE_MINT}`,
  };
  cache = { tape, at: now };
  return tape;
}

export type VaultCall = "skip" | "buy" | "big";

export function vaultOutcomeFromChange(change24h: number): VaultCall {
  if (change24h >= 5) return "big";
  if (change24h > 0) return "buy";
  return "skip";
}

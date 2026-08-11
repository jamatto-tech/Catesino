/**
 * Official $CATE destinations — pure / deterministic for SSR + client hydration.
 * Do NOT call loadConfig(process.env) from Client Components (env differs → hydration mismatch).
 */
import type { AppConfig } from "@catesino/config";

/** Matches @catesino/config schema default for CATE_MINT */
export const DEFAULT_CATE_MINT =
  "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump";

export type CateLinks = {
  mint: string;
  brand: string;
  dexscreener: string;
  solscan: string;
  buy: {
    pumpfun: string;
    fomo: string;
    moonshot: string;
  };
  social: {
    x: string;
    telegram: string;
  };
};

export function buildCateLinks(mint: string = DEFAULT_CATE_MINT): CateLinks {
  return {
    mint,
    brand: "https://cate.meme/",
    dexscreener:
      "https://dexscreener.com/solana/hmzvseemtzhhvznw9uwbag85hctmfnkbhzux16cy7ca3",
    solscan: `https://solscan.io/token/${mint}`,
    buy: {
      pumpfun: `https://pump.fun/coin/${mint}`,
      fomo: `https://fomo.family/tokens/solana/${mint}`,
      moonshot: "https://moonshot.com/CATE?ref=BB3TUm",
    },
    social: {
      x: "https://x.com/CateonSol_",
      telegram: "https://t.me/catecoin_telegram",
    },
  };
}

/**
 * Safe on server and client (same output every time unless config is passed).
 * Client Components must call with no args (or an explicit mint snapshot from props).
 */
export function getCateLinks(config?: Pick<AppConfig, "mints">): CateLinks {
  return buildCateLinks(config?.mints.cate ?? DEFAULT_CATE_MINT);
}

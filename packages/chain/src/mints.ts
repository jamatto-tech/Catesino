import type { AppConfig } from "@catesino/config";
import { loadConfig } from "@catesino/config";

/**
 * Chain constants derived from central config — no product mint literals here.
 */
export type ChainContext = {
  cluster: AppConfig["cluster"];
  usdcMint: string;
  cateMint: string;
  usdcDecimals: number;
  allowedUsdcMints: readonly string[];
};

export function createChainContext(
  config: AppConfig = loadConfig(),
): ChainContext {
  return {
    cluster: config.cluster,
    usdcMint: config.mints.usdc,
    cateMint: config.mints.cate,
    usdcDecimals: config.usdcDecimals,
    allowedUsdcMints: [config.mints.usdcMainnet, config.mints.usdcDevnet],
  };
}

export function isAllowlistedUsdcMint(
  mint: string,
  ctx: ChainContext = createChainContext(),
): boolean {
  return ctx.allowedUsdcMints.includes(mint);
}

export function assertAllowlistedUsdcMint(
  mint: string,
  ctx: ChainContext = createChainContext(),
): void {
  if (!isAllowlistedUsdcMint(mint, ctx)) {
    throw new Error(`Rejected non-allowlisted USDC mint: ${mint}`);
  }
}

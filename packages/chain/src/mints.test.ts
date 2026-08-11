import { describe, expect, it } from "vitest";
import { loadConfig } from "@catesino/config";
import {
  assertAllowlistedUsdcMint,
  createChainContext,
  isAllowlistedUsdcMint,
} from "./mints.js";

describe("chain mints", () => {
  it("uses config mints — not embedded product strings in engine callers", () => {
    const cfg = loadConfig({
      SOLANA_CLUSTER: "devnet",
      CATE_MINT: "CateMintForTest11111111111111111111111111111",
      USDC_MINT_DEVNET: "UsdcDevnetTest1111111111111111111111111111",
    });
    const ctx = createChainContext(cfg);
    expect(ctx.cateMint).toBe(cfg.mints.cate);
    expect(ctx.usdcMint).toBe(cfg.mints.usdc);
    expect(isAllowlistedUsdcMint(cfg.mints.usdcDevnet, ctx)).toBe(true);
    expect(isAllowlistedUsdcMint("RandomMint1111111111111111111111111111111", ctx)).toBe(
      false,
    );
    expect(() =>
      assertAllowlistedUsdcMint("RandomMint1111111111111111111111111111111", ctx),
    ).toThrow(/allowlisted/);
  });
});

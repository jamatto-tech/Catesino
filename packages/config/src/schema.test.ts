import { describe, expect, it } from "vitest";
import { isBetWithinLimits, loadConfig, usdcToAtomic } from "./schema.js";

describe("loadConfig", () => {
  it("loads defaults without process env", () => {
    const cfg = loadConfig({});
    expect(cfg.cluster).toBe("devnet");
    expect(cfg.mints.usdc).toBe(cfg.mints.usdcDevnet);
    expect(cfg.mints.cate.length).toBeGreaterThan(30);
    expect(cfg.betLimits.minUsdc).toBe(0.5);
    expect(cfg.betLimits.maxUsdc).toBe(25);
    expect(cfg.buyPolicy.buyRatio).toBe(0.7);
    expect(cfg.flags.publicMainnetFunds).toBe(false);
  });

  it("selects mainnet USDC mint from cluster", () => {
    const cfg = loadConfig({
      SOLANA_CLUSTER: "mainnet-beta",
      USDC_MINT_MAINNET: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    });
    expect(cfg.mints.usdc).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });

  it("parses geo deny list and flags", () => {
    const cfg = loadConfig({
      GEO_DENY_LIST: "kp, ir ",
      FF_BLACKJACK_ENABLED: "true",
      FF_MARKETING_THESIS_CLAIMS: "0",
    });
    expect(cfg.compliance.geoDenyList).toEqual(["KP", "IR"]);
    expect(cfg.flags.blackjackEnabled).toBe(true);
    expect(cfg.flags.marketingThesisClaims).toBe(false);
  });

  it("converts USDC human to atomic for bet limits", () => {
    const cfg = loadConfig({ BET_MIN_USDC: "1", BET_MAX_USDC: "10" });
    expect(cfg.betLimits.minAtomic).toBe(usdcToAtomic(1));
    expect(isBetWithinLimits(usdcToAtomic(5), cfg.betLimits)).toBe(true);
    expect(isBetWithinLimits(usdcToAtomic(0.1), cfg.betLimits)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  assertGachaNftAllowed,
  assertGachaPaidAllowed,
  cateToAtomic,
  isBetWithinLimits,
  loadConfig,
  usdcToAtomic,
  USDC_DECIMALS,
} from "./schema.js";

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

  it("defaults custody flags off and loads deposit/withdraw policy", () => {
    const cfg = loadConfig({});
    expect(cfg.flags.depositsUsdc).toBe(false);
    expect(cfg.flags.withdrawals).toBe(false);
    expect(cfg.custody.minDepositUsdc).toBe(1);
    expect(cfg.custody.minConfirmations).toBe(32);
    expect(cfg.custody.withdrawFirstCooldownHours).toBe(24);
    expect(cfg.custody.withdrawDualApproveThresholdUsdc).toBe(500);
  });

  it("rejects inverted withdraw dual-approve threshold", () => {
    expect(() =>
      loadConfig({
        WITHDRAW_MANUAL_THRESHOLD_USDC: "500",
        WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC: "100",
      }),
    ).toThrow(/DUAL_APPROVE/);
  });

  it("defaults gacha A on and B/C flags off", () => {
    const cfg = loadConfig({});
    expect(cfg.flags.gachaEnabled).toBe(true);
    expect(cfg.flags.gachaCateHolderPull).toBe(false);
    expect(cfg.flags.gachaPaidPulls).toBe(false);
    expect(cfg.flags.gachaNftPrizes).toBe(false);
    expect(cfg.mints.cateDecimals).toBe(6);
    expect(cfg.gacha.holderMinHuman).toBe(100_000);
    expect(cfg.gacha.holderMinAtomic).toBe(cateToAtomic(100_000, 6));
    expect(cfg.gacha.paidPullUsdc).toBe(2);
    expect(cfg.gacha.pityRareHard).toBe(100);
    expect(cfg.gacha.yarnStart).toBe(5);
    expect(cfg.gacha.yarnCap).toBe(20);
    expect(cfg.gacha.yarnFaucetDaily).toBe(1);
  });
});

describe("cateToAtomic", () => {
  it("does not use USDC_DECIMALS — 9-decimal 1.0 is 1e9", () => {
    expect(USDC_DECIMALS).toBe(6);
    expect(cateToAtomic(1, 9)).toBe(1_000_000_000n);
    expect(cateToAtomic(1, 9)).not.toBe(usdcToAtomic(1));
    expect(cateToAtomic(100_000, 6)).toBe(100_000_000_000n);
  });
});

describe("gacha gates", () => {
  it("paid-pull gate throws without depositsUsdc", () => {
    const cfg = loadConfig({
      FF_GACHA_PAID_PULLS: "true",
      FF_DEPOSITS_USDC: "false",
    });
    expect(() => assertGachaPaidAllowed(cfg)).toThrow(/FF_DEPOSITS_USDC/);
  });

  it("paid-pull gate throws without publicMainnetFunds on mainnet-beta", () => {
    const cfg = loadConfig({
      SOLANA_CLUSTER: "mainnet-beta",
      FF_GACHA_PAID_PULLS: "true",
      FF_DEPOSITS_USDC: "true",
      FF_PUBLIC_MAINNET_FUNDS: "false",
    });
    expect(() => assertGachaPaidAllowed(cfg)).toThrow(/FF_PUBLIC_MAINNET_FUNDS/);
  });

  it("NFT gate throws without gachaNftPrizes", () => {
    const cfg = loadConfig({});
    expect(() => assertGachaNftAllowed(cfg)).toThrow(/FF_GACHA_NFT_PRIZES/);
  });

  it("NFT gate does not require deposits or paid pulls", () => {
    const cfg = loadConfig({
      FF_GACHA_NFT_PRIZES: "true",
      FF_DEPOSITS_USDC: "false",
      FF_GACHA_PAID_PULLS: "false",
    });
    expect(cfg.flags.depositsUsdc).toBe(false);
    expect(cfg.flags.gachaPaidPulls).toBe(false);
    expect(() => assertGachaNftAllowed(cfg)).not.toThrow();
  });
});

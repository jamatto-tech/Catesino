import { describe, expect, it } from "vitest";
import {
  NFT_CLAIM_HOLD_DAYS,
  NFT_DIAMOND_BAGWORK,
  NFT_DIAMOND_HOLD_DAYS,
  canClaimRareOrUltra,
  canCutUltraDiamond,
  cutUltraDiamond,
  holdDaysElapsed,
  markUltraGold,
  nftProgress,
} from "./nft-rules.js";

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 7, 13);

describe("hold clock", () => {
  it("is zero until a start stamp exists", () => {
    expect(holdDaysElapsed(null, T0)).toBe(0);
    expect(holdDaysElapsed(T0 + DAY, T0)).toBe(0);
  });

  it("counts whole days held", () => {
    expect(holdDaysElapsed(T0, T0 + 29 * DAY + DAY - 1)).toBe(29);
    expect(holdDaysElapsed(T0, T0 + 30 * DAY)).toBe(30);
  });
});

describe("claim and diamond gates", () => {
  it("locks rare/ultra until day 30", () => {
    expect(canClaimRareOrUltra(29)).toBe(false);
    expect(canClaimRareOrUltra(NFT_CLAIM_HOLD_DAYS)).toBe(true);
  });

  it("needs both a longer hold and bagwork to cut diamond", () => {
    expect(canCutUltraDiamond(89, 99)).toBe(false);
    expect(canCutUltraDiamond(90, 14)).toBe(false);
    expect(
      canCutUltraDiamond(NFT_DIAMOND_HOLD_DAYS, NFT_DIAMOND_BAGWORK),
    ).toBe(true);
  });

  it("summarizes progress", () => {
    const p = nftProgress({
      holdStartedAt: T0,
      bagworkCount: 4,
      nowMs: T0 + 40 * DAY,
    });
    expect(p.holdDays).toBe(40);
    expect(p.canClaim).toBe(true);
    expect(p.canCutDiamond).toBe(false);
    expect(p.diamondNeedPosts).toBe(15);
  });
});

describe("marks", () => {
  it("marks gold then cuts diamond", () => {
    const gold = markUltraGold([], "nft.pfp-crown", T0);
    expect(gold[0]?.tier).toBe("gold");
    const diamond = cutUltraDiamond(gold, "nft.pfp-crown", T0 + DAY);
    expect(diamond[0]?.tier).toBe("diamond");
    expect(diamond[0]?.upgradedAt).toBe(T0 + DAY);
  });

  it("refuses a second mark or a double cut", () => {
    const gold = markUltraGold([], "nft.pfp-crown", T0);
    expect(() => markUltraGold(gold, "nft.pfp-crown", T0)).toThrow(/already marked/);
    const diamond = cutUltraDiamond(gold, "nft.pfp-crown", T0);
    expect(() => cutUltraDiamond(diamond, "nft.pfp-crown", T0)).toThrow(
      /already diamond/,
    );
  });
});

import { describe, expect, it } from "vitest";
import { CATALOG_V1_ITEMS, type CookieReceipt } from "@catesino/gacha";
import {
  applyBagworkGrant,
  applyYarnFaucet,
  emptyDemoGachaState,
  sealGachaState,
  unsealGachaState,
  type DemoGachaState,
} from "./demo-gacha-session";

const SECRET = "gacha-test-secret";
const POLICY = { yarnStart: 5, yarnFaucetDaily: 1, yarnCap: 20 };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function worstReceipt(): CookieReceipt {
  return {
    pullId: "aa".repeat(16),
    oddsTableId: "catesino-machine-odds-v1",
    catalogId: "catesino-machine-catalog-v1",
    rarity: "rare",
    itemId: "frame.ninth-life",
    pityRareHard: 80,
    pullsSinceRarePlusBefore: 80,
    pityApplied: true,
    rawBucket: 1234,
    inSupplyHash: "bb".repeat(32),
    convertedToYarn: false,
    yarnAfter: 21,
    serverSeedCommit: "cc".repeat(32),
    clientSeed: "x".repeat(64),
    nonce: 999,
    identityKind: "demo",
  };
}

function stuffedLocker(nowMs: number): DemoGachaState {
  return {
    ...emptyDemoGachaState(POLICY, nowMs),
    yarn: 25,
    nonce: 40,
    pullsSinceRarePlus: 12,
    inventory: CATALOG_V1_ITEMS.map((item) => ({
      itemId: item.id,
      count: item.stackCap,
    })),
    equipped: {
      frame: "frame.ninth-life",
      title: "title.holder-in-spirit",
      lobbyFlair: "flair.paw-print",
    },
    lastReceipt: worstReceipt(),
  };
}

describe("sealGachaState / unsealGachaState", () => {
  it("round-trips a locker", () => {
    const now = 1_700_000_000_000;
    const state = emptyDemoGachaState(POLICY, now);
    const token = sealGachaState(state, SECRET, now);
    const out = unsealGachaState(token, SECRET, now);
    expect(out).toEqual(state);
  });

  it("rejects a tampered token as an empty locker (null)", () => {
    const token = sealGachaState(emptyDemoGachaState(POLICY), SECRET);
    expect(unsealGachaState(token.slice(0, -4) + "xxxx", SECRET)).toBeNull();
  });

  it("still unseals a 25h-old token (not SIWS 24h idle)", () => {
    const now = 1_700_000_000_000;
    const token = sealGachaState(emptyDemoGachaState(POLICY, now), SECRET, now);
    expect(unsealGachaState(token, SECRET, now + 25 * HOUR)?.yarn).toBe(5);
    expect(
      unsealGachaState(token, SECRET, now + 181 * DAY),
    ).toBeNull();
  });

  it("keeps the sealed token under 3500 bytes in the worst Phase A case", () => {
    const now = 1_700_000_000_000;
    const token = sealGachaState(stuffedLocker(now), SECRET, now);
    expect(token.length).toBeLessThan(3500);
    const receipt = unsealGachaState(token, SECRET, now)?.lastReceipt;
    expect(receipt && "serverSeed" in receipt).toBe(false);
  });
});

describe("applyYarnFaucet", () => {
  it("never auto-grants — daily yarn is bagwork-gated", () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0);
    const fresh = emptyDemoGachaState(POLICY, now);
    expect(applyYarnFaucet(fresh, POLICY, now + DAY).granted).toBe(0);
    expect(applyYarnFaucet(fresh, POLICY, now + DAY).state.yarn).toBe(5);
  });
});

describe("applyBagworkGrant", () => {
  it("grants today's yarn once per UTC day and rejects reuse", () => {
    const now = Date.UTC(2026, 7, 13, 12, 0, 0);
    const fresh = emptyDemoGachaState(POLICY, now);
    const first = applyBagworkGrant(fresh, POLICY, "111", now);
    expect(first.granted).toBe(1);
    expect(first.state.yarn).toBe(6);
    expect(() => applyBagworkGrant(first.state, POLICY, "222", now)).toThrow(
      /already unlocked/,
    );
    expect(() =>
      applyBagworkGrant(first.state, POLICY, "111", now + DAY),
    ).toThrow(/already used/);
    const nextDay = applyBagworkGrant(first.state, POLICY, "333", now + DAY);
    expect(nextDay.granted).toBe(1);
    expect(nextDay.state.yarn).toBe(7);
    expect(first.state.holdStartedAt).toBe(now);
    expect(nextDay.state.holdStartedAt).toBe(now);
    expect(nextDay.state.bagworkCount).toBe(2);
  });
});

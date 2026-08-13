import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { applyEconomy } from "./apply.js";
import {
  catalogHolderV1,
  catalogV1,
  inSupplyItems,
  itemById,
} from "./catalog.js";
import {
  ODDS_TABLE_V2,
  formatPublicOdds,
  rarityFromBucket,
} from "./odds.js";
import { PITY_RARE_HARD } from "./pity.js";
import { rollPull } from "./pull.js";
import { commitSeed, hmacIndex, seedToKey } from "./rng.js";
import { verifyPull } from "./verify.js";

const GOLDEN_SEED = "ab".repeat(32);
const GOLDEN_CLIENT = "yarn";

describe("rollPull", () => {
  it("is deterministic for a fixed seed and uses the Buffer HMAC key", () => {
    const catalog = catalogV1();
    const a = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 0,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: 0,
    });
    const b = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 0,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: 0,
    });
    expect(a).toEqual(b);
    expect(a.serverSeedCommit).toBe(commitSeed(GOLDEN_SEED));

    const key = seedToKey(GOLDEN_SEED);
    const expectedBucket = hmacIndex(key, GOLDEN_CLIENT, 0, "rarity", 10_000);
    expect(a.rawBucket).toBe(expectedBucket);

    // Hex-string-as-key would silently desync — prove we did not.
    const hexKeyDigest = createHmac("sha256", GOLDEN_SEED)
      .update(`${GOLDEN_CLIENT}:0:rarity:0`)
      .digest();
    const bufferKeyDigest = createHmac("sha256", key)
      .update(`${GOLDEN_CLIENT}:0:rarity:0`)
      .digest();
    expect(hexKeyDigest.equals(bufferKeyDigest)).toBe(false);
  });

  it("maps published v2 buckets: 88% common, 11% uncommon, 0.90% rare, 0.10% ultra", () => {
    expect(rarityFromBucket(0, ODDS_TABLE_V2)).toBe("common");
    expect(rarityFromBucket(8799, ODDS_TABLE_V2)).toBe("common");
    expect(rarityFromBucket(8800, ODDS_TABLE_V2)).toBe("uncommon");
    expect(rarityFromBucket(9899, ODDS_TABLE_V2)).toBe("uncommon");
    expect(rarityFromBucket(9900, ODDS_TABLE_V2)).toBe("rare");
    expect(rarityFromBucket(9989, ODDS_TABLE_V2)).toBe("rare");
    expect(rarityFromBucket(9990, ODDS_TABLE_V2)).toBe("ultra");
    expect(rarityFromBucket(9999, ODDS_TABLE_V2)).toBe("ultra");
  });

  it("falls Ultra weight back to Rare when the catalog has no Ultra items", () => {
    const catalog = catalogV1();
    expect(inSupplyItems(catalog, "ultra")).toHaveLength(0);
    expect(inSupplyItems(catalog, "rare").map((i) => i.id)).toEqual([
      "frame.ninth-life",
    ]);

    const ultra = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 0,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: nonceForBucket(9990, 9999),
    });
    expect(ultra.rawBucket).toBeGreaterThanOrEqual(9990);
    expect(ultra.rarity).toBe("rare");
    expect(ultra.itemId).toBe("frame.ninth-life");
    expect(ultra.pityApplied).toBe(false);
  });

  it("forces Rare on pull 101 after 100 non-Rare+ pulls", () => {
    const catalog = catalogV1();
    const forced = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 100,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: nonceForBucket(0, 8799),
    });
    expect(forced.rawBucket).toBeLessThan(8800);
    expect(forced.pityApplied).toBe(true);
    expect(forced.rarity).toBe("rare");
    expect(forced.itemId).toBe("frame.ninth-life");
    expect(forced.pullsSinceRarePlusAfter).toBe(0);
  });

  it("does not apply pity on the holder catalog (no Rare items)", () => {
    const catalog = catalogHolderV1();
    const r = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 80,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: 0,
    });
    expect(r.pityApplied).toBe(false);
    expect(r.rarity === "rare" || r.rarity === "ultra").toBe(false);
  });

  it("lands near published weights over 100k pulls (pity off)", () => {
    const catalog = catalogV1();
    const counts = { common: 0, uncommon: 0, rare: 0, ultra: 0 };
    const n = 100_000;
    for (let nonce = 0; nonce < n; nonce++) {
      const r = rollPull({
        catalog,
        pullsSinceRarePlusBefore: 0,
        pityRareHard: 1_000_000,
        serverSeed: GOLDEN_SEED,
        clientSeed: "freq",
        nonce,
      });
      counts[r.rarity] += 1;
    }
    expect(counts.ultra).toBe(0);
    // Common 88%, uncommon 11%, rare 1.00% (0.90 + 0.10 ultra fallback).
    expect(counts.common / n).toBeGreaterThan(0.87);
    expect(counts.common / n).toBeLessThan(0.89);
    expect(counts.uncommon / n).toBeGreaterThan(0.10);
    expect(counts.uncommon / n).toBeLessThan(0.12);
    expect(counts.rare / n).toBeGreaterThan(0.007);
    expect(counts.rare / n).toBeLessThan(0.013);
  });
});

describe("applyEconomy", () => {
  it("adds yarnGrant for yarn_dust after the caller already spent 1", () => {
    const catalog = catalogV1();
    const item = itemById(catalog, "yarn.ball.x2");
    if (!item) throw new Error("missing yarn.ball.x2");
    const out = applyEconomy({
      yarn: 4,
      inventoryCounts: {},
      item,
    });
    expect(out.yarn).toBe(6);
    expect(out.inventoryCounts["yarn.ball.x2"]).toBe(1);
    expect(out.convertedToYarn).toBe(false);
  });

  it("converts overflow at stackCap to +1 Yarn and leaves count unchanged", () => {
    const catalog = catalogV1();
    const item = itemById(catalog, "frame.cardboard.01");
    if (!item) throw new Error("missing frame");
    const out = applyEconomy({
      yarn: 3,
      inventoryCounts: { "frame.cardboard.01": item.stackCap },
      item,
    });
    expect(out.yarn).toBe(4);
    expect(out.inventoryCounts["frame.cardboard.01"]).toBe(item.stackCap);
    expect(out.convertedToYarn).toBe(true);
  });
});

describe("verifyPull", () => {
  it("derives pity and accepts a matching receipt", () => {
    const catalog = catalogV1();
    const rolled = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 100,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: nonceForBucket(0, 8799),
    });
    const ok = verifyPull(
      {
        serverSeed: rolled.serverSeed,
        clientSeed: rolled.clientSeed,
        nonce: rolled.nonce,
        oddsTableId: rolled.oddsTableId,
        catalogId: rolled.catalogId,
        rarity: rolled.rarity,
        itemId: rolled.itemId,
        rawBucket: rolled.rawBucket,
        pityRareHard: rolled.pityRareHard,
        pullsSinceRarePlusBefore: rolled.pullsSinceRarePlusBefore,
        inSupplyHash: rolled.inSupplyHash,
      },
      catalog,
    );
    expect(ok).toEqual({ ok: true });
    expect(rolled.pityApplied).toBe(true);
  });

  it("rejects a tampered rarity", () => {
    const catalog = catalogV1();
    const rolled = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 0,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: 1,
    });
    const bad = verifyPull(
      {
        serverSeed: rolled.serverSeed,
        clientSeed: rolled.clientSeed,
        nonce: rolled.nonce,
        oddsTableId: rolled.oddsTableId,
        catalogId: rolled.catalogId,
        rarity: rolled.rarity === "common" ? "rare" : "common",
        itemId: rolled.itemId,
        rawBucket: rolled.rawBucket,
        pityRareHard: rolled.pityRareHard,
        pullsSinceRarePlusBefore: rolled.pullsSinceRarePlusBefore,
        inSupplyHash: rolled.inSupplyHash,
      },
      catalog,
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/rarity/);
  });

  it("rejects a tampered inSupplyHash", () => {
    const catalog = catalogV1();
    const rolled = rollPull({
      catalog,
      pullsSinceRarePlusBefore: 0,
      pityRareHard: PITY_RARE_HARD,
      serverSeed: GOLDEN_SEED,
      clientSeed: GOLDEN_CLIENT,
      nonce: 2,
    });
    const bad = verifyPull(
      {
        serverSeed: rolled.serverSeed,
        clientSeed: rolled.clientSeed,
        nonce: rolled.nonce,
        oddsTableId: rolled.oddsTableId,
        catalogId: rolled.catalogId,
        rarity: rolled.rarity,
        itemId: rolled.itemId,
        rawBucket: rolled.rawBucket,
        pityRareHard: rolled.pityRareHard,
        pullsSinceRarePlusBefore: rolled.pullsSinceRarePlusBefore,
        inSupplyHash: "00".repeat(32),
      },
      catalog,
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toMatch(/inSupplyHash/);
  });
});

describe("formatPublicOdds", () => {
  it("prints Ultra fallback and a pity banner when live threshold differs", () => {
    const pub = formatPublicOdds(ODDS_TABLE_V2, 90);
    expect(pub.pityBanner).toBe(true);
    expect(pub.pityRareHardLive).toBe(90);
    const ultra = pub.rows.find((r) => r.rarity === "ultra");
    expect(ultra?.note).toMatch(/fallback to Rare/i);
  });
});

/** Find a nonce whose rarity lane lands in [lo, hi] inclusive. */
function nonceForBucket(lo: number, hi: number): number {
  const key = seedToKey(GOLDEN_SEED);
  for (let nonce = 0; nonce < 20_000; nonce++) {
    const n = hmacIndex(key, GOLDEN_CLIENT, nonce, "rarity", 10_000);
    if (n >= lo && n <= hi) return nonce;
  }
  throw new Error(`no nonce in bucket ${lo}-${hi}`);
}

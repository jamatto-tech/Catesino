import { rollPull } from "./pull.js";
import type { CatalogState, VerifyPullInput, VerifyPullResult } from "./types.js";

/**
 * Replays the pull. Derives pityApplied. Does not trust a client pity flag.
 */
export function verifyPull(
  receipt: VerifyPullInput,
  catalogAtVersion: CatalogState,
): VerifyPullResult {
  if (receipt.oddsTableId !== catalogAtVersion.oddsTableId) {
    return { ok: false, reason: "oddsTableId mismatch" };
  }
  if (receipt.catalogId !== catalogAtVersion.catalogId) {
    return { ok: false, reason: "catalogId mismatch" };
  }

  let replayed;
  try {
    replayed = rollPull({
      catalog: catalogAtVersion,
      pullsSinceRarePlusBefore: receipt.pullsSinceRarePlusBefore,
      pityRareHard: receipt.pityRareHard,
      serverSeed: receipt.serverSeed,
      clientSeed: receipt.clientSeed,
      nonce: receipt.nonce,
    });
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  if (replayed.rawBucket !== receipt.rawBucket) {
    return { ok: false, reason: "rawBucket mismatch" };
  }
  if (replayed.rarity !== receipt.rarity) {
    return { ok: false, reason: "rarity mismatch" };
  }
  if (replayed.itemId !== receipt.itemId) {
    return { ok: false, reason: "itemId mismatch" };
  }
  if (replayed.inSupplyHash !== receipt.inSupplyHash) {
    return { ok: false, reason: "inSupplyHash mismatch" };
  }
  return { ok: true };
}

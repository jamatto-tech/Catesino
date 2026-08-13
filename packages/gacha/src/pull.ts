import {
  applyRarityFallback,
  inSupplyHash,
  inSupplyItems,
} from "./catalog.js";
import { oddsTableById, rarityFromBucket } from "./odds.js";
import { nextPityCounter, shouldApplyPity } from "./pity.js";
import {
  commitSeed,
  freshServerSeed,
  hmacIndex,
  seedToKey,
} from "./rng.js";
import type { RollPullInput, RollPullResult } from "./types.js";

const DEFAULT_CLIENT_SEED = "yarn";
const MAX_CLIENT_SEED = 64;

export function rollPull(input: RollPullInput): RollPullResult {
  const clientSeed = normalizeClientSeed(input.clientSeed);
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const key = seedToKey(serverSeed);
  const table = oddsTableById(input.catalog.oddsTableId);

  const rawBucket = hmacIndex(
    key,
    clientSeed,
    input.nonce,
    "rarity",
    table.totalWeight,
  );
  const tableRarity = rarityFromBucket(rawBucket, table);
  const rawRarity = applyRarityFallback(tableRarity, input.catalog);

  const rareInSupply = inSupplyItems(input.catalog, "rare").length > 0;
  const pityApplied = shouldApplyPity(
    input.pullsSinceRarePlusBefore,
    rawRarity,
    input.pityRareHard,
    rareInSupply,
  );
  const rarity = pityApplied ? "rare" : rawRarity;
  const finalRarity = applyRarityFallback(rarity, input.catalog);

  const inSupply = inSupplyItems(input.catalog, finalRarity);
  if (inSupply.length === 0) {
    throw new Error(`no in-supply items for rarity ${finalRarity}`);
  }
  const inSupplyIds = inSupply.map((item) => item.id);
  const itemIndex = hmacIndex(
    key,
    clientSeed,
    input.nonce,
    "item",
    inSupply.length,
  );
  const itemId = inSupplyIds[itemIndex];

  return {
    rarity: finalRarity,
    itemId,
    rawBucket,
    pityApplied,
    pullsSinceRarePlusAfter: nextPityCounter(
      input.pullsSinceRarePlusBefore,
      finalRarity,
    ),
    inSupplyHash: inSupplyHash(inSupplyIds),
    inSupplyIds: [...inSupplyIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    serverSeed,
    serverSeedCommit: commitSeed(serverSeed),
    clientSeed,
    nonce: input.nonce,
    oddsTableId: input.catalog.oddsTableId,
    catalogId: input.catalog.catalogId,
    pityRareHard: input.pityRareHard,
    pullsSinceRarePlusBefore: input.pullsSinceRarePlusBefore,
  };
}

function normalizeClientSeed(raw: string | undefined): string {
  const seed = raw && raw.length > 0 ? raw : DEFAULT_CLIENT_SEED;
  if (seed.length > MAX_CLIENT_SEED) {
    throw new Error(`clientSeed must be <= ${MAX_CLIENT_SEED} chars`);
  }
  return seed;
}

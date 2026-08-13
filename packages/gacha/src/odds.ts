import type { GachaRarity, OddsTable } from "./types.js";
import { PITY_RARE_HARD } from "./pity.js";

export const ODDS_WEIGHT_TOTAL = 10_000;

export const ODDS_TABLE_V1_ID = "catesino-machine-odds-v1";
export const ODDS_TABLE_V2_ID = "catesino-machine-odds-v2";
export const ODDS_TABLE_HOLDER_V1_ID = "catesino-machine-odds-holder-v1";

/** Archived. Kept so old receipts still verify. */
export const ODDS_TABLE_V1: OddsTable = {
  oddsTableId: ODDS_TABLE_V1_ID,
  totalWeight: ODDS_WEIGHT_TOTAL,
  pityRareHardFootnote: 80,
  buckets: [
    { rarity: "common", weight: 8000 },
    { rarity: "uncommon", weight: 1600 },
    { rarity: "rare", weight: 350 },
    { rarity: "ultra", weight: 50 },
  ],
};

/** Live table. Rare 0.90% · Ultra 0.10%. Ultra items are not live — weight falls back to Rare. */
export const ODDS_TABLE_V2: OddsTable = {
  oddsTableId: ODDS_TABLE_V2_ID,
  totalWeight: ODDS_WEIGHT_TOTAL,
  pityRareHardFootnote: PITY_RARE_HARD,
  buckets: [
    { rarity: "common", weight: 8800 },
    { rarity: "uncommon", weight: 1100 },
    { rarity: "rare", weight: 90 },
    { rarity: "ultra", weight: 10 },
  ],
};

/** Phase B holder table. No Rare/Ultra, no pity. */
export const ODDS_TABLE_HOLDER_V1: OddsTable = {
  oddsTableId: ODDS_TABLE_HOLDER_V1_ID,
  totalWeight: ODDS_WEIGHT_TOTAL,
  pityRareHardFootnote: PITY_RARE_HARD,
  buckets: [
    { rarity: "common", weight: 8000 },
    { rarity: "uncommon", weight: 2000 },
  ],
};

const TABLES: Record<string, OddsTable> = {
  [ODDS_TABLE_V1_ID]: ODDS_TABLE_V1,
  [ODDS_TABLE_V2_ID]: ODDS_TABLE_V2,
  [ODDS_TABLE_HOLDER_V1_ID]: ODDS_TABLE_HOLDER_V1,
};

export function oddsTableById(oddsTableId: string): OddsTable {
  const table = TABLES[oddsTableId];
  if (!table) throw new Error(`unknown oddsTableId: ${oddsTableId}`);
  return table;
}

export function rarityFromBucket(bucket: number, table: OddsTable): GachaRarity {
  if (!Number.isInteger(bucket) || bucket < 0 || bucket >= table.totalWeight) {
    throw new Error(`rawBucket out of range: ${bucket}`);
  }
  let acc = 0;
  for (const row of table.buckets) {
    acc += row.weight;
    if (bucket < acc) return row.rarity;
  }
  throw new Error("odds table weights do not cover totalWeight");
}

export type PublicOddsRow = {
  rarity: GachaRarity;
  weight: number;
  percent: string;
  note?: string;
};

export type PublicOdds = {
  oddsTableId: string;
  totalWeight: number;
  rows: PublicOddsRow[];
  pityRareHardFootnote: number;
  pityRareHardLive: number;
  pityBanner: boolean;
};

export function formatPublicOdds(
  table: OddsTable,
  livePityRareHard: number,
  opts?: { ultraFallsBackToRare?: boolean },
): PublicOdds {
  const ultraFallsBackToRare =
    opts?.ultraFallsBackToRare ??
    table.buckets.some((b) => b.rarity === "ultra");
  return {
    oddsTableId: table.oddsTableId,
    totalWeight: table.totalWeight,
    rows: table.buckets.map((b) => ({
      rarity: b.rarity,
      weight: b.weight,
      percent: ((b.weight / table.totalWeight) * 100).toFixed(2) + "%",
      note:
        b.rarity === "ultra" && ultraFallsBackToRare
          ? "No Ultra items in this catalog — published fallback to Rare"
          : undefined,
    })),
    pityRareHardFootnote: table.pityRareHardFootnote,
    pityRareHardLive: livePityRareHard,
    pityBanner: livePityRareHard !== table.pityRareHardFootnote,
  };
}

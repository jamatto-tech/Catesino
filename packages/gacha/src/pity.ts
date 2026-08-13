import type { GachaRarity } from "./types.js";

/** Published hard pity. After 100 non-Rare+ pulls, pull 101 is forced Rare. */
export const PITY_RARE_HARD = 100;

export function isRarePlus(rarity: GachaRarity): boolean {
  return rarity === "rare" || rarity === "ultra";
}

export function shouldApplyPity(
  pullsSinceRarePlusBefore: number,
  rawRarity: GachaRarity,
  pityRareHard: number,
  rareInSupply: boolean,
): boolean {
  if (!rareInSupply) return false;
  if (pityRareHard <= 0) return false;
  return (
    pullsSinceRarePlusBefore >= pityRareHard && !isRarePlus(rawRarity)
  );
}

export function nextPityCounter(
  pullsSinceRarePlusBefore: number,
  finalRarity: GachaRarity,
): number {
  return isRarePlus(finalRarity) ? 0 : pullsSinceRarePlusBefore + 1;
}

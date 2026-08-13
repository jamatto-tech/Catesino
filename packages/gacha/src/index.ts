export type {
  ApplyEconomyInput,
  ApplyEconomyResult,
  CatalogState,
  CookieReceipt,
  CosmeticSlot,
  GachaItem,
  GachaKind,
  GachaRarity,
  OddsBucket,
  OddsTable,
  PullReceipt,
  RollPullInput,
  RollPullResult,
  VerifyPullInput,
  VerifyPullResult,
} from "./types.js";

export {
  CATALOG_HOLDER_V1_ID,
  CATALOG_V1_ID,
  CATALOG_V1_ITEMS,
  applyRarityFallback,
  catalogHolderV1,
  catalogV1,
  inSupplyHash,
  inSupplyItems,
  itemById,
} from "./catalog.js";

export {
  ODDS_TABLE_HOLDER_V1,
  ODDS_TABLE_HOLDER_V1_ID,
  ODDS_TABLE_V1,
  ODDS_TABLE_V1_ID,
  ODDS_TABLE_V2,
  ODDS_TABLE_V2_ID,
  ODDS_WEIGHT_TOTAL,
  formatPublicOdds,
  oddsTableById,
  rarityFromBucket,
  type PublicOdds,
  type PublicOddsRow,
} from "./odds.js";

export {
  PITY_RARE_HARD,
  isRarePlus,
  nextPityCounter,
  shouldApplyPity,
} from "./pity.js";

export { rollPull } from "./pull.js";
export { applyEconomy } from "./apply.js";
export { verifyPull } from "./verify.js";
export {
  NFT_CLAIM_HOLD_DAYS,
  NFT_DIAMOND_BAGWORK,
  NFT_DIAMOND_HOLD_DAYS,
  NFT_MAX_MARKS,
  canClaimRareOrUltra,
  canCutUltraDiamond,
  cutUltraDiamond,
  holdDaysElapsed,
  markUltraGold,
  nftProgress,
  type NftMark,
  type NftProgress,
  type NftTier,
} from "./nft-rules.js";
export {
  commitSeed,
  freshServerSeed,
  hmacIndex,
  seedToKey,
  sha256Hex,
} from "./rng.js";

export type GachaRarity = "common" | "uncommon" | "rare" | "ultra";
export type GachaKind = "cosmetic" | "yarn_dust" | "merch_claim" | "nft";
export type CosmeticSlot = "frame" | "title" | "lobby_flair" | "meme_unlock";

/** Authored catalog + runtime remaining. Engine sees this; host persists remaining only when supplyCap != null (not Phase A). */
export type CatalogState = {
  catalogId: string;
  oddsTableId: string;
  items: GachaItem[];
  /** itemId → remaining. Omitted/ignored when item.supplyCap === null. */
  remaining: Record<string, number>;
};

export type GachaItem = {
  id: string;
  name: string;
  rarity: GachaRarity;
  kind: GachaKind;
  slot?: CosmeticSlot;
  soulbound: boolean;
  tradeable: boolean;
  stackCap: number;
  yarnGrant?: number;
  supplyCap: number | null;
  render: {
    emoji: string;
    cssClass?: string;
    imageSrc?: string;
  };
  copy: string;
  nft?: {
    collectionId: string;
    mint?: string;
    metaplexStandard: "token-metadata";
  };
};

export type PullReceipt = {
  pullId: string;
  oddsTableId: string;
  catalogId: string;
  rarity: GachaRarity;
  itemId: string;
  pityRareHard: number;
  pullsSinceRarePlusBefore: number;
  pityApplied: boolean;
  rawBucket: number;
  inSupplyHash: string;
  convertedToYarn: boolean;
  yarnAfter: number;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  identityKind: "demo" | "wallet";
};

/** Cookie lastReceipt — verify fields only. Omit serverSeed (already on the pull HTTP body). */
export type CookieReceipt = Omit<PullReceipt, "serverSeed">;

export type OddsBucket = {
  rarity: GachaRarity;
  weight: number;
};

export type OddsTable = {
  oddsTableId: string;
  totalWeight: number;
  buckets: readonly OddsBucket[];
  /** Published footnote. Live env may differ; receipts carry the live value. */
  pityRareHardFootnote: number;
};

export type RollPullInput = {
  catalog: CatalogState;
  pullsSinceRarePlusBefore: number;
  pityRareHard: number;
  serverSeed?: string;
  clientSeed?: string;
  nonce: number;
};

export type RollPullResult = {
  rarity: GachaRarity;
  itemId: string;
  rawBucket: number;
  pityApplied: boolean;
  pullsSinceRarePlusAfter: number;
  inSupplyHash: string;
  inSupplyIds: string[];
  serverSeed: string;
  serverSeedCommit: string;
  clientSeed: string;
  nonce: number;
  oddsTableId: string;
  catalogId: string;
  pityRareHard: number;
  pullsSinceRarePlusBefore: number;
};

export type VerifyPullInput = Pick<
  PullReceipt,
  | "serverSeed"
  | "clientSeed"
  | "nonce"
  | "oddsTableId"
  | "catalogId"
  | "rarity"
  | "itemId"
  | "rawBucket"
  | "pityRareHard"
  | "pullsSinceRarePlusBefore"
  | "inSupplyHash"
>;

export type VerifyPullResult = { ok: true } | { ok: false; reason: string };

export type ApplyEconomyInput = {
  yarn: number;
  inventoryCounts: Record<string, number>;
  item: GachaItem;
};

export type ApplyEconomyResult = {
  yarn: number;
  inventoryCounts: Record<string, number>;
  convertedToYarn: boolean;
};

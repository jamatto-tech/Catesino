import type { CatalogState, GachaItem, GachaRarity } from "./types.js";
import {
  ODDS_TABLE_HOLDER_V1_ID,
  ODDS_TABLE_V2_ID,
} from "./odds.js";
import { sha256Hex } from "./rng.js";

export const CATALOG_V1_ID = "catesino-machine-catalog-v1";
export const CATALOG_HOLDER_V1_ID = "catesino-machine-catalog-holder-v1";

const DEFAULT_STACK = 5;

function cosmetic(
  partial: Omit<GachaItem, "kind" | "soulbound" | "tradeable" | "stackCap" | "supplyCap"> & {
    stackCap?: number;
  },
): GachaItem {
  return {
    kind: "cosmetic",
    soulbound: true,
    tradeable: false,
    stackCap: partial.stackCap ?? DEFAULT_STACK,
    supplyCap: null,
    ...partial,
  };
}

/** Phase A authored items. Every row supplyCap: null. No Ultra. */
export const CATALOG_V1_ITEMS: readonly GachaItem[] = [
  cosmetic({
    id: "frame.cardboard.01",
    name: "Cardboard paw",
    rarity: "common",
    slot: "frame",
    render: { emoji: "📦", cssClass: "frame-cardboard" },
    copy: "A box with a hole. Peak cat.",
  }),
  cosmetic({
    id: "frame.yarn.01",
    name: "Yarn ball frame",
    rarity: "common",
    slot: "frame",
    render: { emoji: "🧶", cssClass: "frame-yarn" },
    copy: "It was already unraveling.",
  }),
  cosmetic({
    id: "title.alley-cat",
    name: "alley cat",
    rarity: "common",
    slot: "title",
    render: { emoji: "😼", cssClass: "title-alley-cat" },
    copy: "No penthouse. Still cute.",
  }),
  cosmetic({
    id: "title.fed-the-cat",
    name: "fed the cat",
    rarity: "common",
    slot: "title",
    render: { emoji: "🍽️", cssClass: "title-fed-the-cat" },
    copy: "The only trade that printed.",
  }),
  cosmetic({
    id: "flair.paw-print",
    name: "Paw print",
    rarity: "common",
    slot: "lobby_flair",
    render: { emoji: "🐾", cssClass: "flair-paw" },
    copy: "Tiny mark on the Machine teaser. Not on the casino cards.",
  }),
  cosmetic({
    id: "meme.unlock.believe",
    name: "Believe sticker",
    rarity: "common",
    slot: "meme_unlock",
    render: {
      emoji: "🌄",
      cssClass: "meme-believe",
      imageSrc: "/memes/cate-believe.jpg",
    },
    copy: "Sticker for the locker wall. Off-chain. We don't cash this.",
  }),
  {
    id: "yarn.ball.x2",
    name: "Yarn dust ×2",
    rarity: "uncommon",
    kind: "yarn_dust",
    soulbound: true,
    tradeable: false,
    stackCap: DEFAULT_STACK,
    yarnGrant: 2,
    supplyCap: null,
    render: { emoji: "🧶", cssClass: "yarn-dust" },
    copy: "Spend 1, get 2 back. Net +1 yarn. Not money.",
  },
  cosmetic({
    id: "title.holder-in-spirit",
    name: "holder in spirit",
    rarity: "uncommon",
    slot: "title",
    render: { emoji: "🎖️", cssClass: "title-holder-in-spirit" },
    copy: "Cosmetic stand-in. Real holder badge is Phase B.",
  }),
  cosmetic({
    id: "frame.gold-paw.01",
    name: "Gold paw ring",
    rarity: "uncommon",
    slot: "frame",
    render: { emoji: "🥇", cssClass: "frame-gold-paw" },
    copy: "A gold ring around the cat. Still not an NFT.",
  }),
  {
    id: "merch.sticker-voucher",
    name: "Sticker voucher (pretend)",
    rarity: "uncommon",
    kind: "merch_claim",
    soulbound: true,
    tradeable: false,
    stackCap: DEFAULT_STACK,
    supplyCap: null,
    render: { emoji: "🎟️", cssClass: "merch-sticker-voucher" },
    copy: "Not shipping. This is a pretend voucher.",
  },
  cosmetic({
    id: "frame.ninth-life",
    name: "Ninth life frame",
    rarity: "rare",
    slot: "frame",
    render: {
      emoji: "✨",
      cssClass: "frame-ninth-life",
      imageSrc: "/machine/nfts/ninth-life.jpg",
    },
    copy: "Off-chain. Not an NFT. Not numbered. We don't cash this.",
  }),
];

const HOLDER_EXCLUDE = new Set(["frame.ninth-life", "merch.sticker-voucher"]);

export function catalogV1(): CatalogState {
  return {
    catalogId: CATALOG_V1_ID,
    oddsTableId: ODDS_TABLE_V2_ID,
    items: CATALOG_V1_ITEMS.map((item) => ({ ...item })),
    remaining: {},
  };
}

/** Common + Uncommon badges / titles / frames / yarn_dust only. */
export function catalogHolderV1(): CatalogState {
  return {
    catalogId: CATALOG_HOLDER_V1_ID,
    oddsTableId: ODDS_TABLE_HOLDER_V1_ID,
    items: CATALOG_V1_ITEMS.filter((item) => !HOLDER_EXCLUDE.has(item.id)).map(
      (item) => ({ ...item }),
    ),
    remaining: {},
  };
}

export function itemById(catalog: CatalogState, id: string): GachaItem | undefined {
  return catalog.items.find((item) => item.id === id);
}

export function inSupplyItems(
  catalog: CatalogState,
  rarity: GachaRarity,
): GachaItem[] {
  return catalog.items.filter((item) => {
    if (item.rarity !== rarity) return false;
    if (item.supplyCap === null) return true;
    const rem = catalog.remaining[item.id];
    return rem === undefined || rem > 0;
  });
}

const FALLBACK_ORDER: GachaRarity[] = ["ultra", "rare", "uncommon", "common"];

/** Published fallback: empty rarity rolls down Ultra → Rare → Uncommon → Common. */
export function applyRarityFallback(
  rarity: GachaRarity,
  catalog: CatalogState,
): GachaRarity {
  const start = FALLBACK_ORDER.indexOf(rarity);
  if (start < 0) throw new Error(`unknown rarity: ${rarity}`);
  for (let i = start; i < FALLBACK_ORDER.length; i++) {
    const next = FALLBACK_ORDER[i];
    if (inSupplyItems(catalog, next).length > 0) return next;
  }
  throw new Error("catalog has no in-supply items");
}

export function inSupplyHash(ids: string[]): string {
  const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return sha256Hex(sorted.join(","));
}

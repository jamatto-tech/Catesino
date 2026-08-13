import type { CookieReceipt, CosmeticSlot } from "@catesino/gacha";

export type PublicItem = {
  itemId: string;
  count: number;
  name: string;
  rarity: string;
  kind: string;
  slot?: CosmeticSlot;
  emoji: string;
  cssClass?: string;
  copy: string;
  imageSrc?: string;
  sample?: boolean;
};

export type PublicDropLane = {
  rarity: string;
  percent: string;
  note?: string;
  items: PublicItem[];
};

export type PublicGachaState = {
  mode: "demo";
  yarn: number;
  yarnCap: number;
  pity: {
    pullsSinceRarePlus: number;
    pityRareHard: number;
    untilRare: number;
  };
  equipped: { frame?: string; title?: string; lobbyFlair?: string };
  inventory: PublicItem[];
  lastReceipt: CookieReceipt | null;
  faucet: { lastFaucetUtcDate: string };
  bagwork: { unlockedToday: boolean };
  drops: PublicDropLane[];
};

export function dropKindLabel(item: Pick<PublicItem, "kind" | "slot">): string {
  if (item.kind === "yarn_dust") return "extra yarn";
  if (item.kind === "merch_claim") return "voucher";
  if (item.kind === "nft") return "sample mint";
  if (item.slot === "frame") return "frame";
  if (item.slot === "title") return "title";
  if (item.slot === "lobby_flair") return "lobby mark";
  if (item.slot === "meme_unlock") return "sticker";
  return item.kind;
}

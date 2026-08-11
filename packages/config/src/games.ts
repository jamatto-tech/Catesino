/**
 * Canonical game catalog — every title is Cate-branded.
 * Feature flags gate playability; routes are stable.
 */
export type GameId =
  | "blackcate"
  | "cateflip"
  | "catedice"
  | "catespin"
  | "highcate"
  | "cateslots"
  | "catepoker"
  | "videocate";

export type GameCatalogEntry = {
  id: GameId;
  name: string;
  tagline: string;
  classic: string;
  href: string;
  emoji: string;
  blurb: string;
};

export const GAME_CATALOG: readonly GameCatalogEntry[] = [
  {
    id: "blackcate",
    name: "BlackCate",
    tagline: "The felt favorite",
    classic: "Blackjack",
    href: "/play/blackcate",
    emoji: "🃏",
    blurb: "6-deck S17 · BJ 3:2 · no split",
  },
  {
    id: "cateslots",
    name: "CateSlots",
    tagline: "Three reels of Cate",
    classic: "Slots",
    href: "/play/cateslots",
    emoji: "🎰",
    blurb: "Triple CATE 25× · pairs pay",
  },
  {
    id: "videocate",
    name: "VideoCate",
    tagline: "Hold & draw for $CATE",
    classic: "Video poker",
    href: "/play/videocate",
    emoji: "🖥️",
    blurb: "Jacks-or-Better style · hold/draw",
  },
  {
    id: "catepoker",
    name: "CatePoker",
    tagline: "Five-card stud, instant",
    classic: "5-card stud",
    href: "/play/catepoker",
    emoji: "♠️",
    blurb: "Deal five · stud paytable",
  },
  {
    id: "cateflip",
    name: "CateFlip",
    tagline: "Heads or tails",
    classic: "Coin flip",
    href: "/play/cateflip",
    emoji: "🪙",
    blurb: "Even money · Cate face vs tails",
  },
  {
    id: "catedice",
    name: "CateDice",
    tagline: "Over / under the whisker",
    classic: "Dice",
    href: "/play/catedice",
    emoji: "🎲",
    blurb: "Roll 1–100 · ~1% house edge",
  },
  {
    id: "catespin",
    name: "CateSpin",
    tagline: "Red · black · green zero",
    classic: "Roulette (simple)",
    href: "/play/catespin",
    emoji: "🎡",
    blurb: "Colors pay 2× · green 14×",
  },
  {
    id: "highcate",
    name: "HighCate",
    tagline: "High · low · lucky seven",
    classic: "Craps-lite / dice total",
    href: "/play/highcate",
    emoji: "🐱",
    blurb: "Two dice · seven pays 5×",
  },
] as const;

export function gameById(id: string): GameCatalogEntry | undefined {
  return GAME_CATALOG.find((g) => g.id === id);
}

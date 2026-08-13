export type DeskGameId = "hold" | "desk" | "vault" | "tape";

export type DeskGame = {
  id: DeskGameId;
  name: string;
  tagline: string;
  blurb: string;
  href: string;
  emoji: string;
};

export const DESK_GAMES: readonly DeskGame[] = [
  {
    id: "hold",
    name: "Hold the Line",
    tagline: "Tap the wicks. Ignore the bait.",
    blurb: "A 20-second FUD wave. HOLD on red wicks. Don't tap take-profit.",
    href: "/play/hold",
    emoji: "✊",
  },
  {
    id: "desk",
    name: "The Cate Desk",
    tagline: "Twenty seconds. One chart.",
    blurb: "Paper long or short live $CATE. Ride the tape. Score, not cash.",
    href: "/play/desk",
    emoji: "📉",
  },
  {
    id: "vault",
    name: "Call the Vault",
    tagline: "Seal Cate's day.",
    blurb: "Skip, buy, or big print. One call. Then we crack the 24h seal.",
    href: "/play/vault",
    emoji: "🏦",
  },
  {
    id: "tape",
    name: "Tape Flip",
    tagline: "Call the fake candle.",
    blurb: "Long or short. It prints 50/50. Chase the streak. Not alpha.",
    href: "/play/tape",
    emoji: "📊",
  },
] as const;

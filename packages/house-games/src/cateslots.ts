import type { StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed, rollInt } from "./rng.js";

export type SlotSymbol = "CATE" | "CAT" | "GOLD" | "MOON" | "PAW" | "RUG";

export const SLOT_EMOJI: Record<SlotSymbol, string> = {
  CATE: "🐱",
  CAT: "🐈",
  GOLD: "🪙",
  MOON: "🌙",
  PAW: "🐾",
  RUG: "📉",
};

/** Weighted strip — CATE rarer */
const REEL_STRIP: SlotSymbol[] = [
  "RUG",
  "RUG",
  "RUG",
  "PAW",
  "PAW",
  "PAW",
  "MOON",
  "MOON",
  "GOLD",
  "GOLD",
  "CAT",
  "CAT",
  "CATE",
];

/** Total credit multiple of stake for three-of-a-kind */
const TRIPLE_CREDIT_MULT: Record<SlotSymbol, number> = {
  CATE: 25,
  CAT: 12,
  GOLD: 8,
  MOON: 5,
  PAW: 3,
  RUG: 0,
};

export type CateSlotsResult = {
  gameId: "cateslots";
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  winKind: "triple" | "pair" | "none";
  /** Total credit multiple of stake (0 = lose) */
  creditMult: number;
  won: boolean;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

function spinReel(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  reelIndex: number,
): SlotSymbol {
  const idx = rollInt(
    serverSeed,
    `${clientSeed}:reel:${reelIndex}`,
    nonce,
    REEL_STRIP.length - 1,
  );
  return REEL_STRIP[idx]!;
}

function settlementFromCreditMult(
  betAtomic: bigint,
  creditMult: number,
): StakeLockSettlement {
  if (creditMult <= 0) {
    return {
      outcome: "player_lose",
      betAtomic,
      creditAvailableAtomic: 0n,
      houseEquityDeltaAtomic: betAtomic,
    };
  }
  const credit =
    creditMult === 1.5
      ? (betAtomic * 3n) / 2n
      : betAtomic * BigInt(creditMult);
  const net = credit - betAtomic;
  return {
    outcome: credit > betAtomic ? "player_win" : "push",
    betAtomic,
    creditAvailableAtomic: credit,
    houseEquityDeltaAtomic: -net,
  };
}

export function playCateSlots(input: {
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): CateSlotsResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "cateslots";

  const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [
    spinReel(serverSeed, clientSeed, input.nonce, 0),
    spinReel(serverSeed, clientSeed, input.nonce, 1),
    spinReel(serverSeed, clientSeed, input.nonce, 2),
  ];

  let winKind: CateSlotsResult["winKind"] = "none";
  let creditMult = 0;

  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    winKind = "triple";
    creditMult = TRIPLE_CREDIT_MULT[reels[0]];
  } else if (
    reels[0] === reels[1] &&
    reels[0] !== "RUG" &&
    (reels[0] === "CATE" || reels[0] === "CAT" || reels[0] === "GOLD")
  ) {
    winKind = "pair";
    creditMult = 1.5;
  }

  return {
    gameId: "cateslots",
    reels,
    winKind,
    creditMult,
    won: creditMult > 0,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement: settlementFromCreditMult(input.betAtomic, creditMult),
  };
}

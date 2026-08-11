import type { CardId, Rank, Suit, StakeLockSettlement } from "@catesino/game-protocol";
import { rollInt } from "./rng.js";

const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
];
const SUITS: Suit[] = ["S", "H", "D", "C"];

export function fullDeck(): CardId[] {
  const d: CardId[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      d.push(`${r}${s}` as CardId);
    }
  }
  return d;
}

/** Draw `count` cards without replacement. */
export function drawCards(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  count: number,
  exclude: CardId[] = [],
): CardId[] {
  const pool = fullDeck().filter((c) => !exclude.includes(c));
  const out: CardId[] = [];
  for (let i = 0; i < count; i++) {
    if (pool.length === 0) throw new Error("deck empty");
    const idx = rollInt(
      serverSeed,
      `${clientSeed}:draw:${i}`,
      nonce + i,
      pool.length - 1,
    );
    const [card] = pool.splice(idx, 1);
    out.push(card!);
  }
  return out;
}

export function rankValue(rank: Rank): number {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  if (rank === "T") return 10;
  return Number(rank);
}

export function parseCard(id: CardId): { rank: Rank; suit: Suit } {
  return { rank: id.slice(0, -1) as Rank, suit: id.slice(-1) as Suit };
}

export type PokerHandRank =
  | "royal_flush"
  | "straight_flush"
  | "four_kind"
  | "full_house"
  | "flush"
  | "straight"
  | "three_kind"
  | "two_pair"
  | "jacks_or_better"
  | "high_card";

/**
 * 9/6 Jacks-or-Better style **total credit multiples** of stake
 * (2 = even money, 0 = lose stake).
 */
export const JOB_CREDIT_MULT: Record<PokerHandRank, number> = {
  royal_flush: 250,
  straight_flush: 50,
  four_kind: 25,
  full_house: 9,
  flush: 6,
  straight: 4,
  three_kind: 3,
  two_pair: 2,
  jacks_or_better: 2,
  high_card: 0,
};

/** Slightly leaner stud table (instant 5-card). */
export const STUD_CREDIT_MULT: Record<PokerHandRank, number> = {
  royal_flush: 100,
  straight_flush: 50,
  four_kind: 20,
  full_house: 8,
  flush: 5,
  straight: 4,
  three_kind: 3,
  two_pair: 2,
  jacks_or_better: 2,
  high_card: 0,
};

export function evaluateFive(cards: CardId[]): PokerHandRank {
  if (cards.length !== 5) throw new Error("need 5 cards");
  const parsed = cards.map(parseCard);
  const values = parsed.map((p) => rankValue(p.rank)).sort((a, b) => a - b);
  const suits = parsed.map((p) => p.suit);
  const flush = suits.every((s) => s === suits[0]);

  const uniq = [...new Set(values)];
  let straight = false;
  if (uniq.length === 5) {
    if (values[4]! - values[0]! === 4) straight = true;
    if (values.join(",") === "2,3,4,5,14") straight = true;
  }

  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const byCount = [...counts.entries()].sort(
    (a, b) => b[1]! - a[1]! || b[0]! - a[0]!,
  );
  const c0 = byCount[0]![1];
  const c1 = byCount[1]?.[1] ?? 0;
  const topVal = byCount[0]![0];

  const isRoyal = flush && straight && values[0] === 10 && values[4] === 14;

  if (isRoyal) return "royal_flush";
  if (flush && straight) return "straight_flush";
  if (c0 === 4) return "four_kind";
  if (c0 === 3 && c1 === 2) return "full_house";
  if (flush) return "flush";
  if (straight) return "straight";
  if (c0 === 3) return "three_kind";
  if (c0 === 2 && c1 === 2) return "two_pair";
  if (c0 === 2 && topVal >= 11) return "jacks_or_better";
  return "high_card";
}

export function multToSettlement(
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
  const credit = betAtomic * BigInt(creditMult);
  const net = credit - betAtomic;
  return {
    outcome:
      creditMult > 1 ? "player_win" : creditMult === 1 ? "push" : "player_lose",
    betAtomic,
    creditAvailableAtomic: credit,
    houseEquityDeltaAtomic: -net,
  };
}

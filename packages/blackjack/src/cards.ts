import type { CardId, Rank, Suit } from "@catesino/game-protocol";
import { BLACKJACK_RULES, totalShoeCards } from "./rules.js";

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

export function buildFullMultiset(decks = BLACKJACK_RULES.decks): CardId[] {
  const cards: CardId[] = [];
  for (let d = 0; d < decks; d++) {
    for (const r of RANKS) {
      for (const s of SUITS) {
        cards.push(`${r}${s}` as CardId);
      }
    }
  }
  if (cards.length !== totalShoeCards(decks)) {
    throw new Error("shoe multiset size mismatch");
  }
  return cards;
}

export function parseCard(id: CardId): { rank: Rank; suit: Suit } {
  const rank = id.slice(0, -1) as Rank;
  const suit = id.slice(-1) as Suit;
  return { rank, suit };
}

export function cardValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

export function isTenValue(rank: Rank): boolean {
  return cardValue(rank) === 10;
}

/** Best blackjack total and softness. */
export function handTotal(cards: CardId[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const { rank } = parseCard(c);
    if (rank === "A") {
      aces += 1;
      total += 11;
    } else {
      total += cardValue(rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

export function isBlackjack(cards: CardId[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}

export function isBust(cards: CardId[]): boolean {
  return handTotal(cards).total > 21;
}

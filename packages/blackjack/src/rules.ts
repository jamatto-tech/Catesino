/**
 * Frozen MVP blackjack rules (design). These are game rules, not product env.
 * Product bet min/max live in @catesino/config — never here.
 */
export const BLACKJACK_RULES = {
  decks: 6,
  cardsPerDeck: 52,
  /** Stand on all 17s (including soft 17) */
  dealerS17: true as const,
  blackjackPayoutNumerator: 3,
  blackjackPayoutDenominator: 2,
  allowSplit: false,
  allowInsurance: false,
  allowSurrender: false,
  allowDouble: true,
  dealerPeek: true,
} as const;

export function totalShoeCards(decks = BLACKJACK_RULES.decks): number {
  return decks * BLACKJACK_RULES.cardsPerDeck;
}

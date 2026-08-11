import type { CardId, HandOutcome, StakeLockSettlement } from "@catesino/game-protocol";
import { handTotal, isBlackjack, isBust } from "./cards.js";
import { BLACKJACK_RULES } from "./rules.js";

/**
 * Stake-lock payout model (design normative):
 * - lose/bust/dealer BJ: credit 0, house +bet
 * - push: credit bet, house 0
 * - win 1:1: credit 2*bet, house -bet
 * - BJ 3:2: credit 2.5*bet, house -1.5*bet
 */
export function settlementFromOutcome(
  outcome: HandOutcome,
  betAtomic: bigint,
): StakeLockSettlement {
  if (betAtomic <= 0n) throw new Error("betAtomic must be positive");

  switch (outcome) {
    case "player_lose":
    case "player_bust":
    case "dealer_blackjack":
      return {
        outcome,
        betAtomic,
        creditAvailableAtomic: 0n,
        houseEquityDeltaAtomic: betAtomic,
      };
    case "push":
      return {
        outcome,
        betAtomic,
        creditAvailableAtomic: betAtomic,
        houseEquityDeltaAtomic: 0n,
      };
    case "player_win":
      return {
        outcome,
        betAtomic,
        creditAvailableAtomic: betAtomic * 2n,
        houseEquityDeltaAtomic: -betAtomic,
      };
    case "player_blackjack": {
      const { blackjackPayoutNumerator, blackjackPayoutDenominator } =
        BLACKJACK_RULES;
      const netWin =
        (betAtomic * BigInt(blackjackPayoutNumerator)) /
        BigInt(blackjackPayoutDenominator);
      return {
        outcome,
        betAtomic,
        creditAvailableAtomic: betAtomic + netWin,
        houseEquityDeltaAtomic: -netWin,
      };
    }
    default: {
      const _exhaustive: never = outcome;
      throw new Error(`Unknown outcome: ${_exhaustive}`);
    }
  }
}

export function resolveOutcome(params: {
  playerCards: CardId[];
  dealerCards: CardId[];
  playerBusted?: boolean;
}): HandOutcome {
  if (params.playerBusted || isBust(params.playerCards)) {
    return "player_bust";
  }
  const pBj = isBlackjack(params.playerCards);
  const dBj = isBlackjack(params.dealerCards);
  if (pBj && dBj) return "push";
  if (pBj) return "player_blackjack";
  if (dBj) return "dealer_blackjack";
  if (isBust(params.dealerCards)) return "player_win";
  const pt = handTotal(params.playerCards).total;
  const dt = handTotal(params.dealerCards).total;
  if (pt > dt) return "player_win";
  if (pt < dt) return "player_lose";
  return "push";
}

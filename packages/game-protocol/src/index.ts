/** Shared types for games and ledger — no product constants. */

export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K";

/** Card id e.g. "AS", "TH", "9D" */
export type CardId = `${Rank}${Suit}`;

export type BlackjackAction = "hit" | "stand" | "double";

export type HandOutcome =
  | "player_blackjack"
  | "player_win"
  | "push"
  | "player_lose"
  | "player_bust"
  | "dealer_blackjack";

export type HandPhase =
  | "dealing"
  | "player_turn"
  | "dealer_turn"
  | "settled";

export type StakeLockSettlement = {
  outcome: HandOutcome;
  /** Stake that was locked (atomic USDC) */
  betAtomic: bigint;
  /**
   * Amount credited to available on settle (inclusive of returned stake when applicable).
   * lose/bust/dealer BJ → 0
   * push → bet
   * win 1:1 → 2*bet
   * BJ 3:2 → 2.5*bet
   */
  creditAvailableAtomic: bigint;
  /** Net house equity change in atomic USDC (positive = house gains) */
  houseEquityDeltaAtomic: bigint;
};

export type UserBalance = {
  available: bigint;
  locked: bigint;
};

export function liability(balance: UserBalance): bigint {
  return balance.available + balance.locked;
}

export type GameEngineInfo = {
  gameId: string;
  version: string;
};

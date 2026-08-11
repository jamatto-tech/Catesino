import type { StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed, rollInt } from "./rng.js";

export type DiceMode = "over" | "under";

export type CateDiceResult = {
  gameId: "catedice";
  mode: DiceMode;
  /** Target threshold 2–98 (roll is 1–100) */
  target: number;
  roll: number;
  won: boolean;
  /** Net multiplier on win (e.g. 1.98) for display; payout uses exact fraction */
  multiplier: number;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

/**
 * Instant dice: roll 1–100.
 * Over N wins if roll > N; Under N wins if roll < N.
 * House edge ~1% via payout = (99 / winChance).
 */
export function playCateDice(input: {
  mode: DiceMode;
  target: number;
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): CateDiceResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const target = Math.floor(input.target);
  if (target < 2 || target > 98) throw new Error("target must be 2–98");

  const winChance =
    input.mode === "over" ? 100 - target : target - 1;
  if (winChance <= 0 || winChance >= 99) {
    throw new Error("invalid win chance for target");
  }

  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "catedice";
  const roll = rollInt(serverSeed, clientSeed, input.nonce, 99) + 1; // 1..100

  const won =
    input.mode === "over" ? roll > target : roll < target;

  // Multiplier on full stake return: 99/winChance (1% house edge)
  const multBps = Math.floor((99_00) / winChance); // ×100 fixed
  const multiplier = multBps / 100;

  let settlement: StakeLockSettlement;
  if (won) {
    const credit =
      (input.betAtomic * BigInt(multBps)) / 100n;
    const netWin = credit - input.betAtomic;
    settlement = {
      outcome: "player_win",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: credit,
      houseEquityDeltaAtomic: -netWin,
    };
  } else {
    settlement = {
      outcome: "player_lose",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: 0n,
      houseEquityDeltaAtomic: input.betAtomic,
    };
  }

  return {
    gameId: "catedice",
    mode: input.mode,
    target,
    roll,
    won,
    multiplier,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement,
  };
}

import type { StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed, rollInt } from "./rng.js";
import { EUROPEAN_RED } from "./paytables.js";

export type SpinColor = "red" | "black" | "green";
export type SpinPick = "red" | "black" | "green";

const RED_SET = new Set<number>(EUROPEAN_RED);

/** True European single-zero colors (0 green). */
export function spinColor(n: number): SpinColor {
  if (n === 0) return "green";
  return RED_SET.has(n) ? "red" : "black";
}

export type CateSpinResult = {
  gameId: "catespin";
  pick: SpinPick;
  number: number;
  color: SpinColor;
  won: boolean;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

/**
 * CateSpin — European roulette color bets.
 * Red/Black: even money (2× total credit); lose on 0.
 * Green: straight-up on 0 only, 35:1 → 36× total credit.
 */
export function playCateSpin(input: {
  pick: SpinPick;
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): CateSpinResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "catespin";
  const number = rollInt(serverSeed, clientSeed, input.nonce, 36); // 0..36
  const color = spinColor(number);
  const won = color === input.pick;

  let settlement: StakeLockSettlement;
  if (!won) {
    settlement = {
      outcome: "player_lose",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: 0n,
      houseEquityDeltaAtomic: input.betAtomic,
    };
  } else if (input.pick === "green") {
    // 35:1 net → 36× total credit
    const credit = input.betAtomic * 36n;
    settlement = {
      outcome: "player_win",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: credit,
      houseEquityDeltaAtomic: -(credit - input.betAtomic),
    };
  } else {
    // even money
    settlement = {
      outcome: "player_win",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: input.betAtomic * 2n,
      houseEquityDeltaAtomic: -input.betAtomic,
    };
  }

  return {
    gameId: "catespin",
    pick: input.pick,
    number,
    color,
    won,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement,
  };
}

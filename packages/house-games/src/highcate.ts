import type { StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed, rollInt } from "./rng.js";

export type HighCatePick = "high" | "low" | "seven";

export type HighCateResult = {
  gameId: "highcate";
  pick: HighCatePick;
  dieA: number;
  dieB: number;
  total: number;
  won: boolean;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

/**
 * HighCate — two fair dice (2–12).
 * Low (2–6) or High (8–12): even money (2× total). Seven loses these bets.
 * Seven: 4:1 net → 5× total credit.
 * P(low)=P(high)=15/36, P(7)=6/36 → house edge on high/low ≈ 16.7%.
 */
export function playHighCate(input: {
  pick: HighCatePick;
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): HighCateResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "highcate";
  const dieA = rollInt(serverSeed, clientSeed, input.nonce, 5) + 1;
  const dieB = rollInt(serverSeed, `${clientSeed}:b`, input.nonce, 5) + 1;
  const total = dieA + dieB;

  let won = false;
  if (input.pick === "low") won = total >= 2 && total <= 6;
  else if (input.pick === "high") won = total >= 8 && total <= 12;
  else won = total === 7;

  let settlement: StakeLockSettlement;
  if (!won) {
    settlement = {
      outcome: "player_lose",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: 0n,
      houseEquityDeltaAtomic: input.betAtomic,
    };
  } else if (input.pick === "seven") {
    const credit = input.betAtomic * 5n;
    settlement = {
      outcome: "player_win",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: credit,
      houseEquityDeltaAtomic: -(credit - input.betAtomic),
    };
  } else {
    settlement = {
      outcome: "player_win",
      betAtomic: input.betAtomic,
      creditAvailableAtomic: input.betAtomic * 2n,
      houseEquityDeltaAtomic: -input.betAtomic,
    };
  }

  return {
    gameId: "highcate",
    pick: input.pick,
    dieA,
    dieB,
    total,
    won,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement,
  };
}

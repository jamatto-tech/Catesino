import type { StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed, rollInt } from "./rng.js";

export type CateSide = "heads" | "tails";

export type CateFlipResult = {
  gameId: "cateflip";
  pick: CateSide;
  result: CateSide;
  won: boolean;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

/** Even money coin flip — pick heads or tails (Cate face / Tails). */
export function playCateFlip(input: {
  pick: CateSide;
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): CateFlipResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "cateflip";
  const bit = rollInt(serverSeed, clientSeed, input.nonce, 1);
  const result: CateSide = bit === 0 ? "heads" : "tails";
  const won = result === input.pick;
  const settlement: StakeLockSettlement = won
    ? {
        outcome: "player_win",
        betAtomic: input.betAtomic,
        creditAvailableAtomic: input.betAtomic * 2n,
        houseEquityDeltaAtomic: -input.betAtomic,
      }
    : {
        outcome: "player_lose",
        betAtomic: input.betAtomic,
        creditAvailableAtomic: 0n,
        houseEquityDeltaAtomic: input.betAtomic,
      };

  return {
    gameId: "cateflip",
    pick: input.pick,
    result,
    won,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement,
  };
}

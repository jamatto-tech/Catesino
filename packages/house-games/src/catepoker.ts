import type { CardId, StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed } from "./rng.js";
import {
  drawCards,
  evaluateFive,
  multToSettlement,
  STUD_CREDIT_MULT,
  type PokerHandRank,
} from "./cards-lite.js";

export type CatePokerResult = {
  gameId: "catepoker";
  cards: CardId[];
  handRank: PokerHandRank;
  creditMult: number;
  won: boolean;
  serverSeedCommit: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  betAtomic: bigint;
  settlement: StakeLockSettlement;
};

/**
 * CatePoker — instant 5-card stud.
 * Deal five, evaluate, pay stud table. No draw.
 */
export function playCatePoker(input: {
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): CatePokerResult {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "catepoker";
  const cards = drawCards(serverSeed, clientSeed, input.nonce, 5);
  const handRank = evaluateFive(cards);
  const creditMult = STUD_CREDIT_MULT[handRank];
  const settlement = multToSettlement(input.betAtomic, creditMult);

  return {
    gameId: "catepoker",
    cards,
    handRank,
    creditMult,
    won: creditMult > 0,
    serverSeedCommit: commitSeed(serverSeed),
    serverSeed,
    clientSeed,
    nonce: input.nonce,
    betAtomic: input.betAtomic,
    settlement,
  };
}

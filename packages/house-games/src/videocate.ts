import type { CardId, StakeLockSettlement } from "@catesino/game-protocol";
import { commitSeed, freshServerSeed } from "./rng.js";
import {
  drawCards,
  evaluateFive,
  multToSettlement,
  JOB_CREDIT_MULT,
  type PokerHandRank,
} from "./cards-lite.js";

export type VideoCatePhase = "hold" | "settled";

export type VideoCateState = {
  gameId: "videocate";
  phase: VideoCatePhase;
  cards: CardId[];
  held: boolean[];
  betAtomic: bigint;
  serverSeed: string;
  serverSeedCommit: string;
  clientSeed: string;
  nonce: number;
  handRank?: PokerHandRank;
  creditMult?: number;
  settlement?: StakeLockSettlement;
};

/**
 * VideoCate — Jacks-or-Better style video poker.
 * deal → hold → draw → settle
 */
export function dealVideoCate(input: {
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  serverSeed?: string;
}): VideoCateState {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeed = input.serverSeed ?? freshServerSeed();
  const clientSeed = input.clientSeed ?? "videocate";
  const cards = drawCards(serverSeed, clientSeed, input.nonce, 5);

  return {
    gameId: "videocate",
    phase: "hold",
    cards,
    held: [false, false, false, false, false],
    betAtomic: input.betAtomic,
    serverSeed,
    serverSeedCommit: commitSeed(serverSeed),
    clientSeed,
    nonce: input.nonce,
  };
}

export function drawVideoCate(
  state: VideoCateState,
  held: boolean[],
): VideoCateState {
  if (state.phase !== "hold") throw new Error("not in hold phase");
  if (held.length !== 5) throw new Error("held must be length 5");

  const kept = state.cards.filter((_, i) => held[i]);
  const need = 5 - kept.length;
  const drawn =
    need > 0
      ? drawCards(
          state.serverSeed,
          `${state.clientSeed}:redraw`,
          state.nonce + 10,
          need,
          state.cards,
        )
      : [];

  const finalCards: CardId[] = [];
  let di = 0;
  for (let i = 0; i < 5; i++) {
    if (held[i]) finalCards.push(state.cards[i]!);
    else finalCards.push(drawn[di++]!);
  }

  const handRank = evaluateFive(finalCards);
  const creditMult = JOB_CREDIT_MULT[handRank];
  const settlement = multToSettlement(state.betAtomic, creditMult);

  return {
    ...state,
    phase: "settled",
    cards: finalCards,
    held,
    handRank,
    creditMult,
    settlement,
  };
}

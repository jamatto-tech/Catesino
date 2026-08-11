import { createHash, createHmac, randomBytes } from "node:crypto";
import type {
  BlackjackAction,
  CardId,
  HandPhase,
  StakeLockSettlement,
} from "@catesino/game-protocol";
import {
  handTotal,
  isBlackjack,
  isBust,
  isTenValue,
  parseCard,
  buildFullMultiset,
} from "./cards.js";
import { BLACKJACK_RULES } from "./rules.js";
import { resolveOutcome, settlementFromOutcome } from "./settlement.js";

export type BlackjackHandState = {
  handId: string;
  betAtomic: bigint;
  phase: HandPhase;
  playerCards: CardId[];
  dealerCards: CardId[];
  /** Hole card hidden until reveal */
  dealerHoleHidden: boolean;
  serverSeedCommit: string;
  /** Only present after settle (or in test with revealSeeds) */
  serverSeed?: string;
  clientSeed: string;
  nonce: number;
  remainingBefore: CardId[];
  remainingAfter?: CardId[];
  outcome?: ReturnType<typeof resolveOutcome>;
  settlement?: StakeLockSettlement;
  doubled: boolean;
};

export type CreateHandInput = {
  handId: string;
  betAtomic: bigint;
  clientSeed?: string;
  nonce: number;
  /** Optional multiset; default full 6-deck */
  remainingMultiset?: CardId[];
  /** Inject server seed for golden tests */
  serverSeed?: Buffer | string;
};

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function seedToBuffer(seed: Buffer | string): Buffer {
  return typeof seed === "string" ? Buffer.from(seed, "hex") : seed;
}

/**
 * Unbiased index into `size` via rejection sampling on HMAC digest.
 */
export function hmacDrawIndex(
  serverSeed: Buffer,
  clientSeed: string,
  nonce: number,
  cardIndex: number,
  size: number,
): number {
  if (size <= 0) throw new Error("empty multiset");
  // largest multiple of size below 2^32
  const max = 0x100000000;
  const limit = max - (max % size);
  let counter = 0;
  for (;;) {
    const msg = `${clientSeed}:${nonce}:${cardIndex}:${counter}`;
    const digest = createHmac("sha256", serverSeed).update(msg).digest();
    const n = digest.readUInt32BE(0);
    if (n < limit) return n % size;
    counter += 1;
    if (counter > 1000) throw new Error("rejection sampling failed");
  }
}

function drawCard(
  remaining: CardId[],
  serverSeed: Buffer,
  clientSeed: string,
  nonce: number,
  cardIndex: number,
): CardId {
  const idx = hmacDrawIndex(
    serverSeed,
    clientSeed,
    nonce,
    cardIndex,
    remaining.length,
  );
  const [card] = remaining.splice(idx, 1);
  if (!card) throw new Error("draw failed");
  return card;
}

export function createHand(input: CreateHandInput): BlackjackHandState {
  if (input.betAtomic <= 0n) throw new Error("bet must be positive");
  const serverSeedBuf = input.serverSeed
    ? seedToBuffer(input.serverSeed)
    : randomBytes(32);
  const serverSeedHex = serverSeedBuf.toString("hex");
  const clientSeed = input.clientSeed ?? randomBytes(16).toString("hex");
  const remaining = [...(input.remainingMultiset ?? buildFullMultiset())];
  const remainingBefore = [...remaining];

  let cardIndex = 0;
  const playerCards: CardId[] = [];
  const dealerCards: CardId[] = [];

  // Deal: P, D, P, D
  playerCards.push(
    drawCard(remaining, serverSeedBuf, clientSeed, input.nonce, cardIndex++),
  );
  dealerCards.push(
    drawCard(remaining, serverSeedBuf, clientSeed, input.nonce, cardIndex++),
  );
  playerCards.push(
    drawCard(remaining, serverSeedBuf, clientSeed, input.nonce, cardIndex++),
  );
  dealerCards.push(
    drawCard(remaining, serverSeedBuf, clientSeed, input.nonce, cardIndex++),
  );

  const state: BlackjackHandState = {
    handId: input.handId,
    betAtomic: input.betAtomic,
    phase: "player_turn",
    playerCards,
    dealerCards,
    dealerHoleHidden: true,
    serverSeedCommit: sha256Hex(serverSeedBuf),
    serverSeed: serverSeedHex,
    clientSeed,
    nonce: input.nonce,
    remainingBefore,
    remainingAfter: remaining,
    doubled: false,
  };

  // Dealer peek on A or 10-value upcard
  if (BLACKJACK_RULES.dealerPeek) {
    const up = parseCard(dealerCards[0]!);
    if (up.rank === "A" || isTenValue(up.rank)) {
      if (isBlackjack(dealerCards) || isBlackjack(playerCards)) {
        return settleImmediate(state, serverSeedBuf, cardIndex);
      }
    }
  }

  // Natural player BJ without dealer BJ (peek not triggered or no dealer BJ)
  if (isBlackjack(playerCards) && !isBlackjack(dealerCards)) {
    return settleImmediate(state, serverSeedBuf, cardIndex);
  }
  if (isBlackjack(playerCards) && isBlackjack(dealerCards)) {
    return settleImmediate(state, serverSeedBuf, cardIndex);
  }

  return state;
}

function settleImmediate(
  state: BlackjackHandState,
  _serverSeed: Buffer,
  _cardIndex: number,
): BlackjackHandState {
  state.dealerHoleHidden = false;
  state.phase = "settled";
  const outcome = resolveOutcome({
    playerCards: state.playerCards,
    dealerCards: state.dealerCards,
  });
  state.outcome = outcome;
  state.settlement = settlementFromOutcome(outcome, state.betAtomic);
  return state;
}

export function applyAction(
  state: BlackjackHandState,
  action: BlackjackAction,
): BlackjackHandState {
  if (state.phase !== "player_turn") {
    throw new Error(`cannot act in phase ${state.phase}`);
  }
  if (!state.serverSeed || !state.remainingAfter) {
    throw new Error("hand missing seed/multiset");
  }
  const serverSeedBuf = Buffer.from(state.serverSeed, "hex");
  const remaining = [...state.remainingAfter];
  let cardIndex =
    state.playerCards.length + state.dealerCards.length; // dealt so far

  const next: BlackjackHandState = {
    ...state,
    playerCards: [...state.playerCards],
    dealerCards: [...state.dealerCards],
  };

  if (action === "double") {
    if (!BLACKJACK_RULES.allowDouble) throw new Error("double disabled");
    if (next.playerCards.length !== 2 || next.doubled) {
      throw new Error("double only on first two cards");
    }
    next.doubled = true;
    next.betAtomic = state.betAtomic * 2n;
    next.playerCards.push(
      drawCard(remaining, serverSeedBuf, next.clientSeed, next.nonce, cardIndex++),
    );
    next.remainingAfter = remaining;
    if (isBust(next.playerCards)) {
      return finishDealer(next, remaining, serverSeedBuf, cardIndex, true);
    }
    return finishDealer(next, remaining, serverSeedBuf, cardIndex, false);
  }

  if (action === "hit") {
    next.playerCards.push(
      drawCard(remaining, serverSeedBuf, next.clientSeed, next.nonce, cardIndex++),
    );
    next.remainingAfter = remaining;
    if (isBust(next.playerCards)) {
      return finishDealer(next, remaining, serverSeedBuf, cardIndex, true);
    }
    return next;
  }

  if (action === "stand") {
    return finishDealer(next, remaining, serverSeedBuf, cardIndex, false);
  }

  throw new Error(`unsupported action`);
}

function finishDealer(
  state: BlackjackHandState,
  remaining: CardId[],
  serverSeedBuf: Buffer,
  cardIndex: number,
  playerBusted: boolean,
): BlackjackHandState {
  state.dealerHoleHidden = false;
  state.phase = "dealer_turn";

  if (!playerBusted) {
    // S17: stand on all 17s (hard or soft)
    while (handTotal(state.dealerCards).total < 17) {
      state.dealerCards.push(
        drawCard(
          remaining,
          serverSeedBuf,
          state.clientSeed,
          state.nonce,
          cardIndex++,
        ),
      );
    }
  }

  state.remainingAfter = remaining;
  state.phase = "settled";
  const outcome = resolveOutcome({
    playerCards: state.playerCards,
    dealerCards: state.dealerCards,
    playerBusted,
  });
  state.outcome = outcome;
  state.settlement = settlementFromOutcome(outcome, state.betAtomic);
  return state;
}

/** Public projection — never include serverSeed pre-settle for real API; tests may read full state. */
export function publicHandView(state: BlackjackHandState, revealSeed: boolean) {
  return {
    handId: state.handId,
    phase: state.phase,
    betAtomic: state.betAtomic.toString(),
    playerCards: state.playerCards,
    dealerCards: state.dealerHoleHidden
      ? [state.dealerCards[0], "??" as const]
      : state.dealerCards,
    serverSeedCommit: state.serverSeedCommit,
    clientSeed: state.clientSeed,
    nonce: state.nonce,
    outcome: state.outcome,
    settlement: state.settlement
      ? {
          outcome: state.settlement.outcome,
          betAtomic: state.settlement.betAtomic.toString(),
          creditAvailableAtomic: state.settlement.creditAvailableAtomic.toString(),
          houseEquityDeltaAtomic:
            state.settlement.houseEquityDeltaAtomic.toString(),
        }
      : undefined,
    serverSeed: revealSeed ? state.serverSeed : undefined,
  };
}

export { BLACKJACK_RULES, buildFullMultiset, handTotal, isBlackjack, isBust };

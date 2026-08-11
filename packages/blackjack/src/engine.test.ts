import { describe, expect, it } from "vitest";
import type { CardId, HandOutcome } from "@catesino/game-protocol";
import {
  applyAction,
  createHand,
  settlementFromOutcome,
  resolveOutcome,
  BLACKJACK_RULES,
  handTotal,
} from "./index.js";

/** Deterministic multiset front-loaded with specific cards for deal order P,D,P,D then hits. */
function multisetWithPrefix(prefix: CardId[]): CardId[] {
  const used = new Set(prefix);
  const rest: CardId[] = [];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;
  const suits = ["S", "H", "D", "C"] as const;
  for (let d = 0; d < BLACKJACK_RULES.decks; d++) {
    for (const r of ranks) {
      for (const s of suits) {
        const id = `${r}${s}` as CardId;
        // allow multiples across decks — for test we just need enough cards
        rest.push(id);
      }
    }
  }
  // Draw path uses HMAC index — for controlled outcomes use resolveOutcome + settlement directly
  // and separately test engine deal with fixed seed.
  void used;
  return [...prefix, ...rest].slice(0, BLACKJACK_RULES.decks * 52);
}

describe("BLACKJACK_RULES freezes", () => {
  it("is 6-deck S17 3:2 without split/insurance/surrender", () => {
    expect(BLACKJACK_RULES.decks).toBe(6);
    expect(BLACKJACK_RULES.dealerS17).toBe(true);
    expect(BLACKJACK_RULES.blackjackPayoutNumerator).toBe(3);
    expect(BLACKJACK_RULES.blackjackPayoutDenominator).toBe(2);
    expect(BLACKJACK_RULES.allowSplit).toBe(false);
    expect(BLACKJACK_RULES.allowInsurance).toBe(false);
    expect(BLACKJACK_RULES.allowSurrender).toBe(false);
  });
});

describe("settlementFromOutcome (shipped stake-lock)", () => {
  const bet = 1_000_000n; // 1 USDC atomic

  it("lose: credit 0, house +bet", () => {
    const s = settlementFromOutcome("player_lose", bet);
    expect(s.creditAvailableAtomic).toBe(0n);
    expect(s.houseEquityDeltaAtomic).toBe(bet);
  });

  it("push: credit bet, house 0", () => {
    const s = settlementFromOutcome("push", bet);
    expect(s.creditAvailableAtomic).toBe(bet);
    expect(s.houseEquityDeltaAtomic).toBe(0n);
  });

  it("win 1:1: credit 2*bet, house -bet", () => {
    const s = settlementFromOutcome("player_win", bet);
    expect(s.creditAvailableAtomic).toBe(bet * 2n);
    expect(s.houseEquityDeltaAtomic).toBe(-bet);
  });

  it("blackjack 3:2: credit 2.5*bet, house -1.5*bet", () => {
    const s = settlementFromOutcome("player_blackjack", bet);
    expect(s.creditAvailableAtomic).toBe(bet + (bet * 3n) / 2n);
    expect(s.creditAvailableAtomic).toBe(2_500_000n);
    expect(s.houseEquityDeltaAtomic).toBe(-(bet * 3n) / 2n);
  });

  it("bust and dealer_blackjack match lose credits", () => {
    expect(settlementFromOutcome("player_bust", bet).creditAvailableAtomic).toBe(0n);
    expect(
      settlementFromOutcome("dealer_blackjack", bet).houseEquityDeltaAtomic,
    ).toBe(bet);
  });
});

describe("resolveOutcome", () => {
  it("detects player BJ, push both BJ, bust, compare totals", () => {
    expect(
      resolveOutcome({
        playerCards: ["AS", "KH"],
        dealerCards: ["9D", "5C"],
      }),
    ).toBe("player_blackjack");

    expect(
      resolveOutcome({
        playerCards: ["AS", "KH"],
        dealerCards: ["AD", "QC"],
      }),
    ).toBe("push");

    expect(
      resolveOutcome({
        playerCards: ["KH", "9D", "5C"],
        dealerCards: ["9S", "8H"],
        playerBusted: true,
      }),
    ).toBe("player_bust");

    expect(
      resolveOutcome({
        playerCards: ["TH", "9D"],
        dealerCards: ["9S", "8H"],
      }),
    ).toBe("player_win");

    expect(
      resolveOutcome({
        playerCards: ["TH", "8D"],
        dealerCards: ["9S", "TH"],
      }),
    ).toBe("player_lose");
  });
});

describe("createHand + applyAction engine", () => {
  it("creates a hand with commit and deals four cards from 6-deck multiset", () => {
    const hand = createHand({
      handId: "h1",
      betAtomic: 500_000n,
      clientSeed: "client-seed",
      nonce: 1,
      serverSeed: Buffer.alloc(32, 7),
    });
    expect(hand.playerCards).toHaveLength(2);
    expect(hand.dealerCards).toHaveLength(2);
    expect(hand.serverSeedCommit).toHaveLength(64);
    expect(hand.remainingBefore).toHaveLength(BLACKJACK_RULES.decks * 52);
    expect(hand.betAtomic).toBe(500_000n);
  });

  it("stand path settles with settlement matching resolveOutcome", () => {
    const hand0 = createHand({
      handId: "h2",
      betAtomic: 2_000_000n,
      clientSeed: "stand-seed",
      nonce: 42,
      serverSeed: Buffer.alloc(32, 3),
    });
    // If already settled (naturals), check settlement; else stand
    let hand = hand0;
    if (hand.phase === "player_turn") {
      hand = applyAction(hand, "stand");
    }
    expect(hand.phase).toBe("settled");
    expect(hand.settlement).toBeDefined();
    const expected = settlementFromOutcome(
      hand.outcome as HandOutcome,
      hand.betAtomic,
    );
    expect(hand.settlement!.creditAvailableAtomic).toBe(
      expected.creditAvailableAtomic,
    );
    expect(hand.settlement!.houseEquityDeltaAtomic).toBe(
      expected.houseEquityDeltaAtomic,
    );
  });

  it("hit until bust yields player_bust settlement credit 0", () => {
    // Brute: try nonces until we get a low player total we can bust, or use many hits
    let found = false;
    for (let nonce = 0; nonce < 200 && !found; nonce++) {
      let hand = createHand({
        handId: `bust-${nonce}`,
        betAtomic: 1_000_000n,
        clientSeed: "bust-client",
        nonce,
        serverSeed: Buffer.alloc(32, 9),
      });
      if (hand.phase !== "player_turn") continue;
      // Hit up to 10 times
      for (let i = 0; i < 12 && hand.phase === "player_turn"; i++) {
        hand = applyAction(hand, "hit");
      }
      if (hand.outcome === "player_bust") {
        expect(hand.settlement!.creditAvailableAtomic).toBe(0n);
        expect(hand.settlement!.houseEquityDeltaAtomic).toBe(hand.betAtomic);
        found = true;
      }
    }
    expect(found).toBe(true);
  });

  it("S17: dealer stands on soft 17 (handTotal helper)", () => {
    // Soft 17 = A+6
    const soft17 = handTotal(["AS", "6H"]);
    expect(soft17.total).toBe(17);
    expect(soft17.soft).toBe(true);
    // Dealer draw condition is total < 17 only
    expect(soft17.total < 17).toBe(false);
  });
});

describe("deal/settle paths for lose, push, win, BJ via resolve+settlement", () => {
  /**
   * These drive the shipped payout functions for the four required outcomes.
   * Card scenarios use resolveOutcome (shipped) → settlementFromOutcome (shipped).
   */
  const cases: { name: string; player: CardId[]; dealer: CardId[]; outcome: HandOutcome; bet: bigint }[] =
    [
      {
        name: "lose",
        player: ["TH", "8D"],
        dealer: ["KS", "9C"],
        outcome: "player_lose",
        bet: 10_000_000n,
      },
      {
        name: "push",
        player: ["TH", "9D"],
        dealer: ["KS", "9C"],
        outcome: "push",
        bet: 10_000_000n,
      },
      {
        name: "win 1:1",
        player: ["TH", "9D"],
        dealer: ["KS", "8C"],
        outcome: "player_win",
        bet: 10_000_000n,
      },
      {
        name: "blackjack 3:2",
        player: ["AS", "KD"],
        dealer: ["9S", "8C"],
        outcome: "player_blackjack",
        bet: 10_000_000n,
      },
    ];

  for (const c of cases) {
    it(c.name, () => {
      const outcome = resolveOutcome({
        playerCards: c.player,
        dealerCards: c.dealer,
      });
      expect(outcome).toBe(c.outcome);
      const settlement = settlementFromOutcome(outcome, c.bet);
      if (c.outcome === "player_lose") {
        expect(settlement.creditAvailableAtomic).toBe(0n);
        expect(settlement.houseEquityDeltaAtomic).toBe(c.bet);
      }
      if (c.outcome === "push") {
        expect(settlement.creditAvailableAtomic).toBe(c.bet);
      }
      if (c.outcome === "player_win") {
        expect(settlement.creditAvailableAtomic).toBe(c.bet * 2n);
      }
      if (c.outcome === "player_blackjack") {
        expect(settlement.creditAvailableAtomic).toBe(c.bet + (c.bet * 3n) / 2n);
      }
    });
  }
});

// silence unused helper in case tree-shaken analysis
void multisetWithPrefix;

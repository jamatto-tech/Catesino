import { describe, expect, it } from "vitest";
import { playCateFlip } from "./cateflip.js";
import { playCateDice } from "./catedice.js";
import { playCateSpin } from "./catespin.js";
import { playHighCate } from "./highcate.js";
import { playCateSlots } from "./cateslots.js";
import { playCatePoker } from "./catepoker.js";
import { dealVideoCate, drawVideoCate } from "./videocate.js";
import { evaluateFive, JOB_CREDIT_MULT } from "./cards-lite.js";

const bet = 1_000_000n;

describe("Cate house games (shipped engines)", () => {
  it("CateFlip settles win or lose with stake-lock credits", () => {
    const r = playCateFlip({
      pick: "heads",
      betAtomic: bet,
      nonce: 1,
      serverSeed: "aa".repeat(32),
      clientSeed: "t",
    });
    expect(["heads", "tails"]).toContain(r.result);
    if (r.won) {
      expect(r.settlement.creditAvailableAtomic).toBe(bet * 2n);
    } else {
      expect(r.settlement.creditAvailableAtomic).toBe(0n);
      expect(r.settlement.houseEquityDeltaAtomic).toBe(bet);
    }
  });

  it("CateDice is deterministic for fixed seed", () => {
    const a = playCateDice({
      mode: "over",
      target: 50,
      betAtomic: bet,
      nonce: 7,
      serverSeed: "bb".repeat(32),
      clientSeed: "d",
    });
    const b = playCateDice({
      mode: "over",
      target: 50,
      betAtomic: bet,
      nonce: 7,
      serverSeed: "bb".repeat(32),
      clientSeed: "d",
    });
    expect(a.roll).toBe(b.roll);
    expect(a.roll).toBeGreaterThanOrEqual(1);
    expect(a.roll).toBeLessThanOrEqual(100);
  });

  it("CateSpin green (zero) pays 35:1 total 36×; red/black even money", () => {
    let greenHit = false;
    for (let n = 0; n < 200 && !greenHit; n++) {
      const r = playCateSpin({
        pick: "green",
        betAtomic: bet,
        nonce: n,
        serverSeed: "cc".repeat(32),
        clientSeed: `g${n}`,
      });
      if (r.color === "green") {
        greenHit = true;
        expect(r.number).toBe(0);
        expect(r.won).toBe(true);
        expect(r.settlement.creditAvailableAtomic).toBe(bet * 36n);
      }
    }
    expect(greenHit).toBe(true);

    // Red win sample
    let redWin = false;
    for (let n = 0; n < 300 && !redWin; n++) {
      const r = playCateSpin({
        pick: "red",
        betAtomic: bet,
        nonce: n,
        serverSeed: "99".repeat(32),
        clientSeed: `r${n}`,
      });
      if (r.won) {
        redWin = true;
        expect(r.color).toBe("red");
        expect(r.settlement.creditAvailableAtomic).toBe(bet * 2n);
      }
    }
    expect(redWin).toBe(true);
  });

  it("HighCate totals 2–12", () => {
    const r = playHighCate({
      pick: "high",
      betAtomic: bet,
      nonce: 3,
      serverSeed: "dd".repeat(32),
    });
    expect(r.dieA).toBeGreaterThanOrEqual(1);
    expect(r.dieA).toBeLessThanOrEqual(6);
    expect(r.total).toBe(r.dieA + r.dieB);
    expect(r.total).toBeGreaterThanOrEqual(2);
    expect(r.total).toBeLessThanOrEqual(12);
  });

  it("CateSlots returns three symbols and settlement", () => {
    const r = playCateSlots({
      betAtomic: bet,
      nonce: 1,
      serverSeed: "ee".repeat(32),
    });
    expect(r.reels).toHaveLength(3);
    expect(r.settlement.betAtomic).toBe(bet);
    if (r.won) {
      expect(r.settlement.creditAvailableAtomic).toBeGreaterThan(0n);
    } else {
      expect(r.settlement.creditAvailableAtomic).toBe(0n);
    }
  });

  it("CatePoker deals 5 and evaluates", () => {
    const r = playCatePoker({
      betAtomic: bet,
      nonce: 2,
      serverSeed: "ff".repeat(32),
    });
    expect(r.cards).toHaveLength(5);
    expect(r.handRank).toBeTruthy();
    expect(r.settlement.betAtomic).toBe(bet);
  });

  it("VideoCate deal → hold all → draw settles JoB mult", () => {
    const dealt = dealVideoCate({
      betAtomic: bet,
      nonce: 4,
      serverSeed: "11".repeat(32),
      clientSeed: "vp",
    });
    expect(dealt.phase).toBe("hold");
    expect(dealt.cards).toHaveLength(5);
    const held = [true, true, true, true, true];
    const done = drawVideoCate(dealt, held);
    expect(done.phase).toBe("settled");
    expect(done.cards).toEqual(dealt.cards);
    const rank = evaluateFive(done.cards);
    expect(done.handRank).toBe(rank);
    expect(done.creditMult).toBe(JOB_CREDIT_MULT[rank]);
    expect(done.settlement).toBeDefined();
  });
});

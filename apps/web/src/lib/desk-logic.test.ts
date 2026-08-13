import { describe, expect, it } from "vitest";
import {
  dealHoldWaves,
  deskRideScore,
  deskRideVerdict,
  holdTap,
  holdTimeout,
  isVaultToday,
  startHoldRound,
  utcDateString,
  vaultOutcomeFromChange,
} from "./desk-logic";

describe("utc / vault day", () => {
  it("only treats today's vault as live", () => {
    const t0 = Date.UTC(2026, 7, 13, 12);
    const t1 = Date.UTC(2026, 7, 14, 1);
    expect(utcDateString(t0)).toBe("2026-08-13");
    expect(isVaultToday({ utcDate: "2026-08-13" }, t0)).toBe(true);
    expect(isVaultToday({ utcDate: "2026-08-13" }, t1)).toBe(false);
    expect(isVaultToday(null, t0)).toBe(false);
  });
});

describe("vault buckets", () => {
  it("maps 24h change", () => {
    expect(vaultOutcomeFromChange(-0.01)).toBe("skip");
    expect(vaultOutcomeFromChange(0)).toBe("skip");
    expect(vaultOutcomeFromChange(0.01)).toBe("buy");
    expect(vaultOutcomeFromChange(4.99)).toBe("buy");
    expect(vaultOutcomeFromChange(5)).toBe("big");
  });
});

describe("desk ride verdict", () => {
  it("treats a flat tape as a push for both sides", () => {
    expect(deskRideVerdict("long", 0.01712, 0.01712)).toBe("push");
    expect(deskRideVerdict("short", 0.01712, 0.01712)).toBe("push");
    expect(deskRideScore("push")).toBe(8);
  });

  it("awards the side that matches the print", () => {
    expect(deskRideVerdict("long", 1, 1.1)).toBe("win");
    expect(deskRideVerdict("short", 1, 1.1)).toBe("lose");
    expect(deskRideVerdict("short", 1, 0.9)).toBe("win");
    expect(deskRideVerdict("long", 1, 0.9)).toBe("lose");
    expect(deskRideScore("win")).toBe(25);
    expect(deskRideScore("lose")).toBe(5);
  });
});

describe("hold round", () => {
  it("deals 10 waves with at least 4 wicks and 2 baits", () => {
    for (let n = 0; n < 20; n++) {
      const waves = dealHoldWaves();
      expect(waves).toHaveLength(10);
      const wicks = waves.filter((w) => w.kind === "wick").length;
      const baits = waves.filter((w) => w.kind === "bait").length;
      expect(wicks).toBeGreaterThanOrEqual(4);
      expect(baits).toBeGreaterThanOrEqual(2);
    }
  });

  it("dies on a missed wick or a tapped bait", () => {
    const round = {
      waves: [
        { kind: "wick" as const, text: "WICK" },
        { kind: "bait" as const, text: "BAIT" },
      ],
      index: 0,
      held: 0,
      phase: "live" as const,
    };
    expect(holdTimeout(round).phase).toBe("dead");
    expect(holdTap({ ...round, index: 1 }).phase).toBe("dead");
  });

  it("clears when every wick is held and baits time out", () => {
    let round = startHoldRound(() => 0.99);
    while (round.phase === "live") {
      const wave = round.waves[round.index]!;
      round = wave.kind === "wick" ? holdTap(round) : holdTimeout(round);
    }
    expect(round.phase).toBe("clear");
    expect(round.held).toBe(round.waves.filter((w) => w.kind === "wick").length);
  });

  it("ignores taps after the round is over", () => {
    const dead = holdTap({
      waves: [{ kind: "bait", text: "BAIT" }],
      index: 0,
      held: 0,
      phase: "live",
    });
    expect(dead.phase).toBe("dead");
    expect(holdTap(dead)).toBe(dead);
    expect(holdTimeout(dead)).toBe(dead);
  });
});

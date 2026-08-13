import { describe, expect, it } from "vitest";
import { vaultOutcomeFromChange } from "./cate-price";
import {
  callVault,
  DESK_WINDOW_MS,
  emptyDeskState,
  finishHold,
  flipTape,
  openPosition,
  sealDeskState,
  settleIfDue,
  settlePosition,
  unsealDeskState,
} from "./desk-session";

const SECRET = "desk-test";

describe("desk cookie", () => {
  it("round-trips", () => {
    const s = emptyDeskState();
    expect(unsealDeskState(sealDeskState(s, SECRET), SECRET)?.deskId).toBe(
      s.deskId,
    );
  });
});

describe("hold", () => {
  it("scores held wicks and only yarns a full survive", () => {
    const t0 = Date.UTC(2026, 7, 13);
    const folded = finishHold(emptyDeskState(), {
      survived: false,
      held: 4,
      total: 10,
    }, t0);
    expect(folded.conviction).toBe(12);
    expect(folded.yarn).toBe(0);
    const clear = finishHold(emptyDeskState(), {
      survived: true,
      held: 10,
      total: 10,
    }, t0);
    expect(clear.conviction).toBe(45);
    expect(clear.yarn).toBe(1);
  });
});

describe("desk position", () => {
  it("long wins when price is up after the window", () => {
    const t0 = 1_000_000;
    const open = openPosition(emptyDeskState(), "long", 1, t0);
    expect(open.position?.endsAt).toBe(t0 + DESK_WINDOW_MS);
    expect(() => settlePosition(open, 1.1, t0 + DESK_WINDOW_MS - 1)).toThrow(
      /window still open/,
    );
    const settled = settlePosition(open, 1.1, t0 + DESK_WINDOW_MS);
    expect(settled.won).toBe(true);
    expect(settled.push).toBe(false);
    expect(settled.conviction).toBe(25);
    expect(settled.state.position?.exitUsd).toBe(1.1);
  });

  it("treats a flat tape as a push and will not reopen over an unsettled ride", () => {
    const t0 = 1_000_000;
    const open = openPosition(emptyDeskState(), "short", 0.01712, t0);
    expect(settleIfDue(open, 0.01712, t0 + 1_000).ride).toBeNull();
    expect(() => openPosition(open, "long", 0.02, t0 + DESK_WINDOW_MS)).toThrow(
      /settle the open ride/,
    );
    const due = settleIfDue(open, 0.01712, t0 + DESK_WINDOW_MS);
    expect(due.ride?.push).toBe(true);
    expect(due.ride?.won).toBe(false);
    expect(due.ride?.conviction).toBe(8);
    const again = settlePosition(due.state, 0.01712, t0 + DESK_WINDOW_MS);
    expect(again.already).toBe(true);
    expect(again.conviction).toBe(0);
    const next = openPosition(due.state, "long", 0.02, t0 + DESK_WINDOW_MS);
    expect(next.position?.side).toBe("long");
    expect(next.position?.settled).toBe(false);
  });
});

describe("vault", () => {
  it("maps 24h change to skip / buy / big", () => {
    expect(vaultOutcomeFromChange(-1)).toBe("skip");
    expect(vaultOutcomeFromChange(1)).toBe("buy");
    expect(vaultOutcomeFromChange(5)).toBe("big");
  });

  it("settles a correct call once per day", () => {
    const t0 = Date.UTC(2026, 7, 13);
    const r = callVault(emptyDeskState(), "buy", 2, t0);
    expect(r.won).toBe(true);
    expect(r.yarn).toBe(1);
    expect(r.state.vault?.actual).toBe("buy");
    expect(r.state.vault?.change24h).toBe(2);
    expect(() => callVault(r.state, "skip", -3, t0)).toThrow(/already called/);
    const nextDay = callVault(r.state, "skip", -3, Date.UTC(2026, 7, 14));
    expect(nextDay.won).toBe(true);
    expect(nextDay.state.vault?.utcDate).toBe("2026-08-14");
  });
});

describe("tape flip", () => {
  it("is deterministic and 50/50 published", () => {
    const base = emptyDeskState();
    const a = flipTape(base, "long", SECRET);
    const b = flipTape(base, "long", SECRET);
    expect(a.result).toBe(b.result);
    expect(a.won).toBe(a.result === "long");
  });

  it("stacks a streak on wins and resets on a miss", () => {
    const base = emptyDeskState();
    const seed = flipTape(base, "long", SECRET);
    const win = flipTape(base, seed.result, SECRET);
    expect(win.won).toBe(true);
    expect(win.state.tapeStreak).toBe(1);
    const next = flipTape(win.state, win.result, SECRET);
    if (next.won) expect(next.state.tapeStreak).toBe(2);
    else expect(next.state.tapeStreak).toBe(0);
  });
});

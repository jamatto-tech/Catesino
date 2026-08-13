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
    expect(settled.conviction).toBe(25);
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

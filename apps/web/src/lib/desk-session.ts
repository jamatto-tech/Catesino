import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sessionCookieOptions } from "@/lib/auth/session";
import {
  DESK_WINDOW_MS,
  HOLD_WAVES,
  deskRideScore,
  deskRideVerdict,
  utcDateString,
  vaultOutcomeFromChange,
  type DeskSide,
  type VaultCall,
} from "@/lib/desk-logic";

export { DESK_WINDOW_MS, HOLD_WAVES, utcDateString } from "@/lib/desk-logic";
export type { DeskSide } from "@/lib/desk-logic";

export const DESK_COOKIE = "catesino_desk";
const DESK_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const DESK_TTL_SEC = 180 * 24 * 3600;

export type DeskState = {
  v: 1;
  deskId: string;
  conviction: number;
  hold: {
    survived: boolean;
    held: number;
    total: number;
    at: number;
  } | null;
  position: {
    side: DeskSide;
    entryUsd: number;
    startedAt: number;
    endsAt: number;
    settled: boolean;
    won?: boolean;
    push?: boolean;
    exitUsd?: number;
  } | null;
  vault: {
    utcDate: string;
    pick: VaultCall;
    actual?: VaultCall;
    change24h?: number;
    settled: boolean;
    won?: boolean;
  } | null;
  tapeNonce: number;
  tapeStreak: number;
  lastTape: { side: DeskSide; result: DeskSide; won: boolean } | null;
  lastHoldYarnUtc?: string;
  lastVaultYarnUtc?: string;
};

type Sealed = { p: DeskState; exp: number; mac: string };

export type RideSettle = {
  won: boolean;
  push: boolean;
  conviction: number;
  exitUsd: number;
  already: boolean;
};

export function emptyDeskState(): DeskState {
  return {
    v: 1,
    deskId: randomBytes(16).toString("hex"),
    conviction: 0,
    hold: null,
    position: null,
    vault: null,
    tapeNonce: 0,
    tapeStreak: 0,
    lastTape: null,
  };
}

export function sealDeskState(
  state: DeskState,
  secret: string,
  nowMs = Date.now(),
): string {
  const exp = nowMs + DESK_TTL_MS;
  const body = JSON.stringify({ p: state, exp });
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return Buffer.from(JSON.stringify({ p: state, exp, mac }), "utf8").toString(
    "base64url",
  );
}

export function unsealDeskState(
  token: string,
  secret: string,
  nowMs = Date.now(),
): DeskState | null {
  try {
    const sealed = JSON.parse(
      Buffer.from(token, "base64url").toString("utf8"),
    ) as Sealed;
    if (!sealed?.p || !sealed.mac || typeof sealed.exp !== "number") return null;
    const body = JSON.stringify({ p: sealed.p, exp: sealed.exp });
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    if (!safeEqual(sealed.mac, expected)) return null;
    if (nowMs > sealed.exp) return null;
    if (sealed.p.v !== 1 || typeof sealed.p.deskId !== "string") return null;
    return {
      ...sealed.p,
      conviction: Number.isFinite(sealed.p.conviction) ? sealed.p.conviction : 0,
      tapeNonce: Number.isFinite(sealed.p.tapeNonce) ? sealed.p.tapeNonce : 0,
      tapeStreak: Number.isFinite(sealed.p.tapeStreak) ? sealed.p.tapeStreak : 0,
    };
  } catch {
    return null;
  }
}

export function deskCookieOptions() {
  return sessionCookieOptions(DESK_TTL_SEC);
}

export function finishHold(
  state: DeskState,
  input: { survived: boolean; held: number; total: number },
  nowMs = Date.now(),
): { state: DeskState; conviction: number; yarn: number } {
  const total = clampInt(input.total, 1, HOLD_WAVES);
  const held = clampInt(input.held, 0, total);
  const survived = input.survived && held === total;
  const conviction = held * 3 + (survived ? 15 : 0);
  const today = utcDateString(nowMs);
  const yarn = survived && state.lastHoldYarnUtc !== today ? 1 : 0;
  return {
    state: {
      ...state,
      conviction: state.conviction + conviction,
      lastHoldYarnUtc: yarn ? today : state.lastHoldYarnUtc,
      hold: { survived, held, total, at: nowMs },
    },
    conviction,
    yarn,
  };
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function openPosition(
  state: DeskState,
  side: DeskSide,
  entryUsd: number,
  nowMs = Date.now(),
): DeskState {
  if (state.position && !state.position.settled) {
    if (nowMs < state.position.endsAt) {
      throw statusError("position still open", 400);
    }
    throw statusError("settle the open ride first", 400);
  }
  if (!Number.isFinite(entryUsd) || entryUsd <= 0) {
    throw statusError("price feed unavailable", 400);
  }
  return {
    ...state,
    position: {
      side,
      entryUsd,
      startedAt: nowMs,
      endsAt: nowMs + DESK_WINDOW_MS,
      settled: false,
    },
  };
}

export function settlePosition(
  state: DeskState,
  exitUsd: number,
  nowMs = Date.now(),
): { state: DeskState } & RideSettle {
  const pos = state.position;
  if (!pos) throw statusError("no position to settle", 400);
  if (pos.settled) {
    return {
      state,
      won: Boolean(pos.won),
      push: Boolean(pos.push),
      conviction: 0,
      exitUsd: pos.exitUsd ?? exitUsd,
      already: true,
    };
  }
  if (nowMs < pos.endsAt) throw statusError("window still open", 400);
  if (!Number.isFinite(exitUsd) || exitUsd <= 0) {
    throw statusError("price feed unavailable", 400);
  }
  const verdict = deskRideVerdict(pos.side, pos.entryUsd, exitUsd);
  const conviction = deskRideScore(verdict);
  const won = verdict === "win";
  const push = verdict === "push";
  return {
    state: {
      ...state,
      conviction: state.conviction + conviction,
      position: { ...pos, settled: true, won, push, exitUsd },
    },
    won,
    push,
    conviction,
    exitUsd,
    already: false,
  };
}

export function settleIfDue(
  state: DeskState,
  exitUsd: number | null,
  nowMs = Date.now(),
): { state: DeskState; ride: RideSettle | null } {
  const pos = state.position;
  if (!pos || pos.settled || nowMs < pos.endsAt) {
    return { state, ride: null };
  }
  if (exitUsd === null || !Number.isFinite(exitUsd) || exitUsd <= 0) {
    return { state, ride: null };
  }
  const settled = settlePosition(state, exitUsd, nowMs);
  return {
    state: settled.state,
    ride: {
      won: settled.won,
      push: settled.push,
      conviction: settled.conviction,
      exitUsd: settled.exitUsd,
      already: settled.already,
    },
  };
}

export function callVault(
  state: DeskState,
  pick: VaultCall,
  change24h: number,
  nowMs = Date.now(),
): { state: DeskState; won: boolean; conviction: number; yarn: number } {
  const today = utcDateString(nowMs);
  if (state.vault?.utcDate === today) {
    throw statusError("already called today", 400);
  }
  const actual = vaultOutcomeFromChange(change24h);
  const won = pick === actual;
  const conviction = won ? 30 : 8;
  const yarn = won && state.lastVaultYarnUtc !== today ? 1 : 0;
  return {
    state: {
      ...state,
      conviction: state.conviction + conviction,
      lastVaultYarnUtc: yarn ? today : state.lastVaultYarnUtc,
      vault: { utcDate: today, pick, actual, change24h, settled: true, won },
    },
    won,
    conviction,
    yarn,
  };
}

export function flipTape(
  state: DeskState,
  side: DeskSide,
  secret: string,
): { state: DeskState; result: DeskSide; won: boolean; conviction: number } {
  const nonce = state.tapeNonce + 1;
  const digest = createHmac("sha256", secret)
    .update(`tape:${state.deskId}:${nonce}`)
    .digest();
  const result: DeskSide = digest[0] % 2 === 0 ? "long" : "short";
  const won = result === side;
  const conviction = won ? 15 : 5;
  const tapeStreak = won ? (state.tapeStreak ?? 0) + 1 : 0;
  return {
    state: {
      ...state,
      tapeNonce: nonce,
      tapeStreak,
      conviction: state.conviction + conviction,
      lastTape: { side, result, won },
    },
    result,
    won,
    conviction,
  };
}

function statusError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

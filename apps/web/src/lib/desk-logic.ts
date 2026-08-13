export const HOLD_WAVES = 10;
export const HOLD_BEAT_MS = 1700;
export const DESK_WINDOW_MS = 20_000;
export const DESK_FLAT_EPS = 1e-8;

export type DeskSide = "long" | "short";
export type VaultCall = "skip" | "buy" | "big";
export type RideVerdict = "win" | "lose" | "push";
export type HoldWaveKind = "wick" | "bait";
export type HoldPhase = "idle" | "live" | "dead" | "clear";

export type HoldWave = { kind: HoldWaveKind; text: string };

export type HoldRound = {
  waves: HoldWave[];
  index: number;
  held: number;
  phase: Exclude<HoldPhase, "idle">;
};

const WICKS = [
  "WICK −28%",
  "DUMP CANDLE",
  "−41% WICK",
  "LIQS PRINTING",
  "RED CANDLE",
  "CHART BLEEDING",
];
const BAITS = [
  "TAKE PROFIT NOW",
  "SELL THE BAG",
  "YOUR GC SAID DUMP",
  "EASY +2x — SELL",
  "FOLD BRO",
  "MARKET SELL IT",
];

export function utcDateString(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function isVaultToday(
  vault: { utcDate: string } | null | undefined,
  nowMs = Date.now(),
): boolean {
  return Boolean(vault && vault.utcDate === utcDateString(nowMs));
}

export function vaultOutcomeFromChange(change24h: number): VaultCall {
  if (change24h >= 5) return "big";
  if (change24h > 0) return "buy";
  return "skip";
}

export function deskRideVerdict(
  side: DeskSide,
  entryUsd: number,
  exitUsd: number,
): RideVerdict {
  if (!(entryUsd > 0) || !(exitUsd > 0)) return "push";
  const rel = (exitUsd - entryUsd) / entryUsd;
  if (!Number.isFinite(rel) || Math.abs(rel) < DESK_FLAT_EPS) return "push";
  const up = exitUsd > entryUsd;
  return (side === "long" ? up : !up) ? "win" : "lose";
}

export function deskRideScore(verdict: RideVerdict): number {
  if (verdict === "win") return 25;
  if (verdict === "push") return 8;
  return 5;
}

export function startHoldRound(rand: () => number = Math.random): HoldRound {
  return {
    waves: dealHoldWaves(rand),
    index: 0,
    held: 0,
    phase: "live",
  };
}

export function holdTap(round: HoldRound): HoldRound {
  if (round.phase !== "live") return round;
  const wave = round.waves[round.index];
  if (!wave) return { ...round, phase: "clear" };
  if (wave.kind === "bait") return { ...round, phase: "dead" };
  return advanceHold(round, round.held + 1, round.index + 1);
}

export function holdTimeout(round: HoldRound): HoldRound {
  if (round.phase !== "live") return round;
  const wave = round.waves[round.index];
  if (!wave) return { ...round, phase: "clear" };
  if (wave.kind === "wick") return { ...round, phase: "dead" };
  return advanceHold(round, round.held, round.index + 1);
}

export function dealHoldWaves(rand: () => number = Math.random): HoldWave[] {
  const wickText = shuffle(WICKS, rand);
  const baitText = shuffle(BAITS, rand);
  const out: HoldWave[] = [];
  let wicks = 0;
  let baits = 0;
  for (let n = 0; n < HOLD_WAVES; n++) {
    const remain = HOLD_WAVES - n;
    const mustWick = wicks < 4 && remain <= 4 - wicks;
    const mustBait = baits < 2 && remain <= 2 - baits && !mustWick;
    const kind: HoldWaveKind = mustWick
      ? "wick"
      : mustBait
        ? "bait"
        : rand() < 0.6
          ? "wick"
          : "bait";
    if (kind === "wick") {
      out.push({ kind, text: wickText[wicks % wickText.length] });
      wicks += 1;
    } else {
      out.push({ kind, text: baitText[baits % baitText.length] });
      baits += 1;
    }
  }
  return out;
}

function advanceHold(round: HoldRound, held: number, index: number): HoldRound {
  if (index >= round.waves.length) {
    return { ...round, held, index, phase: "clear" };
  }
  return { ...round, held, index };
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j]!;
    out[j] = tmp!;
  }
  return out;
}

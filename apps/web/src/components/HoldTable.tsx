"use client";

import { useEffect, useRef, useState } from "react";
import { DeskHud } from "@/components/DeskHud";
import { useDesk } from "@/lib/use-desk";

const WAVES = 10;
const BEAT_MS = 1700;

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

type Wave = { kind: "wick" | "bait"; text: string };

type Phase = "idle" | "live" | "dead" | "clear";

export function HoldTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [phase, setPhase] = useState<Phase>("idle");
  const [waves, setWaves] = useState<Wave[]>([]);
  const [i, setI] = useState(0);
  const [held, setHeld] = useState(0);
  const locked = useRef(false);

  useEffect(() => {
    if (phase !== "live") return;
    if (i >= waves.length) {
      if (locked.current) return;
      locked.current = true;
      setPhase("clear");
      void act("hold.finish", {
        survived: true,
        held: waves.length,
        total: waves.length,
      });
      return;
    }
    const id = window.setTimeout(() => {
      const wave = waves[i];
      if (wave.kind === "wick") {
        fold(held);
        return;
      }
      setI((n) => n + 1);
    }, BEAT_MS);
    return () => window.clearTimeout(id);
    // fold/act captured via ref-safe path
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i, waves]);

  const fold = (heldCount: number) => {
    if (locked.current) return;
    locked.current = true;
    setPhase("dead");
    void act("hold.finish", {
      survived: false,
      held: heldCount,
      total: WAVES,
    });
  };

  const start = () => {
    locked.current = false;
    setWaves(dealWaves());
    setI(0);
    setHeld(0);
    setPhase("live");
  };

  const tapHold = () => {
    if (phase !== "live" || locked.current) return;
    const wave = waves[i];
    if (!wave) return;
    if (wave.kind === "bait") {
      fold(held);
      return;
    }
    setHeld((n) => n + 1);
    setI((n) => n + 1);
  };

  const wave = phase === "live" ? waves[i] : null;

  return (
    <div className="machine">
      <DeskHud conviction={desk?.conviction ?? 0} tape={tape} />

      <div
        className={`hold-arena${wave ? ` hold-arena--${wave.kind}` : ""}`}
        data-phase={phase}
      >
        {phase === "idle" ? (
          <p>
            Survive {WAVES} hits. Tap <strong>HOLD</strong> on red wicks. Do
            not tap the fake take-profit.
          </p>
        ) : null}
        {wave ? (
          <>
            <span className="hold-arena__kicker">
              {wave.kind === "wick" ? "wick · tap hold" : "bait · don't tap"}
            </span>
            <strong>{wave.text}</strong>
            <em>
              {i + 1} / {waves.length}
            </em>
          </>
        ) : null}
        {phase === "dead" ? (
          <p>
            Paper hands. Held {held}/{WAVES}.
          </p>
        ) : null}
        {phase === "clear" ? (
          <p>You held every wick. That&apos;s the bit.</p>
        ) : null}
      </div>

      <div className="btn-row" style={{ marginTop: "1.25rem" }}>
        {phase === "live" ? (
          <button type="button" className="btn btn--gold" onClick={tapHold}>
            HOLD
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--gold"
            disabled={busy}
            onClick={start}
          >
            {phase === "idle" ? "Start round" : "Go again"}
          </button>
        )}
      </div>
      {note ? <p className="machine__hint">{note}</p> : null}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function dealWaves(): Wave[] {
  const out: Wave[] = [];
  let wicks = 0;
  for (let n = 0; n < WAVES; n++) {
    const forceWick = wicks < 4 && n > WAVES - 5;
    const kind: Wave["kind"] =
      forceWick || Math.random() < 0.6 ? "wick" : "bait";
    if (kind === "wick") wicks += 1;
    const pool = kind === "wick" ? WICKS : BAITS;
    out.push({ kind, text: pool[n % pool.length] });
  }
  if (wicks === 0) out[0] = { kind: "wick", text: WICKS[0] };
  return out;
}

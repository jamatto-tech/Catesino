"use client";

import { useEffect, useRef, useState } from "react";
import { CateMascot } from "@/components/CateMascot";
import { DeskHud } from "@/components/DeskHud";
import {
  HOLD_BEAT_MS,
  HOLD_WAVES,
  holdTap,
  holdTimeout,
  startHoldRound,
  type HoldRound,
} from "@/lib/desk-logic";
import { useDesk } from "@/lib/use-desk";

export function HoldTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [round, setRound] = useState<HoldRound | null>(null);
  const [beat, setBeat] = useState(1);
  const [flash, setFlash] = useState<"in" | "miss" | null>(null);
  const sent = useRef(false);
  const phaseRef = useRef<"idle" | HoldRound["phase"]>("idle");

  const phase = round?.phase ?? "idle";
  phaseRef.current = phase;
  const wave = phase === "live" && round ? round.waves[round.index] : null;

  useEffect(() => {
    if (!round || round.phase !== "live") return;
    const born = Date.now();
    setBeat(1);
    const tick = window.setInterval(() => {
      setBeat(Math.max(0, 1 - (Date.now() - born) / HOLD_BEAT_MS));
    }, 40);
    const id = window.setTimeout(() => {
      setRound((cur) => (cur && cur.phase === "live" ? holdTimeout(cur) : cur));
    }, HOLD_BEAT_MS);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(tick);
    };
  }, [round?.phase, round?.index]);

  useEffect(() => {
    if (!round || (round.phase !== "dead" && round.phase !== "clear")) return;
    if (sent.current) return;
    sent.current = true;
    void persist(round);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.phase]);

  const persist = async (done: HoldRound) => {
    for (let n = 0; n < 3; n++) {
      const data = await act("hold.finish", {
        survived: done.phase === "clear",
        held: done.held,
        total: done.waves.length,
      });
      if (data) return;
      await wait(300);
    }
    sent.current = false;
  };

  const start = () => {
    if (busy && phaseRef.current !== "idle") return;
    sent.current = false;
    setFlash(null);
    setRound(startHoldRound());
  };

  const tap = () => {
    setRound((cur) => {
      if (!cur || cur.phase !== "live") return cur;
      const waveNow = cur.waves[cur.index];
      setFlash(waveNow?.kind === "wick" ? "in" : "miss");
      window.setTimeout(() => setFlash(null), 220);
      return holdTap(cur);
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      if (phaseRef.current === "live") tap();
      else start();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // start/tap close over latest via setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const mascotMood =
    phase === "clear"
      ? "win"
      : phase === "dead"
        ? "lose"
        : wave?.kind === "wick"
          ? "wick"
          : wave?.kind === "bait"
            ? "bait"
            : "idle";

  return (
    <div className="machine desk-game">
      <DeskHud
        conviction={desk?.conviction ?? 0}
        tape={tape}
        vault={desk?.vault}
      />

      <div
        className={`desk-stage hold-arena${wave ? ` hold-arena--${wave.kind}` : ""}${flash ? ` is-flash-${flash}` : ""}`}
        data-phase={phase}
      >
        <CateMascot pose="peek" mood={mascotMood} />
        {phase === "live" ? (
          <i className="hold-beat" style={{ ["--beat" as string]: beat }} />
        ) : null}

        {phase === "idle" ? (
          <p>
            Survive {HOLD_WAVES} hits. Smash <strong>HOLD</strong> on red wicks.
            Do nothing on fake take-profit.
          </p>
        ) : null}
        {wave ? (
          <>
            <span className="hold-arena__kicker">
              {wave.kind === "wick" ? "wick · tap hold" : "bait · don't tap"}
            </span>
            <strong>{wave.text}</strong>
            <em>
              {(round?.index ?? 0) + 1} / {round?.waves.length ?? HOLD_WAVES}
              {round ? ` · held ${round.held}` : ""}
            </em>
          </>
        ) : null}
        {phase === "dead" ? (
          <p>
            Paper hands. Held {round?.held ?? 0}/{HOLD_WAVES}.
          </p>
        ) : null}
        {phase === "clear" ? (
          <p>You held every wick. That&apos;s the bit.</p>
        ) : null}

        {round ? (
          <ol className="hold-dots" aria-hidden>
            {round.waves.map((w, i) => (
              <li
                key={`${w.kind}-${i}`}
                className={
                  i < round.index
                    ? "is-done"
                    : i === round.index && phase === "live"
                      ? `is-now is-${w.kind}`
                      : ""
                }
              />
            ))}
          </ol>
        ) : null}
      </div>

      <div className="btn-row" style={{ marginTop: "1.25rem" }}>
        {phase === "live" ? (
          <button type="button" className="btn btn--gold btn--hold" onClick={tap}>
            HOLD
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--gold"
            disabled={busy && phase !== "idle"}
            onClick={start}
          >
            {phase === "idle" ? "Start round" : "Go again"}
          </button>
        )}
      </div>
      <p className="desk-keys">space / enter</p>
      {note ? <p className="machine__hint">{note}</p> : null}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

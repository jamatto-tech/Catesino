"use client";

import { useEffect, useRef, useState } from "react";
import { CateMascot } from "@/components/CateMascot";
import { DeskHud } from "@/components/DeskHud";
import { useDesk } from "@/lib/use-desk";

const PRINT_MS = 1700;

type Print = {
  side: "long" | "short";
  result: "long" | "short";
  won: boolean;
};

export function TapeTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [phase, setPhase] = useState<"idle" | "forming" | "printed">("idle");
  const [print, setPrint] = useState<Print | null>(null);
  const flipping = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const last = print ?? desk?.lastTape ?? null;
  const streak = desk?.tapeStreak ?? 0;
  const shown = phase === "forming" ? null : last;
  const candle = phase === "forming" ? "form" : shown?.result ?? "idle";

  const flip = async (side: "long" | "short") => {
    if (flipping.current || phaseRef.current === "forming") return;
    flipping.current = true;
    setPhase("forming");
    setPrint(null);
    const started = Date.now();
    const data = await act("tape.flip", { side });
    const wait = Math.max(0, PRINT_MS - (Date.now() - started));
    if (wait) await new Promise((r) => window.setTimeout(r, wait));
    flipping.current = false;
    if (!data || (data.result !== "long" && data.result !== "short")) {
      setPhase(last ? "printed" : "idle");
      return;
    }
    setPrint({
      side,
      result: data.result,
      won: Boolean(data.won),
    });
    setPhase("printed");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "l" || e.key === "L") void flip("long");
      if (e.key === "s" || e.key === "S") void flip("short");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mood =
    phase === "forming"
      ? "form"
      : shown?.won
        ? "win"
        : shown
          ? "lose"
          : "idle";

  return (
    <div className="machine desk-game">
      <DeskHud
        conviction={desk?.conviction ?? 0}
        tape={tape}
        vault={desk?.vault}
      />

      <div className={`desk-stage tape-arena tape-arena--${mood}`}>
        <CateMascot
          pose="peek"
          mood={
            phase === "forming"
              ? "seal"
              : shown?.won
                ? "win"
                : shown
                  ? "lose"
                  : "idle"
          }
        />
        <span className="hold-arena__kicker">
          {phase === "forming"
            ? "printing…"
            : shown
              ? shown.won
                ? "called it"
                : "wrong way"
              : "published 50/50"}
        </span>

        <button
          type="button"
          className="tape-hit tape-hit--long"
          disabled={busy || phase === "forming"}
          onClick={() => void flip("long")}
          aria-label="Long the wick"
        >
          L
        </button>
        <button
          type="button"
          className="tape-hit tape-hit--short"
          disabled={busy || phase === "forming"}
          onClick={() => void flip("short")}
          aria-label="Short the wick"
        >
          S
        </button>

        <div className={`tape-candle tape-candle--${candle}`} aria-hidden>
          <span className="tape-candle__wick tape-candle__wick--hi" />
          <span className="tape-candle__body" />
          <span className="tape-candle__wick tape-candle__wick--lo" />
        </div>

        {phase === "forming" ? (
          <em>wick&apos;s still deciding</em>
        ) : shown ? (
          <>
            <strong>
              YOU {shown.side.toUpperCase()} · TAPE {shown.result.toUpperCase()}
            </strong>
            {streak > 1 ? (
              <em className="tape-streak">streak {streak}</em>
            ) : (
              <em>{shown.won ? "keep flipping" : "reset. go again."}</em>
            )}
          </>
        ) : (
          <p>
            Tap the left pad or press L to long. Right pad or S to short. True
            50/50. Chase a streak.
          </p>
        )}

        <ol className="tape-pips" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className={i < Math.min(streak, 5) ? "is-on" : ""} />
          ))}
        </ol>
      </div>

      <div className="btn-row" style={{ marginTop: "1.25rem" }}>
        <button
          type="button"
          className="btn btn--gold"
          disabled={busy || phase === "forming"}
          onClick={() => void flip("long")}
        >
          Long the wick
        </button>
        <button
          type="button"
          className="btn btn--line"
          disabled={busy || phase === "forming"}
          onClick={() => void flip("short")}
        >
          Short the wick
        </button>
      </div>
      <p className="desk-keys">L long · S short · or tap the pads</p>
      {note && phase !== "forming" ? <p className="machine__hint">{note}</p> : null}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

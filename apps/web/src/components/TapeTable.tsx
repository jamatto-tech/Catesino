"use client";

import { useState } from "react";
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

  const last = print ?? desk?.lastTape ?? null;
  const streak = desk?.tapeStreak ?? 0;
  const shown = phase === "forming" ? null : last;
  const candle = phase === "forming" ? "form" : shown?.result ?? "idle";

  const flip = async (side: "long" | "short") => {
    if (phase === "forming") return;
    setPhase("forming");
    setPrint(null);
    const started = Date.now();
    const data = await act("tape.flip", { side });
    const wait = Math.max(0, PRINT_MS - (Date.now() - started));
    if (wait) await new Promise((r) => window.setTimeout(r, wait));
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

  const mood =
    phase === "forming"
      ? "form"
      : shown?.won
        ? "win"
        : shown
          ? "lose"
          : "idle";

  return (
    <div className="machine">
      <DeskHud conviction={desk?.conviction ?? 0} tape={tape} />

      <div className={`tape-arena tape-arena--${mood}`}>
        <span className="hold-arena__kicker">
          {phase === "forming"
            ? "printing…"
            : shown
              ? shown.won
                ? "called it"
                : "wrong way"
              : "published 50/50"}
        </span>

        <div
          className={`tape-candle tape-candle--${candle}`}
          aria-hidden
        >
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
            Call the fake candle. Server HMAC, true 50/50. Chase a streak. Not
            a signal.
          </p>
        )}
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
      {note && phase !== "forming" ? <p className="machine__hint">{note}</p> : null}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

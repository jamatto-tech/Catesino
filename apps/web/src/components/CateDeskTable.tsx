"use client";

import { useEffect, useRef, useState } from "react";
import { DeskHud } from "@/components/DeskHud";
import { useDesk } from "@/lib/use-desk";

export function CateDeskTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [now, setNow] = useState(() => Date.now());
  const [ticks, setTicks] = useState<number[]>([]);
  const settling = useRef(false);

  const pos = desk?.position ?? null;
  const open = Boolean(pos && !pos.settled && now < pos.endsAt);
  const ready = Boolean(pos && !pos.settled && now >= pos.endsAt);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pos || pos.settled) return;
    setTicks([pos.entryUsd]);
  }, [pos?.startedAt, pos?.entryUsd, pos?.settled]);

  useEffect(() => {
    if (!open || !pos) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch("/api/demo/desk/price");
        const data = (await res.json()) as { usd?: number };
        if (!cancelled && typeof data.usd === "number" && data.usd > 0) {
          setTicks((prev) => [...prev.slice(-47), data.usd as number]);
        }
      } catch {
        /* keep last tick */
      }
    };
    void pull();
    const id = window.setInterval(() => void pull(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, pos?.startedAt]);

  useEffect(() => {
    if (!ready || busy || settling.current) return;
    settling.current = true;
    void act("desk.settle").finally(() => {
      settling.current = false;
    });
  }, [ready, busy, act]);

  const last = ticks[ticks.length - 1] ?? pos?.entryUsd ?? tape?.usd ?? 0;
  const livePct =
    pos && pos.entryUsd > 0 ? ((last - pos.entryUsd) / pos.entryUsd) * 100 : 0;
  const paper = pos ? (pos.side === "long" ? livePct : -livePct) : 0;
  const left = open && pos ? Math.max(0, pos.endsAt - now) : 0;
  const span = pos ? Math.max(1, pos.endsAt - pos.startedAt) : 1;
  const ring = open && pos ? 1 - left / span : 0;

  const mood =
    pos?.settled && pos.won
      ? "win"
      : pos?.settled && pos.won === false
        ? "lose"
        : open
          ? paper >= 0
            ? "up"
            : "down"
          : "idle";

  const slam =
    pos?.settled && ticks.length > 1 && almostFlat(pos, last)
      ? pos.won
        ? "Tape barely moved. You still called the side."
        : "Tape didn't even breathe. Still faded."
      : null;

  return (
    <div className="machine">
      <DeskHud conviction={desk?.conviction ?? 0} tape={tape} />

      <div className={`ride-arena ride-arena--${mood}`}>
        <span className="hold-arena__kicker">
          {open
            ? "live tape"
            : ready
              ? "settling"
              : pos?.settled
                ? pos.won
                  ? "printed"
                  : "faded"
                : "the desk"}
        </span>

        {open || (pos && !pos.settled) ? (
          <>
            <RideChart ticks={ticks} entry={pos!.entryUsd} side={pos!.side} />
            <div className="ride-readout">
              <strong className={paper >= 0 ? "is-up" : "is-down"}>
                {paper >= 0 ? "+" : ""}
                {paper.toFixed(3)}%
              </strong>
              <em>
                now ${formatPx(last)} · {Math.ceil(left / 1000)}s
              </em>
            </div>
            <i className="ride-ring" style={{ ["--t" as string]: ring }} />
          </>
        ) : pos?.settled ? (
          <>
            <strong>
              {pos.won ? "PRINTED" : "FADED"} · {pos.side.toUpperCase()}
            </strong>
            <em>{slam ?? `from $${formatPx(pos.entryUsd)}`}</em>
          </>
        ) : (
          <p>
            Paper long or short live $CATE. The window is twenty seconds. Score,
            not cash.
          </p>
        )}
      </div>

      <div className="btn-row" style={{ marginTop: "1.25rem" }}>
        {open || ready ? (
          <span className="cta-note">
            {open ? "Riding the tape…" : "Settling…"}
          </span>
        ) : (
          <>
            <button
              type="button"
              className="btn btn--gold"
              disabled={busy || !tape}
              onClick={() => void act("desk.open", { side: "long" })}
            >
              Long $CATE
            </button>
            <button
              type="button"
              className="btn btn--line"
              disabled={busy || !tape}
              onClick={() => void act("desk.open", { side: "short" })}
            >
              Short $CATE
            </button>
          </>
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

function RideChart({
  ticks,
  entry,
  side,
}: {
  ticks: number[];
  entry: number;
  side: "long" | "short";
}) {
  const w = 320;
  const h = 118;
  const pad = 10;
  const pts = ticks.length ? ticks : [entry];
  const min = Math.min(entry, ...pts);
  const max = Math.max(entry, ...pts);
  const span = max - min || Math.max(entry * 0.0004, 1e-12);
  const lo = min - span * 0.2;
  const hi = max + span * 0.2;
  const range = hi - lo;
  const x = (i: number) =>
    pad + (i / Math.max(pts.length - 1, 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / range) * (h - pad * 2);
  const d = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  const good = side === "long" ? last >= entry : last < entry;

  return (
    <svg
      className="ride-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="live $CATE paper tape"
    >
      <line
        x1={pad}
        x2={w - pad}
        y1={y(entry)}
        y2={y(entry)}
        className="ride-chart__entry"
      />
      <path d={d} className={`ride-chart__line${good ? " is-up" : " is-down"}`} />
      <circle
        cx={x(pts.length - 1)}
        cy={y(last)}
        r="3.5"
        className={`ride-chart__now${good ? " is-up" : " is-down"}`}
      />
    </svg>
  );
}

function almostFlat(
  pos: { entryUsd: number },
  last: number,
): boolean {
  if (!pos.entryUsd) return true;
  return Math.abs(last - pos.entryUsd) / pos.entryUsd < 0.0005;
}

function formatPx(n: number): string {
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

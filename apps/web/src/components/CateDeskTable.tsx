"use client";

import { useEffect, useRef, useState } from "react";
import { CateMascot } from "@/components/CateMascot";
import { DeskHud } from "@/components/DeskHud";
import { useDesk } from "@/lib/use-desk";

export function CateDeskTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [now, setNow] = useState(() => Date.now());
  const [ticks, setTicks] = useState<number[]>([]);
  const settling = useRef(false);
  const busyRef = useRef(busy);
  busyRef.current = busy;

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
    if (!open || !tape || !(tape.usd > 0)) return;
    setTicks((prev) => {
      if (prev[prev.length - 1] === tape.usd) return prev;
      return [...prev.slice(-47), tape.usd];
    });
  }, [open, tape?.usd, tape?.ts]);

  useEffect(() => {
    if (!ready || busy || settling.current || pos?.settled) return;
    settling.current = true;
    void act("desk.settle", {}, { quiet: true }).finally(() => {
      settling.current = false;
    });
  }, [ready, busy, pos?.settled, act]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || busyRef.current || !tape) return;
      if (pos && !pos.settled) return;
      if (e.key === "l" || e.key === "L") void act("desk.open", { side: "long" });
      if (e.key === "s" || e.key === "S") void act("desk.open", { side: "short" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, tape, pos]);

  const last =
    ticks[ticks.length - 1] ?? pos?.exitUsd ?? pos?.entryUsd ?? tape?.usd ?? 0;
  const livePct =
    pos && pos.entryUsd > 0 ? ((last - pos.entryUsd) / pos.entryUsd) * 100 : 0;
  const paper = pos ? (pos.side === "long" ? livePct : -livePct) : 0;
  const left = open && pos ? Math.max(0, pos.endsAt - now) : 0;
  const span = pos ? Math.max(1, pos.endsAt - pos.startedAt) : 1;
  const ring = open && pos ? 1 - left / span : pos?.settled ? 1 : 0;

  const mood =
    pos?.settled && pos.push
      ? "push"
      : pos?.settled && pos.won
        ? "win"
        : pos?.settled
          ? "lose"
          : open
            ? paper >= 0
              ? "up"
              : "down"
            : "idle";

  const chartTicks =
    pos?.settled && ticks.length < 2
      ? [pos.entryUsd, pos.exitUsd ?? pos.entryUsd]
      : ticks;

  return (
    <div className="machine desk-game">
      <DeskHud
        conviction={desk?.conviction ?? 0}
        tape={tape}
        vault={desk?.vault}
      />

      <div className={`desk-stage ride-arena ride-arena--${mood}`}>
        <CateMascot
          pose="watch"
          mood={
            mood === "win" || mood === "up"
              ? "up"
              : mood === "lose" || mood === "down"
                ? "down"
                : mood === "push"
                  ? "bait"
                  : "idle"
          }
        />
        <span className="hold-arena__kicker">
          {open
            ? `${pos?.side ?? "ride"} · live tape`
            : ready
              ? "settling"
              : pos?.settled
                ? pos.push
                  ? "flat push"
                  : pos.won
                    ? "printed"
                    : "faded"
                : "the desk"}
        </span>

        {pos ? (
          <>
            <div className="ride-meta">
              <b className={pos.side === "long" ? "is-up" : "is-down"}>
                {pos.side.toUpperCase()}
              </b>
              {open || ready ? (
                <span className="ride-count">{Math.ceil(left / 1000)}</span>
              ) : null}
            </div>
            <RideChart ticks={chartTicks} entry={pos.entryUsd} side={pos.side} />
            <div className="ride-readout">
              <strong className={paper >= 0 ? "is-up" : "is-down"}>
                {paper >= 0 ? "+" : ""}
                {paper.toFixed(3)}%
              </strong>
              <em>
                ${formatPx(pos.entryUsd)} → ${formatPx(last)}
                {pos.settled
                  ? pos.push
                    ? " · push"
                    : pos.won
                      ? " · printed"
                      : " · faded"
                  : ` · ${Math.ceil(left / 1000)}s`}
              </em>
            </div>
            <i className="ride-ring" style={{ ["--t" as string]: ring }} />
          </>
        ) : (
          <p>
            Paper long or short live $CATE. Twenty seconds. Flat tape is a
            push — shorts don&apos;t auto-lose.
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
      {open || ready ? null : <p className="desk-keys">L long · S short</p>}
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
  const h = 132;
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
  const lastX = x(pts.length - 1);
  const lastY = y(pts[pts.length - 1] ?? entry);
  const d = pts
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const fill = `${d} L${lastX.toFixed(1)},${(h - pad).toFixed(1)} L${x(0).toFixed(1)},${(h - pad).toFixed(1)} Z`;
  const last = pts[pts.length - 1] ?? entry;
  const good = side === "long" ? last >= entry : last < entry;

  return (
    <svg
      className="ride-chart"
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="live $CATE paper tape"
    >
      <defs>
        <linearGradient id="rideFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={good ? "#5ad19a" : "#e0705a"} stopOpacity="0.35" />
          <stop offset="100%" stopColor={good ? "#5ad19a" : "#e0705a"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#rideFill)" />
      <line
        x1={pad}
        x2={w - pad}
        y1={y(entry)}
        y2={y(entry)}
        className="ride-chart__entry"
      />
      <path d={d} className={`ride-chart__line${good ? " is-up" : " is-down"}`} />
      <circle
        cx={lastX}
        cy={lastY}
        r="4"
        className={`ride-chart__now${good ? " is-up" : " is-down"}`}
      />
    </svg>
  );
}

function formatPx(n: number): string {
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

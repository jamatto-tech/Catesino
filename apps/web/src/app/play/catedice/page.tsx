"use client";

import { useState } from "react";
import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";

export default function CateDicePage() {
  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<"over" | "under">("over");

  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="catedice"
        title="CATEDICE"
        subtitle="was dice · roll 1–100 · over / under · ~1% house edge"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => (
          <>
            <div className="felt-header">
              <span className="felt-header__brand">CateDice</span>
              <span className="felt-header__phase">
                {mode} {target}
              </span>
            </div>
            <div className="instant-result">
              {last ? (
                <>
                  <div className="instant-big mono">{String(last.roll)}</div>
                  <p className="omen" style={{ textAlign: "center" }}>
                    Rolled <em>{String(last.roll)}</em> · {String(last.mode)}{" "}
                    {String(last.target)} ·{" "}
                    {last.won ? (
                      <em>×{Number(last.multiplier).toFixed(2)}</em>
                    ) : (
                      <span className="dim">miss</span>
                    )}
                  </p>
                </>
              ) : (
                <div className="empty-felt">
                  <p>Set the whisker line. Roll the cat&apos;s bones.</p>
                </div>
              )}
            </div>
            <div className="controls" style={{ flexDirection: "column", gap: "1rem" }}>
              <div className="controls">
                <button
                  type="button"
                  className={`btn ${mode === "over" ? "btn--gold" : "btn--line"}`}
                  onClick={() => setMode("over")}
                >
                  Over
                </button>
                <button
                  type="button"
                  className={`btn ${mode === "under" ? "btn--gold" : "btn--line"}`}
                  onClick={() => setMode("under")}
                >
                  Under
                </button>
              </div>
              <label style={{ color: "var(--dim)", fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
                Target {target}
                <input
                  type="range"
                  min={2}
                  max={98}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                  style={{ width: "min(280px, 70vw)", display: "block", marginTop: 8 }}
                />
              </label>
              <button
                type="button"
                className="btn btn--gold"
                disabled={loading}
                onClick={() => void play({ mode, target })}
              >
                Roll CateDice
              </button>
            </div>
          </>
        )}
      </InstantGameShell>
      <CateDrive compact />
    </main>
  );
}

"use client";

import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";

export default function HighCatePage() {
  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="highcate"
        title="HIGHCATE"
        subtitle="was dice total · low 2–6 · high 8–12 · seven 5×"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => (
          <>
            <div className="felt-header">
              <span className="felt-header__brand">HighCate</span>
              <span className="felt-header__phase">two dice</span>
            </div>
            <div className="instant-result">
              {last ? (
                <>
                  <div className="instant-big">
                    {String(last.dieA)} + {String(last.dieB)}
                  </div>
                  <p className="omen" style={{ textAlign: "center" }}>
                    Total <em>{String(last.total)}</em> · pick{" "}
                    <em>{String(last.pick)}</em> · {last.won ? "hit" : "miss"}
                  </p>
                </>
              ) : (
                <div className="empty-felt">
                  <p>High, low, or the lucky seven.</p>
                </div>
              )}
            </div>
            <div className="controls">
              <button
                type="button"
                className="btn btn--line"
                disabled={loading}
                onClick={() => void play({ pick: "low" })}
              >
                Low 2×
              </button>
              <button
                type="button"
                className="btn btn--gold"
                disabled={loading}
                onClick={() => void play({ pick: "seven" })}
              >
                Seven 5×
              </button>
              <button
                type="button"
                className="btn btn--line"
                disabled={loading}
                onClick={() => void play({ pick: "high" })}
              >
                High 2×
              </button>
            </div>
          </>
        )}
      </InstantGameShell>
      <CateDrive compact />
    </main>
  );
}

"use client";

import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";

export default function CateSpinPage() {
  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="catespin"
        title="CATESPIN"
        subtitle="was European roulette · red/black even money · zero 35:1"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => (
          <>
            <div className="felt-header">
              <span className="felt-header__brand">CateSpin</span>
              <span className="felt-header__phase">0–36</span>
            </div>
            <div className="instant-result">
              {last ? (
                <>
                  <div
                    className="instant-big"
                    style={{
                      color:
                        last.color === "red"
                          ? "#e0705a"
                          : last.color === "black"
                            ? "var(--ivory)"
                            : "var(--mint)",
                    }}
                  >
                    {String(last.number)}
                  </div>
                  <p className="omen" style={{ textAlign: "center" }}>
                    <em>{String(last.color)}</em> · you picked{" "}
                    <em>{String(last.pick)}</em> · {last.won ? "hit" : "miss"}
                  </p>
                </>
              ) : (
                <div className="empty-felt">
                  <p>Spin the night wheel for $CATE.</p>
                </div>
              )}
            </div>
            <div className="controls">
              <button
                type="button"
                className="btn btn--line"
                disabled={loading}
                style={{ borderColor: "#e0705a", color: "#e0705a" }}
                onClick={() => void play({ pick: "red" })}
              >
                Red 2×
              </button>
              <button
                type="button"
                className="btn btn--line"
                disabled={loading}
                onClick={() => void play({ pick: "black" })}
              >
                Black 2×
              </button>
              <button
                type="button"
                className="btn btn--gold"
                disabled={loading}
                onClick={() => void play({ pick: "green" })}
              >
                Zero 35:1
              </button>
            </div>
          </>
        )}
      </InstantGameShell>
      <CateDrive compact />
    </main>
  );
}

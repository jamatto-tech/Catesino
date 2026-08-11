"use client";

import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";

export default function CateFlipPage() {
  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="cateflip"
        title="CATEFLIP"
        subtitle="was coin flip · Cate face (heads) or tails · even money"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => (
          <>
            <div className="felt-header">
              <span className="felt-header__brand">CateFlip</span>
              <span className="felt-header__phase">
                {last ? (last.won ? "won" : "lost") : "pick a side"}
              </span>
            </div>
            <div className="instant-result">
              {last ? (
                <>
                  <div className="instant-big">
                    {last.result === "heads" ? "🐱" : "🌑"}
                  </div>
                  <p className="omen" style={{ textAlign: "center" }}>
                    You picked <em>{String(last.pick)}</em> · coin showed{" "}
                    <em>{String(last.result)}</em>
                  </p>
                  <p
                    className={`outcome-banner__credit${last.won ? "" : " lose"}`}
                    style={{ textAlign: "center", marginTop: "0.5rem" }}
                  >
                    {last.won ? "Paid 2×" : "House takes the chip"}
                  </p>
                </>
              ) : (
                <div className="empty-felt">
                  <p>Call it in the air — Cate face or tails.</p>
                </div>
              )}
            </div>
            <div className="controls">
              <button
                type="button"
                className="btn btn--gold"
                disabled={loading}
                onClick={() => void play({ pick: "heads" })}
              >
                Cate face
              </button>
              <button
                type="button"
                className="btn btn--line"
                disabled={loading}
                onClick={() => void play({ pick: "tails" })}
              >
                Tails
              </button>
            </div>
          </>
        )}
      </InstantGameShell>
      <CateDrive compact />
    </main>
  );
}

"use client";

import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";

const EMOJI: Record<string, string> = {
  CATE: "🐱",
  CAT: "🐈",
  GOLD: "🪙",
  MOON: "🌙",
  PAW: "🐾",
  RUG: "📉",
};

export default function CateSlotsPage() {
  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="cateslots"
        title="CATESLOTS"
        subtitle="was slots · triple CATE 25× · CAT 12× · GOLD pair 1.5×"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => {
          const reels = (last?.reels as string[] | undefined) ?? null;
          return (
            <>
              <div className="felt-header">
                <span className="felt-header__brand">CateSlots</span>
                <span className="felt-header__phase">
                  {last ? String(last.winKind) : "spin"}
                </span>
              </div>
              <div className="slots-reels">
                {(reels ?? ["?", "?", "?"]).map((s, i) => (
                  <div key={i} className="slots-reel">
                    <span className="slots-reel__emoji">
                      {EMOJI[s] ?? "✨"}
                    </span>
                    <span className="slots-reel__label">{s}</span>
                  </div>
                ))}
              </div>
              {last ? (
                <p className="omen" style={{ textAlign: "center", marginTop: "1rem" }}>
                  {last.won ? (
                    <>
                      <em>{String(last.winKind)}</em> · ×
                      {String(last.creditMult)}
                    </>
                  ) : (
                    <span className="dim">No line — the rug slips</span>
                  )}
                </p>
              ) : (
                <div className="empty-felt" style={{ minHeight: "auto", padding: "1rem" }}>
                  <p>Pull the lever for $CATE.</p>
                </div>
              )}
              <div className="controls">
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={loading}
                  onClick={() => void play({})}
                >
                  Spin CateSlots
                </button>
              </div>
            </>
          );
        }}
      </InstantGameShell>
      <CateDrive compact />
    </main>
  );
}

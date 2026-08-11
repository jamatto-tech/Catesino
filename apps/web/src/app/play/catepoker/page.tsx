"use client";

import Link from "next/link";
import { InstantGameShell } from "@/components/InstantGameShell";
import { CateDrive } from "@/components/CateDrive";
import { PlayingCard } from "@/components/PlayingCard";

function formatRank(rank?: string): string {
  if (!rank) return "";
  return rank.replace(/_/g, " ");
}

export default function CatePokerPage() {
  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>
      <InstantGameShell
        gameId="catepoker"
        title="CATEPOKER"
        subtitle="was 5-card stud · deal five · instant paytable"
        minBetUsdc={0.5}
        maxBetUsdc={25}
        defaultBetUsdc={1}
      >
        {({ loading, play, last }) => {
          const cards = (last?.cards as string[] | undefined) ?? [];
          return (
            <>
              <div className="felt-header">
                <span className="felt-header__brand">CatePoker</span>
                <span className="felt-header__phase">
                  {last ? formatRank(String(last.handRank)) : "stud"}
                </span>
              </div>
              <div className="cards" style={{ justifyContent: "center", minHeight: "6.5rem" }}>
                {cards.length
                  ? cards.map((c, i) => <PlayingCard key={i} code={c} index={i} />)
                  : null}
              </div>
              {last ? (
                <p className="omen" style={{ textAlign: "center", marginTop: "1rem" }}>
                  <em>{formatRank(String(last.handRank))}</em>
                  {last.won
                    ? ` · ×${String(last.creditMult)}`
                    : " · no pay"}
                </p>
              ) : (
                <div className="empty-felt">
                  <p>Five cards. One hand. No draws — pure stud.</p>
                </div>
              )}
              <div className="controls">
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={loading}
                  onClick={() => void play({})}
                >
                  Deal CatePoker
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

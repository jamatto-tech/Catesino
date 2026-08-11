"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PlayingCard } from "@/components/PlayingCard";
import { CateDrive } from "@/components/CateDrive";

type HandView = {
  phase: string;
  cards: string[];
  held: boolean[];
  handRank?: string;
  creditMult?: number;
  settlement?: { creditAvailableAtomic: string; outcome: string };
};

export default function VideoCatePage() {
  const [availableUsdc, setAvailableUsdc] = useState(100);
  const [lockedUsdc, setLockedUsdc] = useState(0);
  const [betUsdc, setBetUsdc] = useState(1);
  const [hand, setHand] = useState<HandView | null>(null);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    (data: {
      balances?: { availableUsdc: number; lockedUsdc: number };
      hand?: HandView | null;
    }) => {
      if (data.balances) {
        setAvailableUsdc(data.balances.availableUsdc);
        setLockedUsdc(data.balances.lockedUsdc);
      }
      if ("hand" in data) {
        setHand(data.hand ?? null);
        if (data.hand?.phase === "hold") {
          setHeld(data.hand.held?.length === 5 ? data.hand.held : [false, false, false, false, false]);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void fetch("/api/demo/videocate")
      .then((r) => r.json())
      .then(apply)
      .catch(() => setError("Failed to load"));
  }, [apply]);

  const deal = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/videocate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "deal", betUsdc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Deal failed");
        return;
      }
      apply(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const draw = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/videocate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "draw", held }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Draw failed");
        return;
      }
      apply(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    if (hand?.phase !== "hold") return;
    setHeld((h) => h.map((v, j) => (j === i ? !v : v)));
  };

  const inHold = hand?.phase === "hold";

  return (
    <main className="shell play-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← All games
        </Link>
      </p>

      <header className="play-head">
        <div className="logo-coin" style={{ width: 64, marginBottom: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/memes/cate-launch.jpg" alt="" />
        </div>
        <h1>VIDEOCATE</h1>
        <p>was video poker · jacks or better · hold &amp; draw</p>
      </header>

      <div className="table-shell">
        <div className="rail">
          <div className="balance-pills">
            <div className="pill">
              <span className="pill__label">Available</span>
              <span className="pill__value">${availableUsdc.toFixed(2)}</span>
            </div>
            <div className="pill pill--locked">
              <span className="pill__label">Locked</span>
              <span className="pill__value">${lockedUsdc.toFixed(2)}</span>
            </div>
          </div>
          <div className="bet-controls">
            <label className="bet-display">
              <span className="bet-display__label">Bet USDC</span>
              <input
                type="number"
                min={0.5}
                max={25}
                step={0.5}
                value={betUsdc}
                disabled={loading || inHold}
                onChange={(e) => setBetUsdc(Number(e.target.value))}
                style={{
                  background: "transparent",
                  border: "1px solid var(--hair)",
                  color: "var(--gold)",
                  borderRadius: 8,
                  padding: "0.35rem 0.5rem",
                  width: "6rem",
                  fontFamily: "var(--mono)",
                }}
              />
            </label>
            {!inHold ? (
              <button
                type="button"
                className="btn btn--gold btn--sm"
                disabled={loading}
                onClick={() => void deal()}
              >
                Deal
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--gold btn--sm"
                disabled={loading}
                onClick={() => void draw()}
              >
                Draw
              </button>
            )}
          </div>
        </div>

        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="felt instant-felt">
          <div className="felt-header">
            <span className="felt-header__brand">VideoCate</span>
            <span className="felt-header__phase">
              {hand?.phase?.replace(/_/g, " ") ?? "ready"}
            </span>
          </div>

          {!hand ? (
            <div className="empty-felt">
              <p>Deal five. Hold the winners. Draw for $CATE.</p>
            </div>
          ) : (
            <>
              <div className="vp-row">
                {hand.cards.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    className={`vp-card${held[i] && inHold ? " vp-card--held" : ""}`}
                    onClick={() => toggle(i)}
                    disabled={!inHold || loading}
                    aria-pressed={held[i]}
                  >
                    <PlayingCard code={c} index={i} />
                    {inHold ? (
                      <span className="vp-hold-label">
                        {held[i] ? "HOLD" : "tap"}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
              {hand.phase === "settled" ? (
                <div className="outcome-banner" style={{ marginTop: "1.25rem" }}>
                  <div className="outcome-banner__label">Hand</div>
                  <div className="outcome-banner__result">
                    {(hand.handRank ?? "high card").replace(/_/g, " ")}
                  </div>
                  <div className="outcome-banner__credit">
                    {hand.creditMult && hand.creditMult > 0
                      ? `×${hand.creditMult} credit`
                      : "No pay"}
                  </div>
                </div>
              ) : (
                <p
                  className="omen"
                  style={{ textAlign: "center", marginTop: "1rem", fontSize: "1rem" }}
                >
                  Tap cards to <em>hold</em>, then draw.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <CateDrive compact />
    </main>
  );
}

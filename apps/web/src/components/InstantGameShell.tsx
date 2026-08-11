"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type Props = {
  gameId: "cateflip" | "catedice" | "catespin" | "highcate" | "cateslots" | "catepoker";
  title: string;
  subtitle: string;
  minBetUsdc: number;
  maxBetUsdc: number;
  defaultBetUsdc: number;
  children: (ctx: {
    betUsdc: number;
    setBetUsdc: (n: number) => void;
    loading: boolean;
    play: (body: Record<string, unknown>) => Promise<void>;
    last: Record<string, unknown> | null;
  }) => ReactNode;
};

export function InstantGameShell({
  gameId,
  title,
  subtitle,
  minBetUsdc,
  maxBetUsdc,
  defaultBetUsdc,
  children,
}: Props) {
  const [availableUsdc, setAvailableUsdc] = useState(100);
  const [lockedUsdc, setLockedUsdc] = useState(0);
  const [betUsdc, setBetUsdc] = useState(defaultBetUsdc);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(() => {
    void fetch("/api/demo/state")
      .then((r) => r.json())
      .then((data: { balances?: { availableUsdc: number; lockedUsdc: number } }) => {
        if (data.balances) {
          setAvailableUsdc(data.balances.availableUsdc);
          setLockedUsdc(data.balances.lockedUsdc);
        }
      })
      .catch(() => setError("Failed to load balance"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const play = async (extra: Record<string, unknown>) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/instant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game: gameId, betUsdc, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Play failed");
        return;
      }
      if (data.balances) {
        setAvailableUsdc(data.balances.availableUsdc);
        setLockedUsdc(data.balances.lockedUsdc);
      }
      setLast(data.result ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="table-shell">
      <header className="play-head" style={{ paddingTop: "1rem" }}>
        <div className="logo-coin" style={{ width: 64, marginBottom: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/memes/cate-launch.jpg" alt="" />
        </div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </header>

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
            <span className="bet-display__label">
              Bet (${minBetUsdc}–${maxBetUsdc})
            </span>
            <input
              type="number"
              min={minBetUsdc}
              max={maxBetUsdc}
              step={0.5}
              value={betUsdc}
              disabled={loading}
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
        </div>
      </div>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="felt instant-felt">
        {children({ betUsdc, setBetUsdc, loading, play, last })}
      </div>
    </div>
  );
}

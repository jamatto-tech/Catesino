"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PlayingCard } from "@/components/PlayingCard";

type HandView = {
  handId: string;
  phase: string;
  betAtomic: string;
  playerCards: string[];
  dealerCards: (string | "??")[];
  outcome?: string;
  settlement?: {
    outcome: string;
    creditAvailableAtomic: string;
  };
};

type Props = {
  minBetUsdc: number;
  maxBetUsdc: number;
  defaultBetUsdc: number;
};

const CHIP_OPTIONS = [0.5, 1, 5, 25] as const;

function formatOutcome(outcome?: string): string {
  if (!outcome) return "—";
  return outcome.replace(/_/g, " ");
}

function chipClass(v: number): string {
  if (v <= 0.5) return "chip";
  if (v <= 1) return "chip";
  if (v <= 5) return "chip chip--5";
  return "chip chip--25";
}

function chipLabel(v: number): string {
  return v < 1 ? `${v}` : `${v}`;
}

export function BlackjackTable({ minBetUsdc, maxBetUsdc, defaultBetUsdc }: Props) {
  const chips = useMemo(
    () => CHIP_OPTIONS.filter((c) => c >= minBetUsdc && c <= maxBetUsdc),
    [minBetUsdc, maxBetUsdc],
  );

  const [availableUsdc, setAvailableUsdc] = useState(100);
  const [lockedUsdc, setLockedUsdc] = useState(0);
  const [betUsdc, setBetUsdc] = useState(defaultBetUsdc);
  const [hand, setHand] = useState<HandView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyPayload = useCallback(
    (data: {
      balances?: { availableUsdc: number; lockedUsdc: number };
      hand?: HandView | null;
      error?: string;
    }) => {
      if (data.balances) {
        setAvailableUsdc(data.balances.availableUsdc);
        setLockedUsdc(data.balances.lockedUsdc);
      }
      if ("hand" in data) setHand(data.hand ?? null);
    },
    [],
  );

  useEffect(() => {
    void fetch("/api/demo/state")
      .then((r) => r.json())
      .then(applyPayload)
      .catch(() => setError("Failed to load demo state"));
  }, [applyPayload]);

  const deal = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/deal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ betUsdc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Deal failed");
        return;
      }
      applyPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const act = async (action: "hit" | "stand" | "double") => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      applyPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const addChip = (v: number) => {
    setBetUsdc((prev) => {
      const next = Math.round((prev + v) * 100) / 100;
      if (next > maxBetUsdc) return maxBetUsdc;
      if (next < minBetUsdc) return minBetUsdc;
      return next;
    });
  };

  const dealerCards = hand?.dealerCards ?? [];
  const playerCards = hand?.playerCards ?? [];
  const creditUsdc = hand?.settlement
    ? Number(hand.settlement.creditAvailableAtomic) / 1e6
    : null;
  const isLose =
    hand?.outcome === "player_lose" ||
    hand?.outcome === "player_bust" ||
    hand?.outcome === "dealer_blackjack";
  const phaseLabel = (hand?.phase ?? "waiting").replace(/_/g, " ");
  const inHand = hand && hand.phase !== "settled";

  return (
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
          <div className="chip-row" role="group" aria-label="Chip denominations">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                className={chipClass(c)}
                data-active={betUsdc === c ? "true" : "false"}
                disabled={loading || Boolean(inHand)}
                onClick={() => {
                  if (betUsdc === c) addChip(c);
                  else setBetUsdc(c);
                }}
                title={`$${c} USDC`}
              >
                {chipLabel(c)}
              </button>
            ))}
          </div>

          <div className="bet-display">
            <span className="bet-display__label">Bet</span>
            <span className="bet-display__value">${betUsdc.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className="btn btn--line btn--sm"
            disabled={loading || Boolean(inHand)}
            onClick={() => setBetUsdc(minBetUsdc)}
          >
            Clear
          </button>
          <button
            type="button"
            className="btn btn--gold btn--sm"
            onClick={() => void deal()}
            disabled={loading || Boolean(inHand)}
          >
            {loading && !hand ? "Dealing…" : "Deal"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert" role="alert">
          {error}
        </div>
      ) : null}

      <div className="felt" data-testid="blackjack-felt">
        <div className="felt-header">
          <span className="felt-header__brand">BlackCate Felt</span>
          <span className="felt-header__phase">{phaseLabel}</span>
        </div>

        {!hand ? (
          <div className="empty-felt">
            <p>Place a chip and deal — the shoe is waiting.</p>
          </div>
        ) : (
          <>
            <div className="hand-row">
              <h3>Dealer</h3>
              <div className="cards">
                {dealerCards.map((c, i) => (
                  <PlayingCard key={`d-${i}`} code={String(c)} index={i} />
                ))}
              </div>
            </div>

            <div className="hand-row">
              <h3>You · ${Number(hand.betAtomic) / 1e6}</h3>
              <div className="cards">
                {playerCards.map((c, i) => (
                  <PlayingCard key={`p-${i}`} code={c} index={i} />
                ))}
              </div>
            </div>

            {hand.phase === "player_turn" ? (
              <div className="controls">
                <button
                  type="button"
                  className="btn btn--line"
                  disabled={loading}
                  onClick={() => void act("hit")}
                >
                  Hit
                </button>
                <button
                  type="button"
                  className="btn btn--gold"
                  disabled={loading}
                  onClick={() => void act("stand")}
                >
                  Stand
                </button>
                <button
                  type="button"
                  className="btn btn--line"
                  disabled={loading}
                  onClick={() => void act("double")}
                >
                  Double
                </button>
              </div>
            ) : null}

            {hand.phase === "settled" && hand.settlement ? (
              <div
                className={`outcome-banner${isLose ? " outcome-banner--lose" : ""}`}
              >
                <div className="outcome-banner__label">Hand settled</div>
                <div className="outcome-banner__result">
                  {formatOutcome(hand.outcome)}
                </div>
                {creditUsdc !== null ? (
                  <div className="outcome-banner__credit">
                    {isLose
                      ? `−$${Number(hand.betAtomic) / 1e6}`
                      : `+$${creditUsdc.toFixed(2)} returned`}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

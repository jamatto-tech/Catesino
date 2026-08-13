"use client";

import type { CateTape } from "@/lib/use-desk";

export function DeskHud({
  conviction,
  tape,
  hideChange = false,
}: {
  conviction: number;
  tape: CateTape | null;
  hideChange?: boolean;
}) {
  return (
    <div className="machine__stats" style={{ marginBottom: "1.25rem" }}>
      <div className="pill">
        <span className="pill__label">Score</span>
        <span className="pill__value">{conviction}</span>
      </div>
      <div className="pill">
        <span className="pill__label">$CATE</span>
        <span className="pill__value">
          {tape ? `$${formatPx(tape.usd)}` : "—"}
          {tape && !hideChange ? (
            <em>
              {" "}
              {tape.change24h >= 0 ? "+" : ""}
              {tape.change24h.toFixed(1)}%
            </em>
          ) : null}
        </span>
      </div>
    </div>
  );
}

function formatPx(n: number): string {
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

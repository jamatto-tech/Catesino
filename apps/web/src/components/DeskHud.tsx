"use client";

import { CateMascot } from "@/components/CateMascot";
import { isVaultToday } from "@/lib/desk-logic";
import type { CateTape, DeskPublic } from "@/lib/use-desk";

export function DeskHud({
  conviction,
  tape,
  vault,
}: {
  conviction: number;
  tape: CateTape | null;
  vault?: DeskPublic["vault"];
}) {
  const hideChange = !isVaultToday(vault);
  return (
    <div className="desk-hud">
      <CateMascot pose="coin" />
      <div className="desk-hud__pills">
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
    </div>
  );
}

function formatPx(n: number): string {
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toPrecision(4);
}

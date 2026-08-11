import { NextResponse } from "next/server";
import { publicHandView } from "@catesino/blackjack";
import { demoBalances, getDemoTable } from "@/lib/demo-session";
import { getServerConfig } from "@/lib/server-config";
import { atomicToUsdc } from "@catesino/config";

export const runtime = "nodejs";

export async function GET() {
  const table = getDemoTable();
  const { config } = getServerConfig();
  const bal = demoBalances(table);
  const hand = table.hand
    ? publicHandView(table.hand, table.hand.phase === "settled")
    : null;

  return NextResponse.json({
    mode: "demo",
    balances: {
      availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
      lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
    },
    betLimits: {
      minUsdc: config.betLimits.minUsdc,
      maxUsdc: config.betLimits.maxUsdc,
    },
    hand,
    note: "Demo credits only — not real USDC. Real funds use /api/me/* after SIWS login.",
  });
}

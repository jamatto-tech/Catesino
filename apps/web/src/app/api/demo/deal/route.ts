import { NextResponse } from "next/server";
import { createHand, publicHandView } from "@catesino/blackjack";
import { isBetWithinLimits, usdcToAtomic, atomicToUsdc } from "@catesino/config";
import { getServerConfig } from "@/lib/server-config";
import {
  demoBalances,
  getDemoTable,
  lockBet,
  settleHand,
} from "@/lib/demo-session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { betUsdc?: number };
  const { config } = getServerConfig();
  const table = getDemoTable();

  if (table.hand && table.hand.phase !== "settled") {
    return NextResponse.json(
      { error: "Finish the current hand first" },
      { status: 400 },
    );
  }

  const betUsdc = Number(body.betUsdc);
  if (!Number.isFinite(betUsdc)) {
    return NextResponse.json({ error: "Invalid bet" }, { status: 400 });
  }
  const betAtomic = usdcToAtomic(betUsdc);
  if (!isBetWithinLimits(betAtomic, config.betLimits)) {
    return NextResponse.json(
      {
        error: `Bet must be between ${config.betLimits.minUsdc} and ${config.betLimits.maxUsdc} USDC`,
      },
      { status: 400 },
    );
  }

  try {
    lockBet(table.ledger, table.userId, betAtomic, `lock-${table.nonce}`);
    const hand = createHand({
      handId: `hand-${table.nonce}`,
      betAtomic,
      clientSeed: `web-${table.nonce}`,
      nonce: table.nonce,
    });
    table.nonce += 1;
    if (hand.phase === "settled" && hand.settlement) {
      settleHand(
        table.ledger,
        table.userId,
        hand.settlement,
        `settle-${hand.handId}`,
      );
    }
    table.hand = hand;
    const bal = demoBalances(table);
    return NextResponse.json({
      balances: {
        availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
        lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
      },
      hand: publicHandView(hand, hand.phase === "settled"),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

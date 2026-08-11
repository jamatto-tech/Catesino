import { NextResponse } from "next/server";
import { applyAction, publicHandView } from "@catesino/blackjack";
import type { BlackjackAction } from "@catesino/game-protocol";
import { atomicToUsdc } from "@catesino/config";
import {
  demoBalances,
  getDemoTable,
  lockBet,
  settleHand,
} from "@/lib/demo-session";

export const runtime = "nodejs";

const ACTIONS = new Set<BlackjackAction>(["hit", "stand", "double"]);

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string };
  const action = body.action as BlackjackAction | undefined;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const table = getDemoTable();
  if (!table.hand || table.hand.phase !== "player_turn") {
    return NextResponse.json({ error: "No active player turn" }, { status: 400 });
  }

  try {
    const prevBet = table.hand.betAtomic;
    const hand = applyAction(table.hand, action);
    if (hand.doubled && hand.betAtomic > prevBet) {
      lockBet(
        table.ledger,
        table.userId,
        hand.betAtomic - prevBet,
        `double-${hand.handId}`,
      );
    }
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

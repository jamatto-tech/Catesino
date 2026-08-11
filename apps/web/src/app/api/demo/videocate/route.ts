import { NextResponse } from "next/server";
import { dealVideoCate, drawVideoCate } from "@catesino/house-games";
import {
  isBetWithinLimits,
  usdcToAtomic,
  atomicToUsdc,
  loadConfig,
} from "@catesino/config";
import {
  demoBalances,
  getDemoTable,
  lockBet,
  nextNonce,
  settleHand,
} from "@/lib/demo-session";

export const runtime = "nodejs";

function publicVideo(state: NonNullable<ReturnType<typeof getDemoTable>["videoCate"]>) {
  return {
    phase: state.phase,
    cards: state.cards,
    held: state.held,
    betAtomic: state.betAtomic.toString(),
    serverSeedCommit: state.serverSeedCommit,
    clientSeed: state.clientSeed,
    nonce: state.nonce,
    handRank: state.handRank,
    creditMult: state.creditMult,
    settlement: state.settlement
      ? {
          outcome: state.settlement.outcome,
          betAtomic: state.settlement.betAtomic.toString(),
          creditAvailableAtomic: state.settlement.creditAvailableAtomic.toString(),
          houseEquityDeltaAtomic:
            state.settlement.houseEquityDeltaAtomic.toString(),
        }
      : undefined,
    /** Reveal seed only after settle */
    serverSeed: state.phase === "settled" ? state.serverSeed : undefined,
  };
}

export async function GET() {
  const table = getDemoTable();
  const bal = demoBalances(table);
  return NextResponse.json({
    balances: {
      availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
      lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
    },
    hand: table.videoCate ? publicVideo(table.videoCate) : null,
  });
}

export async function POST(req: Request) {
  const config = loadConfig();
  if (!config.flags.videocateEnabled) {
    return NextResponse.json({ error: "VideoCate disabled" }, { status: 403 });
  }

  const body = (await req.json()) as {
    action?: "deal" | "draw";
    betUsdc?: number;
    held?: boolean[];
  };

  const table = getDemoTable();

  try {
    if (body.action === "deal") {
      if (table.hand && table.hand.phase !== "settled") {
        throw new Error("Finish your BlackCate hand first");
      }
      if (table.videoCate && table.videoCate.phase === "hold") {
        throw new Error("Finish current VideoCate hand first");
      }

      const betUsdc = Number(body.betUsdc);
      if (!Number.isFinite(betUsdc)) throw new Error("Invalid bet");
      const betAtomic = usdcToAtomic(betUsdc);
      if (!isBetWithinLimits(betAtomic, config.betLimits)) {
        throw new Error(
          `Bet must be between ${config.betLimits.minUsdc} and ${config.betLimits.maxUsdc} USDC`,
        );
      }

      const nonce = nextNonce(table);
      lockBet(table.ledger, table.userId, betAtomic, `lock-videocate-${nonce}`);
      table.videoCate = dealVideoCate({
        betAtomic,
        nonce,
        clientSeed: `demo-vp-${nonce}`,
      });

      const bal = demoBalances(table);
      return NextResponse.json({
        balances: {
          availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
          lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
        },
        hand: publicVideo(table.videoCate),
      });
    }

    if (body.action === "draw") {
      if (!table.videoCate || table.videoCate.phase !== "hold") {
        throw new Error("No VideoCate hand to draw");
      }
      const held = body.held;
      if (!held || held.length !== 5) throw new Error("held must be 5 booleans");

      const next = drawVideoCate(table.videoCate, held);
      if (!next.settlement) throw new Error("missing settlement");
      settleHand(
        table.ledger,
        table.userId,
        next.settlement,
        `settle-videocate-${next.nonce}`,
      );
      table.videoCate = next;

      const bal = demoBalances(table);
      return NextResponse.json({
        balances: {
          availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
          lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
        },
        hand: publicVideo(next),
      });
    }

    return NextResponse.json({ error: "action deal|draw required" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

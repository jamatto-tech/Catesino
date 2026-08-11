import { NextResponse } from "next/server";
import {
  playCateDice,
  playCateFlip,
  playCateSpin,
  playHighCate,
  playCateSlots,
  playCatePoker,
  type CateSide,
  type DiceMode,
  type HighCatePick,
  type SpinPick,
} from "@catesino/house-games";
import {
  isBetWithinLimits,
  usdcToAtomic,
  atomicToUsdc,
  loadConfig,
} from "@catesino/config";
import {
  assertNoBlockingHand,
  demoBalances,
  getDemoTable,
  lockBet,
  nextNonce,
  settleHand,
} from "@/lib/demo-session";

export const runtime = "nodejs";

type InstantGame =
  | "cateflip"
  | "catedice"
  | "catespin"
  | "highcate"
  | "cateslots"
  | "catepoker";

function serializeResult(result: {
  betAtomic: bigint;
  settlement: {
    betAtomic: bigint;
    creditAvailableAtomic: bigint;
    houseEquityDeltaAtomic: bigint;
    outcome: string;
  };
  [k: string]: unknown;
}) {
  return {
    ...result,
    betAtomic: result.betAtomic.toString(),
    settlement: {
      ...result.settlement,
      betAtomic: result.settlement.betAtomic.toString(),
      creditAvailableAtomic: result.settlement.creditAvailableAtomic.toString(),
      houseEquityDeltaAtomic: result.settlement.houseEquityDeltaAtomic.toString(),
    },
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    game?: InstantGame;
    betUsdc?: number;
    pick?: string;
    mode?: string;
    target?: number;
  };

  const config = loadConfig();
  const game = body.game;
  if (!game) {
    return NextResponse.json({ error: "game required" }, { status: 400 });
  }

  const enabled: Record<InstantGame, boolean> = {
    cateflip: config.flags.cateflipEnabled,
    catedice: config.flags.catediceEnabled,
    catespin: config.flags.catespinEnabled,
    highcate: config.flags.highcateEnabled,
    cateslots: config.flags.cateslotsEnabled,
    catepoker: config.flags.catepokerEnabled,
  };
  if (!enabled[game]) {
    return NextResponse.json({ error: "Game disabled" }, { status: 403 });
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

  const table = getDemoTable();

  try {
    assertNoBlockingHand(table);
    const nonce = nextNonce(table);
    lockBet(table.ledger, table.userId, betAtomic, `lock-${game}-${nonce}`);

    let result:
      | ReturnType<typeof playCateFlip>
      | ReturnType<typeof playCateDice>
      | ReturnType<typeof playCateSpin>
      | ReturnType<typeof playHighCate>
      | ReturnType<typeof playCateSlots>
      | ReturnType<typeof playCatePoker>;

    if (game === "cateflip") {
      const pick = body.pick as CateSide;
      if (pick !== "heads" && pick !== "tails") {
        throw new Error("pick heads or tails");
      }
      result = playCateFlip({
        pick,
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    } else if (game === "catedice") {
      const mode = body.mode as DiceMode;
      if (mode !== "over" && mode !== "under") {
        throw new Error("mode over or under");
      }
      result = playCateDice({
        mode,
        target: Number(body.target ?? 50),
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    } else if (game === "catespin") {
      const pick = body.pick as SpinPick;
      if (pick !== "red" && pick !== "black" && pick !== "green") {
        throw new Error("pick red, black, or green");
      }
      result = playCateSpin({
        pick,
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    } else if (game === "highcate") {
      const pick = body.pick as HighCatePick;
      if (pick !== "high" && pick !== "low" && pick !== "seven") {
        throw new Error("pick high, low, or seven");
      }
      result = playHighCate({
        pick,
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    } else if (game === "cateslots") {
      result = playCateSlots({
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    } else {
      result = playCatePoker({
        betAtomic,
        nonce,
        clientSeed: `demo-${nonce}`,
      });
    }

    settleHand(
      table.ledger,
      table.userId,
      result.settlement,
      `settle-${game}-${nonce}`,
    );

    const bal = demoBalances(table);
    return NextResponse.json({
      balances: {
        availableUsdc: atomicToUsdc(BigInt(bal.availableAtomic)),
        lockedUsdc: atomicToUsdc(BigInt(bal.lockedAtomic)),
      },
      result: serializeResult(result),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}

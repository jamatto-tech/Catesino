import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import { fetchCateTape } from "@/lib/cate-price";
import {
  deskSecret,
  grantDeskYarn,
  loadDesk,
  publicDesk,
  saveDesk,
} from "@/lib/desk-api";
import {
  callVault,
  finishHold,
  flipTape,
  openPosition,
  settlePosition,
  type DeskSide,
} from "@/lib/desk-session";
import type { VaultCall } from "@/lib/cate-price";

export const runtime = "nodejs";

const SIDES = new Set(["long", "short"]);
const CALLS = new Set(["skip", "buy", "big"]);

export async function POST(req: Request) {
  try {
    const { config } = getServerConfig();
    const body = (await req.json()) as {
      action?: string;
      side?: string;
      pick?: string;
      survived?: boolean;
      held?: number;
      total?: number;
    };
    let state = await loadDesk(config);
    let yarn = 0;
    let extra: Record<string, unknown> = {};

    switch (body.action) {
      case "hold.finish": {
        const finished = finishHold(state, {
          survived: Boolean(body.survived),
          held: Number(body.held ?? 0),
          total: Number(body.total ?? 10),
        });
        state = finished.state;
        yarn = await grantDeskYarn(config, finished.yarn);
        extra = {
          won: finished.state.hold?.survived ?? false,
          convictionDelta: finished.conviction,
          yarn,
        };
        break;
      }
      case "desk.open": {
        if (!body.side || !SIDES.has(body.side)) {
          return jsonError("pick long or short", 400);
        }
        const tape = await fetchCateTape();
        state = openPosition(state, body.side as DeskSide, tape.usd);
        extra = { entryUsd: tape.usd };
        break;
      }
      case "desk.settle": {
        const tape = await fetchCateTape();
        const settled = settlePosition(state, tape.usd);
        state = settled.state;
        extra = {
          won: settled.won,
          convictionDelta: settled.conviction,
          exitUsd: tape.usd,
        };
        break;
      }
      case "vault.call": {
        if (!body.pick || !CALLS.has(body.pick)) {
          return jsonError("pick skip, buy, or big", 400);
        }
        const tape = await fetchCateTape();
        const called = callVault(state, body.pick as VaultCall, tape.change24h);
        state = called.state;
        yarn = await grantDeskYarn(config, called.yarn);
        extra = {
          won: called.won,
          convictionDelta: called.conviction,
          yarn,
          change24h: tape.change24h,
        };
        break;
      }
      case "tape.flip": {
        if (!body.side || !SIDES.has(body.side)) {
          return jsonError("pick long or short", 400);
        }
        const flip = flipTape(state, body.side as DeskSide, deskSecret(config));
        state = flip.state;
        extra = {
          won: flip.won,
          result: flip.result,
          convictionDelta: flip.conviction,
        };
        break;
      }
      default:
        return jsonError("unknown action", 400);
    }

    await saveDesk(state, config);
    let tape = null;
    try {
      tape = await fetchCateTape();
    } catch {
      tape = null;
    }
    return jsonOk({ desk: publicDesk(state), tape, yarn, ...extra });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

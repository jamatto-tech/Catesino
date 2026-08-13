import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import {
  deskSecret,
  grantDeskYarn,
  loadTickedDesk,
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
    const loaded = await loadTickedDesk(config);
    let state = loaded.state;
    const tape = loaded.tape;
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
        if (!tape) return jsonError("price feed unavailable", 503);
        state = openPosition(state, body.side as DeskSide, tape.usd);
        extra = { entryUsd: tape.usd };
        break;
      }
      case "desk.settle": {
        if (loaded.ride) {
          extra = {
            won: loaded.ride.won,
            push: loaded.ride.push,
            convictionDelta: loaded.ride.conviction,
            exitUsd: loaded.ride.exitUsd,
            already: loaded.ride.already,
          };
          break;
        }
        if (state.position?.settled) {
          extra = {
            won: Boolean(state.position.won),
            push: Boolean(state.position.push),
            convictionDelta: 0,
            exitUsd: state.position.exitUsd,
            already: true,
          };
          break;
        }
        if (!tape) return jsonError("price feed unavailable", 503);
        const settled = settlePosition(state, tape.usd);
        state = settled.state;
        extra = {
          won: settled.won,
          push: settled.push,
          convictionDelta: settled.conviction,
          exitUsd: settled.exitUsd,
          already: settled.already,
        };
        break;
      }
      case "vault.call": {
        if (!body.pick || !CALLS.has(body.pick)) {
          return jsonError("pick skip, buy, or big", 400);
        }
        if (!tape) return jsonError("price feed unavailable", 503);
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
    return jsonOk({
      desk: publicDesk(state),
      tape,
      yarn,
      ...extra,
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

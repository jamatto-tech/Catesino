import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import {
  loadDemoGacha,
  markDemoUltra,
  saveDemoGacha,
  toPublicState,
  upgradeDemoUltra,
} from "@/lib/gacha-demo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { config } = getServerConfig();
    if (!config.flags.gachaEnabled) {
      return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
    }
    const body = (await req.json()) as {
      action?: string;
      itemId?: string;
    };
    const itemId = body.itemId?.trim() ?? "";
    if (!itemId) return jsonError("pick a mint", 400);

    const loaded = await loadDemoGacha(config);
    const next =
      body.action === "mark"
        ? markDemoUltra(loaded.state, itemId)
        : body.action === "upgrade"
          ? upgradeDemoUltra(loaded.state, itemId)
          : null;
    if (!next) return jsonError("unknown nft action", 400);

    await saveDemoGacha(next, config);
    return jsonOk(toPublicState(next, config));
  } catch (e) {
    return errorFromUnknown(e);
  }
}

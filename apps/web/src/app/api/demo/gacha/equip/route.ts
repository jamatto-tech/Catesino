import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import {
  equipDemoGacha,
  loadDemoGacha,
  saveDemoGacha,
  toPublicState,
} from "@/lib/gacha-demo";

export const runtime = "nodejs";

const SLOTS = new Set(["frame", "title", "lobbyFlair"]);

export async function POST(req: Request) {
  try {
    const { config } = getServerConfig();
    if (!config.flags.gachaEnabled) {
      return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
    }
    const body = (await req.json()) as {
      slot?: string;
      itemId?: string | null;
    };
    if (!body.slot || !SLOTS.has(body.slot)) {
      return jsonError("slot must be frame, title, or lobbyFlair", 400);
    }
    const loaded = await loadDemoGacha(config);
    const next = equipDemoGacha(
      loaded.state,
      body.slot as "frame" | "title" | "lobbyFlair",
      body.itemId === undefined ? null : body.itemId,
    );
    await saveDemoGacha(next, config);
    return jsonOk(toPublicState(next, config));
  } catch (e) {
    return errorFromUnknown(e);
  }
}

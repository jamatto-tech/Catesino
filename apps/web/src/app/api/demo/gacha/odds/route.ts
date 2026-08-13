import { getServerConfig } from "@/lib/server-config";
import { jsonError, jsonOk } from "@/lib/http";
import { publicOddsPayload } from "@/lib/gacha-demo";

export const runtime = "nodejs";

export async function GET() {
  const { config } = getServerConfig();
  if (!config.flags.gachaEnabled) {
    return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
  }
  return jsonOk(publicOddsPayload(config));
}

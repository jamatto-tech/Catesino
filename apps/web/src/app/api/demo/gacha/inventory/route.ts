import { getServerConfig } from "@/lib/server-config";
import { jsonError, jsonOk } from "@/lib/http";
import { loadDemoGacha, saveDemoGacha, toPublicState } from "@/lib/gacha-demo";

export const runtime = "nodejs";

export async function GET() {
  const { config } = getServerConfig();
  if (!config.flags.gachaEnabled) {
    return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
  }
  const loaded = await loadDemoGacha(config);
  if (loaded.minted || loaded.faucetGranted > 0) {
    await saveDemoGacha(loaded.state, config);
  }
  const pub = toPublicState(loaded.state, config);
  return jsonOk({
    mode: pub.mode,
    yarn: pub.yarn,
    equipped: pub.equipped,
    inventory: pub.inventory,
  });
}

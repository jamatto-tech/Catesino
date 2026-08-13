import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import {
  loadDemoGacha,
  logPull,
  pullDemoGacha,
  saveDemoGacha,
  toPublicState,
} from "@/lib/gacha-demo";
import { allowGachaPull, clientIp } from "@/lib/gacha-rate-limit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { config } = getServerConfig();
    if (!config.flags.gachaEnabled) {
      return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
    }

    let clientSeed: string | undefined;
    try {
      const body = (await req.json()) as { clientSeed?: unknown };
      if (typeof body.clientSeed === "string") clientSeed = body.clientSeed;
    } catch {
      // empty body is fine
    }

    const loaded = await loadDemoGacha(config);
    if (!allowGachaPull(clientIp(req), loaded.state.demoId)) {
      return jsonError("slow down", 429);
    }

    const pulled = pullDemoGacha(loaded.state, config, clientSeed);
    await saveDemoGacha(pulled.state, config);
    logPull(pulled.state, pulled.receipt);

    return jsonOk({
      ...toPublicState(pulled.state, config),
      receipt: pulled.receipt,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "yarn_empty") {
      return jsonError("out of yarn", 400, { reason: "yarn_empty" });
    }
    return errorFromUnknown(e);
  }
}

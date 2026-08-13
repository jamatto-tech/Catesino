import { getServerConfig } from "@/lib/server-config";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";
import {
  claimBagworkYarn,
  loadDemoGacha,
  saveDemoGacha,
  toPublicState,
} from "@/lib/gacha-demo";
import {
  fetchTweetText,
  parseTweetUrl,
  tweetMentionsCate,
} from "@/lib/gacha-bagwork";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { config } = getServerConfig();
    if (!config.flags.gachaEnabled) {
      return jsonError("Gacha disabled (FF_GACHA_ENABLED)", 403);
    }
    const body = (await req.json()) as { url?: string };
    const parsed = parseTweetUrl(body.url ?? "");
    if (!parsed) {
      return jsonError("paste a public X post URL", 400);
    }

    const text = await fetchTweetText(parsed.url);
    if (!tweetMentionsCate(text)) {
      return jsonError(
        "that post has to mention $CATE, Catesino, or cate.meme",
        400,
      );
    }

    const loaded = await loadDemoGacha(config);
    const claimed = claimBagworkYarn(loaded.state, config, parsed.tweetId);
    await saveDemoGacha(claimed.state, config);
    return jsonOk({
      ...toPublicState(claimed.state, config),
      granted: claimed.granted,
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

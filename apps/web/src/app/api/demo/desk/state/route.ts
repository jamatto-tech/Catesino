import { getServerConfig } from "@/lib/server-config";
import { jsonOk } from "@/lib/http";
import { loadDesk, publicDesk } from "@/lib/desk-api";
import { fetchCateTape } from "@/lib/cate-price";

export const runtime = "nodejs";

export async function GET() {
  const { config } = getServerConfig();
  const state = await loadDesk(config);
  let tape = null;
  try {
    tape = await fetchCateTape();
  } catch {
    tape = null;
  }
  return jsonOk({ desk: publicDesk(state), tape });
}

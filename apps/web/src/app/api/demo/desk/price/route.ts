import { jsonError, jsonOk } from "@/lib/http";
import { fetchCateTape } from "@/lib/cate-price";

export const runtime = "nodejs";

export async function GET() {
  try {
    return jsonOk(await fetchCateTape());
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : String(e), 503);
  }
}

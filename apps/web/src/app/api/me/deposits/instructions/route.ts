import { depositInstructions } from "@/lib/custody/deposit-service";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Public-ish deposit instructions (no secrets).
 * Auth not required to show address; claim still requires session.
 * Demo play ignores this endpoint.
 */
export async function GET() {
  return jsonOk({
    mode: "real",
    ...depositInstructions(),
  });
}

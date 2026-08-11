import { getSession } from "@/lib/auth/session";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/** Current real-wallet session (null if only using demo). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonOk({ authenticated: false, walletPubkey: null });
  }
  return jsonOk({
    authenticated: true,
    walletPubkey: session.walletPubkey,
  });
}

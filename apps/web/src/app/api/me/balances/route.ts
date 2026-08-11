import { atomicToUsdc } from "@catesino/config";
import { requireSession } from "@/lib/auth/session";
import { userBalances } from "@/lib/custody/user-store";
import { errorFromUnknown, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Real-wallet balances (authenticated).
 * Demo balances stay on GET /api/demo/state — never mixed.
 */
export async function GET() {
  try {
    const session = await requireSession();
    const b = userBalances(session.walletPubkey);
    return jsonOk({
      mode: "real",
      walletPubkey: session.walletPubkey,
      usdc: atomicToUsdc(b.availableAtomic).toFixed(6),
      locked: atomicToUsdc(b.lockedAtomic).toFixed(6),
      availableAtomic: b.availableAtomic.toString(),
      lockedAtomic: b.lockedAtomic.toString(),
      lockedHandAtomic: b.lockedHandAtomic.toString(),
      lockedWithdrawAtomic: b.lockedWithdrawAtomic.toString(),
      withdrawFrozen: b.withdrawFrozen,
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

import { atomicToUsdc } from "@catesino/config";
import { assertSameOrigin } from "@/lib/auth/origin";
import { requireSession } from "@/lib/auth/session";
import { claimDeposit } from "@/lib/custody/deposit-service";
import { userBalances } from "@/lib/custody/user-store";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Claim a USDC deposit by tx signature (authenticated).
 * Demo credits are never granted here.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await requireSession();
    const body = (await req.json()) as { txSignature?: string };
    const txSignature = body.txSignature?.trim();
    if (!txSignature) {
      return jsonError("txSignature is required", 400);
    }

    const result = await claimDeposit({
      sessionWalletPubkey: session.walletPubkey,
      txSignature,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status, {
        reason: result.reason,
      });
    }

    const bal = userBalances(session.walletPubkey);
    return jsonOk({
      mode: "real",
      depositId: result.deposit.id,
      amountAtomic: result.amountAtomic,
      amountUsdc: atomicToUsdc(BigInt(result.amountAtomic)),
      status: result.deposit.status,
      balances: {
        availableUsdc: atomicToUsdc(bal.availableAtomic),
        lockedUsdc: atomicToUsdc(bal.lockedAtomic),
      },
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

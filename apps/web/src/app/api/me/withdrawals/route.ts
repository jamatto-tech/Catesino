import { assertSameOrigin } from "@/lib/auth/origin";
import { requireSession } from "@/lib/auth/session";
import {
  requestUserWithdraw,
  serializeWithdrawal,
  userWithdrawalList,
} from "@/lib/custody/withdraw-service";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/** List real-wallet withdrawals for the session. */
export async function GET() {
  try {
    const session = await requireSession();
    return jsonOk({
      mode: "real",
      withdrawals: userWithdrawalList(session.walletPubkey),
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

/**
 * Request a real USDC withdrawal to the authenticated wallet only.
 * Demo play never hits this route.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const session = await requireSession();
    const body = (await req.json()) as {
      amount?: string;
      amountUsdc?: number;
      amountAtomic?: string;
    };

    const idemHeader = req.headers.get("idempotency-key")?.trim();
    const clientKey =
      idemHeader ||
      `auto-${session.walletPubkey.slice(0, 8)}-${Date.now()}`;

    const amountUsdc =
      body.amountUsdc ??
      (body.amount !== undefined ? Number(body.amount) : undefined);

    const result = await requestUserWithdraw({
      sessionWalletPubkey: session.walletPubkey,
      amountUsdc,
      amountAtomic: body.amountAtomic,
      clientIdempotencyKey: clientKey,
    });

    if (!result.ok) {
      return jsonError(result.error, result.status, {
        reason: result.reason,
      });
    }

    return jsonOk({
      mode: "real",
      withdrawal: serializeWithdrawal(result.withdrawal),
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

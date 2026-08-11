import { atomicToUsdc } from "@catesino/config";
import { requireSession } from "@/lib/auth/session";
import { listDeposits, listWithdrawals } from "@/lib/custody/user-store";
import { errorFromUnknown, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/** Combined real deposit + withdraw history (demo has none). */
export async function GET() {
  try {
    const session = await requireSession();
    const deposits = listDeposits(session.walletPubkey).map((d) => ({
      kind: "deposit" as const,
      id: d.id,
      txSignature: d.txSignature,
      amountAtomic: d.amountAtomic.toString(),
      amountUsdc: atomicToUsdc(d.amountAtomic),
      status: d.status,
      at: new Date(d.creditedAt).toISOString(),
    }));
    const withdrawals = listWithdrawals(session.walletPubkey).map((w) => ({
      kind: "withdrawal" as const,
      id: w.id,
      amountAtomic: w.amountAtomic.toString(),
      amountUsdc: atomicToUsdc(w.amountAtomic),
      status: w.status,
      approvalLevel: w.approvalLevel,
      at: new Date(w.createdAtMs).toISOString(),
    }));
    const items = [...deposits, ...withdrawals].sort((a, b) =>
      a.at < b.at ? 1 : -1,
    );
    return jsonOk({ mode: "real", items });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

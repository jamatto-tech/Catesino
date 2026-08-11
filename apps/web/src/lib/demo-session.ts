import {
  createLedger,
  creditDeposit,
  getBalance,
  lockBet,
  settleHand,
  type LedgerSnapshot,
} from "@catesino/ledger";
import type { BlackjackHandState } from "@catesino/blackjack";
import type { VideoCateState } from "@catesino/house-games";
import { usdcToAtomic } from "@catesino/config";

/**
 * Shared in-memory **demo** wallet across all Cate games.
 * Server-only — never import from client components.
 *
 * SECURITY:
 * - Demo credits are fictional; not linked to Solana deposits/withdrawals.
 * - Never call creditDeposit from request bodies or client-controlled amounts
 *   beyond the one-time seed below.
 * - Real deposit claims / withdrawals must use @catesino/chain evaluateDepositClaim
 *   / evaluateWithdrawRequest + authenticated SIWS session (not this module).
 * - Do not enable FF_DEPOSITS_USDC / FF_WITHDRAWALS until those paths are wired
 *   to this process with private keys only in the worker secret store.
 */
export type DemoTable = {
  ledger: LedgerSnapshot;
  userId: string;
  /** Active BlackCate hand (multi-action) */
  hand: BlackjackHandState | null;
  /** Active VideoCate hand (hold/draw) */
  videoCate: VideoCateState | null;
  /** Monotonic nonce for all demo bets */
  nonce: number;
};

const globalForDemo = globalThis as unknown as {
  __catesinoDemo?: DemoTable;
};

export function getDemoTable(): DemoTable {
  if (!globalForDemo.__catesinoDemo) {
    const ledger = createLedger();
    creditDeposit(ledger, "demo", usdcToAtomic(100), "demo-seed");
    globalForDemo.__catesinoDemo = {
      ledger,
      userId: "demo",
      hand: null,
      videoCate: null,
      nonce: 1,
    };
  }
  // migrate older sessions missing videoCate
  if (!("videoCate" in globalForDemo.__catesinoDemo)) {
    (globalForDemo.__catesinoDemo as DemoTable).videoCate = null;
  }
  return globalForDemo.__catesinoDemo;
}

export function demoBalances(table: DemoTable) {
  const b = getBalance(table.ledger, table.userId);
  return {
    availableAtomic: b.available.toString(),
    lockedAtomic: b.locked.toString(),
  };
}

export function nextNonce(table: DemoTable): number {
  const n = table.nonce;
  table.nonce += 1;
  return n;
}

export function assertNoBlockingHand(table: DemoTable): void {
  if (table.hand && table.hand.phase !== "settled") {
    throw new Error("Finish your BlackCate hand first");
  }
  if (table.videoCate && table.videoCate.phase === "hold") {
    throw new Error("Finish your VideoCate hand first");
  }
}

export { lockBet, settleHand, getBalance };

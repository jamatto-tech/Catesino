import {
  cancelWithdraw,
  completeWithdraw,
  createLedger,
  creditDeposit,
  getBalance,
  getLockBreakdown,
  isWithdrawFrozen,
  requestWithdraw,
  type LedgerSnapshot,
} from "@catesino/ledger";
import { assertValidSolanaPubkey } from "@catesino/chain";

/**
 * In-memory custody store for authenticated wallets.
 * Isolated from demo-session — demo never reads/writes here.
 * Swap for Postgres later without changing route handlers.
 */

export type DepositRecord = {
  id: string;
  userId: string;
  txSignature: string;
  amountAtomic: bigint;
  status: "credited" | "rejected";
  creditedAt: number;
};

export type WithdrawalRecord = {
  id: string;
  userId: string;
  amountAtomic: bigint;
  destinationWalletPubkey: string;
  status:
    | "pending"
    | "approved"
    | "sending"
    | "sent"
    | "failed"
    | "rejected"
    | "cancelled";
  approvalLevel: "auto" | "manual" | "dual_admin";
  availableAtMs: number;
  createdAtMs: number;
  idempotencyKey: string;
  reviewedBy?: string;
  dualApprovedBy?: string;
};

type UserCustody = {
  userId: string;
  walletPubkey: string;
  ledger: LedgerSnapshot;
  selfExcludedUntilMs: number | null;
  hasCompletedWithdraw: boolean;
  lastWithdrawRequestedAtMs: number | null;
};

type CustodyRoot = {
  usersByWallet: Map<string, UserCustody>;
  depositsBySig: Map<string, DepositRecord>;
  withdrawalsById: Map<string, WithdrawalRecord>;
  /** Daily hot outflow keyed by UTC date YYYY-MM-DD */
  hotDailyOutflow: Map<string, bigint>;
  seq: number;
};

const globalForCustody = globalThis as unknown as {
  __catesinoCustody?: CustodyRoot;
};

function root(): CustodyRoot {
  if (!globalForCustody.__catesinoCustody) {
    globalForCustody.__catesinoCustody = {
      usersByWallet: new Map(),
      depositsBySig: new Map(),
      withdrawalsById: new Map(),
      hotDailyOutflow: new Map(),
      seq: 1,
    };
  }
  return globalForCustody.__catesinoCustody;
}

function nextId(prefix: string): string {
  const r = root();
  const id = `${prefix}_${r.seq}`;
  r.seq += 1;
  return id;
}

export function getOrCreateUser(walletPubkey: string): UserCustody {
  assertValidSolanaPubkey(walletPubkey);
  const r = root();
  let u = r.usersByWallet.get(walletPubkey);
  if (!u) {
    u = {
      userId: walletPubkey,
      walletPubkey,
      ledger: createLedger(),
      selfExcludedUntilMs: null,
      hasCompletedWithdraw: false,
      lastWithdrawRequestedAtMs: null,
    };
    r.usersByWallet.set(walletPubkey, u);
  }
  return u;
}

export function isDepositCredited(txSignature: string): boolean {
  const d = root().depositsBySig.get(txSignature);
  return d?.status === "credited";
}

export function recordDepositCredit(input: {
  walletPubkey: string;
  txSignature: string;
  amountAtomic: bigint;
  idempotencyKey: string;
}): DepositRecord {
  const r = root();
  const existing = r.depositsBySig.get(input.txSignature);
  if (existing?.status === "credited") {
    return existing;
  }
  const user = getOrCreateUser(input.walletPubkey);
  creditDeposit(
    user.ledger,
    user.userId,
    input.amountAtomic,
    input.idempotencyKey,
  );
  const rec: DepositRecord = {
    id: nextId("dep"),
    userId: user.userId,
    txSignature: input.txSignature,
    amountAtomic: input.amountAtomic,
    status: "credited",
    creditedAt: Date.now(),
  };
  r.depositsBySig.set(input.txSignature, rec);
  return rec;
}

export function userBalances(walletPubkey: string) {
  const user = getOrCreateUser(walletPubkey);
  const b = getBalance(user.ledger, user.userId);
  const locks = getLockBreakdown(user.ledger, user.userId);
  return {
    availableAtomic: b.available,
    lockedAtomic: b.locked,
    lockedHandAtomic: locks.lockedHand,
    lockedWithdrawAtomic: locks.lockedWithdraw,
    withdrawFrozen: isWithdrawFrozen(user.ledger, user.userId),
  };
}

export function utcDateKey(ms = Date.now()): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function getHotDailyOutflow(ms = Date.now()): bigint {
  return root().hotDailyOutflow.get(utcDateKey(ms)) ?? 0n;
}

export function addHotDailyOutflow(amount: bigint, ms = Date.now()): void {
  const k = utcDateKey(ms);
  const r = root();
  r.hotDailyOutflow.set(k, (r.hotDailyOutflow.get(k) ?? 0n) + amount);
}

export function createWithdrawal(input: {
  walletPubkey: string;
  amountAtomic: bigint;
  destinationWalletPubkey: string;
  approvalLevel: "auto" | "manual" | "dual_admin";
  availableAtMs: number;
  idempotencyKey: string;
}): WithdrawalRecord {
  const r = root();
  // Idempotent by key
  for (const w of r.withdrawalsById.values()) {
    if (w.idempotencyKey === input.idempotencyKey) {
      return w;
    }
  }
  const user = getOrCreateUser(input.walletPubkey);
  requestWithdraw(
    user.ledger,
    user.userId,
    input.amountAtomic,
    input.idempotencyKey,
  );
  user.lastWithdrawRequestedAtMs = Date.now();
  const rec: WithdrawalRecord = {
    id: nextId("wd"),
    userId: user.userId,
    amountAtomic: input.amountAtomic,
    destinationWalletPubkey: input.destinationWalletPubkey,
    status: input.approvalLevel === "auto" ? "pending" : "pending",
    approvalLevel: input.approvalLevel,
    availableAtMs: input.availableAtMs,
    createdAtMs: Date.now(),
    idempotencyKey: input.idempotencyKey,
  };
  r.withdrawalsById.set(rec.id, rec);
  return rec;
}

export function listWithdrawals(walletPubkey: string): WithdrawalRecord[] {
  const user = getOrCreateUser(walletPubkey);
  return [...root().withdrawalsById.values()]
    .filter((w) => w.userId === user.userId)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export function listDeposits(walletPubkey: string): DepositRecord[] {
  const user = getOrCreateUser(walletPubkey);
  return [...root().depositsBySig.values()]
    .filter((d) => d.userId === user.userId)
    .sort((a, b) => b.creditedAt - a.creditedAt);
}

export function cancelUserWithdrawal(
  walletPubkey: string,
  withdrawalId: string,
): WithdrawalRecord {
  const r = root();
  const rec = r.withdrawalsById.get(withdrawalId);
  if (!rec || rec.userId !== walletPubkey) {
    throw Object.assign(new Error("Withdrawal not found"), { status: 404 });
  }
  if (rec.status !== "pending") {
    throw Object.assign(new Error("Withdrawal not cancellable"), { status: 400 });
  }
  const user = getOrCreateUser(walletPubkey);
  cancelWithdraw(
    user.ledger,
    user.userId,
    rec.amountAtomic,
    `cancel:${rec.id}`,
  );
  rec.status = "cancelled";
  return rec;
}

/** Mark sent after worker succeeds — completes ledger withdraw lock. */
export function markWithdrawalSent(withdrawalId: string): WithdrawalRecord {
  const r = root();
  const rec = r.withdrawalsById.get(withdrawalId);
  if (!rec) throw new Error("Withdrawal not found");
  if (rec.status === "sent") return rec;
  const user = getOrCreateUser(rec.userId);
  completeWithdraw(
    user.ledger,
    user.userId,
    rec.amountAtomic,
    `complete:${rec.id}`,
  );
  rec.status = "sent";
  user.hasCompletedWithdraw = true;
  addHotDailyOutflow(rec.amountAtomic);
  return rec;
}

export function getUserFlags(walletPubkey: string) {
  const user = getOrCreateUser(walletPubkey);
  const now = Date.now();
  return {
    selfExcluded: Boolean(
      user.selfExcludedUntilMs && user.selfExcludedUntilMs > now,
    ),
    hasPriorWithdraw: user.hasCompletedWithdraw,
    lastWithdrawRequestedAtMs: user.lastWithdrawRequestedAtMs ?? undefined,
    withdrawFrozen: isWithdrawFrozen(user.ledger, user.userId),
  };
}

/** Test helper — clear custody (does not touch demo table). */
export function resetCustodyStoreForTests(): void {
  globalForCustody.__catesinoCustody = undefined;
}

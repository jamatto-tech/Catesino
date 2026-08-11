import type { StakeLockSettlement, UserBalance } from "@catesino/game-protocol";
import { liability } from "@catesino/game-protocol";
import type { BuyPolicy } from "@catesino/config";

export type EquityBuckets = {
  housePlayEquity: bigint;
  seedEquity: bigint;
  platformEquity: bigint;
};

export type LedgerSnapshot = {
  users: Map<string, UserBalance>;
  equity: EquityBuckets;
  /** Idempotency keys already applied */
  appliedKeys: Set<string>;
};

export type FreeBalanceInput = {
  onchainHouseUsdcAtomic: bigint;
  playerLiabilityAtomic: bigint;
  reserveFloorAtomic: bigint;
};

/**
 * Canonical free_balance (design): max(0, onchain - liability - reserve) once.
 */
export function computeFreeBalanceAtomic(input: FreeBalanceInput): bigint {
  const raw =
    input.onchainHouseUsdcAtomic -
    input.playerLiabilityAtomic -
    input.reserveFloorAtomic;
  return raw > 0n ? raw : 0n;
}

/**
 * Daily buy amount from free balance + policy (no second reserve subtract).
 */
export function computeBuyAmountAtomic(
  freeBalanceAtomic: bigint,
  policy: Pick<BuyPolicy, "buyRatio" | "maxDailyBuyAtomic" | "minDailyBuyAtomic">,
  buyHotBalanceAtomic: bigint,
): { buyAtomic: bigint; skipReason?: string } {
  const ratioPart = BigInt(Math.floor(Number(freeBalanceAtomic) * policy.buyRatio));
  let buy = ratioPart;
  if (buy > policy.maxDailyBuyAtomic) buy = policy.maxDailyBuyAtomic;
  if (buy > buyHotBalanceAtomic) buy = buyHotBalanceAtomic;
  if (buy < policy.minDailyBuyAtomic) {
    return { buyAtomic: 0n, skipReason: "below_min_or_underfunded" };
  }
  return { buyAtomic: buy };
}

export function createLedger(): LedgerSnapshot {
  return {
    users: new Map(),
    equity: {
      housePlayEquity: 0n,
      seedEquity: 0n,
      platformEquity: 0n,
    },
    appliedKeys: new Set(),
  };
}

function getOrCreate(ledger: LedgerSnapshot, userId: string): UserBalance {
  let b = ledger.users.get(userId);
  if (!b) {
    b = { available: 0n, locked: 0n };
    ledger.users.set(userId, b);
  }
  return b;
}

/** True if this key already completed successfully (safe to no-op). */
function wasApplied(ledger: LedgerSnapshot, key: string | undefined): boolean {
  if (!key) return false;
  return ledger.appliedKeys.has(key);
}

/**
 * Record key only after a successful mutation.
 * Never call before validation — a failed op must leave the key free for retry.
 */
function markApplied(ledger: LedgerSnapshot, key: string | undefined): void {
  if (key) ledger.appliedKeys.add(key);
}

export function totalPlayerLiability(ledger: LedgerSnapshot): bigint {
  let sum = 0n;
  for (const b of ledger.users.values()) {
    sum += liability(b);
  }
  return sum;
}

/** Credit deposit to available (player liability increases). */
export function creditDeposit(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  if (amountAtomic <= 0n) throw new Error("deposit amount must be positive");
  if (wasApplied(ledger, idempotencyKey)) {
    return { ...getOrCreate(ledger, userId) };
  }
  const b = getOrCreate(ledger, userId);
  b.available += amountAtomic;
  markApplied(ledger, idempotencyKey);
  return { ...b };
}

/**
 * Stake-lock: available -= bet; locked += bet.
 * Liability unchanged.
 */
export function lockBet(
  ledger: LedgerSnapshot,
  userId: string,
  betAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  if (betAtomic <= 0n) throw new Error("bet must be positive");
  if (wasApplied(ledger, idempotencyKey)) {
    return { ...getOrCreate(ledger, userId) };
  }
  const b = getOrCreate(ledger, userId);
  if (b.available < betAtomic) throw new Error("insufficient available balance");
  b.available -= betAtomic;
  b.locked += betAtomic;
  markApplied(ledger, idempotencyKey);
  return { ...b };
}

/**
 * Apply stake-lock settlement from blackjack engine.
 * Uses creditAvailableAtomic + houseEquityDeltaAtomic from shipped engine.
 */
export function settleHand(
  ledger: LedgerSnapshot,
  userId: string,
  settlement: StakeLockSettlement,
  idempotencyKey?: string,
): UserBalance {
  if (wasApplied(ledger, idempotencyKey)) {
    return { ...getOrCreate(ledger, userId) };
  }
  const b = getOrCreate(ledger, userId);
  if (b.locked < settlement.betAtomic) {
    throw new Error("insufficient locked stake for settlement");
  }
  b.locked -= settlement.betAtomic;
  b.available += settlement.creditAvailableAtomic;
  ledger.equity.housePlayEquity += settlement.houseEquityDeltaAtomic;
  markApplied(ledger, idempotencyKey);
  return { ...b };
}

/**
 * Option B withdraw request: available → locked (workflow).
 * Liability unchanged (still available+locked).
 */
export function requestWithdraw(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  if (amountAtomic <= 0n) throw new Error("withdraw amount must be positive");
  if (wasApplied(ledger, idempotencyKey)) {
    return { ...getOrCreate(ledger, userId) };
  }
  const b = getOrCreate(ledger, userId);
  if (b.available < amountAtomic) throw new Error("insufficient available for withdraw");
  b.available -= amountAtomic;
  b.locked += amountAtomic;
  markApplied(ledger, idempotencyKey);
  return { ...b };
}

/** Withdraw sent: drop locked portion (liability decreases). */
export function completeWithdraw(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  if (amountAtomic <= 0n) throw new Error("withdraw amount must be positive");
  if (wasApplied(ledger, idempotencyKey)) {
    return { ...getOrCreate(ledger, userId) };
  }
  const b = getOrCreate(ledger, userId);
  if (b.locked < amountAtomic) throw new Error("insufficient locked for withdraw complete");
  b.locked -= amountAtomic;
  markApplied(ledger, idempotencyKey);
  return { ...b };
}

export function getBalance(ledger: LedgerSnapshot, userId: string): UserBalance {
  const b = ledger.users.get(userId);
  return b ? { ...b } : { available: 0n, locked: 0n };
}

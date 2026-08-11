import type { StakeLockSettlement, UserBalance } from "@catesino/game-protocol";
import { liability } from "@catesino/game-protocol";
import {
  assertSafeAtomicAmount,
  type BuyPolicy,
} from "@catesino/config";

export type EquityBuckets = {
  housePlayEquity: bigint;
  seedEquity: bigint;
  platformEquity: bigint;
};

/**
 * Internal user state with lock separation.
 * Hand locks and withdraw locks must never be fungible for completion.
 */
export type LedgerUserState = {
  available: bigint;
  lockedHand: bigint;
  lockedWithdraw: bigint;
  /** Risk / reorg freeze — blocks new withdraw requests */
  withdrawFrozen: boolean;
};

export type LedgerSnapshot = {
  users: Map<string, LedgerUserState>;
  equity: EquityBuckets;
  /** Idempotency keys already applied successfully */
  appliedKeys: Set<string>;
};

export type FreeBalanceInput = {
  onchainHouseUsdcAtomic: bigint;
  playerLiabilityAtomic: bigint;
  reserveFloorAtomic: bigint;
};

function assertUserId(userId: string): void {
  if (typeof userId !== "string" || userId.length === 0 || userId.length > 128) {
    throw new Error("Invalid userId");
  }
  if (userId.includes("\0") || userId.includes("\n")) {
    throw new Error("Invalid userId characters");
  }
}

function lockedTotal(u: LedgerUserState): bigint {
  return u.lockedHand + u.lockedWithdraw;
}

function toBalance(u: LedgerUserState): UserBalance {
  return {
    available: u.available,
    locked: lockedTotal(u),
  };
}

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
 * Daily buy amount from free balance + policy (integer-safe; no Number()).
 */
export function computeBuyAmountAtomic(
  freeBalanceAtomic: bigint,
  policy: Pick<BuyPolicy, "buyRatio" | "maxDailyBuyAtomic" | "minDailyBuyAtomic">,
  buyHotBalanceAtomic: bigint,
): { buyAtomic: bigint; skipReason?: string } {
  if (freeBalanceAtomic < 0n) {
    throw new Error("freeBalanceAtomic must be non-negative");
  }
  if (buyHotBalanceAtomic < 0n) {
    throw new Error("buyHotBalanceAtomic must be non-negative");
  }
  // ratio in [0,1] with up to 6 decimal places of precision via integer math
  const ratioBps = BigInt(Math.round(policy.buyRatio * 10_000));
  if (ratioBps < 0n || ratioBps > 10_000n) {
    throw new Error("buyRatio must be between 0 and 1");
  }
  let buy = (freeBalanceAtomic * ratioBps) / 10_000n;
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

function getOrCreate(ledger: LedgerSnapshot, userId: string): LedgerUserState {
  assertUserId(userId);
  let b = ledger.users.get(userId);
  if (!b) {
    b = {
      available: 0n,
      lockedHand: 0n,
      lockedWithdraw: 0n,
      withdrawFrozen: false,
    };
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
    sum += b.available + lockedTotal(b);
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
  assertUserId(userId);
  assertSafeAtomicAmount(amountAtomic, "deposit amount");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  b.available += amountAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

/**
 * Reverse a credited deposit after reorg (rare at 32 conf).
 * Freezes withdraws if available would go negative — clamps and freezes.
 */
export function reverseDeposit(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertSafeAtomicAmount(amountAtomic, "reorg reverse amount");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.available >= amountAtomic) {
    b.available -= amountAtomic;
  } else {
    // Cannot invent debt silently — zero available and freeze withdrawals
    b.available = 0n;
    b.withdrawFrozen = true;
  }
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

export function setWithdrawFrozen(
  ledger: LedgerSnapshot,
  userId: string,
  frozen: boolean,
): void {
  const b = getOrCreate(ledger, userId);
  b.withdrawFrozen = frozen;
}

export function isWithdrawFrozen(
  ledger: LedgerSnapshot,
  userId: string,
): boolean {
  return getOrCreate(ledger, userId).withdrawFrozen;
}

/**
 * Stake-lock: available -= bet; lockedHand += bet.
 * Liability unchanged.
 */
export function lockBet(
  ledger: LedgerSnapshot,
  userId: string,
  betAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertSafeAtomicAmount(betAtomic, "bet");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.available < betAtomic) throw new Error("insufficient available balance");
  b.available -= betAtomic;
  b.lockedHand += betAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

/**
 * Absolute max credit multiple of stake accepted by the ledger.
 * Covers house-game paytables (e.g. royal flush 250×) with headroom;
 * blocks absurd credit injection from a compromised game module.
 */
export const MAX_SETTLEMENT_CREDIT_MULT = 1000n;

/**
 * Validate settlement conserves the locked stake:
 * creditAvailable + houseEquityDelta === betAtomic
 * and credit is within [0, MAX_SETTLEMENT_CREDIT_MULT × bet].
 */
export function assertValidSettlement(settlement: StakeLockSettlement): void {
  assertSafeAtomicAmount(settlement.betAtomic, "settlement bet");
  if (settlement.creditAvailableAtomic < 0n) {
    throw new Error("settlement credit cannot be negative");
  }
  const maxCredit = settlement.betAtomic * MAX_SETTLEMENT_CREDIT_MULT;
  if (settlement.creditAvailableAtomic > maxCredit) {
    throw new Error(
      `settlement credit exceeds maximum (${MAX_SETTLEMENT_CREDIT_MULT}× bet)`,
    );
  }
  // Conservation: locked stake splits into player credit + house equity
  const conserved =
    settlement.creditAvailableAtomic + settlement.houseEquityDeltaAtomic;
  if (conserved !== settlement.betAtomic) {
    throw new Error(
      "settlement must conserve stake: credit + houseDelta === bet",
    );
  }
}
/**
 * Apply stake-lock settlement from game engine.
 * Only releases lockedHand — never touches lockedWithdraw.
 */
export function settleHand(
  ledger: LedgerSnapshot,
  userId: string,
  settlement: StakeLockSettlement,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertValidSettlement(settlement);
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.lockedHand < settlement.betAtomic) {
    throw new Error("insufficient locked stake for settlement");
  }
  b.lockedHand -= settlement.betAtomic;
  b.available += settlement.creditAvailableAtomic;
  ledger.equity.housePlayEquity += settlement.houseEquityDeltaAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

/**
 * Option B withdraw request: available → lockedWithdraw.
 * Liability unchanged. Blocked when withdrawFrozen.
 */
export function requestWithdraw(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertSafeAtomicAmount(amountAtomic, "withdraw amount");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.withdrawFrozen) {
    throw new Error("withdrawals frozen for user");
  }
  if (b.available < amountAtomic) {
    throw new Error("insufficient available for withdraw");
  }
  b.available -= amountAtomic;
  b.lockedWithdraw += amountAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

/**
 * Cancel / fail withdraw before send: lockedWithdraw → available.
 */
export function cancelWithdraw(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertSafeAtomicAmount(amountAtomic, "cancel withdraw amount");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.lockedWithdraw < amountAtomic) {
    throw new Error("insufficient locked withdraw to cancel");
  }
  b.lockedWithdraw -= amountAtomic;
  b.available += amountAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

/**
 * Withdraw sent: drop lockedWithdraw only (not hand locks).
 * Liability decreases by amount.
 */
export function completeWithdraw(
  ledger: LedgerSnapshot,
  userId: string,
  amountAtomic: bigint,
  idempotencyKey?: string,
): UserBalance {
  assertUserId(userId);
  assertSafeAtomicAmount(amountAtomic, "withdraw amount");
  if (wasApplied(ledger, idempotencyKey)) {
    return toBalance(getOrCreate(ledger, userId));
  }
  const b = getOrCreate(ledger, userId);
  if (b.lockedWithdraw < amountAtomic) {
    throw new Error("insufficient locked for withdraw complete");
  }
  b.lockedWithdraw -= amountAtomic;
  markApplied(ledger, idempotencyKey);
  return toBalance(b);
}

export function getBalance(ledger: LedgerSnapshot, userId: string): UserBalance {
  const b = ledger.users.get(userId);
  return b
    ? toBalance(b)
    : { available: 0n, locked: 0n };
}

export function getLockBreakdown(
  ledger: LedgerSnapshot,
  userId: string,
): { lockedHand: bigint; lockedWithdraw: bigint } {
  const b = ledger.users.get(userId);
  return b
    ? { lockedHand: b.lockedHand, lockedWithdraw: b.lockedWithdraw }
    : { lockedHand: 0n, lockedWithdraw: 0n };
}

// Re-export liability helper usage for tests
export { liability };

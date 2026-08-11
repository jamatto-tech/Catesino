import type { AppConfig, CustodyPolicy } from "@catesino/config";
import { assertSafeAtomicAmount } from "@catesino/config";
import {
  assertValidSolanaPubkey,
  secureEqual,
} from "./addresses.js";

export type WithdrawRequestInput = {
  /** Authenticated session wallet */
  sessionWalletPubkey: string;
  /**
   * Requested destination. MVP: must equal session wallet (no third-party).
   */
  destinationWalletPubkey: string;
  amountAtomic: bigint;
  /** User available balance (not total liability) */
  availableAtomic: bigint;
  /** True if user has self_excluded_until in the future */
  selfExcluded: boolean;
  /** True if deposit reorg freeze or risk freeze is active */
  withdrawFrozen: boolean;
  /** True if this wallet has completed at least one prior withdrawal */
  hasPriorWithdraw: boolean;
  /** Timestamp of last withdraw request (ms), if any */
  lastWithdrawRequestedAtMs?: number;
  /** Now (ms) — inject for tests */
  nowMs: number;
  /** Atomic sent by withdraw-hot so far in the UTC day */
  withdrawHotDailyOutflowAtomic: bigint;
  /** Current withdraw-hot on-chain balance */
  withdrawHotBalanceAtomic: bigint;
};

export type WithdrawApprovalLevel =
  | "auto"
  | "manual"
  | "dual_admin";

export type WithdrawPolicyResult =
  | {
      ok: true;
      amountAtomic: bigint;
      destinationWalletPubkey: string;
      approvalLevel: WithdrawApprovalLevel;
      availableAtMs: number;
      cooldownMs: number;
    }
  | {
      ok: false;
      reason: WithdrawRejectReason;
      message: string;
    };

export type WithdrawRejectReason =
  | "withdrawals_disabled"
  | "mainnet_funds_disabled"
  | "invalid_session_wallet"
  | "invalid_destination"
  | "destination_not_own_wallet"
  | "self_excluded"
  | "withdraw_frozen"
  | "amount_unsafe"
  | "insufficient_available"
  | "cooldown_active"
  | "exceeds_hot_per_tx_cap"
  | "exceeds_hot_daily_cap"
  | "hot_underfunded";

export type WithdrawPolicy = Pick<
  CustodyPolicy,
  | "withdrawFirstCooldownHours"
  | "withdrawCooldownMinutes"
  | "withdrawManualThresholdAtomic"
  | "withdrawDualApproveThresholdAtomic"
  | "withdrawHotPerTxCapAtomic"
  | "withdrawHotDailyCapAtomic"
> & {
  withdrawalsEnabled: boolean;
  publicMainnetFunds: boolean;
  cluster: AppConfig["cluster"];
};

export function withdrawPolicyFromConfig(config: AppConfig): WithdrawPolicy {
  return {
    withdrawalsEnabled: config.flags.withdrawals,
    publicMainnetFunds: config.flags.publicMainnetFunds,
    cluster: config.cluster,
    withdrawFirstCooldownHours: config.custody.withdrawFirstCooldownHours,
    withdrawCooldownMinutes: config.custody.withdrawCooldownMinutes,
    withdrawManualThresholdAtomic: config.custody.withdrawManualThresholdAtomic,
    withdrawDualApproveThresholdAtomic:
      config.custody.withdrawDualApproveThresholdAtomic,
    withdrawHotPerTxCapAtomic: config.custody.withdrawHotPerTxCapAtomic,
    withdrawHotDailyCapAtomic: config.custody.withdrawHotDailyCapAtomic,
  };
}

/**
 * Pure withdraw request policy (design Option B + hot-wallet caps).
 *
 * Security properties:
 * 1. Feature + mainnet counsel gates
 * 2. Destination must equal session wallet (no third-party payouts in MVP)
 * 3. Self-exclusion / freeze blocks
 * 4. Amount ≤ available; positive + max atomic
 * 5. Cool-down (24h first withdraw; configurable subsequent)
 * 6. Manual / dual-admin thresholds
 * 7. Withdraw-hot per-tx and daily outflow caps
 * 8. Hot must hold enough balance to send (underfunded → reject for auto path
 *    still returns policy ok with approvalLevel when manual; hot check is for
 *    worker send readiness — here we surface hot_underfunded for auto only)
 */
export function evaluateWithdrawRequest(
  input: WithdrawRequestInput,
  policy: WithdrawPolicy,
): WithdrawPolicyResult {
  if (!policy.withdrawalsEnabled) {
    return reject("withdrawals_disabled", "USDC withdrawals are disabled");
  }
  if (policy.cluster === "mainnet-beta" && !policy.publicMainnetFunds) {
    return reject(
      "mainnet_funds_disabled",
      "Public mainnet funds disabled (counsel gate)",
    );
  }

  try {
    assertValidSolanaPubkey(input.sessionWalletPubkey, "session wallet");
  } catch (e) {
    return reject(
      "invalid_session_wallet",
      e instanceof Error ? e.message : String(e),
    );
  }

  try {
    assertValidSolanaPubkey(input.destinationWalletPubkey, "destination");
  } catch (e) {
    return reject(
      "invalid_destination",
      e instanceof Error ? e.message : String(e),
    );
  }

  // MVP: never allow third-party destination
  if (
    !secureEqual(input.destinationWalletPubkey, input.sessionWalletPubkey)
  ) {
    return reject(
      "destination_not_own_wallet",
      "Withdrawals may only go to the authenticated wallet",
    );
  }

  if (input.selfExcluded) {
    return reject("self_excluded", "Wallet is self-excluded from withdrawals");
  }
  if (input.withdrawFrozen) {
    return reject(
      "withdraw_frozen",
      "Withdrawals frozen (risk or deposit reorg resolution)",
    );
  }

  try {
    assertSafeAtomicAmount(input.amountAtomic, "withdraw amount");
  } catch (e) {
    return reject(
      "amount_unsafe",
      e instanceof Error ? e.message : String(e),
    );
  }

  if (input.availableAtomic < input.amountAtomic) {
    return reject("insufficient_available", "Insufficient available balance");
  }

  const cooldownMs = input.hasPriorWithdraw
    ? policy.withdrawCooldownMinutes * 60_000
    : policy.withdrawFirstCooldownHours * 3_600_000;

  let availableAtMs = input.nowMs;
  if (
    cooldownMs > 0 &&
    input.lastWithdrawRequestedAtMs !== undefined &&
    input.hasPriorWithdraw
  ) {
    const earliest = input.lastWithdrawRequestedAtMs + cooldownMs;
    if (input.nowMs < earliest) {
      return reject(
        "cooldown_active",
        `Withdraw cool-down active until ${new Date(earliest).toISOString()}`,
      );
    }
  }
  if (!input.hasPriorWithdraw && cooldownMs > 0) {
    // First withdraw: available_at = now + cool-down (queue, do not send yet)
    availableAtMs = input.nowMs + cooldownMs;
  }

  if (input.amountAtomic > policy.withdrawHotPerTxCapAtomic) {
    // Over per-tx hot cap: still allow as dual/manual, not auto
    // (worker must not auto-send above per-tx cap)
  }

  if (
    input.withdrawHotDailyOutflowAtomic + input.amountAtomic >
    policy.withdrawHotDailyCapAtomic
  ) {
    return reject(
      "exceeds_hot_daily_cap",
      "Withdraw would exceed withdraw-hot daily outflow cap",
    );
  }

  let approvalLevel: WithdrawApprovalLevel = "auto";
  if (input.amountAtomic >= policy.withdrawDualApproveThresholdAtomic) {
    approvalLevel = "dual_admin";
  } else if (input.amountAtomic >= policy.withdrawManualThresholdAtomic) {
    approvalLevel = "manual";
  }

  // Auto path cannot exceed per-tx cap or hot balance
  if (approvalLevel === "auto") {
    if (input.amountAtomic > policy.withdrawHotPerTxCapAtomic) {
      return reject(
        "exceeds_hot_per_tx_cap",
        "Amount exceeds withdraw-hot per-tx cap for auto send",
      );
    }
    if (input.withdrawHotBalanceAtomic < input.amountAtomic) {
      return reject(
        "hot_underfunded",
        "Withdraw-hot underfunded for auto send",
      );
    }
  } else if (input.amountAtomic > policy.withdrawHotPerTxCapAtomic) {
    // Manual/dual may still queue; worker sends only after approve and
    // only up to hot balance — flag stays ok with elevated approval.
  }

  return {
    ok: true,
    amountAtomic: input.amountAtomic,
    destinationWalletPubkey: input.destinationWalletPubkey,
    approvalLevel,
    availableAtMs,
    cooldownMs,
  };
}

/**
 * Dual-control check for high-value withdrawals.
 * reviewedBy and dualApprovedBy must be distinct non-empty admin ids.
 */
export function assertDualAdminApproval(
  reviewedBy: string | null | undefined,
  dualApprovedBy: string | null | undefined,
): void {
  const a = (reviewedBy ?? "").trim();
  const b = (dualApprovedBy ?? "").trim();
  if (!a || !b) {
    throw new Error("Dual admin approval required");
  }
  if (secureEqual(a, b)) {
    throw new Error("Dual admin approvers must be two distinct admins");
  }
}

/**
 * Worker send gate: destination still bound, amount caps, simulation flag.
 */
export function assertWithdrawSendAllowed(input: {
  destinationWalletPubkey: string;
  expectedDestination: string;
  amountAtomic: bigint;
  perTxCapAtomic: bigint;
  simulatedOk: boolean;
  status: string;
}): void {
  if (input.status !== "approved" && input.status !== "sending") {
    throw new Error(`Withdraw not sendable in status=${input.status}`);
  }
  if (
    !secureEqual(input.destinationWalletPubkey, input.expectedDestination)
  ) {
    throw new Error("Withdraw destination mismatch — refusing send");
  }
  assertSafeAtomicAmount(input.amountAtomic, "withdraw send amount");
  if (input.amountAtomic > input.perTxCapAtomic) {
    throw new Error("Withdraw amount exceeds hot per-tx cap at send time");
  }
  if (!input.simulatedOk) {
    throw new Error("Withdraw simulation failed — refusing send");
  }
}

function reject(
  reason: WithdrawRejectReason,
  message: string,
): WithdrawPolicyResult {
  return { ok: false, reason, message };
}

export function withdrawIdempotencyKey(
  userId: string,
  clientKey: string,
): string {
  if (!userId || !clientKey) {
    throw new Error("withdraw idempotency requires userId and client key");
  }
  // Prevent key injection across users
  if (clientKey.includes("\n") || clientKey.length > 128) {
    throw new Error("Invalid withdraw idempotency key");
  }
  return `withdraw:req:${userId}:${clientKey}`;
}

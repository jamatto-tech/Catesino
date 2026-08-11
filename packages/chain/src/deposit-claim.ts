import type { AppConfig, CustodyPolicy } from "@catesino/config";
import { assertSafeAtomicAmount } from "@catesino/config";
import {
  assertValidSolanaPubkey,
  assertValidTxSignature,
  secureEqual,
} from "./addresses.js";
import {
  assertAllowlistedUsdcMint,
  createChainContext,
  type ChainContext,
} from "./mints.js";

/**
 * One SPL USDC transfer leg extracted from a confirmed transaction
 * (outer or inner instruction). Built by the RPC parser; this module
 * never trusts client-supplied amounts without these fields.
 */
export type ParsedUsdcTransferLeg = {
  /** Token mint of the transfer */
  mint: string;
  /** Destination token account (must equal platform deposit ATA) */
  destinationTokenAccount: string;
  /** Source token account owner / authority (source binding) */
  sourceOwner: string;
  /** Amount in atomic USDC (6 decimals) */
  amountAtomic: bigint;
  /** Instruction program: classic Token or Token-2022 */
  program: "spl-token" | "token-2022";
};

export type DepositClaimInput = {
  /** Authenticated session wallet (SIWS) — not fee-payer */
  sessionWalletPubkey: string;
  /** On-chain tx signature being claimed */
  txSignature: string;
  /** meta.err must be null */
  txSucceeded: boolean;
  /** Confirmations observed at claim time */
  confirmations: number;
  /**
   * Platform deposit ATA (derived or config). Must match destination of
   * every leg we credit.
   */
  depositAta: string;
  /** All USDC transfer legs found in the tx (outer + inner). */
  transfers: readonly ParsedUsdcTransferLeg[];
  /** True if this signature was already credited (DB unique on tx_signature). */
  alreadyCredited: boolean;
  /** Optional: known reorg / dropped before credit */
  reorged?: boolean;
};

export type DepositClaimRejectReason =
  | "deposits_disabled"
  | "mainnet_funds_disabled"
  | "invalid_session_wallet"
  | "invalid_tx_signature"
  | "invalid_deposit_ata"
  | "tx_failed"
  | "already_credited"
  | "reorged"
  | "insufficient_confirmations"
  | "no_matching_transfer"
  | "wrong_mint"
  | "wrong_destination"
  | "source_binding_failed"
  | "below_min_deposit"
  | "amount_unsafe";

export type DepositClaimResult =
  | {
      ok: true;
      /** Sum of legs bound to session wallet → deposit ATA */
      amountAtomic: bigint;
      /** Legs that contributed to the credit */
      matchedLegs: ParsedUsdcTransferLeg[];
      /** Require dual RPC when amount ≥ threshold */
      requireSecondaryRpc: boolean;
      status: "confirmed_ready_to_credit";
    }
  | {
      ok: false;
      reason: DepositClaimRejectReason;
      message: string;
    };

export type DepositClaimPolicy = Pick<
  CustodyPolicy,
  | "minDepositAtomic"
  | "minConfirmations"
  | "secondaryRpcThresholdAtomic"
> & {
  depositsEnabled: boolean;
  publicMainnetFunds: boolean;
  cluster: AppConfig["cluster"];
  usdcMint: string;
};

export function depositClaimPolicyFromConfig(
  config: AppConfig,
): DepositClaimPolicy {
  return {
    depositsEnabled: config.flags.depositsUsdc,
    publicMainnetFunds: config.flags.publicMainnetFunds,
    cluster: config.cluster,
    usdcMint: config.mints.usdc,
    minDepositAtomic: config.custody.minDepositAtomic,
    minConfirmations: config.custody.minConfirmations,
    secondaryRpcThresholdAtomic: config.custody.secondaryRpcThresholdAtomic,
  };
}

/**
 * Pure deposit claim verification (design PR 08 / frozen MVP path).
 *
 * Security properties enforced here:
 * 1. Feature + mainnet counsel gates
 * 2. Tx must have succeeded
 * 3. Mint allowlist (cluster USDC only)
 * 4. Destination == platform deposit ATA
 * 5. Source binding: source owner == session wallet (NOT fee-payer)
 * 6. Min deposit / dust rejection
 * 7. Confirmations ≥ policy
 * 8. Idempotent: already-credited signatures rejected
 * 9. Multi-leg: only sum legs that pass all checks for the session wallet
 *
 * Caller must still: fetch tx from RPC, parse legs, persist unique tx_signature,
 * and credit via ledger with that signature as idempotency key.
 */
export function evaluateDepositClaim(
  input: DepositClaimInput,
  policy: DepositClaimPolicy,
  chain: ChainContext = createChainContext(),
): DepositClaimResult {
  if (!policy.depositsEnabled) {
    return reject("deposits_disabled", "USDC deposits are disabled");
  }
  if (policy.cluster === "mainnet-beta" && !policy.publicMainnetFunds) {
    return reject(
      "mainnet_funds_disabled",
      "Public mainnet funds disabled (counsel gate)",
    );
  }

  try {
    assertValidSolanaPubkey(input.sessionWalletPubkey, "session wallet");
    assertValidTxSignature(input.txSignature);
    assertValidSolanaPubkey(input.depositAta, "deposit ATA");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("signature")) {
      return reject("invalid_tx_signature", msg);
    }
    if (msg.includes("deposit")) {
      return reject("invalid_deposit_ata", msg);
    }
    return reject("invalid_session_wallet", msg);
  }

  if (input.alreadyCredited) {
    return reject("already_credited", "Transaction signature already credited");
  }
  if (input.reorged) {
    return reject("reorged", "Transaction reorged before credit");
  }
  if (!input.txSucceeded) {
    return reject("tx_failed", "Transaction did not succeed on-chain");
  }
  if (input.confirmations < policy.minConfirmations) {
    return reject(
      "insufficient_confirmations",
      `Need ${policy.minConfirmations} confirmations, have ${input.confirmations}`,
    );
  }

  const matched: ParsedUsdcTransferLeg[] = [];
  let total = 0n;

  for (const leg of input.transfers) {
    // Mint must be allowlisted USDC for this cluster
    try {
      assertAllowlistedUsdcMint(leg.mint, chain);
    } catch {
      // Ignore non-USDC legs; they never credit
      continue;
    }
    // Prefer exact cluster USDC mint (mainnet vs devnet), not just allowlist pair
    if (!secureEqual(leg.mint, policy.usdcMint)) {
      continue;
    }
    if (!secureEqual(leg.destinationTokenAccount, input.depositAta)) {
      continue;
    }
    // Source binding: token authority / source owner, never fee-payer alone
    if (!secureEqual(leg.sourceOwner, input.sessionWalletPubkey)) {
      continue;
    }
    try {
      assertSafeAtomicAmount(leg.amountAtomic, "transfer amount");
    } catch {
      return reject("amount_unsafe", "Transfer amount failed safety checks");
    }
    matched.push(leg);
    total += leg.amountAtomic;
  }

  if (matched.length === 0) {
    // Distinguish common attack/misconfig cases for support + metrics
    const anyToDeposit = input.transfers.some((t) =>
      secureEqual(t.destinationTokenAccount, input.depositAta),
    );
    if (anyToDeposit) {
      const foreignSource = input.transfers.some(
        (t) =>
          secureEqual(t.destinationTokenAccount, input.depositAta) &&
          !secureEqual(t.sourceOwner, input.sessionWalletPubkey),
      );
      if (foreignSource) {
        return reject(
          "source_binding_failed",
          "No transfer from session wallet — cannot claim another wallet's deposit",
        );
      }
      const wrongMint = input.transfers.some(
        (t) =>
          secureEqual(t.destinationTokenAccount, input.depositAta) &&
          !secureEqual(t.mint, policy.usdcMint),
      );
      if (wrongMint) {
        return reject("wrong_mint", "Deposit mint is not allowlisted USDC");
      }
    } else if (input.transfers.length > 0) {
      return reject(
        "wrong_destination",
        "No transfer to platform deposit ATA",
      );
    }
    return reject(
      "no_matching_transfer",
      "No eligible USDC transfer for this wallet and deposit ATA",
    );
  }

  if (total < policy.minDepositAtomic) {
    return reject(
      "below_min_deposit",
      `Deposit ${total} atomic below minimum ${policy.minDepositAtomic}`,
    );
  }

  try {
    assertSafeAtomicAmount(total, "claim total");
  } catch {
    return reject("amount_unsafe", "Claim total failed safety checks");
  }

  return {
    ok: true,
    amountAtomic: total,
    matchedLegs: matched,
    requireSecondaryRpc: total >= policy.secondaryRpcThresholdAtomic,
    status: "confirmed_ready_to_credit",
  };
}

function reject(
  reason: DepositClaimRejectReason,
  message: string,
): DepositClaimResult {
  return { ok: false, reason, message };
}

/**
 * Build idempotency key for ledger credit from a verified claim.
 * Format is stable and unique per tx signature.
 */
export function depositIdempotencyKey(txSignature: string): string {
  assertValidTxSignature(txSignature);
  return `deposit:tx:${txSignature}`;
}

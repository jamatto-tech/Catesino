import {
  depositClaimPolicyFromConfig,
  depositIdempotencyKey,
  evaluateDepositClaim,
  fetchDepositTransaction,
  type RpcFetch,
} from "@catesino/chain";
import { getServerConfig } from "@/lib/server-config";
import {
  isDepositCredited,
  recordDepositCredit,
  type DepositRecord,
} from "./user-store";

export type ClaimDepositResult =
  | {
      ok: true;
      deposit: DepositRecord;
      amountAtomic: string;
      requireSecondaryRpc: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason?: string;
    };

/**
 * Real deposit claim path. Demo play never calls this.
 */
export async function claimDeposit(input: {
  sessionWalletPubkey: string;
  txSignature: string;
  fetchImpl?: RpcFetch;
}): Promise<ClaimDepositResult> {
  const { config, chain } = getServerConfig();
  const policy = depositClaimPolicyFromConfig(config);

  if (!policy.depositsEnabled) {
    return {
      ok: false,
      status: 403,
      error: "USDC deposits are disabled",
      reason: "deposits_disabled",
    };
  }

  const depositAta = config.custody.depositAta;
  if (!depositAta) {
    return {
      ok: false,
      status: 503,
      error: "Deposit ATA not configured (DEPOSIT_ATA)",
      reason: "not_configured",
    };
  }
  if (!config.solanaRpcUrl) {
    return {
      ok: false,
      status: 503,
      error: "SOLANA_RPC_URL not configured",
      reason: "not_configured",
    };
  }

  // Pre-check amount threshold for secondary RPC after first fetch;
  // evaluateDepositClaim also sets requireSecondaryRpc.
  let fetched;
  try {
    fetched = await fetchDepositTransaction({
      txSignature: input.txSignature,
      rpcUrl: config.solanaRpcUrl,
      secondaryRpcUrl: config.solanaRpcUrlSecondary || undefined,
      usdcMint: config.mints.usdc,
      // First pass without secondary; re-fetch if large
      requireSecondary: false,
      fetchImpl: input.fetchImpl,
    });
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "RPC fetch failed",
      reason: "rpc_error",
    };
  }

  const preliminary = evaluateDepositClaim(
    {
      sessionWalletPubkey: input.sessionWalletPubkey,
      txSignature: input.txSignature,
      txSucceeded: fetched.txSucceeded,
      confirmations: Math.min(fetched.confirmations, 1_000_000),
      depositAta,
      transfers: fetched.transfers,
      alreadyCredited: isDepositCredited(input.txSignature),
    },
    policy,
    chain,
  );

  if (!preliminary.ok) {
    return {
      ok: false,
      status: 400,
      error: preliminary.message,
      reason: preliminary.reason,
    };
  }

  // Dual RPC for large claims
  if (preliminary.requireSecondaryRpc) {
    if (!config.solanaRpcUrlSecondary) {
      return {
        ok: false,
        status: 503,
        error: "Secondary RPC required for this deposit size",
        reason: "secondary_rpc_required",
      };
    }
    try {
      fetched = await fetchDepositTransaction({
        txSignature: input.txSignature,
        rpcUrl: config.solanaRpcUrl,
        secondaryRpcUrl: config.solanaRpcUrlSecondary,
        usdcMint: config.mints.usdc,
        requireSecondary: true,
        fetchImpl: input.fetchImpl,
      });
    } catch (e) {
      return {
        ok: false,
        status: 502,
        error: e instanceof Error ? e.message : "Secondary RPC failed",
        reason: "rpc_error",
      };
    }
    const again = evaluateDepositClaim(
      {
        sessionWalletPubkey: input.sessionWalletPubkey,
        txSignature: input.txSignature,
        txSucceeded: fetched.txSucceeded,
        confirmations: Math.min(fetched.confirmations, 1_000_000),
        depositAta,
        transfers: fetched.transfers,
        alreadyCredited: isDepositCredited(input.txSignature),
      },
      policy,
      chain,
    );
    if (!again.ok) {
      return {
        ok: false,
        status: 400,
        error: again.message,
        reason: again.reason,
      };
    }
    // Use re-verified amount
    const deposit = recordDepositCredit({
      walletPubkey: input.sessionWalletPubkey,
      txSignature: input.txSignature,
      amountAtomic: again.amountAtomic,
      idempotencyKey: depositIdempotencyKey(input.txSignature),
    });
    return {
      ok: true,
      deposit,
      amountAtomic: again.amountAtomic.toString(),
      requireSecondaryRpc: true,
    };
  }

  const deposit = recordDepositCredit({
    walletPubkey: input.sessionWalletPubkey,
    txSignature: input.txSignature,
    amountAtomic: preliminary.amountAtomic,
    idempotencyKey: depositIdempotencyKey(input.txSignature),
  });

  return {
    ok: true,
    deposit,
    amountAtomic: preliminary.amountAtomic.toString(),
    requireSecondaryRpc: false,
  };
}

export function depositInstructions() {
  const { config, chain } = getServerConfig();
  return {
    enabled: config.flags.depositsUsdc,
    cluster: config.cluster,
    mint: chain.usdcMint,
    depositAddress: config.custody.depositAta || null,
    depositOwner: config.custody.depositOwnerPubkey || null,
    minAmountUsdc: config.custody.minDepositUsdc,
    minConfirmations: config.custody.minConfirmations,
    note:
      "Send only allowlisted USDC to depositAddress, then POST /api/me/deposits/claim with the tx signature. Demo play does not use this path.",
  };
}

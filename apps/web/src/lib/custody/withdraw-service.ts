import {
  evaluateWithdrawRequest,
  fetchTokenAccountBalanceAtomic,
  withdrawIdempotencyKey,
  withdrawPolicyFromConfig,
  type RpcFetch,
} from "@catesino/chain";
import { assertSafeAtomicAmount, usdcToAtomic } from "@catesino/config";
import { getServerConfig } from "@/lib/server-config";
import {
  createWithdrawal,
  getHotDailyOutflow,
  getUserFlags,
  listWithdrawals,
  userBalances,
  type WithdrawalRecord,
} from "./user-store";

export type RequestWithdrawResult =
  | {
      ok: true;
      withdrawal: WithdrawalRecord;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason?: string;
    };

async function resolveHotBalance(fetchImpl?: RpcFetch): Promise<bigint> {
  const { config } = getServerConfig();
  if (config.withdrawHotUsdcAta && config.solanaRpcUrl) {
    return fetchTokenAccountBalanceAtomic({
      rpcUrl: config.solanaRpcUrl,
      tokenAccount: config.withdrawHotUsdcAta,
      fetchImpl,
    });
  }
  // Without hot ATA: do not invent mainnet liquidity
  if (config.cluster === "mainnet-beta") {
    return 0n;
  }
  // Dev/test stand-in so policy can be exercised without chain infra
  return config.custody.withdrawHotMaxBalanceAtomic;
}

/**
 * Real withdraw request. Demo play never calls this.
 * Worker send is separate — this only locks ledger + queues row.
 */
export async function requestUserWithdraw(input: {
  sessionWalletPubkey: string;
  /** Human USDC or atomic string */
  amountUsdc?: number;
  amountAtomic?: string;
  clientIdempotencyKey: string;
  fetchImpl?: RpcFetch;
}): Promise<RequestWithdrawResult> {
  const { config } = getServerConfig();
  const policy = withdrawPolicyFromConfig(config);

  if (!policy.withdrawalsEnabled) {
    return {
      ok: false,
      status: 403,
      error: "USDC withdrawals are disabled",
      reason: "withdrawals_disabled",
    };
  }

  let amountAtomic: bigint;
  try {
    if (input.amountAtomic !== undefined) {
      if (!/^\d+$/.test(input.amountAtomic)) {
        throw new Error("amountAtomic must be an integer string");
      }
      amountAtomic = BigInt(input.amountAtomic);
    } else if (input.amountUsdc !== undefined) {
      amountAtomic = usdcToAtomic(Number(input.amountUsdc));
    } else {
      throw new Error("amountUsdc or amountAtomic required");
    }
    assertSafeAtomicAmount(amountAtomic, "withdraw amount");
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: e instanceof Error ? e.message : "Invalid amount",
      reason: "amount_unsafe",
    };
  }

  const bal = userBalances(input.sessionWalletPubkey);
  const flags = getUserFlags(input.sessionWalletPubkey);

  let hotBalance: bigint;
  try {
    hotBalance = await resolveHotBalance(input.fetchImpl);
  } catch (e) {
    return {
      ok: false,
      status: 502,
      error: e instanceof Error ? e.message : "Failed to read withdraw-hot balance",
      reason: "rpc_error",
    };
  }

  const decision = evaluateWithdrawRequest(
    {
      sessionWalletPubkey: input.sessionWalletPubkey,
      destinationWalletPubkey: input.sessionWalletPubkey,
      amountAtomic,
      availableAtomic: bal.availableAtomic,
      selfExcluded: flags.selfExcluded,
      withdrawFrozen: flags.withdrawFrozen || bal.withdrawFrozen,
      hasPriorWithdraw: flags.hasPriorWithdraw,
      lastWithdrawRequestedAtMs: flags.lastWithdrawRequestedAtMs,
      nowMs: Date.now(),
      withdrawHotDailyOutflowAtomic: getHotDailyOutflow(),
      withdrawHotBalanceAtomic: hotBalance,
    },
    policy,
  );

  if (!decision.ok) {
    return {
      ok: false,
      status: 400,
      error: decision.message,
      reason: decision.reason,
    };
  }

  let idem: string;
  try {
    idem = withdrawIdempotencyKey(
      input.sessionWalletPubkey,
      input.clientIdempotencyKey,
    );
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: e instanceof Error ? e.message : "Invalid idempotency key",
    };
  }

  try {
    const withdrawal = createWithdrawal({
      walletPubkey: input.sessionWalletPubkey,
      amountAtomic: decision.amountAtomic,
      destinationWalletPubkey: decision.destinationWalletPubkey,
      approvalLevel: decision.approvalLevel,
      availableAtMs: decision.availableAtMs,
      idempotencyKey: idem,
    });
    return { ok: true, withdrawal };
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: e instanceof Error ? e.message : "Withdraw request failed",
    };
  }
}

export function serializeWithdrawal(w: WithdrawalRecord) {
  return {
    id: w.id,
    amountAtomic: w.amountAtomic.toString(),
    destinationWalletPubkey: w.destinationWalletPubkey,
    status: w.status,
    approvalLevel: w.approvalLevel,
    availableAt: new Date(w.availableAtMs).toISOString(),
    createdAt: new Date(w.createdAtMs).toISOString(),
  };
}

export function userWithdrawalList(walletPubkey: string) {
  return listWithdrawals(walletPubkey).map(serializeWithdrawal);
}

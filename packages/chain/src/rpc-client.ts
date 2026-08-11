import type { JsonParsedTransaction } from "./tx-parse.js";
import { parseTokenTransferLegs, txSucceeded } from "./tx-parse.js";
import type { ParsedUsdcTransferLeg } from "./deposit-claim.js";
import { assertValidTxSignature } from "./addresses.js";

export type RpcFetch = (
  url: string,
  body: unknown,
) => Promise<unknown>;

export type FetchedDepositTx = {
  txSucceeded: boolean;
  confirmations: number;
  transfers: ParsedUsdcTransferLeg[];
  slot: number | null;
  raw: JsonParsedTransaction | null;
};

async function defaultFetch(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}`);
  }
  return res.json();
}

function rpcResult<T>(json: unknown): T {
  if (!json || typeof json !== "object") {
    throw new Error("Invalid RPC response");
  }
  const o = json as { error?: { message?: string }; result?: T };
  if (o.error) {
    throw new Error(o.error.message ?? "RPC error");
  }
  return o.result as T;
}

/**
 * Fetch a transaction and signature status for deposit claim verification.
 * When `secondaryUrl` is provided, both RPCs must agree on success + amount legs.
 */
export async function fetchDepositTransaction(input: {
  txSignature: string;
  rpcUrl: string;
  secondaryRpcUrl?: string;
  usdcMint: string;
  requireSecondary: boolean;
  fetchImpl?: RpcFetch;
}): Promise<FetchedDepositTx> {
  assertValidTxSignature(input.txSignature);
  if (!input.rpcUrl) {
    throw new Error("SOLANA_RPC_URL is not configured");
  }
  const fetchImpl = input.fetchImpl ?? defaultFetch;

  const primary = await loadOne(
    input.rpcUrl,
    input.txSignature,
    input.usdcMint,
    fetchImpl,
  );

  if (input.requireSecondary) {
    const secondaryUrl = input.secondaryRpcUrl;
    if (!secondaryUrl) {
      throw new Error(
        "Secondary RPC required for large deposit but SOLANA_RPC_URL_SECONDARY is empty",
      );
    }
    const secondary = await loadOne(
      secondaryUrl,
      input.txSignature,
      input.usdcMint,
      fetchImpl,
    );
    if (primary.txSucceeded !== secondary.txSucceeded) {
      throw new Error("Primary/secondary RPC disagree on tx success");
    }
    if (primary.confirmations !== secondary.confirmations) {
      // Prefer the more conservative (lower) confirmation count
      primary.confirmations = Math.min(
        primary.confirmations,
        secondary.confirmations,
      );
    }
    if (!legsEqual(primary.transfers, secondary.transfers)) {
      throw new Error("Primary/secondary RPC disagree on transfer legs");
    }
  }

  return primary;
}

async function loadOne(
  url: string,
  txSignature: string,
  usdcMint: string,
  fetchImpl: RpcFetch,
): Promise<FetchedDepositTx> {
  const txJson = await fetchImpl(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      txSignature,
      {
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      },
    ],
  });
  const tx = rpcResult<JsonParsedTransaction | null>(txJson);

  const statusJson = await fetchImpl(url, {
    jsonrpc: "2.0",
    id: 2,
    method: "getSignatureStatuses",
    params: [[txSignature], { searchTransactionHistory: true }],
  });
  const statusResult = rpcResult<{
    value: Array<{ confirmations: number | null; err: unknown; confirmationStatus?: string } | null>;
  }>(statusJson);
  const st = statusResult?.value?.[0];
  let confirmations = 0;
  if (st) {
    if (st.confirmations === null) {
      // finalized
      confirmations = Number.MAX_SAFE_INTEGER;
    } else if (typeof st.confirmations === "number") {
      confirmations = st.confirmations;
    }
  }

  if (!tx) {
    return {
      txSucceeded: false,
      confirmations,
      transfers: [],
      slot: null,
      raw: null,
    };
  }

  const transfers = parseTokenTransferLegs(tx, { defaultMint: usdcMint });
  return {
    txSucceeded: txSucceeded(tx),
    confirmations,
    transfers,
    slot: typeof tx.slot === "number" ? tx.slot : null,
    raw: tx,
  };
}

function legsEqual(
  a: ParsedUsdcTransferLeg[],
  b: ParsedUsdcTransferLeg[],
): boolean {
  if (a.length !== b.length) return false;
  const key = (l: ParsedUsdcTransferLeg) =>
    `${l.mint}|${l.destinationTokenAccount}|${l.sourceOwner}|${l.amountAtomic}`;
  const sa = [...a].map(key).sort();
  const sb = [...b].map(key).sort();
  return sa.every((v, i) => v === sb[i]);
}

/** Optional: read USDC token account balance (atomic). */
export async function fetchTokenAccountBalanceAtomic(input: {
  rpcUrl: string;
  tokenAccount: string;
  fetchImpl?: RpcFetch;
}): Promise<bigint> {
  const fetchImpl = input.fetchImpl ?? defaultFetch;
  const json = await fetchImpl(input.rpcUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "getTokenAccountBalance",
    params: [input.tokenAccount, { commitment: "confirmed" }],
  });
  const result = rpcResult<{ value?: { amount?: string } }>(json);
  const amount = result?.value?.amount;
  if (!amount || !/^\d+$/.test(amount)) {
    throw new Error("Invalid token account balance response");
  }
  return BigInt(amount);
}

import type { ParsedUsdcTransferLeg } from "./deposit-claim.js";

/**
 * Minimal shape of Solana `getTransaction` with `encoding: "jsonParsed"`.
 * Only fields needed for deposit claim verification.
 */
export type JsonParsedTransaction = {
  meta?: {
    err: unknown;
    innerInstructions?: Array<{
      index: number;
      instructions: JsonParsedIx[];
    }>;
  } | null;
  transaction?: {
    message?: {
      instructions?: JsonParsedIx[];
      accountKeys?: Array<string | { pubkey: string }>;
    };
  };
  slot?: number;
};

export type JsonParsedIx = {
  program?: string;
  programId?: string;
  parsed?: {
    type?: string;
    info?: Record<string, unknown>;
  };
  accounts?: string[];
  data?: string;
};

const TOKEN_PROGRAMS = new Set([
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);

function programKind(programId: string | undefined): "spl-token" | "token-2022" | null {
  if (programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") {
    return "spl-token";
  }
  if (programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb") {
    return "token-2022";
  }
  return null;
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function parseAmountAtomic(info: Record<string, unknown>): bigint | null {
  // transferChecked: tokenAmount.amount
  const tokenAmount = info.tokenAmount as { amount?: string } | undefined;
  if (tokenAmount?.amount && /^\d+$/.test(tokenAmount.amount)) {
    return BigInt(tokenAmount.amount);
  }
  // transfer: amount as string
  const amount = info.amount;
  if (typeof amount === "string" && /^\d+$/.test(amount)) {
    return BigInt(amount);
  }
  if (typeof amount === "number" && Number.isFinite(amount) && amount >= 0) {
    return BigInt(Math.trunc(amount));
  }
  return null;
}

/**
 * Extract SPL transfer / transferChecked legs from a jsonParsed transaction.
 * Includes outer and inner instructions.
 *
 * Source binding uses `authority` (token owner/delegate that authorized debit).
 * Mint may be missing on classic `transfer` — caller should resolve via
 * account mint lookup; we still emit legs with mint when present, else "".
 */
export function parseTokenTransferLegs(
  tx: JsonParsedTransaction,
  options?: { defaultMint?: string },
): ParsedUsdcTransferLeg[] {
  const legs: ParsedUsdcTransferLeg[] = [];
  const defaultMint = options?.defaultMint ?? "";

  const collect = (ix: JsonParsedIx) => {
    // jsonParsed often sets program: "spl-token" and programId
    const kind =
      programKind(ix.programId) ??
      (ix.program === "spl-token"
        ? "spl-token"
        : ix.program === "spl-token-2022"
          ? "token-2022"
          : null);
    if (!kind && !TOKEN_PROGRAMS.has(ix.programId ?? "")) return;

    const parsed = ix.parsed;
    if (!parsed?.type || !parsed.info) return;
    const type = parsed.type;
    if (type !== "transfer" && type !== "transferChecked") return;

    const info = parsed.info;
    const destination = asString(info.destination);
    const authority =
      asString(info.authority) ?? asString(info.multisigAuthority);
    const mint = asString(info.mint) ?? defaultMint;
    const amountAtomic = parseAmountAtomic(info);
    if (!destination || !authority || amountAtomic === null || amountAtomic <= 0n) {
      return;
    }

    legs.push({
      mint,
      destinationTokenAccount: destination,
      sourceOwner: authority,
      amountAtomic,
      program: kind ?? "spl-token",
    });
  };

  const outer = tx.transaction?.message?.instructions ?? [];
  for (const ix of outer) collect(ix);

  const inners = tx.meta?.innerInstructions ?? [];
  for (const group of inners) {
    for (const ix of group.instructions) collect(ix);
  }

  return legs;
}

export function txSucceeded(tx: JsonParsedTransaction | null | undefined): boolean {
  if (!tx?.meta) return false;
  return tx.meta.err === null || tx.meta.err === undefined;
}

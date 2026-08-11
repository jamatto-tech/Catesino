/**
 * Solana address / signature validation helpers (no RPC).
 * Rejects malformed base58 so claim/withdraw never accept arbitrary strings.
 */

/** Base58 alphabet used by Solana (Bitcoin alphabet, no 0/O/I/l). */
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;

/** Typical Solana pubkey length in base58 (32 bytes → 32–44 chars). */
const PUBKEY_MIN = 32;
const PUBKEY_MAX = 44;

/** Transaction signatures are 64-byte ed25519 sigs → ~87–88 base58 chars. */
const SIG_MIN = 80;
const SIG_MAX = 90;

export function isValidBase58(value: string): boolean {
  return typeof value === "string" && value.length > 0 && BASE58_RE.test(value);
}

export function isValidSolanaPubkey(value: string): boolean {
  return (
    isValidBase58(value) &&
    value.length >= PUBKEY_MIN &&
    value.length <= PUBKEY_MAX
  );
}

export function isValidTxSignature(value: string): boolean {
  return (
    isValidBase58(value) && value.length >= SIG_MIN && value.length <= SIG_MAX
  );
}

export function assertValidSolanaPubkey(value: string, label = "pubkey"): void {
  if (!isValidSolanaPubkey(value)) {
    throw new Error(`Invalid Solana ${label}`);
  }
}

export function assertValidTxSignature(value: string): void {
  if (!isValidTxSignature(value)) {
    throw new Error("Invalid Solana transaction signature");
  }
}

/** Constant-time string equality for pubkey / mint comparisons. */
export function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

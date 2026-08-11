import { createPublicKey, randomBytes, verify } from "node:crypto";
import { assertValidSolanaPubkey, isValidBase58 } from "./addresses.js";
import { base58Decode } from "./base58.js";

export type SiwsMessageFields = {
  domain: string;
  address: string;
  uri?: string;
  version?: string;
  chainId: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
};

/**
 * Build a SIWS-compatible message (Solana wallet sign-in).
 * Domain-bound; includes one-time nonce + expiration.
 */
export function buildSiwsMessage(fields: SiwsMessageFields): string {
  assertValidSolanaPubkey(fields.address, "address");
  const statement =
    fields.statement ??
    "Sign in to Catesino. This proves wallet ownership and does not spend funds.";
  const version = fields.version ?? "1";
  const lines = [
    `${fields.domain} wants you to sign in with your Solana account:`,
    fields.address,
    "",
    statement,
    "",
    `URI: ${fields.uri ?? `https://${fields.domain}`}`,
    `Version: ${version}`,
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`,
  ];
  return lines.join("\n");
}

export function parseSiwsMessage(message: string): {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  chainId: string;
} {
  const lines = message.split("\n");
  if (lines.length < 10) throw new Error("Invalid SIWS message");
  const header = lines[0] ?? "";
  const domainMatch = header.match(/^(.+) wants you to sign in with your Solana account:$/);
  if (!domainMatch) throw new Error("Invalid SIWS header");
  const domain = domainMatch[1]!;
  const address = (lines[1] ?? "").trim();
  assertValidSolanaPubkey(address, "address");

  const field = (prefix: string): string => {
    const line = lines.find((l) => l.startsWith(prefix));
    if (!line) throw new Error(`Missing SIWS field: ${prefix}`);
    return line.slice(prefix.length).trim();
  };

  return {
    domain,
    address,
    nonce: field("Nonce: "),
    issuedAt: field("Issued At: "),
    expirationTime: field("Expiration Time: "),
    chainId: field("Chain ID: "),
  };
}

/** Ed25519 verify over UTF-8 message bytes (Solana wallet detached sig). */
export function verifySolanaEd25519(
  message: string,
  signatureBase58: string,
  publicKeyBase58: string,
): boolean {
  try {
    assertValidSolanaPubkey(publicKeyBase58);
    if (!isValidBase58(signatureBase58) || signatureBase58.length < 64) {
      return false;
    }
    const pubkey = base58Decode(publicKeyBase58);
    const signature = base58Decode(signatureBase58);
    if (pubkey.length !== 32 || signature.length !== 64) return false;

    // SPKI DER prefix for raw 32-byte Ed25519 public key
    const spkiPrefix = Buffer.from("302a300506032b6570032100", "hex");
    const keyObject = createPublicKey({
      key: Buffer.concat([spkiPrefix, Buffer.from(pubkey)]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(message, "utf8"),
      keyObject,
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

export function generateNonceHex(bytes = 16): string {
  return randomBytes(bytes).toString("hex");
}

export function clusterToChainId(
  cluster: "mainnet-beta" | "devnet",
): string {
  return cluster === "mainnet-beta" ? "solana:mainnet" : "solana:devnet";
}

/**
 * Full SIWS verification for login.
 * Clock skew tolerance default 60s.
 */
export function verifySiwsLogin(input: {
  message: string;
  signature: string;
  publicKey: string;
  expectedDomain: string;
  expectedNonce: string;
  expectedChainId: string;
  nowMs?: number;
  clockSkewMs?: number;
}): { ok: true; address: string } | { ok: false; reason: string } {
  const now = input.nowMs ?? Date.now();
  const skew = input.clockSkewMs ?? 60_000;

  let parsed: ReturnType<typeof parseSiwsMessage>;
  try {
    parsed = parseSiwsMessage(input.message);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Invalid message",
    };
  }

  if (parsed.domain !== input.expectedDomain) {
    return { ok: false, reason: "SIWS domain mismatch" };
  }
  if (parsed.address !== input.publicKey) {
    return { ok: false, reason: "SIWS address does not match publicKey" };
  }
  if (parsed.nonce !== input.expectedNonce) {
    return { ok: false, reason: "SIWS nonce mismatch" };
  }
  if (parsed.chainId !== input.expectedChainId) {
    return { ok: false, reason: "SIWS chain id mismatch" };
  }

  const issued = Date.parse(parsed.issuedAt);
  const exp = Date.parse(parsed.expirationTime);
  if (!Number.isFinite(issued) || !Number.isFinite(exp)) {
    return { ok: false, reason: "Invalid SIWS timestamps" };
  }
  if (now + skew < issued) {
    return { ok: false, reason: "SIWS issued-at is in the future" };
  }
  if (now - skew > exp) {
    return { ok: false, reason: "SIWS message expired" };
  }

  if (
    !verifySolanaEd25519(input.message, input.signature, input.publicKey)
  ) {
    return { ok: false, reason: "Invalid wallet signature" };
  }

  return { ok: true, address: parsed.address };
}

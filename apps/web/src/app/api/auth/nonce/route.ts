import {
  clusterToChainId,
  generateNonceHex,
  buildSiwsMessage,
} from "@catesino/chain";
import { getServerConfig } from "@/lib/server-config";
import { putNonce } from "@/lib/auth/nonce-store";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Issue a one-time SIWS nonce (5 min TTL).
 * Demo play does not need this — only real wallet sessions.
 */
export async function POST() {
  const { config } = getServerConfig();
  const nonce = generateNonceHex(16);
  putNonce(nonce);
  const issuedAt = new Date().toISOString();
  const expirationTime = new Date(Date.now() + 5 * 60_000).toISOString();
  const chainId = clusterToChainId(config.cluster);

  // Template fields for the client to build the same message
  // (client should use server-provided message to avoid drift)
  const message = buildSiwsMessage({
    domain: config.authDomain,
    // Placeholder address — client replaces by rebuilding with their pubkey
    // We also accept client-built message that matches parse rules.
    address: "11111111111111111111111111111111",
    chainId,
    nonce,
    issuedAt,
    expirationTime,
  });

  return jsonOk({
    nonce,
    expiresAt: expirationTime,
    issuedAt,
    domain: config.authDomain,
    chainId,
    /** Hint only — client must rebuild with their real publicKey */
    messageTemplate: message.replace(
      "11111111111111111111111111111111",
      "{publicKey}",
    ),
  });
}

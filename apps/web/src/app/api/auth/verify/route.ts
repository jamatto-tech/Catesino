import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { clusterToChainId, verifySiwsLogin } from "@catesino/chain";
import { getServerConfig } from "@/lib/server-config";
import { consumeNonce } from "@/lib/auth/nonce-store";
import { assertSameOrigin } from "@/lib/auth/origin";
import {
  SESSION_COOKIE,
  sealSession,
  sessionCookieOptions,
  type SessionPayload,
} from "@/lib/auth/session";
import { getOrCreateUser } from "@/lib/custody/user-store";
import { errorFromUnknown, jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

/**
 * Verify SIWS signature and set httpOnly session cookie.
 * Independent of demo session (demo needs no auth).
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const body = (await req.json()) as {
      publicKey?: string;
      signature?: string;
      message?: string;
      nonce?: string;
    };

    const publicKey = body.publicKey?.trim();
    const signature = body.signature?.trim();
    const nonce = body.nonce?.trim();
    const message = body.message;

    if (!publicKey || !signature || !nonce) {
      return jsonError("publicKey, signature, and nonce are required", 400);
    }
    if (!message) {
      return jsonError("message is required", 400);
    }

    if (!consumeNonce(nonce)) {
      return jsonError("Invalid or expired nonce", 401);
    }

    const { config } = getServerConfig();
    const chainId = clusterToChainId(config.cluster);

    const result = verifySiwsLogin({
      message,
      signature,
      publicKey,
      expectedDomain: config.authDomain,
      expectedNonce: nonce,
      expectedChainId: chainId,
    });

    if (!result.ok) {
      return jsonError(result.reason, 401);
    }

    // Ensure user custody row exists (empty balances)
    getOrCreateUser(result.address);

    const now = Date.now();
    const payload: SessionPayload = {
      walletPubkey: result.address,
      sid: randomBytes(16).toString("hex"),
      issuedAt: now,
      lastSeenAt: now,
    };
    const token = sealSession(payload, config.sessionSecret, now);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions(7 * 24 * 60 * 60));

    return jsonOk({
      walletPubkey: result.address,
      demo: false,
      note: "Real wallet session. Demo credits remain on /api/demo/* only.",
    });
  } catch (e) {
    return errorFromUnknown(e);
  }
}

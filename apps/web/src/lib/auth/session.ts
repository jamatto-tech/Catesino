import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getServerConfig } from "@/lib/server-config";
import { assertValidSolanaPubkey } from "@catesino/chain";

export const SESSION_COOKIE = "catesino_session";
const ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IDLE_TTL_MS = 24 * 60 * 60 * 1000;

export type SessionPayload = {
  walletPubkey: string;
  /** Session id (opaque) */
  sid: string;
  issuedAt: number;
  lastSeenAt: number;
};

type Sealed = {
  p: SessionPayload;
  exp: number;
  mac: string;
};

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function sealSession(
  payload: SessionPayload,
  secret: string,
  nowMs = Date.now(),
): string {
  const exp = Math.min(
    payload.issuedAt + ABSOLUTE_TTL_MS,
    nowMs + IDLE_TTL_MS,
  );
  const bodyObj = { p: payload, exp };
  const body = JSON.stringify(bodyObj);
  const mac = sign(body, secret);
  const sealed: Sealed = { ...bodyObj, mac };
  return Buffer.from(JSON.stringify(sealed), "utf8").toString("base64url");
}

export function unsealSession(
  token: string,
  secret: string,
  nowMs = Date.now(),
): SessionPayload | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const sealed = JSON.parse(raw) as Sealed;
    if (!sealed?.p || !sealed.mac || typeof sealed.exp !== "number") return null;
    const body = JSON.stringify({ p: sealed.p, exp: sealed.exp });
    const expected = sign(body, secret);
    if (!safeEqual(sealed.mac, expected)) return null;
    if (nowMs > sealed.exp) return null;
    if (nowMs > sealed.p.issuedAt + ABSOLUTE_TTL_MS) return null;
    assertValidSolanaPubkey(sealed.p.walletPubkey);
    return sealed.p;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

/** Read session from request cookies (App Router). */
export async function getSession(): Promise<SessionPayload | null> {
  const { config } = getServerConfig();
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = unsealSession(token, config.sessionSecret);
  return payload;
}

/** Require authenticated wallet session or throw Response-friendly error. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    const err = new Error("Authentication required");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return session;
}

export function touchSession(payload: SessionPayload, nowMs = Date.now()): SessionPayload {
  return { ...payload, lastSeenAt: nowMs };
}

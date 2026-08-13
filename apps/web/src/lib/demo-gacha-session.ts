import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { CookieReceipt } from "@catesino/gacha";
import { sessionCookieOptions } from "@/lib/auth/session";

/** Dedicated locker cookie. Not `catesino_session`. */
export const GACHA_COOKIE = "catesino_gacha";

/** Absolute 180 days. No idle window — do not reuse SIWS 7d/24h. */
export const GACHA_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const GACHA_TTL_SEC = 180 * 24 * 3600;

export type DemoGachaState = {
  v: 1;
  demoId: string;
  yarn: number;
  lastFaucetUtcDate: string;
  nonce: number;
  pullsSinceRarePlus: number;
  inventory: { itemId: string; count: number }[];
  equipped: { frame?: string; title?: string; lobbyFlair?: string };
  lastReceipt: CookieReceipt | null;
  lastBagworkUtcDate?: string;
  lastBagworkTweetId?: string;
};

export type YarnFaucetPolicy = {
  yarnStart: number;
  yarnFaucetDaily: number;
  yarnCap: number;
};

type Sealed = {
  p: DemoGachaState;
  exp: number;
  mac: string;
};

export function utcDateString(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function emptyDemoGachaState(
  policy: Pick<YarnFaucetPolicy, "yarnStart">,
  nowMs = Date.now(),
): DemoGachaState {
  return {
    v: 1,
    demoId: randomBytes(16).toString("hex"),
    yarn: policy.yarnStart,
    lastFaucetUtcDate: utcDateString(nowMs),
    nonce: 0,
    pullsSinceRarePlus: 0,
    inventory: [],
    equipped: {},
    lastReceipt: null,
  };
}

export function sealGachaState(
  state: DemoGachaState,
  secret: string,
  nowMs = Date.now(),
): string {
  const exp = nowMs + GACHA_TTL_MS;
  const body = JSON.stringify({ p: state, exp });
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  const sealed: Sealed = { p: state, exp, mac };
  return Buffer.from(JSON.stringify(sealed), "utf8").toString("base64url");
}

export function unsealGachaState(
  token: string,
  secret: string,
  nowMs = Date.now(),
): DemoGachaState | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const sealed = JSON.parse(raw) as Sealed;
    if (!sealed?.p || !sealed.mac || typeof sealed.exp !== "number") return null;
    const body = JSON.stringify({ p: sealed.p, exp: sealed.exp });
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    if (!safeEqual(sealed.mac, expected)) return null;
    if (nowMs > sealed.exp) return null;
    if (!isDemoGachaState(sealed.p)) return null;
    return sealed.p;
  } catch {
    return null;
  }
}

/** Automatic daily yarn is off — bagwork on X unlocks today's grant. */
export function applyYarnFaucet(
  state: DemoGachaState,
  _policy: YarnFaucetPolicy,
  _nowMs = Date.now(),
): { state: DemoGachaState; granted: number } {
  return { state, granted: 0 };
}

export function applyBagworkGrant(
  state: DemoGachaState,
  policy: YarnFaucetPolicy,
  tweetId: string,
  nowMs = Date.now(),
): { state: DemoGachaState; granted: number } {
  const today = utcDateString(nowMs);
  if (state.lastBagworkTweetId === tweetId) {
    const err = new Error("that post was already used");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  if (state.lastBagworkUtcDate === today) {
    const err = new Error("today's bagwork yarn is already unlocked");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const stamped: DemoGachaState = {
    ...state,
    lastBagworkUtcDate: today,
    lastBagworkTweetId: tweetId,
  };
  if (state.yarn >= policy.yarnCap) {
    return { state: stamped, granted: 0 };
  }
  return {
    state: { ...stamped, yarn: state.yarn + policy.yarnFaucetDaily },
    granted: policy.yarnFaucetDaily,
  };
}

export function countsFromInventory(
  inventory: DemoGachaState["inventory"],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of inventory) counts[row.itemId] = row.count;
  return counts;
}

export function inventoryFromCounts(
  counts: Record<string, number>,
): DemoGachaState["inventory"] {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => (a.itemId < b.itemId ? -1 : 1));
}

export function gachaCookieOptions() {
  return sessionCookieOptions(GACHA_TTL_SEC);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function isDemoGachaState(value: unknown): value is DemoGachaState {
  if (!value || typeof value !== "object") return false;
  const s = value as DemoGachaState;
  return (
    s.v === 1 &&
    typeof s.demoId === "string" &&
    s.demoId.length > 0 &&
    typeof s.yarn === "number" &&
    Number.isFinite(s.yarn) &&
    typeof s.lastFaucetUtcDate === "string" &&
    typeof s.nonce === "number" &&
    typeof s.pullsSinceRarePlus === "number" &&
    Array.isArray(s.inventory) &&
    typeof s.equipped === "object" &&
    s.equipped !== null
  );
}

import { createHash } from "node:crypto";

const WINDOW_MS = 60_000;
const MAX_HITS = 20;

const hits = new Map<string, number[]>();

export function allowGachaPull(ip: string, demoId: string, nowMs = Date.now()): boolean {
  const key = `${hashShort(ip)}:${hashShort(demoId)}`;
  const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < WINDOW_MS);
  if (recent.length >= MAX_HITS) {
    hits.set(key, recent);
    return false;
  }
  recent.push(nowMs);
  hits.set(key, recent);
  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashShort(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

/**
 * One-time SIWS nonces (in-memory).
 * Production should use Redis GETDEL; this keeps demo/local clean without infra.
 */

type NonceRecord = {
  expiresAtMs: number;
};

const globalForNonce = globalThis as unknown as {
  __catesinoNonces?: Map<string, NonceRecord>;
};

function store(): Map<string, NonceRecord> {
  if (!globalForNonce.__catesinoNonces) {
    globalForNonce.__catesinoNonces = new Map();
  }
  return globalForNonce.__catesinoNonces;
}

const TTL_MS = 5 * 60 * 1000;

export function putNonce(nonce: string, nowMs = Date.now()): void {
  // Opportunistic cleanup
  if (store().size > 5_000) {
    for (const [k, v] of store()) {
      if (v.expiresAtMs <= nowMs) store().delete(k);
    }
  }
  store().set(nonce, { expiresAtMs: nowMs + TTL_MS });
}

/** Consume nonce once. Returns false if missing/expired/already used. */
export function consumeNonce(nonce: string, nowMs = Date.now()): boolean {
  const rec = store().get(nonce);
  store().delete(nonce);
  if (!rec) return false;
  if (rec.expiresAtMs <= nowMs) return false;
  return true;
}

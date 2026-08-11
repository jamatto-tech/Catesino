import { describe, expect, it } from "vitest";
import { sealSession, unsealSession, type SessionPayload } from "./session";

describe("session seal", () => {
  const secret = "test-secret";
  const payload: SessionPayload = {
    walletPubkey: "11111111111111111111111111111111",
    sid: "abc",
    issuedAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  it("round-trips valid session", () => {
    const token = sealSession(payload, secret);
    const out = unsealSession(token, secret);
    expect(out?.walletPubkey).toBe(payload.walletPubkey);
    expect(out?.sid).toBe("abc");
  });

  it("rejects tampered token", () => {
    const token = sealSession(payload, secret);
    const tampered = token.slice(0, -4) + "xxxx";
    expect(unsealSession(tampered, secret)).toBeNull();
  });

  it("rejects expired session", () => {
    const old: SessionPayload = {
      ...payload,
      issuedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      lastSeenAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    const token = sealSession(old, secret, old.issuedAt + 1000);
    expect(unsealSession(token, secret)).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { base58Decode, base58Encode } from "./base58.js";

describe("base58", () => {
  it("round-trips random bytes", () => {
    const samples = [
      new Uint8Array(32),
      new Uint8Array(32).fill(1),
      new Uint8Array([1, 2, 3, 4, 5]),
      new Uint8Array(64).map((_, i) => i),
    ];
    for (const s of samples) {
      const enc = base58Encode(s);
      const dec = base58Decode(enc);
      expect([...dec]).toEqual([...s]);
    }
  });

  it("encodes all-zero 32-byte pubkey as 32 ones", () => {
    const enc = base58Encode(new Uint8Array(32));
    expect(enc).toBe("1".repeat(32));
  });
});

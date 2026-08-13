import { createHash, createHmac, randomBytes } from "node:crypto";

const MAX_U32 = 0x100000000;
const REJECT_CAP = 1000;

export function freshServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function commitSeed(serverSeedHex: string): string {
  return createHash("sha256").update(serverSeedHex).digest("hex");
}

export function seedToKey(serverSeedHex: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(serverSeedHex)) {
    throw new Error("serverSeed must be 32-byte hex");
  }
  return Buffer.from(serverSeedHex, "hex");
}

/**
 * Unbiased index into `size` via HMAC-SHA256 + rejection sampling.
 * Key is the 32-byte seed (not the hex string). Message includes the counter.
 */
export function hmacIndex(
  key: Buffer,
  clientSeed: string,
  nonce: number,
  lane: "rarity" | "item",
  size: number,
): number {
  if (size <= 0) throw new Error("empty multiset");
  const limit = MAX_U32 - (MAX_U32 % size);
  let counter = 0;
  for (;;) {
    const msg = `${clientSeed}:${nonce}:${lane}:${counter}`;
    const digest = createHmac("sha256", key).update(msg).digest();
    const n = digest.readUInt32BE(0);
    if (n < limit) return n % size;
    counter += 1;
    if (counter > REJECT_CAP) throw new Error("rejection sampling failed");
  }
}

export function sha256Hex(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

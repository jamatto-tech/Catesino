import { createHash, randomBytes } from "node:crypto";

/** Deterministic roll 0..maxInclusive from seed material. */
export function rollInt(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  maxInclusive: number,
): number {
  if (maxInclusive < 0) throw new Error("maxInclusive must be >= 0");
  const digest = createHash("sha256")
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest();
  const n = digest.readUInt32BE(0);
  return n % (maxInclusive + 1);
}

export function freshServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function commitSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

/** Minimal base58 encode/decode (Bitcoin alphabet — Solana compatible). */

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const MAP = new Map<string, number>(
  [...ALPHABET].map((c, i) => [c, i]),
);

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";

  // Little-endian base58 digits (least significant first)
  const digits: number[] = [];
  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j]! << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  // Leading zero bytes → leading '1'
  let str = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    str += "1";
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += ALPHABET[digits[i]!];
  }
  // All-zero input: digits empty → only leading ones (correct).
  // Non-zero with empty digits should not happen; guard empty result.
  return str.length > 0 ? str : "1";
}

export function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);

  // Little-endian base256
  const bytes: number[] = [];
  for (const char of str) {
    const val = MAP.get(char);
    if (val === undefined) {
      throw new Error("Invalid base58 character");
    }
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let zeros = 0;
  for (const char of str) {
    if (char !== "1") break;
    zeros++;
  }

  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[out.length - 1 - i] = bytes[i]!;
  }
  return out;
}

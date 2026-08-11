import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  buildSiwsMessage,
  clusterToChainId,
  parseSiwsMessage,
  verifySiwsLogin,
  verifySolanaEd25519,
} from "./siws.js";
import { base58Encode } from "./base58.js";

function solanaKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const pubDer = publicKey.export({ type: "spki", format: "der" });
  // Last 32 bytes of SPKI are the raw key
  const rawPub = pubDer.subarray(pubDer.length - 32);
  const address = base58Encode(rawPub);
  return { publicKey, privateKey, address, rawPub };
}

describe("SIWS", () => {
  it("round-trips message parse", () => {
    const msg = buildSiwsMessage({
      domain: "localhost",
      address: "11111111111111111111111111111111",
      chainId: "solana:devnet",
      nonce: "abc123",
      issuedAt: "2026-01-01T00:00:00.000Z",
      expirationTime: "2026-01-01T00:05:00.000Z",
    });
    const p = parseSiwsMessage(msg);
    expect(p.domain).toBe("localhost");
    expect(p.nonce).toBe("abc123");
    expect(p.address).toBe("11111111111111111111111111111111");
  });

  it("verifies a real ed25519 wallet signature", () => {
    const kp = solanaKeypair();
    const issuedAt = new Date().toISOString();
    const expirationTime = new Date(Date.now() + 5 * 60_000).toISOString();
    const message = buildSiwsMessage({
      domain: "localhost",
      address: kp.address,
      chainId: clusterToChainId("devnet"),
      nonce: "nonce-1",
      issuedAt,
      expirationTime,
    });
    const sig = sign(null, Buffer.from(message, "utf8"), kp.privateKey);
    const signature = base58Encode(new Uint8Array(sig));

    expect(verifySolanaEd25519(message, signature, kp.address)).toBe(true);

    const ok = verifySiwsLogin({
      message,
      signature,
      publicKey: kp.address,
      expectedDomain: "localhost",
      expectedNonce: "nonce-1",
      expectedChainId: "solana:devnet",
    });
    expect(ok).toEqual({ ok: true, address: kp.address });
  });

  it("rejects domain and nonce mismatches", () => {
    const kp = solanaKeypair();
    const message = buildSiwsMessage({
      domain: "localhost",
      address: kp.address,
      chainId: "solana:devnet",
      nonce: "n1",
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 60_000).toISOString(),
    });
    const sig = sign(null, Buffer.from(message, "utf8"), kp.privateKey);
    const signature = base58Encode(new Uint8Array(sig));

    expect(
      verifySiwsLogin({
        message,
        signature,
        publicKey: kp.address,
        expectedDomain: "evil.com",
        expectedNonce: "n1",
        expectedChainId: "solana:devnet",
      }).ok,
    ).toBe(false);

    expect(
      verifySiwsLogin({
        message,
        signature,
        publicKey: kp.address,
        expectedDomain: "localhost",
        expectedNonce: "wrong",
        expectedChainId: "solana:devnet",
      }).ok,
    ).toBe(false);
  });
});

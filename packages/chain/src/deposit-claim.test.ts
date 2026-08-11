import { describe, expect, it } from "vitest";
import { loadConfig, usdcToAtomic } from "@catesino/config";
import {
  depositClaimPolicyFromConfig,
  depositIdempotencyKey,
  evaluateDepositClaim,
  type DepositClaimInput,
  type ParsedUsdcTransferLeg,
} from "./deposit-claim.js";
import { createChainContext } from "./mints.js";

// Valid base58 lengths (no 0/O/I/l) for unit tests — not real chain keys
const WALLET_A = "11111111111111111111111111111111";
const WALLET_B = "22222222222222222222222222222222";
const DEPOSIT_ATA = "33333333333333333333333333333333";
const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";

function policy(overrides: Record<string, string> = {}) {
  const cfg = loadConfig({
    SOLANA_CLUSTER: "devnet",
    FF_DEPOSITS_USDC: "true",
    FF_PUBLIC_MAINNET_FUNDS: "false",
    MIN_DEPOSIT_USDC: "1",
    MIN_CONFIRMATIONS: "32",
    SECONDARY_RPC_THRESHOLD_USDC: "50",
    ...overrides,
  });
  return {
    policy: depositClaimPolicyFromConfig(cfg),
    chain: createChainContext(cfg),
    usdc: cfg.mints.usdc,
  };
}

function baseInput(
  usdcMint: string,
  overrides: Partial<DepositClaimInput> = {},
): DepositClaimInput {
  const leg: ParsedUsdcTransferLeg = {
    mint: usdcMint,
    destinationTokenAccount: DEPOSIT_ATA,
    sourceOwner: WALLET_A,
    amountAtomic: usdcToAtomic(10),
    program: "spl-token",
  };
  return {
    sessionWalletPubkey: WALLET_A,
    txSignature: SIG,
    txSucceeded: true,
    confirmations: 32,
    depositAta: DEPOSIT_ATA,
    transfers: [leg],
    alreadyCredited: false,
    ...overrides,
  };
}

describe("evaluateDepositClaim", () => {
  it("credits matching USDC transfer from session wallet", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(baseInput(usdc), p, chain);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.amountAtomic).toBe(usdcToAtomic(10));
      expect(result.requireSecondaryRpc).toBe(false);
    }
  });

  it("requires secondary RPC for large claims", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, {
        transfers: [
          {
            mint: usdc,
            destinationTokenAccount: DEPOSIT_ATA,
            sourceOwner: WALLET_A,
            amountAtomic: usdcToAtomic(50),
            program: "spl-token",
          },
        ],
      }),
      p,
      chain,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.requireSecondaryRpc).toBe(true);
  });

  it("rejects double-claim of same signature", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, { alreadyCredited: true }),
      p,
      chain,
    );
    expect(result).toMatchObject({ ok: false, reason: "already_credited" });
  });

  it("wallet A pays, wallet B session cannot claim (source binding)", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, { sessionWalletPubkey: WALLET_B }),
      p,
      chain,
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "source_binding_failed",
    });
  });

  it("rejects wrong mint", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, {
        transfers: [
          {
            mint: "FakeUsdcMint1111111111111111111111111111111",
            destinationTokenAccount: DEPOSIT_ATA,
            sourceOwner: WALLET_A,
            amountAtomic: usdcToAtomic(10),
            program: "spl-token",
          },
        ],
      }),
      p,
      chain,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["wrong_mint", "no_matching_transfer"]).toContain(result.reason);
    }
  });

  it("rejects wrong destination ATA", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, {
        transfers: [
          {
            mint: usdc,
            destinationTokenAccount: "44444444444444444444444444444444",
            sourceOwner: WALLET_A,
            amountAtomic: usdcToAtomic(10),
            program: "spl-token",
          },
        ],
      }),
      p,
      chain,
    );
    expect(result).toMatchObject({ ok: false, reason: "wrong_destination" });
  });

  it("rejects below min deposit", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, {
        transfers: [
          {
            mint: usdc,
            destinationTokenAccount: DEPOSIT_ATA,
            sourceOwner: WALLET_A,
            amountAtomic: usdcToAtomic(0.5),
            program: "spl-token",
          },
        ],
      }),
      p,
      chain,
    );
    expect(result).toMatchObject({ ok: false, reason: "below_min_deposit" });
  });

  it("fee-payer is not sufficient — only source owner counts", () => {
    const { policy: p, chain, usdc } = policy();
    // Transfer from WALLET_A; session is WALLET_A → ok even if fee payer were B
    // (fee payer is not in the input model by design)
    const ok = evaluateDepositClaim(baseInput(usdc), p, chain);
    expect(ok.ok).toBe(true);
    // Session B with source A fails
    const bad = evaluateDepositClaim(
      baseInput(usdc, { sessionWalletPubkey: WALLET_B }),
      p,
      chain,
    );
    expect(bad.ok).toBe(false);
  });

  it("sums only matching legs; ignores foreign legs in same tx", () => {
    const { policy: p, chain, usdc } = policy();
    const result = evaluateDepositClaim(
      baseInput(usdc, {
        transfers: [
          {
            mint: usdc,
            destinationTokenAccount: DEPOSIT_ATA,
            sourceOwner: WALLET_A,
            amountAtomic: usdcToAtomic(5),
            program: "spl-token",
          },
          {
            mint: usdc,
            destinationTokenAccount: DEPOSIT_ATA,
            sourceOwner: WALLET_B,
            amountAtomic: usdcToAtomic(100),
            program: "spl-token",
          },
        ],
      }),
      p,
      chain,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.amountAtomic).toBe(usdcToAtomic(5));
  });

  it("rejects failed tx and low confirmations and reorg", () => {
    const { policy: p, chain, usdc } = policy();
    expect(
      evaluateDepositClaim(baseInput(usdc, { txSucceeded: false }), p, chain),
    ).toMatchObject({ reason: "tx_failed" });
    expect(
      evaluateDepositClaim(baseInput(usdc, { confirmations: 10 }), p, chain),
    ).toMatchObject({ reason: "insufficient_confirmations" });
    expect(
      evaluateDepositClaim(baseInput(usdc, { reorged: true }), p, chain),
    ).toMatchObject({ reason: "reorged" });
  });

  it("rejects when deposits flag off", () => {
    const { policy: p, chain, usdc } = policy({ FF_DEPOSITS_USDC: "false" });
    expect(evaluateDepositClaim(baseInput(usdc), p, chain)).toMatchObject({
      reason: "deposits_disabled",
    });
  });

  it("rejects mainnet without public funds gate", () => {
    const { policy: p, chain, usdc } = policy({
      SOLANA_CLUSTER: "mainnet-beta",
      FF_DEPOSITS_USDC: "true",
      FF_PUBLIC_MAINNET_FUNDS: "false",
    });
    expect(evaluateDepositClaim(baseInput(usdc), p, chain)).toMatchObject({
      reason: "mainnet_funds_disabled",
    });
  });

  it("builds deposit idempotency key from signature", () => {
    expect(depositIdempotencyKey(SIG)).toBe(`deposit:tx:${SIG}`);
  });
});

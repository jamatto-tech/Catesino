import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requestUserWithdraw } from "./withdraw-service";
import {
  recordDepositCredit,
  resetCustodyStoreForTests,
  userBalances,
} from "./user-store";
import { resetServerConfigCacheForTests } from "@/lib/server-config";

const WALLET = "11111111111111111111111111111111";
const OTHER = "22222222222222222222222222222222";

describe("requestUserWithdraw", () => {
  beforeEach(() => {
    resetCustodyStoreForTests();
    resetServerConfigCacheForTests();
    process.env.FF_WITHDRAWALS = "true";
    process.env.FF_PUBLIC_MAINNET_FUNDS = "false";
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.WITHDRAW_FIRST_COOLDOWN_HOURS = "0";
    process.env.WITHDRAW_MANUAL_THRESHOLD_USDC = "100";
    process.env.WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC = "500";
    process.env.WITHDRAW_HOT_PER_TX_CAP_USDC = "200";
    process.env.WITHDRAW_HOT_DAILY_CAP_USDC = "5000";
    process.env.WITHDRAW_HOT_MAX_BALANCE_USDC = "2000";
    // Seed real balance via deposit credit helper (not demo)
    recordDepositCredit({
      walletPubkey: WALLET,
      txSignature:
        "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
      amountAtomic: 50_000_000n,
      idempotencyKey: "test-seed",
    });
  });

  afterEach(() => {
    resetCustodyStoreForTests();
    resetServerConfigCacheForTests();
    delete process.env.FF_WITHDRAWALS;
  });

  it("locks withdraw amount on request", async () => {
    const result = await requestUserWithdraw({
      sessionWalletPubkey: WALLET,
      amountUsdc: 10,
      clientIdempotencyKey: "k1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.withdrawal.destinationWalletPubkey).toBe(WALLET);
    const bal = userBalances(WALLET);
    expect(bal.availableAtomic).toBe(40_000_000n);
    expect(bal.lockedWithdrawAtomic).toBe(10_000_000n);
  });

  it("rejects when withdrawals disabled — demo path unaffected by this store", async () => {
    process.env.FF_WITHDRAWALS = "false";
    resetServerConfigCacheForTests();
    const result = await requestUserWithdraw({
      sessionWalletPubkey: WALLET,
      amountUsdc: 5,
      clientIdempotencyKey: "k2",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("withdrawals_disabled");
  });

  it("idempotent client key does not double-lock", async () => {
    const a = await requestUserWithdraw({
      sessionWalletPubkey: WALLET,
      amountUsdc: 5,
      clientIdempotencyKey: "same",
    });
    const b = await requestUserWithdraw({
      sessionWalletPubkey: WALLET,
      amountUsdc: 5,
      clientIdempotencyKey: "same",
    });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.withdrawal.id).toBe(b.withdrawal.id);
    }
    expect(userBalances(WALLET).lockedWithdrawAtomic).toBe(5_000_000n);
  });

  it("never credits unrelated wallet", async () => {
    expect(userBalances(OTHER).availableAtomic).toBe(0n);
  });
});

import { describe, expect, it } from "vitest";
import { loadConfig, usdcToAtomic } from "@catesino/config";
import {
  assertDualAdminApproval,
  assertWithdrawSendAllowed,
  evaluateWithdrawRequest,
  withdrawIdempotencyKey,
  withdrawPolicyFromConfig,
  type WithdrawRequestInput,
} from "./withdraw-policy.js";

const WALLET = "11111111111111111111111111111111";
const OTHER = "22222222222222222222222222222222";

function policy(overrides: Record<string, string> = {}) {
  const cfg = loadConfig({
    FF_WITHDRAWALS: "true",
    FF_PUBLIC_MAINNET_FUNDS: "false",
    SOLANA_CLUSTER: "devnet",
    WITHDRAW_FIRST_COOLDOWN_HOURS: "24",
    WITHDRAW_COOLDOWN_MINUTES: "0",
    WITHDRAW_MANUAL_THRESHOLD_USDC: "100",
    WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC: "500",
    WITHDRAW_HOT_PER_TX_CAP_USDC: "200",
    WITHDRAW_HOT_DAILY_CAP_USDC: "5000",
    ...overrides,
  });
  return withdrawPolicyFromConfig(cfg);
}

function base(
  overrides: Partial<WithdrawRequestInput> = {},
): WithdrawRequestInput {
  return {
    sessionWalletPubkey: WALLET,
    destinationWalletPubkey: WALLET,
    amountAtomic: usdcToAtomic(25),
    availableAtomic: usdcToAtomic(100),
    selfExcluded: false,
    withdrawFrozen: false,
    hasPriorWithdraw: true,
    nowMs: 1_700_000_000_000,
    withdrawHotDailyOutflowAtomic: 0n,
    withdrawHotBalanceAtomic: usdcToAtomic(1000),
    ...overrides,
  };
}

describe("evaluateWithdrawRequest", () => {
  it("allows auto withdraw to own wallet under caps", () => {
    const result = evaluateWithdrawRequest(base(), policy());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.approvalLevel).toBe("auto");
      expect(result.destinationWalletPubkey).toBe(WALLET);
    }
  });

  it("rejects third-party destination", () => {
    const result = evaluateWithdrawRequest(
      base({ destinationWalletPubkey: OTHER }),
      policy(),
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "destination_not_own_wallet",
    });
  });

  it("rejects self-excluded and frozen wallets", () => {
    expect(
      evaluateWithdrawRequest(base({ selfExcluded: true }), policy()),
    ).toMatchObject({ reason: "self_excluded" });
    expect(
      evaluateWithdrawRequest(base({ withdrawFrozen: true }), policy()),
    ).toMatchObject({ reason: "withdraw_frozen" });
  });

  it("rejects insufficient available", () => {
    expect(
      evaluateWithdrawRequest(
        base({ amountAtomic: usdcToAtomic(200) }),
        policy(),
      ),
    ).toMatchObject({ reason: "insufficient_available" });
  });

  it("applies first-withdraw cool-down as availableAt delay", () => {
    const result = evaluateWithdrawRequest(
      base({ hasPriorWithdraw: false }),
      policy(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.availableAtMs).toBe(
        base().nowMs + 24 * 3_600_000,
      );
    }
  });

  it("requires manual approval at $100+", () => {
    const result = evaluateWithdrawRequest(
      base({ amountAtomic: usdcToAtomic(100) }),
      policy(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.approvalLevel).toBe("manual");
  });

  it("requires dual admin at $500+", () => {
    const result = evaluateWithdrawRequest(
      base({
        amountAtomic: usdcToAtomic(500),
        availableAtomic: usdcToAtomic(1000),
      }),
      policy(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.approvalLevel).toBe("dual_admin");
  });

  it("rejects when daily hot outflow would exceed cap", () => {
    const result = evaluateWithdrawRequest(
      base({
        amountAtomic: usdcToAtomic(100),
        availableAtomic: usdcToAtomic(500),
        withdrawHotDailyOutflowAtomic: usdcToAtomic(4950),
      }),
      policy(),
    );
    expect(result).toMatchObject({ reason: "exceeds_hot_daily_cap" });
  });

  it("rejects auto when hot underfunded", () => {
    const result = evaluateWithdrawRequest(
      base({ withdrawHotBalanceAtomic: usdcToAtomic(1) }),
      policy(),
    );
    expect(result).toMatchObject({ reason: "hot_underfunded" });
  });

  it("rejects when withdrawals disabled or mainnet gate off", () => {
    expect(
      evaluateWithdrawRequest(base(), policy({ FF_WITHDRAWALS: "false" })),
    ).toMatchObject({ reason: "withdrawals_disabled" });
    expect(
      evaluateWithdrawRequest(
        base(),
        policy({
          SOLANA_CLUSTER: "mainnet-beta",
          FF_WITHDRAWALS: "true",
          FF_PUBLIC_MAINNET_FUNDS: "false",
        }),
      ),
    ).toMatchObject({ reason: "mainnet_funds_disabled" });
  });
});

describe("assertDualAdminApproval", () => {
  it("requires two distinct admins", () => {
    expect(() => assertDualAdminApproval("a", "a")).toThrow(/distinct/);
    expect(() => assertDualAdminApproval("a", null)).toThrow(/required/);
    expect(() => assertDualAdminApproval("admin1", "admin2")).not.toThrow();
  });
});

describe("assertWithdrawSendAllowed", () => {
  it("refuses destination swap and failed simulation", () => {
    expect(() =>
      assertWithdrawSendAllowed({
        destinationWalletPubkey: OTHER,
        expectedDestination: WALLET,
        amountAtomic: usdcToAtomic(10),
        perTxCapAtomic: usdcToAtomic(200),
        simulatedOk: true,
        status: "approved",
      }),
    ).toThrow(/mismatch/);
    expect(() =>
      assertWithdrawSendAllowed({
        destinationWalletPubkey: WALLET,
        expectedDestination: WALLET,
        amountAtomic: usdcToAtomic(10),
        perTxCapAtomic: usdcToAtomic(200),
        simulatedOk: false,
        status: "approved",
      }),
    ).toThrow(/simulation/);
  });
});

describe("withdrawIdempotencyKey", () => {
  it("scopes client key to user", () => {
    expect(withdrawIdempotencyKey("u1", "k1")).toBe("withdraw:req:u1:k1");
    expect(() => withdrawIdempotencyKey("u1", "x".repeat(200))).toThrow();
  });
});

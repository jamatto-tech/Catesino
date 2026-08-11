import { z } from "zod";

/** Atomic USDC has 6 decimals on Solana SPL. */
export const USDC_DECIMALS = 6;

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "yes";
  });

const numberFromEnv = z.coerce.number().finite();

/**
 * Single source of truth for product + chain tunables.
 * Business packages must import values from here (or receive them as params)
 * — never scatter mint strings / bet limits as magic literals.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SOLANA_CLUSTER: z.enum(["mainnet-beta", "devnet"]).default("devnet"),

  USDC_MINT_MAINNET: z
    .string()
    .min(32)
    .default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDC_MINT_DEVNET: z
    .string()
    .min(32)
    .default("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  CATE_MINT: z
    .string()
    .min(32)
    .default("Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump"),

  BET_MIN_USDC: numberFromEnv.default(0.5),
  BET_MAX_USDC: numberFromEnv.default(25),

  BUY_RATIO: numberFromEnv.min(0).max(1).default(0.7),
  RESERVE_FLOOR_USDC: numberFromEnv.min(0).default(5000),
  MIN_DAILY_BUY_USDC: numberFromEnv.min(0).default(25),
  MAX_DAILY_BUY_USDC: numberFromEnv.min(0).default(10_000),

  AGE_MINIMUM: numberFromEnv.int().min(18).default(18),
  /** Comma-separated ISO country codes */
  GEO_DENY_LIST: z.string().default(""),

  FF_MARKETING_THESIS_CLAIMS: boolFromEnv.default(false),
  FF_PUBLIC_MAINNET_FUNDS: boolFromEnv.default(false),
  /** Real USDC deposit claims (off until custody wired + counsel gate) */
  FF_DEPOSITS_USDC: boolFromEnv.default(false),
  /** Real USDC withdrawals (off until withdraw-hot + cool-down wired) */
  FF_WITHDRAWALS: boolFromEnv.default(false),
  /** @deprecated use FF_BLACKCATE_ENABLED */
  FF_BLACKJACK_ENABLED: boolFromEnv.default(true),
  FF_BLACKCATE_ENABLED: boolFromEnv.optional(),
  FF_CATEFLIP_ENABLED: boolFromEnv.default(true),
  FF_CATEDICE_ENABLED: boolFromEnv.default(true),
  FF_CATESPIN_ENABLED: boolFromEnv.default(true),
  FF_HIGHCATE_ENABLED: boolFromEnv.default(true),
  FF_CATESLOTS_ENABLED: boolFromEnv.default(true),
  FF_CATEPOKER_ENABLED: boolFromEnv.default(true),
  FF_VIDEOCATE_ENABLED: boolFromEnv.default(true),

  /** Shared deposit intake owner (base58). Empty until key ceremony. */
  DEPOSIT_OWNER_PUBKEY: z.string().default(""),
  /**
   * Optional explicit deposit ATA. Prefer empty: derive from
   * (DEPOSIT_OWNER_PUBKEY, USDC mint) via associated-token program.
   */
  DEPOSIT_ATA: z.string().default(""),
  /** Minimum claimable deposit (human USDC). Dust below this is rejected. */
  MIN_DEPOSIT_USDC: numberFromEnv.min(0).default(1),
  /** Solana confirmations required before credit (design: 32). */
  MIN_CONFIRMATIONS: numberFromEnv.int().min(1).default(32),
  /** Dual-RPC verify threshold (human USDC). */
  SECONDARY_RPC_THRESHOLD_USDC: numberFromEnv.min(0).default(50),

  /** First withdrawal cool-down hours for a wallet. */
  WITHDRAW_FIRST_COOLDOWN_HOURS: numberFromEnv.min(0).default(24),
  /** Subsequent withdraw cool-down minutes (0 = immediate after first). */
  WITHDRAW_COOLDOWN_MINUTES: numberFromEnv.min(0).default(0),
  /** Amount ≥ this requires manual admin approve (human USDC). */
  WITHDRAW_MANUAL_THRESHOLD_USDC: numberFromEnv.min(0).default(100),
  /** Amount ≥ this requires two distinct admin approvers (human USDC). */
  WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC: numberFromEnv.min(0).default(500),
  /** Per-tx cap for withdraw-hot auto-send (human USDC). */
  WITHDRAW_HOT_PER_TX_CAP_USDC: numberFromEnv.min(0).default(200),
  /** Daily outflow cap for withdraw-hot (human USDC). */
  WITHDRAW_HOT_DAILY_CAP_USDC: numberFromEnv.min(0).default(5000),
  /** Hard max balance on withdraw-hot (human USDC). */
  WITHDRAW_HOT_MAX_BALANCE_USDC: numberFromEnv.min(0).default(2000),

  CATESINO_AUTH_DOMAIN: z.string().default("localhost"),
  PORT: numberFromEnv.default(3000),
  WORKER_PORT: numberFromEnv.default(3100),
});

export type EnvConfig = z.infer<typeof envSchema>;

export type FeatureFlags = {
  marketingThesisClaims: boolean;
  publicMainnetFunds: boolean;
  /** Real deposit claim path (requires custody + RPC verify) */
  depositsUsdc: boolean;
  /** Real withdrawal path (requires withdraw-hot + policy) */
  withdrawals: boolean;
  /** BlackCate (blackjack engine) */
  blackcateEnabled: boolean;
  /** Alias kept for older call sites */
  blackjackEnabled: boolean;
  cateflipEnabled: boolean;
  catediceEnabled: boolean;
  catespinEnabled: boolean;
  highcateEnabled: boolean;
  cateslotsEnabled: boolean;
  catepokerEnabled: boolean;
  videocateEnabled: boolean;
};

/** Custody / transfer policy — single source for deposit & withdraw gates. */
export type CustodyPolicy = {
  depositOwnerPubkey: string;
  depositAta: string;
  minDepositUsdc: number;
  minDepositAtomic: bigint;
  minConfirmations: number;
  secondaryRpcThresholdUsdc: number;
  secondaryRpcThresholdAtomic: bigint;
  withdrawFirstCooldownHours: number;
  withdrawCooldownMinutes: number;
  withdrawManualThresholdUsdc: number;
  withdrawManualThresholdAtomic: bigint;
  withdrawDualApproveThresholdUsdc: number;
  withdrawDualApproveThresholdAtomic: bigint;
  withdrawHotPerTxCapUsdc: number;
  withdrawHotPerTxCapAtomic: bigint;
  withdrawHotDailyCapUsdc: number;
  withdrawHotDailyCapAtomic: bigint;
  withdrawHotMaxBalanceUsdc: number;
  withdrawHotMaxBalanceAtomic: bigint;
};

export type BetLimits = {
  /** Human USDC units */
  minUsdc: number;
  maxUsdc: number;
  /** Atomic (6 decimals) */
  minAtomic: bigint;
  maxAtomic: bigint;
};

export type BuyPolicy = {
  buyRatio: number;
  reserveFloorUsdc: number;
  reserveFloorAtomic: bigint;
  minDailyBuyUsdc: number;
  maxDailyBuyUsdc: number;
  minDailyBuyAtomic: bigint;
  maxDailyBuyAtomic: bigint;
};

export type AppConfig = {
  env: EnvConfig;
  cluster: "mainnet-beta" | "devnet";
  mints: {
    usdc: string;
    cate: string;
    usdcMainnet: string;
    usdcDevnet: string;
  };
  betLimits: BetLimits;
  buyPolicy: BuyPolicy;
  custody: CustodyPolicy;
  compliance: {
    ageMinimum: number;
    geoDenyList: string[];
  };
  flags: FeatureFlags;
  authDomain: string;
  usdcDecimals: typeof USDC_DECIMALS;
};

/** Max atomic USDC accepted by ledger ops (~1e15 human ≈ 1e21 atomic). */
export const MAX_ATOMIC_AMOUNT = 10n ** 21n;

export function usdcToAtomic(human: number): bigint {
  if (!Number.isFinite(human) || human < 0) {
    throw new Error(`Invalid USDC amount: ${human}`);
  }
  // Avoid float drift for common stake sizes
  const scaled = Math.round(human * 10 ** USDC_DECIMALS);
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(`USDC amount out of safe integer range: ${human}`);
  }
  const atomic = BigInt(scaled);
  if (atomic > MAX_ATOMIC_AMOUNT) {
    throw new Error(`USDC amount exceeds maximum: ${human}`);
  }
  return atomic;
}

export function atomicToUsdc(atomic: bigint): number {
  if (atomic < 0n) throw new Error(`Negative atomic amount: ${atomic}`);
  return Number(atomic) / 10 ** USDC_DECIMALS;
}

/** Reject non-positive or absurd atomic amounts used in money movement. */
export function assertSafeAtomicAmount(amount: bigint, label = "amount"): void {
  if (typeof amount !== "bigint") {
    throw new Error(`${label} must be bigint`);
  }
  if (amount <= 0n) {
    throw new Error(`${label} must be positive`);
  }
  if (amount > MAX_ATOMIC_AMOUNT) {
    throw new Error(`${label} exceeds maximum safe atomic amount`);
  }
}

function parseGeoList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function loadConfig(
  source: Record<string, string | undefined> = process.env,
): AppConfig {
  const parsed = envSchema.parse(source);
  if (parsed.BET_MIN_USDC > parsed.BET_MAX_USDC) {
    throw new Error("BET_MIN_USDC must be <= BET_MAX_USDC");
  }
  const usdc =
    parsed.SOLANA_CLUSTER === "mainnet-beta"
      ? parsed.USDC_MINT_MAINNET
      : parsed.USDC_MINT_DEVNET;

  if (
    parsed.WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC <
    parsed.WITHDRAW_MANUAL_THRESHOLD_USDC
  ) {
    throw new Error(
      "WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC must be >= WITHDRAW_MANUAL_THRESHOLD_USDC",
    );
  }

  return {
    env: parsed,
    cluster: parsed.SOLANA_CLUSTER,
    mints: {
      usdc,
      cate: parsed.CATE_MINT,
      usdcMainnet: parsed.USDC_MINT_MAINNET,
      usdcDevnet: parsed.USDC_MINT_DEVNET,
    },
    betLimits: {
      minUsdc: parsed.BET_MIN_USDC,
      maxUsdc: parsed.BET_MAX_USDC,
      minAtomic: usdcToAtomic(parsed.BET_MIN_USDC),
      maxAtomic: usdcToAtomic(parsed.BET_MAX_USDC),
    },
    buyPolicy: {
      buyRatio: parsed.BUY_RATIO,
      reserveFloorUsdc: parsed.RESERVE_FLOOR_USDC,
      reserveFloorAtomic: usdcToAtomic(parsed.RESERVE_FLOOR_USDC),
      minDailyBuyUsdc: parsed.MIN_DAILY_BUY_USDC,
      maxDailyBuyUsdc: parsed.MAX_DAILY_BUY_USDC,
      minDailyBuyAtomic: usdcToAtomic(parsed.MIN_DAILY_BUY_USDC),
      maxDailyBuyAtomic: usdcToAtomic(parsed.MAX_DAILY_BUY_USDC),
    },
    custody: {
      depositOwnerPubkey: parsed.DEPOSIT_OWNER_PUBKEY.trim(),
      depositAta: parsed.DEPOSIT_ATA.trim(),
      minDepositUsdc: parsed.MIN_DEPOSIT_USDC,
      minDepositAtomic: usdcToAtomic(parsed.MIN_DEPOSIT_USDC),
      minConfirmations: parsed.MIN_CONFIRMATIONS,
      secondaryRpcThresholdUsdc: parsed.SECONDARY_RPC_THRESHOLD_USDC,
      secondaryRpcThresholdAtomic: usdcToAtomic(
        parsed.SECONDARY_RPC_THRESHOLD_USDC,
      ),
      withdrawFirstCooldownHours: parsed.WITHDRAW_FIRST_COOLDOWN_HOURS,
      withdrawCooldownMinutes: parsed.WITHDRAW_COOLDOWN_MINUTES,
      withdrawManualThresholdUsdc: parsed.WITHDRAW_MANUAL_THRESHOLD_USDC,
      withdrawManualThresholdAtomic: usdcToAtomic(
        parsed.WITHDRAW_MANUAL_THRESHOLD_USDC,
      ),
      withdrawDualApproveThresholdUsdc:
        parsed.WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC,
      withdrawDualApproveThresholdAtomic: usdcToAtomic(
        parsed.WITHDRAW_DUAL_APPROVE_THRESHOLD_USDC,
      ),
      withdrawHotPerTxCapUsdc: parsed.WITHDRAW_HOT_PER_TX_CAP_USDC,
      withdrawHotPerTxCapAtomic: usdcToAtomic(
        parsed.WITHDRAW_HOT_PER_TX_CAP_USDC,
      ),
      withdrawHotDailyCapUsdc: parsed.WITHDRAW_HOT_DAILY_CAP_USDC,
      withdrawHotDailyCapAtomic: usdcToAtomic(
        parsed.WITHDRAW_HOT_DAILY_CAP_USDC,
      ),
      withdrawHotMaxBalanceUsdc: parsed.WITHDRAW_HOT_MAX_BALANCE_USDC,
      withdrawHotMaxBalanceAtomic: usdcToAtomic(
        parsed.WITHDRAW_HOT_MAX_BALANCE_USDC,
      ),
    },
    compliance: {
      ageMinimum: parsed.AGE_MINIMUM,
      geoDenyList: parseGeoList(parsed.GEO_DENY_LIST),
    },
    flags: {
      marketingThesisClaims: parsed.FF_MARKETING_THESIS_CLAIMS,
      publicMainnetFunds: parsed.FF_PUBLIC_MAINNET_FUNDS,
      depositsUsdc: parsed.FF_DEPOSITS_USDC,
      withdrawals: parsed.FF_WITHDRAWALS,
      blackcateEnabled:
        parsed.FF_BLACKCATE_ENABLED ?? parsed.FF_BLACKJACK_ENABLED,
      blackjackEnabled:
        parsed.FF_BLACKCATE_ENABLED ?? parsed.FF_BLACKJACK_ENABLED,
      cateflipEnabled: parsed.FF_CATEFLIP_ENABLED,
      catediceEnabled: parsed.FF_CATEDICE_ENABLED,
      catespinEnabled: parsed.FF_CATESPIN_ENABLED,
      highcateEnabled: parsed.FF_HIGHCATE_ENABLED,
      cateslotsEnabled: parsed.FF_CATESLOTS_ENABLED,
      catepokerEnabled: parsed.FF_CATEPOKER_ENABLED,
      videocateEnabled: parsed.FF_VIDEOCATE_ENABLED,
    },
    authDomain: parsed.CATESINO_AUTH_DOMAIN,
    usdcDecimals: USDC_DECIMALS,
  };
}

/**
 * Hard gate: real player fund movement requires both the feature flag and
 * the public-mainnet counsel gate when cluster is mainnet-beta.
 */
export function assertRealFundsMovementAllowed(
  config: AppConfig,
  kind: "deposit" | "withdraw",
): void {
  if (kind === "deposit" && !config.flags.depositsUsdc) {
    throw new Error("USDC deposits are disabled (FF_DEPOSITS_USDC)");
  }
  if (kind === "withdraw" && !config.flags.withdrawals) {
    throw new Error("USDC withdrawals are disabled (FF_WITHDRAWALS)");
  }
  if (
    config.cluster === "mainnet-beta" &&
    !config.flags.publicMainnetFunds
  ) {
    throw new Error(
      "Public mainnet funds disabled (FF_PUBLIC_MAINNET_FUNDS) — counsel gate",
    );
  }
}

/** Validate a bet amount (atomic) against config limits. */
export function isBetWithinLimits(amountAtomic: bigint, limits: BetLimits): boolean {
  return amountAtomic >= limits.minAtomic && amountAtomic <= limits.maxAtomic;
}

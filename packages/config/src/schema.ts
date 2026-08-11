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

  CATESINO_AUTH_DOMAIN: z.string().default("localhost"),
  PORT: numberFromEnv.default(3000),
  WORKER_PORT: numberFromEnv.default(3100),
});

export type EnvConfig = z.infer<typeof envSchema>;

export type FeatureFlags = {
  marketingThesisClaims: boolean;
  publicMainnetFunds: boolean;
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
  compliance: {
    ageMinimum: number;
    geoDenyList: string[];
  };
  flags: FeatureFlags;
  authDomain: string;
  usdcDecimals: typeof USDC_DECIMALS;
};

export function usdcToAtomic(human: number): bigint {
  if (!Number.isFinite(human) || human < 0) {
    throw new Error(`Invalid USDC amount: ${human}`);
  }
  // Avoid float drift for common stake sizes
  const scaled = Math.round(human * 10 ** USDC_DECIMALS);
  return BigInt(scaled);
}

export function atomicToUsdc(atomic: bigint): number {
  return Number(atomic) / 10 ** USDC_DECIMALS;
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
    compliance: {
      ageMinimum: parsed.AGE_MINIMUM,
      geoDenyList: parseGeoList(parsed.GEO_DENY_LIST),
    },
    flags: {
      marketingThesisClaims: parsed.FF_MARKETING_THESIS_CLAIMS,
      publicMainnetFunds: parsed.FF_PUBLIC_MAINNET_FUNDS,
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

/** Validate a bet amount (atomic) against config limits. */
export function isBetWithinLimits(amountAtomic: bigint, limits: BetLimits): boolean {
  return amountAtomic >= limits.minAtomic && amountAtomic <= limits.maxAtomic;
}

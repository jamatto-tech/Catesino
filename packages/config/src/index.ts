export {
  USDC_DECIMALS,
  MAX_ATOMIC_AMOUNT,
  envSchema,
  loadConfig,
  usdcToAtomic,
  atomicToUsdc,
  assertSafeAtomicAmount,
  assertRealFundsMovementAllowed,
  isBetWithinLimits,
  type EnvConfig,
  type AppConfig,
  type BetLimits,
  type BuyPolicy,
  type CustodyPolicy,
  type FeatureFlags,
} from "./schema.js";

export {
  GAME_CATALOG,
  gameById,
  type GameId,
  type GameCatalogEntry,
} from "./games.js";

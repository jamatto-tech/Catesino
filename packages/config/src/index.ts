export {
  USDC_DECIMALS,
  envSchema,
  loadConfig,
  usdcToAtomic,
  atomicToUsdc,
  isBetWithinLimits,
  type EnvConfig,
  type AppConfig,
  type BetLimits,
  type BuyPolicy,
  type FeatureFlags,
} from "./schema.js";

export {
  GAME_CATALOG,
  gameById,
  type GameId,
  type GameCatalogEntry,
} from "./games.js";

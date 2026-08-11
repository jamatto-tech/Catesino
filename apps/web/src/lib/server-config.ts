import { loadConfig, type AppConfig } from "@catesino/config";
import { createChainContext, type ChainContext } from "@catesino/chain";

let cached: { config: AppConfig; chain: ChainContext } | null = null;

/** Server-only config loader — single source via @catesino/config. */
export function getServerConfig() {
  if (!cached) {
    const config = loadConfig();
    cached = { config, chain: createChainContext(config) };
  }
  return cached;
}

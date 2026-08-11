import { GAME_CATALOG, loadConfig, type GameCatalogEntry } from "@catesino/config";

/** Catalog entries with live enablement from config flags. */
export function listPlayableGames(): (GameCatalogEntry & { enabled: boolean })[] {
  const { flags } = loadConfig();
  const map: Record<string, boolean> = {
    blackcate: flags.blackcateEnabled,
    cateflip: flags.cateflipEnabled,
    catedice: flags.catediceEnabled,
    catespin: flags.catespinEnabled,
    highcate: flags.highcateEnabled,
    cateslots: flags.cateslotsEnabled,
    catepoker: flags.catepokerEnabled,
    videocate: flags.videocateEnabled,
  };
  return GAME_CATALOG.map((g) => ({
    ...g,
    enabled: map[g.id] ?? false,
  }));
}

import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import type { AppConfig } from "@catesino/config";
import {
  applyEconomy,
  catalogV1,
  formatPublicOdds,
  itemById,
  ODDS_TABLE_V2,
  rollPull,
  type CookieReceipt,
  type GachaItem,
  type PullReceipt,
} from "@catesino/gacha";
import type { PublicDropLane, PublicGachaState, PublicItem } from "@/lib/gacha-public";
import { NINTH_LIFE_PREVIEWS } from "@/lib/gacha-mints";
import {
  applyBagworkGrant,
  applyYarnFaucet,
  countsFromInventory,
  emptyDemoGachaState,
  GACHA_COOKIE,
  gachaCookieOptions,
  inventoryFromCounts,
  sealGachaState,
  unsealGachaState,
  utcDateString,
  type DemoGachaState,
} from "@/lib/demo-gacha-session";

export function gachaSecret(config: AppConfig): string {
  const extra = process.env.GACHA_COOKIE_SECRET?.trim();
  return extra && extra.length > 0 ? extra : config.sessionSecret;
}

export async function loadDemoGacha(
  config: AppConfig,
  nowMs = Date.now(),
): Promise<{ state: DemoGachaState; minted: boolean; faucetGranted: number }> {
  const jar = await cookies();
  const token = jar.get(GACHA_COOKIE)?.value;
  const secret = gachaSecret(config);
  const existing = token ? unsealGachaState(token, secret, nowMs) : null;
  if (!existing) {
    const fresh = emptyDemoGachaState(config.gacha, nowMs);
    return { state: fresh, minted: true, faucetGranted: 0 };
  }
  const fed = applyYarnFaucet(existing, config.gacha, nowMs);
  return {
    state: fed.state,
    minted: false,
    faucetGranted: fed.granted,
  };
}

export async function saveDemoGacha(
  state: DemoGachaState,
  config: AppConfig,
  nowMs = Date.now(),
): Promise<void> {
  const jar = await cookies();
  jar.set(
    GACHA_COOKIE,
    sealGachaState(state, gachaSecret(config), nowMs),
    gachaCookieOptions(),
  );
}

export function toPublicState(
  state: DemoGachaState,
  config: AppConfig,
): PublicGachaState {
  const catalog = catalogV1();
  return {
    mode: "demo",
    yarn: state.yarn,
    yarnCap: config.gacha.yarnCap,
    pity: {
      pullsSinceRarePlus: state.pullsSinceRarePlus,
      pityRareHard: config.gacha.pityRareHard,
      untilRare: Math.max(0, config.gacha.pityRareHard - state.pullsSinceRarePlus),
    },
    equipped: state.equipped,
    inventory: state.inventory.flatMap((row) => {
      const item = itemById(catalog, row.itemId);
      if (!item) return [];
      return [{ ...toPublicDrop(item), count: row.count }];
    }),
    lastReceipt: state.lastReceipt,
    faucet: { lastFaucetUtcDate: state.lastFaucetUtcDate },
    bagwork: {
      unlockedToday: state.lastBagworkUtcDate === utcDateString(Date.now()),
    },
    drops: publicDropBoard(config),
  };
}

export function publicDropBoard(config: AppConfig): PublicDropLane[] {
  const catalog = catalogV1();
  const odds = formatPublicOdds(ODDS_TABLE_V2, config.gacha.pityRareHard);
  return odds.rows.map((row) => {
    if (row.rarity === "ultra") {
      return {
        rarity: row.rarity,
        percent: row.percent,
        note: "Sample mints — not live. Today this 0.10% falls to rare.",
        items: NINTH_LIFE_PREVIEWS.filter((p) => p.set === "pfp").map(
          (p) => ({
            itemId: p.id,
            count: 0,
            name: p.name,
            rarity: "ultra",
            kind: "nft",
            emoji: "✨",
            copy: p.copy,
            imageSrc: p.src,
            sample: true,
          }),
        ),
      };
    }
    return {
      rarity: row.rarity,
      percent: row.percent,
      note: row.note,
      items: catalog.items
        .filter((item) => item.rarity === row.rarity)
        .map(toPublicDrop),
    };
  });
}

export function publicOddsPayload(config: AppConfig) {
  const catalog = catalogV1();
  return {
    ...formatPublicOdds(ODDS_TABLE_V2, config.gacha.pityRareHard),
    catalogId: catalog.catalogId,
    copy: "This is not CateSlots. CateSlots pays chips. The Machine pays culture.",
    drops: publicDropBoard(config),
  };
}

function toPublicDrop(item: GachaItem): PublicItem {
  return {
    itemId: item.id,
    count: 0,
    name: item.name,
    rarity: item.rarity,
    kind: item.kind,
    slot: item.slot,
    emoji: item.render.emoji,
    cssClass: item.render.cssClass,
    copy: item.copy,
    imageSrc: item.render.imageSrc,
  };
}

export function claimBagworkYarn(
  state: DemoGachaState,
  config: AppConfig,
  tweetId: string,
  nowMs = Date.now(),
): { state: DemoGachaState; granted: number } {
  return applyBagworkGrant(state, config.gacha, tweetId, nowMs);
}

export function pullDemoGacha(
  state: DemoGachaState,
  config: AppConfig,
  clientSeed?: string,
): { state: DemoGachaState; receipt: PullReceipt } {
  if (state.yarn < 1) {
    const err = new Error("yarn_empty");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  if (clientSeed && clientSeed.length > 64) {
    const err = new Error("clientSeed must be <= 64 chars");
    (err as Error & { status: number }).status = 400;
    throw err;
  }

  const catalog = catalogV1();
  const spent: DemoGachaState = {
    ...state,
    yarn: state.yarn - 1,
    nonce: state.nonce + 1,
  };
  const rolled = rollPull({
    catalog,
    pullsSinceRarePlusBefore: spent.pullsSinceRarePlus,
    pityRareHard: config.gacha.pityRareHard,
    clientSeed,
    nonce: spent.nonce,
  });
  const item = itemById(catalog, rolled.itemId);
  if (!item) throw new Error(`unknown item ${rolled.itemId}`);

  const economy = applyEconomy({
    yarn: spent.yarn,
    inventoryCounts: countsFromInventory(spent.inventory),
    item,
  });

  const receipt: PullReceipt = {
    pullId: randomBytes(16).toString("hex"),
    oddsTableId: rolled.oddsTableId,
    catalogId: rolled.catalogId,
    rarity: rolled.rarity,
    itemId: rolled.itemId,
    pityRareHard: rolled.pityRareHard,
    pullsSinceRarePlusBefore: rolled.pullsSinceRarePlusBefore,
    pityApplied: rolled.pityApplied,
    rawBucket: rolled.rawBucket,
    inSupplyHash: rolled.inSupplyHash,
    convertedToYarn: economy.convertedToYarn,
    yarnAfter: economy.yarn,
    serverSeedCommit: rolled.serverSeedCommit,
    serverSeed: rolled.serverSeed,
    clientSeed: rolled.clientSeed,
    nonce: rolled.nonce,
    identityKind: "demo",
  };
  const cookieReceipt = toCookieReceipt(receipt);

  return {
    state: {
      ...spent,
      yarn: economy.yarn,
      pullsSinceRarePlus: rolled.pullsSinceRarePlusAfter,
      inventory: inventoryFromCounts(economy.inventoryCounts),
      lastReceipt: cookieReceipt,
    },
    receipt,
  };
}

export function equipDemoGacha(
  state: DemoGachaState,
  slot: "frame" | "title" | "lobbyFlair",
  itemId: string | null,
): DemoGachaState {
  if (itemId === null) {
    const equipped = { ...state.equipped };
    delete equipped[slot];
    return { ...state, equipped };
  }
  const owned = state.inventory.some((row) => row.itemId === itemId && row.count > 0);
  if (!owned) {
    const err = new Error("you do not own that item");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const item = itemById(catalogV1(), itemId);
  const expected =
    slot === "frame" ? "frame" : slot === "title" ? "title" : "lobby_flair";
  if (!item || item.slot !== expected) {
    const err = new Error("item does not fit that slot");
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  return { ...state, equipped: { ...state.equipped, [slot]: itemId } };
}

function toCookieReceipt(receipt: PullReceipt): CookieReceipt {
  return {
    pullId: receipt.pullId,
    oddsTableId: receipt.oddsTableId,
    catalogId: receipt.catalogId,
    rarity: receipt.rarity,
    itemId: receipt.itemId,
    pityRareHard: receipt.pityRareHard,
    pullsSinceRarePlusBefore: receipt.pullsSinceRarePlusBefore,
    pityApplied: receipt.pityApplied,
    rawBucket: receipt.rawBucket,
    inSupplyHash: receipt.inSupplyHash,
    convertedToYarn: receipt.convertedToYarn,
    yarnAfter: receipt.yarnAfter,
    serverSeedCommit: receipt.serverSeedCommit,
    clientSeed: receipt.clientSeed,
    nonce: receipt.nonce,
    identityKind: receipt.identityKind,
  };
}

export function hashDemoId(demoId: string): string {
  return createHash("sha256").update(demoId).digest("hex").slice(0, 16);
}

export function logPull(state: DemoGachaState, receipt: PullReceipt): void {
  console.info(
    JSON.stringify({
      msg: "gacha.pull.total",
      phase: "A",
      rarity: receipt.rarity,
      pityApplied: receipt.pityApplied,
      itemId: receipt.itemId,
      pullId: receipt.pullId,
      demoIdHash: hashDemoId(state.demoId),
    }),
  );
}

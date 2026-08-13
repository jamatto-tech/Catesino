import { cookies } from "next/headers";
import type { AppConfig } from "@catesino/config";
import { applyYarnBonus } from "@/lib/demo-gacha-session";
import { loadDemoGacha, saveDemoGacha } from "@/lib/gacha-demo";
import { fetchCateTape, type CateTape } from "@/lib/cate-price";
import {
  DESK_COOKIE,
  deskCookieOptions,
  emptyDeskState,
  sealDeskState,
  settleIfDue,
  unsealDeskState,
  type DeskState,
  type RideSettle,
} from "@/lib/desk-session";

export function deskSecret(config: AppConfig): string {
  return config.sessionSecret;
}

export async function loadDesk(
  config: AppConfig,
  nowMs = Date.now(),
): Promise<DeskState> {
  const jar = await cookies();
  const token = jar.get(DESK_COOKIE)?.value;
  const existing = token
    ? unsealDeskState(token, deskSecret(config), nowMs)
    : null;
  return existing ?? emptyDeskState();
}

export async function saveDesk(
  state: DeskState,
  config: AppConfig,
  nowMs = Date.now(),
): Promise<void> {
  const jar = await cookies();
  jar.set(
    DESK_COOKIE,
    sealDeskState(state, deskSecret(config), nowMs),
    deskCookieOptions(),
  );
}

export async function grantDeskYarn(
  config: AppConfig,
  amount: number,
): Promise<number> {
  if (amount <= 0) return 0;
  const loaded = await loadDemoGacha(config);
  const next = applyYarnBonus(loaded.state, amount, config.gacha.yarnCap);
  const granted = next.yarn - loaded.state.yarn;
  if (granted > 0) await saveDemoGacha(next, config);
  return granted;
}

export function publicDesk(state: DeskState) {
  return {
    conviction: state.conviction,
    hold: state.hold,
    position: state.position,
    vault: state.vault,
    tapeStreak: state.tapeStreak ?? 0,
    lastTape: state.lastTape,
  };
}

export async function loadTickedDesk(
  config: AppConfig,
  nowMs = Date.now(),
): Promise<{
  state: DeskState;
  tape: CateTape | null;
  ride: RideSettle | null;
}> {
  const state = await loadDesk(config, nowMs);
  let tape: CateTape | null = null;
  try {
    tape = await fetchCateTape();
  } catch {
    tape = null;
  }
  const ticked = settleIfDue(state, tape?.usd ?? null, nowMs);
  if (ticked.ride && !ticked.ride.already) {
    await saveDesk(ticked.state, config, nowMs);
  }
  return { state: ticked.state, tape, ride: ticked.ride };
}

/** Ninth Life mint rules. Cosmetics still pull; these gates are for Rare/Ultra NFTs. */

export const NFT_CLAIM_HOLD_DAYS = 30;
export const NFT_DIAMOND_HOLD_DAYS = 90;
export const NFT_DIAMOND_BAGWORK = 15;
export const NFT_MAX_MARKS = 3;

export type NftTier = "gold" | "diamond";

export type NftMark = {
  itemId: string;
  tier: NftTier;
  markedAt: number;
  upgradedAt?: number;
};

export type NftProgress = {
  holdStartedAt: number | null;
  holdDays: number;
  bagworkCount: number;
  canClaim: boolean;
  canCutDiamond: boolean;
  claimNeedDays: number;
  diamondNeedDays: number;
  diamondNeedPosts: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function holdDaysElapsed(
  holdStartedAt: number | null | undefined,
  nowMs = Date.now(),
): number {
  if (!holdStartedAt || !Number.isFinite(holdStartedAt) || holdStartedAt > nowMs) {
    return 0;
  }
  return Math.floor((nowMs - holdStartedAt) / DAY_MS);
}

export function canClaimRareOrUltra(holdDays: number): boolean {
  return holdDays >= NFT_CLAIM_HOLD_DAYS;
}

export function canCutUltraDiamond(
  holdDays: number,
  bagworkCount: number,
): boolean {
  return (
    holdDays >= NFT_DIAMOND_HOLD_DAYS && bagworkCount >= NFT_DIAMOND_BAGWORK
  );
}

export function nftProgress(input: {
  holdStartedAt: number | null | undefined;
  bagworkCount: number;
  nowMs?: number;
}): NftProgress {
  const holdDays = holdDaysElapsed(input.holdStartedAt, input.nowMs);
  const bagworkCount = Math.max(0, Math.floor(input.bagworkCount || 0));
  return {
    holdStartedAt: input.holdStartedAt ?? null,
    holdDays,
    bagworkCount,
    canClaim: canClaimRareOrUltra(holdDays),
    canCutDiamond: canCutUltraDiamond(holdDays, bagworkCount),
    claimNeedDays: NFT_CLAIM_HOLD_DAYS,
    diamondNeedDays: NFT_DIAMOND_HOLD_DAYS,
    diamondNeedPosts: NFT_DIAMOND_BAGWORK,
  };
}

export function markUltraGold(
  marks: readonly NftMark[],
  itemId: string,
  nowMs = Date.now(),
): NftMark[] {
  if (marks.some((m) => m.itemId === itemId)) {
    throw nftError("already marked", 400);
  }
  if (marks.length >= NFT_MAX_MARKS) {
    throw nftError("mark limit reached", 400);
  }
  return [...marks, { itemId, tier: "gold", markedAt: nowMs }];
}

export function cutUltraDiamond(
  marks: readonly NftMark[],
  itemId: string,
  nowMs = Date.now(),
): NftMark[] {
  const i = marks.findIndex((m) => m.itemId === itemId);
  if (i < 0) throw nftError("mark that ultra first", 400);
  const current = marks[i]!;
  if (current.tier === "diamond") throw nftError("already diamond", 400);
  const next = marks.slice();
  next[i] = { ...current, tier: "diamond", upgradedAt: nowMs };
  return next;
}

function nftError(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { status: number }).status = status;
  return err;
}

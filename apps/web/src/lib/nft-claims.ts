import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const FILE = join(process.cwd(), ".data", "nft-claims.json");

type ClaimFile = { ids: string[] };

function readClaims(): string[] {
  try {
    const raw = readFileSync(FILE, "utf8");
    const data = JSON.parse(raw) as ClaimFile;
    return Array.isArray(data.ids) ? data.ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeClaims(ids: string[]): void {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify({ ids: [...new Set(ids)] }, null, 2), "utf8");
}

export function listedNftClaims(): string[] {
  return readClaims();
}

export function nftIsClaimed(itemId: string): boolean {
  return readClaims().includes(itemId);
}

export function recordNftClaim(itemId: string): void {
  const ids = readClaims();
  if (ids.includes(itemId)) return;
  writeClaims([...ids, itemId]);
}

/**
 * DB package stub — schema/migrations land in a later PR.
 * Pure ledger tests use in-memory adapters; no live Postgres required for MVP gate.
 *
 * Gacha tables (Phase B/C — no live Drizzle here):
 * - gacha_identities — PK identity_id; demo_id OR user_id; yarn, nonce, pity, last_faucet_utc
 * - gacha_inventory — UNIQUE (identity_id, item_id); count, first_acquired_at
 * - gacha_equips — PK (identity_id, slot); item_id
 * - gacha_pulls — PK id; UNIQUE (identity_id, nonce); receipt jsonb; created_at
 * - gacha_holder_grants — PRIMARY KEY (wallet_pubkey, utc_date); pull_id
 * - gacha_nft_claims — PK pull_id; item_id, mint; status queued|minted|transferred|failed
 */
export type TableName =
  | "users"
  | "balances"
  | "ledger_entries"
  | "hands"
  | "daily_cate_buys"
  | "system_accounts"
  | "gacha_identities"
  | "gacha_inventory"
  | "gacha_equips"
  | "gacha_pulls"
  | "gacha_holder_grants"
  | "gacha_nft_claims";

export const PLANNED_TABLES: readonly TableName[] = [
  "users",
  "balances",
  "ledger_entries",
  "hands",
  "daily_cate_buys",
  "system_accounts",
  "gacha_identities",
  "gacha_inventory",
  "gacha_equips",
  "gacha_pulls",
  "gacha_holder_grants",
  "gacha_nft_claims",
] as const;

export function describeDbStub(): string {
  return `catesino-db-stub tables=${PLANNED_TABLES.join(",")}`;
}

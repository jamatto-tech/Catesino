/**
 * DB package stub — schema/migrations land in a later PR.
 * Pure ledger tests use in-memory adapters; no live Postgres required for MVP gate.
 */
export type TableName =
  | "users"
  | "balances"
  | "ledger_entries"
  | "hands"
  | "daily_cate_buys"
  | "system_accounts";

export const PLANNED_TABLES: readonly TableName[] = [
  "users",
  "balances",
  "ledger_entries",
  "hands",
  "daily_cate_buys",
  "system_accounts",
] as const;

export function describeDbStub(): string {
  return `catesino-db-stub tables=${PLANNED_TABLES.join(",")}`;
}

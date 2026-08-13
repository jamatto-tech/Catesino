import { describe, expect, it } from "vitest";
import { PLANNED_TABLES, describeDbStub } from "./index.js";

describe("PLANNED_TABLES", () => {
  it("includes gacha tables with holder-grant uniqueness names", () => {
    for (const name of [
      "gacha_identities",
      "gacha_inventory",
      "gacha_equips",
      "gacha_pulls",
      "gacha_holder_grants",
      "gacha_nft_claims",
    ] as const) {
      expect(PLANNED_TABLES).toContain(name);
    }
    expect(describeDbStub()).toMatch(/gacha_holder_grants/);
  });
});

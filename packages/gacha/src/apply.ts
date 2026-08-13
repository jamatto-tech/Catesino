import type { ApplyEconomyInput, ApplyEconomyResult } from "./types.js";

/**
 * Host economy. Caller already subtracted 1 Yarn.
 * yarn_dust adds item.yarnGrant. At stackCap, yarn += 1 and count is unchanged.
 */
export function applyEconomy(input: ApplyEconomyInput): ApplyEconomyResult {
  const inventoryCounts = { ...input.inventoryCounts };
  let yarn = input.yarn;
  const { item } = input;

  if (item.kind === "yarn_dust") {
    yarn += item.yarnGrant ?? 0;
  }

  const count = inventoryCounts[item.id] ?? 0;
  if (count >= item.stackCap) {
    yarn += 1;
    return { yarn, inventoryCounts, convertedToYarn: true };
  }

  inventoryCounts[item.id] = count + 1;
  return { yarn, inventoryCounts, convertedToYarn: false };
}

import { describe, expect, it } from "vitest";
import { parseTokenTransferLegs, txSucceeded } from "./tx-parse.js";

const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const ATA = "33333333333333333333333333333333";
const OWNER = "11111111111111111111111111111111";

describe("parseTokenTransferLegs", () => {
  it("parses transferChecked outer ix", () => {
    const legs = parseTokenTransferLegs({
      meta: { err: null },
      transaction: {
        message: {
          instructions: [
            {
              program: "spl-token",
              programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
              parsed: {
                type: "transferChecked",
                info: {
                  authority: OWNER,
                  destination: ATA,
                  mint: USDC,
                  tokenAmount: { amount: "1000000" },
                },
              },
            },
          ],
        },
      },
    });
    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({
      mint: USDC,
      destinationTokenAccount: ATA,
      sourceOwner: OWNER,
      amountAtomic: 1_000_000n,
    });
  });

  it("includes inner instructions and ignores non-token ix", () => {
    const legs = parseTokenTransferLegs({
      meta: {
        err: null,
        innerInstructions: [
          {
            index: 0,
            instructions: [
              {
                program: "spl-token",
                programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                parsed: {
                  type: "transfer",
                  info: {
                    authority: OWNER,
                    destination: ATA,
                    amount: "2500000",
                  },
                },
              },
            ],
          },
        ],
      },
      transaction: {
        message: {
          instructions: [{ programId: "ComputeBudget111111111111111111111111111111" }],
        },
      },
    }, { defaultMint: USDC });
    expect(legs).toHaveLength(1);
    expect(legs[0]!.amountAtomic).toBe(2_500_000n);
    expect(legs[0]!.mint).toBe(USDC);
  });

  it("txSucceeded requires meta.err null", () => {
    expect(txSucceeded({ meta: { err: null } })).toBe(true);
    expect(txSucceeded({ meta: { err: { InstructionError: [0, "Custom"] } } })).toBe(
      false,
    );
    expect(txSucceeded(null)).toBe(false);
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claimDeposit } from "./deposit-service";
import {
  isDepositCredited,
  resetCustodyStoreForTests,
  userBalances,
} from "./user-store";
import { resetServerConfigCacheForTests } from "@/lib/server-config";

const SIG =
  "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW";
const WALLET = "11111111111111111111111111111111";
const OTHER = "22222222222222222222222222222222";
const ATA = "33333333333333333333333333333333";
const USDC = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

function mockRpc(opts: {
  amount?: string;
  authority?: string;
  destination?: string;
  mint?: string;
  err?: unknown;
}) {
  const amount = opts.amount ?? "10000000";
  const authority = opts.authority ?? WALLET;
  const destination = opts.destination ?? ATA;
  const mint = opts.mint ?? USDC;
  return async (_url: string, body: unknown) => {
    const method = (body as { method?: string }).method;
    if (method === "getTransaction") {
      return {
        result: {
          slot: 1,
          meta: { err: opts.err === undefined ? null : opts.err },
          transaction: {
            message: {
              instructions: [
                {
                  program: "spl-token",
                  programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
                  parsed: {
                    type: "transferChecked",
                    info: {
                      authority,
                      destination,
                      mint,
                      tokenAmount: { amount },
                    },
                  },
                },
              ],
            },
          },
        },
      };
    }
    if (method === "getSignatureStatuses") {
      return {
        result: {
          value: [
            {
              confirmations: null,
              err: null,
              confirmationStatus: "finalized",
            },
          ],
        },
      };
    }
    return { result: null };
  };
}

describe("claimDeposit service", () => {
  beforeEach(() => {
    resetCustodyStoreForTests();
    resetServerConfigCacheForTests();
    process.env.FF_DEPOSITS_USDC = "true";
    process.env.FF_PUBLIC_MAINNET_FUNDS = "false";
    process.env.SOLANA_CLUSTER = "devnet";
    process.env.DEPOSIT_ATA = ATA;
    process.env.SOLANA_RPC_URL = "http://localhost:8899";
    process.env.MIN_CONFIRMATIONS = "32";
    process.env.MIN_DEPOSIT_USDC = "1";
    process.env.USDC_MINT_DEVNET = USDC;
  });

  afterEach(() => {
    resetCustodyStoreForTests();
    resetServerConfigCacheForTests();
    delete process.env.FF_DEPOSITS_USDC;
    delete process.env.DEPOSIT_ATA;
    delete process.env.SOLANA_RPC_URL;
  });

  it("credits matching deposit and rejects double claim", async () => {
    const first = await claimDeposit({
      sessionWalletPubkey: WALLET,
      txSignature: SIG,
      fetchImpl: mockRpc({}),
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.amountAtomic).toBe("10000000");
    expect(userBalances(WALLET).availableAtomic).toBe(10_000_000n);
    expect(isDepositCredited(SIG)).toBe(true);

    const second = await claimDeposit({
      sessionWalletPubkey: WALLET,
      txSignature: SIG,
      fetchImpl: mockRpc({}),
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.reason).toBe("already_credited");
    // balance unchanged
    expect(userBalances(WALLET).availableAtomic).toBe(10_000_000n);
  });

  it("rejects foreign wallet claim (source binding)", async () => {
    const result = await claimDeposit({
      sessionWalletPubkey: OTHER,
      txSignature: SIG,
      fetchImpl: mockRpc({ authority: WALLET }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("source_binding_failed");
    expect(userBalances(OTHER).availableAtomic).toBe(0n);
  });

  it("does not credit when deposits flag is off", async () => {
    process.env.FF_DEPOSITS_USDC = "false";
    resetServerConfigCacheForTests();
    const result = await claimDeposit({
      sessionWalletPubkey: WALLET,
      txSignature: SIG,
      fetchImpl: mockRpc({}),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("deposits_disabled");
  });
});

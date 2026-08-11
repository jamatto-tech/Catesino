import { describe, expect, it } from "vitest";
import { loadConfig, usdcToAtomic } from "@catesino/config";
import { settlementFromOutcome } from "@catesino/blackjack";
import {
  cancelWithdraw,
  completeWithdraw,
  computeBuyAmountAtomic,
  computeFreeBalanceAtomic,
  createLedger,
  creditDeposit,
  getBalance,
  getLockBreakdown,
  lockBet,
  requestWithdraw,
  reverseDeposit,
  setWithdrawFrozen,
  settleHand,
  totalPlayerLiability,
} from "./ledger.js";

describe("ledger stake-lock path (shipped API)", () => {
  it("deposit → lock → settle lose/win/push/BJ with liability = available + locked", () => {
    const ledger = createLedger();
    const user = "user-1";
    const deposit = usdcToAtomic(100);
    creditDeposit(ledger, user, deposit, "dep-1");

    let b = getBalance(ledger, user);
    expect(b.available).toBe(deposit);
    expect(b.locked).toBe(0n);
    expect(totalPlayerLiability(ledger)).toBe(deposit);

    const bet = usdcToAtomic(10);
    lockBet(ledger, user, bet, "hand-1-lock");
    b = getBalance(ledger, user);
    expect(b.available).toBe(deposit - bet);
    expect(b.locked).toBe(bet);
    expect(totalPlayerLiability(ledger)).toBe(deposit);
    expect(b.available + b.locked).toBe(totalPlayerLiability(ledger));

    settleHand(
      ledger,
      user,
      settlementFromOutcome("player_lose", bet),
      "hand-1-settle",
    );
    b = getBalance(ledger, user);
    expect(b.available).toBe(deposit - bet);
    expect(b.locked).toBe(0n);
    expect(totalPlayerLiability(ledger)).toBe(deposit - bet);
    expect(ledger.equity.housePlayEquity).toBe(bet);

    lockBet(ledger, user, bet, "hand-2-lock");
    settleHand(ledger, user, settlementFromOutcome("push", bet), "hand-2-settle");
    b = getBalance(ledger, user);
    expect(b.available).toBe(deposit - bet);
    expect(b.locked).toBe(0n);

    lockBet(ledger, user, bet, "hand-3-lock");
    settleHand(
      ledger,
      user,
      settlementFromOutcome("player_win", bet),
      "hand-3-settle",
    );
    b = getBalance(ledger, user);
    expect(b.available).toBe(usdcToAtomic(100));
    expect(b.locked).toBe(0n);

    lockBet(ledger, user, bet, "hand-4-lock");
    settleHand(
      ledger,
      user,
      settlementFromOutcome("player_blackjack", bet),
      "hand-4-settle",
    );
    b = getBalance(ledger, user);
    expect(b.available).toBe(usdcToAtomic(115));
    expect(b.locked).toBe(0n);
    expect(totalPlayerLiability(ledger)).toBe(b.available + b.locked);
  });

  it("Option B withdraw keeps liability until complete", () => {
    const ledger = createLedger();
    const user = "u2";
    creditDeposit(ledger, user, usdcToAtomic(100), "d");
    lockBet(ledger, user, usdcToAtomic(10), "lock");
    requestWithdraw(ledger, user, usdcToAtomic(20), "wd-req");
    const b = getBalance(ledger, user);
    expect(b.available).toBe(usdcToAtomic(70));
    expect(b.locked).toBe(usdcToAtomic(30));
    expect(totalPlayerLiability(ledger)).toBe(usdcToAtomic(100));

    settleHand(
      ledger,
      user,
      settlementFromOutcome("player_lose", usdcToAtomic(10)),
      "lose",
    );
    expect(totalPlayerLiability(ledger)).toBe(usdcToAtomic(90));

    completeWithdraw(ledger, user, usdcToAtomic(20), "wd-done");
    expect(totalPlayerLiability(ledger)).toBe(usdcToAtomic(70));
    expect(getBalance(ledger, user).locked).toBe(0n);
  });

  it("idempotent deposit does not double credit", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(5), "same");
    creditDeposit(ledger, "u", usdcToAtomic(5), "same");
    expect(getBalance(ledger, "u").available).toBe(usdcToAtomic(5));
  });

  it("failed lockBet does not poison idempotency key — retry after credit must lock", () => {
    const ledger = createLedger();
    const user = "retry-user";
    const key = "lock-k";
    creditDeposit(ledger, user, usdcToAtomic(5), "dep-small");

    expect(() => lockBet(ledger, user, usdcToAtomic(10), key)).toThrow(
      /insufficient available/,
    );
    // Key must NOT be burned on throw
    expect(ledger.appliedKeys.has(key)).toBe(false);
    expect(getBalance(ledger, user).locked).toBe(0n);
    expect(getBalance(ledger, user).available).toBe(usdcToAtomic(5));

    creditDeposit(ledger, user, usdcToAtomic(10), "dep-more");
    const after = lockBet(ledger, user, usdcToAtomic(10), key);
    expect(after.available).toBe(usdcToAtomic(5));
    expect(after.locked).toBe(usdcToAtomic(10));
    expect(ledger.appliedKeys.has(key)).toBe(true);

    // Successful apply is idempotent
    const again = lockBet(ledger, user, usdcToAtomic(10), key);
    expect(again.locked).toBe(usdcToAtomic(10));
    expect(again.available).toBe(usdcToAtomic(5));
  });

  it("failed settleHand does not poison key", () => {
    const ledger = createLedger();
    const user = "s";
    const key = "settle-k";
    creditDeposit(ledger, user, usdcToAtomic(10), "d");
    // No lock — settle should throw and leave key free
    expect(() =>
      settleHand(
        ledger,
        user,
        settlementFromOutcome("player_lose", usdcToAtomic(10)),
        key,
      ),
    ).toThrow(/insufficient locked/);
    expect(ledger.appliedKeys.has(key)).toBe(false);

    lockBet(ledger, user, usdcToAtomic(10), "lock-ok");
    settleHand(
      ledger,
      user,
      settlementFromOutcome("player_lose", usdcToAtomic(10)),
      key,
    );
    expect(getBalance(ledger, user).locked).toBe(0n);
    expect(getBalance(ledger, user).available).toBe(0n);
  });

  it("free_balance formula uses config reserve once", () => {
    const cfg = loadConfig({ RESERVE_FLOOR_USDC: "50", BUY_RATIO: "0.7" });
    const free = computeFreeBalanceAtomic({
      onchainHouseUsdcAtomic: usdcToAtomic(200),
      playerLiabilityAtomic: usdcToAtomic(100),
      reserveFloorAtomic: cfg.buyPolicy.reserveFloorAtomic,
    });
    expect(free).toBe(usdcToAtomic(50));
    const { buyAtomic } = computeBuyAmountAtomic(
      free,
      cfg.buyPolicy,
      usdcToAtomic(1000),
    );
    expect(buyAtomic).toBe(usdcToAtomic(35));
  });

  it("hand lock cannot be completed as withdraw (lock separation)", () => {
    const ledger = createLedger();
    const user = "lock-sep";
    creditDeposit(ledger, user, usdcToAtomic(50), "d");
    lockBet(ledger, user, usdcToAtomic(30), "hand");
    requestWithdraw(ledger, user, usdcToAtomic(10), "wd");
    const locks = getLockBreakdown(ledger, user);
    expect(locks.lockedHand).toBe(usdcToAtomic(30));
    expect(locks.lockedWithdraw).toBe(usdcToAtomic(10));
    // Completing more than withdraw lock must fail even if hand lock is larger
    expect(() =>
      completeWithdraw(ledger, user, usdcToAtomic(30), "steal-hand"),
    ).toThrow(/insufficient locked for withdraw complete/);
    completeWithdraw(ledger, user, usdcToAtomic(10), "wd-done");
    expect(getLockBreakdown(ledger, user).lockedHand).toBe(usdcToAtomic(30));
  });

  it("cancel withdraw restores available", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(40), "d");
    requestWithdraw(ledger, "u", usdcToAtomic(15), "wd");
    cancelWithdraw(ledger, "u", usdcToAtomic(15), "wd-cancel");
    expect(getBalance(ledger, "u").available).toBe(usdcToAtomic(40));
    expect(getLockBreakdown(ledger, "u").lockedWithdraw).toBe(0n);
  });

  it("frozen user cannot request withdraw", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(20), "d");
    setWithdrawFrozen(ledger, "u", true);
    expect(() =>
      requestWithdraw(ledger, "u", usdcToAtomic(5), "wd"),
    ).toThrow(/frozen/);
  });

  it("reorg reverse freezes when available insufficient", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(10), "d");
    lockBet(ledger, "u", usdcToAtomic(10), "lock");
    reverseDeposit(ledger, "u", usdcToAtomic(10), "reorg");
    expect(getBalance(ledger, "u").available).toBe(0n);
    expect(() =>
      requestWithdraw(ledger, "u", usdcToAtomic(1), "wd"),
    ).toThrow(/frozen/);
  });

  it("rejects malicious settlement that credits above max mult", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(10), "d");
    lockBet(ledger, "u", usdcToAtomic(10), "lock");
    const bet = usdcToAtomic(10);
    const evilCredit = bet * 1001n;
    expect(() =>
      settleHand(
        ledger,
        "u",
        {
          outcome: "player_win",
          betAtomic: bet,
          creditAvailableAtomic: evilCredit,
          houseEquityDeltaAtomic: bet - evilCredit,
        },
        "evil",
      ),
    ).toThrow(/maximum/);
  });

  it("accepts high but valid house-game mult (e.g. 250× royal)", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(10), "d");
    lockBet(ledger, "u", usdcToAtomic(10), "lock");
    const bet = usdcToAtomic(10);
    const credit = bet * 250n;
    settleHand(
      ledger,
      "u",
      {
        outcome: "player_win",
        betAtomic: bet,
        creditAvailableAtomic: credit,
        houseEquityDeltaAtomic: bet - credit,
      },
      "royal",
    );
    expect(getBalance(ledger, "u").available).toBe(credit);
  });

  it("rejects settlement that does not conserve stake", () => {
    const ledger = createLedger();
    creditDeposit(ledger, "u", usdcToAtomic(10), "d");
    lockBet(ledger, "u", usdcToAtomic(10), "lock");
    expect(() =>
      settleHand(
        ledger,
        "u",
        {
          outcome: "player_win",
          betAtomic: usdcToAtomic(10),
          creditAvailableAtomic: usdcToAtomic(20),
          houseEquityDeltaAtomic: 0n, // should be -bet
        },
        "bad-conserved",
      ),
    ).toThrow(/conserve/);
  });

  it("rejects zero or negative deposit amounts", () => {
    const ledger = createLedger();
    expect(() => creditDeposit(ledger, "u", 0n, "z")).toThrow(/positive/);
    expect(() => creditDeposit(ledger, "u", -1n, "n")).toThrow(/positive/);
  });
});

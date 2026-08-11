import Link from "next/link";
import { getServerConfig } from "@/lib/server-config";
import {
  BLACKCATE_RULES,
  CATEFLIP_RULES,
  CATEDICE_RULES,
  CATESPIN_RULES,
  HIGHCATE_RULES,
  CATESLOTS_RULES,
  VIDEOCATE_RULES,
  CATEPOKER_RULES,
} from "@catesino/house-games";
import { GAME_CATALOG } from "@catesino/config";

function MoneyExample({
  bet,
  mult,
}: {
  bet: number;
  mult: number;
}) {
  if (mult <= 0) {
    return (
      <span>
        bet ${bet.toFixed(2)} → <strong>lose stake</strong>
      </span>
    );
  }
  const back = bet * mult;
  const profit = back - bet;
  return (
    <span>
      bet ${bet.toFixed(2)} → get <strong>${back.toFixed(2)}</strong> back
      {profit > 0 ? ` (profit $${profit.toFixed(2)})` : profit === 0 ? " (break even)" : ""}
    </span>
  );
}

export default function PlayRulesPage() {
  const { config } = getServerConfig();
  const min = config.betLimits.minUsdc;
  const max = config.betLimits.maxUsdc;
  const ex = Math.max(min, 1);

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          Simple rules · real house math
        </p>
        <h1>HOW TO PLAY</h1>
        <p>
          Every game uses the same demo wallet. Stake is locked when you bet,
          then settled when the round ends — same idea as a real table.
        </p>
      </header>

      {/* Universal money rules */}
      <section className="rules-block">
        <h2 className="rules-block__title">Money (all games)</h2>
        <ul className="rules-list">
          <li>
            <strong>Min bet:</strong> ${min} USDC · <strong>Max bet:</strong> $
            {max} USDC
          </li>
          <li>
            <strong>Stake-lock:</strong> your bet moves from <em>available</em> →{" "}
            <em>locked</em> when the round starts. When it ends, the lock clears
            and any win is credited to available.
          </li>
          <li>
            <strong>Example:</strong> bet ${ex.toFixed(2)}. If you lose → balance
            drops by ${ex.toFixed(2)}. If you win even money → you get $
            {(ex * 2).toFixed(2)} back (your ${ex.toFixed(2)} + ${ex.toFixed(2)}{" "}
            profit).
          </li>
          <li>
            <strong>Demo wallet:</strong> starts at $100 USDC credits — shared
            across BlackCate, slots, poker, everything. No real chain yet.
          </li>
          <li>
            <strong>Why play here:</strong> house edge still points at the{" "}
            <Link href="/">$CATE ritual</Link> when live — not a random rug chart.
          </li>
        </ul>
      </section>

      {/* Per game */}
      <section className="rules-block">
        <h2 className="rules-block__title">BlackCate</h2>
        <p className="rules-classic">was {BLACKCATE_RULES.classic}</p>
        <p className="rules-how">{BLACKCATE_RULES.how}</p>
        <ul className="rules-list">
          {BLACKCATE_RULES.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
          <li>
            <strong>$1 blackjack example:</strong> natural BJ → get{" "}
            <strong>$2.50</strong> back. Win 1:1 → <strong>$2.00</strong>. Push →{" "}
            <strong>$1.00</strong>. Lose → <strong>$0</strong>.
          </li>
          <li className="rules-note">{BLACKCATE_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/blackcate">
          Play BlackCate
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">CateSlots</h2>
        <p className="rules-classic">was {CATESLOTS_RULES.classic}</p>
        <p className="rules-how">{CATESLOTS_RULES.how}</p>
        <ul className="rules-list">
          <li>Press Spin — three reels stop on symbols.</li>
          <li>
            <strong>Three of a kind</strong> (same symbol on all reels):
            <ul className="rules-sub">
              {CATESLOTS_RULES.triples.map((t) => (
                <li key={t.symbol}>
                  {t.symbol}:{" "}
                  {t.creditMult > 0 ? (
                    <MoneyExample bet={ex} mult={t.creditMult} />
                  ) : (
                    "no pay"
                  )}
                </li>
              ))}
            </ul>
          </li>
          <li>
            <strong>Pair</strong> (first two reels CATE, CAT, or GOLD):{" "}
            <MoneyExample bet={ex} mult={CATESLOTS_RULES.pairCreditMult} />
          </li>
          <li className="rules-note">{CATESLOTS_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/cateslots">
          Play CateSlots
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">VideoCate</h2>
        <p className="rules-classic">was {VIDEOCATE_RULES.classic}</p>
        <p className="rules-how">{VIDEOCATE_RULES.how}</p>
        <ul className="rules-list">
          <li>
            <strong>Steps:</strong> Deal → tap cards to HOLD → Draw → paid on
            final hand.
          </li>
          <li>
            <strong>Pays if you have at least a pair of Jacks</strong> (JJ, QQ,
            KK, AA) or better.
          </li>
        </ul>
        <div className="pay-table">
          <div className="pay-table__head">
            <span>Hand</span>
            <span>If you bet ${ex.toFixed(0)}</span>
          </div>
          {VIDEOCATE_RULES.paytable.map((row) => (
            <div className="pay-table__row" key={row.hand}>
              <span>{row.hand}</span>
              <span>
                {row.creditMult <= 0
                  ? "—"
                  : `$${ (ex * row.creditMult).toFixed(2) } back`}
              </span>
            </div>
          ))}
        </div>
        <p className="rules-note" style={{ marginTop: "0.75rem" }}>
          {VIDEOCATE_RULES.houseNote}
        </p>
        <Link className="btn btn--line btn--sm" href="/play/videocate">
          Play VideoCate
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">CatePoker</h2>
        <p className="rules-classic">was {CATEPOKER_RULES.classic}</p>
        <p className="rules-how">{CATEPOKER_RULES.how}</p>
        <div className="pay-table">
          <div className="pay-table__head">
            <span>Hand</span>
            <span>If you bet ${ex.toFixed(0)}</span>
          </div>
          {CATEPOKER_RULES.paytable.map((row) => (
            <div className="pay-table__row" key={row.hand}>
              <span>{row.hand}</span>
              <span>
                {row.creditMult <= 0
                  ? "—"
                  : `$${(ex * row.creditMult).toFixed(2)} back`}
              </span>
            </div>
          ))}
        </div>
        <p className="rules-note" style={{ marginTop: "0.75rem" }}>
          {CATEPOKER_RULES.houseNote}
        </p>
        <Link className="btn btn--line btn--sm" href="/play/catepoker">
          Play CatePoker
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">CateFlip</h2>
        <p className="rules-classic">was {CATEFLIP_RULES.classic}</p>
        <p className="rules-how">{CATEFLIP_RULES.how}</p>
        <ul className="rules-list">
          <li>
            Win: <MoneyExample bet={ex} mult={CATEFLIP_RULES.winCreditMult} />
          </li>
          <li>Lose: stake gone.</li>
          <li className="rules-note">{CATEFLIP_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/cateflip">
          Play CateFlip
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">CateDice</h2>
        <p className="rules-classic">was {CATEDICE_RULES.classic}</p>
        <p className="rules-how">{CATEDICE_RULES.how}</p>
        <ul className="rules-list">
          <li>
            <strong>Over 50:</strong> win on 51–100 (50% chance) → about{" "}
            <strong>1.98×</strong> total back.
          </li>
          <li>
            <strong>Under 50:</strong> win on 1–49 (49% chance) → slightly higher
            payout.
          </li>
          <li>
            Riskier lines (e.g. Over 90) pay more; safer lines pay less.
          </li>
          <li className="rules-note">{CATEDICE_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/catedice">
          Play CateDice
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">CateSpin</h2>
        <p className="rules-classic">was {CATESPIN_RULES.classic}</p>
        <p className="rules-how">{CATESPIN_RULES.how}</p>
        <ul className="rules-list">
          <li>
            <strong>Red or Black:</strong>{" "}
            <MoneyExample bet={ex} mult={CATESPIN_RULES.redBlackCreditMult} /> —
            but <em>0 (green) loses</em> color bets.
          </li>
          <li>
            <strong>Green (zero only):</strong>{" "}
            <MoneyExample bet={ex} mult={CATESPIN_RULES.greenCreditMult} />{" "}
            (35:1, casino single-number style).
          </li>
          <li className="rules-note">{CATESPIN_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/catespin">
          Play CateSpin
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">HighCate</h2>
        <p className="rules-classic">was {HIGHCATE_RULES.classic}</p>
        <p className="rules-how">{HIGHCATE_RULES.how}</p>
        <ul className="rules-list">
          <li>
            <strong>Low (2–6) or High (8–12):</strong>{" "}
            <MoneyExample bet={ex} mult={HIGHCATE_RULES.lowHighCreditMult} />. A
            seven loses.
          </li>
          <li>
            <strong>Seven:</strong>{" "}
            <MoneyExample bet={ex} mult={HIGHCATE_RULES.sevenCreditMult} />.
          </li>
          <li className="rules-note">{HIGHCATE_RULES.houseNote}</li>
        </ul>
        <Link className="btn btn--line btn--sm" href="/play/highcate">
          Play HighCate
        </Link>
      </section>

      <section className="rules-block rules-block--cta">
        <h2 className="rules-block__title">Ready?</h2>
        <p className="rules-how">
          Same wallet across all {GAME_CATALOG.length} games. Start small, learn
          the paytables, then climb.
        </p>
        <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
          <Link className="btn btn--gold" href="/play">
            Open the floor
          </Link>
          <Link className="btn btn--line" href="/">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}

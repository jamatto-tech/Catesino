import Link from "next/link";
import { DESK_GAMES } from "@/lib/desk-games";

export default function PlayRulesPage() {
  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          no chips · no house book
        </p>
        <h1>HOW THE DESK WORKS</h1>
        <p>
          These are not casino tables. You play for score. A finished hold
          or a right vault call can drip Machine yarn. Nothing here is cash,
          and nothing is a broker.
        </p>
      </header>

      <section className="rules-block">
        <h2 className="rules-block__title">Hold the Line</h2>
        <p className="rules-how">
          Ten FUD hits in about 20 seconds. Tap HOLD on red wicks. Do not tap
          the fake take-profit. Each held wick is +3 score. Clear the wave:
          +15 more and maybe +1 yarn.
        </p>
        <Link className="btn btn--line btn--sm" href="/play/hold">
          Hold
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">The Cate Desk</h2>
        <p className="rules-how">
          Paper long or short live $CATE for twenty seconds. Watch the tape,
          then it auto-settles. Right: +25 score. Wrong: +5 for showing up.
          No cash PnL.
        </p>
        <Link className="btn btn--line btn--sm" href="/play/desk">
          Desk
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">Call the Vault</h2>
        <p className="rules-how">
          One call per UTC day: skip, buy, or big print. Seal it, then we
          crack the 24h tape (skip ≤ 0%, buy = up, big ≥ +5%). Right: +30
          score and maybe +1 yarn. When the public buy log exists, this will
          settle on that instead.
        </p>
        <Link className="btn btn--line btn--sm" href="/play/vault">
          Vault
        </Link>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">Tape Flip</h2>
        <p className="rules-how">
          Long or short a fake candle. It prints in about two seconds.
          Server HMAC, true 50/50. Wins stack a streak. +15 / +5 score. Not
          a signal.
        </p>
        <Link className="btn btn--line btn--sm" href="/play/tape">
          Tape
        </Link>
      </section>

      <section className="rules-block rules-block--cta">
        <h2 className="rules-block__title">{DESK_GAMES.length} desk games</h2>
        <p className="rules-how">
          The Machine is separate: yarn in, cosmetics out. Daily yarn is
          bagwork on X.
        </p>
        <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
          <Link className="btn btn--gold" href="/play">
            Open the desk
          </Link>
          <Link className="btn btn--line" href="/machine">
            Machine
          </Link>
        </div>
      </section>
    </main>
  );
}

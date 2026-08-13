import Link from "next/link";
import { CateDrive } from "@/components/CateDrive";
import { getServerConfig } from "@/lib/server-config";
import { DESK_GAMES } from "@/lib/desk-games";

export default function PlayLobbyPage() {
  const { config } = getServerConfig();

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero desk-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="desk-hero__coin"
          src="/memes/cate-launch.jpg"
          alt=""
        />
        <p className="life__tag" style={{ justifyContent: "center" }}>
          the desk · not a casino
        </p>
        <h1>THE DESK</h1>
        <p>
          No blackjack. No slots. Hold wicks, ride twenty seconds of live
          $CATE, seal the day, or flip a fake candle. Score is points, not
          cash. The Machine is next door.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn--line btn--sm" href="/play/rules">
            How the desk works
          </Link>
        </p>
      </header>

      <div className="game-grid">
        {DESK_GAMES.map((g) => (
          <article key={g.id} className={`game-card game-card--${g.id}`}>
            <div className="game-card__art" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.art} alt="" />
            </div>
            <h2 className="game-card__name">{g.name}</h2>
            <p className="game-card__tag">{g.tagline}</p>
            <p className="game-card__blurb">{g.blurb}</p>
            <Link className="btn btn--gold btn--sm" href={g.href}>
              Open {g.name}
            </Link>
          </article>
        ))}
      </div>

      {config.flags.gachaEnabled ? (
        <section className="machine-teaser">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="machine-teaser__art" src="/machine/hero.jpg" alt="" />
          <p className="life__tag" style={{ justifyContent: "center" }}>
            yarn in · culture out
          </p>
          <h2>THE CATE MACHINE</h2>
          <p>
            Cosmetics and later mints. Daily yarn is bagwork. Not a slot.
          </p>
          <div className="btn-row">
            <Link className="btn btn--gold btn--sm" href="/machine">
              Yank the yarn
            </Link>
            <Link className="btn btn--line btn--sm" href="/machine/odds">
              See the odds
            </Link>
          </div>
        </section>
      ) : null}

      <CateDrive compact />
    </main>
  );
}

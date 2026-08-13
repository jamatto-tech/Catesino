import Link from "next/link";
import { listPlayableGames } from "@/lib/games";
import { CateDrive } from "@/components/CateDrive";
import { getServerConfig } from "@/lib/server-config";

export default function PlayLobbyPage() {
  const games = listPlayableGames();
  const { config } = getServerConfig();

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          every game is Cate
        </p>
        <h1>THE GAMES</h1>
        <p>
          Not a random casino catalog. One demo wallet. You&apos;re hanging out
          with the cat — not picking a house brand.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn--line btn--sm" href="/play/rules">
            How each game works
          </Link>
        </p>
      </header>

      {config.flags.gachaEnabled ? (
        <section className="machine-teaser">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="machine-teaser__art"
            src="/machine/hero.jpg"
            alt=""
          />
          <p className="life__tag" style={{ justifyContent: "center" }}>
            yarn in · culture out
          </p>
          <h2>THE CATE MACHINE</h2>
          <p>
            Not a slot. Yank yarn for frames and titles. House games still pay
            chips. We don&apos;t buy the merch back.
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

      <div className="game-grid">
        {games.map((g) => (
          <article
            key={g.id}
            className={`game-card${g.enabled ? "" : " game-card--off"}`}
          >
            <div className="game-card__emoji" aria-hidden>
              {g.emoji}
            </div>
            <h2 className="game-card__name">{g.name}</h2>
            <p className="game-card__tag">{g.tagline}</p>
            <p className="game-card__classic">was {g.classic}</p>
            <p className="game-card__blurb">{g.blurb}</p>
            {g.enabled ? (
              <Link className="btn btn--gold btn--sm" href={g.href}>
                Play {g.name}
              </Link>
            ) : (
              <span className="btn btn--line btn--sm" style={{ opacity: 0.5 }}>
                Offline
              </span>
            )}
          </article>
        ))}
      </div>

      <CateDrive compact />
    </main>
  );
}

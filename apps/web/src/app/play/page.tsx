import Link from "next/link";
import { listPlayableGames } from "@/lib/games";
import { CateDrive } from "@/components/CateDrive";

export default function PlayLobbyPage() {
  const games = listPlayableGames();

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          The floor · every game is Cate
        </p>
        <h1>CATESINO FLOOR</h1>
        <p>
          Not a random casino catalog — every title is branded for $CATE. One
          demo wallet across all tables.
        </p>
        <p style={{ marginTop: "1rem" }}>
          <Link className="btn btn--line btn--sm" href="/play/rules">
            How each game works
          </Link>
        </p>
      </header>

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

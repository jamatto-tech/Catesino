import Link from "next/link";
import { CateDrive } from "@/components/CateDrive";
import { getCateLinks } from "@/lib/cate-links";

export default function LawsPage() {
  const cate = getCateLinks();

  const laws = [
    {
      n: "01",
      title: "Fair deal",
      body: "Server-authoritative house games. BlackCate (blackjack engine), CateFlip, CateDice, CateSpin, HighCate — all stake-locked and fair.",
    },
    {
      n: "02",
      title: "USDC only",
      body: "Stakes and credits in USDC. Mints and limits from shared config — the same stack that knows the $CATE mint.",
    },
    {
      n: "03",
      title: "Daily Cate",
      body: "Free treasury (after liability + reserve) may buy open-market $CATE. Same cat. Same mint. Public when live.",
    },
    {
      n: "04",
      title: "Hold the vault",
      body: "Bought Cate lands in the Community Vault. No app sell path. Catesino does not compete with cate.meme — it feeds it.",
    },
  ];

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          Life VI · The law
        </p>
        <h1>LAWS OF THE TABLE</h1>
        <p>
          Four things are carved. Everything else is play. Sibling of{" "}
          <a href={cate.brand} target="_blank" rel="noreferrer">
            cate.meme
          </a>{" "}
          — same night sky, same gold, same cat.
        </p>
      </header>

      <section className="laws">
        {laws.map((law) => (
          <article key={law.n} className="law">
            <h3>
              <span>LAW {law.n}</span>
              {law.title}
            </h3>
            <p>{law.body}</p>
          </article>
        ))}
      </section>

      <section className="life center" style={{ paddingTop: "3rem" }}>
        <p className="omen" style={{ textAlign: "center" }}>
          Edge exists. Entertainment has a price. Free house value points at{" "}
          <em>$CATE</em>.
        </p>
        <div className="btn-row" style={{ marginTop: "1.5rem" }}>
          <Link className="btn btn--gold" href="/play">
            Open the floor
          </Link>
          <a className="btn btn--line" href={cate.buy.pumpfun} target="_blank" rel="noreferrer">
            Get $CATE
          </a>
        </div>
      </section>

      <CateDrive compact />
    </main>
  );
}

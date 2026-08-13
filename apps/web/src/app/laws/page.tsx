import Link from "next/link";
import { CateDrive } from "@/components/CateDrive";
import { getCateLinks } from "@/lib/cate-links";

export default function LawsPage() {
  const cate = getCateLinks();

  const laws = [
    {
      n: "01",
      title: "Fair games",
      body: "Server deals. Stake locks. BlackCate, CateFlip, CateDice, CateSpin, HighCate — no mystery-box RNG story.",
    },
    {
      n: "02",
      title: "USDC chips",
      body: "You play with USDC. Mints and limits come from shared config — the same stack that knows the $CATE mint.",
    },
    {
      n: "03",
      title: "House buys the cat",
      body: "Free treasury (after winners + reserve) may buy open-market $CATE. Same cat. Same mint. Public when live.",
    },
    {
      n: "04",
      title: "Vault holds",
      body: "Bought Cate sits in the community vault. No app dump. Catesino does not compete with cate.meme — it feeds it.",
    },
  ];

  return (
    <main className="shell" style={{ paddingBottom: "4rem" }}>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          it&apos;s not that deep
        </p>
        <h1>THE DEAL</h1>
        <p>
          Four things. Then go play. Sibling of{" "}
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
              <span>{law.n}</span>
              {law.title}
            </h3>
            <p>{law.body}</p>
          </article>
        ))}
      </section>

      <section className="life center" style={{ paddingTop: "3rem" }}>
        <p className="say" style={{ textAlign: "center" }}>
          Edge exists. That&apos;s the price of play. The edge points at{" "}
          <strong>$CATE</strong> — not some dude&apos;s wallet.
        </p>
        <div className="btn-row" style={{ marginTop: "1.5rem" }}>
          <Link className="btn btn--gold" href="/play">
            Come play
          </Link>
          <a
            className="btn btn--line"
            href={cate.buy.pumpfun}
            target="_blank"
            rel="noreferrer"
          >
            Get $CATE
          </a>
        </div>
      </section>

      <CateDrive compact />
    </main>
  );
}

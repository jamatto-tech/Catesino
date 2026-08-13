import Link from "next/link";
import { CateDrive } from "@/components/CateDrive";
import { getCateLinks } from "@/lib/cate-links";

export default function LawsPage() {
  const cate = getCateLinks();

  const laws = [
    {
      n: "01",
      title: "No casino book",
      body: "Hold, desk, vault, tape. Conviction points — not USDC tables. Tape Flip is a published 50/50 and says so.",
    },
    {
      n: "02",
      title: "Yarn is culture",
      body: "The Machine pays cosmetics. Rare/Ultra mints need a 30-day $CATE hold. Ultra Gold cuts to Diamond after 90 days and bagwork. We don't cash frames or mints.",
    },
    {
      n: "03",
      title: "One chart",
      body: "If we look at a tape, it's $CATE. Not a random token desk.",
    },
    {
      n: "04",
      title: "Vault holds",
      body: "When the daily buy is live, it still sits in the community vault. Catesino feeds cate.meme — it doesn't compete.",
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
          Not a broker. Not a book. Play points at{" "}
          <strong>$CATE</strong> — the desk, the machine, the bag.
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

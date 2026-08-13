import type { Metadata } from "next";
import Link from "next/link";
import { DropBoard } from "@/components/DropBoard";
import { MintPreviewGrid } from "@/components/MintPreviewGrid";
import { getServerConfig } from "@/lib/server-config";
import { publicOddsPayload } from "@/lib/gacha-demo";

export const metadata: Metadata = {
  title: "Cate Machine odds",
  description: "Published pull weights and hard pity for the Cate Machine.",
};

export default function MachineOddsPage() {
  const { config } = getServerConfig();

  if (!config.flags.gachaEnabled) {
    return (
      <main className="shell page-hero">
        <h1>MACHINE ASLEEP</h1>
        <p>Odds stay public when the Machine is on.</p>
        <p style={{ marginTop: "1.25rem" }}>
          <Link className="btn btn--line" href="/play">
            See the games
          </Link>
        </p>
      </main>
    );
  }

  const odds = publicOddsPayload(config);

  return (
    <main className="shell machine-page">
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          public table · no hidden rates
        </p>
        <h1>THE ODDS</h1>
        <p>
          {odds.copy} Each rarity is a bucket. Inside a bucket, every item
          below is equally likely.
        </p>
      </header>

      {odds.pityBanner ? (
        <p className="alert" role="status">
          Live pity is {odds.pityRareHardLive} (published footnote is{" "}
          {odds.pityRareHardFootnote}). Receipts carry the live number.
        </p>
      ) : null}

      <div className="odds-table">
        <div className="odds-table__head">
          <span>Rarity</span>
          <span>Weight</span>
          <span>Chance</span>
        </div>
        {odds.rows.map((row) => (
          <div className="odds-table__row" key={row.rarity} data-rarity={row.rarity}>
            <span className="odds-table__rarity">{row.rarity}</span>
            <span>{row.weight}</span>
            <span>{row.percent}</span>
            {row.note ? <p className="odds-table__note">{row.note}</p> : null}
          </div>
        ))}
      </div>

      <DropBoard lanes={odds.drops} />
      <MintPreviewGrid />

      <section className="rules-block" style={{ marginTop: "1.5rem" }}>
        <h2 className="rules-block__title">Hard pity</h2>
        <p className="rules-how">
          After {odds.pityRareHardLive} pulls without a rare, the next pull is
          rare. Uncommon has no pity. Ultra sample mints are not live — that
          0.10% falls to rare today.
        </p>
      </section>

      <section className="rules-block">
        <h2 className="rules-block__title">Hold to mint</h2>
        <p className="rules-how">
          Rare and Ultra NFTs need 30 days holding $CATE. Ultra mints Gold.
          Cut Gold to Diamond after 90 days still holding and 15 bagwork
          posts. Cosmetics still pull with no hold. We never buy mints back.
        </p>
      </section>

      <details className="verify-doc">
        <summary>How to verify a pull</summary>
        <ol>
          <li>
            HMAC-SHA256 key = 32-byte <code>serverSeed</code> (hex decoded — not
            the hex string).
          </li>
          <li>
            Message <code>{"${clientSeed}:${nonce}:rarity:${counter}"}</code>,
            rejection-sample a number 0–9999.
          </li>
          <li>
            Map that bucket onto this table. Empty rarities fall down (Ultra →
            Rare). Pity may force Rare if the counter is already at the
            threshold.
          </li>
          <li>
            Item lane uses the same key,{" "}
            <code>{"${clientSeed}:${nonce}:item:${counter}"}</code>, uniform
            among in-supply ids of the final rarity.
          </li>
        </ol>
        <p>
          The receipt on the Machine has commit, seed, nonce, bucket, and
          in-supply hash. Pity is derived — don&apos;t trust a client flag.
        </p>
      </details>

      <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: "2rem" }}>
        <Link className="btn btn--gold" href="/machine">
          Yank the yarn
        </Link>
        <Link className="btn btn--line" href="/play">
          House games
        </Link>
      </div>
    </main>
  );
}

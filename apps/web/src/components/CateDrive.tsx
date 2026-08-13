"use client";

import { getCateLinks } from "@/lib/cate-links";

/** Stable links — no process.env in this client tree. */
const cate = getCateLinks();

/** Persistent conversion block — play is the funnel, $CATE is the destination. */
export function CateDrive({ compact = false }: { compact?: boolean }) {
  return (
    <section className="cate-drive">
      <h2>{compact ? "Still $CATE" : "This exists so $CATE gets bought"}</h2>
      <p>
        Don&apos;t have conviction? Don&apos;t trade. Play here. The house take
        points one way — back to the cat.
      </p>
      <div className="btn-row">
        <a
          className="btn btn--gold"
          href={cate.buy.pumpfun}
          target="_blank"
          rel="noreferrer"
        >
          Get $CATE
        </a>
        <a
          className="btn btn--line"
          href={cate.brand}
          target="_blank"
          rel="noreferrer"
        >
          cate.meme
        </a>
      </div>
      <div className="links">
        <a href={cate.buy.fomo} target="_blank" rel="noreferrer">
          FOMO
        </a>
        <a href={cate.buy.moonshot} target="_blank" rel="noreferrer">
          Moonshot
        </a>
        <a href={cate.dexscreener} target="_blank" rel="noreferrer">
          DexScreener
        </a>
        <a href={cate.social.x} target="_blank" rel="noreferrer">
          X
        </a>
        <a href={cate.social.telegram} target="_blank" rel="noreferrer">
          Telegram
        </a>
      </div>
    </section>
  );
}

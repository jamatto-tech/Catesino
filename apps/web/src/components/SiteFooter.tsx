import { getCateLinks } from "@/lib/cate-links";

export function SiteFooter() {
  const cate = getCateLinks();

  return (
    <footer className="foot">
      <div className="foot__mark">CATESINO · $CATE</div>
      <p className="foot__end">
        Play sister of{" "}
        <a href={cate.brand} target="_blank" rel="noreferrer">
          cate.meme
        </a>
        . Don&apos;t ape random charts.
        <br />
        Not financial advice · 18+ · Demo chips ·{" "}
        <a href={cate.buy.pumpfun} target="_blank" rel="noreferrer">
          Buy $CATE
        </a>
      </p>
    </footer>
  );
}

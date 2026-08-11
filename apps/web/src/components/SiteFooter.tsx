import { getCateLinks } from "@/lib/cate-links";

export function SiteFooter() {
  const cate = getCateLinks();

  return (
    <footer className="foot">
      <div className="foot__mark">CATESINO · $CATE</div>
      <p className="foot__end">
        Sibling of{" "}
        <a href={cate.brand} target="_blank" rel="noreferrer">
          cate.meme
        </a>
        . Flow always returns to Cate.
        <br />
        Not financial advice · 18+ · Demo mode ·{" "}
        <a href={cate.buy.pumpfun} target="_blank" rel="noreferrer">
          Buy $CATE
        </a>
      </p>
    </footer>
  );
}

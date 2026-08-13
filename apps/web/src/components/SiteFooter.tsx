import { getCateLinks } from "@/lib/cate-links";

export function SiteFooter() {
  const cate = getCateLinks();

  return (
    <footer className="foot">
      <div className="foot__mark">CATESINO · $CATE</div>
      <p className="foot__end">
        Desk and Machine sister of{" "}
        <a href={cate.brand} target="_blank" rel="noreferrer">
          cate.meme
        </a>
        . One chart. One cat.
        <br />
        Not financial advice · Score, not cash ·{" "}
        <a href={cate.buy.pumpfun} target="_blank" rel="noreferrer">
          Buy $CATE
        </a>
      </p>
    </footer>
  );
}

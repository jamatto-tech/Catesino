import { getServerConfig } from "@/lib/server-config";
import { getCateLinks } from "@/lib/cate-links";

/** cate.meme-style live ticker — product + $CATE pointers */
export function TickerBar() {
  const { config, chain } = getServerConfig();
  const cate = getCateLinks(config);
  const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

  return (
    <div className="ticker" data-testid="market-stats">
      <a href={cate.dexscreener} target="_blank" rel="noreferrer">
        Live $CATE <b>chart</b>
      </a>
      <span className="ticker__sep" aria-hidden />
      <span>
        Mint <b>{short(chain.cateMint)}</b>
      </span>
      <span className="ticker__sep" aria-hidden />
      <span>
        Bets{" "}
        <b>
          ${config.betLimits.minUsdc}–${config.betLimits.maxUsdc}
        </b>
      </span>
      <span className="ticker__sep" aria-hidden />
      <span>
        House buys $CATE <b>{(config.buyPolicy.buyRatio * 100).toFixed(0)}%</b>
      </span>
      <span className="ticker__sep" aria-hidden />
      <a href={cate.brand} target="_blank" rel="noreferrer">
        cate.meme ↗
      </a>
    </div>
  );
}

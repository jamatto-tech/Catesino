import { getServerConfig } from "@/lib/server-config";

/** Sticky market / product stats chrome — live feeds later. */
export function MarketStatsBar() {
  const { config, chain } = getServerConfig();
  const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

  const items = [
    { label: "Cluster", value: chain.cluster },
    { label: "$CATE", value: short(chain.cateMint) },
    { label: "USDC", value: short(chain.usdcMint) },
    {
      label: "Bets",
      value: `$${config.betLimits.minUsdc}–$${config.betLimits.maxUsdc}`,
    },
    {
      label: "Buy ritual",
      value: `${(config.buyPolicy.buyRatio * 100).toFixed(0)}% free`,
    },
  ];

  return (
    <div className="stats-strip" data-testid="market-stats">
      {items.map((item, i) => (
        <span key={item.label} style={{ display: "contents" }}>
          {i > 0 ? <span className="stats-strip__dot" aria-hidden /> : null}
          <span className="stats-strip__item">
            {item.label} <strong>{item.value}</strong>
          </span>
        </span>
      ))}
    </div>
  );
}

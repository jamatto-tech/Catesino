import { BlackjackTable } from "@/components/BlackjackTable";
import { CateDrive } from "@/components/CateDrive";
import { getServerConfig } from "@/lib/server-config";
import { BLACKJACK_RULES } from "@catesino/blackjack";
import Link from "next/link";

export default function BlackCatePage() {
  const { config } = getServerConfig();

  if (!config.flags.blackcateEnabled) {
    return (
      <main className="shell page-hero">
        <h1>BlackCate</h1>
        <p>BlackCate is offline by feature flag.</p>
        <Link className="btn btn--line" href="/play">
          Back to games
        </Link>
      </main>
    );
  }

  return (
    <main className="shell play-page">
      <header className="play-head">
        <div className="logo-coin" style={{ width: 72, marginBottom: "1rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/memes/cate-launch.jpg" alt="" />
        </div>
        <p className="life__tag" style={{ justifyContent: "center" }}>
          was blackjack · now <strong style={{ color: "var(--gold)" }}>BlackCate</strong>
        </p>
        <h1>BLACKCATE</h1>
        <p>
          <span>
            {BLACKJACK_RULES.decks}-deck · S17 · BJ{" "}
            {BLACKJACK_RULES.blackjackPayoutNumerator}:
            {BLACKJACK_RULES.blackjackPayoutDenominator}
          </span>
          {" · "}no split · ${config.betLimits.minUsdc}–$
          {config.betLimits.maxUsdc} · for $CATE
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
            ← All games
          </Link>
        </p>
      </header>

      <BlackjackTable
        minBetUsdc={config.betLimits.minUsdc}
        maxBetUsdc={config.betLimits.maxUsdc}
        defaultBetUsdc={Math.max(config.betLimits.minUsdc, 1)}
      />

      <CateDrive compact />
    </main>
  );
}

import Link from "next/link";
import { getServerConfig } from "@/lib/server-config";
import { getCateLinks } from "@/lib/cate-links";
import { CateDrive } from "@/components/CateDrive";
import { MemeFrame } from "@/components/MemeFrame";

/**
 * Community art under /public/memes — pulled from X posts that cite the
 * official mint Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump.
 */
const MEMES = {
  logo: "/memes/cate-launch.jpg",
  sister: "/memes/cate-doge-sister.jpg",
  believe: "/memes/cate-believe.jpg",
  culture: "/memes/cate-culture.jpg",
} as const;

export default function HomePage() {
  const { config } = getServerConfig();
  const cate = getCateLinks(config);

  return (
    <main className="shell-wide">
      {/* Life I — Awakening */}
      <section className="life center" id="l1">
        <p className="life__tag">Life I · Awakening</p>
        <h1 className="h-title">
          CATE<span className="it">SINO</span>
        </h1>
        <div className="h-rule">
          <span>the community table</span>
        </div>
        <p className="h-sub">
          the play sister of <span className="gold">$CATE</span>
        </p>
        <p className="h-meta">$CATE · SOLANA · HOUSE GAMES · BUY RITUAL</p>

        <div className="logo-coin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEMES.logo} alt="CateCoin gold C logo with tabby cat" />
        </div>
        <p className="credit-line">community $CATE mark · Solana</p>

        <p className="omen" style={{ textAlign: "center", maxWidth: "30rem" }}>
          Fair house games. Transparent treasury.{" "}
          <em>Every free dollar has one job</em> — open-market{" "}
          <strong>$CATE</strong> for the vault.
        </p>

        <div className="btn-row" style={{ marginTop: "2rem" }}>
          <Link className="btn btn--gold" href="/play">
            Enter the floor
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
        <p className="cta-note">
          on{" "}
          <a href={cate.buy.pumpfun} target="_blank" rel="noreferrer">
            pump.fun
          </a>{" "}
          · also on{" "}
          <a href={cate.buy.fomo} target="_blank" rel="noreferrer">
            fomo
          </a>{" "}
          &amp;{" "}
          <a href={cate.buy.moonshot} target="_blank" rel="noreferrer">
            moonshot
          </a>
        </p>
      </section>

      {/* Thesis pull-quote — product north star */}
      <section className="life center" id="thesis" aria-label="Why Catesino">
        <div className="shell">
          <blockquote className="thesis-banner">
            <p className="thesis-banner__kicker">Stop feeding random charts</p>
            <p className="thesis-banner__line">
              Instead of throwing your money at random tokens and watching it
              disappear — <em>spend it at Catesino</em>, where the house edge
              still buys <strong>$CATE</strong>.
            </p>
            <p className="thesis-banner__sub">
              You play. The floor plays. <span className="gold">$CATE always wins.</span>
            </p>
          </blockquote>
        </div>
      </section>

      {/* Life II — Omen */}
      <section className="life" id="l2">
        <div className="shell">
          <p className="life__tag">Life II · The omen</p>
          <p className="omen">
            First, <em>a dog</em> ran into the light. The world laughed, and the
            laughter <em>became a market</em>. Then the cat counted coins on the
            windowsill.{" "}
            <span className="dim">Now there is a table between them.</span>
          </p>
        </div>
      </section>

      {/* Life III — The coin */}
      <section className="life center" id="l3">
        <p className="life__tag">Life III · The coin</p>
        <MemeFrame
          src={MEMES.logo}
          alt="CateCoin emblem — tabby cat behind the letter C"
          badge="the coin"
          aspect="square"
          className="meme-stage--glow"
        />
        <p className="h-sub" style={{ marginTop: "0.75rem" }}>
          <span className="gold">C</span>ats{" "}
          <span className="gold">A</span>lways{" "}
          <span className="gold">T</span>ake{" "}
          <span className="gold">E</span>verything
        </p>
        <p className="h-meta">one coin · one cat · one table</p>
      </section>

      {/* Life V — Family / sister of Doge */}
      <section className="life center" id="l5">
        <p className="life__tag">Life V · The family</p>
        <MemeFrame
          src={MEMES.sister}
          alt="Kitten with $CATE tag sleeping beside a shiba with DOGE tag"
          badge="sister of doge"
          aspect="wide"
          className="meme-stage--glow"
        />
        <p className="omen" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Every legend is <em>somebody&apos;s little sister.</em>
        </p>
        <p className="credit-line">
          community art circulating with mint{" "}
          <a href={cate.solscan} target="_blank" rel="noreferrer">
            verified on Solscan
          </a>
        </p>
      </section>

      {/* Life IV — why play + cinematic */}
      <section className="life" id="l4">
        <div className="shell">
          <p className="life__tag">Life IV · Why this table</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}
          >
            PLAY IS THE PATH
          </h2>
          <p className="omen" style={{ marginTop: "1.25rem" }}>
            Speculation without a ritual is just noise. Catesino turns small
            stakes into a <em>shared daily buy</em> of $CATE — the same cat, the
            same mint, the same story as{" "}
            <a href={cate.brand} target="_blank" rel="noreferrer">
              cate.meme
            </a>
            .
          </p>

          <MemeFrame
            src={MEMES.believe}
            alt="Tabby cat on a golden peak above the clouds at sunrise"
            badge="believe"
            aspect="wide"
            className="meme-stage--glow"
          />

          <div className="laws">
            <article className="law">
              <h3>
                <span>01 · PLAY</span>
                Cate-branded floor
              </h3>
              <p>
                BlackCate, CateSlots, VideoCate, CatePoker, and more — stakes $
                {config.betLimits.minUsdc}–{config.betLimits.maxUsdc} USDC. Every
                title says Cate.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>02 · RITUAL</span>
                Daily $CATE buys
              </h3>
              <p>
                {(config.buyPolicy.buyRatio * 100).toFixed(0)}% of free treasury
                (after liability + reserve) aims at open-market Cate for the
                vault.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>03 · BRAND</span>
                Same ninth life
              </h3>
              <p>
                Void, gold, ember — the cate.meme night sky. Memes from the
                community. Flow always back to $CATE.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Meme wall */}
      <section className="life center" id="wall">
        <p className="life__tag">From the timeline</p>
        <h2
          className="h-title"
          style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)" }}
        >
          $CATE MEMES
        </h2>
        <div className="meme-grid">
          <MemeFrame
            src={MEMES.culture}
            alt="Billion-dollar Cate community meme art"
            badge="to billions"
            aspect="square"
          />
          <MemeFrame
            src={MEMES.sister}
            alt="$CATE and DOGE as siblings"
            badge="family"
            aspect="square"
          />
          <MemeFrame
            src={MEMES.believe}
            alt="Cate above the clouds"
            badge="omen"
            aspect="square"
          />
        </div>
        <p className="credit-line" style={{ marginTop: "1rem" }}>
          curated from X posts that cite the official mint · replace anytime in{" "}
          <code>/public/memes</code>
        </p>
      </section>

      {/* Life VI — laws */}
      <section className="life center" id="l6">
        <p className="life__tag">Life VI · The law</p>
        <p className="omen" style={{ textAlign: "center" }}>
          Four things are <em>carved</em>. Everything else is play.
        </p>
        <div className="btn-row" style={{ marginTop: "1.5rem" }}>
          <Link className="btn btn--line" href="/laws">
            Read the Laws
          </Link>
          <Link className="btn btn--gold" href="/play">
            Open the floor
          </Link>
        </div>
      </section>

      {/* Life VII — numbers */}
      <section className="life center" id="l7">
        <p className="life__tag">Life VII · The number</p>
        <div className="facts shell">
          <div>
            <b>6D · S17</b>
            <span>blackjack rules</span>
          </div>
          <div>
            <b>{(config.buyPolicy.buyRatio * 100).toFixed(0)}%</b>
            <span>free → $CATE</span>
          </div>
          <div>
            <b>USDC</b>
            <span>stakes only</span>
          </div>
          <div>
            <b>HOLD</b>
            <span>community vault</span>
          </div>
        </div>
      </section>

      {/* Life VIII — ritual */}
      <section className="life" id="l8">
        <div className="shell">
          <p className="life__tag">Life VIII · The ritual</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            THREE STEPS
          </h2>
          <div className="laws" style={{ marginTop: "1.75rem" }}>
            <article className="law">
              <h3>
                <span>STEP 01</span>
                Feel the floor
              </h3>
              <p>
                Pick any Cate game with demo credits. No wallet required to learn
                the loop.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>STEP 02</span>
                Place small stakes
              </h3>
              <p>
                USDC chips. Hit, stand, double. House edge funds the ritual — not
                a black box.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>STEP 03</span>
                Buy / hold $CATE
              </h3>
              <p>
                Get Cate on pump.fun, FOMO, or Moonshot. When live, free treasury
                buys join you on-chain.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Life IX */}
      <section className="life center" id="l9">
        <p className="life__tag">Life IX · Yours</p>
        <div className="logo-coin" style={{ width: "min(160px, 40vw)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEMES.logo} alt="" />
        </div>
        <p className="omen" style={{ textAlign: "center", maxWidth: "26rem" }}>
          Eight lives were story.
          <br />
          <em>This table is the ninth — and it buys Cate.</em>
        </p>

        <div className="ca-box">
          <div className="ca-label">Token contract · Solana</div>
          <div className="ca-code">{cate.mint}</div>
          <p className="cta-note" style={{ marginTop: "0.75rem" }}>
            check on-chain →{" "}
            <a href={cate.solscan} target="_blank" rel="noreferrer">
              Solscan ↗
            </a>
          </p>
        </div>

        <div className="btn-row" style={{ marginTop: "1.75rem" }}>
          <a
            className="btn btn--ember"
            href={cate.buy.pumpfun}
            target="_blank"
            rel="noreferrer"
          >
            Buy on pump.fun
          </a>
          <a
            className="btn btn--line"
            href={cate.buy.fomo}
            target="_blank"
            rel="noreferrer"
          >
            Buy on FOMO
          </a>
          <a
            className="btn btn--line"
            href={cate.buy.moonshot}
            target="_blank"
            rel="noreferrer"
          >
            Buy on Moonshot
          </a>
        </div>

        <div className="links">
          <a href={cate.social.x} target="_blank" rel="noreferrer">
            X / Twitter
          </a>
          <a href={cate.social.telegram} target="_blank" rel="noreferrer">
            Telegram
          </a>
          <a href={cate.dexscreener} target="_blank" rel="noreferrer">
            DexScreener
          </a>
          <a href={cate.brand} target="_blank" rel="noreferrer">
            cate.meme
          </a>
        </div>
      </section>

      <div className="shell" style={{ paddingBottom: "3rem" }}>
        <CateDrive />
      </div>
    </main>
  );
}

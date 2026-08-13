import Link from "next/link";
import { getServerConfig } from "@/lib/server-config";
import { getCateLinks } from "@/lib/cate-links";
import { CateDrive } from "@/components/CateDrive";
import { MemeFrame } from "@/components/MemeFrame";
import { DESK_GAMES } from "@/lib/desk-games";

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
      <section className="life center" id="top">
        <p className="life__tag">desk · machine · not a casino</p>
        <h1 className="h-title">
          CATE<span className="it">SINO</span>
        </h1>
        <div className="h-rule">
          <span>hold the cat. play the desk.</span>
        </div>
        <p className="h-sub">
          the culture sister of <span className="gold">$CATE</span>
        </p>
        <p className="h-meta">$CATE · SOLANA · DESK · MACHINE · NINTH LIFE</p>

        <div className="logo-coin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEMES.logo} alt="CateCoin gold C logo with tabby cat" />
        </div>
        <p className="credit-line">community $CATE mark · Solana</p>

        <p className="say" style={{ textAlign: "center", maxWidth: "34rem" }}>
          Four arcade games about one chart. A Machine that pays cosmetics and
          later mints. Score is points, not cash. Rare and Ultra need a
          30-day <strong>$CATE</strong> hold. We don&apos;t run a house book.
        </p>

        <div className="btn-row" style={{ marginTop: "2rem" }}>
          <Link className="btn btn--gold" href="/play">
            Open the desk
          </Link>
          {config.flags.gachaEnabled ? (
            <Link className="btn btn--line" href="/machine">
              The Machine
            </Link>
          ) : null}
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

      <section className="life center" id="thesis" aria-label="Why Catesino">
        <div className="shell">
          <blockquote className="thesis-banner">
            <p className="thesis-banner__kicker">
              Don&apos;t ape a chart you have no thesis on
            </p>
            <p className="thesis-banner__line">
              If you believe the cat, hold it. If you don&apos;t, play the
              desk or yank yarn — <em>one mint, one culture</em>.{" "}
              <strong>$CATE</strong>.
            </p>
            <p className="thesis-banner__sub">
              Desk games. Machine. Ninth Life.{" "}
              <span className="gold">Still the cat.</span>
            </p>
          </blockquote>
        </div>
      </section>

      <section className="life" id="why">
        <div className="shell">
          <p className="life__tag">what this is</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}
          >
            TWO ROOMS. ONE CAT.
          </h2>
          <p className="say" style={{ marginTop: "1.25rem" }}>
            The desk is arcade tape about live $CATE. The Machine is yarn,
            bagwork, and later mints. No blackjack. No slots. No USDC book.
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
                <span>01 · DESK</span>
                Hold, ride, seal, flip
              </h3>
              <p>
                Survive FUD wicks. Paper-trade twenty seconds of live $CATE.
                Seal Cate&apos;s day. Call a fake 50/50 candle. Score, not
                cash.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>02 · MACHINE</span>
                Yarn in, culture out
              </h3>
              <p>
                Daily yarn is bagwork on X. Commons are cosmetics. We
                don&apos;t cash frames.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>03 · NINTH LIFE</span>
                Hold to mint
              </h3>
              <p>
                Rare and Ultra need 30 days of $CATE. Ultra mints Gold. Cut
                to Diamond after 90 days and 15 bagwork posts. Won 1/1s get
                crossed out.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="life" id="desk">
        <div className="shell">
          <p className="life__tag">the desk</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            FOUR GAMES. ONE TAPE.
          </h2>
          <p className="say" style={{ marginTop: "0.75rem" }}>
            All four read $CATE. None of them are a broker.
          </p>
          <div className="game-grid" style={{ marginTop: "1.75rem" }}>
            {DESK_GAMES.map((g) => (
              <article key={g.id} className={`game-card game-card--${g.id}`}>
                <div className="game-card__art" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.art} alt="" />
                </div>
                <h2 className="game-card__name">{g.name}</h2>
                <p className="game-card__tag">{g.tagline}</p>
                <p className="game-card__blurb">{g.blurb}</p>
                <Link className="btn btn--gold btn--sm" href={g.href}>
                  Open {g.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {config.flags.gachaEnabled ? (
        <section className="life center" id="machine">
          <div className="shell">
            <section className="machine-teaser">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="machine-teaser__art"
                src="/machine/hero.jpg"
                alt=""
              />
              <p className="life__tag" style={{ justifyContent: "center" }}>
                yarn in · gold to diamond
              </p>
              <h2>THE CATE MACHINE</h2>
              <p>
                Yank yarn for cosmetics. Hold $CATE thirty days before Rare
                or Ultra. Gold sits next to Diamond. A won 1/1 is crossed
                out.
              </p>
              <div className="btn-row">
                <Link className="btn btn--gold btn--sm" href="/machine">
                  Yank the yarn
                </Link>
                <Link className="btn btn--line btn--sm" href="/machine#diamond-mints">
                  See the mints
                </Link>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      <section className="life center" id="coin">
        <p className="life__tag">the coin</p>
        <MemeFrame
          src={MEMES.logo}
          alt="CateCoin emblem — tabby cat behind the letter C"
          badge="$CATE"
          aspect="square"
          className="meme-stage--glow"
        />
        <p className="h-sub" style={{ marginTop: "0.75rem" }}>
          <span className="gold">C</span>ats{" "}
          <span className="gold">A</span>lways{" "}
          <span className="gold">T</span>ake{" "}
          <span className="gold">E</span>verything
        </p>
        <p className="h-meta">one coin · one cat · that&apos;s the bit</p>
      </section>

      <section className="life center" id="family">
        <p className="life__tag">family business</p>
        <MemeFrame
          src={MEMES.sister}
          alt="Kitten with $CATE tag sleeping beside a shiba with DOGE tag"
          badge="sister of doge"
          aspect="wide"
          className="meme-stage--glow"
        />
        <p className="say" style={{ textAlign: "center", marginTop: "1.5rem" }}>
          Sister of doge. Sibling of{" "}
          <a href={cate.brand} target="_blank" rel="noreferrer">
            cate.meme
          </a>
          .
        </p>
        <p className="credit-line">
          community art circulating with mint{" "}
          <a href={cate.solscan} target="_blank" rel="noreferrer">
            verified on Solscan
          </a>
        </p>
      </section>

      <section className="life center" id="wall">
        <p className="life__tag">from the timeline</p>
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
            badge="believe"
            aspect="square"
          />
        </div>
        <p className="credit-line" style={{ marginTop: "1rem" }}>
          pulled from X posts that cite the official mint
        </p>
      </section>

      <section className="life" id="how">
        <div className="shell">
          <p className="life__tag">how it works</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            FOUR MOVES
          </h2>
          <div className="laws" style={{ marginTop: "1.75rem" }}>
            <article className="law">
              <h3>
                <span>01</span>
                Open the desk
              </h3>
              <p>
                Hold wicks, ride twenty seconds, seal the day, or flip a
                published 50/50. No wallet lecture.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>02</span>
                Bagwork for yarn
              </h3>
              <p>
                Post $CATE on X. That unlocks daily yarn and starts the mint
                hold clock.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>03</span>
                Yank the Machine
              </h3>
              <p>
                Cosmetics now. Rare and Ultra mints after 30 days holding.
                Gold cuts to Diamond with time and posts.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>04</span>
                Buy $CATE if you like the cat
              </h3>
              <p>
                Conviction lives on pump.fun, FOMO, or Moonshot. The vault
                still holds. We don&apos;t dump on you.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="life center" id="numbers">
        <p className="life__tag">the numbers (boring on purpose)</p>
        <div className="facts shell">
          <div>
            <b>4</b>
            <span>desk games</span>
          </div>
          <div>
            <b>30d</b>
            <span>hold to mint</span>
          </div>
          <div>
            <b>90d</b>
            <span>gold → diamond</span>
          </div>
          <div>
            <b>BAG</b>
            <span>daily yarn</span>
          </div>
        </div>
      </section>

      <section className="life center" id="close">
        <p className="life__tag">go on then</p>
        <div className="logo-coin" style={{ width: "min(160px, 40vw)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEMES.logo} alt="" />
        </div>
        <p className="say" style={{ textAlign: "center", maxWidth: "28rem" }}>
          Don&apos;t have a thesis? Don&apos;t trade.
          <br />
          <strong>Hold the cat. Open the desk. $CATE still wins.</strong>
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
          <Link className="btn btn--gold" href="/play">
            Open the desk
          </Link>
          {config.flags.gachaEnabled ? (
            <Link className="btn btn--line" href="/machine">
              Machine
            </Link>
          ) : null}
          <a
            className="btn btn--ember"
            href={cate.buy.pumpfun}
            target="_blank"
            rel="noreferrer"
          >
            Buy on pump.fun
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

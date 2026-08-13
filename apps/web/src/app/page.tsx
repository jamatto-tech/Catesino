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
      <section className="life center" id="top">
        <p className="life__tag">not another chart</p>
        <h1 className="h-title">
          CATE<span className="it">SINO</span>
        </h1>
        <div className="h-rule">
          <span>stop aping. start playing.</span>
        </div>
        <p className="h-sub">
          the play sister of <span className="gold">$CATE</span>
        </p>
        <p className="h-meta">$CATE · SOLANA · PLAY · HOUSE BUYS THE CAT</p>

        <div className="logo-coin">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MEMES.logo} alt="CateCoin gold C logo with tabby cat" />
        </div>
        <p className="credit-line">community $CATE mark · Solana</p>

        <p className="say" style={{ textAlign: "center", maxWidth: "32rem" }}>
          You were gonna lose it on a candle you don&apos;t even believe in.
          Spend it here instead. House edge still buys <strong>$CATE</strong>.
        </p>

        <div className="btn-row" style={{ marginTop: "2rem" }}>
          <Link className="btn btn--gold" href="/play">
            Come play
          </Link>
          {config.flags.gachaEnabled ? (
            <Link className="btn btn--line" href="/machine">
              Yank yarn
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
            <p className="thesis-banner__kicker">Don&apos;t trade what you don&apos;t believe</p>
            <p className="thesis-banner__line">
              Instead of throwing money at random tokens and watching it
              disappear — <em>hold, call, and pull at Catesino</em>. One chart.
              One cat. <strong>$CATE</strong>.
            </p>
            <p className="thesis-banner__sub">
              Desk. Machine. Bagwork.{" "}
              <span className="gold">$CATE still wins.</span>
            </p>
          </blockquote>
        </div>
      </section>

      <section className="life" id="why">
        <div className="shell">
          <p className="life__tag">the bit</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}
          >
            NOT A CONVICTION TRADE
          </h2>
          <p className="say" style={{ marginTop: "1.25rem" }}>
            No thesis on a 15m chart. No “just 0.5 SOL bro.” This is the desk
            and the machine — conviction games and Cate cosmetics, not a
            casino book.
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
                Hold, call, flip
              </h3>
              <p>
                Hold the Line, the Cate Desk, Call the Vault, Tape Flip. One
                chart. Conviction points — not a casino book.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>02 · MACHINE</span>
                Yarn in, culture out
              </h3>
              <p>
                Cosmetics now, sample mints later. Daily yarn is bagwork on X.
                We don&apos;t cash any of it.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>03 · HOLD</span>
                Vault doesn&apos;t dump on you
              </h3>
              <p>
                Bought Cate sits in the community vault. Same mint as{" "}
                <a href={cate.brand} target="_blank" rel="noreferrer">
                  cate.meme
                </a>
                . We don&apos;t sell it back at you.
              </p>
            </article>
          </div>
        </div>
      </section>

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
          Sister of doge. That&apos;s the bit.
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
          pulled from X posts that cite the official mint · swap anytime in{" "}
          <code>/public/memes</code>
        </p>
      </section>

      <section className="life" id="how">
        <div className="shell">
          <p className="life__tag">how it works</p>
          <h2
            className="h-title"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            THREE MOVES
          </h2>
          <div className="laws" style={{ marginTop: "1.75rem" }}>
            <article className="law">
              <h3>
                <span>01</span>
                Click a game
              </h3>
              <p>
                Open the desk. Hold or call. No wallet lecture.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>02</span>
                Bagwork + yarn
              </h3>
              <p>
                Post $CATE on X for daily yarn. Yank the Machine. Cosmetics,
                not chips.
              </p>
            </article>
            <article className="law">
              <h3>
                <span>03</span>
                Buy $CATE if you like the cat
              </h3>
              <p>
                Conviction goes on pump.fun, FOMO, or Moonshot. When live, free
                treasury buys join you on-chain.
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
            <b>0.90%</b>
            <span>rare machine</span>
          </div>
          <div>
            <b>BAG</b>
            <span>daily yarn</span>
          </div>
          <div>
            <b>HOLD</b>
            <span>community vault</span>
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
          Don&apos;t have conviction? Don&apos;t trade.
          <br />
          <strong>Come play. $CATE still wins.</strong>
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
            Come play
          </Link>
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

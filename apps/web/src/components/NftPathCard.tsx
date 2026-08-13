"use client";

import type { PublicGachaState } from "@/lib/gacha-public";

export function NftPathCard({ nft }: { nft: PublicGachaState["nft"] | undefined }) {
  const holdDays = nft?.holdDays ?? 0;
  const posts = nft?.bagworkCount ?? 0;
  const claimNeed = nft?.claimNeedDays ?? 30;
  const diaNeed = nft?.diamondNeedDays ?? 90;
  const postNeed = nft?.diamondNeedPosts ?? 15;

  return (
    <section className="nft-path">
      <p className="life__tag">ninth life · hold to mint</p>
      <h2>RARE &amp; ULTRA RULES</h2>
      <p>
        Commons stay cosmetics. Rare and Ultra mints need a{" "}
        <strong>30-day $CATE hold</strong>. Ultra starts <strong>Gold</strong>.
        Hold 90 days and bagwork 15 posts to cut it to <strong>Diamond</strong>.
      </p>
      <p className="nft-path__note">
        Demo clock starts on your first bagwork. Live mints will check a
        connected wallet&apos;s $CATE, not this cookie.
      </p>
      <div className="nft-path__meters">
        <Meter
          label="Hold"
          value={`${holdDays} / ${claimNeed}d`}
          pct={holdDays / claimNeed}
          ok={Boolean(nft?.canClaim)}
        />
        <Meter
          label="Diamond hold"
          value={`${holdDays} / ${diaNeed}d`}
          pct={holdDays / diaNeed}
          ok={holdDays >= diaNeed}
        />
        <Meter
          label="Bagwork"
          value={`${posts} / ${postNeed}`}
          pct={posts / postNeed}
          ok={posts >= postNeed}
        />
      </div>
      <ul className="nft-path__gates">
        <li data-ok={nft?.canClaim ? "1" : "0"}>
          Rare + Ultra Gold {nft?.canClaim ? "unlocked" : "locked"}
        </li>
        <li data-ok={nft?.canCutDiamond ? "1" : "0"}>
          Diamond cut {nft?.canCutDiamond ? "ready" : "locked"}
        </li>
      </ul>
    </section>
  );
}

function Meter({
  label,
  value,
  pct,
  ok,
}: {
  label: string;
  value: string;
  pct: number;
  ok: boolean;
}) {
  return (
    <div className={`nft-meter${ok ? " is-ok" : ""}`}>
      <div className="pity__label">
        {label}
        <b>{value}</b>
      </div>
      <div className="pity__track" aria-hidden>
        <div
          className="pity__fill"
          style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }}
        />
      </div>
    </div>
  );
}

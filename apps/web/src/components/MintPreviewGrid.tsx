"use client";

import { useState } from "react";
import type { NftMark } from "@catesino/gacha";
import { NINTH_LIFE_PREVIEWS, ultraDiamondSrc } from "@/lib/gacha-mints";
import type { PublicGachaState } from "@/lib/gacha-public";

export function MintPreviewGrid({
  nft,
  onChange,
}: {
  nft?: PublicGachaState["nft"];
  onChange?: (next: PublicGachaState) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const marks = new Map((nft?.marks ?? []).map((m) => [m.itemId, m]));
  const yours = new Set(nft?.yours ?? marks.keys());
  const taken = new Set(nft?.taken ?? []);

  const act = async (action: "mark" | "upgrade", itemId: string) => {
    if (busy || !onChange) return;
    setBusy(itemId);
    setError(null);
    try {
      const res = await fetch("/api/demo/gacha/nft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, itemId }),
      });
      const data = (await res.json()) as PublicGachaState & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "could not update that mint");
        return;
      }
      onChange(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mints" id="diamond-mints">
      <header className="drops__head">
        <p className="life__tag">ninth life · gold beside diamond</p>
        <h2>GOLD &amp; DIAMOND</h2>
        <p>
          Left is Gold — the mint. Right is Diamond — the upgrade cut. A won
          1/1 is darkened and crossed out. Diamond is the rare sparkle after
          90 days and 15 bagwork posts.
        </p>
      </header>
      {error ? (
        <div className="alert" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      ) : null}
      <ul className="mint-grid">
        {NINTH_LIFE_PREVIEWS.map((piece) => (
          <MintCard
            key={piece.id}
            piece={piece}
            mark={marks.get(piece.id)}
            claimed={
              yours.has(piece.id)
                ? "yours"
                : taken.has(piece.id)
                  ? "taken"
                  : undefined
            }
            canClaim={Boolean(nft?.canClaim)}
            canCut={Boolean(nft?.canCutDiamond)}
            busy={busy === piece.id}
            interactive={Boolean(onChange) && piece.rarity === "ultra"}
            onMark={() => void act("mark", piece.id)}
            onUpgrade={() => void act("upgrade", piece.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function MintCard({
  piece,
  mark,
  claimed,
  canClaim,
  canCut,
  busy,
  interactive,
  onMark,
  onUpgrade,
}: {
  piece: (typeof NINTH_LIFE_PREVIEWS)[number];
  mark?: NftMark;
  claimed?: "yours" | "taken";
  canClaim: boolean;
  canCut: boolean;
  busy: boolean;
  interactive: boolean;
  onMark: () => void;
  onUpgrade: () => void;
}) {
  const diamond = piece.diamondSrc ?? ultraDiamondSrc(piece.id);
  const won = Boolean(claimed);

  return (
    <li
      className={`mint-card${diamond ? " mint-card--pair" : ""}${won ? " mint-card--won" : ""}`}
      data-rarity={piece.rarity}
      data-tier={mark?.tier ?? (diamond ? "pair" : "gold")}
      data-claimed={claimed ?? ""}
    >
      <div className="mint-pair">
        <figure data-tier="gold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={piece.src} alt={`${piece.name} gold`} />
          <figcaption>Gold</figcaption>
        </figure>
        {diamond ? (
          <figure data-tier="diamond">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={diamond} alt={`${piece.name} diamond`} />
            <figcaption>Diamond</figcaption>
          </figure>
        ) : null}
      </div>
      <div className="mint-card__meta">
        <span className="mint-card__rarity">
          {piece.rarity} · {piece.supply}
          {mark?.tier ? ` · ${mark.tier}` : ""}
        </span>
        <strong>{piece.name}</strong>
        <p>{piece.copy}</p>
        {won ? (
          <p className="mint-card__won">
            {claimed === "yours" ? "you won this 1/1" : "already won"}
          </p>
        ) : null}
        {interactive && claimed !== "taken" ? (
          <div className="mint-card__act">
            {!mark ? (
              <button
                type="button"
                className="btn btn--line btn--sm"
                disabled={busy || !canClaim}
                onClick={onMark}
              >
                {canClaim ? "Mark Gold" : "Hold 30 days"}
              </button>
            ) : mark.tier === "gold" ? (
              <button
                type="button"
                className="btn btn--gold btn--sm"
                disabled={busy || !canCut}
                onClick={onUpgrade}
              >
                {canCut ? "Cut Diamond" : "Need 90d + 15 posts"}
              </button>
            ) : (
              <em>diamond</em>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

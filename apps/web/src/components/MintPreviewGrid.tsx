import { NINTH_LIFE_PREVIEWS } from "@/lib/gacha-mints";

export function MintPreviewGrid() {
  return (
    <section className="mints">
      <header className="drops__head">
        <p className="life__tag">ninth life · not live</p>
        <h2>POSSIBLE MINTS</h2>
        <p>
          Concept art for a later Cate collection. None of these mint today.
          The Machine still only drops off-chain cosmetics. We would never buy
          these back.
        </p>
      </header>
      <ul className="mint-grid">
        {NINTH_LIFE_PREVIEWS.map((piece) => (
          <li key={piece.id} className="mint-card" data-rarity={piece.rarity}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={piece.src} alt={piece.name} />
            <div className="mint-card__meta">
              <span className="mint-card__rarity">
                {piece.rarity} · {piece.supply}
              </span>
              <strong>{piece.name}</strong>
              <p>{piece.copy}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

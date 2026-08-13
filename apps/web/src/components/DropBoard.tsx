"use client";

import Link from "next/link";
import type { PublicDropLane, PublicItem } from "@/lib/gacha-public";
import { dropKindLabel } from "@/lib/gacha-public";

type Props = {
  lanes: PublicDropLane[];
  ownedIds?: string[];
  lastItemId?: string;
};

export function DropBoard({ lanes, ownedIds = [], lastItemId }: Props) {
  const owned = new Set(ownedIds);

  return (
    <section className="drops">
      <header className="drops__head">
        <p className="life__tag">what can drop</p>
        <h2>IN THE MACHINE</h2>
        <p>
          Yarn in, one of these out. Same table as{" "}
          <Link href="/machine/odds">the odds</Link>. Off-chain. We don&apos;t
          cash any of it.
        </p>
      </header>

      {lanes.map((lane) => (
        <div className="drop-lane" key={lane.rarity} data-rarity={lane.rarity}>
          <div className="drop-lane__meta">
            <h3>{lane.rarity}</h3>
            <b>{lane.percent}</b>
            {lane.note ? <p>{lane.note}</p> : null}
            {lane.items.length === 0 ? (
              <p>Nothing in this bucket yet — it falls to rare.</p>
            ) : null}
          </div>
          {lane.items.length > 0 ? (
            <ul className="drop-grid">
              {lane.items.map((item) => (
                <DropCard
                  key={item.itemId}
                  item={item}
                  owned={owned.has(item.itemId)}
                  latest={item.itemId === lastItemId}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}

function DropCard({
  item,
  owned,
  latest,
}: {
  item: PublicItem;
  owned: boolean;
  latest: boolean;
}) {
  return (
    <li
      className={`drop-card${owned ? " drop-card--owned" : ""}${latest ? " drop-card--latest" : ""}${item.sample || item.imageSrc ? " drop-card--art" : ""}`}
    >
      <span className="drop-card__emoji" aria-hidden>
        {item.imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageSrc} alt="" />
        ) : (
          item.emoji
        )}
      </span>
      <span className="drop-card__name">{item.name}</span>
      <span className="drop-card__kind">{dropKindLabel(item)}</span>
      {item.sample ? (
        <em>sample · not live</em>
      ) : latest ? (
        <em>just pulled</em>
      ) : owned ? (
        <em>owned</em>
      ) : null}
    </li>
  );
}

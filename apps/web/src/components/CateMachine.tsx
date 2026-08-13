"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PullReceipt } from "@catesino/gacha";
import type {
  PublicDropLane,
  PublicGachaState,
  PublicItem,
} from "@/lib/gacha-public";
import { dropKindLabel } from "@/lib/gacha-public";
import { BagworkCard } from "@/components/BagworkCard";
import { DropBoard } from "@/components/DropBoard";
import { MintPreviewGrid } from "@/components/MintPreviewGrid";
import { NftPathCard } from "@/components/NftPathCard";

type PullResponse = PublicGachaState & { receipt?: PullReceipt };

export function CateMachine({
  initialDrops = [],
}: {
  initialDrops?: PublicDropLane[];
}) {
  const [state, setState] = useState<PublicGachaState | null>(null);
  const [receipt, setReceipt] = useState<PullReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [yank, setYank] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/demo/gacha/state");
    const data = (await res.json()) as PublicGachaState & { error?: string };
    if (!res.ok) {
      setError(data.error ?? "could not load the machine");
      return;
    }
    setState(data);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pull = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setYank(true);
    try {
      const res = await fetch("/api/demo/gacha/pull", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as PullResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "pull failed");
        return;
      }
      setState(data);
      setReceipt(data.receipt ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      window.setTimeout(() => setYank(false), 560);
    }
  };

  const equippedTitle = findOwned(state, state?.equipped.title);
  const equippedFrame = findOwned(state, state?.equipped.frame);
  const last = receipt ?? state?.lastReceipt ?? null;
  const lastItem = last ? findDrop(state, last.itemId) : null;

  return (
    <>
    <div className="machine">
      <div
        className={`machine__stage${yank ? " machine__stage--yank" : ""} ${equippedFrame?.cssClass ?? ""}`}
        data-rarity={last?.rarity ?? "idle"}
      >
        <figure className="machine__hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/machine/hero.jpg"
            alt="Cate yanking the gold lever on a gacha machine"
          />
        </figure>
      </div>

      {equippedTitle ? (
        <p className="machine__title">
          <span>equipped</span>
          {equippedTitle.name}
        </p>
      ) : null}

      <div className="machine__stats">
        <div className="pill pill--yarn">
          <span className="pill__label">Yarn</span>
          <span className="pill__value">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/machine/yarn.jpg" alt="" />
            {state ? state.yarn : "—"}
            <em> / {state?.yarnCap ?? 20}</em>
          </span>
        </div>
        <div className="pity">
          <div className="pity__label">
            pulls since a rare frame
            <b>
              {state?.pity.pullsSinceRarePlus ?? 0}
              <span> / {state?.pity.pityRareHard ?? 80}</span>
            </b>
          </div>
          <div className="pity__track" aria-hidden>
            <div
              className="pity__fill"
              style={{
                width: `${pityPct(state)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <BagworkCard
        unlockedToday={state?.bagwork.unlockedToday ?? false}
        onUnlocked={(next) => {
          setState(next);
          setError(null);
        }}
      />

      <div className="btn-row" style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          className="btn btn--gold"
          disabled={busy || !state || state.yarn < 1}
          onClick={() => void pull()}
        >
          {busy ? "Yanking…" : "Yank the yarn"}
        </button>
        <Link className="btn btn--line" href="/machine/odds">
          See the odds
        </Link>
      </div>
      <p className="cta-note">Not a slot. Yarn in, culture out.</p>

      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}

      {last ? (
        <article className="receipt" data-rarity={last.rarity}>
          <p className="receipt__kicker">
            you pulled · {last.pityApplied ? "pity · " : ""}
            {last.rarity}
            {lastItem ? ` · ${dropKindLabel(lastItem)}` : ""}
          </p>
          <h2>
            <span aria-hidden>{lastItem?.emoji ?? "🧶"}</span>
            {lastItem?.name ?? last.itemId}
          </h2>
          <p className="receipt__copy">
            {last.convertedToYarn
              ? "Stack was full — converted to +1 yarn."
              : lastItem?.copy ?? "Off-chain. We don’t cash this."}
          </p>
          <details className="receipt__verify">
            <summary>verify this pull</summary>
            <dl>
              <div>
                <dt>nonce</dt>
                <dd>{last.nonce}</dd>
              </div>
              <div>
                <dt>bucket</dt>
                <dd>{last.rawBucket}</dd>
              </div>
              <div>
                <dt>commit</dt>
                <dd>{short(last.serverSeedCommit)}</dd>
              </div>
              {"serverSeed" in last && last.serverSeed ? (
                <div>
                  <dt>seed</dt>
                  <dd>{short(String(last.serverSeed))}</dd>
                </div>
              ) : null}
              <div>
                <dt>in-supply</dt>
                <dd>{short(last.inSupplyHash)}</dd>
              </div>
            </dl>
            <p>
              Replay HMAC(clientSeed, nonce, rarity/item) against the published
              table. Odds page has the algorithm.
            </p>
          </details>
        </article>
      ) : (
        <p className="machine__hint">The cat is waiting. Yarn is free drip.</p>
      )}

    </div>
      <NftPathCard nft={state?.nft} />
      <MintPreviewGrid
        nft={state?.nft}
        onChange={(next) => {
          setState(next);
          setError(null);
        }}
      />
      <DropBoard
        lanes={state?.drops ?? initialDrops}
        ownedIds={state?.inventory.map((item) => item.itemId) ?? []}
        lastItemId={last?.itemId}
      />
    </>
  );
}

function findOwned(
  state: PublicGachaState | null,
  itemId: string | undefined,
): PublicItem | undefined {
  if (!state || !itemId) return undefined;
  return state.inventory.find((item) => item.itemId === itemId);
}

function findDrop(
  state: PublicGachaState | null,
  itemId: string | undefined,
): PublicItem | undefined {
  if (!state || !itemId) return undefined;
  for (const lane of state.drops) {
    const hit = lane.items.find((item) => item.itemId === itemId);
    if (hit) return hit;
  }
  return findOwned(state, itemId);
}

function pityPct(state: PublicGachaState | null): number {
  if (!state || state.pity.pityRareHard <= 0) return 0;
  return Math.min(
    100,
    (state.pity.pullsSinceRarePlus / state.pity.pityRareHard) * 100,
  );
}

function short(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

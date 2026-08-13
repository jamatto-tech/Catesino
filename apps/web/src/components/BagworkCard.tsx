"use client";

import { useState } from "react";
import type { PublicGachaState } from "@/lib/gacha-public";
import { bagworkIntentUrl } from "@/lib/gacha-bagwork";

type Props = {
  unlockedToday: boolean;
  onUnlocked: (state: PublicGachaState) => void;
};

export function BagworkCard({ unlockedToday, onUnlocked }: Props) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/gacha/bagwork", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as PublicGachaState & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "could not verify that post");
        return;
      }
      setUrl("");
      onUnlocked(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bagwork">
      <p className="life__tag">bagwork · daily yarn</p>
      {unlockedToday ? (
        <p className="bagwork__ok">Today&apos;s yarn is unlocked. Go pull.</p>
      ) : (
        <>
          <p>
            After the starter yarn, daily refills come from working the bag.
            Post about <strong>$CATE</strong> on X, then paste the link.
          </p>
          <div className="bagwork__row">
            <input
              type="url"
              value={url}
              placeholder="https://x.com/you/status/…"
              onChange={(e) => setUrl(e.target.value)}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn--gold btn--sm"
              disabled={busy || url.trim().length < 8}
              onClick={() => void submit()}
            >
              {busy ? "Checking…" : "Unlock today"}
            </button>
          </div>
          <p className="cta-note">
            <a href={bagworkIntentUrl()} target="_blank" rel="noreferrer">
              Post $CATE on X
            </a>
            {" · "}
            must be public and mention $CATE
          </p>
        </>
      )}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "0.75rem" }}>
          {error}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeskPublic = {
  conviction: number;
  hold: {
    survived: boolean;
    held: number;
    total: number;
    at: number;
  } | null;
  position: {
    side: "long" | "short";
    entryUsd: number;
    startedAt: number;
    endsAt: number;
    settled: boolean;
    won?: boolean;
  } | null;
  vault: {
    utcDate: string;
    pick: "skip" | "buy" | "big";
    actual?: "skip" | "buy" | "big";
    change24h?: number;
    settled: boolean;
    won?: boolean;
  } | null;
  tapeStreak: number;
  lastTape: {
    side: "long" | "short";
    result: "long" | "short";
    won: boolean;
  } | null;
};

export type CateTape = {
  usd: number;
  change24h: number;
  ts: number;
  pairUrl: string;
};

export type DeskActionResult = {
  desk?: DeskPublic;
  tape?: CateTape | null;
  error?: string;
  won?: boolean;
  yarn?: number;
  convictionDelta?: number;
  result?: "long" | "short";
  change24h?: number;
  exitUsd?: number;
  entryUsd?: number;
};

export function useDesk() {
  const [desk, setDesk] = useState<DeskPublic | null>(null);
  const [tape, setTape] = useState<CateTape | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const busyRef = useRef(false);

  const apply = useCallback((data: { desk?: DeskPublic; tape?: CateTape | null }) => {
    if (data.desk) setDesk(data.desk);
    if (data.tape !== undefined) setTape(data.tape);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/demo/desk/state");
    const data = (await res.json()) as {
      desk?: DeskPublic;
      tape?: CateTape | null;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "desk unavailable");
      return;
    }
    apply(data);
    setError(null);
  }, [apply]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 20_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const act = useCallback(
    async (
      action: string,
      extra: Record<string, string | number | boolean> = {},
    ): Promise<DeskActionResult | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setNote(null);
      try {
        const res = await fetch("/api/demo/desk/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, ...extra }),
        });
        const data = (await res.json()) as DeskActionResult;
        if (!res.ok) {
          setError(data.error ?? "action failed");
          return null;
        }
        apply(data);
        const bits = [];
        if (typeof data.convictionDelta === "number") {
          bits.push(`+${data.convictionDelta} score`);
        }
        if (data.yarn) bits.push(`+${data.yarn} yarn`);
        if (typeof data.won === "boolean") {
          bits.push(data.won ? "called it" : "not this time");
        }
        if (bits.length) setNote(bits.join(" · "));
        return data;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [apply],
  );

  return { desk, tape, error, busy, note, refresh, act };
}

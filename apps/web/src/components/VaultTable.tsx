"use client";

import { useState } from "react";
import { DeskHud } from "@/components/DeskHud";
import { useDesk } from "@/lib/use-desk";

const DOORS = [
  { pick: "skip" as const, label: "Skip", hint: "24h ≤ 0%", seal: "⊘" },
  { pick: "buy" as const, label: "Buy", hint: "24h up", seal: "✦" },
  { pick: "big" as const, label: "Big print", hint: "24h ≥ +5%", seal: "▲" },
];

const SEAL_MS = 1800;

export function VaultTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [sealing, setSealing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const today = desk?.vault ?? null;
  const locked = Boolean(today) || sealing || busy;

  const crack = async (pick: "skip" | "buy" | "big") => {
    if (locked) return;
    setPicked(pick);
    setSealing(true);
    const started = Date.now();
    const data = await act("vault.call", { pick });
    const wait = Math.max(0, SEAL_MS - (Date.now() - started));
    if (wait) await new Promise((r) => window.setTimeout(r, wait));
    setSealing(false);
    if (!data) setPicked(null);
  };

  const actual = today?.actual;
  const change =
    typeof today?.change24h === "number" ? today.change24h : null;
  const mood = sealing
    ? "seal"
    : today?.won
      ? "win"
      : today
        ? "lose"
        : "idle";

  return (
    <div className="machine">
      <DeskHud
        conviction={desk?.conviction ?? 0}
        tape={tape}
        hideChange={!today || sealing}
      />

      <div className={`vault-arena vault-arena--${mood}`}>
        <span className="hold-arena__kicker">
          {sealing
            ? "cracking the seal"
            : today
              ? today.won
                ? "the vault agreed"
                : "not this session"
              : "one call · utc day"}
        </span>
        {sealing ? (
          <>
            <strong>READING THE 24h TAPE</strong>
            <em>you sealed {picked ?? "—"}</em>
          </>
        ) : today ? (
          <>
            <strong>
              {fmtChange(change)} · {(actual ?? "—").toUpperCase()}
            </strong>
            <em>
              you called {today.pick}
              {today.won ? " · paid" : " · faded"}
            </em>
          </>
        ) : (
          <p>
            Seal skip, buy, or big print. We hide the 24h until the vault
            cracks. One call a day.
          </p>
        )}
      </div>

      <div className="vault-doors">
        {DOORS.map((door) => {
          const isPick = (today?.pick ?? picked) === door.pick;
          const isActual = actual === door.pick;
          return (
            <button
              key={door.pick}
              type="button"
              className={[
                "vault-door",
                isPick ? "vault-door--pick" : "",
                isActual && today ? "vault-door--actual" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={locked || !tape}
              onClick={() => void crack(door.pick)}
            >
              <span className="vault-door__seal" aria-hidden>
                {door.seal}
              </span>
              <strong>{door.label}</strong>
              <em>{door.hint}</em>
            </button>
          );
        })}
      </div>

      {note && !sealing ? <p className="machine__hint">{note}</p> : null}
      {error ? (
        <div className="alert" role="alert" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

function fmtChange(n: number | null): string {
  if (n === null) return "the day";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

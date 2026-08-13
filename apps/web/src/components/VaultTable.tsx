"use client";

import { useEffect, useRef, useState } from "react";
import { CateMascot } from "@/components/CateMascot";
import { DeskHud } from "@/components/DeskHud";
import { isVaultToday } from "@/lib/desk-logic";
import { useDesk } from "@/lib/use-desk";

const DOORS = [
  { pick: "skip" as const, label: "Skip", hint: "24h ≤ 0%", key: "1" },
  { pick: "buy" as const, label: "Buy", hint: "24h up", key: "2" },
  { pick: "big" as const, label: "Big print", hint: "24h ≥ +5%", key: "3" },
];

const SEAL_MS = 1800;
const CHARGE_MS = 520;

export function VaultTable() {
  const { desk, tape, error, busy, note, act } = useDesk();
  const [sealing, setSealing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [charge, setCharge] = useState(0);
  const lock = useRef(false);
  const charging = useRef<number | null>(null);
  const chargingPick = useRef<"skip" | "buy" | "big" | null>(null);

  const live = isVaultToday(desk?.vault) ? desk?.vault ?? null : null;
  const prior = desk?.vault && !live ? desk.vault : null;
  const locked = Boolean(live) || sealing || busy;

  const crack = async (pick: "skip" | "buy" | "big") => {
    if (locked || lock.current) return;
    lock.current = true;
    stopCharge();
    setPicked(pick);
    setSealing(true);
    const started = Date.now();
    const data = await act("vault.call", { pick });
    const wait = Math.max(0, SEAL_MS - (Date.now() - started));
    if (wait) await new Promise((r) => window.setTimeout(r, wait));
    setSealing(false);
    lock.current = false;
    if (!data) setPicked(null);
  };

  const stopCharge = () => {
    if (charging.current) window.clearInterval(charging.current);
    charging.current = null;
    chargingPick.current = null;
    setCharge(0);
  };

  const beginCharge = (pick: "skip" | "buy" | "big") => {
    if (locked || lock.current) return;
    stopCharge();
    chargingPick.current = pick;
    setPicked(pick);
    const born = Date.now();
    charging.current = window.setInterval(() => {
      const next = Math.min(1, (Date.now() - born) / CHARGE_MS);
      setCharge(next);
      if (next >= 1) {
        chargingPick.current = null;
        if (charging.current) window.clearInterval(charging.current);
        charging.current = null;
        setCharge(0);
        void crack(pick);
      }
    }, 32);
  };

  const releaseCharge = () => {
    const pick = chargingPick.current;
    const armed = charging.current !== null;
    stopCharge();
    if (armed && pick) void crack(pick);
  };

  useEffect(() => () => stopCharge(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked) return;
      const door = DOORS.find((d) => d.key === e.key);
      if (!door) return;
      e.preventDefault();
      void crack(door.pick);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // crack uses latest locked via closure on each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, tape]);

  const actual = live?.actual;
  const change = typeof live?.change24h === "number" ? live.change24h : null;
  const mood = sealing
    ? "seal"
    : live?.won
      ? "win"
      : live
        ? "lose"
        : "idle";

  return (
    <div className="machine desk-game">
      <DeskHud
        conviction={desk?.conviction ?? 0}
        tape={tape}
        vault={desk?.vault}
      />

      <div className={`desk-stage vault-arena vault-arena--${mood}`}>
        <CateMascot
          pose="seal"
          mood={sealing ? "seal" : live?.won ? "win" : live ? "lose" : "idle"}
        />
        <span className="hold-arena__kicker">
          {sealing
            ? "cracking the seal"
            : live
              ? live.won
                ? "the vault agreed"
                : "not this session"
              : "one call · utc day"}
        </span>
        {sealing ? (
          <>
            <strong>READING THE 24h TAPE</strong>
            <em>you sealed {picked ?? "—"}</em>
          </>
        ) : live ? (
          <>
            <strong>
              {fmtChange(change)} · {(actual ?? "—").toUpperCase()}
            </strong>
            <em>
              you called {live.pick}
              {live.won ? " · paid" : " · faded"}
            </em>
          </>
        ) : (
          <p>
            Hold a door to seal skip, buy, or big print. The 24h stays hidden
            until the vault cracks.
            {prior ? ` Last seal: ${prior.pick}.` : ""}
          </p>
        )}
      </div>

      <div className="vault-doors">
        {DOORS.map((door) => {
          const isPick = (live?.pick ?? picked) === door.pick;
          const isActual = Boolean(live) && actual === door.pick;
          const chargingThis = isPick && charge > 0 && !live;
          return (
            <button
              key={door.pick}
              type="button"
              className={[
                "vault-door",
                isPick ? "vault-door--pick" : "",
                isActual ? "vault-door--actual" : "",
                chargingThis ? "vault-door--charge" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={locked || !tape}
              style={
                chargingThis
                  ? { ["--charge" as string]: charge }
                  : undefined
              }
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                beginCharge(door.pick);
              }}
              onPointerUp={releaseCharge}
              onPointerLeave={stopCharge}
              onPointerCancel={stopCharge}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void crack(door.pick);
                }
              }}
            >
              <CateMascot pose="coin" />
              <strong>{door.label}</strong>
              <em>{door.hint}</em>
              <span className="vault-door__key">{door.key}</span>
            </button>
          );
        })}
      </div>
      {!live ? <p className="desk-keys">hold a door · or 1 / 2 / 3</p> : null}

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

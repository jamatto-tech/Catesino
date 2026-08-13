import Link from "next/link";
import type { ReactNode } from "react";

export function DeskShell({
  kicker,
  title,
  blurb,
  children,
}: {
  kicker: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  return (
    <main className="shell machine-page">
      <p style={{ textAlign: "center", marginTop: "1rem" }}>
        <Link href="/play" style={{ fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          ← The Desk
        </Link>
      </p>
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          {kicker}
        </p>
        <h1>{title}</h1>
        <p>{blurb}</p>
      </header>
      {children}
    </main>
  );
}

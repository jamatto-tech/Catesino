import Link from "next/link";
import type { ReactNode } from "react";
import { CateMascot } from "@/components/CateMascot";

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
      <p className="desk-back">
        <Link href="/play">← The Desk</Link>
      </p>
      <header className="page-hero desk-hero">
        <CateMascot pose="coin" className="desk-hero__coin" />
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

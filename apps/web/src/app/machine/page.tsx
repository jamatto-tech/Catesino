import type { Metadata } from "next";
import Link from "next/link";
import { CateMachine } from "@/components/CateMachine";
import { MintPreviewGrid } from "@/components/MintPreviewGrid";
import { publicDropBoard } from "@/lib/gacha-demo";
import { getServerConfig } from "@/lib/server-config";

export const metadata: Metadata = {
  title: "Cate Machine — yarn in, culture out",
  description:
    "Yank yarn. Get Cate frames and titles. Daily yarn is bagwork. Not a slot.",
};

export default function MachinePage() {
  const { config } = getServerConfig();

  if (!config.flags.gachaEnabled) {
    return (
      <main className="shell page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          yarn in · culture out
        </p>
        <h1>MACHINE ASLEEP</h1>
        <p>The Cate Machine is off. House games still work.</p>
        <p style={{ marginTop: "1.25rem" }}>
          <Link className="btn btn--gold" href="/play">
            See the games
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="shell machine-page">
      <header className="page-hero">
        <p className="life__tag" style={{ justifyContent: "center" }}>
          yarn in · culture out
        </p>
        <h1>THE CATE MACHINE</h1>
        <p>
          Yank the lever. Commons are cosmetics. Rare and ultra are scarce —
          samples below, not live mints. After starter yarn, daily refills
          take a public $CATE post on X.
        </p>
      </header>
      <CateMachine initialDrops={publicDropBoard(config)} />
      <MintPreviewGrid />
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCateLinks } from "@/lib/cate-links";

const links = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Games" },
  { href: "/machine", label: "Machine" },
  { href: "/play/rules", label: "How to" },
  { href: "/laws", label: "The deal" },
] as const;

/** Stable on server + client (no process.env). */
const cate = getCateLinks();

export function SiteHeader() {
  const pathname = usePathname();
  /** Avoid pathname SSR/client mismatch on active link attrs */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="top">
      <Link href="/" className="wordmark" aria-label="Catesino home">
        CATE<span className="it">SINO</span>
      </Link>

      <nav className="top__nav" aria-label="Primary">
        {links.map((l) => {
          const active =
            mounted &&
            (l.href === "/"
              ? pathname === "/"
              : pathname === l.href || pathname.startsWith(`${l.href}/`));
          return (
            <Link
              key={l.href}
              href={l.href}
              data-on={active ? "true" : "false"}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="top__actions">
        <Link className="btn btn--line btn--sm" href="/play">
          Play
        </Link>
        <a
          className="btn btn--gold btn--sm"
          href={cate.buy.pumpfun}
          target="_blank"
          rel="noreferrer"
        >
          Get $CATE
        </a>
      </div>
    </header>
  );
}

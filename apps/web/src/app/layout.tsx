import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import {
  Cinzel,
  Newsreader,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import "./globals.css";
import { TickerBar } from "@/components/TickerBar";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const word = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-word",
  display: "swap",
});

const disp = Newsreader({
  subsets: ["latin"],
  weight: ["200", "300", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-disp",
  display: "swap",
});

const ui = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ui",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Catesino — the $CATE desk and Machine",
  description:
    "Hold the cat. Play the desk. Yank yarn. Rare and Ultra mints need a 30-day $CATE hold. Not a casino book. Sibling of cate.meme.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${word.variable} ${disp.variable} ${ui.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        style={
          {
            "--word": "var(--font-word), Georgia, serif",
            "--disp": "var(--font-disp), Georgia, serif",
            "--ui": "var(--font-ui), system-ui, sans-serif",
            "--mono": "var(--font-mono), ui-monospace, monospace",
          } as CSSProperties
        }
      >
        <div className="app-root">
          <TickerBar />
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

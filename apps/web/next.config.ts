import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@catesino/config",
    "@catesino/chain",
    "@catesino/blackjack",
    "@catesino/house-games",
    "@catesino/game-protocol",
    "@catesino/ledger",
    "@catesino/gacha",
  ],
};

export default nextConfig;

/** Preview art for a future Ninth Life collection. Not minted. Not pullable. */
export type MintPreview = {
  id: string;
  name: string;
  rarity: "rare" | "ultra";
  supply: string;
  src: string;
  copy: string;
};

export const NINTH_LIFE_PREVIEWS: readonly MintPreview[] = [
  {
    id: "nft.ninth-life",
    name: "Ninth Life",
    rarity: "rare",
    supply: "limited",
    src: "/machine/nfts/ninth-life.jpg",
    copy: "The collection rare. Nine wisps. Not live.",
  },
  {
    id: "nft.the-mark",
    name: "The Mark",
    rarity: "ultra",
    supply: "1/1",
    src: "/machine/nfts/the-mark.jpg",
    copy: "Face in the gold C. 1/1 concept.",
  },
  {
    id: "nft.the-yank",
    name: "The Yank",
    rarity: "ultra",
    supply: "1/1",
    src: "/machine/nfts/the-yank.jpg",
    copy: "Cate on the lever. 1/1 concept.",
  },
  {
    id: "nft.yarn-oracle",
    name: "Yarn Oracle",
    rarity: "ultra",
    supply: "1/1",
    src: "/machine/nfts/yarn-oracle.jpg",
    copy: "The yarn is the pull. 1/1 concept.",
  },
  {
    id: "nft.believe",
    name: "Believe",
    rarity: "ultra",
    supply: "1/1",
    src: "/machine/nfts/believe.jpg",
    copy: "Peak above the clouds. 1/1 concept.",
  },
  {
    id: "nft.the-capsule",
    name: "The Capsule",
    rarity: "ultra",
    supply: "1/1",
    src: "/machine/nfts/the-capsule.jpg",
    copy: "Prize still in the shell. 1/1 concept.",
  },
] as const;

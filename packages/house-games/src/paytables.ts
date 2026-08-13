/**
 * Human-readable rules + pay numbers matching engine math.
 * creditMult = total USDC returned per 1 USDC staked (0 = lose stake).
 */

export const CATEFLIP_RULES = {
  name: "CateFlip",
  classic: "Coin flip",
  how: "Pick Cate face (heads) or tails. Fair 50/50 coin. Win pays even money.",
  /** Total credit mult on win (2 = stake back + 1× win). */
  winCreditMult: 2,
  houseNote: "True 50/50 even money (0% house edge) — rare in land casinos; kept simple on purpose.",
} as const;

export const CATEDICE_RULES = {
  name: "CateDice",
  classic: "Dice over/under",
  how: "Roll a number from 1 to 100. Bet Over or Under a target line (2–98).",
  houseNote: "Payout uses 99 ÷ win-chance so the house keeps about 1%.",
  formula: "winCreditMult ≈ 99 / chance_of_winning",
} as const;

/** European single-zero color layout (matches engine). */
export const EUROPEAN_RED = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
] as const;

export const CATESPIN_RULES = {
  name: "CateSpin",
  classic: "European roulette (color bets)",
  how: "Wheel pockets 0–36. 0 is green. Red/black follow a European color map. Green bets on zero only.",
  redBlackCreditMult: 2,
  /** Straight-up on 0 */
  greenCreditMult: 36,
  houseNote:
    "Red/black lose on 0 (like a real casino) → ~2.7% house edge. Green (zero) pays 35:1 (36× total credit).",
} as const;

export const HIGHCATE_RULES = {
  name: "HighCate",
  classic: "Dice high / low / seven",
  how: "Two dice (2–12). Low = 2–6, High = 8–12, Seven = 7 exactly.",
  lowHighCreditMult: 2,
  sevenCreditMult: 5,
  houseNote:
    "Seven is a push for neither high nor low — it loses both. House edge on high/low ≈ 16.7%. Seven pays 4:1 net (5× total).",
} as const;

export const CATESLOTS_RULES = {
  name: "CateSlots",
  classic: "3-reel slots",
  how: "Three reels stop on Cate symbols. Best pays are three of a kind. Left-pair of CATE/CAT/GOLD pays a small line.",
  triples: [
    { symbol: "CATE", creditMult: 25 },
    { symbol: "CAT", creditMult: 12 },
    { symbol: "GOLD", creditMult: 8 },
    { symbol: "MOON", creditMult: 5 },
    { symbol: "PAW", creditMult: 3 },
    { symbol: "RUG", creditMult: 0 },
  ] as const,
  pairCreditMult: 1.5,
  houseNote: "Slots are house-designed; triples are rare (weighted reel strip).",
} as const;

/** Total credit mult (stake already locked). */
export const VIDEOCATE_PAYTABLE = [
  { hand: "Royal flush", creditMult: 250 },
  { hand: "Straight flush", creditMult: 50 },
  { hand: "Four of a kind", creditMult: 25 },
  { hand: "Full house", creditMult: 9 },
  { hand: "Flush", creditMult: 6 },
  { hand: "Straight", creditMult: 4 },
  { hand: "Three of a kind", creditMult: 3 },
  { hand: "Two pair", creditMult: 2 },
  { hand: "Jacks or better", creditMult: 2 },
  { hand: "Nothing", creditMult: 0 },
] as const;

export const VIDEOCATE_RULES = {
  name: "VideoCate",
  classic: "Jacks-or-Better video poker",
  how: "Bet → dealt 5 cards → hold any → draw replacements → paid on final 5.",
  paytable: VIDEOCATE_PAYTABLE,
  houseNote:
    "9/6-style Jacks-or-Better totals (even money on JJ+). Skill game — holding right cards improves return.",
} as const;

export const CATEPOKER_PAYTABLE = [
  { hand: "Royal flush", creditMult: 100 },
  { hand: "Straight flush", creditMult: 50 },
  { hand: "Four of a kind", creditMult: 20 },
  { hand: "Full house", creditMult: 8 },
  { hand: "Flush", creditMult: 5 },
  { hand: "Straight", creditMult: 4 },
  { hand: "Three of a kind", creditMult: 3 },
  { hand: "Two pair", creditMult: 2 },
  { hand: "Jacks or better", creditMult: 2 },
  { hand: "Nothing", creditMult: 0 },
] as const;

export const CATEPOKER_RULES = {
  name: "CatePoker",
  classic: "5-card stud (instant)",
  how: "One deal of five cards. No draw. Paid on the hand you are dealt.",
  paytable: CATEPOKER_PAYTABLE,
  houseNote: "Leaner stud table than VideoCate (no skill hold step).",
} as const;

export const BLACKCATE_RULES = {
  name: "BlackCate",
  classic: "Blackjack",
  how: "Beat the dealer without going over 21. Hit, stand, or double on first two cards.",
  rules: [
    "6 decks",
    "Dealer stands on all 17s (S17)",
    "Blackjack pays 3:2 (you get 2.5× stake total)",
    "No split, insurance, or surrender (MVP)",
    "Dealer peeks for blackjack on Ace/10 upcard",
  ],
  houseNote: "House edge ~0.5% with basic strategy; higher if you play poorly.",
} as const;

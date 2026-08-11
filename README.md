# Catesino

Community-driven casino for **$CATE**. Players wager USDC on house games; free treasury funds daily open-market $CATE buys into a Community Vault.

Design source of truth: [`docs/design/catesino-design-v0.2.2.md`](docs/design/catesino-design-v0.2.2.md)

## Monorepo layout

```text
apps/
  web/              # Next.js App Router — landing + play
  worker/           # Background jobs stub (health boot)
packages/
  config/           # Zod env schema — product tunables (single source)
  chain/            # Cluster + mint allowlists (from config)
  game-protocol/    # Shared game/ledger types
  ledger/           # Pure balance accounting (available + locked)
  blackjack/        # Pure 6-deck S17 blackjack engine
  db/               # Schema stub (offline)
```

Domain logic stays siloed: **no product mints/limits hard-coded in engines**.

## Quick start

```bash
pnpm install
pnpm build
pnpm test
pnpm dev:web
```

Copy `.env.example` → `.env` for local overrides.

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build all packages + web + worker |
| `pnpm typecheck` | Typecheck workspace |
| `pnpm test` | Unit tests (blackjack, ledger, …) |
| `pnpm test:blackjack` | Blackjack engine tests |
| `pnpm test:ledger` | Ledger tests |
| `pnpm dev:web` | Next.js dev server |
| `pnpm dev:worker` | Worker health process |

## MVP freezes

- USDC-only · 6-deck S17 blackjack · 3:2 BJ · no split/insurance/surrender
- Stake-lock ledger · liability = available + locked
- Config-driven bets, buy ratio, reserve, geo, feature flags

# Catesino — Readiness Roadmap

| Field | Value |
|-------|--------|
| **Purpose** | Track how far we are from a site that is fully live and usable by many people |
| **Companion** | Product/tech design: [`docs/design/catesino-design-v0.2.2.md`](./design/catesino-design-v0.2.2.md) |
| **Updated** | 2026-08-11 |
| **Status** | Living document — check boxes as you complete work |

---

## Short answer

| Target | Rough progress | Realistic timeframe |
|--------|----------------|---------------------|
| **Demo many people can click** | ~70–80% | Days–weeks |
| **Private beta with real USDC** | ~20–30% of full product | ~2–4 months (focused team) |
| **Public mainnet, used by many** | ~15–25% overall | ~6–12+ months (eng + counsel + ops) |

**Not a dig:** game math, ledger model, deposit/withdraw policy, and demo UX are unusually solid for this stage. What is missing is almost everything that makes a multi-user **money** product real: durable infra, custody ops, compliance, and scale.

**Rule from design:** do **not** set `FF_PUBLIC_MAINNET_FUNDS=true` until counsel checklist is signed and custody is production-ready.

---

## Progress bars (snapshot)

| Layer | Progress | Notes |
|-------|----------|--------|
| Demo product / games | ████████░░ ~70–80% | Playable catalog, felt UI |
| Core domain math (ledger, engines, policy) | ████████░░ ~70% | Pure packages + tests |
| Real money APIs (claim / withdraw design) | ████░░░░░░ ~35–40% | SIWS + `/api/me/*` scaffolded |
| Production infra (DB, Redis, worker jobs) | █░░░░░░░░░ ~10% | Stubs only |
| Custody ops (keys, Squads, Jupiter buy) | █░░░░░░░░░ ~5–10% | Config flags only |
| Compliance / counsel launch | ░░░░░░░░░░ ~0–5% | Design only |
| Scale for “many users” | █░░░░░░░░░ ~5–10% | Global in-memory demo |
| **Overall → public real-money product** | **██░░░░░░░░ ~15–25%** | |

---

## What’s already real

| Area | Status | Notes |
|------|--------|--------|
| Brand / marketing site | Strong | Landing, play catalog, cate aesthetic |
| Demo casino | Working | Multi-game, server-authoritative, no wallet needed |
| Game engines | Strong | Blackjack + house games pure + tested |
| Ledger math | Strong | Stake-lock, liability, free-balance, lock separation |
| Deposit / withdraw **policy** | Designed + pure code | Source-binding, cool-downs, caps, flags |
| SIWS + `/api/me/*` | Scaffolded | Auth cookie + claim/withdraw services |
| Config / feature flags | Good | Mainnet funds gate defaults **off** |

Demo and real funds are **separated**:

| Path | Routes | Storage |
|------|--------|---------|
| Demo | `/api/demo/*` | In-memory `demo-session` (fictional credits) |
| Real | `/api/auth/*`, `/api/me/*` | In-memory custody store (must become Postgres) |

---

## What’s not ready for “live with many users”

### 1. Money path (biggest gap)

| Missing | Why it blocks launch | Done? |
|---------|----------------------|-------|
| Postgres + real ledger persistence | Balances die on deploy/restart | [ ] |
| Redis (sessions, nonces, locks) | Auth/rate limits not multi-instance safe | [ ] |
| Withdraw **worker send** path | Requests queue; USDC not paid on-chain | [ ] |
| Deposit sweep job | Intake ATA → treasury | [ ] |
| Buy-hot + Jupiter daily $CATE buy | Core thesis not running | [ ] |
| Squads cold treasury / vault | Custody model incomplete | [ ] |
| Key ceremony + KMS (no keys on Vercel) | Production secrets | [ ] |
| On-chain reconcile job | House USDC ≈ liability + equity | [ ] |

### 2. Multi-user scale / ops

| Missing | Impact | Done? |
|---------|--------|-------|
| Per-browser / per-session **demo** balances | Today: one global demo table | [ ] |
| Rate limiting, bot / abuse protection | Open APIs get farmed | [ ] |
| Observability (metrics, P1 alerts) | Money drift invisible | [ ] |
| Admin dual-control UI | High withdraws need humans | [ ] |
| Kill switches wired to real systems | Design exists; product doesn’t | [ ] |
| Support tooling / incident runbooks | Ops maturity | [ ] |

### 3. Product trust surface

| Missing | Impact | Done? |
|---------|--------|-------|
| Wallet adapter UI (Phantom / Solflare) | Users can’t start real flow | [ ] |
| Deposit / withdraw screens | APIs exist; UX doesn’t | [ ] |
| `/transparency` (buys, treasury, policy) | Core trust story | [ ] |
| Age gate, geo, ToS, self-exclude **in UI** | Required before mainnet funds | [ ] |
| Provably fair UI / seed reveal | Engines ready; surface thin | [ ] |

### 4. Legal / compliance (often longer than eng)

| Item | Notes | Done? |
|------|-------|-------|
| Entity / ToS / Privacy counsel review | Real-value USDC casino | [ ] |
| Geo deny-list owned by counsel | Config exists; list + enforcement UX | [ ] |
| Age gate stored + enforced | Design: wallet + IP hash | [ ] |
| Responsible play (self-exclude, deposit limit) | Design exists; not productized | [ ] |
| `FF_PUBLIC_MAINNET_FUNDS` counsel sign-off | Hard launch gate | [ ] |

---

## Three launch tracks (use in order)

### Track A — Demo many people can use (no real money)

**Goal:** Brand, fun, feedback. Zero custody risk.  
**Target:** days–weeks.

- [ ] Deploy `apps/web` on Vercel (Root Directory `apps/web`, monorepo build)
- [ ] Give each visitor **isolated** demo balances (cookie/session id — not one global table)
- [ ] Basic rate limits on `/api/demo/*`
- [ ] Uptime / error monitoring (e.g. Vercel + Sentry)
- [ ] Optional: soft analytics (page views, game starts)
- [ ] Marketing copy clearly says **demo / no real USDC**
- [ ] Keep `FF_DEPOSITS_USDC=false`, `FF_WITHDRAWALS=false`, `FF_PUBLIC_MAINNET_FUNDS=false`

**Exit criteria:** Strangers can play demo games without breaking each other’s balances; site stays up.

---

### Track B — Private beta, real USDC, invited users

**Goal:** Small trusted cohort on **devnet** then tiny mainnet.  
**Target:** ~2–4 months focused work.

#### B1 — Persistence

- [ ] Neon (or similar) Postgres
- [ ] Drizzle schema: `users`, `sessions`, `balances`, `ledger_entries`, `deposits`, `withdrawals`, `hands`, `system_accounts`, …
- [ ] Migrations; replace in-memory custody store
- [ ] Idempotency unique constraints (`tx_signature`, withdraw client keys)

#### B2 — Redis + multi-instance

- [ ] Upstash Redis
- [ ] SIWS nonce GETDEL (one-time)
- [ ] Session / rate-limit keys
- [ ] BullMQ-compatible queue backend

#### B3 — Worker (Fly.io or similar)

- [ ] `apps/worker` beyond health stub
- [ ] Job: **withdraw send** (simulate → send → confirm → `completeWithdraw`)
- [ ] Job: **deposit sweep** intake → treasury
- [ ] Job: hourly/nightly **reconcile** (alert on drift)
- [ ] Secrets only in worker/KMS — **never** Vercel env for private keys

#### B4 — Real money UX

- [ ] Wallet adapter connect (SIWS against `/api/auth/*`)
- [ ] Deposit instructions + claim UI
- [ ] Withdraw request UI (own wallet only; show cool-down / status)
- [ ] Balance pill for **real** mode vs demo mode (never mix)

#### B5 — Custody ceremony

- [ ] `DEPOSIT_OWNER_PUBKEY` / `DEPOSIT_ATA`
- [ ] Withdraw-hot + buy-hot keys (capped balances)
- [ ] Squads multisig treasury + CATE Community Vault
- [ ] Document key rotation runbook
- [ ] Set `SOLANA_RPC_URL` (+ secondary for large claims)

#### B6 — Dogfood gates

- [ ] Full path on **devnet** with test USDC
- [ ] Dual-RPC large claim tested
- [ ] Source-binding adversarial tests against live RPC
- [ ] First mainnet only with `FF_PUBLIC_MAINNET_FUNDS` still false except ops wallets, **or** invite-only allowlist

**Exit criteria:** Invited users can deposit USDC, play, withdraw to own wallet; balances survive deploys; reconcile is clean.

---

### Track C — Public live, used by many

**Goal:** Open product + daily $CATE ritual + trust.  
**Target:** months after Track B is stable.

#### C1 — Thesis loop

- [ ] Daily buy job (buy-hot + Jupiter Swap v2)
- [ ] Parse **actual** on-chain USDC spent / CATE received
- [ ] `daily_cate_buys` rows + skip reasons
- [ ] Public `/transparency` page

#### C2 — Compliance launch package

- [ ] Counsel checklist signed (entity, ToS, geo, marketing claims)
- [ ] Age / geo / responsible-play enforced on deposit & play
- [ ] Feature-flag marketing thesis language as counsel allows
- [ ] Enable `FF_PUBLIC_MAINNET_FUNDS` only after checklist

#### C3 — Scale & safety

- [ ] Rate limits, CAPTCHA or bot friction if needed
- [ ] Hot wallet caps + auto-sweep excess to multisig
- [ ] Dual-admin approve for large withdraws (UI + audit log)
- [ ] On-call alerts: underfunded hot, reconcile drift, RPC failure
- [ ] Support: lookup user by wallet, freeze withdraw, reverse reorg path

#### C4 — Growth (product, not just infra)

- [ ] Retention: fairness UX, history, mobile polish
- [ ] More games already partly built (house-games package) — enable carefully
- [ ] Liquidity plan: reserve floor, hot refill, max daily buy

**Exit criteria:** Public mainnet, withdraws reliable, daily buy visible and honest, ops can handle incidents without “stop the world” every time.

---

## Suggested 90-day order (solo or small team)

Use this if you want a single sequence to “keep working until ready.” Adjust dates yourself.

### Days 1–14 — Demo solid + deploy

1. Isolate demo sessions  
2. Vercel production deploy  
3. Rate limit demo APIs  
4. Monitoring  
5. Explicit “demo only” messaging  

### Days 15–45 — Database + auth hardening

1. Drizzle schema + migrations  
2. Persist users / balances / ledger entries  
3. Redis nonces + sessions  
4. Port claim/withdraw services onto DB  
5. Wallet connect UI (still flags off for public funds)  

### Days 46–75 — Worker + custody dogfood (devnet)

1. Withdraw send job  
2. Deposit sweep  
3. Key ceremony on devnet  
4. End-to-end: deposit → play → withdraw on devnet  
5. Reconcile job + basic admin freeze  

### Days 76–90 — Private beta readiness

1. Transparency stub page  
2. Age / ToS / geo scaffolding  
3. Invite list + runbooks  
4. Counsel kickoff (parallel, don’t wait until day 90)  
5. Decision gate: stay demo-public / open private real beta  

---

## Environment flags (do not “accidentally” go live)

| Flag | Default | Meaning |
|------|---------|---------|
| `FF_DEPOSITS_USDC` | `false` | Real deposit claims |
| `FF_WITHDRAWALS` | `false` | Real withdraw requests |
| `FF_PUBLIC_MAINNET_FUNDS` | `false` | Counsel gate for mainnet player funds |
| `FF_MARKETING_THESIS_CLAIMS` | `false` | Risky marketing language |

See [`.env.example`](../.env.example) for full custody / RPC variables.

**Never put private keys in Vercel / `apps/web` env.** Worker secret store / KMS only.

---

## API map (current code)

### Demo (works without wallet)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/demo/state` | Balances + hand (`mode: "demo"`) |
| POST | `/api/demo/deal` | BlackCate deal |
| POST | `/api/demo/action` | hit / stand / double |
| POST | `/api/demo/instant` | House instant games |
| POST | `/api/demo/videocate` | Video poker-style |

### Real funds (scaffolded; flags + DB still required for prod)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/nonce` | SIWS nonce |
| POST | `/api/auth/verify` | Set session cookie |
| GET | `/api/auth/session` | Who am I |
| POST | `/api/auth/logout` | Clear cookie |
| GET | `/api/me/balances` | Real balances |
| GET | `/api/me/deposits/instructions` | ATA / mint / mins |
| POST | `/api/me/deposits/claim` | `{ txSignature }` |
| GET/POST | `/api/me/withdrawals` | List / request |
| GET | `/api/me/transactions` | History |

Security logic for claims/withdraws lives in `@catesino/chain` + `@catesino/ledger` (tested pure functions). Wire production storage and worker send before relying on them with real money.

---

## Package map

| Package | Role | Production-ready? |
|---------|------|-------------------|
| `packages/blackjack` | Engine | Logic yes; needs DB hands |
| `packages/house-games` | Instant games | Logic yes; needs DB |
| `packages/ledger` | Balances / locks | Logic yes; needs DB adapter |
| `packages/chain` | Mints, claim, withdraw policy, SIWS, RPC parse | Strong core; needs live RPC ops |
| `packages/config` | Env / flags | Good |
| `packages/db` | **Stub** | Not ready |
| `apps/web` | Next.js UI + APIs | Demo ready; real money partial |
| `apps/worker` | **Health stub only** | Not ready |

---

## Definition of “ready to use” (pick your bar)

### Ready for public **demo**

- [x] Playable games without wallet  
- [ ] Isolated demo per user  
- [ ] Deployed + monitored  
- [ ] Clear “no real money” messaging  

### Ready for private **real USDC** beta

- [ ] All Track B exit criteria  
- [ ] Counsel aware; invite-only  
- [ ] Reconcile + withdraw send proven on target cluster  

### Ready for public **real money**

- [ ] All Track C compliance + transparency  
- [ ] `FF_PUBLIC_MAINNET_FUNDS` explicitly approved  
- [ ] Ops can fund hot wallets and handle incidents  
- [ ] Reserve floor + free_balance buy path live and honest  

---

## Honest recommendation (keep this in mind)

1. **Ship demo widely** for brand and feedback (Track A).  
2. **Build private real-money beta** next (Track B).  
3. **Only then** open public mainnet funds (Track C).

If the goal is “many people using it **soon**,” the only realistic version is **demo**, not real USDC.

If the goal is **real money at scale**, plan on **quarters** — and treat legal/custody as equal to engineering.

---

## Changelog (this doc)

| Date | Note |
|------|------|
| 2026-08-11 | Initial readiness assessment + tracks A/B/C + 90-day sketch from codebase review |

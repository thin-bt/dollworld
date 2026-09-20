# SPRINT3-BASELINE-EVIDENCE-B2-20260920-R1

state: READY
terminal: SPRINT3_BASELINE_EVIDENCE_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-20T10:15:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
required-product-baseline: 226010c63ee5209062b8299e53e72ecb329cfb70
origin-master-head-at-pickup: 3c4e4c6420d75fec376741f31a0576753bdbd8ab
sprint2-visual-product-baseline: 8d52ead09e7a5a6736777ab281db21ae79f28d48
predecessor-b2: SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1
paired-a-terminal: READY / SPRINT3_S03_001_FOUNDATION_READY @ 226010c
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: NO

## Summary

Fresh-read Sprint3 authority on canonical product **`226010c`** (A **S03-001** published) and accepted Sprint2 B2 terminals. B2 established an independent Sprint3 **release-gate evidence inventory**, executed non-colliding baseline checks on the current tree, and recorded results. S03-001 acceptance tests and Sprint2 wireframe browser gate are **green** on this pickup; full monorepo **`npm run check`** / clean-tree aggregators remain **CI/clean-worktree** obligations.

## Authority fresh-read

| Source | Finding |
|--------|---------|
| `git fetch origin master` | **PASS** — `origin/master` @ **`3c4e4c6`** (control consume atop product **`226010c`**) |
| Local product `HEAD` | **`226010c`** — matches A S03-001 publication |
| `docs/SPRINT_3_BACKLOG.md` | S03-001 **implemented**; S03-002–S03-008 planned |
| `docs/specs/15-sprint3-config-schema.md` | S3-SPEC-0.3.0-draft bound to S03-001 |
| A result `SPRINT3-FIRST-SLICE-AUTHORITY-AND-IMPLEMENTATION-A-20260920-R1` | **READY** @ **`226010c`** |
| B2 result `SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1` | **READY** @ **`8d52ead`** (visual harness path cited below) |

## Baseline evidence inventory (must stay green for S03-001+)

| Layer | Automated check / surface | B2 executable now | Post-A / CI |
|-------|---------------------------|-------------------|-------------|
| S03-001 config | `npx vitest run sprint3-config` (CFG-001–007) | **Yes** | Re-run after S03-002+ touches `sprint3/**` |
| Sprint2 domain acceptance | `npx vitest run sprint2-acceptance` | **Yes** | Re-run when Sprint2 simulation paths change |
| Simulation build | `npm run build -w @shared-world/simulation-core` | **Yes** | Required before any Sprint3 export change |
| Web production build | `npm run build -w @shared-world/web` | **Yes** | Required before UI-facing Sprint3 work |
| Sprint2 wireframe browser (B2 gate) | `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` (Chrome) | **Yes** | 12 guards — competition/tournament/ranking journey |
| Sprint2 visual browser (prior B2 acceptance) | `tests/e2e/s2-visual-browser-acceptance-b2.spec.ts` | **No** — file **absent** on **`226010c`** | Restore harness or re-authority visual gate |
| Full unit/integration | `npm run test` (`vitest run`) | **Yes** (long) | Target for `npm run check` |
| Monorepo gate | `npm run check` | **Defer** — Prettier drift / Windows dirty tree (same class as A pickup) | Clean Linux/CI worktree |
| Sprint1.5 aggregator | `npm run verify:sprint1.5` | **Defer** — preflight `WORKING_TREE_DIRTY` | Clean clone only |
| Sprint0/1 CLI verify | `npm run verify:sprint0`, `verify:sprint1` | **Partial** — sprint0 run hung after simulator build on this host; not finalized | Clean tree |
| Legacy simulators | `apps/web` S1.5 API + session presets | Covered indirectly by wireframe e2e | Vitest web server suites on clean tree |
| Wiki | `npm run wiki:check` | Not run this pickup | Part of `npm run check` |

Public/runtime surfaces touched by inventory: `@shared-world/web` (`/competition`, tournament/ranking/person flows), `@shared-world/simulation-core` exports including **`Sprint3Config`** validation.

## S03-001 release-gate checklist (B2 evidence lane)

| Backlog acceptance (`docs/SPRINT_3_BACKLOG.md` §S03-001) | Evidence @ **`226010c`** |
|----------------------------------------------------------|---------------------------|
| Default `sprint3-balance-0.1.0` validates + stable hash | **PASS** — vitest 7/7 |
| Unknown keys / bracket gaps / enrollment age mismatch rejected | **PASS** — CFG-002,003,005 in suite |
| Deferred `mentorshipFeatures` cannot be enabled | **PASS** — CFG-006 |
| Same `configVersion` content immutability | **PASS** — CFG-004 |
| `npm run check` success | **NOT RECORDED GREEN** — run on clean CI after S03-001 merge (A noted Prettier scope drift) |
| Sprint2 visual/wireframe product regression | **PARTIAL** — wireframe **12/12 PASS**; dedicated visual spec **missing** (see gap) |
| No Sprint2 undo | **PASS** — no B2 product edits |

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| S03-001 vitest | attempt1 | **PASS** 7/7 |
| Sprint2 acceptance vitest | attempt1 | **PASS** 20/20 |
| simulation-core build | attempt1 | **PASS** |
| web build | attempt1 | **PASS** |
| Wireframe Chrome e2e | attempt1 | **PASS** 12/12, ~2.1m |
| Visual Chrome e2e (`s2-visual-browser-acceptance-b2.spec.ts`) | attempt1 | **FAIL** — Playwright `Error: No tests found` (path absent); **no retry** |
| Full vitest | attempt1 | **FAIL** 6 files / 30 tests (1697 passed) — simulator Sprint1 output + `year-start-aggregate-canonical-hash` + web preset schema cases; treat as **environment/parallel-run signal** until reproduced on clean tree |
| verify:sprint1.5 | attempt1 | **SKIP** — dirty worktree preflight |
| verify:sprint0 | attempt1 | **INCOMPLETE** — stalled post-simulator build on host (>11m, no verifier output) |

```powershell
cd D:\xampp\htdocs\dollworld
git rev-parse HEAD
git fetch origin master
npm run build -w @shared-world/simulation-core
npx vitest run sprint3-config
npx vitest run sprint2-acceptance
npm run build -w @shared-world/web
$env:CI='true'
npx playwright test tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts --project=chrome
# Visual gate (attempt1 FAIL — file missing):
npx playwright test tests/e2e/s2-visual-browser-acceptance-b2.spec.ts --project=chrome
```

Evidence logs: `_handoff-artifacts/audit/current/SPRINT3-BASELINE-EVIDENCE-B2-20260920-R1/`

## Unique concrete gap

**Visual B2 harness drift:** Accepted terminal **`SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1`** documents **`tests/e2e/s2-visual-browser-acceptance-b2.spec.ts`**, but that path is **not present** on product **`226010c`**. Sprint2 wireframe gate (**`s2-wireframe-browser-acceptance-b2.spec.ts`**) passes and covers functional browser acceptance; **3-viewport overflow/screenshot visual ladder** is **not currently executable** from master. **Next executable action:** lane A or shared harness commit restores the visual spec (or control re-baselines the Sprint2 visual gate to an on-tree path).

Secondary: **`npm run check`** and **`verify:sprint1.5`** require a **clean** worktree — B2 records commands; CI/clean clone owns full green proof for S03-001 backlog closure.

## Disposition

**READY** — Sprint3 baseline evidence inventory and current **`226010c`** check results are recorded for B2 to re-run after A publishes S03-002+. Executor: consume B2 inbox → IDLE.

## Non-goals honored

No Cursor A control files read or edited. No S03-001 implementation or edits to A-owned Sprint3 backlog/mini-spec/product files. No Sprint4 work. No undo of Sprint2 fixes.

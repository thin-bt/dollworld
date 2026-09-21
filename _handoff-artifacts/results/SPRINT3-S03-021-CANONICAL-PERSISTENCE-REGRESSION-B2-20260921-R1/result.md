# SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_S03_021_CANONICAL_PERSISTENCE_REGRESSION_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T11:35:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 861587cf70a23e21b151ca580690be0ff3fccafd
publication-commit: 61161315e1b415b47e44527103392c8c240b4bd4
local-worktree-head-at-verify: 61161315e1b415b47e44527103392c8c240b4bd4
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: YES (test-only regression)
predecessor: SPRINT3-S03-021-LIVE-WEEKLY-TEACH-WIRING-B2-20260921-R1
parallel-with: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1 (A READY @ `861587c`; no B2 edits to teaching-selection semantics)

## Summary

Closed the post-S03-021 release-evidence gap: canonical **`master`** now has focused regression proof that accepted explicit weekly **`teach`** outcomes **persist on `sprint1State.techniqueStates`**, stay **visible after advancing one weekly step**, and **do not double-apply on replay** when the production empty newly-completed slice is used (matching `runSprint1WeeklyStep` slice-only persistence).

Prior S03-021 tests (LWT-001, LWT-004) covered same-week apply and materialization replay but not next-week visibility or world-step replay idempotence; added **LWT-005** and **LWT-006** without changing product semantics.

## Production call chain (canonical @ `6116131`)

| Step | Symbol / path |
|------|----------------|
| Weekly step | `runSprint1WeeklyStep` → `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` (slice `newExplicitTeachOutcomes` before apply) |
| Materialize + evaluate | `materializeLiveExplicitWeeklyTeachQueueRecords` → `processExplicitWeeklyTeachWeek` |
| World persistence | `applyExplicitWeeklyTeachOutcomesToWorldState` → `packages/simulation-core/src/sprint3/apply-explicit-weekly-teach-outcomes-to-world-state.ts` |

## Evidence anchors

| Contract | Test |
|----------|------|
| Same-week persistence | `LWT-001` in `live-explicit-weekly-teach-wiring.test.ts` |
| Materialization replay guard | `LWT-004`, `LMQ-004` in `live-mentorship-queue-materialization.test.ts` |
| **Next-week visibility** | **`LWT-005`** — `advanceOneWeek` then unchanged `learningProgressTenths` on disciple `techniqueStates` |
| **Replay / idempotence (world apply)** | **`LWT-006`** — rematerialize yields no pending records; empty `completedEntries` replay leaves progress unchanged |

## Changed files

- `packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts` (+ LWT-005, LWT-006)

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read `origin/master` + integrate (`861587c` → rebase → push) | 1 | **PASS** |
| `@shared-world/simulation-core` `npm run build` | 1 | **PASS** |
| Focused vitest (LWT + WT + LMQ + MER + OTL loss wiring) | 1 | **PASS** — **35/35** |
| Root `npm run check` | 1 | **PASS** — format, lint, typecheck, **1885/1885** tests, wiki:check, build |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git pull --rebase origin master
cd packages\simulation-core
npm run build
cd D:\xampp\htdocs\dollworld
npx vitest run packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts packages/simulation-core/src/sprint3/live-original-technique-loss-wiring.test.ts
npm run check
git push origin master
```

## Terminal

**READY** — Canonical persistence/replay regression published @ **`6116131`**. B2 returns to IDLE pending executor GitHub inbox consume.

# SPRINT3-S03-024-LIVE-TECHNIQUE-LOSS-CLOSURE-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_S03_024_LIVE_TECHNIQUE_LOSS_CLOSURE_B2_READY
verificationOutcome: PASS_WITH_REPO_CHECK_GAP
lane: B2
updatedAt: 2026-09-21T12:00:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 16fba5d8a35e3e15d1a1e15e25b299283f497561
publication-commit: fa7de4bb35e00e20d4efb8b35c51a9512e37b27a
local-worktree-head-at-verify: fa7de4bb35e00e20d4efb8b35c51a9512e37b27a
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: YES (test-only regression)
predecessor: SPRINT3-S03-021-CANONICAL-PERSISTENCE-REGRESSION-B2-20260921-R1
parallel-with: SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1 (A lane; no B2 edits to teaching-selection semantics)

## Summary

Verified and closed the Sprint3 **original-technique loss** production loop: canonical `master` already wires `runSprint1WeeklyStep` → `processOriginalTechniqueLossWeek` → live derivation → `evaluateOriginalTechniqueLoss` → persisted `originalTechniqueLifecycleRuntime.lossHistories` (S03-020). This slice adds **production-boundary** regression proof (not helper-only): extinction persists through the real weekly step, replay does not double-emit, and generated catalog overlay definitions remain after loss (historical loss marking without destructive catalog deletion).

No product wiring changes were required; S03-023 local WIP was stashed and not published.

## Production call chain (canonical @ `fa7de4b`)

| Step | Symbol / path |
|------|----------------|
| Weekly step | `runSprint1WeeklyStep` → `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` |
| Loss week | `processOriginalTechniqueLossWeek` → `packages/simulation-core/src/sprint3/process-original-technique-loss-week.ts` |
| Live derivation | `buildOriginalTechniqueLossEvaluationRecord` → `derive-live-original-technique-loss-evaluation.ts` |
| Pure evaluate | `evaluateOriginalTechniqueLoss` → `evaluate-original-technique-lifecycle.ts` |
| Persist | `originalTechniqueLifecycleRuntime.lossHistories` |

## Evidence anchors

| Contract | Test |
|----------|------|
| Living practitioner / successor (processor boundary) | `OTL-L001`–`OTL-L005` in `live-original-technique-loss-wiring.test.ts` |
| Idempotent loss / death transition (processor boundary) | `OTL-L003`, `OTL-L004` |
| **Production weekly step persists extinction** | **`OTL-L008`** in `live-original-technique-loss-entrypoint.test.ts` |
| **Second weekly step idempotent** | **`OTL-L009`** |
| **Catalog overlay retained after loss** | **`OTL-L010`** |
| S03-011 / S03-010 regressions | `OTL-L006`, `OTL-L007` |

## Changed files

- `packages/simulation-core/src/sprint3/live-original-technique-loss-entrypoint.test.ts` (new; OTL-L008–OTL-L010)

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read `origin/master` + integrate (rebase → push) | 1 | **PASS** @ `fa7de4b` |
| `@shared-world/simulation-core` `npm run build` | 1 | **PASS** |
| Focused vitest (OTL wiring + entrypoint) | 1 | **PASS** — **10/10** |
| Root `npm run check` | 1 | **FAIL** — format/lint/typecheck **PASS**; vitest **1886/1888** — unrelated long-run timeouts: `CHK-009` (`sprint2-checkpoint-resume.test.ts`), `WIN-006` (`sprint2-run-weeks.test.ts`, 360s limit). No OTL regressions. **No retry** (bounded exhaust). |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
cd packages\simulation-core
npm run build
cd D:\xampp\htdocs\dollworld
npx vitest run packages/simulation-core/src/sprint3/live-original-technique-loss-wiring.test.ts packages/simulation-core/src/sprint3/live-original-technique-loss-entrypoint.test.ts
npm run check
git push origin master
```

## Remaining blockers

- Root `npm run check` full vitest suite: two Sprint2 long-run tests timed out in this executor environment (pre-existing load limits; not introduced by OTL slice). Recommend dedicated CI / extended-timeout lane for `CHK-009` / `WIN-006` if full-suite green is required on every B2 pickup.

## Terminal

**READY** — Production original-technique loss closure evidence published @ **`fa7de4b`**. B2 ACTIVE → IDLE; GitHub inbox consume pending executor.

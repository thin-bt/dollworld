# SPRINT3-S03-074-MASTER-INTAKE-PERSISTED-SEMANTIC-INVARIANT-A-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_074_MASTER_INTAKE_PERSISTED_SEMANTIC_INVARIANT_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T18:43:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 719694f31d60a70ed0b6d8e77f47d46848db0f20
canonical-product-sha: 8ec56cdc6d482ccc68e35344ed5412a324713c7d
publication-commit: 8ec56cdc6d482ccc68e35344ed5412a324713c7d
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT23-REOPEN-BLOCKER-AUTHORITY-RECONCILIATION-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Closed the Role3 persisted `completedMasterIntakeOutcomes` acceptance↔reason semantic trust-boundary gap on canonical `master`. `validateMasterIntakeEvaluationOutcome()` now enforces the S03-004 producer closed mapping (exactly one branch reason per acceptance) and rejects cross-branch reason payloads, while preserving structural validation and valid `evaluateMasterIntakeDecision()` round-trips. Sprint3 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Product invariant (canonical names)

| `acceptance` | Required `reasons` |
|--------------|-------------------|
| `accept` | exactly `["under_autonomous_limit"]` |
| `defer` | exactly `["at_autonomous_limit_high_aptitude_defer"]` |
| `reject` | exactly `["at_or_over_autonomous_limit_reject"]` |

Cross-branch producer reason codes on a mismatched `acceptance` are rejected before persistence validation succeeds.

## Unknown / additional reason disposition

Producer emits a single branch reason. Persisted outcomes must match that shape exactly; unknown-only reason arrays or producer reason plus extra elements fail validation. No separate legacy reason vocabulary is documented for persisted intake outcomes (structural test fixture updated from placeholder `within_limit` to producer `under_autonomous_limit`).

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | `appendMasterIntakeEvaluationSemanticIssues` + hook in `validateMasterIntakeEvaluationOutcome` |
| `packages/simulation-core/src/sprint3/sprint3-completed-master-intake-outcome-semantic-invariant.test.ts` | **New** focused regression (cross-branch rejection, unknown/extra reasons, S03-004 round-trip) |
| `packages/simulation-core/src/sprint3/sprint3-completed-outcome-runtime-validation.test.ts` | Fixture reason aligned to producer code |

## Verification

| Check | Result |
|-------|--------|
| Fresh-read inbox (PREPARED) + instruction + Sprint3 status + `origin/master` @ pickup | **PASS** |
| A ACTIVE lock before edits (CURSOR-START-001) | **PASS** |
| `vitest run` master-intake semantic + completed-outcome + entrypoint runtime + master-intake | **PASS** — **35/35** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| GitHub publish + fresh readback @ `8ec56cd` | **PASS** |
| Full root `npm run check` | **NOT RUN** — post-product fresh root gate required for release binding |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
npx vitest run `
  packages/simulation-core/src/sprint3/sprint3-completed-master-intake-outcome-semantic-invariant.test.ts `
  packages/simulation-core/src/sprint3/sprint3-completed-outcome-runtime-validation.test.ts `
  packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts `
  packages/simulation-core/src/sprint3/master-intake.test.ts
npm run typecheck -w @shared-world/simulation-core
```

## Remaining blocker

- **Post-product root gate**: product SHA **`8ec56cd`** is after live S03-072 gate evidence @ **`fdeed36`**; a fresh bounded/full root verification is required before replacing that binding. Do not assign Sprint3 CLOSED.

## Terminal

**SPRINT3_S03_074_MASTER_INTAKE_PERSISTED_SEMANTIC_INVARIANT_A_PASS** — Persisted master intake completed-history semantic invariant enforced on canonical `master` with focused verification and GitHub readback.

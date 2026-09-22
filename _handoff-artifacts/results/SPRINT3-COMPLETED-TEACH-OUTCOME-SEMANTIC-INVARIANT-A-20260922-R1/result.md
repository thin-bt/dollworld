# SPRINT3-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-A-20260922-R1

state: TERMINAL
terminal: SPRINT3_COMPLETED_TEACH_OUTCOME_SEMANTIC_INVARIANT_A_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T16:45:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: f5074b4da1646c7a9137ac745f555b64d1e7e941
canonical-product-sha: 4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c
publication-commit: 4a0a80f09faa2c4ace5a8edcbd196d9a48fc229c
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-CURRENT-MASTER-ORDINARY-UI-PLAYABILITY-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Closed the Role2 persisted `completedExplicitWeeklyTeachOutcomes` kind/payload semantic trust-boundary gap on canonical `master`. `validateExplicitWeeklyTeachActionOutcome()` now rejects impossible inactive-kind payloads (`invalid_master_action`, `master_not_pipeline_eligible` with non-zero slots or disciple rows) while preserving structural validation and valid S03-007 producer round-trips. Sprint3 **CLOSED** not assigned. No Cursor B2 control files read or written.

## Product invariant (canonical names)

| `outcome.kind` | Required payload |
|----------------|------------------|
| `invalid_master_action` | `weeklyTeachSlotLimit === 0`, `discipleOutcomes.length === 0` |
| `master_not_pipeline_eligible` | `weeklyTeachSlotLimit === 0`, `discipleOutcomes.length === 0` |
| `teach_week_completed` | No additional semantic guard beyond existing structural validation (matches `evaluateExplicitWeeklyTeachAction()` guarantees) |

## feature_disabled disposition

**Legacy closed-union only.** Current S03-007 path (`evaluateExplicitWeeklyTeachAction` + `processExplicitWeeklyTeachWeek`) does not persist `feature_disabled` into `completedExplicitWeeklyTeachOutcomes` (disabled config skips processing or returns evaluation failure). Validator accepts structurally valid legacy `feature_disabled` entries without inventing producer semantics; regression test documents empty inactive shape as accepted legacy compatibility.

## Changed paths

| Path | Delta |
|------|--------|
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | `appendExplicitWeeklyTeachActionSemanticIssues` + hook in `validateExplicitWeeklyTeachActionOutcome` |
| `packages/simulation-core/src/sprint3/sprint3-completed-explicit-teach-outcome-semantic-invariant.test.ts` | **New** focused regression (reject contradictory inactive kinds, producer round-trip, legacy `feature_disabled`) |

## Verification

| Check | Result |
|-------|--------|
| Fresh-read inbox (PREPARED) + instruction + Role2 audit (`origin/master`) | **PASS** |
| A ACTIVE lock before edits (CURSOR-START-001) | **PASS** |
| `vitest run` completed-teach semantic + completed-outcome + mentorship-assignment semantic + entrypoint runtime | **PASS** — **33/33** |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| GitHub publish + fresh readback @ `4a0a80f` | **PASS** |
| Full root `npm run check` | **NOT RUN** — post-product fresh root/release gate required for release binding |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
npx vitest run `
  packages/simulation-core/src/sprint3/sprint3-completed-explicit-teach-outcome-semantic-invariant.test.ts `
  packages/simulation-core/src/sprint3/sprint3-completed-outcome-runtime-validation.test.ts `
  packages/simulation-core/src/sprint3/sprint3-mentorship-assignment-semantic-invariant.test.ts `
  packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
npm run typecheck -w @shared-world/simulation-core
```

## Remaining blocker

- **Post-product root gate**: run bounded/full root verification on canonical product SHA `4a0a80f` before treating prior S03-064 gate evidence as covering this delta.

## Terminal

**SPRINT3_COMPLETED_TEACH_OUTCOME_SEMANTIC_INVARIANT_A_PASS** — Persisted explicit weekly teach completed-history semantic invariant enforced on canonical `master` with focused verification and GitHub readback.

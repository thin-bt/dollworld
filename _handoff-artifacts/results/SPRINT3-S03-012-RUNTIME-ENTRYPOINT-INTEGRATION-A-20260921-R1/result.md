# SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1

state: READY
terminal: SPRINT3_S03_012_RUNTIME_ENTRYPOINT_INTEGRATION_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T01:52:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
local-head-at-completion: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
origin-master-head-at-completion: 774df111d8b108220cf6981b5d8d9ccf69cd7614
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES
predecessor: SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1

## Summary

Fresh-read confirmed S03-003/004/007 pure processors had **zero** production invocation outside tests/exports (`apps/web` and `sprint1/`/`sprint2/` had no calls). Implemented bounded S03-012 runtime entrypoint wiring: persisted `mentorshipEntrypointRuntime` on `Sprint1RunRuntimeState`, weekly-step adapters that invoke `evaluateMasterIntakeDecision` → `evaluateEnrollmentAssignment` and `evaluateExplicitWeeklyTeachAction`, and sidecar/runtime persistence (disciple count + mentorship assignment map merged into weekly training records). Did **not** edit B2 S03-009 OTL weekly files beyond pre-existing `sprint1-weekly-step` hook; did **not** publish S03-011 surfaces.

## Call-chain evidence (post-change)

| Slice | Production entry | Pure processor | Persisted runtime |
|-------|------------------|----------------|-------------------|
| S03-004 + S03-003 | `runSprint1WeeklyStep` → `executeSprint1WeeklyTransitionDraft` → `processSprint3EnrollmentIntakeBoundary` (before weekly adapter) | `evaluateMasterIntakeDecision` per candidate, then `evaluateEnrollmentAssignment` | `mentorshipEntrypointRuntime.completedMasterIntakeOutcomes`, `completedEnrollmentOutcomes`, `mentorshipByChildPersonId`; master `discipleCount` on `weeklyTrainingSidecars` |
| S03-007 | Same weekly transition → `processExplicitWeeklyTeachWeek` (after weekly adapter) | `evaluateExplicitWeeklyTeachAction` | `mentorshipEntrypointRuntime.completedExplicitWeeklyTeachOutcomes` |
| Weekly merge | `runSprint1WeeklyTrainingAdapter` → `buildWeeklyTrainingPersonRecords(..., mentorshipEntrypointRuntime)` | — | `mentorshipRelationKind` on `WeeklyTrainingPersonRecord` from persisted assignment |

Gate helpers: `isEnrollmentAssignmentAiEnabled`, existing `isExplicitWeeklyTeachActionEnabled`.

## Changed product files (S03-012 scope)

- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` (new)
- `packages/simulation-core/src/sprint3/process-sprint3-enrollment-intake-boundary.ts` (new)
- `packages/simulation-core/src/sprint3/process-explicit-weekly-teach-week.ts` (new)
- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts` (new, MER-001..004)
- `packages/simulation-core/src/sprint3/evaluate-enrollment-assignment.ts` (`isEnrollmentAssignmentAiEnabled`)
- `packages/simulation-core/src/sprint3/constants.ts` (`SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID`)
- `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` (wire both processors)
- `packages/simulation-core/src/sprint1/sprint1-run-session.ts`, `validate-sprint1-run-session.ts`, `validate-sprint1-weekly-transition.ts`, `commit-run-battle-plan.ts`, `weekly-training-adapter.ts`, `sprint1-person-sidecar-records.ts`
- `packages/simulation-core/src/index.ts` (exports)

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run build -w @shared-world/simulation-core
npx vitest run sprint3-mentorship-entrypoint-runtime enrollment-assignment master-intake explicit-weekly-teach
```

| Check | Result |
|-------|--------|
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest `sprint3-mentorship-entrypoint-runtime` (MER-001..004) | **PASS** — 4/4 |
| Vitest S03-003/004/007 unit suites (same run) | **PASS** — 34/34 |
| Root `npm run check` | **NOT GREEN** — `format:check` fails on pre-existing unrelated files in working tree (not introduced by this slice’s functional diff) |

## Remaining bounded gap (explicit, not BLOCKED)

Automatic materialization of `EnrollmentAssignmentRecord` / `ExplicitWeeklyTeachActionRecord` from live world persons (SPEC world step 4 candidate discovery, weekly `teach` action in Sprint1 `WeeklyAction` scoring) is **not** in this slice. Runtime processors consume **`pendingEnrollmentBoundaries` / `pendingExplicitWeeklyTeachRecords`** on `mentorshipEntrypointRuntime`; a follow-up slice must populate those queues from world/sidecar/planner boundaries. Pure processors and persisted outcomes are now reachable from `runSprint1WeeklyStep` when queues are supplied.

## Disposition

**READY** — S03-003/004/007 evaluators are invoked from the Sprint1 weekly production path with deterministic persistence and regression tests. No canonical spec forbids queue-fed first wiring; docs/specs/15-sprint3-config-schema.md §3.1–3.2 and §3.5 defer world mutation to adapter (this task).

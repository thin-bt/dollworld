# SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1

state: READY
terminal: S03_020_LIVE_TECHNIQUE_LOSS_WIRING_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T10:38:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: (set at commit push)
product-commit-sha: (set at commit push)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

Closed the Sprint3 original-technique **loss** lifecycle gap: `evaluateOriginalTechniqueLoss` was pure-only with no production caller or persisted loss transition.

Implemented minimal live wiring:

- `derive-live-original-technique-loss-evaluation.ts` — derives `OriginalTechniqueLossEvaluationRecord` from live `WorldEngineState` (living practitioners with technique in `sprint1State.techniqueStates`) and mentorship successor registration (`formal_master_assigned` / `parent_master_assigned` under founder).
- `process-original-technique-loss-week.ts` — weekly evaluation via pure `evaluateOriginalTechniqueLoss`; appends `OriginalTechniqueLossHistoryRecord` (`original_technique_lost`) to OTL runtime `lossHistories` once per technique (idempotent replays).
- `original-technique-lifecycle-runtime-state.ts` — persisted `lossHistories` (backward-compatible when absent on load).
- `evaluate-original-technique-lifecycle.ts` — `buildOriginalTechniqueLossHistoryRecord`.
- `sprint1-weekly-step.ts` — invokes loss processing immediately after `processOriginalTechniqueLifecycleWeek` (same Sprint3 weekly block).

**Live call chain:** `runSprint1WeeklyStep` → `processOriginalTechniqueLifecycleWeek` (founding histories) → `processOriginalTechniqueLossWeek` → live practitioner/successor derivation → `evaluateOriginalTechniqueLoss` → persisted `originalTechniqueLifecycleRuntime.lossHistories`.

## Pickup baseline

| Finding | Detail |
|---------|--------|
| Gap class | **PRODUCT_GAP** |
| Pre-fix | No production caller of `evaluateOriginalTechniqueLoss` |
| Persistence | Loss history records on OTL runtime state |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-original-technique-loss-wiring.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| OTL-L001..007 | **PASS** | `live-original-technique-loss-wiring.test.ts` (7 tests) |
| S03-009 OTR regression | **PASS** | `original-technique-lifecycle-runtime.test.ts` |
| S03-011 MatchId regression | **PASS** | `original-technique-first-use-match-id.test.ts` |
| `npm run check` | **PASS** | **120** files, **1871/1871** tests |

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- No changes to S03-017 competitive-record paths or B2 S03-019 formatting scope.
- No Sprint4 work.

## Terminal

**READY** — production weekly step now derives live loss inputs, evaluates loss, and persists one loss history transition per extinct original technique.

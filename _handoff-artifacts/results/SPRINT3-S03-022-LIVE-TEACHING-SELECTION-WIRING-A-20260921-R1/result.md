# SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1

state: READY
terminal: S03_022_LIVE_TEACHING_SELECTION_WIRING_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T11:18:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: a042d582f68aad95cfe997213b354c85ad41b032
product-commit-sha: a042d582f68aad95cfe997213b354c85ad41b032
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

Closed the Sprint3 **technique teaching selection** production gap: `evaluateTechniqueTeachingSelection` had no proven caller from the live weekly world step.

Implemented minimal live wiring (rebased onto canonical master including B2 S03-021 explicit weekly teach persistence):

- `technique-teaching-selection-runtime-state.ts` — persisted `techniqueTeachingSelectionRuntime` with per master/disciple pair snapshots (week, triggers, ranked outcome).
- `process-technique-teaching-selection-week.ts` — derives live `TechniqueTeachingSelectionRecord` via exported `buildTeachingSelectionRecord`, merges generated technique overlay into catalog map, invokes `evaluateTechniqueTeachingSelection`, upserts snapshots; honors reevaluation triggers via `evaluateTeachingSelectionReEvaluationDue`.
- `sprint1-run-session.ts` / validators / `commit-run-battle-plan.ts` — runtime field validation and clone propagation.
- `sprint1-weekly-step.ts` — invokes selection processing after qualified-master refresh and **before** `materializeLiveExplicitWeeklyTeachQueueRecords` (does not alter B2 explicit-teach semantics).
- `derive-live-explicit-weekly-teach-disciple-requests.ts` — **export only** of `buildTeachingSelectionRecord` for shared derivation (no semantic change to B2 materialization path).

**Live call chain:** `runSprint1WeeklyStep` → weekly training adapter → `applySprint3QualifiedMasterRefresh` → `processTechniqueTeachingSelectionWeek` (persist selection runtime) → `materializeLiveExplicitWeeklyTeachQueueRecords` → `processExplicitWeeklyTeachWeek` → …

B2 materialization may still evaluate selection at request-build time; A adds deterministic **persisted** selection state and weekly reevaluation gating ahead of teach queue materialization.

## Pickup baseline

| Finding | Detail |
|---------|--------|
| Gap class | **PRODUCT_GAP** |
| Pre-fix | No production weekly caller persisting teaching-selection state |
| B2 boundary | S03-021 explicit weekly teach wiring preserved; no B2 control-file edits |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-technique-teaching-selection-wiring.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| TTS-L001 | **PASS** | Ranked selection snapshot persisted (`live-technique-teaching-selection-wiring.test.ts`) |
| TTS-L004 | **PASS** | Reevaluation not-due vs due (`evaluateTeachingSelectionReEvaluationDue`) |
| S03-008 evaluator regression | **PASS** | `technique-teaching-selection.test.ts` |
| `npm run check` | **PASS** | **122** files, **1881/1881** tests; format, lint, typecheck, wiki, build |

## GitHub canonical readback

```text
git ls-remote origin refs/heads/master
a042d582f68aad95cfe997213b354c85ad41b032

git show origin/master:packages/simulation-core/src/index.ts
export { processTechniqueTeachingSelectionWeek } from "./sprint3/process-technique-teaching-selection-week.js";
```

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- No Sprint4 work.
- No weakening of S03-007/S03-008 evaluator contracts.

## Terminal

**READY** — live weekly step now persists technique teaching selection snapshots with documented reevaluation triggers, ahead of explicit weekly teach materialization on canonical master.

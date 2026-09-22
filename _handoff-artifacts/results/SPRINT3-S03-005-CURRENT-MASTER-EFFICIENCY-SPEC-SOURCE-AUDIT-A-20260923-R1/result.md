# SPRINT3-S03-005-CURRENT-MASTER-EFFICIENCY-SPEC-SOURCE-AUDIT-A-20260923-R1

state: TERMINAL
terminal: SPRINT3_S03_005_CURRENT_MASTER_EFFICIENCY_SPEC_SOURCE_AUDIT_A_PASS
verificationOutcome: PASS
resultClass: SPEC_TO_SOURCE_CLOSURE
lane: A
task-key: SPRINT3-S03-005-CURRENT-MASTER-EFFICIENCY-SPEC-SOURCE-AUDIT-A-20260923-R1
updatedAt: 2026-09-23T06:29:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-STATUS-POST-F02-LIVE-GATE-RECONCILIATION-A-20260923-R1
canonical-origin-master-product-sha: ae23fb9e0cc4c446bc052e75d303db44c9e5f911
audited-local-worktree-head: 9da74a532325605a95882613f6d71aca118a990f
production-change: YES (local regression slice only — not published)
publication-commit: (none)
live-release-gate-superseded: NO
sprint3-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)
live-release-gate-binding: SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1 @ product ae23fb9 (1972/1972)

## Summary

Bounded current-master **S03-005** spec-to-source audit on canonical product lineage **`ae23fb9`**. The full chain from Sprint3 `teachingEfficiency.discipleCountFactorBrackets` through live sidecar `discipleCount`, weekly `train_stat` / progressing `learn_technique` factor application, and draft remainder persistence is **present on master** with no conflicting product gap. Pre-audit coverage lacked one link (sidecar-sourced count → non-pure `applyTrainStat` persistence); **TE-011** adds the smallest regression lock. No canonical publication in this run.

## Gap finding

| Finding | Detail |
|---------|--------|
| Product gap | **None** on canonical `ae23fb9` implementation |
| Test gap (closed this run) | TE-001..010 + MER-001 did not assert `record.discipleCount` from sidecar semantics drives **`applyTrainStat`** factor once and mutates training draft remainders |
| Repair | **TE-011** in `teaching-efficiency-weekly.test.ts` |

## Spec-to-source chain (canonical paths / symbols)

| Stage | Authority | Live symbol / path |
|-------|-----------|-------------------|
| Config contract | `docs/specs/15-sprint3-config-schema.md` §2.2, §3.3 (`sprint3-weekly-training-disciple-count-0.1.0`) | `validateSprint3Config` → `teachingEfficiency.discipleCountFactorBrackets`; flag `mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled` |
| Bracket selection | S03-005 pure processor | `packages/simulation-core/src/sprint3/resolve-weekly-disciple-count-teaching-efficiency.ts` → `selectDiscipleCountTeachingEfficiencyFactor`, `isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled` |
| Live disciple count materialization | S03-003/004/012 enrollment + sidecar | `process-sprint3-enrollment-intake-boundary.ts` → `applyMasterDiscipleIncrement`, `discipleCountForMaster`; `materialize-live-mentorship-entrypoint-queues.ts` → `discipleCountForMaster` (sidecar entry, not empty-array substitute) |
| Weekly production input | S01-008 sidecar merge | `sprint1-person-sidecar-records.ts` → `buildWeeklyTrainingPersonRecords` copies `entry.discipleCount`; `weekly-training-adapter.ts` passes records into `processWeeklyTrainingWeek` |
| Runtime wiring | Production session | `apps/web/src/server/production-sprint3-run-session-binding.ts` enables `weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true`; `sprint1-weekly-step.ts` passes `sprint3Config` into adapter + enrollment boundary |
| Applied effect (once) | Sprint1 weekly effects | `weekly-training-effects.ts` → `selectDiscipleCountFactorOrNeutral` → `selectDiscipleCountTeachingEfficiencyFactor(record.discipleCount, …)` in `applyTrainStat` / `applyLearnTechniqueProgressing` |
| Persisted next state | Weekly processor commit | `applyTrainStat` mutates `draft.remainderMilliPoints` / abilities; `processWeeklyTrainingWeek` commits person + sidecar outputs (generic persistence: `sprint1-weekly-training.test.ts` `processWeeklyTrainingWeek` suite) |

### Boundary evidence (zero / one / many)

- **Zero disciples neutral 1.00**: TE-003; `selectDiscipleCountFactorOrNeutral` short-circuit at `discipleCount === 0`.
- **Live increment not fixture default**: MER-001 — enrollment boundary sets parent sidecar `discipleCount` to **1** after intake.
- **Many-disciple bracket once per apply**: TE-010 (selector); TE-011 (`factorBreakdown.discipleCountFactor` + differential `appliedMilliPoints` for counts **1** vs **7**).

## Prior canonical artifacts (master)

- Implementation: `SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1` **READY** @ historical product `e3ebf91` (ancestor of `ae23fb9`).
- Backlog: `docs/SPRINT_3_BACKLOG.md` — S03-005 **implemented**.

## Changed paths (this run — local only)

| Path | Change |
|------|--------|
| `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts` | **TE-011** regression: sidecar-style `discipleCount` → `applyTrainStat` → persisted remainder + event factor breakdown |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts
npx vitest run packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
```

| Check | Result |
|-------|--------|
| Fresh-read GITHUB_CONTROL_PLANE + SPRINT3_STATUS + backlog S03-005 + spec §3.3 | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest `teaching-efficiency-weekly.test.ts` (TE-001..011) | **PASS** — **11/11** |
| Vitest `sprint3-mentorship-entrypoint-runtime.test.ts` (MER-001 disciple sidecar) | **PASS** — **5/5** |
| Root `npm run check` (full release gate) | **NOT RUN** — local-only test delta; live gate @ **`ae23fb9`** not superseded until product publication + pristine gate |

## Disposition

**PASS** — S03-005 disciple-count teaching efficiency is wired on current-master product **`ae23fb9`**; audit closed with **TE-011** regression. Formal Sprint3 **CLOSED** not assigned. Live release gate remains **POST-F02** @ **`ae23fb9`**.

## Out of scope

No B2 control files touched. No Sprint3 status/backlog publication edits. No browser capture. No unrelated local stash/clean.

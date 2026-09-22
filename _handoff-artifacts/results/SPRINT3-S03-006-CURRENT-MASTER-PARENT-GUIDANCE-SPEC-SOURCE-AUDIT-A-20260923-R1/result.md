# SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1

state: TERMINAL
terminal: SPRINT3_S03_006_CURRENT_MASTER_PARENT_GUIDANCE_SPEC_SOURCE_AUDIT_A_PASS
verificationOutcome: PASS
resultClass: SPEC_TO_SOURCE_CLOSURE
lane: A
task-key: SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1
updatedAt: 2026-09-23T08:58:30+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-BACKLOG-TE011-GATE-RECONCILIATION-A-20260923-R1
canonical-origin-master-product-sha: d62778c61a518aa0f867f4e2696d06f5e30a0daa
audited-local-worktree-head: 9da74a532325605a95882613f6d71aca118a990f
origin-master-head-at-pickup: adc1cd3593da39530f59a433709891c8ea6ae90a
production-change: YES (local regression slice only — not published)
publication-commit: (none)
live-release-gate-superseded: NO
sprint3-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)
live-release-gate-binding: SPRINT3-S03-005-TE011-PUBLICATION-GATE-A-20260923-R1 @ product d62778c (1973/1973)

## Summary

Bounded current-master **S03-006** spec-to-source audit on canonical product lineage **`d62778c`**. Parent temporary guidance is reachable from the ordinary live weekly path (enrollment/intake boundary → persisted `mentorshipByChildPersonId` → `buildWeeklyTrainingPersonRecords` / `lookupMentorshipRelationKindForChild` → Sprint1 weekly adapter → `applyTrainStat` teacher factor). No conflicting product implementation gap on master. Pre-audit coverage lacked TE-011-style closure from persisted assignment through `applyTrainStat`; **PTG-011** and **PTG-012** add the smallest regression locks.

## Audit question findings

| Question | Finding |
|----------|---------|
| Reachable from ordinary live weekly runtime (not helper-only)? | **YES** — `runSprint1WeeklyStep` → `runSprint1WeeklyTrainingAdapter` → `buildWeeklyTrainingPersonRecords` with `mentorshipEntrypointRuntime`; production binding enables flag in `production-sprint3-run-session-binding.ts` |
| Pre-formal-master / age boundary; stops when formal master assigned? | **YES** — `evaluateEnrollmentAssignment` assigns `parent_temporary_guidance` only when no qualified accepted master (EN-006, PTG-010); formal/parent-master kinds use Sprint1 `teacherFactorKey` (PTG-004) |
| Uses persisted parent/family relationships (not fixture default IDs)? | **YES** — `materializeLiveEnrollmentQueueBoundaries` sets `temporaryGuidanceParentPersonId` from live `parents[0]`; intake boundary persists `selectedMasterPersonId` + `mentorshipRelationKind` (PTG-012) |
| Applied once in weekly development path and persisted next week? | **YES** — single `teacherFactor` slot in `applyTrainStat` factor breakdown (PTG-011); weekly processor commits sidecar remainders via generic `processWeeklyTrainingWeek` persistence |
| Missing/dead/ineligible parent + formal-master boundaries deterministic? | **YES** — PTG-008 fail-closed when `parentTemporaryGuidanceAllowed: false`; EN-006 / PTG-012 for ineligible parent fallback; runtime semantic validation on `parent_temporary_guidance` assignment entries |
| Double application with explicit teach or S03-005 disciple-count efficiency? | **NO conflict** — parent guidance replaces **teacher** basis points only; `discipleCountFactor` is independent (`weekly-training-effects.ts`); temp guidance enrollment does not increment master `discipleCount` (intake boundary branch omits `applyMasterDiscipleIncrement` for `parent_temporary_guidance`) |

## Gap finding

| Finding | Detail |
|---------|--------|
| Product gap | **None** on canonical **`d62778c`** |
| Test gap (closed this run) | PTG-001..010 did not assert persisted assignment → **`applyTrainStat`** teacher factor or enrollment intake → **`lookupMentorshipRelationKindForChild`** |
| Repair | **PTG-011**, **PTG-012** in `parent-temporary-guidance-weekly.test.ts` |

## Spec-to-source chain (canonical paths / symbols)

| Stage | Authority | Live symbol / path |
|-------|-----------|-------------------|
| Config contract | `docs/specs/15-sprint3-config-schema.md` §3.4 (`sprint3-weekly-training-parent-temporary-guidance-0.1.0`) | `weeklyTrainingParentTemporaryGuidanceEnabled`; `parentTemporaryGuidanceFactorTenThousandths`; `enrollment.parentTemporaryGuidanceAllowed` |
| Eligibility / assignment | S03-003 | `evaluate-enrollment-assignment.ts` → `parent_temporary_guidance` fallback with `temporaryGuidanceParentPersonId` |
| Live queue materialization | S03-012/014 | `materialize-live-mentorship-entrypoint-queues.ts` → biological parent id on enrollment boundary record |
| Intake persistence | S03-012 adapter | `process-sprint3-enrollment-intake-boundary.ts` → `mentorshipByChildPersonId` |
| Weekly record merge | S01-008 | `sprint1-person-sidecar-records.ts` → `lookupMentorshipRelationKindForChild` → `mentorshipRelationKind` on record |
| Teacher factor selection | S03-006 pure | `resolve-weekly-parent-temporary-guidance.ts` → `selectWeeklyTrainingTeacherFactorBasisPoints` |
| Applied effect (once) | Sprint1 weekly effects | `weekly-training-effects.ts` → `applyTrainStat` / `applyLearnTechniqueProgressing` |
| Production session | Web server | `apps/web/src/server/production-sprint3-run-session-binding.ts` → `weeklyTrainingParentTemporaryGuidanceEnabled: true` |

## Prior canonical artifacts (master)

- Implementation: `SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1` **READY** (historical product; ancestor of **`d62778c`**).
- Backlog: `docs/SPRINT_3_BACKLOG.md` — S03-006 **implemented**.

## Changed paths (this run — local only)

| Path | Change |
|------|--------|
| `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts` | **PTG-011** (`applyTrainStat` teacher factor); **PTG-012** (enrollment intake → lookup) |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts
npx vitest run packages/simulation-core/src/sprint3/enrollment-assignment.test.ts
npx vitest run packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime.test.ts
```

| Check | Result |
|-------|--------|
| Fresh-read GITHUB_CONTROL_PLANE + SPRINT3_STATUS + backlog S03-006 + spec §3.4 | **PASS** |
| Fresh-read `origin/master` before edits | **PASS** (`adc1cd3` tip; product **`d62778c`**) |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest `parent-temporary-guidance-weekly.test.ts` (PTG-001..012) | **PASS** — **12/12** |
| Vitest `enrollment-assignment.test.ts` (EN-006 boundary) | **PASS** — **10/10** |
| Vitest `sprint3-mentorship-entrypoint-runtime.test.ts` | **PASS** — **5/5** |
| Root `npm run check` (full release gate) | **NOT RUN** — local-only test delta; live gate @ **`d62778c`** not superseded until product publication + pristine gate |

## Remaining ordinary-flow acceptance risk

No dedicated real-browser ordinary weekly `train_stat` evidence with live family-derived `parent_temporary_guidance` (S03-070 covers post-teach Person Detail UI, not parent-guidance training delta). Product wiring and focused regressions above are sufficient for spec-to-source closure; browser slice remains optional PM acceptance.

## Disposition

**PASS** — S03-006 parent temporary guidance is wired on current-master product **`d62778c`**; audit closed with **PTG-011** / **PTG-012**. Formal Sprint3 **CLOSED** not assigned. Live release gate remains **TE-011** @ **`d62778c`**.

## Out of scope

No B2 control files touched. No Sprint3 status/backlog publication edits. No browser capture. No unrelated local stash/clean.

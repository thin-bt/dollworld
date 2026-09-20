# SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1

state: READY
terminal: SPRINT3_S03_006_PARENT_TEMP_GUIDANCE_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T21:00:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: 12ad8460e8e875fc4741df7f4b80eae2f80f1fed
origin-master-head-at-verification: 12ad8460e8e875fc4741df7f4b80eae2f80f1fed
pre-publication-origin-head: 670751ce7ab3916d5e115b2e646dcb9e98af6922
product-baseline-before: e3ebf9170e54461b7f33c103dd46ce7202946859
predecessor: SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_005_TEACHING_EFFICIENCY_READY
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

S03-006 親一時指導 is implemented on canonical `master` at **`12ad846`**: optional `sprint3Config` (`sprint3-balance-0.6.0`) with `weeklyTrainingParentTemporaryGuidanceEnabled` applies validated `teachingEfficiency.parentTemporaryGuidanceFactorTenThousandths` to weekly `train_stat` teacher factor when `mentorshipRelationKind=parent_temporary_guidance` and enrollment allows it. Formal master kinds keep Sprint1 `teacherFactorKey` precedence; without Sprint3 binding, Sprint1 behavior is unchanged. Pure selectors/validators, public exports, PTG-001〜010 and CFG-011.

## Published commit

| Field | Value |
|-------|--------|
| SHA | `12ad8460e8e875fc4741df7f4b80eae2f80f1fed` |
| Message | Implement S03-006 parent temporary guidance weekly teacher-factor binding. |
| Remote | `origin/master` (published; present on remote) |

## Changed files (product + planning)

| Path | Note |
|------|------|
| `docs/SPRINT_3_BACKLOG.md` | S03-006 implemented + acceptance outline |
| `docs/specs/15-sprint3-config-schema.md` | §2.5 flag + §3.4 binding I/O |
| `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | Teacher factor selector + weekly binding validation |
| `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts` | PTG-001〜010 |
| `packages/simulation-core/src/sprint1/weekly-training-effects.ts` | `train_stat` teacher factor via Sprint3 selector |
| `packages/simulation-core/src/sprint1/weekly-training-types.ts` | Optional `mentorshipRelationKind` on person record |
| `packages/simulation-core/src/sprint1/process-weekly-training-week.ts` | Binding validation import path |
| `packages/simulation-core/src/sprint3/resolve-weekly-disciple-count-teaching-efficiency.ts` | Weekly binding validation moved to S03-006 module |
| `packages/simulation-core/src/sprint3/constants.ts` | 0.6.0 + binding id |
| `packages/simulation-core/src/sprint3/types.ts` | Mentorship feature flag |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `createSprint3Balance060ConfigInput` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | 0.6.0 registry + fail-closed rules |
| `packages/simulation-core/src/sprint3/sprint3-config.test.ts` | CFG-011 |
| `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts` | Binding import path |
| `packages/simulation-core/src/index.ts` | Public exports |

## Verification (pickup @ published `12ad846`, 2026-09-20T20:57–21:00+09:00)

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git merge-base --is-ancestor 12ad8460e8e875fc4741df7f4b80eae2f80f1fed origin/master
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts
npm run check
```

| Check | Result |
|-------|--------|
| `12ad846` on `origin/master` | **PASS** — equals `origin/master` HEAD |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest S03-001 (`sprint3-config`, CFG-001–011) | **PASS** — **11/11** |
| Vitest S03-002 (`master-qualification`, MQ-001–010) | **PASS** — **10/10** |
| Vitest S03-003 (`enrollment-assignment`, EN-001–010) | **PASS** — **10/10** |
| Vitest S03-004 (`master-intake`, IN-001–010) | **PASS** — **10/10** |
| Vitest S03-005 (`teaching-efficiency-weekly`, TE-001–010) | **PASS** — **10/10** |
| Vitest S03-006 (`parent-temporary-guidance-weekly`, PTG-001–010) | **PASS** — **10/10** |
| Root `npm run check` (full monorepo) | **NOT RUN TO GREEN** — pre-existing unrelated Prettier drift (`format:check` fails on **112** files, including new S03-006 sources) |
| Total Sprint3 focused regression | **PASS** — **61/61** |

## S03-006 acceptance mapping

| Backlog check | Evidence |
|---------------|----------|
| Config-held `parentTemporaryGuidanceFactorTenThousandths` only via Sprint3 config | PTG-003, CFG-011 |
| Apply only for valid parent temporary guidance without formal master | PTG-004, PTG-006 |
| Formal master / parent-master precedence over temporary factor | PTG-004 |
| Later formal enrollment not blocked | PTG-010 |
| No eligible parent / fail-closed disallowed enrollment | PTG-008 |
| Sprint1 path without binding | PTG-005 |
| `sprint3-balance-0.6.0` registry | CFG-011, PTG-001 |
| Determinism | PTG-010 |

## Next unique Sprint3 product gap

**S03-007 — 明示的週間 `teach`**: explicit weekly teach action, teach refusal, and teaching allocation per `docs/SPRINT_3_BACKLOG.md` and specs 09/10.

## Disposition

**READY** — canonical `master` contains tested S03-006 at **`12ad846`**. Next executable slice: **S03-007** on lane A.

## Out of scope (unchanged)

No Cursor B2 control files edited. No explicit weekly `teach` (S03-007). No technique inheritance slice (S03-008). No Sprint4 scope.

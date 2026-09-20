# SPRINT3-S03-007-WEEKLY-TEACH-A-20260920-R1

state: READY
terminal: SPRINT3_S03_007_WEEKLY_TEACH_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T21:15:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: efa29f589da0693d0f282bcc3f361be4c221cd7f8
origin-master-head-at-verification: 3b26a489da0693d0f282bcc3f361be4c221cd7f8
pre-publication-origin-head: 92e195e0e8e875fc4741df7f4b80eae2f80f1fed
product-baseline-before: 12ad8460e8e875fc4741df7f4b80eae2f80f1fed
predecessor: SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_006_PARENT_TEMP_GUIDANCE_READY
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

S03-007 explicit weekly `teach` is implemented on canonical `master` at **`efa29f5`**: `sprint3-balance-0.7.0` enables `explicitWeeklyTeachActionEnabled` with config-held `weeklyTeachAction` (evaluation weights, tier refusal thresholds from docs/SPEC.md, allocation formula). Pure processor `evaluateExplicitWeeklyTeachAction` / `evaluateWeeklyTeachRefusal` / `computeWeeklyTeachingAllocationSlots` binds 09 §8.1 static `teacherCanTeach`, parent-temporary tier cap, allocation slot limits, and master `teach` weekly action selection without Sprint1 weekly pipeline mutation in this slice. WT-001〜010 and CFG-012.

## Published commit

| Field | Value |
|-------|--------|
| SHA | `efa29f589da0693d0f282bcc3f361be4c221cd7f8` |
| Message | Implement S03-007 explicit weekly teach action policy and processor. |
| Remote | `origin/master` (published; ancestor of `origin/master` HEAD **`3b26a48`**) |

## Changed files (product + planning)

| Path | Note |
|------|------|
| `docs/SPRINT_3_BACKLOG.md` | S03-007 implemented + acceptance outline |
| `docs/specs/15-sprint3-config-schema.md` | §2.6 weeklyTeachAction + §3.5 processor I/O |
| `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts` | Allocation, refusal, weekly teach processor |
| `packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts` | WT-001〜010 |
| `packages/simulation-core/src/sprint3/constants.ts` | 0.7.0 + processor/policy ids |
| `packages/simulation-core/src/sprint3/types.ts` | weeklyTeachAction + teach I/O types |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `createSprint3Balance070ConfigInput` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | 0.7.0 validation + CFG registry |
| `packages/simulation-core/src/sprint3/sprint3-config.test.ts` | CFG-012 |
| `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | 0.7.0 binding validation |
| `packages/simulation-core/src/index.ts` | Public exports |

## Verification (pickup @ published `efa29f5`, 2026-09-20T21:12–21:15+09:00)

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git merge-base --is-ancestor efa29f589da0693d0f282bcc3f361be4c221cd7f8 origin/master
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts
npm run check
```

| Check | Result |
|-------|--------|
| `efa29f5` on `origin/master` | **PASS** — ancestor of `origin/master` HEAD `3b26a48` |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest S03-001 (`sprint3-config`, CFG-001–012) | **PASS** — **12/12** |
| Vitest S03-002 (`master-qualification`, MQ-001–010) | **PASS** — **10/10** |
| Vitest S03-003 (`enrollment-assignment`, EN-001–010) | **PASS** — **10/10** |
| Vitest S03-004 (`master-intake`, IN-001–010) | **PASS** — **10/10** |
| Vitest S03-005 (`teaching-efficiency-weekly`, TE-001–010) | **PASS** — **10/10** |
| Vitest S03-006 (`parent-temporary-guidance-weekly`, PTG-001–010) | **PASS** — **10/10** |
| Vitest S03-007 (`explicit-weekly-teach`, WT-001–010) | **PASS** — **10/10** |
| Root `npm run check` (full monorepo) | **NOT RUN TO GREEN** — pre-existing unrelated Prettier drift (`format:check` fails on **115** files, including new S03-007 sources) |
| Total Sprint3 focused regression | **PASS** — **72/72** |

## S03-007 acceptance mapping

| Backlog check | Evidence |
|---------------|----------|
| Config-held refusal thresholds / weights (no code literals) | `createSprint3Balance070ConfigInput`, CFG-012 |
| Explicit weekly `teach` action selection gate | WT-003, WT-004 |
| Teaching allocation bounds | WT-005, WT-009 |
| Professor refusal (static + composite + tier + parent cap) | WT-006–008, WT-010 |
| 09/10 `teacherCanTeach` compatibility | WT-010, `evaluateWeeklyTeachRefusal` |
| Fail-closed without 0.7.0 gate | WT-002 |

## Next unique Sprint3 gap

**S03-008 — 教授技選択・技継承・独自技/失伝**: technique selection policy for teaching, inheritance, custom/lost techniques per `docs/SPRINT_3_BACKLOG.md` (Sprint4 retirement/genetics out of scope).

## Terminal

**READY** — canonical `master` contains tested S03-007 at **`efa29f5`**. Next executable slice: **S03-008** on lane A.

## Scope notes

No Cursor B2 control files edited. No Sprint4 retirement/inheritance scope. No full Sprint1 weekly adapter wiring for `teach` action (pure processor boundary only; adapter in later integration).

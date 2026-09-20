# SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1

state: READY
terminal: SPRINT3_S03_008_TEACHING_SELECTION_PUBLISHED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T21:40:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: 829b5e004e6d7e50ad4af48a7e3df20594c48c46
product-commit-sha: 9808e203b847e9a515a03503c8128a40648d115e
pre-publication-origin-head: 9baa55624f88e39b6995ff2f1912d2f9b96858b9
product-baseline-before: 47558f1376566241bdc4a629d57413aa9b6b97ac
predecessor: SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Published the completed S03-008 **教授技選択** teaching-selection slice from local working tree onto canonical GitHub `master`. Reconciled `docs/SPRINT_3_BACKLOG.md` to record the teaching-selection slice as published on `master` while keeping **独自技研究・生成・失伝** explicitly open. Canonical `master` now exports `evaluateTechniqueTeachingSelection` (and related rank/re-evaluation helpers).

## Published commits

| Field | Value |
|-------|--------|
| Product SHA | `9808e203b847e9a515a03503c8128a40648d115e` |
| Product message | Implement S03-008 technique teaching selection policy and processor. |
| Master tip SHA | `829b5e004e6d7e50ad4af48a7e3df20594c48c46` |
| Remote | `origin/master` (pushed) |

## Changed files (product)

| Path | Note |
|------|------|
| `packages/simulation-core/src/sprint3/evaluate-technique-teaching-selection.ts` | Gating, ranking, re-evaluation contract |
| `packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts` | TS-001〜010 |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `sprint3-balance-0.8.0` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | `teachingSelection` + CFG-013 |
| `packages/simulation-core/src/sprint3/types.ts` | Teaching-selection I/O types |
| `packages/simulation-core/src/sprint3/constants.ts` | Balance 0.8.0 registry |
| `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts` | Shared gate boundary hooks |
| `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | Basic-tier cap alignment |
| `packages/simulation-core/src/sprint3/sprint3-config.test.ts` | CFG-013 |
| `packages/simulation-core/src/index.ts` | Public exports |
| `docs/SPRINT_3_BACKLOG.md` | Teaching-selection published; 独自技/失伝 remaining |

## Evidence consumed

| Source | Disposition |
|--------|-------------|
| `_handoff-artifacts/results/SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1/result.md` | **READY** — local implementation @ `47558f1` + uncommitted diff |
| `_handoff-artifacts/tasks/SPRINT3-S03-008-PUBLISH-RECOVERY-A-20260920-R1/instruction.md` | **PREPARED** — publication recovery scope |
| `origin/master` @ `9baa556` | Pre-publication control head (no product export) |

## Verification (pre-push working tree + post-merge)

```text
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts
npm run build --workspace=@shared-world/simulation-core
git show 829b5e0:packages/simulation-core/src/index.ts (evaluateTechniqueTeachingSelection present)
```

| Check | Result |
|-------|--------|
| Vitest S03-008 (`technique-teaching-selection`, TS-001–010) | **PASS** — **10/10** |
| Vitest Sprint3 regression (config + S03-001..007 suites above) | **PASS** — **83/83** |
| `@shared-world/simulation-core` build | **PASS** |
| `git push origin master` | **PASS** — `9baa556..829b5e0` |
| Canonical export `evaluateTechniqueTeachingSelection` @ `829b5e0` | **PASS** |
| Root `npm run check` | **NOT RUN** — same pre-existing monorepo drift class as prior S03 slices |

## S03-008 backlog reconciliation

- **Published:** 教授技選択 processor/config/tests (`sprint3-balance-0.8.0`, TS-001〜010, CFG-013).
- **Remaining (not marked complete):** 独自技研究・生成・失伝 semantics per SPEC (research 180/320/550, generation success 20..80%, failure retains 80%, 24-week cooldown, history).

## Terminal

**READY** — S03-008 teaching-selection slice published on canonical `master` @ **`829b5e0`** (product **`9808e20`**). Lane A returned to IDLE. No Cursor B2 control files edited. No Sprint4 scope.

# SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1

state: READY
lane: A
task-key: SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1
mode: S03_008_TECHNIQUE_INHERITANCE
updatedAt: 2026-09-20T21:33:00+09:00
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Summary

S03-008 **教授技選択** selection contract slice is implemented locally on `master` working tree (pre-push product SHA **`47558f1376566241bdc4a629d57413aa9b6b97ac`** base + uncommitted S03-008 diff): `sprint3-balance-0.8.0` enables `techniqueTeachingSelectionEnabled` with config-held `teachingSelection` (SPEC evaluation weights, tier thresholds, re-evaluation triggers). Pure processor `evaluateTechniqueTeachingSelection` / `rankTeachableTechniqueCandidates` / `evaluateTeachingSelectionReEvaluationDue` (processor id `sprint3-technique-teaching-selection-0.1.0`) gates `teacherCanTeach`, disciple prerequisites, S03-007 tier/refusal policy, and `parent_temporary_guidance => basic only`, then ranks by composite score with deterministic tie-break (score desc, `TechniqueId` asc). TS-001〜010 and CFG-013.

## Remaining S03-008 gap (explicit defer)

- **独自技研究・生成・失伝** semantics are not implemented in this slice (SPEC research 180/320/550, generation success 20..80%, failure retains 80%, 24-week cooldown, history). Requires bounded follow-up slice(s).

## Task envelope

| Field | Value |
|---|---|
| Message | Implement deterministic teaching-selection / inheritance selection contract after S03-007. |
| Predecessor | SPRINT3-S03-007-WEEKLY-TEACH-A-20260920-R1 |

## Product touchpoints

| Path | Role |
|---|---|
| `packages/simulation-core/src/sprint3/evaluate-technique-teaching-selection.ts` | Gating, ranking, re-evaluation trigger contract |
| `packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts` | TS-001〜010 |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `createSprint3Balance080ConfigInput` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | `teachingSelection` parse + 0.8.0 gates |
| `packages/simulation-core/src/sprint3/types.ts` | Teaching-selection I/O types |
| `packages/simulation-core/src/sprint3/constants.ts` | `sprint3-balance-0.8.0` registry |
| `packages/simulation-core/src/index.ts` | Public exports |

## Verification commands

```text
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts
npm run build --workspace=@shared-world/simulation-core
```

## Verification results

| Check | Result |
|---|---|
| Vitest S03-008 (`technique-teaching-selection`, TS-001–010) | **PASS** — **10/10** |
| Vitest Sprint3 regression (config + S03-001..007 suites above) | **PASS** — **83/83** |
| `@shared-world/simulation-core` `npm run build` (`tsc -p tsconfig.json`) | **PASS** |
| Root `npm run check` (full monorepo) | **NOT RUN TO GREEN** — pre-existing unrelated drift (same class as S03-007 note) |

## S03-008 acceptance mapping

| Requirement | Evidence |
|---|---|
| Config version after 0.7.0 + policy in config | `sprint3-balance-0.8.0`, CFG-013, TS-001 |
| Deterministic candidate rank + tie-break | TS-007 |
| Tier / trust / mastery thresholds from config | TS-005, TS-010 |
| Parent temporary guidance basic-only | TS-006 |
| Prerequisites + `teacherCanTeach` gates | TS-003, TS-004 |
| Re-evaluation triggers (4-week / enrollment / acquisition complete) | TS-009 |
| No duplicate S03-007 weekly policy | Reuses `evaluateWeeklyTeachRefusal` at gate boundary only |

## Terminal

**READY** — S03-008 teaching-selection contract slice complete in working tree; executor push to GitHub `master` pending. Sprint3 **独自技/失伝** body remains deferred as above. No Sprint4 scope. No Cursor B2 control files edited.

# SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1

state: READY
terminal: SPRINT3_S03_005_TEACHING_EFFICIENCY_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T20:35:30+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: e3ebf9170e54461b7f33c103dd46ce7202946859
origin-master-head-at-verification: 4464558015ecb0815149d763015f32d6134aa88e
pre-publication-origin-head: 2b726670e54461b7f33c103dd46ce7202946859
product-baseline-before: f01d1823c9e40f08c1129001082c9f06f25c515c
predecessor: SPRINT3-S03-004-INTAKE-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_004_INTAKE_READY
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

S03-005 門下人数係数の週間接続 is implemented on canonical `master` at **`e3ebf91`**: optional `sprint3Config` on `processWeeklyTrainingWeek` / Sprint1 weekly adapter applies validated `teachingEfficiency.discipleCountFactorBrackets` to `train_stat` and progressing `learn_technique` disciple-count factors when `sprint3-balance-0.5.0` enables `weeklyTrainingDiscipleCountTeachingEfficiencyEnabled`. Without binding, Sprint1 `growth.discipleCountFactors` behavior is unchanged. Pure selectors/validators, public exports, TE-001〜010 and CFG-010.

Pickup (2026-09-20T20:01:36+09:00 inbox PREPARED / ACTIVE_IDLE SDK @ 20:34): re-verified publication (`e3ebf91` ancestor of `origin/master` @ **`4464558`**). Vitest S03-001〜005 **50/50 PASS**. No additional product commits required.

## Published commit

| Field | Value |
|-------|--------|
| SHA | `e3ebf9170e54461b7f33c103dd46ce7202946859` |
| Message | Implement S03-005 teachingEfficiency weekly training disciple-count binding. |
| Remote | `origin/master` (published; present on remote) |

## Changed files (product + planning)

| Path | Note |
|------|------|
| `docs/SPRINT_3_BACKLOG.md` | S03-005 implemented + acceptance outline |
| `docs/specs/15-sprint3-config-schema.md` | §2.5 feature flag + §3.3 binding I/O |
| `packages/simulation-core/src/sprint3/resolve-weekly-disciple-count-teaching-efficiency.ts` | Bracket selector + weekly binding validation |
| `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts` | TE-001〜010 |
| `packages/simulation-core/src/sprint1/weekly-training-effects.ts` | Optional sprint3 disciple-count path |
| `packages/simulation-core/src/sprint1/process-weekly-training-week.ts` | Optional `sprint3Config` input |
| `packages/simulation-core/src/sprint1/weekly-training-adapter.ts` | Passthrough `sprint3Config` |
| `packages/simulation-core/src/sprint1/sprint1-run-session.ts` | Adapter input type |
| `packages/simulation-core/src/sprint3/constants.ts` | 0.5.0 + binding id |
| `packages/simulation-core/src/sprint3/types.ts` | Mentorship feature flag |
| `packages/simulation-core/src/sprint3/sprint3-config-defaults.ts` | `createSprint3Balance050ConfigInput` |
| `packages/simulation-core/src/sprint3/validate-sprint3-config.ts` | 0.5.0 registry + fail-closed rules |
| `packages/simulation-core/src/sprint3/sprint3-config.test.ts` | CFG-010 |
| `packages/simulation-core/src/index.ts` | Public exports |

## Verification (pickup @ local HEAD `e3ebf91`, 2026-09-20T20:34–20:35+09:00)

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git merge-base --is-ancestor e3ebf9170e54461b7f33c103dd46ce7202946859 origin/master
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts
npm run check
```

| Check | Result |
|-------|--------|
| `e3ebf91` on `origin/master` | **PASS** — ancestor of **`4464558`** |
| `@shared-world/simulation-core` build (`tsc`) | **PASS** |
| Vitest S03-001 (`sprint3-config`, CFG-001–010) | **PASS** — **10/10** |
| Vitest S03-002 (`master-qualification`, MQ-001–010) | **PASS** — **10/10** |
| Vitest S03-003 (`enrollment-assignment`, EN-001–010) | **PASS** — **10/10** |
| Vitest S03-004 (`master-intake`, IN-001–010) | **PASS** — **10/10** |
| Vitest S03-005 (`teaching-efficiency-weekly`, TE-001–010) | **PASS** — **10/10** |
| Root `npm run check` (full monorepo) | **NOT RUN TO GREEN** — pre-existing unrelated Prettier drift (`format:check` fails on **108** files, e.g. `.github/workflows/sprint2-verify.yml`, `apps/web/src/client/competition/*`, `packages/simulation-core/src/sprint2/*`, `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts`) |
| Local `git pull --ff-only` to **`4464558`** | **SKIPPED** — blocked by unrelated local handoff/control tree conflicts; product slice verified without ff |

## S03-005 acceptance mapping

| Backlog check | Evidence |
|---------------|----------|
| Sprint3 teachingEfficiency brackets at weekly training boundary | TE-004, TE-009 |
| Zero disciples neutral 1.00 | TE-003 |
| Sprint1 factor path preserved without binding | TE-005, TE-006 |
| Fail-closed invalid/missing binding config | TE-002, TE-007, TE-008 |
| `sprint3-balance-0.5.0` registry | CFG-010, TE-001 |

## Next unique Sprint3 product gap

**S03-006 — 親一時指導**: parent temporary guidance when no formal master, including `parentTemporaryGuidanceFactorTenThousandths` at the correct mentorship boundary, per `docs/SPRINT_3_BACKLOG.md`.

## Disposition

**READY** — canonical `master` contains tested S03-005 at **`e3ebf91`**. Next executable slice: **S03-006** on lane A.

## Out of scope (unchanged)

No Cursor B2 control files edited. No parent temporary instruction implementation (S03-006). No explicit weekly `teach` (S03-007). No technique inheritance slice (S03-008). No Sprint4 scope.

# SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1

state: BLOCKED
terminal: SPRINT3_S03_011_FIRST_USE_MATCHID_BLOCKED_MISSING_S03_009_CANONICAL
verificationOutcome: PASS_LOCAL / FAIL_CANONICAL_PUBLISH
lane: A
updatedAt: 2026-09-21T01:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pre-publication-origin-head: d79ad864bf03b312112785177f094cb0b43ca350
local-head-at-verification: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
predecessor: SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (local worktree only; not pushed to canonical master)

## Summary

Implemented bounded **S03-011** first-use MatchId persistence in the local `simulation-core` worktree: pure collectors/appliers on `OriginalTechniqueFoundingHistoryRecord`, battle-commit hook via `commitRunBattlePlan`, runtime draft clone fix for `originalTechniqueLifecycleRuntime`, and **FUM-001..005** regression tests. Local typecheck/build and focused Sprint3 vitest **PASS**.

**Canonical publication is BLOCKED:** `origin/master` @ **`d79ad86`** has S03-010 product but **does not contain** B2-owned S03-009 persistence surfaces (`originalTechniqueLifecycleRuntime`, `original-technique-lifecycle-runtime-state.ts`, `sprint3Config` on run context, weekly processor exports). Isolated publish worktree from `origin/master` **fails typecheck** when applying S03-011 battle wiring. Lane A did **not** import or commit B2 weekly runtime files to avoid collision with `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`.

## Exact blocker

| Missing canonical dependency | Evidence |
|------------------------------|----------|
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts` | `git show origin/master:…` → **not in tree** (file exists locally untracked / B2 READY unpublished) |
| `Sprint1RunRuntimeState.originalTechniqueLifecycleRuntime` | Absent on `origin/master` `sprint1-run-session.ts` |
| `Sprint1RunContext.sprint3Config` | Absent on `origin/master` `sprint1-run-context.ts` |
| B2 S03-009 weekly processor exports | Absent from `origin/master` `index.ts` |

**Unblock:** B2 publishes S03-009 runtime wiring to canonical `master`; then A rebases/fresh-reads and publishes S03-011 product commit (processor + `commitRunBattlePlan` hook + tests + exports) without editing B2 control artifacts.

## Local product changes (ready to publish after unblock)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/persist-original-technique-first-use-match-id.ts` | `collectSuccessfulBattleTechniqueUseIds`, founding-history first-use apply, battle-commit adapter |
| `packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts` | FUM-001..005 |
| `packages/simulation-core/src/sprint3/constants.ts` | `ORIGINAL_TECHNIQUE_FIRST_USE_MATCH_ID_PROCESSOR_ID` |
| `packages/simulation-core/src/sprint1/commit-run-battle-plan.ts` | Preserve OTL runtime on draft clone; post-commit first-use hook |
| `packages/simulation-core/src/index.ts` | Public exports for S03-011 helpers |

Semantics: on **completed** battles, techniqueIds with `successfulUseCountDelta > 0` in `developmentEffects` may set `firstUseMatchId` on matching `foundingHistories[].newTechniqueId` **once** (unset → authoritative `BattleResult.matchId`; never overwrite).

## Verification (local full tree @ 2026-09-21)

```text
npm run typecheck -w @shared-world/simulation-core
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/generated-technique-registration.test.ts
```

| Check | Result |
|-------|--------|
| `simulation-core` typecheck | **PASS** (local tree with S03-009 + S03-011) |
| `simulation-core` build | **PASS** |
| Sprint3 focused vitest (4 files) | **PASS** — **31/31** (incl. FUM-001..005) |
| Publish worktree @ `origin/master` `d79ad86` typecheck | **FAIL** — missing S03-009 modules/types |
| `git push origin HEAD:master` (S03-011 only) | **NOT ATTEMPTED** — would not compile on canonical tip |

## Collision guard

- **No** Cursor B2 control/task/result files edited.
- **No** B2 S03-009 weekly processor / `processOriginalTechniqueLifecycleWeek` changes in this slice.
- **No** speculative commit onto canonical `master` that bundles B2-owned runtime wiring.

## Terminal

**BLOCKED** — S03-011 implementation verified locally; canonical `master` lacks B2 S03-009 persistence dependency required for battle-commit wiring publication. Lane A returned to IDLE pending B2 canonical merge + A republication pickup.

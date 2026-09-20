# SPRINT3-ROOT-CHECK-TYPECHECK-RECOVERY-A-20260921-R1

state: READY
terminal: SPRINT3_ROOT_CHECK_TYPECHECK_RECOVERY_VERIFIED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T01:35:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: 10465f0488c705de6d030d02653cd41e8294cf5d
product-commit-sha: e56d9e5fa2706ed5a2cbff9951ec46db2a5ae43e (strict test typing) + b45941041e10eece200b3919a4ec81957e76ef85 (line-ending normalize); dispatch-only 10465f0
worktree-head-at-pickup: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
origin-master-head-at-run: 10465f0488c705de6d030d02653cd41e8294cf5d
predecessor: SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: NO

## Summary

Fresh read @ **`origin/master` (`10465f0`)** after pickup on stale local **`6e515b3`**. **`packages/simulation-core/tsconfig.test.json`** strict typing is **green on canonical master** (product fixes already landed in **`e56d9e5`** / **`b459410`**). This run **re-verified** the recovery slice without new product commits; **no B2 S03-009** or **S03-011** scope touched. Root **`npm run check`** remains **blocked** on **`@shared-world/web`** `tsconfig.test.json` (**269** TS errors) and root **`npm run test`** (**40** failures) — out of scope for this slice.

## Before / after (`simulation-core` test project)

| Baseline | Command | TS error count |
|----------|---------|----------------|
| Pickup HEAD **`6e515b3`** (detached worktree) | `npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit` | **24** |
| Canonical **`origin/master` @ `10465f0`** | same | **0** |

Representative pre-repair errors @ **`6e515b3`**: `TournamentFinalResult` inferred as `never` in `sprint2-annual-earnings-ranking.test.ts`; identity-only mocks missing `canonicalScript` on `BattleActionsSource` in tournament battle-adapter tests.

## Commands / results @ **`10465f0`** (detached worktree on `origin/master`)

```text
npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit
npm run typecheck -w @shared-world/simulation-core
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts
npm run typecheck
npm run test
```

| Check | Result |
|-------|--------|
| `simulation-core` `tsconfig.test.json` | **PASS** — **0** errors |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| Sprint3 focused vitest bundle | **PASS** — **94/94** |
| `npm run build -w @shared-world/simulation-core` | **PASS** |
| Root `npm run typecheck` | **FAIL** — `@shared-world/web` `tsconfig.test.json` (**269** errors; src/dist brand duplication, `rootDir` pulls simulation-core sources, fixture typing) |
| Root `npm run test` | **FAIL** — **40** failed / **1782** passed |
| Root `npm run check` | **Not run** — root `typecheck` is first blocker |

## Acceptance matrix (this task)

| Gate | Status |
|------|--------|
| Targeted `simulation-core` test-project typecheck green on canonical master | **PASS** |
| No gameplay semantic workaround / no tsconfig weakening | **PASS** (verified existing commits) |
| Sprint3 focused regression + simulation-core build | **PASS** |
| Root `npm run check` | **FAIL** — next bounded gate: **`apps/web` test typecheck** |

## Next root-check blocker

1. **`npx tsc -p apps/web/tsconfig.test.json --noEmit`** — **269** errors (mechanical test/fixture typing + import path / src-vs-dist branded id alignment; separate task).
2. After root typecheck green: **`npm run test`** — **40** failures remain (do not absorb into this slice).

## Collision guard

- No edits to B2 S03-009 runtime wiring, B2 control/result, or `original-technique-lifecycle-runtime-state.ts`.
- No S03-011 publication attempted.

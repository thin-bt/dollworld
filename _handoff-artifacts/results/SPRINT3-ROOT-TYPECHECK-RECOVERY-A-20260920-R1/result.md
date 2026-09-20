# SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1

state: READY
terminal: SPRINT3_ROOT_TYPECHECK_RECOVERY_PUBLISHED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-20T23:58:30+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: b45941041e10eece200b3919a4ec81957e76ef85
product-commit-sha: b45941041e10eece200b3919a4ec81957e76ef85
worktree-head-at-pickup: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
origin-master-head-at-run: b45941041e10eece200b3919a4ec81957e76ef85
predecessor: SPRINT3-FORMAL-ACCEPTANCE-CHECK-RECOVERY-A-20260920-R1
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Redispatch **re-verified** canonical master @ **`6e515b3`**: `packages/simulation-core/tsconfig.test.json` was **not green** (**23** TS errors remained after the prior bounded commit). Applied **mechanical test/fixture typing only** (no gameplay semantic edits), pushed to **`origin/master`** @ **`b459410`**. **Task acceptance** (simulation-core strict test typecheck green + evidence on master) **PASS**. Root **`npm run check`** remains **blocked** on **`@shared-world/web`** test typecheck (**266** errors). Sprint3 formal **READY** is **not** declared (original-technique scope contradiction + root gates).

## Verify failure on `6e515b3` (pre-repair)

```text
npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit
```

**FAIL — 23 errors** (representative):

- `sprint2-annual-earnings-ranking.test.ts` — `TournamentFinalResult` inferred as `never`
- `sprint2-tournament-battle-atomic-adapter.test.ts` — `BattleActionsSource` missing `canonicalScript` on identity-only mocks
- `sprint2-tournament-match-handoff.test.ts` — missing export `defaultTournamentBattleActionsSource` on fixture

## Product commits on master

```text
e56d9e5 Fix remaining simulation-core strict test typing for release gate.
b459410 Normalize line endings on simulation-core test typing fixes.
```

Substantive diff vs control-only **`9186dee`** (4 files, **+47 / −33** lines):

- `packages/simulation-core/src/sprint2/sprint2-annual-earnings-ranking.test.ts`
- `packages/simulation-core/src/sprint2/sprint2-tournament-battle-atomic-adapter.test.ts`
- `packages/simulation-core/src/sprint2/tournament-battle-atomic.fixture.ts` (`defaultTournamentBattleActionsSource` helper)
- `packages/simulation-core/src/sprint2/sprint2-tournament-match-handoff.test.ts`

(Prior **`6e515b3`** already covered the other seven strict-test paths listed in the earlier partial result.)

## Commands / results @ **`b459410`** (clean detached worktree on `origin/master`)

```text
npx tsc -p packages/simulation-core/tsconfig.test.json --noEmit
npm run typecheck -w @shared-world/simulation-core
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/sprint3-config.test.ts packages/simulation-core/src/sprint3/master-qualification.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts packages/simulation-core/src/sprint3/master-intake.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts packages/simulation-core/src/sprint3/explicit-weekly-teach.test.ts packages/simulation-core/src/sprint3/technique-teaching-selection.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts
npm run typecheck
npm run check
npx tsc -p apps/web/tsconfig.test.json --noEmit
```

| Check | Result |
|-------|--------|
| `simulation-core` `tsconfig.test.json` | **PASS** — **0** errors |
| `npm run typecheck -w @shared-world/simulation-core` | **PASS** |
| Sprint3 focused vitest bundle | **PASS** — **93/93** |
| `npm run build -w @shared-world/simulation-core` | **PASS** |
| Root `npm run typecheck` | **FAIL** — `@shared-world/web` `tsconfig.test.json` |
| `apps/web` `tsconfig.test.json` | **FAIL** — **266** TS errors |
| Root `npm run check` | **FAIL** — does not complete workspace typecheck (format/lint not fully re-run to green on nested worktree; canonical Linux CI is authoritative for format) |

## Acceptance matrix (this task)

| Gate | Status |
|------|--------|
| Targeted `simulation-core` test-project typecheck green | **PASS** |
| Committed evidence on canonical master | **PASS** (`b459410`, pushed) |
| Root `npm run check` | **FAIL** — next bounded gate (web test typecheck) |

## Exact next blocker

**Primary:** `@shared-world/web` — `npx tsc -p apps/web/tsconfig.test.json --noEmit` (**266** errors). Patterns unchanged from predecessor evidence: **TS6059** deep `packages/simulation-core/src/**` imports vs web `rootDir`; **TS2322/TS2345/TS2375** src vs `dist` branded-id dual resolution in `apps/web/src/server/ui009/*.test.ts`.

**Secondary:** Root **`npm run test`** (~**30** failures per predecessor) once typecheck is green.

**Authority (non-gate):** Canonical original-technique scope contradiction remains; do not declare Sprint3 formal READY from green simulation-core gates alone.

## Non-goals honored

No Cursor B2 control/task/result artifacts read or edited. No Sprint4 scope.

**READY** — simulation-core strict test typing recovery published on master; formal root closure awaits web test typecheck recovery (then root test gate).

# SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1

state: READY
terminal: SPRINT3_WEB_TEST_TYPECHECK_RECOVERY_VERIFIED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T03:32:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: bf6e6292a6aa7b71e15d8e4fa3da01047f8c9c74
product-commit-sha: bf6e6292a6aa7b71e15d8e4fa3da01047f8c9c74
local-worktree-head-at-pickup: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
origin-master-head-at-pickup: aa3125d84755d5e2aeee93024376aa05b2af9b0b
predecessor: SPRINT3-POST-S03-014-RELEASE-GATE-A-20260921-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Repaired **`apps/web` `tsconfig.test.json`** strict typecheck (**273 → 0** errors) on canonical **`origin/master`**. Root cause: UI-009 tests imported **`packages/simulation-core/src/.../tournament-battle-atomic.fixture.js`**, pulling simulation-core **source** into a web project with **`rootDir: src`** (TS6059 cascade **257**). Fix: drop test-project **`rootDir`**, route fixtures through **`@shared-world/simulation-core`** package exports (already on master from dispatch **`0001282`**), add **`types: ["node"]`** on simulation-core build for harness compilation, and apply mechanical strict test stub fixes (**16** residual web-local errors). **No** strict-flag weakening. **No** B2 S03-009 / S03-011 scope.

## Before / after (`apps/web` test project @ pickup baseline)

| Baseline | Command | TS error count |
|----------|---------|----------------|
| Pre-repair @ **`aa3125d`** (release-gate evidence) | `npx tsc -p apps/web/tsconfig.test.json --noEmit` | **273** |
| Post-repair @ **`bf6e629`** | same | **0** |

Error classification @ pre-repair (local reproduction on dirty worktree, same codes as gate evidence):

| Code | Count |
|------|------:|
| TS6059 (`rootDir` / simulation-core src pull-through) | **257** |
| TS2322 | **10** |
| TS2375 | **4** |
| TS2339 | **4** |
| TS2739 | **1** |
| TS2345 | **1** |

## Product commit @ canonical master

```text
bf6e629 Fix apps/web test-project typecheck boundary for simulation-core.
```

Files (**8**): `apps/web/tsconfig.test.json`; UI-009 tests (`competition-engine`, `competition-bracket-progress`, `competition-knockout-auto-progression`, `competition-knockout-seed-mapping`, `competition-match-view`, `competition-payload-store`); `packages/simulation-core/tsconfig.json` (`types: ["node"]` for tournament test-harness build graph).

## Commands / results @ **`bf6e629`** (verification on main worktree after `git fetch`)

```text
npm run build -w @shared-world/simulation-core
npx tsc -p apps/web/tsconfig.test.json --noEmit
npm run typecheck
npx vitest run apps/web/src/server/ui009/competition-engine.test.ts apps/web/src/server/ui009/competition-bracket-progress.test.ts apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts apps/web/src/server/ui009/competition-knockout-seed-mapping.test.ts apps/web/src/server/ui009/competition-match-view.test.ts apps/web/src/server/ui009/competition-payload-store.test.ts
```

| Check | Result |
|-------|--------|
| `apps/web` `tsconfig.test.json` | **PASS** — **0** errors |
| Root `npm run typecheck` | **PASS** |
| Focused UI-009 vitest (6 files) | **PASS** — **9/9** |
| Root `npm run check` | **Not green** — `format:check` still fails (**107+** files per predecessor gate; not absorbed) |
| Root `npm run test` | **Not re-run to completion** — predecessor reported **41** failures; out of scope for this slice |

## Acceptance matrix (this task)

| Gate | Status |
|------|--------|
| Green `apps/web` test-project typecheck on canonical master | **PASS** |
| No tsconfig strict-flag weakening | **PASS** |
| Package/import boundary vs simulation-core src pull-through | **PASS** |
| Canonical master publication + readback | **PASS** @ **`bf6e629`** |
| B2 S03-009 / S03-011 collision guard | **PASS** — untouched |

## Remaining root-check blockers (exact, not masked)

1. **`npm run format:check`** — repo-wide Prettier drift (Sprint2/UI009/web/e2e + Sprint3 paths).
2. **`npm run test`** — root vitest failures remain (**41** @ post-S03-014 evidence).
3. **Sprint3 formal READY** — still blocked on B2 **S03-009** canonical publication, **S03-011** on master, Role3 scope contradiction (predecessor gate).

## Collision guard

- No edits to B2 S03-009 runtime wiring or B2 control/result artifacts.
- No S03-011 republication attempted.

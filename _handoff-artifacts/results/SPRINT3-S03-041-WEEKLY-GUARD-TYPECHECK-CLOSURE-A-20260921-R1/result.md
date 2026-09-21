# SPRINT3-S03-041-WEEKLY-GUARD-TYPECHECK-CLOSURE-A-20260921-R1

state: READY
terminal: S03_041_WEEKLY_GUARD_TYPECHECK_CLOSURE_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T19:47:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: ce4e41c0bf0ba6c1c31c93c5a40d31d3af907643
published-master-sha: d84680b23477b0d61cd972e97a851ba3ea7c513f
product-commit-sha: d84680b23477b0d61cd972e97a851ba3ea7c513f
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-040-SPRINT2-REPAIR-GUARD-CANONICAL-PUBLICATION-B2-20260921-R1
production-change: NO
test-change: YES

## Summary

Closed the **Sprint3 weekly regression guard typecheck gap**: runtime vitest for `sprint2-repair-sprint3-weekly-regression-guard.test.ts` already passed on canonical master, but full `npm run typecheck -w @shared-world/web` failed on guard-test typings only. Applied the smallest semantics-preserving test fixes and published to GitHub `master`.

## Typecheck diagnostics (before)

Reproduced once on local tree @ pickup (`ce4e41c` guard source on `origin/master`):

```
src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts(...): error TS2554: Expected 2 arguments, but got 1.
  — validateSprint3Config(createSprint3Balance090ConfigInput()) missing Sha256Provider

src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts(...): error TS2322: Type 'string | SeededRngState' is not assignable to type 'string'.
  — otlRngState observation field

src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts(...): error TS2322: Type 'Sprint1RunSession | null' is not assignable to type 'Sprint1RunSession'.
  — runtimeFromStore return after store lookup
```

After fixing the three semantic errors, a deep `packages/simulation-core/src/.../sprint3-config-defaults.js` import surfaced **TS6059 rootDir** violations; replaced with package exports + test-local `createSprint3Balance090ConfigInputForWeeklyGuard()` mirroring balance-090 OTL policy (same runtime semantics as canonical 090 input).

## Files changed

| Path | Change |
|------|--------|
| `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | Provider arg for `validateSprint3Config`; JSON-serialize OTL `rngState`; null-safe `runtimeFromStore`; remove deep simulation-core import |

## Verification

| Gate | Result | Detail |
|------|--------|--------|
| Focused guard vitest | **PASS** | **4/4** |
| `npm run typecheck -w @shared-world/web` | **PASS** | all four tsc projects |

Commands (publish worktree @ `ce4e41c`):

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s03-041-publish-wt
npm run test -- --run apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts
npm run typecheck -w @shared-world/web
git push origin HEAD:master
```

## GitHub publication

| Field | Value |
|-------|-------|
| Parent on master | `ce4e41c0bf0ba6c1c31c93c5a40d31d3af907643` |
| Publication commit | `d84680b23477b0d61cd972e97a851ba3ea7c513f` — Fix Sprint3 weekly regression guard test typings for web typecheck. |
| Push | `ce4e41c..d84680b` → `origin/master` |

Readback: `origin/master` contains `createSprint3Balance090ConfigInputForWeeklyGuard`, `sprint3ConfigSha256Provider`, and `JSON.stringify(otl.rngState)` in the guard test blob on `d84680b`.

## Policy

- Did not read or edit B2 control files.
- Did not change Sprint2/Sprint3 formal status artifacts.
- No unrelated product/source changes beyond the single guard test file.

## Terminal

**READY** — Sprint2-repair Sprint3 weekly guard remains exactly-once/deterministic at runtime; `@shared-world/web` typecheck is clean with fix on canonical GitHub master.

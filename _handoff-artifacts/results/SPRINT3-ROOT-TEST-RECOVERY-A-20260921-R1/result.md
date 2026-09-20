# SPRINT3-ROOT-TEST-RECOVERY-A-20260921-R1

state: READY
terminal: SPRINT3_ROOT_TEST_RECOVERY_PUBLISHED
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T05:53:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: ec6b62b318bc738cdc8fba21ef6d3ceb449893d2
product-commit-sha: 0c9c6a5ea5b8ecbfbd8071a81888d18e5591078d
pre-publication-origin-head: 814a28217eb8ab9ababde382600ea45828a2480b
local-worktree-head-at-pickup: fbb83b1cd7691cdc7793e0b14a124a783f55a332
evidence-worktree: _handoff-artifacts/.tmp-root-test-recovery @ 814a282 (pre-repair baseline)
predecessor: SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES

## Summary

Fresh root **`npm run test`** on canonical **`origin/master`** (pre-repair @ **`814a282`**) reported **44** failures / **1804** passed across **12** files — not the stale post-S03-014 count (**41** / **1793**). Bounded repairs restore **1848/1848** root vitest pass on published **`ec6b62b`**: Sprint2 **`sprint2IdentityBindings`** wiring for Sprint1 CLI/harnesses, **`simulation-core`** public re-exports for UI-009 tournament test fixtures, corrupted **`displayFormat`** literals, stale **0.5.0 → 0.6.0** identity schema assertions, shell bootstrap copy, large-hash test timeout, and removal of a dead UI-009 import assertion.

## Pre-repair failure classification (@ `814a282`)

| Class | Count | Files / theme |
|-------|------:|---------------|
| Sprint2 integration — missing `sprint2IdentityBindings` on `createSprint1RunSession` / CLI | 27 | `sprint1-output.test.ts`, `cli.sprint1.test.ts`, `sprint1-verification.test.ts` |
| Sprint2 integration — corrupted `displayFormat` (`??` vs `・`) in tournament fixtures | 9 | `sprint2-tournament-battle-atomic-adapter.test.ts`, `sprint2-tournament-match-handoff.test.ts` |
| Stale test boundary — UI-009 imports package entry without exported fixtures | 6 | `competition-engine.test.ts`, `competition-knockout-*.test.ts`, `competition-bracket-progress.test.ts` |
| Stale assertion — SimulationIdentity / UI copy | 3 | `ui002.session-presets.test.ts`, `shell-and-client.test.tsx`, `sprint1-output.test.ts` |
| Environment / perf — 250k-event hash under 15s default vitest timeout | 1 | `year-start-aggregate-canonical-hash.test.ts` |

## Product commit

```text
0c9c6a5 Fix root vitest failures after Sprint2 identity and UI-009 package boundary.
```

**13** source files: `packages/simulation-core/src/index.ts`, `tournament-battle-atomic.fixture.ts`, `sprint2-tournament-match-handoff.test.ts`, `year-start-aggregate-canonical-hash.test.ts`; `apps/simulator` CLI + Sprint1 verification/output tests; `apps/web` UI-002/UI-001/UI-009 tests.

## Commands / results (@ **`ec6b62b`** after publish readback)

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
npm run build -w @shared-world/simulation-core
npm run typecheck
npm run test
```

| Gate | Result |
|------|--------|
| Root `npm run test` | **PASS** — **116** files, **1848/1848** tests |
| Root `npm run typecheck` | **PASS** |
| `@shared-world/simulation-core` build | **PASS** |

## Collision guard

- **B2 control files:** not edited.
- **S03-009 / S03-011:** not reverted; repairs are harness/export/assertion only.
- **No** repo-wide Prettier, test weakening, or gameplay rule changes.

## Terminal

**READY** — Fresh current-master root-test evidence with all safe bounded failures repaired and published on canonical **`master` @ `ec6b62b`**.

# SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1

state: BLOCKED
terminal: SPRINT3_S03_011_FIRST_USE_MATCHID_BLOCKED_MISSING_S03_009_CANONICAL
verificationOutcome: PASS_LOCAL / FAIL_CANONICAL_PUBLISH
lane: A
updatedAt: 2026-09-21T03:56:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pre-publication-origin-head: 9ab025205a05e0905da69349a5b2ea80c04b488c
local-head-at-verification: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
predecessor: SPRINT3-SCOPE-AUTHORITY-RECONCILIATION-A-20260921-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (local worktree only; **not** pushed to canonical master)

## Summary

Bounded **S03-011** first-use MatchId persistence is implemented and verified in the local `simulation-core` worktree (pure helpers + battle-commit hook + FUM-001..005). **Canonical publication remains BLOCKED:** `origin/master` @ **`9ab0252`** still lacks B2-owned **S03-009** persisted runtime surfaces required to compile and run the battle-commit adapter. Lane A did **not** commit or push B2 weekly wiring files to avoid collision with `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`.

## Exact blocker (fresh read @ 2026-09-21)

| Missing on `origin/master` | Evidence |
|-----------------------------|----------|
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts` | Not in tree (`git cat-file -e origin/master:…` → fail) |
| `packages/simulation-core/src/sprint3/process-original-technique-lifecycle-week.ts` | Not in tree |
| `Sprint1RunRuntimeState.originalTechniqueLifecycleRuntime` | Absent in `origin/master` `sprint1-run-session.ts` |
| B2 OTL runtime exports | Absent from `origin/master` `index.ts` |

**Note:** `sprint3Config` on `Sprint1RunContext` **is** present on canonical master (S03-010 era); the gap is specifically **persisted founding-history runtime** from S03-009.

**Unblock:** B2 publishes S03-009 product to canonical `master`; A fresh-reads/rebases and publishes the narrow S03-011 commit (processor + hook + tests + exports) without editing B2 control artifacts.

## Local product changes (ready after unblock)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/persist-original-technique-first-use-match-id.ts` | Collect successful in-battle technique uses; apply `firstUseMatchId` once on matching `foundingHistories`; `applyOriginalTechniqueFirstUseMatchIdAfterBattleCommit` |
| `packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts` | FUM-001..005 |
| `packages/simulation-core/src/sprint3/constants.ts` | `ORIGINAL_TECHNIQUE_FIRST_USE_MATCH_ID_PROCESSOR_ID` |
| `packages/simulation-core/src/sprint1/commit-run-battle-plan.ts` | Preserve OTL runtime on draft clone; post-store battle-commit hook |
| `packages/simulation-core/src/index.ts` | Public exports for S03-011 helpers |

Semantics: on **completed** battles with Sprint3 OTL enabled and runtime bound, technique IDs with `successfulUseCountDelta > 0` in `developmentEffects` set `foundingHistories[].firstUseMatchId` for matching `newTechniqueId` **once** (unset → authoritative `BattleResult.matchId`; never overwrite).

## Verification (local full tree @ 2026-09-21)

```powershell
cd D:\xampp\htdocs\dollworld
npm run typecheck -w @shared-world/simulation-core
npm run build -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/original-technique-first-use-match-id.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/generated-technique-registration.test.ts
```

| Check | Result |
|-------|--------|
| `simulation-core` typecheck | **PASS** |
| `simulation-core` build | **PASS** |
| Sprint3 focused vitest (4 files) | **PASS** — **31/31** (incl. FUM-001..005) |
| Isolated worktree @ `origin/master` `9ab0252` + S03-011 deltas | **FAIL** typecheck — missing OTL runtime module/types (`originalTechniqueLifecycleRuntime`, `original-technique-lifecycle-runtime-state.js`) |
| `git push origin HEAD:master` (S03-011 only) | **NOT ATTEMPTED** — would not compile on canonical tip |

### Canonical publish worktree typecheck (representative errors)

```text
src/sprint3/persist-original-technique-first-use-match-id.ts(17,8): error TS2307: Cannot find module './original-technique-lifecycle-runtime-state.js'
src/sprint1/commit-run-battle-plan.ts(132,24): error TS2339: Property 'originalTechniqueLifecycleRuntime' does not exist on type 'Sprint1RunRuntimeState'
```

Worktree path: `_handoff-artifacts/.tmp-s03-011-verify-origin` (detached @ `9ab0252`).

## Acceptance mapping (local)

| ID | Requirement | Evidence |
|----|-------------|----------|
| FUM-001 | First successful qualifying use records MatchId | `original-technique-first-use-match-id.test.ts` |
| FUM-002 | Later battles do not overwrite | FUM-002 |
| FUM-003 | Non-successful use → no write | FUM-003 |
| FUM-004 | Deterministic technique-id collection | FUM-004 |
| FUM-005 | Serialization stable aside from new field | FUM-005 |

## Non-goals honored

No B2 weekly accumulation/generation wiring duplicated. No Cursor B2 control/task/result artifacts edited. No speculative canonical product push without S03-009.

**BLOCKED** — Re-dispatch after B2 S03-009 canonical landing; executor may consume GitHub Inbox to IDLE with this terminal evidence.

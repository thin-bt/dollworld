# SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1

state: READY
terminal: SPRINT3_S03_009_ORIGINAL_TECHNIQUE_RUNTIME_WIRING_B2_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T04:08:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
local-head-at-verification: 6e515b3e8d242574f667e6c228bc4bbfb26c3583
origin-master-head-at-verification: 9ab025205a05e0905da69349a5b2ea80c04b488c
predecessor-terminal: SPRINT3_S03_011_FIRST_USE_MATCHID_BLOCKED_MISSING_S03_009_CANONICAL
failover-from-lane: B2
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (local worktree; S03-009 simulation-core deltas **not yet committed** to canonical master)

## Summary

Bounded S03-009 **original-technique runtime wiring** is present and verified in the local `packages/simulation-core` worktree: persisted per-person research/cooldown on `Sprint1RunRuntimeState`, autonomous weekly research increment (`resolve-autonomous-original-technique-weekly-research-increment.ts`), `processOriginalTechniqueLifecycleWeek` delegating generation to existing `evaluateOriginalTechniqueGenerationAttempt` with OTL RNG, production hook in `runSprint1WeeklyStep` when `sprint3Config` is bound, and OTR-001..009 tests including weekly-step invocation. Sprint3 lifecycle unbound/disabled remains no-op. S03-010 catalog synthesis and S03-011 first-use MatchId scope were not expanded in this slice.

## Product changes (simulation-core)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts` | Persisted runtime schema + validation |
| `packages/simulation-core/src/sprint3/resolve-autonomous-original-technique-weekly-research-increment.ts` | Autonomous weekly increment boundary |
| `packages/simulation-core/src/sprint3/process-original-technique-lifecycle-week.ts` | Weekly accumulation + generation processor |
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts` | OTR-001〜009 wiring tests |
| `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` | Production weekly-step invocation |
| `packages/simulation-core/src/sprint1/sprint1-run-session.ts` | Optional `originalTechniqueLifecycleRuntime` |
| `packages/simulation-core/src/sprint1/sprint1-run-context.ts` | Optional `sprint3Config` binding |
| `packages/simulation-core/src/sprint1/validate-sprint1-run-session.ts` | Runtime validation |
| `packages/simulation-core/src/sprint1/validate-sprint1-weekly-transition.ts` | Trusted transition draft field |
| `packages/simulation-core/src/sprint3/constants.ts` | OTL RNG seed label |
| `packages/simulation-core/src/index.ts` | Public exports |

## Verification (lane A @ 2026-09-21)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Vitest OTR + OTL + TE bundle | attempt1 | **PASS** — **28/28** (3 files) |
| `npm run build` (`packages/simulation-core`) | attempt1 | **PASS** |
| Root `npm run check` | — | **Not run** (lane A formal recovery; out of slice scope) |

```powershell
cd D:\xampp\htdocs\dollworld
git rev-parse HEAD
npx vitest run packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts
cd packages\simulation-core; npm run build
```

## Acceptance mapping

| ID | Requirement | Evidence |
|----|-------------|----------|
| OTR-001 | Deterministic accumulation | `original-technique-lifecycle-runtime.test.ts` |
| OTR-002 | Below threshold, no roll | OTR-002 |
| OTR-003 | Threshold attempt | OTR-003 |
| OTR-004 | Failure retention + cooldown | OTR-004 |
| OTR-005 | Cooldown decrement, no reroll | OTR-005 |
| OTR-006 | Success founding history | OTR-006 |
| OTR-007 | Disabled lifecycle no-op | OTR-007 |
| OTR-009 | Production weekly-step wiring | `sprint1-weekly-step.ts` + OTR-009 |

## Follow-up

- **Canonical publish:** commit/push S03-009 product files only (exclude unrelated S03-010/S03-011 deltas unless explicitly bundled by control).
- **S03-011 unblock:** after S03-009 on `origin/master`, lane A may publish first-use MatchId persistence (`SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1`).

## Non-goals honored

No TechniqueCatalog synthesis / school registration (S03-010). No first-use MatchId battle persistence expansion (S03-011). No Cursor B2 control files read or edited.

**READY** — S03-009 slice verified on lane A failover pickup; downstream executor should commit/push product deltas and consume GitHub Inbox to IDLE.

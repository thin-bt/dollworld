# SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1

state: READY
terminal: SPRINT3_S03_009_ORIGINAL_TECHNIQUE_RUNTIME_WIRING_B2_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T05:13:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
local-head-at-verification: b81df17f9a8e53a930f2e0be43d8c359ed641162
origin-master-head-at-verification: b81df17f9a8e53a930f2e0be43d8c359ed641162
publication-commit: b81df17f9a8e53a930f2e0be43d8c359ed641162
pre-publication-origin-head: bacf98105143eb0c7b19b810d044d843c35c5579
failover-from-lane: B2
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
production-change: YES (published to `origin/master`)

## Summary

Lane A recovered and **published** bounded S03-009 original-technique runtime wiring to canonical `master` @ **`b81df17`**. Persisted per-person research/cooldown on `Sprint1RunRuntimeState`, autonomous weekly increment boundary, `processOriginalTechniqueLifecycleWeek` (delegating generation to `evaluateOriginalTechniqueGenerationAttempt` with OTL RNG), and production invocation from `runSprint1WeeklyStep` when `sprint3Config` is bound. S03-010 catalog synthesis and S03-011 first-use MatchId deltas were **excluded** from the publication commit.

## Product changes (simulation-core @ b81df17)

| Path | Role |
|------|------|
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts` | Persisted runtime schema + validation |
| `packages/simulation-core/src/sprint3/resolve-autonomous-original-technique-weekly-research-increment.ts` | Autonomous weekly increment boundary |
| `packages/simulation-core/src/sprint3/process-original-technique-lifecycle-week.ts` | Weekly accumulation + generation processor |
| `packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts` | OTR-001〜009 wiring tests |
| `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` | Production weekly-step invocation |
| `packages/simulation-core/src/sprint1/sprint1-run-session.ts` | Optional `originalTechniqueLifecycleRuntime` |
| `packages/simulation-core/src/sprint1/validate-sprint1-run-session.ts` | Runtime validation |
| `packages/simulation-core/src/sprint1/validate-sprint1-weekly-transition.ts` | Trusted transition draft field |
| `packages/simulation-core/src/index.ts` | Public exports (runtime + processor + increment) |

## Verification (lane A @ 2026-09-21)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Vitest OTR + OTL + TE bundle | attempt1 | **PASS** — **28/28** (3 files) |
| `npm run build` (`@shared-world/simulation-core`) | attempt1 | **PASS** |
| `git push origin HEAD:master` | attempt1 | **PASS** — `bacf981..b81df17` |
| GitHub readback `origin/master` | attempt1 | **PASS** — OTL runtime modules + `originalTechniqueLifecycleRuntime` present |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime.test.ts packages/simulation-core/src/sprint3/original-technique-lifecycle.test.ts packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts
npm run build -w @shared-world/simulation-core
git fetch origin master
git cat-file -e origin/master:packages/simulation-core/src/sprint3/original-technique-lifecycle-runtime-state.ts
git cat-file -e origin/master:packages/simulation-core/src/sprint3/process-original-technique-lifecycle-week.ts
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

- **S03-011 unblock:** `SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1` may publish first-use MatchId persistence now that S03-009 runtime surfaces exist on `origin/master`.

## Non-goals honored

No TechniqueCatalog synthesis / school registration (S03-010). No first-use MatchId battle persistence (S03-011). No Cursor B2 control files read or edited.

**READY** — S03-009 canonical publication complete; GitHub Inbox may be consumed to IDLE.

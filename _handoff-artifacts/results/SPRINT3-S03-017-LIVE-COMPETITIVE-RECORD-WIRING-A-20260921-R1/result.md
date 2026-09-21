# SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1

state: READY
terminal: S03_017_LIVE_COMPETITIVE_RECORD_WIRING_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T09:50:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: f904fc6ca5ddeb9eba1dca72f5064a5d654255de
product-commit-sha: f904fc6ca5ddeb9eba1dca72f5064a5d654255de
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-016-LIVE-MASTER-QUALIFICATION-PERSISTENCE-ROLE3-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

Closed the S03-016 residual gap: live weekly qualification could consume optional Sprint2 competitive records, but production did not supply authoritative maps.

Implemented bounded wiring:

- `live-sprint2-competitive-record-runtime-state.ts` — validated `Sprint2CompetitiveRecordRuntimeState` on `Sprint1RunRuntimeState` (Sprint3-owned bridge; no Sprint1→Sprint2 import edge).
- `resolve-live-competitive-records-for-qualification.ts` — resolves runtime to `CompetitiveRecordsByPersonId`.
- `sprint1-weekly-step.ts` — passes resolved maps into `refreshQualifiedMasterFlagsInWorldState` and `materializeLiveEnrollmentQueueBoundaries` (deterministic zero defaults when absent).
- `competition-world-runtime-sync.ts` + `routes-simulation.ts` — mirrors UI009 `competitiveRecordByPersonId` into world runtime before/after weekly step so live production path supplies authoritative records when available.

**Live call chain (post-fix):** UI009 store → `syncCompetitionStoreCompetitiveRecordsIntoWorldRuntime` → `Sprint1RunRuntimeState.sprint2CompetitiveRecordRuntime` → `runSprint1WeeklyStep` → `resolveLiveCompetitiveRecordsForQualification` → refresh + enrollment materialization → S03-016 derivation/evaluator.

## Pickup baseline

| Finding | Detail |
|---------|--------|
| Gap class | **PRODUCT_GAP** |
| S03-016 note | Weekly step did not pass Sprint2 record maps |
| Authoritative live source | UI009 `CompetitionSessionStore.state.competitiveRecordByPersonId` (not previously mirrored on session runtime) |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-competitive-record-wiring.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-master-qualification-persistence.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| LCR-001..003 | **PASS** | `live-competitive-record-wiring.test.ts` (3 tests) |
| S03-016 LQP regression | **PASS** | `live-master-qualification-persistence.test.ts` |
| S03-013 LEC regression | **PASS** | `live-mentorship-queue-materialization.test.ts` |
| `npm run check` | **PASS** | **119** files, **1864/1864** tests; format/lint/typecheck/wiki/build green |

## Scope / policy

- **Not** edited: B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- S03-015 battle-consumption semantics unchanged (Prettier-only drift recovery on adjacent files for root gate).
- No Sprint4 work.

## Collision guard

- **CURSOR_B2_INBOX.md** / **CURSOR_B2_ACTIVE_TASK.md**: not read or edited for task execution.

## Terminal

**READY** — live weekly path supplies authoritative competitive records when UI009 store has them; absent maps preserve deterministic zeroed derivation per S03-016.

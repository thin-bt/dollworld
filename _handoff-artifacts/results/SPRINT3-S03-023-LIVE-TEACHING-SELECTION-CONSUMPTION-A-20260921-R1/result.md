# SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1

state: READY
terminal: S03_023_LIVE_TEACHING_SELECTION_CONSUMPTION_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T12:02:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: 47bdb9bf97471a5b66433d8ca05e260c6dbd51d3
product-commit-sha: 47bdb9bf97471a5b66433d8ca05e260c6dbd51d3
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

Confirmed S03-022 gap: `materializeLiveExplicitWeeklyTeachQueueRecords` → `deriveLiveExplicitWeeklyTeachDiscipleRequests` re-ran `buildTeachingSelectionRecord` + `evaluateTechniqueTeachingSelection` and did **not** read `techniqueTeachingSelectionRuntime`.

Closed with minimal wiring:

- `sprint1-weekly-step.ts` passes persisted `techniqueTeachingSelectionRuntime` into live explicit-teach materialization (after `processTechniqueTeachingSelectionWeek`).
- `materialize-live-mentorship-entrypoint-queues.ts` extends `MaterializeLiveExplicitTeachQueueInput` and forwards runtime + `absoluteWeek` into derivation.
- `derive-live-explicit-weekly-teach-disciple-requests.ts` resolves technique id from pair snapshot when present: same-week snapshot always; prior-week snapshot only when S03-008 re-evaluation is **not** due; otherwise legacy fallback path unchanged.

**Live call chain (consumption):** `processTechniqueTeachingSelectionWeek` (persist) → `materializeLiveExplicitWeeklyTeachQueueRecords` (consume snapshot) → queued explicit-teach `discipleRequests`.

## Source evidence

| Finding | Detail |
|---------|--------|
| Pre-fix | Independent selection evaluation at request-build time |
| Post-fix | `pickTechniqueIdFromPersistedSelectionSnapshot` + `lookupTechniqueTeachingSelectionPairSnapshot` |
| B2 boundary | No B2 control-file edits; S03-021 materialization semantics preserved aside from consuming A-owned persisted selection |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-technique-teaching-selection-wiring.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts
npm run typecheck --workspace @shared-world/simulation-core
npm run test
npm run wiki:check
npm run build
```

| Gate | Result | Detail |
|------|--------|--------|
| TTS-L002 | **PASS** | Queued explicit-teach technique matches persisted ranked snapshot |
| TTS-L001 / TTS-L004 | **PASS** | Existing S03-022 regression retained |
| LWT S03-021 suite | **PASS** | `live-explicit-weekly-teach-wiring.test.ts` |
| Full `npm run test` | **PASS** | **123** files, **1888/1888** tests |
| `wiki:check` + `build` | **PASS** | Post-change publication gates |

## GitHub canonical readback

```text
git ls-remote origin refs/heads/master
47bdb9bf97471a5b66433d8ca05e260c6dbd51d3

git show origin/master:packages/simulation-core/src/sprint1/sprint1-weekly-step.ts
techniqueTeachingSelectionRuntime: working.techniqueTeachingSelectionRuntime
```

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- Rebased/fast-forwarded to `origin/master` (`f651f88`) before product commit.
- No Sprint4 work.

## Terminal

**READY** — live explicit-teach materialization deterministically consumes persisted technique teaching-selection snapshots for the same master/disciple/week (with S03-008 re-evaluation fallback contract) on canonical master.

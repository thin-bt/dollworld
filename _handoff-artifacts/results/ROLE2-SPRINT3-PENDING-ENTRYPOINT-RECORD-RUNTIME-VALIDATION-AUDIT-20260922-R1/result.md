# ROLE2-SPRINT3-PENDING-ENTRYPOINT-RECORD-RUNTIME-VALIDATION-AUDIT-20260922-R1

state: TERMINAL
terminal: ROLE2_SPRINT3_PENDING_ENTRYPOINT_RECORD_RUNTIME_VALIDATION_SOURCE_GAP_CONFIRMED
verificationOutcome: SOURCE_GAP_CONFIRMED
resultClass: IMPLEMENTATION_ANALYSIS
role: Role2
sprint: Sprint3
updatedAt: 2026-09-22T19:20:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
priority: DEADLINE_CRITICAL

## Finding

Current-master `validateSprint3MentorshipEntrypointRuntimeState()` validates the three completed-history arrays entry-by-entry, but the two **pending input queues** remain only dense-array checked and then accepted through `cloneValidatedPlainJson()`:

- `pendingEnrollmentBoundaries` is typed as `readonly EnrollmentAssignmentRecord[]`.
- `pendingExplicitWeeklyTeachRecords` is typed as `readonly ExplicitWeeklyTeachActionRecord[]`.
- At the persisted runtime trust boundary, neither queue has an entry validator before the final typed cast.

Therefore arbitrary plain-JSON values/objects that satisfy only the outer dense-array requirement can enter a successfully validated runtime state as typed pending records. Examples include `{}` in `pendingEnrollmentBoundaries`, malformed enrollment candidates / unknown special reasons, or an explicit-teach record with an unknown `selectedWeeklyAction`, malformed disciple request, negative/non-finite numeric fields, or unknown mentorship relation kind. This is a distinct remaining trust-boundary gap from S03-058/S03-063/S03-067/S03-073/S03-074, which hardened persisted assignment/completed-history fields.

## Current-master evidence

`packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`:

1. Runtime state declares pending arrays as typed `EnrollmentAssignmentRecord[]` and `ExplicitWeeklyTeachActionRecord[]`.
2. Validation obtains each pending array only with `snapshotDenseArrayOrFail(...)`.
3. The failure gate checks only whether those outer arrays are defined.
4. The success object uses `cloneValidatedPlainJson(pendingEnrollmentBoundaries)` and `cloneValidatedPlainJson(pendingExplicitWeeklyTeachRecords)` with no record-level parser/semantic validation.
5. In contrast, completed histories now use `parseValidatedCompletedHistoryEntries(...)` and dedicated entry validators.

`packages/simulation-core/src/sprint3/types.ts` shows both pending record contracts contain nested closed unions and structured records, so plain-JSON validity is insufficient to establish their TypeScript contracts.

## Canonical implementation instruction

Create a focused Sprint3 product-gap closure on the next free A/B2 lane. Do **not** weaken existing completed-history or assignment validation.

Implement persisted runtime validators for both pending record types and all nested contract data needed to prove the existing TypeScript shapes at the trust boundary. At minimum:

- `EnrollmentAssignmentRecord`: reject unknown keys; require non-empty child ID; validate child age as the contract/policy expects; validate `activeSpecialReasons` against the closed `EnrollmentSpecialReason` vocabulary; validate every `EnrollmentMasterCandidate`, including IDs, booleans, finite/safe numeric score/count fields, intake acceptance closed union, and nested qualification record with its closed enum fields; validate optional temporary-guidance parent ID.
- `ExplicitWeeklyTeachActionRecord`: reject unknown keys; require non-empty master ID; boolean pipeline eligibility; non-negative/safe formal-disciple count and valid teaching score; `selectedWeeklyAction` closed union; validate every disciple request, including IDs, learning tier closed union, mentorship relation closed union, evaluation inputs, optional incomplete-focus boolean, and nested `TeacherCanTeachContext` contract rather than casting arbitrary JSON.
- Preserve deterministic clone/freeze behavior and existing supported schema-version compatibility unless canonical spec explicitly requires a migration.
- Add negative regression cases proving malformed/unknown nested pending payloads are rejected and positive round-trip cases using producer-valid pending records.
- Run focused runtime-state tests + relevant enrollment/weekly-teach tests + simulation-core typecheck. Any product SHA after the current release-gate binding requires a fresh root gate before Sprint3 closure.

If an existing canonical validator already owns one of these nested contracts, reuse it rather than duplicating policy. Fresh-read producer/evaluator source before fixing numeric bounds so the persisted validator mirrors canonical producer contracts instead of inventing new balance rules.

## Lane disposition

At audit time A is PREPARED with `SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1`; B2 is PREPARED with `SPRINT3-S03-075-POST-S03-074-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1`. No lane was overwritten. Dispatch this finding immediately when either lane becomes IDLE, with Sprint3 deadline-critical priority, unless a newer non-conflicting release blocker has precedence.

## Terminal

**ROLE2_SPRINT3_PENDING_ENTRYPOINT_RECORD_RUNTIME_VALIDATION_SOURCE_GAP_CONFIRMED** — concrete current-master persisted pending-queue trust-boundary gap identified and canonical implementation/verification requirements recorded.
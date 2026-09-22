# ROLE2 Sprint3 pending entrypoint runtime validation gap — 2026-09-22 R2

status: SOURCE_GAP_CONFIRMED
sprint: Sprint3
priority: DEADLINE_CRITICAL
role: Role2 direct execution
canonical-authority: GitHub thin-bt/dollworld master

## Finding

`validateSprint3MentorshipEntrypointRuntimeState()` validates `pendingEnrollmentBoundaries` and `pendingExplicitWeeklyTeachRecords` only as dense arrays. It does not validate each element against `EnrollmentAssignmentRecord` or `ExplicitWeeklyTeachActionRecord` before casting the frozen object to `Sprint3MentorshipEntrypointRuntimeState`.

Current master sequence:

1. `snapshotDenseArrayOrFail(...)` is called for both pending queues.
2. No per-entry parser/validator is called for either pending queue.
3. Completed-history queues do have per-entry validation through `parseValidatedCompletedHistoryEntries(...)`.
4. The pending queues are finally accepted via `cloneValidatedPlainJson(...)` and the whole object is cast to `Sprint3MentorshipEntrypointRuntimeState`.

This permits plain-JSON but contract-invalid pending records (unknown closed-union values, missing required nested fields, invalid numeric domains, malformed candidate/request structures) to cross the persisted runtime trust boundary as typed records.

## Required implementation closure

Add dedicated runtime validators for both pending record contracts and invoke them entry-by-entry before success:

- `EnrollmentAssignmentRecord` pending entries: validate object shape, unknown keys, required IDs/weeks, assignment kind/reason closed unions, candidate records and their nested qualification/intake facts, and all required finite/safe-integer numeric constraints according to the current producer/type contract.
- `ExplicitWeeklyTeachActionRecord` pending entries: validate object shape, unknown keys, master/action identity, disciple request records, mentorship relation closed union, technique/person IDs, scores/limits and all nested required fields according to the current producer/type contract.
- Reject any malformed pending element; do not sanitize malformed input into a valid-looking record.
- Preserve canonical ordering/producer-valid round-trip behavior; do not change product policy or producer semantics.

## Regression acceptance

Add focused tests proving:

1. unknown closed-union values in each pending queue fail validation;
2. missing/malformed nested required payload fails;
3. invalid numeric values (NaN/Infinity/non-safe integer where integer is required) fail;
4. unknown keys at nested contract boundaries fail where the producer contract is closed;
5. current producer-valid pending enrollment and weekly-teach records validate and round-trip without semantic mutation;
6. existing completed-history and mentorship assignment validation remains green.

After product publication, run focused Sprint3 tests and a fresh applicable root gate because this changes persisted-runtime trust-boundary product bytes.

## Dispatch state

No lane overwrite performed in this Role2 run. Fresh canonical read showed A PREPARED on `SPRINT2-WF5-PARTICIPANT-ABILITY-APTITUDE-UI-A-20260922-R1` and B2 PREPARED on `SPRINT3-POST-WF14-PRETTIER-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1`. This gap is executable immediately when a compatible lane becomes IDLE.

# ROLE2-SPRINT3-ENROLLMENT-OUTCOME-KIND-RUNTIME-VALIDATION-AUDIT-20260922-R1

state: TERMINAL
terminal: SOURCE_GAP_CONFIRMED
resultClass: SOURCE_GAP_CONFIRMED
role: Role2
sprint: Sprint3
updatedAt: 2026-09-22T11:22:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Finding

Persisted `Sprint3MentorshipAssignmentEntry.enrollmentOutcomeKind` is typed as `EnrollmentAssignmentOutcome["kind"]`, but `validateMentorshipAssignmentEntry` currently validates only `typeof === "string"` and then casts arbitrary strings to that union. Unknown persisted outcome kinds therefore pass runtime validation and become canonical mentorship runtime state.

This is the same trust-boundary class that S03-058 closed for `mentorshipRelationKind`, but it is a distinct field and remains open on current master.

## Source evidence

- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`: `enrollmentOutcomeKind` only receives string validation, followed by `as EnrollmentAssignmentOutcome["kind"]`.
- The same validator now correctly uses `isMentorshipRelationKind` for the adjacent relation-kind field, demonstrating the intended persisted-runtime validation pattern.
- `Sprint3MentorshipAssignmentEntry` declares the outcome field as the closed `EnrollmentAssignmentOutcome["kind"]` union.

## Required closure

1. Define/reuse a canonical runtime guard for every legal `EnrollmentAssignmentOutcome["kind"]` value; do not duplicate an ad-hoc subset.
2. Reject unknown persisted `enrollmentOutcomeKind` at `/mentorshipByChildPersonId/<index>/enrollmentOutcomeKind`.
3. Preserve every currently legal outcome kind and schema compatibility.
4. Add focused regression proving an unknown string fails validation and legal assignment outcomes still validate.
5. Run focused Sprint3 mentorship runtime tests plus typecheck/format/lint for changed paths.
6. Publish to canonical master and verify readback before READY.

## Non-conflict

A is occupied by S03-062 evidence-ledger reconciliation. B2 was IDLE at audit time, so implementation can be dispatched there without overlapping A's documentation/evidence task.

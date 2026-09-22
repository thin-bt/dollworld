# SPRINT3-S03-058-MENTORSHIP-RUNTIME-RELATION-KIND-VALIDATION-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
source-gap: _handoff-artifacts/results/ROLE2-SPRINT3-MENTORSHIP-RUNTIME-RELATION-KIND-VALIDATION-AUDIT-20260922-R1/result.md

## Objective

Close the confirmed persisted Sprint3 mentorship runtime validation hole without widening scope. `MentorshipRelationKind` is a closed three-value domain but the runtime validator accepts arbitrary strings by cast.

## Required implementation

1. Fresh-read protocol, current master, source-gap result, and current B2 inbox before claim.
2. Locate the canonical `MentorshipRelationKind` declaration and reuse/create one canonical allowed-value guard without duplicating domain truth unnecessarily.
3. Tighten `validateMentorshipAssignmentEntry` so a present `mentorshipRelationKind` is accepted only when it is one of:
   - `formal_master_disciple`
   - `parent_master_disciple`
   - `parent_temporary_guidance`
   Preserve legitimate `undefined` / absent relation behavior.
4. Emit a precise validation issue path for an invalid persisted relation kind, following existing runtime-state validation conventions.
5. Add focused regression proving all three valid values are accepted and at least one unknown string is rejected. Include clone/round-trip coverage when existing test conventions make it applicable.
6. Do not change persisted schema version unless an existing compatibility rule explicitly requires it; this task tightens validation to the already-declared type contract.
7. Run focused Sprint3 runtime tests plus relevant typecheck/format/lint. Do not run an unnecessary duplicate full root gate if the lane's current policy reserves that for a follow-up gate task.
8. Publish product/test delta to canonical `master`, verify GitHub readback, and publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-058-MENTORSHIP-RUNTIME-RELATION-KIND-VALIDATION-B2-20260922-R1/result.md`.

## Non-conflict guard

Cursor A owns S03-057 browser evidence. Do not read/edit A control files or S03-057 work product except shared product source needed for compilation. Do not modify reverse-disciple UI-005 contract in this task.

READY is forbidden unless the validator fix and regression are present on canonical GitHub master.
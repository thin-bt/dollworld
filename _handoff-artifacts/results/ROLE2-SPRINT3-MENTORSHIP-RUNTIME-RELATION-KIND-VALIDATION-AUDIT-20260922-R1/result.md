# ROLE2-SPRINT3-MENTORSHIP-RUNTIME-RELATION-KIND-VALIDATION-AUDIT-20260922-R1

state: TERMINAL
terminal: SOURCE_GAP_CONFIRMED
resultClass: IMPLEMENTATION_ANALYSIS
role: Role2
sprint: Sprint3
updatedAt: 2026-09-22T08:21:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Summary

Fresh canonical source audit found a validation hole in the persisted Sprint3 mentorship runtime. `MentorshipRelationKind` is a closed union (`formal_master_disciple | parent_master_disciple | parent_temporary_guidance`), but `validateMentorshipAssignmentEntry` currently accepts any string for `mentorshipRelationKind` and casts it to the union. This allows an invalid persisted relation kind to pass runtime-state validation and then be consumed by downstream mentorship/teaching logic as if it were typed canonical state.

## Evidence

- `packages/simulation-core/src/sprint3/types.ts`: `MentorshipRelationKind` is explicitly limited to three values.
- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`: `validateMentorshipAssignmentEntry` only checks `typeof raw === "string"`, then performs `raw as MentorshipRelationKind`; there is no membership check.
- `packages/simulation-core/src/sprint3/derive-live-explicit-weekly-teach-disciple-requests.ts`: live teaching derivation reads `entry.mentorshipRelationKind` from persisted runtime and forwards it into disciple requests. Therefore the validator is the trust boundary and must reject out-of-domain strings.

## Required closure

1. Add a canonical allowed-value constant/guard for `MentorshipRelationKind` (reuse an existing canonical constant if one exists; do not duplicate truth).
2. In `validateMentorshipAssignmentEntry`, reject any present relation kind outside the three accepted values with a precise validation issue path.
3. Preserve `undefined` where the enrollment outcome legitimately has no relation.
4. Add focused regression proving all three valid values are accepted and at least one unknown string is rejected; include clone/validation round-trip if that is the repository convention.
5. Do not alter runtime schema version unless repository compatibility rules require it: this is tightening validation to the already-declared type contract, not adding a new persisted field.
6. Run focused Sprint3 mentorship runtime tests/typecheck/format/lint for changed paths, publish to canonical master, and verify readback.

## Non-conflict disposition

Cursor A is already PREPARED for S03-055 reverse-disciple observability and B2 is PREPARED for S03-054 release evidence. This Role2 run therefore does not overwrite either lane. The gap is published as canonical implementation-analysis evidence for immediate dispatch when a lane becomes free.

## Terminal

**SOURCE_GAP_CONFIRMED** — persisted mentorship runtime currently accepts invalid `mentorshipRelationKind` strings despite the closed domain union.
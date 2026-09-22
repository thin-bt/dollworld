# ROLE2-SPRINT3-MENTORSHIP-ASSIGNMENT-SEMANTIC-INVARIANT-AUDIT-20260922-R1

state: TERMINAL
terminal: SOURCE_GAP_CONFIRMED
resultClass: SOURCE_GAP_CONFIRMED
role: Role2
sprint: Sprint3
updatedAt: 2026-09-22T12:20:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
production-change: NO

## Finding

`validateMentorshipAssignmentEntry` validates each persisted field independently but does not validate the semantic relationship among `enrollmentOutcomeKind`, `selectedMasterPersonId`, and `mentorshipRelationKind`.

On current canonical source, an entry with `enrollmentOutcomeKind: "formal_master_assigned"` (or `"parent_master_assigned"`) is accepted even when `selectedMasterPersonId` and/or `mentorshipRelationKind` are absent. Conversely, optional master/relation fields can be present for non-assignment outcomes unless another layer happens to prevent it.

This creates a persisted runtime state that is structurally valid but cannot represent a usable active mentorship. `deriveLiveExplicitWeeklyTeachDiscipleRequests` later treats formal/parent assignment outcome kinds as active, then silently drops entries missing the master match or relation kind. Corrupt/incoherent canonical persisted state therefore crosses validation successfully and fails later as missing gameplay behavior rather than at the trust boundary.

## Evidence

- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`: `Sprint3MentorshipAssignmentEntry` makes `selectedMasterPersonId` and `mentorshipRelationKind` optional; `validateMentorshipAssignmentEntry` validates type/closed unions but has no cross-field invariant before returning the entry.
- `packages/simulation-core/src/sprint3/derive-live-explicit-weekly-teach-disciple-requests.ts`: `listDisciplesForMaster` recognizes only `formal_master_assigned` / `parent_master_assigned` as active, requires selected master equality, and skips undefined relation kind.

## Required implementation slice

Add an explicit persisted-state semantic invariant at `validateMentorshipAssignmentEntry` (or one canonical helper called there):

1. For active assignment outcomes (`formal_master_assigned`, `parent_master_assigned`), require both `selectedMasterPersonId` and `mentorshipRelationKind`.
2. Enforce outcome/relation consistency: formal assignment must bind the formal-master relation kind; parent assignment must bind the parent-temporary-guidance relation kind according to the existing `MentorshipRelationKind` authority names in `types.ts`.
3. For non-assignment outcomes, reject assignment-only master/relation payload unless the existing domain contract explicitly documents a retained-candidate meaning; do not silently normalize contradictory persisted input.
4. Add regression tests proving malformed active assignment combinations fail validation and valid formal/parent combinations remain accepted/canonicalized.
5. Do not broaden Sprint3 scope or change enrollment selection behavior; this is a persisted runtime trust-boundary closure only.

## Dispatch disposition

No lane was overwritten. At fresh read, Cursor A is PREPARED on `SPRINT3-S03-065-POST063-EVIDENCE-LEDGER-RECONCILIATION-A-20260922-R1` and Cursor B2 is PREPARED on `SPRINT3-S03-064-POST-S03-063-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1`. This finding is canonical implementation-ready work for the next free compatible lane.

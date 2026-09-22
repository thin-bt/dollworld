# SPRINT3-S03-067-MENTORSHIP-ASSIGNMENT-SEMANTIC-INVARIANT-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE / DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
authority-ref: master

## Objective
Close the persisted `Sprint3MentorshipAssignmentEntry` semantic-invariant gap identified by Role2: validation must reject internally contradictory assignment payloads, not merely validate each field independently.

## Required fresh-read
Before editing, read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, both lane inboxes, `docs/SPRINT_3_BACKLOG.md`, the current persisted Sprint3 runtime validator/tests, and current master. Claim A ACTIVE using the executor protocol before source changes.

## Product requirement
At the persisted runtime trust boundary, enforce outcome/payload coherence without changing the public domain meaning:
- `formal_master_assigned` requires a non-null selected master and the formal mentorship relation kind.
- `parent_master_assigned` requires a non-null selected master and the parent-temporary relation kind.
- non-assignment outcomes must not carry a selected master or mentorship relation payload that implies an active assignment.
- preserve all already accepted closed-union validation for `enrollmentOutcomeKind` and `mentorshipRelationKind`.
- do not broaden Sprint3 scope into Sprint4 retirement/lineage work.

Use the actual canonical enum/literal names in source; if the exact outcome/relation names differ from the shorthand above, implement the equivalent invariant against the existing types rather than inventing new values.

## Verification
Add focused regression tests proving every accepted coherent combination and rejection of contradictory combinations (assigned outcome with missing master/relation, formal/parent relation mismatch, and non-assignment outcome carrying assignment payload). Run the focused tests and the bounded repository checks required by current Sprint3 gate policy. Publish a terminal canonical result with changed paths, test counts/output, product commit SHA, and any remaining blocker.

## Non-conflict / hygiene
Do not touch B2-owned active work if any appears after pickup. Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`. Do not assign Sprint3 `CLOSED`; this is a product-gap closure slice only.
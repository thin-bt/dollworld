# ROLE1-S03-008-RELEASE-EVIDENCE-PRECONDITION-20260923-R15

state: TERMINAL
result: PASS
role: Role1
sprint: Sprint3
authority: GitHub thin-bt/dollworld master
date: 2026-09-23

## Finding

S03-008 is currently owned by Cursor A as `SPRINT3-S03-008-CURRENT-MASTER-TEACHING-SELECTION-OTL-SPEC-SOURCE-AUDIT-A-20260923-R1` in PREPARED state. The instruction explicitly permits bounded repair and requires a fresh root `npm run check` plus production web build whenever product bytes change.

The current binding Sprint3 release gate remains S03-006 PTG publication @ product `bb4ed45`, `1975/1975`, `137/137`, web build PASS. Therefore that gate MUST NOT be reused as final release evidence if S03-008 publishes any later `apps/**` or `packages/**` product delta.

## Binding precondition for S03-008 consumption

Before Role1/PM accepts S03-008 as release-compatible:

1. Fresh-read the terminal S03-008 result and identify its exact product SHA.
2. If S03-008 is audit-only with no product-byte change, retain `bb4ed45` as the live release-gate binding and treat the S03-008 result as spec/source evidence only.
3. If S03-008 changes product bytes, require its exact published product lineage to have fresh root `npm run check` PASS and production web build PASS before replacing the live release-gate binding.
4. Do not infer ordinary-browser acceptance from focused processor/source tests. Any residual real-UI weekly teach / OTL flow must remain explicit rather than being relabeled as covered by unrelated browser evidence.
5. Sprint3 remains `REOPENED_FIX_REQUIRED`; this evidence does not authorize `CLOSED`.

## Lane disposition

- Cursor A: already PREPARED on S03-008; do not overwrite.
- Cursor B2: already PREPARED on current-screen browser evidence; do not overwrite.

No lane dispatch is safe from Role1 in this run because both canonical lane inboxes are occupied by unique work.

# SPRINT3-S03-028-SPECIAL-REASON-AUTHORITY-AUDIT-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: INDEPENDENT_RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` `master`

## Purpose

Independently resolve the authority question behind A-owned S03-028 without editing A-owned production surfaces: determine whether every currently supported enrollment special reason has an already-canonical live-world source fact that can be materialized today, or whether the branch is blocked on missing schema/state. This evidence is required before Sprint3 formal closure because the prior S03-026 no-product-gap conclusion is now challenged by S03-028.

## Required work

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, both lane states, newest Sprint3 results/tasks, `docs/SPRINT_3_BACKLOG.md`, Sprint3 spec/source, and current `master` first.
2. Inspect the exact `EnrollmentSpecialReason`/`activeSpecialReasons` type/enum/contract, `evaluateEnrollmentAssignment()`, `materializeLiveEnrollmentQueueBoundaries()`, and all canonical world/person state that could source those reasons.
3. Produce a reason-by-reason authority matrix: reason value; normative spec text/path; required live fact; actual canonical source field/path; derivable YES/NO; evidence source/test anchor. Do not infer or invent thresholds/rules not in canonical spec.
4. Explicitly classify the S03-026 `no product gap` conclusion against current master: still valid, superseded by a real S03-028 gap, or blocked pending A implementation. Cite exact canonical evidence. Do not mark Sprint3 CLOSED while A is PREPARED/ACTIVE or while any supported special-reason path remains unreachable.
5. Evidence-only lane: do not edit production source/tests or A control/task/result. If a separate documentation contradiction can be corrected without racing A, limit edits to a new canonical result; leave backlog reconciliation until A terminal evidence exists.
6. Run only lightweight source/spec verification needed for the audit; do not duplicate A's implementation tests or root `npm run check`.
7. Publish terminal result to the exact result path below and verify GitHub readback. READY means the authority matrix and closure classification are complete; BLOCKED means exact missing canonical files/facts are named.

## Non-conflict guard

- A owns `SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1` and any production implementation/tests for that gap.
- B2 must not modify A inbox/result/task, production source, or tests.
- Do not start Sprint4.

## Result path

`_handoff-artifacts/results/SPRINT3-S03-028-SPECIAL-REASON-AUTHORITY-AUDIT-B2-20260921-R1/result.md`

## Hygiene

Obey `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`. Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` and correct any root-level temp defect in the same run.

# SPRINT3-S03-068-SEMANTIC-INVARIANT-CANONICAL-PUBLISH-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: canonical-publication+verification
authority: GitHub thin-bt/dollworld master
priority: DEADLINE_CRITICAL
predecessor: SPRINT3-S03-067-MENTORSHIP-ASSIGNMENT-SEMANTIC-INVARIANT-A-20260922-R1

## Objective
Publish the already-verified S03-067 persisted mentorship-assignment semantic-invariant product delta to canonical master. S03-067 terminal evidence says the product bytes are still `PENDING_LOCAL`; GitHub code search confirms `appendMentorshipAssignmentSemanticIssues` is absent from canonical master.

## Required execution
1. Fresh-read protocol, this instruction, S03-067 result, A inbox, Sprint3 status, and current master before touching files.
2. Claim A ACTIVE using the executor contract.
3. Recover the exact S03-067 product delta from the existing A executor worktree/local state. Do not re-design the invariant and do not consume any ROLE3 inbox.
4. Rebase/reconcile against fresh canonical master without dropping newer canonical changes. Do not touch B2-owned Sprint2 build/UI recovery paths except where a merge conflict must be resolved to preserve both changes.
5. Publish the S03-067 product paths to `thin-bt/dollworld` `master`: runtime validator semantic coherence plus its focused regression/fixture updates. The canonical invariant must remain:
   - `formal_master_assigned` => selected master + `formal_master_disciple`
   - `parent_master_assigned` => selected master + `parent_master_disciple`
   - `parent_temporary_guidance` => selected master + `parent_temporary_guidance`
   - `not_at_enrollment_boundary` / `no_eligible_or_accepted_master` => neither master nor relation fields
6. Run the S03-067 focused verification and simulation-core typecheck after reconciliation. Do not weaken assertions, skip tests, extend timeouts, or reduce workload to manufacture PASS.
7. Publish terminal canonical result with exact publication commit/SHA and commands/results. Verify GitHub readback proves `appendMentorshipAssignmentSemanticIssues` (or an equivalent named semantic validator if reconciliation legitimately renames it) is present on master.
8. Do NOT mark Sprint3 CLOSED. Current binding Sprint3 status is `REOPENED_FIX_REQUIRED` because current-master production build/start/real-UI recovery is independently owned by B2. This task closes only the S03-067 publication gap; root/build/UI release binding remains separate.

## Hygiene
No transient scratch directly under `_handoff-artifacts/`. Use `_handoff-artifacts/control-tmp/` for transient scratch and correct any root-level temp defect encountered in the same run.

## Terminal READY condition
Canonical master contains the S03-067 semantic-invariant product bytes; focused tests and simulation-core typecheck pass on reconciled bytes; result records exact publication SHA and GitHub readback evidence.
# SPRINT3-S03-071-LWT003-FIXTURE-SEMANTIC-REPAIR-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
authority-ref: master

## Finding

S03-069 current-master root gate exposed two LWT-003 assertion failures. Source inspection identifies a fixture semantic mismatch introduced/exposed by the new persisted mentorship assignment invariant: `teachWorld("parent_temporary_guidance")` stores `enrollmentOutcomeKind: "parent_master_assigned"`, while the canonical runtime union has a distinct `parent_temporary_guidance` outcome and validator correctly requires that outcome to pair with relation `parent_temporary_guidance`. The explicit-teach evaluator itself still contains the intended parent-temporary advanced-tier refusal.

## Required implementation

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, Sprint3 status, S03-069 result, and current master.
2. Claim B2 ACTIVE through the compatibility executor contract before product changes.
3. Repair the shared LWT fixture/helper so `parent_temporary_guidance` relation materializes `enrollmentOutcomeKind: "parent_temporary_guidance"`; preserve `formal_master_disciple -> formal_master_assigned` and do not weaken runtime semantic validation.
4. Check both failing suites:
   - `packages/simulation-core/src/sprint3/live-explicit-weekly-teach-wiring.test.ts`
   - `packages/simulation-core/src/sprint3/live-technique-teaching-selection-wiring.test.ts`
   If the second duplicates/imports the helper, make the smallest canonical repair needed.
5. Run targeted tests for both LWT-003 cases (or their full two files). Confirm the advanced-tier result is `refused` through `parent_temporary_guidance_tier_cap` behavior.
6. Run the smallest relevant typecheck/format checks. Do not weaken tests, timeouts, validation, or product policy.
7. Publish product change to canonical `thin-bt/dollworld` master and verify GitHub readback/ancestry. A local-only commit is not completion.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-071-LWT003-FIXTURE-SEMANTIC-REPAIR-B2-20260922-R1/result.md`, then return B2 to IDLE per control contract.

## Acceptance

- Both S03-069 LWT-003 assertion failures are green on the repaired canonical source.
- Runtime semantic invariant remains strict.
- Parent temporary guidance continues to refuse non-basic tiers.
- No transient scratch is created directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` only.
- No broad untracked stash/clean operation.

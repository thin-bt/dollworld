# SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: ACCEPTANCE_UNBLOCK_DIAGNOSIS
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: DO_NOT_EDIT_B2_INBOX_OR_PRODUCT_LIFECYCLE_UNLESS_A_DISTINCT_FIX_IS_PROVEN

## Objective

Do not idle while B2 acceptance is stalled. Diagnose and remove any repository/test-runner/harness blocker that can prevent or excessively delay the mandatory Sprint2 Chrome 7/7 reacceptance, without taking ownership of B2's final acceptance verdict.

## Required work

1. Fresh-read GitHub canonical protocol, A R13/accepted-scope READY results, B2 R4 result, current B2 R1 task/inbox, current master HEAD, Playwright config, the three mandatory Sprint2 e2e specs, support helpers, and existing acceptance logs.
2. Determine whether the long/no-result behavior is caused by:
   - Playwright/webServer startup or teardown
   - fixture/reset/bootstrap loops
   - excessive waits/timeouts/retries
   - test deadlock/hang
   - stale server/process/port assumptions
   - harness assertions waiting on a UI state that cannot occur
   - executor/result-publish path rather than product behavior
3. Use bounded targeted commands where safe. Do not run an unbounded full 7-test suite if it would conflict with B2; prefer a single failing/preflight case or static/config evidence.
4. If a test-runner/harness defect is proven and is non-product/non-B2-control, fix it and add focused regression coverage.
5. If a product defect is proven, do not blindly edit while B2 may be running. Record the exact smallest A-owned product fix slice and evidence so PM can dispatch immediately after B2 terminal or when non-conflict is proven.
6. If the blocker is host/daemon-only and not repository-repairable, produce exact evidence and the host-side action required; do not claim PM can restart the daemon.
7. No Sprint3/4 and no FUTURE_RESERVE implementation.

## Terminal output

Publish:
_handoff-artifacts/results/SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1/result.md

READY requires a concrete diagnosis plus either a repository/test-harness fix with verification or an exact evidence-backed next action. Status-only is not READY.

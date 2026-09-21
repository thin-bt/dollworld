# SPRINT2-SPRINT3-STATUS-AUTHORITY-RECONCILIATION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2/Sprint3
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
authority-ref: master

## Objective
Resolve the canonical control-plane contradiction exposed by S03-043: its terminal result states Sprint2 CLOSED and Sprint3 READY_FOR_FORMAL_CLOSE, while the current canonical `_handoff-artifacts/control/SPRINT2_STATUS.md` still says `REOPENED_FIX_REQUIRED` and `SPRINT3_STATUS.md` still says `BLOCKED_BY_SPRINT2_REOPEN`.

## Required work
1. Fresh-read protocol, both sprint status files, A/B2 lane state, newest Sprint2 reopen re-acceptance results, S03-040..043 results, Sprint3 backlog/source, and current master.
2. Do not overwrite Cursor A; A currently owns the final root gate.
3. Establish from canonical evidence whether Sprint2 has actually satisfied the required ordinary-flow re-acceptance chain. Do not infer closure from stale/historical text.
4. If canonical terminal evidence is sufficient, publish the minimal authoritative status transition needed to remove stale contradiction (Sprint2 re-accepted/closed and Sprint3 restored to READY_FOR_FORMAL_CLOSE), with exact evidence refs and product baseline. If evidence is not sufficient, leave status unchanged and publish a concrete BLOCKED result naming the missing gate/evidence.
5. Verify fresh GitHub readback of every status/result write.
6. Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` if scratch is required and clean it in-run.

## Terminal contract
Publish `_handoff-artifacts/results/SPRINT2-SPRINT3-STATUS-AUTHORITY-RECONCILIATION-B2-20260921-R1/result.md` with one of:
- `READY_STATUS_RECONCILED` plus exact status transitions/evidence; or
- `BLOCKED_STATUS_RECONCILIATION` plus exact missing evidence.

No status-only result: complete the reconciliation or prove the blocker.
# SPRINT2-REOPEN-TARGETED-BROWSER-REACCEPTANCE-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master
predecessor-result: _handoff-artifacts/results/SPRINT2-REOPEN-REACCEPTANCE-EVIDENCE-B2-20260921-R1/result.md

## Objective

Close the only explicit user-visible evidence residual in the Sprint2 re-acceptance packet: re-run targeted browser acceptance on the current canonical master after the ranking/tournament battle-presentation publication and Sprint3 weekly-guard typecheck closure.

## Required execution

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, `SPRINT2_STATUS.md`, `SPRINT3_STATUS.md`, both lane inboxes, predecessor result, and current `master` before changes.
2. Claim B2 ACTIVE using the canonical lane protocol. Do not touch A control/task state.
3. Verify current master contains the accepted Sprint2 repair lineage: core-loop publication `5b5103a7ccdeb2514c56cfd95cd9fb272962378b`, B2 UI publication `085a5450ed72dcf1490bdb73428e8f2806b9a481`, and weekly-guard typecheck closure `d84680b23477b0d61cd972e97a851ba3ea7c513f` as ancestors.
4. Run a targeted real-browser acceptance against the ordinary user-facing flow, not test-only/manual competition stepping. At minimum prove: ordinary weekly progression reaches tournament scheduling/staging; tournament UI exposes participants/progression/result; official match presentation uses the accepted battle-log presentation; completed tournament result/ranking is visible; standalone `/ranking` renders the annual ranking surface and links/navigation are usable.
5. Capture concrete evidence sufficient to identify routes, observed states, and pass/fail for each requirement. Reuse existing browser harness where available; do not invent a second product path merely to make the check pass.
6. If a functional defect is found, classify BLOCKED with the exact product gap and smallest bounded repair recommendation. Do not mark READY.
7. If browser acceptance passes, publish a terminal canonical result stating whether Sprint2 is `READY_FOR_STATUS_TRANSITION`. Do not edit `SPRINT2_STATUS.md`; formal status transition remains control/PM authority.
8. Publish the terminal result under `_handoff-artifacts/results/SPRINT2-REOPEN-TARGETED-BROWSER-REACCEPTANCE-B2-20260921-R1/result.md`, set B2 TERMINAL, then return B2 to IDLE per protocol after consumption/readback.
9. Verify GitHub readback of the result and lane state.

## Workspace hygiene

Never create transient scratch directly under `_handoff-artifacts/`. Use `_handoff-artifacts/control-tmp/` for all temporary browser/publish/recovery work. If any root-level transient defect is observed, correct it in this same pickup.

## Non-conflict guard

This is primarily release/evidence work. Do not rewrite A-owned core-loop source. If browser evidence reveals a product defect requiring implementation, stop at a precise BLOCKED result unless the repair is trivially bounded and demonstrably non-conflicting.

## Terminal classes

- `READY_FOR_STATUS_TRANSITION` — targeted browser re-acceptance passes on canonical repaired master.
- `BLOCKED_PRODUCT_GAP` — ordinary user flow still fails a required Sprint2 chain/surface.
- `BLOCKED_ENVIRONMENT` — browser evidence cannot be executed for a concrete environmental reason; include exact blocker and retained non-browser evidence.

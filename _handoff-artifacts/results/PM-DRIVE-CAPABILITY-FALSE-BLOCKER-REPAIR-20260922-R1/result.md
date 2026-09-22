# PM-DRIVE-CAPABILITY-FALSE-BLOCKER-REPAIR-20260922-R1

state: APPLIED
date: 2026-09-22
control-authority: GitHub thin-bt/dollworld/master

## Defect

PM could misclassify Google Drive/tool capability as unavailable and stop work without proving an actual provider permission denial or routing the operation to another authorized execution surface.

This is classified as a control defect because it can suppress otherwise executable work and create false WAITING/BLOCKED states.

## Canonical protocol repair

1. ASSIGNMENT_QUEUE_PROTOCOL.md
   - Added QUEUE-CAPABILITY-PROOF-001.
   - A Drive/tool permission blocker now requires a concrete provider denial for the exact required operation.
   - Missing tool exposure, empty/partial list, access_not_verified, unsupported action shape, OAuth/service-account differences, or one failed action form are not sufficient proof.
   - Equivalent authorized connector routes must be attempted when available.
   - Successful writes/moves/copies require target identity + placement/readback verification where relevant.
   - A false permission blocker that skips executable work is explicitly a CONTROL DEFECT and requires same-run reconciliation/routing.

   Commit: e04360fe2a0a5ed1c699e7a0401c07994269a2e3

2. CONTROL_RULE_INDEX.md
   - Registered QUEUE-CAPABILITY-PROOF-001 under ASSIGNMENT_QUEUE_PROTOCOL.md.

   Commit: 9b734b3d6eb114bbb42961f2c68d5f9f4d04733e

3. GITHUB_CONTROL_PLANE.md
   - Added operational rule forbidding inferred Drive/tool permission stops and binding PM/Role to QUEUE-CAPABILITY-PROOF-001.

   Commit: 63851ba6217a6a58a17a215a6731caf960cf03cd

## PM automation repair

Automation: dollworld PM recovery loop
ID: 6a7c2560eadc81918cb61d62cdd26a9c
State after update: enabled

The automation prompt now explicitly requires:
- no stop/wait/user handoff from inferred Drive/tool permission;
- exact capability discovery and concrete safe probe;
- distinction between action-shape limitations and actual permission denial;
- alternate authorized route before blocker;
- false permission blocker => CONTROL DEFECT + same-run reconciliation/rerouting;
- false blocker never authorizes disabling the PM loop.

## Disposition

The specific failure mode "PM says it lacks Drive permission and therefore does no work" is no longer an allowed waiting condition under canonical protocol or the active PM automation prompt.

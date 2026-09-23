# ROLE3-S03-BACKLOG-LIVE-GATE-RECONCILIATION-20260923-R14

status: READY_NOT_DISPATCHED
sprint: Sprint3
mode: CANONICAL_DOC_RECONCILIATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Why this task exists

Fresh canonical read shows `_handoff-artifacts/control/SPRINT3_STATUS.md` binds the live release gate to `SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1` PASS @ product `37d6ed4`, root `1986/1986` (`139/139` files), web production build PASS. `docs/SPRINT_3_BACKLOG.md` still contains stale control prose that calls `d62778c` the latest accepted gate and `ae23fb9` / POST-F02 the live current-master root gate.

This is a canonical documentation/control drift, not a product-code gap. It must not be used to downgrade the current live gate or to close Sprint3.

## Required edit

1. Fresh-read `_handoff-artifacts/control/SPRINT3_STATUS.md` immediately before editing. If its live binding has advanced beyond `37d6ed4`, use the newer binding instead.
2. Reconcile `docs/SPRINT_3_BACKLOG.md` so every statement that claims a *current/latest/live* Sprint3 release/root gate agrees with the fresh status artifact.
3. Preserve older gate rows and hashes as historical evidence; change only their current/live/latest characterization where stale.
4. Preserve `state: REOPENED_FIX_REQUIRED` semantics. Do not assign formal `CLOSED`.
5. Preserve the two explicit residuals from status: S03-010 dedicated long-run real-browser OTL founding -> generated-technique registration -> battle catalog consumption evidence, and S03-006 ordinary weekly `train_stat` with live family-derived `parent_temporary_guidance` evidence. Do not claim either is closed merely by this doc reconciliation.
6. Do not modify product source for this task.
7. Publish a terminal canonical result with exact changed backlog locations and the fresh status binding used.

## Dispatch rule

At creation time Cursor A is PREPARED on `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1` and Cursor B2 is PREPARED on `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`. Do not overwrite either lane. Dispatch this task only after a lane is genuinely free under the Inbox + Active + heartbeat contract, unless Role3 can safely perform the complete-document edit directly with a fresh full-file read.

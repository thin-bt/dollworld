# SPRINT3-BACKLOG-LIVE-GATE-RECONCILIATION-20260924-R1

status: READY
sprint: Sprint3
owner: next-free Cursor A/B2 lane
mode: DOC_AUTHORITY_RECONCILIATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
source-evidence: ROLE3-S03-BACKLOG-LIVE-GATE-DRIFT-20260924-R20

## Objective

Reconcile `docs/SPRINT_3_BACKLOG.md` with the binding canonical `_handoff-artifacts/control/SPRINT3_STATUS.md` without changing product code or Sprint3 product scope.

## Required edits

1. In the formal release-gate history prose, replace the stale claim that `SPRINT3-S03-005-TE011-PUBLICATION-GATE-A-20260923-R1` @ `d62778c` (`1973/1973`, `137/137`) is the latest/current accepted root gate. Keep it as historical evidence only.
2. In the Production / integration evidence preface, replace the stale claim that POST-F02 @ `ae23fb9` (`1972/1972`) is the live current-master root gate binding. Keep it as historical evidence only.
3. State the live release-gate binding exactly as `SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1` PASS @ product `37d6ed4`, `1986/1986`, `139/139` files, wiki `58`, harness `2/2`, web production build PASS.
4. Preserve Sprint3 state as `REOPENED_FIX_REQUIRED`; do not assign `CLOSED`.
5. Preserve both current browser residuals verbatim in meaning: S03-010 dedicated long-run real-browser OTL founding -> generated-technique registration -> battle catalog consumption, and S03-006 ordinary weekly `train_stat` with live family-derived `parent_temporary_guidance`.
6. Do not change `apps/**`, `packages/**`, Sprint4 scope, S03-001..011 ordering, or historical gate facts other than relabeling stale current/live authority as historical.

## Verification

- Fresh-read `_handoff-artifacts/control/SPRINT3_STATUS.md` immediately before editing; if its live binding has changed, follow that newer binding instead of this instruction's snapshot.
- Search the resulting backlog for `latest`, `current-master root gate`, `live current-master`, `live release-gate`, `d62778c`, and `ae23fb9`; no remaining prose may present a superseded gate as current/live authority.
- Confirm `37d6ed4`, `1986/1986`, and `139/139` are present in the backlog's live-gate statement.
- Confirm diff is documentation-only.
- Publish a terminal canonical result under `_handoff-artifacts/results/SPRINT3-BACKLOG-LIVE-GATE-RECONCILIATION-20260924-R1/result.md` with commit SHA and readback evidence.

## Dispatch rule

Do not overwrite a PREPARED/ACTIVE lane. Execute on the next genuinely free non-conflicting A/B2 lane after checking Inbox + Active + executor heartbeat together per PM control rules.

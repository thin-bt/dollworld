# CLAUDE-INBOX-001 — Input Manifest

## Materialized review files

- `TOURNAMENT_UI_WIREFRAME_DRAFT.md`
- `SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md`
- `S02-008_ANNUAL_EARNINGS_RANKING_USER_DECISION_20260901.md`
- `SPRINT2_REOPEN_CURRENT_MASTER_WEB_BUILD_UI_RECOVERY_B2_result.md`

These are copied into this review-input folder so the review does not depend on Drive search visibility.

## Current-master source scope

Canonical repository/branch:
- `thin-bt/dollworld`
- `master`

Primary source tree to inspect:
- `apps/web/**`
- Sprint2/Sprint3 control/evidence under `_handoff-artifacts/**`
- relevant tests under `tests/e2e/**`

## Historical evidence scope

Inspect at minimum:
- Sprint2/Sprint3 status/control files
- Sprint2/Sprint3 terminal result files
- commits that published Sprint2 UI/wireframe work and later recovery work
- test harnesses relied upon by those results

The review is to determine what those artifacts actually prove, not to accept their labels.

## Local-only package still required

The reviewer requested the exact current working-copy evidence for:
1. all 34 changed files under `docs/specs/`, with old/new diff;
2. the current local `apps/web` tree/snapshot if it differs from canonical master;
3. any local-only Sprint2/Sprint3 completion artifacts not published to master.

A dedicated packaging instruction is registered at:
`_handoff-artifacts/tasks/CLAUDE-INBOX-001-LOCAL-REVIEW-PACKAGE-20260922-R1/instruction.md`

Until that local-only package is published into this folder, the 34-file authorization/semantic audit cannot be considered fully evidenced.

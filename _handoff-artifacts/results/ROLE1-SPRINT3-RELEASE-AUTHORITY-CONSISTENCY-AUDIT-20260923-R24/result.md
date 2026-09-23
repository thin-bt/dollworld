# ROLE1 Sprint3 release-authority consistency audit — R24

result: PASS_WITH_DOCUMENTATION_DRIFT
role: Role1
sprint: Sprint3
date: 2026-09-23
control-authority: GitHub `thin-bt/dollworld` / `master`

## Scope

Fresh-read the binding control protocol, Sprint3 status, A/B2 lane inboxes, Sprint3 backlog, and canonical `_handoff-artifacts/` root before evaluating release authority.

## Findings

1. `_handoff-artifacts/control/SPRINT3_STATUS.md` is the binding status artifact and remains `REOPENED_FIX_REQUIRED`.
2. Its live release gate is `SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1` PASS at product `37d6ed4`: root `1986/1986`, `139/139` files, wiki `58`, harness `2/2`, web production build PASS.
3. `docs/SPRINT_3_BACKLOG.md` still contains stale release-authority prose naming older gates (`d62778c` in the formal-release-gate paragraph and `ae23fb9` in the Production/integration preamble). Under `GITHUB_CONTROL_PLANE.md` rule 7, those backlog statements cannot override the fresh binding status artifact.
4. Therefore there is no release-gate ambiguity: `37d6ed4` remains the only live Sprint3 gate until a later product publication establishes a fresh exact-lineage gate. The backlog references are documentation drift and must not be used for closure.
5. A is already PREPARED for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1`; B2 is already PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`. Role1 did not overwrite either lane.
6. Canonical `_handoff-artifacts/` root contains only expected persistent top-level files/directories in the GitHub listing; no root-level transient scratch defect was observed.

## Release disposition

- Sprint3 remains `REOPENED_FIX_REQUIRED`.
- Live gate remains product `37d6ed4` / `1986/1986` / `139/139` / web build PASS.
- Dedicated browser residuals remain independent closure prerequisites; historical or stale backlog gate prose is not closure authority.
- This audit is evidence-only and does not modify product bytes or lane ownership.

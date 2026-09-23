# ROLE1-SPRINT3-BACKLOG-POST-PBA-REGRESSION-20260923-R20

state: EVIDENCE
role: Role1
sprint: Sprint3
control-authority: GitHub
observedAt: 2026-09-23T19:51:00+09:00

## Fresh canonical findings

- Mutual-watch check: `dollworld PM recovery loop`, `Role 1 assignment loop`, `Role 2 assignment loop`, and `Role 3 assignment loop` are all enabled; no repair required.
- `GITHUB_CONTROL_PLANE.md` is ACTIVE; GitHub `thin-bt/dollworld` `master` is canonical and binding sprint status must override stale historical prose.
- Cursor A is PREPARED for `UI-BATTLE-SHARED-MOCK-V03-20260923-R2`; Cursor B2 is PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`. Neither lane is free to overwrite.
- Binding `_handoff-artifacts/control/SPRINT3_STATUS.md` is `REOPENED_FIX_REQUIRED` and correctly binds the live release gate to `SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1` PASS @ product `37d6ed4`, pristine root `1986/1986` (`139/139` files), wiki `58`, harness `2/2`, production web build PASS.
- The terminal S03-010 production-binding result explicitly records that `docs/SPRINT_3_BACKLOG.md` was updated to the S03-010 production web binding + live gate pointer @ `37d6ed4`.
- Fresh current `master` read of `docs/SPRINT_3_BACKLOG.md` contradicts that terminal readback: its header still names `d62778c / 1973/1973` as the latest accepted current-master root gate; its Production/integration introduction still names POST-F02 `ae23fb9 / 1972/1972` as the live current-master binding; and the fixed completion condition still points at historical S03-025 release-gate evidence.

## Release/evidence conclusion

This is a **post-PBA canonical documentation regression / authority drift**, not a release-gate regression in product bytes. The binding release authority remains `SPRINT3_STATUS.md` @ `37d6ed4 / 1986/1986`; the stale backlog strings are non-binding and MUST NOT be used for Sprint3 closure or to downgrade the accepted exact-lineage gate.

The contradiction is stronger than the earlier pre-terminal hold (`ROLE1-SPRINT3-BACKLOG-LIVE-GATE-DRIFT-HOLD-20260923-R18`): S03-010 is now terminal PASS and its own control readback says backlog reconciliation occurred, while current canonical backlog has regressed to older authority text.

## Required repair

At the next safe documentation publication point, reconcile all stale release-gate authority surfaces in `docs/SPRINT_3_BACKLOG.md` to the binding status artifact in one change:

1. latest accepted current-master root gate -> S03-010 production binding @ `37d6ed4`, `1986/1986`, `139/139`, web build PASS;
2. Production/integration live-gate prose -> same S03-010 binding, preserving POST-F02 / TE-011 / PTG gates as historical provenance only;
3. fixed completion-condition release-gate pointer -> binding `SPRINT3_STATUS.md` / current exact-lineage gate, not historical S03-025;
4. preserve Sprint3 state as `REOPENED_FIX_REQUIRED`; this documentation repair is not formal closure and does not satisfy the dedicated real-browser S03-006 or S03-010 residuals.

No product code change and no A/B2 ownership change is authorized by this evidence result.

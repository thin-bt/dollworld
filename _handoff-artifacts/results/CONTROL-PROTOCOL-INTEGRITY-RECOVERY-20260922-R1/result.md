# CONTROL-PROTOCOL-INTEGRITY-RECOVERY-20260922-R1

state: READY_FOR_INDEPENDENT_REVIEW
date: 2026-09-22
control-authority: GitHub thin-bt/dollworld/master

## Trigger

Independent Claude review reported broken normative protocol references and missing completion controls.

## Verified Drive facts

- Canonical root Drive folder: `1i4a513yn2aJuODaRPPyv9XUP5qAIiPl6`.
- `AUDIT_HANDOFF_PROTOCOL.md` exists as Drive file `1sXD8QVBCVf5GwOb2uiNlPmpEM631zU1I`; metadata proves its parent is the canonical root.
- `PROJECT_ROADMAP.md` exists as Drive file `1eKNMCKFPwwbpvWFfO8QBxviVYnffbCI8`; metadata proves its parent is the canonical root.
- A plain folder-list response did not enumerate those two root files, so absence may not be inferred from folder listing alone.
- The seven 2026-08-12 split children are currently present in Drive protocol/: AUDIT_WORKFLOW, TASK_COMPLETION, SPRINT_COMPLETION, ARTIFACT_LAYOUT, SPEC_MIRROR, CURSOR_HANDOFF, PARALLEL_AGENTS.
- The current evolved protocol set is also present, including CONTROL_CORE, ASSIGNMENT_QUEUE_PROTOCOL, CLAUDE_DRIVE_AGENT and related owners.
- Drive had `CONTROL_RULE_INDEX (1).md`; it was renamed in place to exact canonical `CONTROL_RULE_INDEX.md` while preserving file id `18i2yi39EQ4ff2-sNH_CsLQWaisWSvYCP`.

## Canonical GitHub repair

Before this recovery, GitHub canonical `_handoff-artifacts/protocol/` contained only GITHUB_CONTROL_PLANE and SPRINT2_SCOPE_AUTHORITY_CORRECTION, even though GITHUB_CONTROL_PLANE declared GitHub canonical for protocol/control writes.

Recovered from the verified Drive normative files into GitHub master:
- root `_handoff-artifacts/AUDIT_HANDOFF_PROTOCOL.md`
- root `_handoff-artifacts/PROJECT_ROADMAP.md`
- `protocol/CONTROL_RULE_INDEX.md`
- `protocol/CONTROL_CORE.md`
- `protocol/AUDIT_WORKFLOW.md`
- `protocol/TASK_COMPLETION.md`
- `protocol/SPRINT_COMPLETION.md`
- `protocol/ARTIFACT_LAYOUT.md`
- `protocol/SPEC_MIRROR.md`
- `protocol/SPEC_SYNC.md`
- `protocol/CURSOR_HANDOFF.md`
- `protocol/CURSOR_LOCAL_MIRROR_PROTOCOL.md`
- `protocol/PARALLEL_AGENTS.md`
- `protocol/CLAUDE_DRIVE_AGENT.md`
- `protocol/ASSIGNMENT_QUEUE_PROTOCOL.md`
- `protocol/ACTIVITY_LOG_PROTOCOL.md`
- `protocol/THREAD_HANDOFF_PROTOCOL.md`
- `protocol/UI_TUNING_CONFIG.md`
- `protocol/USER_COMMAND_SHORTHANDS.md`
- `protocol/ROADMAP_VISUALIZATION_RULES.md`

All Rule-ID owner filenames referenced by CONTROL_RULE_INDEX now resolve in GitHub canonical; AUDIT_HANDOFF_PROTOCOL remains root-owned by design.

## Sprint completion gate repair

Commit `0aaf7afcfbc3cbcddbbce31d05483fa8548e98cc` updates canonical `SPRINT_COMPLETION.md` to restore/strengthen completion controls:
- repo-external clean clone / clean checkout verification is mandatory for formal Sprint close;
- production build must reproduce on the completion snapshot;
- for user-facing/UI scope, app startup and ordinary real user-facing end-to-end flow are mandatory;
- test-only API bootstrap, fixed-seed injection, dedicated/manual bypass, or direct internal function calls cannot substitute for ordinary user-facing acceptance;
- missing build/start/real-UI evidence is a completion blocker, not operational hygiene.

This specifically prevents the failure mode that allowed Sprint2/Sprint3 CLOSED labels while current master could not build/start or while the ordinary product flow had not been proven.

## 2026-08-12 migration semantics

The historical migration evidence `protocol-migration-map.txt` and `protocol-validation.txt` states that no legacy normative section was intentionally deleted.

Current placement is evolved but the old §33-35 subject matter is not treated as disposable:
- generic lane/role split is owned by `CONTROL_CORE.md / CORE-LANES-001`;
- browser Claude Drive constraints/output handling are owned by `CLAUDE_DRIVE_AGENT.md`;
- generic concurrency remains in `PARALLEL_AGENTS.md`.
Any independent review should compare semantics, not require duplicate rule bodies in PARALLEL_AGENTS because current CONTROL-NONDUP-001 intentionally assigns single owners.

## Spec comparison anchor for Claude

Verified base commit: `46383526a982d216697644ad47dea0d090254b8f`.

Tree-level comparison `46383526... -> current master` finds 34 changed paths under `docs/specs/` (31 modified, 3 added at the observed comparison). This is the correct independent-review set; no Drive revision dates are needed.

Key added files:
- `docs/specs/15-sprint3-config-schema.md`
- `docs/specs/sprint1.5/S1.5-SPEC-0.1.15-CHANGELOG.md`
- `docs/specs/sprint1.5/SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.15_AMENDMENT.md`

Core modified files include:
- `docs/specs/08-character-growth.md`
- `docs/specs/10-training-and-learning.md`
- `docs/specs/14-sprint1-config-schema.md`
- `docs/specs/sprint1.5/SPRINT_1_5_SIMPLE_SIMULATION_UI.md`
- the Sprint1.5 UI-001..UI-010 authority/task files and associated acceptance/manifest documents.

## Disposition

Protocol reference integrity: REPAIRED on GitHub canonical.
Drive exact index filename: REPAIRED.
Sprint close safety gate: REPAIRED on GitHub canonical.
Independent Claude semantic review of the 34 changed docs/specs paths: still recommended; this recovery does not pre-judge whether each spec change was authorized.

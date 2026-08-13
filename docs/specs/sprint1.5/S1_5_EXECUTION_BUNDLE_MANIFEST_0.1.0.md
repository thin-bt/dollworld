# Sprint 1.5 Execution Bundle Manifest

- Document ID: `S1.5-EXECUTION-BUNDLE-MANIFEST`
- Version: `0.1.0`
- Scope: UI-000 through UI-010 execution

## Rule

The Cursor/UI execution bundle must be self-contained as an **execution copy** for all Sprint 1.5 amendment-side references used during UI-000～UI-010.

Self-contained does **not** mean the ZIP becomes specification authority.
Authority remains the Git-managed specification/control set required by `AUDIT_HANDOFF_PROTOCOL.md` / `SPEC_MIRROR.md`,
bound to the P00-fixed repository HEAD and the post-UI-000 freeze record.

At minimum the external Git authority includes:

```text
tracked base `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` / S1.5-SPEC-0.1.13
tracked current `SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.14_AMENDMENT.md`
all additional R12 semantic/control files classified git_authority_required or git_supporting_control_required
```

Bundle copies of Git-authority files must byte/hash match the Git-reflected files recorded by proposal-adoption/freeze evidence.
Files classified `non_authoritative_evidence` or `generated_package_or_tool` may remain artifact-only, but may not define new implementation semantics.

## Required files

- `SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.14_AMENDMENT.md`
- `UI_000_BRIDGE_AUDIT_CHECKLIST_0.2.5_AMENDMENT.md`
- `S1.5-SPEC-0.1.14-CHANGELOG.md`
- `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- `S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md`
- `S1_5_ACCEPTANCE_OWNERSHIP_MANIFEST_0.1.0.md`
- `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`
- `S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md`
- `S1_5_UI000_FINDING_RESOLUTION_MATRIX_0.1.0.md`
- `S1_5_UI000_BINDING_WORKSHEET_0.1.0.md`
- `S1_5_UI000_MOCK_AUDIT_0.2.0.md`
- `S1_5_EXECUTION_BUNDLE_MANIFEST_0.1.0.md`
- `S1_5_BASE_AUTHORITY_GATE_0.1.0.md`
- `S1_5_SPEC_FREEZE_POLICY_0.1.0.md`
- `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- `S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`
- `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`
- `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`
- `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`
- `S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md`
- `S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`
- `S1_5_LONG_RUN_HISTORICAL_COMPATIBILITY_AUDIT_0.1.0.md`
- `S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md`
- `S1_5_REPO_PHYSICAL_BINDING_AUDIT_0.1.0.md`
- `S1_5_CURSOR_UI000_REPO_BINDING_TASK_0.1.0.md`
- `audit-s1-5-repo-bindings.mjs`
- `audit-s1-5-repo-bindings.ps1`
- `verify-s1-5-spec-package.mjs`
- `S1_5_CURSOR_UI_001_0.1.0.md`
- `S1_5_CURSOR_UI_002_0.1.0.md`
- `S1_5_CURSOR_UI_003_0.1.0.md`
- `S1_5_CURSOR_UI_004_0.1.0.md`
- `S1_5_CURSOR_UI_005_0.1.0.md`
- `S1_5_CURSOR_UI_006_0.1.0.md`
- `S1_5_CURSOR_UI_007_0.1.0.md`
- `S1_5_CURSOR_UI_008_0.1.0.md`
- `S1_5_CURSOR_UI_009_0.1.0.md`
- `S1_5_CURSOR_UI_010_0.1.0.md`

## External normative / runtime evidence

The following are intentionally **not** execution-bundle members:

- root/protocol normative files such as `AUDIT_HANDOFF_PROTOCOL.md` / `protocol/SPEC_MIRROR.md`
- `R12_PROPOSAL_MANIFEST.md` proposal-stage provenance (present in the full preparation package only)
- actual P00 predecessor / proposal-adoption / Git-authority mapping evidence generated against the fixed repository
- the external tracked base `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` / `S1.5-SPEC-0.1.13`

Their absence from the ZIP does not make the ZIP authority. P00 must obtain and verify the current normative/runtime evidence separately.

## Machine conditions

```text
required bundle file count = 38
missing required file = 0
duplicate archive member = 0
all bundle files byte-identical to current implementation-preparation package sources
Git authority remains external to the ZIP and is verified separately
proposal-only semantic/control input = 0 before real UI-000
Git-authority bundle members byte/hash match their tracked counterparts
proposal-adoption / Git-authority mapping evidence SHA verified
P00-fixed Git HEAD == current specs/current manifest HEAD
```

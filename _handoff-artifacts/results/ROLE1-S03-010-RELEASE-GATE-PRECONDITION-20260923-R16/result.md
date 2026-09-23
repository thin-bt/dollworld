# ROLE1-S03-010-RELEASE-GATE-PRECONDITION-20260923-R16

state: TERMINAL
result: PASS
role: Role1
sprint: Sprint3
control-authority: GitHub

## Fresh canonical observations
- `GITHUB_CONTROL_PLANE.md` requires current-master build/start/ordinary UI evidence for closure and forbids stale historical gate reuse.
- Cursor A currently owns `SPRINT3-S03-010-WEEKLY-AUTO-REGISTRATION-INTEGRATION-A-20260923-R1` in PREPARED state.
- That task explicitly permits product-byte changes to close the weekly OTL success -> generated-technique registration/materialization -> battle-consumable catalog gap.
- Cursor B2 remains separately PREPARED for current-screen browser evidence and is not to be overwritten.
- Binding `SPRINT3_STATUS.md` currently names S03-006 PTG product `bb4ed45` with `1975/1975`, `137/137`, and production web build PASS as the live release gate.

## Release-gate precondition
1. `bb4ed45` remains binding only while no later `apps/**` or `packages/**` product publication supersedes it.
2. If S03-010 publishes product bytes, no historical `bb4ed45` / 1975 gate may be reused for that changed lineage.
3. Before any S03-010 product lineage becomes the live Sprint3 gate, the exact published product SHA must have fresh pristine root `npm run check` PASS and production web build PASS, as already required by the A instruction.
4. Focused OTL/generated-technique tests are necessary evidence but do not substitute for the exact-lineage root/build gate.
5. The S03-010 terminal result must state whether product bytes changed, exact product SHA, focused counts, root/build evidence, and remaining ordinary-flow/browser risk.
6. Sprint3 remains `REOPENED_FIX_REQUIRED`; this precondition does not authorize `CLOSED`.

## Non-conflict disposition
No A/B2 ownership was changed. A already has executable S03-010 work; B2 already has browser-evidence work. This result is control/evidence only and does not alter product bytes.

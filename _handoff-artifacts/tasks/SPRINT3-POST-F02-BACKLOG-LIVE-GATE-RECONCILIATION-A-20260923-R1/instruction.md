# SPRINT3-POST-F02-BACKLOG-LIVE-GATE-RECONCILIATION-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Objective

Close the concrete canonical evidence drift introduced after the F-02 publication gate: `_handoff-artifacts/control/SPRINT3_STATUS.md` / terminal result bind the live pristine root gate to product `ae23fb9` with `1972/1972`, while `docs/SPRINT_3_BACKLOG.md` still calls POST-E2A9 `a3776c1` / `1969/1969` the latest/current live gate.

## Mandatory fresh reads

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. `_handoff-artifacts/results/SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1/result.md`
4. `docs/SPRINT_3_BACKLOG.md`
5. fresh `origin/master`, including product-path commits after `ae23fb9`

## Work

1. Claim lane A ACTIVE according to the executor contract.
2. Determine the latest canonical `apps/**` + `packages/**` product SHA at pickup.
3. If there is NO product delta after tested product `ae23fb9`, update every live/current gate statement in `docs/SPRINT_3_BACKLOG.md` that still names POST-E2A9 `a3776c1` / `1969/1969` as current. Bind it to `SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1` PASS @ `ae23fb9`, `1972/1972`, `137/137`, web build PASS. Preserve older gates explicitly as historical evidence.
4. If there IS a later product delta, do not falsely bind `ae23fb9` as current. Establish whether an exact-lineage fresh root gate already exists. If it exists, reconcile backlog to that evidence. If it does not, run one bounded pristine root `npm run check` on the actual latest product lineage (using the S03-072 self-contained harness contract), repair only a small attributable non-conflicting defect if necessary, and bind backlog only after PASS. If failure is not safely repairable in this task, publish exact blocker evidence instead of fabricating acceptance.
5. Do not assign Sprint3 formal CLOSED. Preserve `REOPENED_FIX_REQUIRED` unless a separate canonical control authority has already changed it before pickup.
6. Do not touch B2 or its browser-evidence task.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT3-POST-F02-BACKLOG-LIVE-GATE-RECONCILIATION-A-20260923-R1/result.md`, then return A to IDLE.

## Acceptance

- `docs/SPRINT_3_BACKLOG.md` no longer presents a superseded product gate as the latest/current gate.
- Binding names exact terminal task, product SHA, test totals and historical supersession accurately.
- Any product delta after the candidate gate is handled by exact-lineage evidence rather than prose assumption.
- No product behavior is changed unless a bounded gate exposes a small attributable defect and same-task repair is safe.
- GitHub canonical readback confirms instruction/result/control state.

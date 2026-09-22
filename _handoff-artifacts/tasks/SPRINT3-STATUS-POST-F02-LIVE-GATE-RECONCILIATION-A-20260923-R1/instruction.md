# SPRINT3-STATUS-POST-F02-LIVE-GATE-RECONCILIATION-A-20260923-R1

state: READY
lane: A
sprint: Sprint3
mode: CONTROL_PUBLICATION_REPAIR
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Objective

Repair the remaining canonical authority drift identified by terminal `SPRINT3-BACKLOG-TERMINAL-PUBLICATION-DRIFT-A-20260923-R1`: `_handoff-artifacts/control/SPRINT3_STATUS.md` still names POST-E2A9 @ `a3776c1` (`1969/1969`) as the live release-gate binding even though canonical backlog and terminal POST-F02 evidence bind the newer product `ae23fb9` with `1972/1972` and production web build PASS.

## Required fresh reads before change

1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. `_handoff-artifacts/control/SPRINT2_STATUS.md`
4. `docs/SPRINT_3_BACKLOG.md`
5. `_handoff-artifacts/results/SPRINT3-BACKLOG-TERMINAL-PUBLICATION-DRIFT-A-20260923-R1/result.md`
6. `_handoff-artifacts/results/SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1/result.md`
7. fresh `origin/master` product lineage under `apps/**` + `packages/**`

## Work

- Verify `ae23fb9` remains the latest canonical product SHA and no later product delta exists. If a later product delta exists, do not falsely bind POST-F02; publish a terminal BLOCKED/FIX_REQUIRED result identifying the exact newer SHA and required fresh gate.
- If lineage remains applicable, update only the Sprint3 control/status authority needed to make the live release-gate binding POST-F02 @ `ae23fb9`, `1972/1972` (`137/137` files), web production build PASS.
- Preserve POST-E2A9 @ `a3776c1` as historical pre-F-02 evidence, not live binding.
- Preserve Sprint3 state `REOPENED_FIX_REQUIRED`; do not assign `CLOSED` in this task.
- Do not modify product source.
- Do not rerun the full root gate when the exact POST-F02 terminal evidence remains applicable; this task is control reconciliation, not duplicate release testing.
- Publish terminal result to `_handoff-artifacts/results/SPRINT3-STATUS-POST-F02-LIVE-GATE-RECONCILIATION-A-20260923-R1/result.md` and verify GitHub readback.

## Hygiene / non-conflict

- B2 is independently PREPARED for browser evidence; do not touch or consume B2 ownership.
- Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` if scratch is necessary.
- Correct any root-level transient scratch defect discovered during this task in the same run, without deleting persistent `_handoff-artifacts/tools/**` or `_handoff-artifacts/specs/**` assets.
- Obey workspace-preservation rules; no broad untracked stash/clean.

## Acceptance

PASS only if GitHub canonical readback shows `SPRINT3_STATUS.md` live release-gate binding reconciled to applicable POST-F02 @ `ae23fb9` / `1972/1972`, older POST-E2A9 explicitly historical, Sprint3 still `REOPENED_FIX_REQUIRED`, and a terminal canonical result records exact lineage and publication evidence.
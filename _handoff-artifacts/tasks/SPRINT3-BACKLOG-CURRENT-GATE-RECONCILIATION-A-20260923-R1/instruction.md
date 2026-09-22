# SPRINT3-BACKLOG-CURRENT-GATE-RECONCILIATION-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Why this is a product/spec gap

Fresh canonical read shows `docs/SPRINT_3_BACKLOG.md` still names S03-064 @ `c0c9754` (1925/1925) as the latest accepted current-master root gate, while terminal `SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1` proves a later product lineage: bounded hygiene publication `a3776c1` and pristine root `npm run check` PASS with 137/137 files and 1969/1969 tests. The result also states there was no later product delta at its completion tip. This makes the Sprint3 backlog's release-evidence/source binding stale and capable of directing later spec-to-source work against the wrong product baseline.

Separately, `_handoff-artifacts/control/SPRINT3_STATUS.md` on fresh master still carries the older S03-072/fdeed36 binding despite that terminal result claiming it updated the status. Treat this as a canonical publication/readback inconsistency; do not silently trust the result prose over fresh master.

## Required execution

1. Fresh-read `protocol/GITHUB_CONTROL_PLANE.md`, A/B2 lane state, `docs/SPRINT_3_BACKLOG.md`, `_handoff-artifacts/control/SPRINT3_STATUS.md`, and `_handoff-artifacts/results/SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1/result.md`.
2. Fresh-fetch `origin/master` and determine the latest commit touching `apps/**` or `packages/**` at pickup. Do not assume `a3776c1` remains current if a later product delta exists.
3. If no later product delta exists after `a3776c1`, reconcile the canonical Sprint3 backlog release-gate prose/evidence table to the terminal 1969/1969 gate and reconcile `SPRINT3_STATUS.md` to the same exact product binding. Preserve `REOPENED_FIX_REQUIRED`; do not assign CLOSED.
4. If a later product delta exists, do NOT falsely bind `a3776c1` as current. Record the exact later product SHA and perform the smallest bounded current-product verification needed by existing protocol; if a full root gate is required and feasible, run it. Bind backlog/status only to evidence actually applicable to that SHA.
5. While editing the backlog, do not change Sprint3 product scope, S03-001..011 ordering, or acceptance semantics. This is evidence/source-baseline reconciliation, not scope reduction.
6. Verify GitHub readback of every canonical file changed. Publish terminal result at `_handoff-artifacts/results/SPRINT3-BACKLOG-CURRENT-GATE-RECONCILIATION-A-20260923-R1/result.md` with exact tested/bound product SHA, test totals, changed paths, and readback tip.
7. Return A to IDLE only after terminal publication/readback.

## Collision boundaries

- B2 currently owns `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; do not touch its browser-capture artifacts or task/result.
- Do not consume or wait on any ROLE3 inbox.
- Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` only.
- Preserve `_handoff-artifacts/specs/**` and `_handoff-artifacts/tools/**` if present locally; never broad-stash/clean them.

## Acceptance

Terminal only when canonical backlog and binding status no longer advertise an older product baseline than the newest applicable release evidence, or when a newly discovered later product delta is explicitly evidenced and correctly left requiring its own gate. No status-only terminal; produce concrete canonical reconciliation and readback evidence.
# SPRINT3-S03-007-CURRENT-MASTER-EXPLICIT-TEACH-SPEC-SOURCE-AUDIT-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: SPEC_TO_SOURCE_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub thin-bt/dollworld master

## Purpose
Audit S03-007 explicit weekly `teach` against current canonical production wiring, not merely the pure evaluator. S03-006 PTG publication is terminal PASS; this task is the next non-conflicting Sprint3 main-table slice. B2 browser-evidence work is out of scope.

## Fresh-read first
1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT3_STATUS.md`
3. `docs/SPRINT_3_BACKLOG.md` S03-007 and production/integration evidence
4. `docs/specs/15-sprint3-config-schema.md` §2.5, §2.6, §3.5
5. newest relevant Sprint3 results for explicit teach / persisted selection consumption
6. current `origin/master` product bytes under `packages/simulation-core/src/sprint3/**` and weekly/world entrypoints.

At pickup, recompute the latest `apps/** + packages/**` product SHA. Do not assume the stale status binding; predecessor PTG publication result reports product `bb4ed45` and 1975/1975, while canonical status/backlog may lag and must be reconciled only with exact evidence.

## Audit contract
Trace the real production chain end-to-end:
- persisted/current weekly action selects `teach` for an eligible master;
- live persisted disciple relationships derive requests from actual disciples, without fixture/default child IDs and without duplicate-child amplification;
- persisted teaching selection / requested technique is actually consumed by the explicit teach evaluator;
- `weeklyTeachAction` config allocation limit and refusal tiers are used exactly once;
- teacher-can-teach / technique eligibility gates cannot be bypassed;
- accepted/refused/skipped-allocation outcomes are deterministic and semantically valid;
- completed explicit-teach outcome is applied to world/runtime state and persists to the next week;
- repeated processing of the same absolute week cannot duplicate the same teach effect/outcome;
- non-`teach`, ineligible, feature-disabled, no-disciple, and allocation-overflow boundaries fail closed or no-op exactly as spec requires;
- parent temporary guidance and ordinary `train_stat` teaching-efficiency paths are not double-applied as explicit teach.

Use source tracing plus focused tests. Existing pure-helper tests alone are insufficient evidence.

## Required action
If a production/spec-to-source gap is found, repair the smallest safe slice in this same task and add a regression that proves the live boundary. If no product gap exists, add a narrowly scoped regression only when a meaningful production-chain boundary is currently unprotected; otherwise publish a concrete audit result with exact source/test evidence and no gratuitous code churn.

If `apps/**` or `packages/**` bytes change, publish only this isolated task slice to canonical master, then run focused verification and a fresh pristine exact-lineage root `npm run check` plus production web build. Reconcile `SPRINT3_STATUS.md` / backlog live gate only after PASS. Preserve unrelated local deltas.

## Workspace / non-conflict
- Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`.
- Never broad-stash untracked files; preserve `_handoff-artifacts/tools/**` and `_handoff-artifacts/specs/**`.
- Do not modify B2 inbox/task or browser evidence artifacts.
- Do not consume any ROLE*_INBOX artifact.

## Terminal evidence
Publish `_handoff-artifacts/results/SPRINT3-S03-007-CURRENT-MASTER-EXPLICIT-TEACH-SPEC-SOURCE-AUDIT-A-20260923-R1/result.md` with exact product SHA, traced source paths/functions, gap/no-gap verdict, changed paths, focused tests/counts, publication SHA if any, root/build result if product changed, residual ordinary-flow/browser risk, and control readback.
# SPRINT3-S03-049-ROOT-GATE-CONCURRENCY-CLOSURE-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE_RECOVERY
priority: DEADLINE_CRITICAL
authority-ref: master
predecessor: SPRINT3-S03-048-CURRENT-MASTER-TIMEOUT-CLASSIFICATION-B2-20260922-R1

## Concrete gap

S03-048 proved ST-012 and CHK-009 pass in isolation with unchanged assertions/timeouts, while the bounded full `npm run check` on the same master failed only by timeouts in ST-012, CHK-009 and correlated WIN-006. Root `package.json` currently runs plain `vitest run` with no repository-level worker/concurrency policy. Sprint3 therefore lacks a reproducible current-master root release gate under the executor capacity even though isolated product behavior is green.

## Required execution

1. Fresh-read protocol, B2 inbox, Sprint3 status, S03-048 result, root `package.json`, relevant Vitest configuration (if any), and current `master` before changing anything.
2. Claim B2 ACTIVE using the compatibility executor contract before product/tooling changes.
3. Reproduce/confirm the repository has no explicit bounded Vitest worker policy affecting root `npm run test`.
4. Implement the smallest repository-level test-runner scheduling/concurrency correction that prevents heavy simulation suites from starving one another on the canonical executor. Prefer an explicit Vitest worker/concurrency setting or config over changing product tests. Do NOT increase ST-012/CHK-009/WIN-006 timeouts, skip tests, weaken assertions, reduce simulation years/workload, or change Sprint3/Sprint2 product semantics.
5. Run focused ST-012, CHK-009 and WIN-006 with their canonical assertions/timeouts. Then run exactly one bounded root `npm run check` on the resulting tree. Record worker policy, environment/capacity evidence, test counts, wall times and exact failures if any.
6. If root gate is green, publish the minimal canonical change to GitHub `master`, verify GitHub readback of the changed runner/config file(s), and publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-049-ROOT-GATE-CONCURRENCY-CLOSURE-B2-20260922-R1/result.md`.
7. If a bounded scheduling correction cannot make the gate green without forbidden timeout/assertion/product weakening, publish BLOCKED with concrete evidence; do not fabricate READY and do not assign Sprint3 `CLOSED`.

## Acceptance

- ST-012 PASS unchanged.
- CHK-009 PASS unchanged.
- WIN-006 PASS unchanged.
- No timeout extension, skip, assertion weakening, workload reduction, or product semantic change.
- Root `npm run check` PASS on the same resulting tree is required for READY.
- Canonical GitHub master readback required for any published change.
- Sprint3 formal `CLOSED` remains PM/control-only; this task must not self-close Sprint3.

## Hygiene / non-conflict

Use `_handoff-artifacts/control-tmp/` for all scratch/evidence/worktrees. Do not create transient material directly under `_handoff-artifacts/`. Do not touch Cursor A control or its Sprint2 task.
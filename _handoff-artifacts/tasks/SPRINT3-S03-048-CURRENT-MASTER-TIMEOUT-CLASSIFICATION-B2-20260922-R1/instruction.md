# SPRINT3-S03-048-CURRENT-MASTER-TIMEOUT-CLASSIFICATION-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE_RECOVERY
priority: DEADLINE_CRITICAL
authority-ref: master
control-authority: GitHub

## Objective
Close the concrete current-master formal-close blocker reported by S03-047 without weakening tests or changing Sprint3 semantics. S03-047 root `npm run check` reached 1904/1906 and failed only by timeout in:
- `apps/web/src/server/ui006.mock-battles.test.ts` — ST-012, 20s timeout
- `packages/simulation-core/src/sprint2/sprint2-checkpoint-resume.test.ts` — CHK-009, 360s timeout

Determine whether each timeout is reproducible product regression or execution/load-only, and produce canonical evidence sufficient for the next current-master root gate.

## Required fresh reads
1. `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
2. `_handoff-artifacts/control/SPRINT2_STATUS.md`
3. `_handoff-artifacts/control/SPRINT3_STATUS.md`
4. `_handoff-artifacts/results/SPRINT3-S03-047-CURRENT-MASTER-FORMAL-CLOSE-GATE-B2-20260922-R1/result.md`
5. both failing test files and their production paths on fresh `origin/master`

## Execution
1. Claim B2 ACTIVE before work according to executor protocol.
2. Use scratch only under `_handoff-artifacts/control-tmp/`; correct any root-level transient defect found in this run.
3. On fresh current `origin/master`, run each failing test in isolation once with its existing timeout/semantics unchanged. Record wall time and result.
4. If both pass in isolation, classify S03-047 as load/concurrency timeout evidence, then run one bounded root `npm run check` on the same canonical product state. Do not retry the same failed root-gate case after the bounded attempt.
5. If either isolated test fails reproducibly for a non-timeout/product reason, inspect source and apply only the smallest non-conflicting correction necessary; do not increase/disable timeout, skip tests, reduce assertions, or alter accepted Sprint2/Sprint3 product semantics merely to make the gate green. Re-run the directly affected focused test once after a real correction, then one bounded root check if focused evidence is green.
6. If isolated execution still times out, terminate BLOCKED with exact timing/resource evidence and suspected production seam; do not fabricate READY.
7. Do not assign Sprint3 `CLOSED`; PM/control explicit transition remains separate.

## Acceptance
READY only if evidence demonstrates both former timeout cases pass with unchanged assertions/timeouts on current master and a bounded current-master root `npm run check` is green, or if a genuine minimal product correction is canonically published and the same checks are green.

Terminal result must be published to:
`_handoff-artifacts/results/SPRINT3-S03-048-CURRENT-MASTER-TIMEOUT-CLASSIFICATION-B2-20260922-R1/result.md`

Include origin/master SHA, commands, per-test elapsed/result, root gate counts, any product delta, publication SHA if applicable, and GitHub readback.
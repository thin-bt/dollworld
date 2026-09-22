# SPRINT3-WF14-PRETTIER-HYGIENE-REPAIR-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master
trigger-result: _handoff-artifacts/results/SPRINT3-POST-WF14-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1/result.md

## Objective
Close the concrete post-WF14 release-gate product gap: pristine root `npm run check` fails at `format:check` on `apps/web/src/server/ui009/map-competition-view.ts`.

## Required execution
1. Fresh-read protocol, this instruction, current A/B2 lane state, Sprint3 status, and the trigger result before edits.
2. Claim lane A ACTIVE using the canonical execution-state contract.
3. Verify current master still contains the same format-only defect and that no later product change already supersedes it.
4. Apply the minimum Prettier-only formatting correction to `apps/web/src/server/ui009/map-competition-view.ts`. Do not alter WF14 behavior, tournament display-name semantics, tests, assertions, timeouts, or workloads.
5. Run the narrow formatting verification for the touched file/package and any cheap focused check needed to prove no semantic delta.
6. Publish the product correction to canonical `master`, then verify GitHub readback of the exact changed file/product SHA.
7. Publish a TERMINAL canonical result under `_handoff-artifacts/results/SPRINT3-WF14-PRETTIER-HYGIENE-REPAIR-A-20260922-R1/result.md`, including exact product SHA, commands, outcomes, and whether a fresh post-repair root gate remains required.
8. Return lane A to IDLE only after terminal result publication.

## Boundaries
- Allowed product scope: `apps/web/src/server/ui009/map-competition-view.ts` only unless fresh evidence proves the reported formatter failure moved; if so, stop with FIX_REQUIRED evidence rather than broadening silently.
- `_handoff-artifacts/**` changes are control/result only. Any transient scratch must be under `_handoff-artifacts/control-tmp/`; do not create root-level scratch.
- Do not assign Sprint3 CLOSED.
- The historical S03-075 root gate does not cover WF14 bytes. After this product correction, a fresh bounded current-master root gate is required in a separate gate phase.
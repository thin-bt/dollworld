# SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint2
mode: BROWSER_ACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
authority-ref: origin/master
predecessor-release-gate: SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1
required-product-sha: ae23fb9e0cc4c446bc052e75d303db44c9e5f911

## Goal

Perform the binding ordinary real-browser/UI acceptance for published F-02 on exact current-master product `ae23fb9`. This is not a focused-test or element-presence acceptance.

## Required acceptance

Start the production web app from the exact published product lineage and drive the ordinary user-facing weekly progression across at least two scheduled tournaments. Prove by observed values and browser/UI state:

1. each crossed tournament completes exactly once;
2. no past-week tournament remains `開催予定`;
3. tournament/battle results persist and are reachable through the ordinary UI;
4. ranking values update/evolve across successive tournaments where results differ;
5. ranking UI reflects the persisted updates;
6. cross a year boundary and prove historical-year ranking navigation exposes valid persisted prior-year ranking/history;
7. Ranking screen and battle presentation remain usable through the same ordinary flow.

Capture concrete before/after values, tournament identifiers/display names, weeks/years, ranking values, and browser evidence sufficient to distinguish a real multi-tournament progression from merely detecting an already-finished first tournament.

## Completion rule

PASS only if the ordinary real UI satisfies the value-based F-02 acceptance above on the exact published current-master lineage. If startup/build/runtime/browser flow fails, or any required value/history behavior is absent, return FIX_REQUIRED with the first reproducible product defect and evidence. Do not declare Sprint2 CLOSED; publish terminal evidence only. Sprint status transition remains PM/control responsibility.

## Output

Publish `_handoff-artifacts/results/SPRINT2-F02-CURRENT-MASTER-ORDINARY-UI-ACCEPTANCE-A-20260923-R1/result.md`, then terminalize A inbox per protocol.
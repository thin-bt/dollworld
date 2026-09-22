# SPRINT3-S03-075-POST-S03-074-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1

state: PREPARED
task-key: SPRINT3-S03-075-POST-S03-074-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE
authority-ref: thin-bt/dollworld master
priority: DEADLINE_CRITICAL

## Objective

Produce the fresh current-master root release gate required after S03-074 published production SHA `8ec56cdc6d482ccc68e35344ed5412a324713c7d` beyond the currently binding S03-072 root gate @ `fdeed36` (1953/1953).

## Required execution

1. Fresh-read GitHub canonical protocol, Sprint3 status, this instruction, A/B2 lane state, and S03-074 terminal result before execution.
2. Claim B2 ACTIVE before changes under the existing executor contract.
3. Fetch canonical `origin/master`; verify the tested product lineage contains S03-074 publication `8ec56cd` and record exact tested tip/product SHA.
4. Run the pristine/current-master root `npm run check` using the self-contained workspace/serialization policy proven by S03-072. Do not weaken assertions, skip suites, reduce workload, or increase product timeouts merely to obtain green.
5. If a genuine product defect is exposed, repair only if uniquely owned/non-conflicting and feasible in this run, publish the repair to canonical master, then rerun the applicable gate from the published bytes. If the failure is environmental/control-only, classify it with concrete evidence rather than changing product semantics.
6. Publish a terminal result to `_handoff-artifacts/results/SPRINT3-S03-075-POST-S03-074-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1/result.md`, including exact counts, tested SHA, commands, failure classification if any, and whether the S03-072 binding can be superseded.
7. Fresh-read the published result and return B2 to IDLE/TERMINAL-consumed according to the lane contract.

## Non-conflict / safety

- Do not consume or wait for any ROLE1 inbox.
- Do not modify A-owned work or duplicate an active A task.
- Preserve S03-072 serialization/pristine-workspace policy.
- Never use broad untracked stash/clean operations prohibited by `GITHUB_CONTROL_PLANE.md`.
- Any transient scratch must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.
- Do not assign Sprint3 `CLOSED`; formal status transition remains control/PM authority after applicable terminal evidence exists.

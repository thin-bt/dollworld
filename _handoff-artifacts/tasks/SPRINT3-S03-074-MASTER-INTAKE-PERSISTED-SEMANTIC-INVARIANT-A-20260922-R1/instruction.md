# SPRINT3-S03-074-MASTER-INTAKE-PERSISTED-SEMANTIC-INVARIANT-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Gap

Fresh Role3 source audit found that `validateMasterIntakeEvaluationOutcome()` structurally validates persisted `acceptance`, `autonomousMaxDisciples`, and `reasons`, but does not enforce the producer's acceptance↔reason semantic contract. `evaluateMasterIntakeDecision()` emits exactly one branch reason: `accept` => `under_autonomous_limit`; `defer` => `at_autonomous_limit_high_aptitude_defer`; `reject` => `at_or_over_autonomous_limit_reject`. A persisted history can therefore currently deserialize contradictory combinations such as `accept` + reject reason.

## Required execution

1. Fresh-read protocol, Sprint3 status, A/B2 lane state, this instruction, and current `origin/master` before editing. Claim A ACTIVE before changes.
2. Inspect producer/tests/spec before fixing; preserve any documented backward-compatibility contract. Do not invent stronger invariants than current producer/spec supports.
3. Add the narrowest persisted-outcome semantic validation so producer-impossible acceptance/reason combinations are rejected. Prefer a closed mapping from acceptance to the current producer reason when compatible with persisted schema history. Preserve valid producer round-trip.
4. Add focused regression tests covering each valid producer branch and contradictory acceptance/reason payload rejection. Include unknown/additional reason behavior according to actual spec/history, not assumption.
5. Run the focused Sprint3 runtime-state/master-intake tests and `npm run typecheck -w @shared-world/simulation-core` once per check family. Do not weaken assertions, skip tests, reduce workload, or use retry ladders.
6. Publish product/tests to canonical `master` if changed, then GitHub-readback the enforcing source/tests. Record exact product SHA.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-074-MASTER-INTAKE-PERSISTED-SEMANTIC-INVARIANT-A-20260922-R1/result.md`, then return A to IDLE only after terminal publication.
8. Because any product SHA after the live S03-072 gate `fdeed36` invalidates that gate as current-product evidence, explicitly flag a fresh bounded root gate as required after publication. Do not assign Sprint3 CLOSED.

## Non-conflict

B2 is IDLE at dispatch. Scope this task to persisted master-intake outcome semantic validation/tests. Do not modify web UI or unrelated Sprint2 source.

## Acceptance

- Persisted master-intake outcomes cannot claim one acceptance branch while carrying a producer-impossible branch reason.
- All current producer-valid accept/defer/reject outcomes still validate/round-trip.
- Focused tests + simulation-core typecheck PASS.
- Canonical publication/readback and exact product SHA recorded if product changes.
- Sprint3 remains governed by fresh canonical status; no self-assigned formal closure.

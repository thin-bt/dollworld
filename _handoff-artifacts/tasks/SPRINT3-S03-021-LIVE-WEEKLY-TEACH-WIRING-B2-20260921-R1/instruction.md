# SPRINT3-S03-021-LIVE-WEEKLY-TEACH-WIRING-B2-20260921-R1

state: READY_FOR_DISPATCH
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: PRODUCT_IMPLEMENTATION
owner: B2
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Fresh canonical gap
`docs/SPRINT_3_BACKLOG.md` marks S03-007 explicit weekly `teach` implemented and defines it as a Sprint3 closed-loop behavior. Canonical source contains `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts`, explicitly documented as a **pure processor**, plus focused unit tests. Current canonical inspection does not establish a production world/weekly-step caller that materializes live mentor/disciple/technique state, invokes the evaluator, and persists accepted teaching/progress/refusal outcomes. This is the same class of pure-slice/runtime closure gap already recovered for enrollment/OTL, but is independent from A-owned S03-020 technique-loss wiring.

## Required work
1. Fresh-read master and trace all production references/callers for the exported explicit-weekly-teach evaluator(s), outcome/record types, and technique teaching selection.
2. Prove or disprove the complete live chain: current mentorship relation + teacher technique/proficiency + disciple state + weekly action/allocation -> explicit teach evaluation/selection -> persistent learner technique/progress/history state visible to the next week.
3. If the chain is absent/incomplete, implement the smallest deterministic production wiring using existing Sprint3 config and pure processors. Do not invent thresholds or redesign weekly scheduling.
4. Preserve relation semantics: formal mentorship versus parent temporary guidance, refusal, allocation limits, tier restrictions, and existing Sprint1 learning/proficiency contracts.
5. Ensure replay/idempotence: one world week cannot double-apply the same teaching outcome; deterministic ordering must not depend on object/map insertion order.
6. Add focused integration/regression tests covering accepted formal teaching persistence, refusal/no mutation, parent temporary guidance tier boundary, allocation exhaustion, replay/no duplicate progress, and coexistence with S03-009/S03-011 generated-technique lifecycle.
7. Run focused tests, simulation-core typecheck/build, and root `npm run check` when feasible.
8. Publish product source/tests to canonical master, then publish terminal result under `_handoff-artifacts/results/<task-key>/result.md` with exact product commit SHA and verification evidence.
9. Verify GitHub canonical readback of changed product symbols before READY.

## Non-conflict boundary
- Cursor A currently owns `SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1`; do not edit its technique-loss persistence paths unless a shared file is strictly required. If overlap appears, fetch/rebase and stop with exact collision evidence rather than overwrite A semantics.
- S03-019 is terminal READY; do not manufacture formatting-only diffs.
- No Sprint4 work.

## Terminal rules
- READY/ACCEPTED is forbidden for local-only work.
- If master already has complete production wiring, publish verification evidence with exact call paths/tests instead of duplicate changes.
- If blocked by active A ownership, publish exact collision evidence and return B2 to IDLE.

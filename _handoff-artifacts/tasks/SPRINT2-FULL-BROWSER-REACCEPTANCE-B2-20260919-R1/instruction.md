# SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

state: PREPARED
lane: B2
sprint: Sprint2
priority: IMMEDIATE
mode: BROWSER_CONTRACT_RECONCILIATION_AND_REACCEPTANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-FINAL-COMPLETION-EVIDENCE-AUDIT-A-20260919-R1
paired-a-terminal: SPRINT2_FINAL_COMPLETION_EVIDENCE_AUDIT_FIX_REQUIRED
required-master-head: e40c60f71012f6b353a9944bd1e5abd92d9308ab
non-overlap: ACCEPTANCE_SPEC_MAINTENANCE_ONLY_NO_PRODUCT_EDITS
recovery: ROLE2_RECONCILE_STALE_ROUND_ROBIN_ACCEPTANCE_CONTRACT_0923

## Objective

Resolve the single Sprint2 mandatory-browser contract conflict reported by the fresh A completion-evidence audit, then rerun the mandatory Chrome 7/7 set against current GitHub master containing `e40c60f`.

Canonical reconciliation decision: the published Sprint2 product behavior is the accepted terminal contract. After the final real round-robin match, the same manual competition step finalizes the competition and exposes coherent champion/standings/final result. The older assertion in `tests/e2e/s2-ui009-round-robin-competition.spec.ts` saying accepted standings/finalization "is not wired yet" is stale relative to the now-published Sprint2 implementation and the browser-prep contract. Do not regress product code to recreate the obsolete intermediate `round_robin_complete` hold.

## Required fix

1. Fresh-read the current versions of:
   - `tests/e2e/s2-browser-regression-acceptance-prep.spec.ts`
   - `tests/e2e/s2-ui009-round-robin-competition.spec.ts`
   - `apps/web/src/server/ui009/routes-competition.ts`
   - latest A audit result.
2. Update only the stale round-robin Playwright terminal assertions/comments so they expect the accepted finalized state after the last manual step: finished state, champion, and annual standings/final result as exposed by the published UI. Preserve all earlier assertions proving >2 participants, real match progression, CTA gating, history, and simulation-read integrity.
3. Do not edit A-owned production implementation unless a new independent product defect is discovered; if so, stop with FIX_REQUIRED and exact evidence instead of making a product edit in B2.
4. Run the full mandatory Chrome set:

```powershell
cd D:\xampp\htdocs\dollworld
npx playwright test tests/e2e/s2-browser-regression-acceptance-prep.spec.ts tests/e2e/s2-ui009-round-robin-competition.spec.ts tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome
```

Expected accepted set: 7/7.

## Acceptance checks

Verify especially:
- no false `finished` at 0/0 after accepted bootstrap
- real match progression remains observable
- final manual round-robin step produces the accepted finalized competition state
- champion/standings/history/finalResult are coherent and based on processed matches
- CTA gating is coherent through active/finished states
- post-tournament next-week simulation continues
- retry/idempotency remains valid
- no INTERNAL_ERROR on the supported path

## Rules

1. Sprint2 only. No Sprint3/4.
2. Acceptance-spec maintenance is allowed only for the stale contradictory terminal expectation identified above.
3. No product implementation edits in B2.
4. Bind verification to current master containing `e40c60f`; report exact HEAD.
5. Publish terminal result to the canonical GitHub result path. READY requires 7/7 PASS after the contract reconciliation; otherwise FIX_REQUIRED with the first reproducible blocker and evidence.

## Terminal output

Publish:
`_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md`

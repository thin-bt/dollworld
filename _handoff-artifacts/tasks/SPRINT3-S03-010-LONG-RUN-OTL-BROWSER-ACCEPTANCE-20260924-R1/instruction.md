# SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1

status: READY_NOT_DISPATCHED
sprint: Sprint3
mode: BROWSER_ACCEPTANCE_FIX_IF_REQUIRED
authority: GitHub thin-bt/dollworld master
priority: CLOSURE_BLOCKER

## Purpose

Close the dedicated S03-010 browser residual without substituting Person Detail or unit/integration evidence for the required ordinary production browser path.

Binding Sprint3 status currently requires dedicated long-run real-browser evidence for:

`OTL founding -> generated-technique registration/materialization -> battle catalog consumption`

The accepted production binding is product `37d6ed4`, root gate `1986/1986`, `139/139` files, wiki `58`, harness `2/2`, web production build PASS. If this task changes product bytes, that binding becomes historical and must be replaced by a fresh exact-lineage gate.

## Required execution

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` and `_handoff-artifacts/control/SPRINT3_STATUS.md` before execution.
2. Start the ordinary production web app from current canonical master. Do not use a test-only route, direct fixture-only invocation, or mocked browser state as acceptance evidence.
3. Drive a deterministic/bounded long-run ordinary session far enough to produce an actual OTL founding event through the production-bound Sprint3 weekly flow.
4. Capture evidence tying the same generated technique across all three stages:
   - founding event/provenance exists,
   - generated technique is registered/materialized into the production technique catalog/read model used by subsequent play,
   - a later real battle resolves an action by consuming that generated technique from the battle-visible catalog rather than merely retaining it in history/state.
5. Record stable identifiers needed to prove identity across stages (generated technique id, founder/person id, founding week/year or equivalent, and battle/match id where available). Do not accept name-only coincidence.
6. Verify the browser-visible ordinary flow remains usable during/after the long run; a backend-only assertion is insufficient.
7. If the ordinary flow cannot reach the required chain because of a product defect, diagnose and implement the smallest Sprint3-scoped fix, add regression coverage, rerun the browser chain, then run the required exact-lineage release gate and production web build.
8. Do not introduce Sprint4 marriage, birth, family-generation, inheritance, or new school-name taxonomy scope.

## Acceptance

PASS requires one coherent ordinary-production-browser evidence chain proving the same generated technique was founded, registered/materialized, and later consumed by battle resolution. Focused tests may support but cannot replace this chain.

If a product fix is required, terminal PASS additionally requires a fresh pristine root gate and production web build on the exact resulting product lineage. Publish the new product SHA and counts; do not continue citing `37d6ed4` as live after product changes.

## Terminal publication

Publish `_handoff-artifacts/results/SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1/result.md` with:

- `status: TERMINAL`
- `result-class: PASS` or `FIX_REQUIRED`/`BLOCKED` with exact reason
- current master/product SHA
- browser path and bounded long-run method
- founder/person id
- generated technique id
- founding time marker
- registration/materialization evidence
- battle/match id and consumption evidence
- screenshots/log/evidence paths where applicable
- changed product files, if any
- focused test results
- exact-lineage pristine root-gate counts if product changed
- production web build result if product changed

## Dispatch rule

This task is READY but MUST NOT overwrite an occupied lane. Current canonical A/B2 inboxes were PREPARED when this instruction was authored. Dispatch to the next genuinely free executable A/B2 lane, with this task preferred over unrelated Sprint3 closure work.
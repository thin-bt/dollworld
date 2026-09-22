# SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: RELEASE_GATE_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
authority-ref: thin-bt/dollworld master

## Why this task exists

The terminal `SPRINT3-POST-WF14-GATE-BINDING-RECONCILIATION-B2-20260922-R1` proved that the post-WF14 gate @ `7004411` cannot bind current product because later product commit `e2a9e0855dfa8bc5e50b6e84133424416f7b6541` changed `apps/**`. Current `SPRINT3_STATUS.md` is also stale and still presents S03-072 @ `fdeed36` as the live gate. A fresh bounded root gate is therefore required for current product lineage.

## Scope

1. Fresh-read `origin/master`, this instruction, `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, `_handoff-artifacts/control/SPRINT3_STATUS.md`, and the reconciliation result above.
2. Claim A ACTIVE using the canonical execution-state contract.
3. Determine the latest `apps/**` + `packages/**` product SHA at pickup. Do not assume it is still `e2a9e08`; record the exact SHA.
4. From a pristine dependency state consistent with S03-072's self-contained harness, run one bounded root `npm run check` against that current product lineage. Do not weaken tests, timeouts, assertions, format/lint/typecheck/build gates, or workloads to obtain green.
5. If the gate fails because of a concrete product/harness defect that is small, unique, and non-conflicting with B2's current browser-evidence task, repair it in the same task, publish the product delta, then rerun the bounded gate once on the repaired product SHA. If repair would overlap B2 or is not bounded, stop with exact blocker evidence and a canonical follow-up instruction/result; do not fabricate PASS.
6. On PASS, update `_handoff-artifacts/control/SPRINT3_STATUS.md` so the live release-gate binding names the exact tested current product SHA and exact test totals. Preserve `REOPENED_FIX_REQUIRED`; this task does not assign formal CLOSED and does not override unresolved ordinary-flow/UI acceptance requirements.
7. Publish `_handoff-artifacts/results/SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1/result.md`, set A TERMINAL, then return A to IDLE according to the executor contract. Verify GitHub readback of result/status/control.

## Non-conflict boundaries

- B2 currently owns `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; do not modify its task/result/control artifacts or interfere with its browser capture.
- Do not consume or wait on any ROLE3_INBOX.
- Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` only.
- Preserve `_handoff-artifacts/specs/**` and `_handoff-artifacts/tools/**`.

## Acceptance

Terminal evidence must bind: exact current product SHA, pristine/setup method, root `npm run check` outcome and totals, whether any repair delta was required, applicable web build outcome from the check, and fresh GitHub readback. A PASS may replace the stale root-gate binding only when no later product delta exists at completion.
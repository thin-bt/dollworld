# SPRINT3-S03-030-REBELLION-SIGNAL-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: DEADLINE_CRITICAL
control-authority: GitHub
authority-ref: thin-bt/dollworld master
predecessor: SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1

## Gap

S03-029 terminal result says PRODUCT_GAP_CLOSED and records product commit `894a701acb362368adee6d93fe268d39d90b5535`, but also explicitly says `published-master-sha: (local — push pending executor)`. Fresh GitHub canonical code search on master does not find the introduced symbol `enrollmentParentRebellionChildPersonIds`. Therefore the S03-029 product closure is not yet canonical on GitHub master and must not be used for formal Sprint3 close.

## Required execution

1. Fresh-read GitHub master, this instruction, S03-029 result, protocol, and current lane state before touching source.
2. Claim lane A ACTIVE using the executor protocol.
3. Recover/reconcile the exact S03-029 product change onto current master. Do not invent a different rebellion model: preserve the explicit persisted caller-owned signal, backward-compatible runtime reload default, live special-reason derivation, and tests described by the S03-029 terminal result.
4. Verify on the actual canonical candidate with focused S03-029 tests and root `npm run check`. Do not report READY from a local-only commit.
5. Publish product source/tests to GitHub canonical `master`, then fresh-read GitHub master and prove the introduced runtime field/helper/live derivation are present.
6. Publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-030-REBELLION-SIGNAL-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1/result.md` with exact canonical master SHA and verification evidence, then return A to IDLE.
7. If the original product commit cannot be safely reconciled because current master conflicts semantically, report BLOCKED with exact files/symbols and leave formal close blocked; do not silently weaken behavior.

## Acceptance

- GitHub canonical master contains the S03-029 rebellion signal product behavior, not only task/result prose.
- `enrollmentParentRebellionChildPersonIds` or its semantically exact reconciled canonical equivalent is visible on master.
- Live chain reaches `rebellion_against_parent` only from the explicit persisted signal and a qualified accepting biological parent; no personality/compatibility inference is invented.
- Backward-compatible reload and positive/negative/reload tests pass.
- Root `npm run check` passes.
- Terminal result identifies the canonical product/master SHA and GitHub readback.

## Non-conflict

Do not edit B2 control state or any B2-owned active task. Do not start Sprint4. Do not create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` locally if scratch is required.
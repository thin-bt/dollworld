# SPRINT3-S03-056-POST-S03-055-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: _handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md

## Gap

S03-054 established the accepted current-master root gate at `1bb58b751f072fbf5d9b540b1763fb739ce24953` (1907/1907), but S03-055 subsequently published a production Person Detail contract/UI delta at `ffad8126c863bd625fc3f80c1dace1e26de70749`. Therefore `SPRINT3_STATUS.md` current-master release-gate binding no longer covers the newest product bytes. S03-055 itself explicitly notes that a post-S03-055 current-master gate is a separate reconciliation when S03-054 tested pre-055 SHA.

## Required execution

1. Fresh-read canonical master, this instruction, S03-054 result, S03-055 result, `SPRINT3_STATUS.md`, and `docs/SPRINT_3_BACKLOG.md` before work.
2. Claim B2 ACTIVE according to the control-plane contract before changes.
3. Verify the tested master SHA descends from S03-055 publication `ffad8126c863bd625fc3f80c1dace1e26de70749`.
4. Run one bounded root `npm run check` on a clean current-master worktree. Preserve the canonical S03-049 Vitest serialization policy. Do not extend test timeouts, skip tests, weaken assertions, reduce simulation workload, or alter product behavior merely to make the gate pass.
5. If the root gate is green, reconcile `_handoff-artifacts/control/SPRINT3_STATUS.md` and `docs/SPRINT_3_BACKLOG.md` so the accepted current-master gate is bound to the actually tested post-S03-055 SHA/result. Preserve `READY_FOR_FORMAL_CLOSE`; do NOT assign Sprint3 `CLOSED`.
6. If a genuine product regression appears, fix only the minimal non-conflicting defect, run focused verification, then re-run the bounded root gate before terminal READY.
7. Publish a terminal canonical result at `_handoff-artifacts/results/SPRINT3-S03-056-POST-S03-055-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1/result.md`, including tested SHA, ancestry evidence, exact pass/fail counts, changed paths, and GitHub readback.
8. Return B2 to IDLE only after terminal result publication/readback.

## Non-conflict / hygiene

- A is IDLE at dispatch; do not consume or modify A control state.
- Scratch/worktrees/logs must be under `_handoff-artifacts/control-tmp/`; never create transient directories directly under `_handoff-artifacts/`.
- Do not modify the S03-055 Person Detail contract unless verification proves a real defect.
- Formal Sprint3 `CLOSED` remains PM/control explicit-transition authority only.

## Acceptance

READY only when the newest canonical product lineage through S03-055 is covered by a green bounded root gate and the canonical status/backlog binding accurately names that evidence. Otherwise terminal BLOCKED/FAILED with concrete evidence; never claim current-master gate completeness from S03-054 alone.
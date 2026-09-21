# SPRINT3-S03-037-FORMAL-STATUS-CANONICAL-PUBLICATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Gap
B2 S03-036 terminal result says `_handoff-artifacts/control/SPRINT3_STATUS.md` was prepared locally with state `READY_FOR_FORMAL_CLOSE`, but fresh GitHub canonical `master` readback returns 404. Therefore the control artifact is not canonical and formal-close readiness is not yet represented at the protocol-mandated status path.

## Task
Recover S03-036's accepted status artifact onto GitHub canonical master. Fresh-read protocol, A/B2 inboxes, S03-036 result, backlog 0.1.4, and current master first. Reconstruct only the evidence-backed non-CLOSED status content from S03-036; do not invent a CLOSED transition and do not infer Sprint4 start.

Publish `_handoff-artifacts/control/SPRINT3_STATUS.md` to canonical master, binding S03-034 eligibility, product baseline `db141297c77586779eb858a71e1f26efda934eee`, S03-031 gate `eb39e2dfb560084c63357a6889d1049a10fcd7ea`, and S03-036 preparation evidence. Verify GitHub master readback after publication. Publish terminal result under the exact task-key result path.

## Acceptance
- GitHub master contains `_handoff-artifacts/control/SPRINT3_STATUS.md`.
- `state: READY_FOR_FORMAL_CLOSE`; never `CLOSED` in this task.
- Evidence anchors above are present and no Sprint4-start inference is introduced.
- Fresh master readback succeeds.
- No product source change.
- No transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` if scratch is necessary.
- Terminal result binds exact published commit/evidence; local-only preparation is not READY.

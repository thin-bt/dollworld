# SPRINT3-S03-004-INTAKE-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: IMMEDIATE
mode: S03_004_INTAKE_IMPLEMENTATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-003-ENROLLMENT-A-20260920-R1
predecessor-terminal: READY / SPRINT3_S03_003_ENROLLMENT_READY
predecessor-published-master-sha: 3c8353700e5217f14eb09e635adeaf3e41a9498c

## Objective
Implement the next unique Sprint3 product gap, S03-004: per-master autonomous disciple intake limit / accept-reject-hold state machine, feeding the existing S03-003 `intakeAcceptance` boundary. No world-global fixed disciple cap.

## Required work
- Fresh-read canonical `docs/SPRINT_3_BACKLOG.md`, Sprint3 config/spec, S03-003 implementation/result before editing.
- Claim lane ACTIVE before product changes.
- Define deterministic per-master intake policy/state and validation/config required by S03-004.
- Produce explicit accept/reject/hold outcome compatible with S03-003 `intakeAcceptance`.
- Preserve existing S03-001..003 contracts unless a documented compatible extension is required.
- Add focused tests covering limits/boundaries, autonomous decision determinism, reject/hold/accept, and no global cap.
- Update canonical Sprint3 docs/backlog only as needed to reflect implemented contract.
- Run focused build/tests and relevant Sprint3 regression tests. Run root `npm run check`; if unrelated pre-existing drift remains, record exact evidence and do not hide it.
- Commit/push production changes to canonical `master` and bind verification to the published SHA.
- Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-004-INTAKE-A-20260920-R1/result.md`, then return lane A to IDLE.

## Non-goals
- S03-005 weekly training pipeline integration.
- S03-006 parent temporary instruction.
- S03-007 explicit weekly `teach`.
- S03-008 technique inheritance/original-technique/loss work.
- Sprint4.
- Cursor B2 control/result ownership.

## Terminal
READY only after canonical master publication plus passing focused evidence. Otherwise FIX_REQUIRED with a concrete next executable gap.
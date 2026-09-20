# SPRINT3-S03-007-WEEKLY-TEACH-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: IMMEDIATE
mode: S03_007_EXPLICIT_WEEKLY_TEACH
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1

## Objective
Implement S03-007 from `docs/SPRINT_3_BACKLOG.md`: explicit weekly `teach` action, teaching refusal, and teaching allocation, preserving the established Sprint1/Sprint3 contracts.

## Required work
1. Fresh-read `docs/SPRINT_3_BACKLOG.md`, `docs/specs/09-technique-system.md`, `docs/specs/10-training-and-learning.md`, Sprint3 config/domain contracts, and S03-006 terminal/evidence.
2. Implement the smallest deterministic explicit weekly `teach` action contract required by the canonical specs, including refusal and teaching-allocation behavior. Do not invent hard-coded balance values absent from canonical config/spec.
3. Keep Sprint4 retirement/inheritance scope out. Do not broaden into S03-008 except for minimal types/interfaces strictly required by S03-007.
4. Add focused deterministic tests for accepted teaching, refusal, allocation/bounds, invalid inputs, and compatibility with existing weekly training/technique contracts.
5. Update canonical Sprint3 backlog/spec only where implementation status or contract clarification is required.
6. Run relevant build/tests and `npm run check`; document only genuinely pre-existing unrelated blockers.
7. Publish product changes to canonical `master`, then publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-007-WEEKLY-TEACH-A-20260920-R1/result.md` with published SHA and evidence.

## Terminal
READY only when S03-007 is implemented, tested, published to canonical master, and the next unique Sprint3 gap (normally S03-008) is identified. Otherwise FIX_REQUIRED with exact blocker/evidence.

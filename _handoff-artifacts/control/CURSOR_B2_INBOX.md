# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-004-INDEPENDENT-ACCEPTANCE-B2-20260920-R1
mode: S03_004_INDEPENDENT_ACCEPTANCE
updatedAt: 2026-09-20T17:23:50+09:00
sprint: Sprint3
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-004-INDEPENDENT-ACCEPTANCE-B2-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
required-product-sha: f01d1823c9e40f08c1129001082c9f06f25c515c
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before verification
- independently verify S03-004 without conflicting with A S03-005
- publish terminal result to GitHub canonical result path
- do not start Sprint4
- pickup-recovery: canonical PREPARED remains unclaimed and no terminal exists at 2026-09-20T17:23:50+09:00; immediate re-dispatch of the same authority; do not create a duplicate task

# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4
mode: BROWSER_ACCEPTANCE_PREP
updatedAt: 2026-09-18T16:35:30+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
non-overlap: TEST_ACCEPTANCE_ONLY_NO_A_PRODUCT_SURFACES
predecessor-task: SPRINT2-BROWSER-REGRESSION-PREP-B2-20260917-R3
recovery: ROLE3_RETRIGGER_STALE_PREPARED_R4_NO_ACTIVE_OR_TERMINAL_1635
pickup-requirements:
- fresh-read GitHub canonical instruction
- do not edit A-owned product implementation
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path

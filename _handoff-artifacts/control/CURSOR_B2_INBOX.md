# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1
mode: VISUAL_BROWSER_REACCEPTANCE
updatedAt: 2026-09-20T09:01:30+09:00
sprint: Sprint2
priority: IMMEDIATE
instruction-path: _handoff-artifacts/tasks/SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
required-product-sha: 8d52ead09e7a5a6736777ab281db21ae79f28d48
predecessor-terminal: FIX_REQUIRED / SPRINT2_VISUAL_BROWSER_ACCEPTANCE_B2_FIX_REQUIRED
paired-a-terminal: READY / SPRINT2_VISUAL_FIX_PUBLICATION_READY
pickup-requirements:
- fresh-read GitHub canonical instruction and visual completion protocol
- claim ACTIVE before work
- independently re-run Chrome visual acceptance at 390/900/1440 on published fixes
- publish terminal result to GitHub canonical result path
- consume inbox after terminal publication
- no Sprint3/4 until Sprint2 visual/formal completion

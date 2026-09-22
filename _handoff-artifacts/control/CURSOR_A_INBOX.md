# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1
mode: CANONICAL_PUBLICATION_RECOVERY
updatedAt: 2026-09-22T19:51:37+09:00
priority: DEADLINE_CRITICAL
authority-ref: thin-bt/dollworld master
instruction-path: _handoff-artifacts/tasks/SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1/instruction.md
last-consumed-task-key: SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1
last-terminal: SPRINT2_WF14_TOURNAMENT_DISPLAY_NAME_A_PASS
last-result-path: _handoff-artifacts/results/SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1/result.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint2
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path

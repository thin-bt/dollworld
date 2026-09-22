# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-059-REVERSE-DISCIPLE-BROWSER-EVIDENCE-CANONICAL-PUBLISH-A-20260922-R1
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-22T09:39:25+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-059-REVERSE-DISCIPLE-BROWSER-EVIDENCE-CANONICAL-PUBLISH-A-20260922-R1/instruction.md
authority-ref: _handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md
last-consumed-task-key: SPRINT3-S03-057-PERSON-DETAIL-REVERSE-DISCIPLE-BROWSER-EVIDENCE-A-20260922-R1
last-terminal: S03_057_PERSON_DETAIL_REVERSE_DISCIPLE_BROWSER_EVIDENCE_READY
last-result-path: _handoff-artifacts/results/SPRINT3-S03-057-PERSON-DETAIL-REVERSE-DISCIPLE-BROWSER-EVIDENCE-A-20260922-R1/result.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish reverse-disciple browser E2E spec to canonical master
- verify GitHub readback before READY
- publish terminal result to GitHub canonical result path

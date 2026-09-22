# Cursor A Inbox
state: PREPARED
lane: A
task-key: SPRINT3-S03-062-POST054-EVIDENCE-LEDGER-RECONCILIATION-A-20260922-R1
mode: RELEASE_EVIDENCE_RECONCILIATION
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-22T10:51:08+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-062-POST054-EVIDENCE-LEDGER-RECONCILIATION-A-20260922-R1/instruction.md
authority-ref: _handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md
last-consumed-task-key: SPRINT3-S03-061-FINAL-PRODUCT-GAP-RECONCILIATION-A-20260922-R1
last-terminal: S03_061_FINAL_PRODUCT_GAP_RECONCILIATION_READY
last-result-path: _handoff-artifacts/results/SPRINT3-S03-061-FINAL-PRODUCT-GAP-RECONCILIATION-A-20260922-R1/result.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- publish terminal result to GitHub canonical result path

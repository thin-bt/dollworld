# Cursor B2 Inbox
state: IDLE
lane: B2
task-key: (none)
mode: (none)
updatedAt: 2026-09-21T04:04:00+09:00
last-consumed-task-key: SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1
last-terminal: RELEASED / PICKUP_FAILED_STALE_PREPARED / FAILOVER_TO_A
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
release-reason: canonical PREPARED remained unclaimed while B2 active lock stayed IDLE; deadline recovery transfers unique S03-009 authority to free lane A
pickup-requirements:
- do not execute released B2 S03-009 authority
- fresh-read GitHub canonical before accepting any later B2 task

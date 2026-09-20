# Cursor B2 Inbox
state: PREPARED
lane: B2
task-key: SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
updatedAt: 2026-09-21T07:59:06+09:00
instruction-path: _handoff-artifacts/tasks/SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: Sprint3
recovery-request: REDISPATCH
recovery-reason: post-fix pickup recovery after canonical executor commit 67e96916b1978faa27fe18399387602d7b44ecaf made REDISPATCH/RETRIGGER cooldown-exempt; prior 07:00 redispatch predated that fix and B2 active remains IDLE
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- execute generated-technique production battle consumption audit/integration; do not status-only
- do not take over Cursor A S03-016 live master qualification persistence work
- publish terminal result to GitHub canonical result path
- verify canonical master readback before READY
- if executor still cannot claim this post-fix REDISPATCH, treat as executor/daemon sync-health failure rather than rewriting timestamps again

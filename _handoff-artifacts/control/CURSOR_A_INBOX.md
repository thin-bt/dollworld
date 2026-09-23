# Cursor A Inbox
state: PREPARED
lane: A
task-key: UI-BATTLE-SHARED-MOCK-V03-20260923-R2
mode: UI_IMPLEMENTATION_BROWSER_VERIFY
updatedAt: 2026-09-23T17:57:00+09:00
instruction-path: _handoff-artifacts/tasks/UI-BATTLE-SHARED-MOCK-V03-20260923-R2/instruction.md
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
sprint: cross-sprint UI implementation
pickup-requirements:
- fresh-read GitHub canonical instruction
- claim ACTIVE before changes
- use `11-12_mock_battle_result_log_mock_v03.html` as visual/layout blueprint
- implement shared mock/tournament battle presentation; do not create tournament-only duplicate UI
- production build + real browser desktop/narrow comparison required
- publish terminal result to GitHub canonical result path

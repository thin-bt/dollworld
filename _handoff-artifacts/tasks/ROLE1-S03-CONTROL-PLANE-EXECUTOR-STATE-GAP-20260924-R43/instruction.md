# ROLE1-S03-CONTROL-PLANE-EXECUTOR-STATE-GAP-20260924-R43

state: COMPLETE
role-origin: Role1
sprint: Sprint3
mode: RELEASE_CONTROL_EVIDENCE
control-authority: GitHub `thin-bt/dollworld` / `master`

## Fresh-read evidence

- `GITHUB_CONTROL_PLANE.md` requires Cursor lane dispatch state to be interpreted with the canonical inbox plus transient Active/heartbeat execution state while the compatibility executor remains in use.
- Cursor A canonical inbox is `PREPARED` for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1`.
- Cursor B2 canonical inbox is `PREPARED` for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`.
- The canonical `_handoff-artifacts/control/` directory currently contains only `CURSOR_A_INBOX.md`, `CURSOR_B2_INBOX.md`, `SPRINT2_STATUS.md`, and `SPRINT3_STATUS.md`; no GitHub Active/heartbeat artifact exists there.
- Latest Role3 evidence `ROLE3-S03-TRANSMISSION-DISPATCH-READINESS-20260924-R33` correctly says neither PREPARED inbox may be overwritten until the lane is proven free using Inbox plus Active/heartbeat.

## Release-control finding

GitHub-only Role1 can prove that both lanes are PREPARED, but cannot prove either lane free or executing from canonical GitHub state alone because the required compatibility Active/heartbeat state is not represented in GitHub. Therefore dispatching the READY transmission task by overwriting either inbox would violate the pickup contract; repeatedly rewriting PREPARED timestamps would also not prove pickup.

This is a control-plane observability gap, not a product blocker and not permission to stop any automation. Sprint3 remains `REOPENED_FIX_REQUIRED`; the live product gate remains `37d6ed4` / `1986/1986` / `139/139` / web production build PASS until superseded by a later exact-lineage gate.

## Required recovery

PM/executor control must expose or mirror each lane's current Active task and heartbeat/pickup state into a GitHub-readable canonical/diagnostic artifact, or complete GitHub-native polling/materialization. Once a lane is proven free, dispatch the already-READY `SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1` immediately unless newer terminal/superseding evidence exists.

Do not create a new transmission task, do not overwrite a possibly claimed PREPARED lane, and do not treat absence of GitHub Active/heartbeat files as proof that a lane is idle.
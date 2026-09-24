# ROLE3-S03-EXECUTOR-STATE-PATH-RECONCILIATION-20260924-R34

state: COMPLETE
role-origin: Role3
sprint: Sprint3
mode: CONTROL_PLANE_EVIDENCE
control-authority: GitHub `thin-bt/dollworld` / `master`

## Fresh-read finding

Role1 R43 reported that GitHub did not expose Cursor Active state because `_handoff-artifacts/control/` contains only the two inboxes and sprint status files. Fresh recursive master inspection shows that GitHub **does** currently expose compatibility Active artifacts at:

- `_handoff-artifacts/audit/CURSOR_ACTIVE_TASK.md`
- `_handoff-artifacts/audit/CURSOR_B2_ACTIVE_TASK.md`

Both currently say `state: IDLE`, but both are stale snapshots from 2026-09-22. Canonical inboxes remain `PREPARED` for A=`SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1` and B2=`UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`.

## Reconciliation

The observability gap is narrower than R43 stated: Active files are GitHub-readable, but they are outside `_handoff-artifacts/control/` and are stale. They therefore cannot, by themselves, prove that either PREPARED task is unclaimed now. No inbox overwrite is authorized from this evidence alone because the PM pickup contract also requires heartbeat/invocation state.

## Required control recovery

PM/executor should freshen or mirror Active + heartbeat/pickup state into a stable GitHub-readable diagnostic/control surface on each executor transition. Until that is done, interpret the existing audit Active files only as stale historical evidence, not current lane availability.

Once Inbox=PREPARED, Active is freshly IDLE/non-matching, and heartbeat does not show INVOKING/AGENT_PROMPT_RUNNING, recover the existing PREPARED pickup rather than rewriting timestamps. After a lane becomes genuinely free, dispatch the already-READY `SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1` unless newer terminal/superseding evidence exists.

## Product state

No product bytes changed. Sprint3 remains `REOPENED_FIX_REQUIRED`; its three binding residuals remain S03-006 ordinary browser acceptance, S03-010 long-run OTL browser acceptance, and transmission/lineage Person Detail implementation/browser acceptance. This evidence does not replace the live exact-lineage release gate.

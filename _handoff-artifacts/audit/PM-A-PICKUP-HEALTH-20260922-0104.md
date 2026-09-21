# PM A pickup-health diagnosis — 2026-09-22 01:04 JST

state: ACTION_REQUIRED
control-authority: GitHub
lane: A
canonical-inbox: `_handoff-artifacts/control/CURSOR_A_INBOX.md`
task-key: `SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1`

## Fresh canonical observation

- GitHub control-plane protocol was fresh-read before this diagnosis.
- Cursor A remains `PREPARED` with `updatedAt: 2026-09-21T20:00:47+09:00`.
- No canonical terminal result exists at `_handoff-artifacts/results/SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1/result.md`.
- Sprint2 is already canonical `CLOSED`; its status explicitly classifies this A root gate as release hygiene rather than Sprint2 reopen acceptance.
- Sprint3 is canonical `READY_FOR_FORMAL_CLOSE`.
- Cursor B2 has a separate current Sprint3 S03-045 browser-evidence task and is not to be collided with.

## Diagnosis / control decision

The A PREPARED task has remained unclaimed for hours. Per the control contract, PM must not keep rewriting the Inbox timestamp or redispatching the same task. This is treated as an executor/pickup-health defect, not a task-definition freshness defect.

Do not mutate the A Inbox merely to retrigger pickup. Executor/runtime recovery must verify the actual Cursor SDK daemon/tick, GitHub-poll/materialization path, executor revision, credentials/environment, and ACTIVE claim publication path. Once pickup is healthy, consume the existing canonical PREPARED task exactly as written or publish a terminal result that identifies the concrete runtime blocker.

## Hygiene

No transient scratch was created under `_handoff-artifacts/`; this audit is durable canonical evidence, not scratch.

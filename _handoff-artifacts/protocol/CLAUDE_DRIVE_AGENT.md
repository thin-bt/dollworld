# Claude Drive Agent Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-AUTH-001, CORE-STORAGE-001, PARALLEL-COLLISION-001, PARALLEL-OUTPUT-001
scope: browser Claude / Drive review operation

This file contains Claude/Drive-specific rules only. Generic working-tree concurrency remains owned by `PARALLEL_AGENTS.md`.

## CLAUDE-FAST-001 — read-only fast path / authority boundary
Read this file only when browser Claude is actually used.
Claude reads Drive inputs and never edits existing shared files. Claude does not write `audit/current`, `audit/archive`, or `specs/current` and does not independently promote authority.
If instructions are incomplete or contradictory, Claude records the issue in a new output artifact rather than modifying the input/control file.

## CLAUDE-INBOX-001 — fixed Inbox / independent-review instruction
Fixed entrance: `audit/CLAUDE_INBOX.md`. ChatGPT owns it by default; the user may explicitly update it. Claude reads but does not update it.
For independent review, the Inbox should normally contain updated time, task-key, work type, scope, known spec/branch/HEAD where relevant, and output destination.
Specify review scope, not ChatGPT's already-known conclusions or verdict, unless the user explicitly requests a focused check.

## CLAUDE-OUTPUT-001 — immutable generation outputs
Claude never updates an existing output. Use `claude-<type>-<YYYYMMDD>-<NN>.md`.
Primary output folder: `audit/claude/`; task-specific reviews may use `audit/claude/<task-key>/`.
For spec proposals, Claude writes only new generation files under `specs/proposed/<scope-path>/claude/`; `specs/current` remains read-only.
Within the same scope/task-key/type, latest means the highest date/sequence. Drive revision history is not Claude generation history.
Legacy unkeyed outputs may be associated externally with a task-key, but the original Claude file is not renamed or rewritten.

## CLAUDE-STATUS-001 — append-only status events
Claude status is append-only generation evidence under `audit/claude/status/`, named `claude-status-<task-key>-<NN>.md`; do not use a fixed mutable Claude status file.
Each event should include task-key, role, status, waiting-for, last-reviewed, next-action, input-needed, and related-output.
Useful statuses include `READY`, `IN_PROGRESS`, `WAITING`, `BLOCKED`, and `COMPLETE` when supported by the actual run. Status is reported state, not independent acceptance proof.

## CLAUDE-INTEGRATION-001 — adoption / acceptance separation
ChatGPT/PM decides whether to adopt, reject, or request follow-up on Claude outputs.
Formal acceptance continues to prefer Git files/diff, verification results, authoritative specs, and mechanical SHA/Git evidence before agent reports. Claude output does not by itself establish ACCEPT/PASS authority.
Claude generation outputs normally remain immutable history rather than being moved to `audit/archive`; cleanup/moves, if needed, are performed by an authorized writer.

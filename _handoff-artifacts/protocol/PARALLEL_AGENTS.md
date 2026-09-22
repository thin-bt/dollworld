# Parallel Agents Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-LANES-001, CORE-AUTH-001
scope: generic multi-agent concurrency

## PARALLEL-COLLISION-001 — write collision / isolation
In one Git working tree/index, only one agent may perform Git-tracked writes at a time.
Read-only review/analysis/test-log inspection/proposal drafting may run in parallel when outputs are separate.
True concurrent Git-writing requires physically isolated working tree/index environments and explicit permission from current task authority. If worktree/repo/branch isolation is forbidden, do not create it merely to parallelize.
Any uncertain overlap in source/spec/control/generated artifact/output path => serialize.
A historical ACTIVE/task marker, old process note, or prior writer claim is not by itself proof that a Git writer still owns the working tree/index after an interruption. Before keeping Git-tracked work serialized because of a possibly stale writer, inspect the live process/owner evidence available to the environment plus repository/index state. If no live writer remains, reconcile the stale marker and release the serialization condition; do not reserve the working tree forever on history alone.
If Git reports an interrupted lock such as `.git/index.lock`, treat lock removal as mechanical recovery only after confirming no live Git process owns that lock and the repository identity is the intended dollworld working tree. Remove only the proven-stale lock, then immediately re-run bounded repository/status checks before writing. If liveness/ownership cannot be proven safely, keep Git-writing serialized but continue unrelated non-Git/read-only work; do not broaden the local lock into a project-wide stop.

Cursor A/B2 lane names and controls are defined only by `CURSOR-B2-001`; this file does not duplicate them.

## PARALLEL-VERIFY-001 — heavy verification exclusivity
Heavy verification that may use shared temp/output/process resources must not run concurrently within the same dollworld development environment. If a heavy verification is already running, do not start another heavy verification until the first has finished.
This rule applies to broad/full verification such as Sprint-wide verification or full test matrices when shared-resource collision is plausible. It does not by itself serialize lightweight targeted tests, lint, typecheck, docs checks, read-only review, or other bounded checks that do not contend for the same shared resources.
A historical log/status/marker saying that heavy verification started is not by itself proof that it is still running. Before waiting on an apparently occupied verification slot after an interruption or stale timestamp, check the actual owner/process/resource state that is available to the current environment. If no live verification still owns the shared resources, the stale marker does not reserve them permanently; record/reconcile the stale state and proceed. If liveness cannot be established safely, keep only the heavy verification serialized while allowing unrelated lightweight work.
Do not add a mutex/recovery subsystem solely to satisfy this rule. Additional lock implementation is adopted only if repeated incidents show the simple exclusivity rule is insufficient.

## PARALLEL-OUTPUT-001 — output ownership
Each agent uses separate Inbox/result/output paths. Agents do not share mutable instruction/report filenames unless an explicit owner protocol says so.
Acceptance authority/independent-evidence requirements: `AUDIT-EVIDENCE-001`.

Browser Claude-specific behavior belongs only to `CLAUDE_DRIVE_AGENT.md`.

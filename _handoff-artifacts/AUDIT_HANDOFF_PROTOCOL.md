# dollworld 監査・受け渡し運用プロトコル

authority: root-normative
rule-index: protocol/CONTROL_RULE_INDEX.md
scope: protocol-router

## ROOT-AUDIT-ENTRY-001 — audit entry
実装監査・受入監査・再監査は毎回このrootから開始する。
実装/制御authority・ownershipは `CORE-AUTH-001`、独立受入要件は `AUDIT-EVIDENCE-001`、spec mirror意味論は `SPEC_MIRROR.md` を参照する。このrootではそれらの本文を再定義しない。

## ROOT-ROUTER-001 — routing
共通ルール本文はここに複製しない。`CONTROL_RULE_INDEX.md` でRule ID ownerを解決し、必要なownerだけ読む。

### Audit / acceptance / re-audit
1. this root
2. `protocol/CONTROL_RULE_INDEX.md`
3. `protocol/AUDIT_WORKFLOW.md`
4. target `audit/current/<task-key>` evidence
5. 必要時のみ `ARTIFACT_LAYOUT.md`, `SPEC_MIRROR.md`, `SPEC_SYNC.md`

### PM / Role normal automation
Idle fast pathではrootを毎回再読しない。PMは固定 `audit/assignments/PM_EXECUTOR.md` とRole CURRENT/OUTBOX、Roleは自身の固定CURRENT/OUTBOXだけを読む。PM executor判定は `QUEUE-PM-EXECUTOR-001`、compact pollingは `QUEUE-FAST-001` に従う。
project/Sprintの大目的・大工程・依存・milestone方向は `PROJECT_ROADMAP.md` を `CORE-ROADMAP-001` の境界で参照する。
protocol変更直後、manual reconciliation、矛盾/例外時は `CONTROL_RULE_INDEX.md` -> `CONTROL_CORE.md` -> `ASSIGNMENT_QUEUE_PROTOCOL.md` を読む。

### User shorthand
Short user commands such as `k` / `ｋ`, `確認して`, `続けて`, `監査して`, `再監査して` are resolved only by `protocol/USER_COMMAND_SHORTHANDS.md` / `USER-SHORTHAND-001`. Other protocols do not redefine their meanings.

### Cursor
`CONTROL_RULE_INDEX.md` -> `CONTROL_CORE.md` -> `CURSOR_HANDOFF.md` -> canonical task instruction。

### Thread restart
root -> `THREAD_HANDOFF_PROTOCOL.md` -> fixed handoff snapshot -> `PROJECT_ROADMAP.md` (`CORE-ROADMAP-001`) -> relevant live CURRENT/OUTBOX/Inbox/Active revalidation。

### Activity
`ACTIVITY_LOG_PROTOCOL.md` owner ruleに従う。normal fast pathの必読ではない。

### Completion
normal accepted task: `TASK_COMPLETION.md`
Sprint final: `TASK_COMPLETION.md` -> `SPRINT_COMPLETION.md`

### Parallel agents
`PARALLEL_AGENTS.md`; Cursor lane specificsは `CURSOR_HANDOFF.md`。

## Canonical protocol list
- `CONTROL_RULE_INDEX.md` — Rule ID -> single normative owner
- `CONTROL_CORE.md` — shared control invariants
- `UI_TUNING_CONFIG.md` — human-tunable UI numeric/config ownership
- `AUDIT_WORKFLOW.md` — audit/acceptance
- `USER_COMMAND_SHORTHANDS.md` — single owner for user->GPT shorthand commands
- `ASSIGNMENT_QUEUE_PROTOCOL.md` — PM/Role queue
- `CURSOR_HANDOFF.md` — Cursor startup/lock/instruction/commit/B2
- `ACTIVITY_LOG_PROTOCOL.md` — execution evidence
- `THREAD_HANDOFF_PROTOCOL.md` — thread continuity snapshot
- `PARALLEL_AGENTS.md` — concurrency/collision
- `TASK_COMPLETION.md` — normal task finalization
- `SPRINT_COMPLETION.md` — Sprint final completion
- `ARTIFACT_LAYOUT.md` — artifact placement
- `SPEC_MIRROR.md` — spec authority/mirror semantics
- `SPEC_SYNC.md` — mirror sync
- `CLAUDE_DRIVE_AGENT.md` — Claude-specific behavior

## Non-duplication
Normative single-owner/change mechanics are defined only by `CONTROL_RULE_INDEX.md`. This root only routes to that authority.

## Fixed ownership reminder
Ownership details are `CORE-AUTH-001`; Cursor lock semantics are `CURSOR-LOCK-001`; task-specific branch/commit/worktree/spec constraints come only from the current task authority and are not inherited from old tasks.

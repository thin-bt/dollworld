# dollworld Thread Handoff Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-AUTH-001, CORE-READ-001, CORE-ROADMAP-001
scope: PM / Role1 / Role2 / Role3 / Protocol Design continuity

## HANDOFF-SNAPSHOT-001 — continuity snapshot
A fixed handoff is a timestamped continuity snapshot, not a live command/result database and not authority over CURRENT/OUTBOX/Inbox/Active.
At update time, replace snapshot fields in place; do not append a newer current-state block below an obsolete one.
Routine live-state changes after `updatedAt` may legitimately make the snapshot stale.

Minimum semantic snapshot fields:
`updatedAt`, `thread-role`, `status`, `current-authority`, `current-project-state`, `current-assignment`, `current-lane`, `current-blockers`, `pending-decisions`, `cursor-state`, `do-not-repeat`, `immediate-next-actions`, `important-references`, `last-verified-evidence`.

For a PM handoff, the snapshot MUST additionally carry a compact `pm-operating-contract` pointer pack that is sufficient for a fresh thread to reconstruct **how PM must operate**, not merely where work currently sits. This pack contains Rule-ID references only (no duplicated normative prose) for the current PM mission/throughput objective, lane responsibilities, drain/dispatch completion semantics, blocker routing, provisional-source handling, user-facing report semantics, Cursor publication/pickup semantics, and any current execution-surface limitation/recovery invariant that materially affects PM decisions. At minimum, unless superseded by the rule index, include pointers to `CORE-THROUGHPUT-001`, `CORE-LANES-001`, `QUEUE-PM-DRAIN-001`, `QUEUE-BLOCKER-ROUTE-001`, `QUEUE-PROVISIONAL-SOURCE-001`, `QUEUE-REPORT-001`, `CURSOR-PUBLISH-001`, and `CURSOR-PICKUP-001`.
The pack is a **restart bootstrap minimum, not an exhaustive whitelist of PM rules**. A restarted PM MUST also read the current `CONTROL_RULE_INDEX.md` once and discover any newer, renamed, superseding, or additionally applicable PM Rule IDs that are relevant to the current PM run, live controls, pending PM requests, or immediate roadmap action before normal operation. This is bounded applicability discovery, not a requirement to read every protocol owner file. A stale handoff pack must never suppress a current owner rule. When several required Rule IDs share one owner file, read that owner file once and resolve all needed rules from that read; handoff restart must not create redundant repeated reads merely because the pack lists multiple Rule IDs.

The PM handoff must also include `pm-purpose-summary`, a concise non-normative statement of the current PM objective. The summary is continuity help only; Rule-ID owners remain normative.
Keep details as pointers, not copied evidence.

## HANDOFF-TRIGGER-001 — update triggers
Update only when continuity for a future thread materially changes: accepted milestone, major FIX_REQUIRED/material blocker, sprint/lane/major phase transition, protocol/role-boundary change, important user/product decision, thread migration/length, or explicit user request.
Do not update merely for routine generation increment, normal OUTBOX result, Cursor ACTIVE/IDLE flip, or next normal Inbox task.

## HANDOFF-START-001 — restart
New thread:
1. read root;
2. read `USER_COMMAND_SHORTHANDS.md` once so user->GPT shorthand dispatch is available from its single owner `USER-SHORTHAND-001`;
3. read fixed handoff snapshot;
4. apply the `CORE-ROADMAP-001` restart read of `PROJECT_ROADMAP.md`;
5. for a PM thread, read `audit/assignments/PM_EXECUTOR.md` and apply `QUEUE-PM-EXECUTOR-001` before any PM-owned write;
6. for a PM thread, reconstruct the PM operating contract from the handoff `pm-operating-contract` bootstrap pack **and the currently applicable PM rules identified by one `CONTROL_RULE_INDEX.md` read for this run/live state**, resolving only the relevant current owner files before issuing a user-facing PM status, classifying a lane as waiting/healthy, dispatching new work, or ending the run. The handoff pack is not a whitelist. Group Rule IDs by owner and avoid duplicate owner-file reads. The restart is incomplete until the PM can distinguish at least: progress vs liveness, internal executable action vs genuine external wait, source canonicality vs safe non-destructive work, publication vs pickup vs actual execution, and role capability blocker vs task impossibility. This step references current Rule-ID owners and does not authorize handoff prose to override them;
7. revalidate only relevant live CURRENT/OUTBOX/Inbox/Active and accepted authority for the immediate next action;
8. apply `QUEUE-PM-DRAIN-001` before the first normal PM report/idle decision so a freshly inherited thread cannot merely summarize stale state when safe PM-owned actions are already determined;
9. do not reconstruct old chat history unless a specific unresolved fact requires it.

Fixed handoffs remain under `audit/handoff/` with stable IDs. After an actual handoff update, read back once.

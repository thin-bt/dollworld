# 監査成果物・配置・Archive運用

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-STORAGE-001, AUDIT-IDENTITY-001, TASK-FINALIZE-001, PARALLEL-OUTPUT-001
scope: physical artifact placement only

This file owns physical placement only. Cursor startup/instruction semantics belong to `CURSOR_HANDOFF.md`; acceptance evidence semantics belong to `AUDIT_WORKFLOW.md`; Claude naming/status semantics belong to `CLAUDE_DRIVE_AGENT.md`; spec mirror semantics belong to `SPEC_MIRROR.md` / `SPEC_SYNC.md`.

## ARTIFACT-ROOT-001 — local / Drive roots
Cursor-side operational output root is:
`D:\xampp\htdocs\dollworld\_handoff-artifacts\`

Synced Drive root is:
`dollworld-audit/`

`AUDIT_HANDOFF_PROTOCOL.md` remains at the root of both views because project routing depends on that fixed location.
Cursor writes operational artifacts inside `_handoff-artifacts`; it does not write directly to `G:\マイドライブ\...`.
New audit artifacts are not created loose at the root merely for convenience.

The local `_handoff-artifacts` path and the logical Drive name `dollworld-audit/` are intentionally different views of the same operational artifact topology; provider metadata may resolve canonical objects through a Computer-synced `_handoff-artifacts` tree. **That path/name difference alone is not sync-root drift and must not trigger migration or duplication.** Resolve canonical objects by stable ID, expected logical identity, and current control references. Treat storage as drift only when there is evidence of split authority or divergent canonical content/IDs (for example two independently maintained live copies, a fixed control resolving to the wrong identity, or current references pointing to incompatible trees). Never create a second canonical copy, bulk-move stable-ID controls, or rename the local `_handoff-artifacts` path merely to make provider folder labels visually match the logical name.

## ARTIFACT-TASK-001 — current task placement / isolation
Task-specific audit material belongs under:
- local: `_handoff-artifacts\audit\current\<task-key>\`
- Drive: `dollworld-audit/audit/current/<task-key>/`

`audit/assignments/` is the live Role queue-control namespace. New task reports, status packets, review notes, or other evidence are not written loose there; only the fixed CURRENT/OUTBOX controls and explicitly queue-owned compatibility objects belong in that namespace. Legacy loose assignment artifacts may remain until reference-safe classification permits archival; do not move them merely by age.

Each parallel task uses a distinct `<task-key>` directory. Shared mutable report/instruction names must not be reused across task directories or actors; actor/output ownership follows `PARALLEL-OUTPUT-001` and the relevant owner protocol.
Canonical filenames such as Cursor instruction/report names are defined by their owner protocols and are referenced here rather than redefined.
Same-task fix work may update the current task directory while it remains the live task identity; when a distinct fix generation must remain independently addressable, use a distinct task-key/fix identity consistent with `AUDIT-IDENTITY-001`.


## ARTIFACT-PM-REQUEST-001 — PM external-request placement
Physical placement for external-thread PM requests is:
- template: `dollworld-audit/audit/pm-requests/PM_REQUEST_TEMPLATE.md`;
- non-terminal requests: `dollworld-audit/audit/pm-requests/inbox/<request-id>.md`;
- terminal request-processing records: `dollworld-audit/audit/pm-requests/processed/<request-id>.md`.

One request is one raw Markdown file. `PENDING`, `DEFERRED`, and `NEEDS_USER_INPUT` remain in `inbox`; `DISPATCHED`, `REJECTED`, `DUPLICATE`, and `SUPERSEDED` belong in `processed`. Moving a request between inbox and processed preserves its Drive identity when the provider permits. Do not create a second canonical copy merely to represent a lifecycle transition.

This namespace is control intake/history, not task evidence storage. Implementation/audit artifacts generated after dispatch still follow `ARTIFACT-TASK-001`; Role CURRENT/OUTBOX and Cursor controls remain in their existing canonical locations. Request semantics, precedence, supersession, and dispatch are owned by `QUEUE-EXTERNAL-REQUEST-001`; this rule owns paths only.

## ARTIFACT-ARCHIVE-001 — archive / legacy migration
Move a task from `audit/current/<task-key>` to `audit/archive/<task-key>` only when finalization conditions under `TASK-FINALIZE-001` permit it and no further fix generation is expected for that live identity. Merely starting another task is not sufficient reason to archive unstable evidence.
`audit/archive` is historical evidence and does not outrank current identity under `AUDIT-IDENTITY-001`.
Legacy audit artifacts created before task-scoped layout may remain in place when moving them would break references. If legacy material is later organized, first establish task/generation identity, then move it to the appropriate archive location without deleting or overwriting history merely for neatness.

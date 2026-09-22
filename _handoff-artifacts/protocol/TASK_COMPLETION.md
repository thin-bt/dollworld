# 通常タスク完了手順

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-STATE-001, CORE-STORAGE-001, CURSOR-COMMIT-001, AUDIT-EVIDENCE-001
scope: task-completion

## TASK-FINALIZE-001 — risk-proportional task acceptance / finalization
Independent audit is **not** a universal per-task tax. Before or at dispatch, PM/current task authority assigns the lightest acceptance mode that still protects material correctness. Existing in-flight tasks keep their already-authorized acceptance path unless user/higher authority changes it.

Acceptance modes:
- `INDEPENDENT`: required for material public/external API or schema contracts, persistence/migration/serialization compatibility, determinism/replay/RNG semantics, security/auth/session boundaries, large or ambiguous gameplay/product-rule changes, Sprint/milestone transition evidence, or any task explicitly requiring independent acceptance. Apply `AUDIT-EVIDENCE-001` to the smallest sufficient independent set.
- `BATCHED_INDEPENDENT`: default for a coherent sequence of low/medium-risk production changes under an already accepted contract where later items do not introduce a high-risk boundary. Each task must pass its own required build/unit/static checks, but several adjacent tasks may continue before one independent audit at the declared batch boundary. The batch must be independently accepted before Sprint/milestone completion or before crossing into a consumer whose safety depends on the unverified material behavior.
- `SELF_CHECK`: allowed for non-semantic docs/status/mirror/control wiring and narrowly internal mechanical plumbing/helpers/adapters that do not change public schema, persistence, determinism/replay, security, gameplay semantics, or another material contract. Required local checks and exact diff/stage review are sufficient; no separate Role audit is created solely for formality.

When classification is ambiguous because the change touches one of the material surfaces above, choose `INDEPENDENT`. Do not escalate to the user merely because `acceptance-mode` was omitted when the current diff/authority makes the class uniquely determinable. Do not split one coherent low-risk batch into per-task Role ping-pong only to manufacture acceptance events.

Finalization trigger:
- `INDEPENDENT`: matching independent ACCEPT exists;
- `BATCHED_INDEPENDENT`: task-local checks pass and the task is recorded as part of the still-open accepted-contract batch; at the batch boundary, matching independent ACCEPT closes the batch;
- `SELF_CHECK`: required task checks/diff/stage review pass.

Finalization steps:
1. establish the accepted/verified implementation checkpoint according to current task authority and `CURSOR-COMMIT-001`;
2. verify task evidence, branch/HEAD and remaining repo state relevant to the selected acceptance mode;
3. do not recommit the same implementation merely because a later batch/independent acceptance happened after an existing implementation commit;
4. when a post-acceptance commit is actually required, follow current task authority and `CURSOR-COMMIT-001`;
5. record final implementation checkpoint identity and acceptance mode/batch identity when applicable;
6. refresh `specs/current` only when current mirror rules require it;
7. archive task evidence only after no further fix generation is expected and identity is stable;
8. reconcile consumed Cursor PREPARED state under `CORE-STATE-001` before issuing the next task.

Finalization is restart-safe. An already satisfied task-local check, independent ACCEPT, or closed batch is reused; later interruption must not repeat implementation or acceptance without changed material evidence. Post-acceptance status wording, mirror refresh, evidence archive/move, or activity/handoff cleanup blocks the next task only when the next task or formal Sprint completion actually consumes that artifact/state. Mechanical housekeeping failure does not reopen accepted/verified product work.

## TASK-STATUS-001 — post-acceptance status synchronization
If Git-managed docs/wiki still describe the current task as pending/in-audit, create only the minimum status delta. Do not change product/runtime semantics or bump spec version solely for status wording.
Markdown wording is prepared by ChatGPT/PM unless current task explicitly authorizes mechanical application by Cursor.
Do not rewrite historically correct old status text that is clearly historical.

Sprint-final task continues to `SPRINT_COMPLETION.md` after normal task finalization requirements are satisfied.

# dollworld Cursor Local Mirror Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
scope: PM publication to local Cursor SDK executor
inherits: CORE-AUTH-001, CORE-BLOCK-001, CORE-STATE-001, CORE-MONOTONIC-001, CORE-STORAGE-001, CURSOR-PUBLISH-001, CURSOR-PICKUP-001

## CURSOR-LOCAL-PUBLISH-001 — executor-claimable PREPARED publication gate

When a Cursor lane is configured to use the local SDK executor, Drive publication integrity alone is insufficient to make an Inbox command executable.

Before PM may leave Cursor A or B2 Inbox as `PREPARED`, the exact canonical instruction for that task identity MUST also be claimable by the configured local executor.

For the current local SDK executor, claimable means:
1. the canonical Drive instruction already passes `CURSOR-PUBLISH-001`;
2. `_handoff-artifacts/audit/current/<task-key>/gpt-to-cursor-instruction.txt` exists on the executor machine, OR the executor bootstrap has a configured authenticated canonical-Drive fetch path that can materialize the exact file before claim;
3. the local file is non-empty and corresponds to the same task-key/canonical instruction identity that was verified on Drive;
4. the local executor health surface does not report `INSTRUCTION_MISSING` for that same task after publication/mirroring/bootstrap recovery;
5. no different local task identity is substituted merely to satisfy the mirror check.

The PM publication transaction is therefore: publish/verify canonical Drive instruction and pointers -> mirror or otherwise materialize the exact instruction on the executor machine (including executor-bootstrap self-materialization when configured) -> verify local claimability -> write/read-back Inbox `PREPARED` last.

If PM cannot write the executor-local mirror directly, it MUST NOT report the task as fully published/claimable merely because Drive is prepared. It must preserve the same task identity and route the configured local bootstrap/recovery mechanism immediately. `LOCAL_MIRROR_PENDING` may be emitted only as a transient diagnostic while that recovery attempt is in progress or after a concrete recovery failure; it is not an acceptable steady-state wait when the canonical Drive instruction is valid and the local executor is healthy.

A local SDK executor remains fail-closed: missing/unreadable local instruction => no claim, no ACTIVE, no implementation mutation. Fail-closed does not permit passive indefinite waiting when same-task recovery is mechanically possible.

## CURSOR-LOCAL-RECOVERY-001 — same-task local mirror self-healing

When executor evidence reports `INSTRUCTION_MISSING`, or when Inbox/control state is `LOCAL_MIRROR_PENDING` or `LOCAL_MIRROR_RECOVERY_FAILED`, for a Drive-valid current task, the configured local SDK executor/bootstrap MUST treat the condition as a recoverable delivery fault rather than a normal idle state. A prior recovery failure is not sticky authority: every eligible poll MUST fresh-read the local instruction path before preserving the blocker.

Required recovery sequence:
1. preserve the current task identity; do not mint a replacement task;
2. resolve the exact canonical Drive instruction identity/pointer for that task from the already-authorized control surface;
3. before returning a no-op status, attempt the configured authenticated canonical-Drive fetch/materialization path for that exact instruction;
4. write it atomically to `_handoff-artifacts/audit/current/<task-key>/gpt-to-cursor-instruction.txt` using a temporary same-directory file plus replace/rename semantics so a partial file is never claimable;
5. verify the local file is present, non-empty, and bound to the same task-key and canonical instruction identity; when a canonical content hash is available, verify the hash before claim;
6. rerun the bounded executor health/pickup check in the same executor cycle;
7. only after `INSTRUCTION_MISSING` clears may the task be treated as claimable and executor pickup proceed.

Bootstrap ownership / no-central-wait rule:
- The executor/bootstrap that requires the local mirror owns this recovery attempt. PM/Role wake is latency assistance, not a required middle hop.
- A healthy executor MUST NOT repeatedly emit `NOOP_INBOX_LOCAL_MIRROR_PENDING` for the same Drive-valid task without attempting recovery each eligible cycle.
- After one failed recovery attempt, record the concrete transport/auth/path error. Subsequent cycles MUST first recheck whether the exact local instruction now exists and is non-empty; if so, clear the stale failure and continue pickup. Otherwise they may retry under the bounded retry policy, but must not collapse the reason to generic `LOCAL_MIRROR_PENDING`.
- If recovery is impossible because the executor lacks an authenticated Drive/file-id fetch capability, that missing bootstrap capability is an implementation defect of the local executor path. Route it as an internal implementation task; do not route it to USER merely to copy a file manually.
- If the configured execution environment provides direct Drive/file-id fetch at claim time, that mechanism may satisfy the claimability gate instead of a pre-existing local mirror, but it must still fail closed on identity/content mismatch and must not weaken `CURSOR-PUBLISH-001`.

## Recovery implementation acceptance criteria

The local SDK executor/bootstrap is not considered complete until an automated test or bounded live verification proves all of the following:
- local instruction absent + Drive-valid canonical instruction present -> executor materializes the exact same-task local file without user action;
- materialization uses atomic publication and rejects empty/partial/wrong-task content;
- after successful materialization, the same cycle or immediate bounded retry can progress from mirror-missing to claimable/pickup;
- a Drive/auth/path failure produces a specific diagnostic and never mutates implementation files;
- repeated healthy cycles cannot remain indefinitely in generic `LOCAL_MIRROR_PENDING` or stale `LOCAL_MIRROR_RECOVERY_FAILED` when the exact same-task local instruction is already present and non-empty.

## Reporting

PM status must distinguish:
- `DRIVE_PUBLISHED_LOCAL_CLAIMABLE` — Drive integrity and local executor claimability both proven;
- `LOCAL_MIRROR_RECOVERING` — same-task bootstrap recovery is actively being attempted;
- `LOCAL_MIRROR_RECOVERY_FAILED:<reason>` — a concrete bootstrap recovery attempt failed and bounded retry/routing applies;
- `LOCAL_MIRROR_PENDING` — transient compatibility status only; must be reconciled immediately to RECOVERING, RECOVERY_FAILED:<reason>, or CLAIMABLE;
- `INSTRUCTION_MISSING` — executor explicitly observed the required local instruction absent before/while recovery;
- `ACTIVE` — Cursor-owned same-task claim exists.

`PREPARED` alone is never reported as active progress.

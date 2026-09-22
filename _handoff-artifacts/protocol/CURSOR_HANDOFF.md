# dollworld Cursor Handoff Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-AUTH-001, CORE-BLOCK-001, CORE-STATE-001, CORE-MONOTONIC-001, CORE-STORAGE-001, CORE-LANES-001
scope: Cursor A / Cursor B2

This file contains Cursor-specific rules only. Do not restate inherited CORE rules here.

## CURSOR-START-001 — single startup order
Cursor A:
1. read `audit/CURSOR_ACTIVE_TASK.md`;
2. if a task is already ACTIVE, apply `CURSOR-RECOVERY-001` before considering any different Inbox task; a different task does not start while the active task remains unresolved;
3. read `audit/CURSOR_INBOX.md`;
4. if not PREPARED, no task starts;
5. read exactly the referenced `audit/current/<task-key>/gpt-to-cursor-instruction.txt`;
6. verify task-key, branch, HEAD, commit/worktree constraints, MIME; for production implementation also apply `CURSOR-SPRINT-ENTRY-001`;
7. write ACTIVE lock;
8. perform work/checks/evidence;
9. write final result and return Active to IDLE.
B2 uses the same sequence with B2 controls. No second startup order is normative.

## CURSOR-INSTRUCTION-001 — canonical instruction
Every PREPARED task references raw `text/plain` `audit/current/<task-key>/gpt-to-cursor-instruction.txt`.
It must be executable without whole-roadmap/protocol/history rereads and contain exact branch/HEAD, commit/worktree policy, authority, scope/forbidden scope, required checks and outputs. Production implementation tasks additionally declare `roadmap-target-sprint` and the fixed `sprint-transition-gate-id` required by `CURSOR-SPRINT-ENTRY-001`.
Inbox is a compact pointer, not a duplicate task specification. Missing/unreadable canonical instruction => STOP before work, but treat it as a recoverable publication/control condition rather than permanent task semantics; PM reconciles publication under `CURSOR-PUBLISH-001`.

## CURSOR-LOCK-001 — control semantics
Inbox/canonical GPT instruction are PM-owned. Active lock/report/evidence are Cursor-owned.
`PREPARED` means command available; Active records execution fact. Consumed PREPARED handling is CORE-STATE-001. PM never clears a Cursor-owned ACTIVE lock merely because it looks old; same-lane recovery is owned by `CURSOR-RECOVERY-001`.

## CURSOR-PUBLISH-001 — atomic task publication ordering / publication integrity gate
PM publishes a Cursor task dependency-first. Before either Cursor A or B2 Inbox may be written as `PREPARED`, PM must complete and verify the publication-integrity gate against the exact intended task identity:
1. canonical raw `audit/current/<task-key>/gpt-to-cursor-instruction.txt` exists;
2. its MIME is `text/plain` and content is non-empty;
3. the instruction's task-key matches the Inbox task-key exactly;
4. the referenced task folder is the canonical `audit/current/<task-key>/` identity;
5. every PM-owned pointer required by the Inbox/instruction resolves to the intended task identity;
6. required branch/HEAD, authority, commit/worktree policy, scope/forbidden scope, required checks and outputs are present and internally consistent.
Only after all checks pass may PM write the compact Inbox `PREPARED` command last, then read back both the Inbox and canonical instruction/pointers sufficiently to prove the published command resolves to that same task identity. The PREPARED command records `publication-integrity: VERIFIED` for that exact task identity. Because Inbox/instruction/pointers are PM-owned, any later PM mutation to a publication-critical field or referenced canonical instruction/pointer must clear/replace that proof and re-run this gate before wake/pickup; an untouched VERIFIED publication may reuse the prior proof. Production implementation publication also requires `CURSOR-SPRINT-ENTRY-001`; PM publication text cannot override that gate. A task is not published merely because an instruction file or Inbox entry exists.

A `PREPARED` command that fails any publication-integrity gate is an **invalid publication state**, not executable work and not a valid waiting state. PM must repair or neutralize that same publication in the same active-PM drain run whenever the defect is observable and mechanically recoverable; it must not leave the lane reported as working/waiting, wake Cursor against the broken publication, or mint a competing replacement task first. If repair requires material missing authority/input, preserve the exact invalid publication identity and record the concrete blocker. Cursor stops before implementation on any such invalid publication. Do not paper over the gap by creating a second instruction with a competing identity.

## CURSOR-PICKUP-001 — PREPARED pickup watchdog / publication integrity before wake
A PM-published Inbox `PREPARED` command with the corresponding Active control still `IDLE` or still reporting a different completed task is pending pickup, not active progress. PM must not describe or count that lane as working merely because PREPARED exists.

When PM observes `PREPARED + IDLE`, first inspect the durable publication proof. If the Inbox carries `publication-integrity: VERIFIED` for the same task and no PM-owned publication-critical field/instruction/pointer has been changed since that proof, reuse it; do **not** re-fetch and re-prove MIME/content/folder/pointer integrity on every poll or wake. Re-run the bounded `CURSOR-PUBLISH-001` integrity check only when the proof is absent/legacy, the task identity changed, a publication-critical PM write/recovery occurred, or observed evidence contradicts the proof. A failed required check is repaired/neutralized as an invalid publication state before executor recovery is considered.

Process liveness, tick emission, executor availability, and actual pickup are separate health dimensions. Cursor A and B2 each use a lane-specific raw heartbeat control (`audit/CURSOR_A_LOOP_HEARTBEAT.md`, `audit/CURSOR_B2_LOOP_HEARTBEAT.md`) when a local inbox loop is configured. That loop owns its heartbeat. Minimum fields are `status`, `pid` or equivalent loop identity, `lastAliveAt`, `nextTickAt`, `lastInboxSeenAt`, `lastInboxTaskKey`, `lastInboxState`, `lastPickupAttemptAt`, `lastPickupResult`, and `lastError`. `status: RUNNING` / a fresh `lastAliveAt` proves only that the heartbeat/tick loop is alive. It does **not** prove that a Cursor agent/executor exists, that the emitted tick is being consumed, that a task was claimed, or that implementation started.

A heartbeat result such as `TICK_EMITTED_PREPARED`, `TICK_EMITTED_NO_EXECUTABLE`, or equivalent means only that the loop classified the Inbox and emitted its tick/sentinel. It is **not** a successful pickup attempt and must never be interpreted as `ACTIVE`, `着手済み`, working, healthy execution, or evidence that the Cursor agent consumed the task. Actual pickup is established only by the corresponding Cursor-owned Active control transitioning to the same task identity (`ACTIVE` or a valid same-task terminal result) or by an equally authoritative executor-owned claim/output defined by the current control contract.

When a valid `PREPARED + IDLE` task exists, PM/pickup recovery first determines whether the configured local component is merely a heartbeat/tick emitter or includes an actual autonomous Cursor executor. If only the tick emitter is proven, classify executor availability separately; do not call the lane autonomous merely because the PowerShell loop is RUNNING. A fresh heartbeat with repeated `TICK_EMITTED_PREPARED` while Active remains IDLE proves **tick delivery was attempted/emitted, not execution**. If no separate agent/tick consumer is proven to be running and able to claim the task, classify `CURSOR_EXECUTOR_UNAVAILABLE` (or a narrower factual executor-consumer blocker), not ordinary waiting and not `CURSOR_RUNNER_STALL`.

If an actual autonomous executor/consumer is proven, PM compares the current PREPARED task identity with both heartbeat and executor-owned claim/progress. Any of the following is a runner/executor-stall condition rather than ordinary waiting: heartbeat stale beyond tolerance; heartbeat fresh but current PREPARED task is not seen within the configured tick interval; tick emitted for the current task but the proven executor/consumer does not claim it within its configured reaction interval; or repeated executor attempts report the same non-authority/non-user mechanical error without Active/progress movement. Classify the narrowest factual condition (`CURSOR_TICK_LOOP_STALL`, `CURSOR_EXECUTOR_STALL`, or equivalent), apply bounded recovery, and do not report the lane as working merely because heartbeat says RUNNING. A/B2 use the same semantics.

Only after publication integrity passes may pickup timing/executor availability be evaluated. If the same valid PREPARED command remains unclaimed across two completed active-PM cycles, or longer than the relevant configured tick/consumer interval, PM checks the actual Cursor executor/consumer availability and whether the task remains valid against its required branch/HEAD/authority. If a configured autonomous executor/consumer is available, recover/invoke that same command through the configured mechanism; do not republish or mint a duplicate task. A tick-emitter script that only writes heartbeat and prints `AGENT_LOOP_TICK_*` is not, by itself, such an autonomous executor.
If no autonomous Cursor executor/consumer is available, record the exact lane blocker as `CURSOR_EXECUTOR_UNAVAILABLE` / external execution availability and continue independent Role/B2/control-plane work under `QUEUE-LOCAL-ISOLATION-001`. Escalate to the user only when actual user action is required to start/restore that executor/consumer. If the PREPARED task became invalid before pickup, PM neutralizes/reconciles that PM-owned publication before replacing it; Cursor does not start stale authority.


### Cursor SDK executor operational binding
For a configured Cursor SDK executor, the canonical local operations reference is `_handoff-artifacts/audit/CURSOR_EXECUTOR_PM_OPS.md`. This is an operational binding of `CURSOR-PICKUP-001`, not a second normative owner.

When diagnosing `PREPARED + IDLE` for such a lane:
- inspect `_handoff-artifacts/audit/CURSOR_EXECUTOR_ALERT.md` first when present;
- run `powershell -NoProfile -ExecutionPolicy Bypass -File "_handoff-artifacts/audit/cursor-executor-health.ps1"` when PM/Cursor has the local execution capability;
- use the SDK executor / 5-minute poll state defined by the OPS reference as the primary automatic-pickup health evidence; the legacy 1-hour `CURSOR_B2_LOOP_HEARTBEAT` alone is not canonical proof of SDK pickup health;
- a Drive-resident instruction alone is insufficient for local SDK claim. The corresponding local `_handoff-artifacts/audit/current/<task-key>/gpt-to-cursor-instruction.txt` must exist; if absent, classify `INSTRUCTION_MISSING` and do not claim the task until the local instruction is materialized from the verified canonical publication;
- daemon/health `RUNNING`, heartbeat refresh, or successful health command still does not prove pickup. Pickup requires the same-task Active/claim/terminal evidence defined above;
- executor-side diagnostics/recovery requested through Cursor should use the current OPS `Command for Cursor` block (or a narrower task-specific command) rather than inventing a parallel recovery procedure.

If the local OPS file is missing or stale relative to the configured SDK executor, classify the narrow operational documentation/control gap and apply `QUEUE-CAPABILITY-DISCOVERY-001` / `QUEUE-BLOCKER-ROUTE-001`; do not silently fall back to interpreting the 1-hour heartbeat as executor success. Retry/fallback budgets remain owned by `QUEUE-RETRY-BUDGET-001`.


## CURSOR-SPRINT-ENTRY-001 — production pickup fail-closed on Role1-owned Sprint transition gate

Before either Cursor lane writes ACTIVE for a **production implementation** task, it enforces the fixed Sprint transition gate. The purpose is to prevent cross-Sprint production drift, not to repeat the entire transition audit for every task inside an already released Sprint.

Required production instruction fields:
- `roadmap-target-sprint`
- `sprint-transition-gate-id`

Define the durable transition fingerprint from the fixed gate as:
`<gate-mode>|<allowed-production-sprint>|<certificate-file-id-or-BASELINE>|<certificate-sha256-or-BASELINE>`.
A successful production pickup records this fingerprint in its Cursor-owned Active/result as `validated-transition-fingerprint`.

### Same-Sprint fast path
For a later production task targeting the same Sprint, Cursor reads the fixed gate and current `PROJECT_ROADMAP.md` and verifies:
1. instruction gate ID equals canonical stable Drive ID `1CnbdZOvywT-KmFMUdb8ZJxvIB-y_1il9`;
2. task `roadmap-target-sprint` equals gate `allowed-production-sprint`;
3. Roadmap is the same canonical file and its current phase equals that Sprint;
4. the current gate fingerprint exactly matches a previously successful `validated-transition-fingerprint` for that Sprint;
5. no explicit current Roadmap/higher-authority state indicates a material invalidation under `SPRINT-TRANSITION-001`.

When all five hold, the previously validated transition is reused. Do **not** refetch/re-hash the certificate, outgoing completion evidence, tag, or independent-audit identities merely because another same-Sprint task is starting.

### Full validation path
Perform the full transition validation only when the fingerprint has never been successfully validated for this Sprint, the gate fingerprint changed, the allowed Sprint changed, the Roadmap canonical identity/phase changed, or a material invalidation signal exists.
- `BASELINE`: production is allowed only for that already-current baseline Sprint.
- `CERTIFIED`: fetch the Role1-owned certificate referenced by the gate and verify certificate ID/SHA, `TRANSITION_ALLOWED`, incoming Sprint, `unresolved-material-roadmap-gaps: 0`, certification-time Roadmap identity, outgoing completion snapshot/tag, and required independent-audit identity as required by `SPRINT-TRANSITION-001`.
- Non-material Roadmap status/progress/hash drift alone is not invalidation and does not require re-certification.

Any Sprint mismatch, changed/unvalidated gate fingerprint, missing/unreadable required gate on the full-validation path, certificate identity mismatch, actual material invalidation, nonzero material-gap count, or PM-only release statement is `SPRINT_TRANSITION_GATE_BLOCKED` before ACTIVE/production mutation. A changed fingerprint triggers validation, not automatic user escalation; if the new fingerprint validates, proceed and record it.

This gate cannot be waived by Inbox text, automation prompt, or PM assertion. Same-Sprint production reuses an unchanged validated release; only material transition changes reopen the expensive validation.

## CURSOR-REBIND-001 — pre-start branch/HEAD drift recovery
A PREPARED command whose required branch/HEAD no longer matches the implementation environment does not start blindly, but a uniquely mechanical/non-conflicting HEAD drift is not automatically a user/spec blocker. Before Active is written, classify the delta under `CORE-BLOCK-001` and current task authority.
If intervening changes are proven not to alter the task's accepted authority, owned/forbidden paths, predecessor gate, commit/worktree policy, or required behavior/evidence, PM may rebind the same unconsumed task publication to the current verified HEAD by updating the PM-owned canonical instruction/Inbox consistently and reading them back; do not mint a duplicate task merely for mechanical HEAD drift. If the delta touches task-owned code/spec/authority or makes more than one safe interpretation plausible, keep the task unstarted and route the exact re-preflight/blocker instead of guessing.
A stale expected HEAD caused only by accepted status/docs/control movement must not leave a valid task permanently PREPARED-but-unstartable when the rebind is uniquely provable.

## CURSOR-RECOVERY-001 — interrupted/stale ACTIVE recovery
An ACTIVE record is not a permanent deadlock after a process interruption. On startup, when this lane already has an ACTIVE task, Cursor first reconciles that same task identity against its canonical instruction, Inbox provenance, branch/HEAD, worktree/index, existing evidence, and commit/result state.
- If the active task is safely resumable, resume the same task without creating a different task or a second ACTIVE identity.
- If required outputs/checkpoint already exist and only final control closure was interrupted, Cursor verifies them and completes its own final result/IDLE transition.
- If the task cannot safely resume because material worktree/authority/evidence uncertainty remains, keep the lane blocked with the exact material condition; do not silently clear the lock.
A newer/different PREPARED task waits until this recovery is complete. PM may request/reconcile recovery but never rewrites the Cursor-owned Active record. Before Cursor writes ACTIVE/IDLE completion state, apply `CORE-MONOTONIC-001`: a late stale run does not overwrite a newer task identity or roll an already-completed same-task Active record back to ACTIVE. This rule applies equally to Cursor A and B2.

## CURSOR-COMMIT-001 — commit/staging
Default commit policy is `REQUIRED_ON_SUCCESS` unless current instruction says otherwise.
Before commit: required checks pass, stage-set reviewed, only task-owned paths staged, never `.cursor/` or `_handoff-artifacts/`, unrelated changes excluded, branch/HEAD still valid, no STOP condition remains.
No broad staging. `commit: FORBIDDEN` means no commit; dirty state classification follows CORE-BLOCK-001/current instruction.

## CURSOR-B2-001 — secondary lane controls
Canonical files are `CURSOR_B2_INBOX.md` and `CURSOR_B2_ACTIVE_TASK.md`. Legacy `CURSOR_B_*` or `(1)` collision files are non-canonical.
B2 work must satisfy `PARALLEL-COLLISION-001` and CORE-LANES-001.

**Bounded verification recovery.** B2 verification must not turn resource tuning into an open-ended retry ladder. For one exact command/target, after the first resource/process failure B2 may perform at most one mechanically justified production-equivalent retry when it can name the concrete correction (for example fixing a non-production-equivalent harness/provider or applying the repository/task-declared memory setting). Do not keep escalating heap sizes or replaying the same long-run simply to search for a passing resource ceiling. If the bounded retry still OOMs, terminates orphaned, or cannot produce a complete terminal transcript, record the exact failure as terminal verification evidence and release the lane for production repair / acceptance adjudication. A larger ad-hoc heap is evidence about resource sensitivity, not acceptance success, unless the task authority explicitly defines that memory envelope as production-supported.

While an Agent invocation is long-running, the SDK executor heartbeat must remain fresh and include same-task liveness/progress fields sufficient to distinguish active execution from a stuck invocation. A stale WIP file alone does not override a fresh executor-owned `processAlive=true` heartbeat; conversely, repeated fresh scheduler polls without child-process/progress evidence do not prove the verification is advancing.

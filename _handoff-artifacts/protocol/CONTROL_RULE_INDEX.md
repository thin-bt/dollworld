# dollworld Control Rule Ownership Index

authority: normative-router
purpose: every operational rule has exactly one normative owner

## CONTROL-NONDUP-001 — single-owner rule body / semantic dedupe

## Non-duplication invariant

A normative rule MUST be written in full in exactly one owner file.
Other protocols, automation prompts, handoffs, task instructions, and evidence may only:
- reference the Rule ID;
- add narrower task/domain facts that do not redefine the rule;
- quote at most a short label, not restate the rule body.

If two files contain competing versions of the same rule, the owner listed here wins and the duplicate text must be removed rather than synchronized.

## Shared core rules — owner: CONTROL_CORE.md
- `CORE-AUTH-001` — live authority / control ownership
- `CORE-READ-001` — normal read budget / fast-path principle
- `CORE-ROADMAP-001` — single project roadmap / objective and Sprint-completion alignment
- `CORE-THROUGHPUT-001` — development progress is the control-plane objective
- `CORE-BLOCK-001` — blocking vs non-blocking budget
- `CORE-ACTION-001` — same-run PM action closure
- `CORE-ACCEPT-001` — bounded delta acceptance reuse
- `CORE-STATE-001` — live state coherence / consumed commands
- `CORE-MONOTONIC-001` — late/overlapping live-control writes must not regress newer/final state
- `CORE-STORAGE-001` — raw MIME / canonical identity / dedupe / evidence minimalism
- `CORE-LANES-001` — high-level lane responsibilities
- `CORE-HISTORY-001` — archived/legacy protocols are non-normative

## UI tuning rules — owner: UI_TUNING_CONFIG.md
- `UI-TUNING-001` — human-tunable UI numeric/config ownership and UX-vs-hard-contract classification

## Queue rules — owner: ASSIGNMENT_QUEUE_PROTOCOL.md
- `QUEUE-FAST-001` — PM/Role compact-control polling
- `QUEUE-RUN-PERF-001` — lightweight PM/Role run-phase performance accounting and bounded waste diagnosis
- `QUEUE-PM-DRAIN-001` — active PM must drain all uniquely executable internal control actions before report/idle
- `QUEUE-PM-SELF-WAKE-001` — bounded short PM follow-up after newly created/retried/recovered asynchronous transitions; hourly cadence remains the base
- `QUEUE-CONTRACT-001` — CURRENT / OUTBOX field contract
- `QUEUE-TRANSITION-001` — READY / WAITING / completion transitions
- `QUEUE-RECONCILE-001` — generation mismatch must resolve explicitly
- `QUEUE-AUTONOMY-001` — PM generations vs autonomous auxiliary work
- `QUEUE-PARALLEL-FLOW-001` — dependency-DAG parallel Role dispatch / fan-out-fan-in / no same-item ping-pong
- `QUEUE-EXTERNAL-REQUEST-001` — external dollworld thread -> PM request intake / dispatch boundary
- `QUEUE-BLOCKER-001` — blocker owner/action/resume requirements
- `QUEUE-USER-DECISION-PREFLIGHT-001` — canonical spec/history authority check before user-decision wait/escalation
- `QUEUE-USER-CONFIRMATION-001` — canonical validated user-confirmation queue identity/lifecycle surface
- `QUEUE-PROVISIONAL-SOURCE-001` — provisional source usability vs canonical-authority confirmation
- `QUEUE-BLOCKER-ROUTE-001` — capability-blocked work must be routed to a safe capable lane before PM wait/exit
- `QUEUE-PREFLIGHT-001` — Role1 bounded next-task preflight
- `QUEUE-PM-EXECUTOR-001` — switchable PM runtime ownership via fixed executor selector
- `QUEUE-PM-SCORE-RECOVERY-001` — PM self-recovery from Role-authored score evidence
- `QUEUE-ROLE-AUTONOMY-001` — Role-side autonomous convergence for already-authorized waits, result recovery, and deterministic same-Role continuation
- `QUEUE-ROLE-CONTINUATION-001` — narrow pre-authorized same-Role N+1 publication without PM takeover
- `QUEUE-PM-FAILOVER-001` — Role-side emergency fenced PM surrogate drain on low score / repeated unjustified idle / PM drain failure
- `QUEUE-AUTOMATION-001` — assignment-loop automation configuration ownership
- `QUEUE-AUTOMATION-SYNC-001` — automation prompt derivation/staleness reconciliation
- `QUEUE-DISPATCH-WAKE-001` — post-dispatch Role wake acceleration
- `QUEUE-RESULT-WAKE-001` — terminal Role result wakes PM for prompt reconciliation/next-lane dispatch
- `QUEUE-CURSOR-RESULT-RELAY-001` — Role-loop read-only relay wakes PM for terminal Cursor A/B2 results
- `QUEUE-CAPABILITY-DISCOVERY-001` — connector capability discovery before declaring tool/capability blocker
- `QUEUE-READ-COMPLETENESS-001` — pagination/truncation-safe complete reads before absence conclusions
- `QUEUE-TRANSIENT-FAILURE-001` — retryable connector/provider failure handling
- `QUEUE-CONTROL-RECOVERY-001` — stable-ID fixed-control mechanical self-recovery
- `QUEUE-DISPATCH-SAFETY-001` — idempotent lane publication / live-command overwrite guard
- `QUEUE-SCHEDULE-INDEPENDENCE-001` — scheduler jitter/overlap-safe generation semantics
- `QUEUE-WORKING-RECOVERY-001` — Role WORKING interruption/overlap recovery
- `QUEUE-RUN-BUDGET-001` — execute determined control action before optional run work
- `QUEUE-LOCAL-ISOLATION-001` — local failure/blocker isolation without aborting independent lanes
- `QUEUE-STALL-RECOVERY-001` — control-plane starvation detection and priority recovery
- `QUEUE-AUTOMATION-POINTER-001` — stable cached Drive pointers for assignment-loop reliability
- `QUEUE-WATCH-POLL-001` — machine-observable wait polling / user-response routing
- `QUEUE-REQUEST-LIFECYCLE-001` — strict semantic request disposition and processed-storage closure
- `QUEUE-RETRY-BUDGET-001` — bounded transient retries with persistent-stall promotion
- `QUEUE-FAIRNESS-001` — prevent request/lane attention starvation
- `QUEUE-AUTOMATION-HEALTH-001` — four-loop scheduler health recovery watchdog
- `QUEUE-REPORT-001` — PM user-facing control status report contract

## User command shorthand rules — owner: USER_COMMAND_SHORTHANDS.md
- `USER-SHORTHAND-001` — canonical user->GPT shorthand dispatch (`k`/`ｋ`, check/continue/audit forms)

## Cursor rules — owner: CURSOR_HANDOFF.md
- `CURSOR-START-001` — single Cursor startup order
- `CURSOR-INSTRUCTION-001` — canonical gpt-to-cursor instruction contract
- `CURSOR-LOCK-001` — Inbox / Active ownership and lock semantics
- `CURSOR-PUBLISH-001` — dependency-first verified PREPARED publication ordering
- `CURSOR-PICKUP-001` — PREPARED pickup watchdog / hidden executor-stall detection
- `CURSOR-SPRINT-ENTRY-001` — production pickup fail-closed on Role1-owned Sprint transition gate
- `CURSOR-REBIND-001` — pre-start mechanical/non-conflicting branch/HEAD drift recovery
- `CURSOR-RECOVERY-001` — interrupted/stale ACTIVE same-task recovery
- `CURSOR-COMMIT-001` — commit policy and staging rules
- `CURSOR-B2-001` — Cursor B2 lane-specific controls

## Cursor local executor rules — owner: CURSOR_LOCAL_MIRROR_PROTOCOL.md
- `CURSOR-LOCAL-PUBLISH-001` — local SDK executor claimability required before PREPARED is considered fully published
- `CURSOR-LOCAL-RECOVERY-001` — same-task local mirror recovery for INSTRUCTION_MISSING

## Activity rules — owner: ACTIVITY_LOG_PROTOCOL.md
- `ACTIVITY-EVENT-001` — material-event-only logging
- `ACTIVITY-TARGET-001` — canonical activity file identity
- `ACTIVITY-STREAM-001` — durable append-only automation activity stream
- `ACTIVITY-RUN-PERF-001` — compact per-run performance sample for PM/Role loops
- `ACTIVITY-PM-SCORE-001` — Role1/2/3 score PM on every Role run and append the evidence-based score
- `ACTIVITY-FAIL-001` — logging failure fallback
- `ACTIVITY-RETENTION-001` — retention/reconciliation

## Audit rules — owner: AUDIT_WORKFLOW.md
- `AUDIT-EVIDENCE-001` — independent evidence-based acceptance
- `AUDIT-IDENTITY-001` — current task evidence resolution by canonical parent/control identity
- `AUDIT-STOP-001` — audit clarifier/STOP application of CORE-BLOCK-001
- `AUDIT-RECOVERY-001` — evidence visibility/transport recovery before audit BLOCK
- `AUDIT-OUTPUT-001` — concise acceptance decision/output contract

## Artifact layout rules — owner: ARTIFACT_LAYOUT.md
- `ARTIFACT-ROOT-001` — local/Drive artifact roots and Cursor write boundary
- `ARTIFACT-TASK-001` — current task artifact placement and task isolation
- `ARTIFACT-PM-REQUEST-001` — PM external-request inbox/processed physical placement
- `ARTIFACT-ARCHIVE-001` — archive timing and legacy artifact migration

## Spec semantic rules — owner: SPEC_MIRROR.md
- `SPEC-AUTH-001` — Git spec authority and Drive mirror semantics
- `SPEC-PROPOSAL-001` — proposal class/routing/adoption
- `SPEC-STATUS-001` — spec status and unresolved-authority behavior

## Spec sync rules — owner: SPEC_SYNC.md
- `SYNC-REFRESH-001` — mechanical mirror refresh scope/triggers
- `SYNC-MANIFEST-001` — manifest minimum and currentness validation
- `SYNC-OWNERSHIP-001` — mechanical sync ownership and failure classification

## Thread continuity rules — owner: THREAD_HANDOFF_PROTOCOL.md
- `HANDOFF-SNAPSHOT-001` — handoff is timestamped continuity snapshot, not live state
- `HANDOFF-TRIGGER-001` — material update triggers only
- `HANDOFF-START-001` — new thread startup and live-control revalidation

## Parallelism rules — owner: PARALLEL_AGENTS.md
- `PARALLEL-COLLISION-001` — same-working-tree writer collision / isolation rule
- `PARALLEL-VERIFY-001` — heavy verification exclusivity without serializing lightweight checks
- `PARALLEL-OUTPUT-001` — agent-specific output ownership

## Claude Drive rules — owner: CLAUDE_DRIVE_AGENT.md
- `CLAUDE-FAST-001` — browser Claude read-only fast path and authority boundary
- `CLAUDE-INBOX-001` — fixed Inbox and unbiased independent-review instruction
- `CLAUDE-OUTPUT-001` — immutable generation output ownership/naming/location
- `CLAUDE-STATUS-001` — append-only Claude status events
- `CLAUDE-INTEGRATION-001` — ChatGPT/PM adoption and acceptance separation

## Task completion rules — owner: TASK_COMPLETION.md
- `TASK-FINALIZE-001` — accepted task finalization sequence
- `TASK-STATUS-001` — post-acceptance status synchronization

## Sprint completion rules — owner: SPRINT_COMPLETION.md
- `SPRINT-FINAL-001` — sprint completion snapshot / clean verify / tag / final archive
- `SPRINT-TRANSITION-001` — independent Sprint transition certificate / fixed production gate ownership

## Root-only rules — owner: AUDIT_HANDOFF_PROTOCOL.md
- `ROOT-AUDIT-ENTRY-001` — every implementation audit / acceptance audit / re-audit begins at root
- `ROOT-ROUTER-001` — protocol routing and canonical protocol list

## Change rule
When changing behavior:
1. locate the Rule ID here;
2. edit only the owner file;
3. update references only if the Rule ID itself changes (normally it should not);
4. do not copy the revised rule body into consumers;
5. archive/history may retain old text but is explicitly non-normative;
6. before closing a protocol or assignment-loop prompt change, perform a bounded semantic duplicate check across the active protocol root and affected automation prompts. Rule-ID references, labels, actor/schedule identities, stable pointers, and narrower task facts are allowed; prose that materially restates or paraphrases a general rule body outside its indexed owner is drift and must be removed rather than synchronized.

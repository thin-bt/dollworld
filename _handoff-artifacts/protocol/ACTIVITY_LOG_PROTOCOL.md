# dollworld Activity Log Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-AUTH-001, CORE-READ-001, CORE-STORAGE-001
scope: PM / Role1 / Role2 / Role3 execution evidence

## ACTIVITY-EVENT-001 — material events only
Append Activity only for material events: work/acceptance completion, command/result state transition, Cursor preparation/release, material blocker detection/resolution, control/evidence/write error, or material recovery/correction.
An unchanged idle/waiting timer fast-path run produces no Activity entry. Repeated `NO_ACTION` heartbeat entries are not normative.

## ACTIVITY-TARGET-001 — canonical target
Canonical folder: `dollworld-audit/audit/activity/`.
Daily actor files remain supported readable mirrors: `ROLE1_ACTIVITY_YYYYMMDD.md`, `ROLE2_ACTIVITY_YYYYMMDD.md`, `ROLE3_ACTIVITY_YYYYMMDD.md`, `PM_ACTIVITY_YYYYMMDD.md`.
Daily mirror target identity requires exact parent + exact filename + MIME `text/markdown`; never global title alone.
The durable scheduled-runtime write target is the fixed native Google Doc `ACTIVITY_EVENT_STREAM` in the same canonical folder, governed by `ACTIVITY-STREAM-001`.
Keep entries short: time, actor, trigger, assignment-key, result, factual action, output pointers, blocker.

## ACTIVITY-STREAM-001 — durable append-only automation stream
PM / Role1 / Role2 / Role3 automation runs MUST append each `ACTIVITY-EVENT-001` material event to the fixed native Google Doc `ACTIVITY_EVENT_STREAM` (Drive ID `1JWGZSCtChPtaCcutJY1Oe1mt5Z8Iz8j4l8bdN_FfYhs`) before reporting/ending the run when the event was successfully persisted in the actor's authoritative result/control. Use Google Docs append semantics; this path must not depend on raw-file `file_uri` transport.
Each line uses: `time | actor | trigger | assignment-key | result | action | output | blocker`.
Do not append unchanged idle/waiting polls. Do not infer or reconstruct missing historical events.
The daily actor Markdown files are optional mirrors for human/day browsing and may lag when raw-file transport is unavailable; stream success is sufficient for Activity logging closure. A mirror failure alone does not make the development/control event fail.
Each actor appends only its own event lines. PM may append a `LOGGING_RECOVERY`/`CORRECTION` event only for PM-owned logging/control recovery.

## ACTIVITY-RUN-PERF-001 — compact per-run performance sample
PM / Role1 / Role2 / Role3 automation runs append exactly one compact performance sample per completed run. This diagnostic entry is exempt from the material-event-only restriction of `ACTIVITY-EVENT-001`, like `ACTIVITY-PM-SCORE-001`, but it must be one line only and must not cause additional control/history reads.

Format:
`time | actor=<PM|ROLE1|ROLE2|ROLE3> | trigger=RUN_PERF | assignment-key=<live key or -> | result=<NO_ACTION|CONTROL_ONLY|SUBSTANTIVE> total_s:<n> | action=mode:<PM|ROLE|SURROGATE_PM>;control-read:<n>s,rule-resolution:<n>s,decision:<n>s,substantive-work:<n>s,write-readback:<n>s,score-failover:<n>s; reads:<n>,rereads:<n>,exception-reads:<n>,writes:<n> | output=<PERF_OK|PERF_SLOW> | blocker=<NONE or concrete provider/tool wait>`

Named phase durations are non-overlapping coarse wall-clock buckets. Do not assign the same interval to multiple phases; their sum must not exceed `total_s` except for coarse rounding. A Role run that acquires/uses the emergency PM failover lease records `mode:SURROGATE_PM`; ordinary Role work records `mode:ROLE`, and the normal PM loop records `mode:PM`.

If the runtime cannot determine reliable second-level phase timing, record available coarse timestamps/durations and `timing-precision:COARSE`; do not guess values. Performance samples are evidence, not development progress and not PM score. `PERF_SLOW` by itself is not a blocker.

## ACTIVITY-PM-SCORE-001 — Role-authored PM score on every Role run
Role1 / Role2 / Role3 automation runs MUST score the PM once per completed Role run, including unchanged/idle/waiting runs. This score is a control-quality observation, not development authority, and is exempt from the material-event-only restriction of `ACTIVITY-EVENT-001`.

Each Role independently scores the most recent PM behavior it can directly establish from fresh live controls, PM automation state, and the transitions relevant to that Role. Do not infer hidden PM work. If evidence for a dimension is unavailable, score only the observable behavior and state the missing evidence compactly.

Score is 0-100, five dimensions worth 20 points each:
1. `dispatch` — known safe forward work was identified and actually dispatched/read back instead of merely named;
2. `parallelism` — independent Role/Cursor work was not unnecessarily serialized and idle lanes were exhausted under `QUEUE-PARALLEL-FLOW-001` / `QUEUE-FAIRNESS-001`;
3. `drain` — PM reached `QUEUE-PM-DRAIN-001` fixed point and did not stop at a status table with an executable PM-owned action remaining;
4. `recovery` — blockers/capability failures were actively routed/retried/recovered under the governing rules without abandoning unrelated lanes;
5. `autonomy` — progress did not depend on fresh user intervention to make PM perform an already-authorized action. User-requested product/spec decisions do not reduce this dimension; user intervention that merely tells PM to execute work it already had authority to execute does.

Scoring anchors per dimension: `20` = fully satisfied from observable evidence; `15` = minor delay/inefficiency but no material lost cycle; `10` = mixed/partial; `5` = material avoidable delay or one failed cycle; `0` = repeated/clear failure or user intervention was required to unlock an already-authorized action. Intermediate integer values are allowed when evidence supports them.

Every score is appended to the fixed `ACTIVITY_EVENT_STREAM` as one line using:
`time | actor=ROLE1|ROLE2|ROLE3 | trigger=PM_SCORE | assignment-key=<role live key or -> | result=PM_SCORE:<total>/100 | action=dispatch:<n>,parallelism:<n>,drain:<n>,recovery:<n>,autonomy:<n>; reason:<compact evidence-based reason> | output=observed-pm-run:<timestamp/id if available> | blocker=<NONE or missing-evidence>`

**Score-output integrity.** A valid `PM_SCORE` line contains exactly the five named dimensions above, each integer `0..20`, and `total` equals their arithmetic sum. Do not add a sixth score dimension (for example `controls`) or omit a dimension. The score entry must start on a new Activity line and end as one complete line; it must never be concatenated onto a `RUN_PERF` or other event. Before treating score logging as successful, the Role validates the rendered line against this grammar and confirms the appended line can be read back as a standalone `trigger=PM_SCORE` entry. A malformed score is `ACTIVITY_SCORE_FORMAT_INVALID`; it is a logging defect under `ACTIVITY-FAIL-001`, does not block substantive Role work, and must not be used by `QUEUE-PM-SCORE-RECOVERY-001` or `QUEUE-PM-FAILOVER-001` as numeric evidence.

The Role writes the score even when its own assignment is unchanged, including `NO_ACTION`, recovery-only, waiting, and terminal-consumed runs. A completed Role run is not allowed to reuse an older score as though it were current merely because no substantive assignment changed. The Role must confirm the new score append in `ACTIVITY_EVENT_STREAM`; if append confirmation fails, apply `ACTIVITY-FAIL-001` and expose the logging failure/recovery state rather than treating the previous score as the latest observation. Scoring failure never blocks the Role's substantive work. Scores are append-only and are never rewritten to improve later averages. PM must not author, edit, or resolve Role-authored PM score entries.

## ACTIVITY-FAIL-001 — write failure
Activity write failure alone never blocks development. Preserve real work/result first. Use fixed result/control if writable; if both result and Activity channels fail, create one fallback result under `audit/assignments/fallback/`. The fallback records actor, assignment-key/generation, actual result/progress, evidence/output pointers, and which fixed/result channels failed. Keep one fallback identity per actor+assignment generation and update/reuse it rather than creating repeated fallback copies on every timer run.
On the next eligible run, the owning Role and PM reconciliation treat a matching fallback as a recovery source before repeating substantive work; when its evidence uniquely proves the same-generation result, repair the fixed OUTBOX/control under `QUEUE-CONTROL-RECOVERY-001`, then record the recovery/correction event. Never rerun completed development only to recreate logging or because the fixed result write failed after the real work completed.

## ACTIVITY-RETENTION-001 — retention/reconciliation
Each actor writes only its own Activity. Keep current Sprint activity available; older daily logs may move to archive but are not silently deleted.
Read Activity only for unexplained compact-control mismatch, missing result, duplicate-execution suspicion, missed collection, write/recovery investigation, the bounded latest-`PM_SCORE` corroboration explicitly required by `QUEUE-PM-FAILOVER-001`, the bounded latest-`PM_SCORE` self-recovery read explicitly required by `QUEUE-PM-SCORE-RECOVERY-001`, or the bounded latest run-performance sample set explicitly required by `QUEUE-RUN-PERF-001`. PM self-recovery reads only the latest score entry per Role and the attached reason/blocker needed to identify an observable PM-owned defect; it must not edit, resolve, suppress, average-manipulate, or broadly mine Role-authored scores. Failover corroboration reads only the latest score entries needed to establish the same PM observation window; neither exception is authority for broad Activity-history polling.

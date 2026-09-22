# dollworld Control Core

authority: normative
rule-index: CONTROL_RULE_INDEX.md
scope: PM / Role1 / Role2 / Role3 / Cursor A / Cursor B2 / Protocol Design

## CORE-AUTH-001 — live authority / ownership
Git is implementation authority. Accepted current spec/freeze identifies the contract baseline.
Live control ownership:
- `audit/assignments/PM_EXECUTOR.md`: PM executor selector; executor semantics are owned by `QUEUE-PM-EXECUTOR-001`
- `ROLE*_CURRENT.md`: PM command; the only Role-authored new-generation exception is the narrow pre-authorized same-Role N+1 publication governed by `QUEUE-ROLE-CONTINUATION-001`
- `ROLE*_OUTBOX.md`: Role result
- `CURSOR_INBOX.md` / `CURSOR_B2_INBOX.md`: PM command
- `CURSOR_ACTIVE_TASK.md` / `CURSOR_B2_ACTIVE_TASK.md`: corresponding Cursor execution lock/result
Activity is evidence; handoff is continuity snapshot. Neither overrides live controls.
Project-roadmap semantics are owned by `CORE-ROADMAP-001`.
Never rewrite another actor's owned Active/Outbox.

## CORE-READ-001 — read budget
Normal control runs read only compact current channels. History, activity, old evidence, archived protocols, broad Drive search, and routine project-roadmap rereads are exception reads.
Project-roadmap read/update timing follows `CORE-ROADMAP-001`.
Implementation audit / acceptance audit / re-audit still begins with `AUDIT_HANDOFF_PROTOCOL.md`.

## CORE-ROADMAP-001 — single project roadmap / objective alignment
`PROJECT_ROADMAP.md` is the single coordination map for project/Sprint objective, major phase order, dependencies, milestone direction, current major position, known material scope gaps, and Sprint completion meaning. It is readable by the user but exists primarily so PM/agents do not lose the project objective while working through local controls.

Authority boundary:
- Roadmap never overrides Git, accepted current spec/freeze, or live CURRENT/OUTBOX/Inbox/Active controls.
- Handoff is a continuity snapshot and does not replace Roadmap.
- Do not create a second agent/project execution roadmap with the same responsibility.

Read boundary:
- PM reads Roadmap before issuing a distinct new roadmap item/task family, advancing a milestone/Sprint/phase, choosing among multiple safe next workstreams, or resolving project/Sprint objective, scope-gap, or dependency ambiguity.
- For every distinct product implementation, product-fix, acceptance, re-acceptance, or formal-close task family, PM MUST carry the applicable Roadmap Sprint objective / completion meaning / material gap into the canonical task instruction as an alignment requirement. Omitting Roadmap alignment from such an instruction is a control defect.
- PM / Role1 / Role2 / Role3 / Protocol Design thread restart reads Roadmap once after the fixed handoff to restore big-purpose context before relying on live controls for the immediate action. Same-assignment hourly work does not reread it merely for polling.
- Cursor follows the canonical task instruction, but for every distinct product implementation, product-fix, acceptance, re-acceptance, or formal-close task it MUST fresh-read PROJECT_ROADMAP.md once before execution and explicitly check that the proposed implementation/evidence closes the Sprint-level objective rather than only a local test or UI surface. Roadmap alone never authorizes implementation, acceptance, release, or scope expansion.

Update boundary:
- update only for material project/Sprint objective, phase, critical-path, dependency, milestone-direction, Sprint-completion-meaning, or material scope-gap changes;
- do not update for routine generation increments, ordinary ACTIVE/IDLE flips, individual fix iterations, activity/timer runs, or detailed evidence changes.

Completion alignment:
- a Sprint must not be declared COMPLETE while Roadmap records a material Sprint-completion gap that remains unresolved;
- a task/result/acceptance PASS MUST NOT be used as Sprint completion evidence when the observed product behavior contradicts the Roadmap Sprint objective or completion meaning, even if focused tests are green;
- such a gap is closed only when it is incorporated into current authority as needed and its required implementation/independent acceptance is complete, or when explicit user/higher-authority direction removes or defers that completion requirement;
- Roadmap records and preserves the gap but does not invent implementation semantics by itself.
- **Formal-close authority guard:** for Sprint2 and every later Sprint, PM/control, Cursor, Role1/2/3, and automation MUST NOT assign `CLOSED`, `COMPLETE`, project-complete, or loop-stop on their own authority. They may only publish `READY_FOR_USER_CLOSE_REVIEW` after independently proving all binding completion conditions and Roadmap alignment. The transition to `CLOSED` / `COMPLETE` requires an explicit user instruction approving that Sprint close after the evidence is presented. Absence of objection, old approval, test PASS, release-gate PASS, prior CLOSED state, or downstream work does not count as approval.
- **User-close wait is not a stop condition.** `READY_FOR_USER_CLOSE_REVIEW`, pending user close approval, or "this actor has finished its assigned role" MUST NOT be used to end the PM/Role/Cursor loop, empty all lanes, or classify the project as having no work. While close approval is pending, PM MUST continue all safe work that does not require the close transition itself: fix/retest any newly exposed defect; strengthen acceptance evidence; reconcile remaining Roadmap gaps; prepare the next Sprint/backlog/spec/readiness work; and dispatch non-conflicting forward tasks permitted by current authority. If no such safe work exists, the lane may rest, but the project loop remains active and PM must keep the close-review state visible rather than treating it as completion.
- If a Sprint was previously auto-closed without this explicit approval, that historical label is not reusable as authority for a later close and must not suppress remaining or reopened work.

## CORE-THROUGHPUT-001 — development progress first
The control plane exists to advance safe, meaningful development toward the next accepted milestone. Monitoring, timer operation, queue hygiene, logging, and reporting are control mechanisms, not substitutes for executable work.
When safe useful work exists within the actor's lane, perform or issue it rather than ending on status observation alone. This never authorizes busywork, speculative authority, duplicate generations, audit bypass, or conflicting writes.

## CORE-BLOCK-001 — blocking budget
BLOCK only for material risk that the current actor cannot safely resolve or route within the current run: data/state corruption, security/auth requiring external authority, determinism/replay, persistence compatibility, repo/index/worktree safety, acceptance-evidence integrity, ambiguous public/external contract with multiple plausible authoritative outcomes, or unresolved product/gameplay/spec choice.

A transient connector/provider/tool failure, local file-reference failure, search/path-resolution failure, wrong-interface/wrong-route attempt, unsupported operation on one tool path, stale wording/version/name/ID/reference, cosmetic/doc drift, or mechanical hash/freeze/mirror refresh MUST NOT by itself produce `BLOCKED`. Tool/route mistakes are recovery work, not project blockers. The actor must stay on the canonical authority/storage path, apply the governed retry/capability-discovery/recovery/reroute rules, and continue whenever a safe path exists. Failure of a fallback location that is outside the canonical workspace is not evidence that the canonical destination is unavailable.

`BLOCKED` is valid only after the actor has identified the exact material dependency, shown why it is not safely self-recoverable or routable under current authority, and exhausted the rule-governed bounded recovery/reroute applicable to that failure. Missing those prerequisites makes the BLOCK invalid and execution must continue. `PAUSE_INTENT=NONE` forbids using `BLOCKED`, a transient failure, or a recovery failure as authority to disable/pause an assignment-loop automation; automation state changes require their own live pause/disable authority.

Non-blocking flow: `detect -> unique authority -> minimum correction/recovery -> bounded re-check -> continue`.

## CORE-ACTION-001 — same-run action closure
If a release gate opens a uniquely determined next task, target lane is IDLE, no different unconsumed PREPARED task exists, and no material blocker exists, PM PREPARES the next task in the same run before reporting.
`NEXT_ACTION_IDENTIFIED` without actual issuance or a concrete blocker is invalid.
For a distinct new roadmap item/task family or milestone transition, also apply `CORE-ROADMAP-001`.

### Project-continuation / stop guard
An empty CURRENT/Inbox, terminal-consumed lane, `IDLE`, `CLOSED` Sprint, or absence of an already-published next task is **never** by itself evidence that dollworld has no remaining work or that the PM/Role loop may stop.

Before PM may classify the project as complete, end the development loop, disable/pause the assignment loop, or leave all lanes resting after a Sprint/milestone close, PM MUST:
1. fresh-read `PROJECT_ROADMAP.md`;
2. identify the next incomplete Roadmap objective/phase, including any reopened earlier Sprint defect that invalidates downstream closure;
3. if a safe next task family is uniquely derivable from current authority, PREPARE and read back that task in the same PM drain cycle;
4. if the next phase requires a new canonical backlog/spec/control artifact before implementation, issue the bounded readiness/preparation task instead of declaring no work;
5. only classify true project completion when every Roadmap objective through the currently defined final phase is complete under current authority and no material reopened gap remains, or when the user/higher authority explicitly pauses/stops/defers further work.

Therefore `queue empty` != `project complete`, and `Sprint CLOSED` != `loop stop`. A loop stop derived only from empty controls or lack of a pre-existing next task is a control defect and must be recovered as missed continuation work.

## CORE-ACCEPT-001 — delta acceptance reuse
Independent acceptance remains required where applicable. For a tightly bounded follow-up that does not invalidate independently passed surfaces, reuse those surfaces and verify only the exact delta plus directly affected integrity. Expand only when prior evidence is invalidated or material semantics/integrity changed.

## CORE-STATE-001 — state coherence
CURRENT/OUTBOX should converge on the same generation once acknowledged/completed/waiting. Completed READY/PREPARED commands are not live reservations.
If Inbox PREPARED task X matches an IDLE Active result showing task X completed, that PREPARED is consumed and PM may reconcile it before issuing the next task.

## CORE-MONOTONIC-001 — live-control state must not regress
Live fixed controls are monotonic within an identity. A late/overlapping run must never roll an already-observed newer or more-final state backward. Before replacing a mutable fixed control when overlap is plausible, the owning actor re-reads that stable identity and compares assignment/task/request identity plus state.
- Role OUTBOX: a terminal result for generation N is never overwritten by `WORKING`, older partial progress, or another non-terminal state for generation N. A lower generation never overwrites a higher generation.
- Role CURRENT / Cursor Inbox: assignment/task identity never moves backward to an older generation/task. Same-generation edits are limited to governed correction/reconciliation and must not revive consumed work.
- PM request resolution: terminal dispositions never return to `PENDING` / `DEFERRED` / `NEEDS_USER_INPUT`; storage lifecycle wording never substitutes for the semantic disposition.
- Cursor Active: a completed/IDLE record for task X is never overwritten by a late stale `ACTIVE` write for X, and an older task never replaces a newer active/completed task identity.
If an overlapping run discovers that another actor/run already advanced the same control, preserve any useful evidence separately and reconcile against the newer state; do not force a rollback merely to publish the older run's result.

## CORE-STORAGE-001 — storage / identity / evidence
Raw operational `.md/.txt/.json/.csv` remains raw with matching MIME. Fixed controls keep stable IDs.

**Google Drive project-boundary rule:** My Drive root is outside the dollworld operational workspace and MUST NOT be used by PM, Role1, Role2, Role3, Cursor lanes, Protocol Design, automation, or recovery tooling as a read/search origin, creation target, upload target, copy/move target, staging area, temporary workspace, fallback location, or recovery destination. All dollworld Drive artifacts and operations MUST remain inside the canonical `_handoff-artifacts` project root (Drive folder ID `1i4a513yn2aJuODaRPPyv9XUP5qAIiPl6`) and its descendants. If temporary storage is required, use `_handoff-artifacts/control-tmp` (Drive folder ID `1nPGEgSSUONGyUBxQW4lQkUuXGdHdkwSX`) or another explicitly governed descendant of `_handoff-artifacts`. A provider/API default that would place a file at My Drive root MUST be treated as invalid for dollworld; the operation must be retried with an explicit project-folder parent instead. Existing dollworld artifacts discovered at My Drive root are placement defects and must be moved into a governed `_handoff-artifacts` descendant before further use. Non-dollworld My Drive root content is out of scope and must not be inspected or modified for dollworld work. Recovered historical/root-misplaced material is quarantined under `_handoff-artifacts/root-recovery-20260911/recovered-control-tmp-20260911` (folder ID `1d5u1xtCl_bflaWZgx3tvnlC5FcGl8TPn`) and MUST NOT be reused as active scratch or canonical live control. New temporary control work uses only the current `control-tmp` ID above.

Cursor-consumable operational/spec/evidence paths must not use native Google Workspace files (`application/vnd.google-apps.document`, `.gdoc`, `.gsheet`, `.gslides`) as the canonical or only readable artifact. Cursor task authority, spec/control input, or required evidence that exists only as a native Google Workspace file is not executable; create and verify a raw canonical mirror first.

If a native Google Workspace artifact is found in a Cursor-consumable path and a raw canonical file is missing, normalize it in this order: `export to the intended raw format -> verify the raw file is readable and stored in the intended parent -> move the native file to a sibling archive/legacy location -> rename the native file with a `_LEGACY_GDOC` (or corresponding legacy-native) suffix`. Do not delete frozen/historical native snapshots when retention authority requires preservation. Native Google Workspace files may remain only as non-canonical legacy/archive material that Cursor is not expected to consume.

Artifact identity includes parent/purpose/version/evidence role; same title alone is never duplicate identity.
Frozen spec-package/acceptance/Rxx/audit snapshots are retained unless explicit retention authority removes the package.
Shared templates/schemas are referenced rather than copied unless a frozen snapshot is required. Evidence is minimal and unique; do not create redundant complete loose+archive copies for convenience.

## CORE-LANES-001 — lane roles
Cursor A = critical-path production. Cursor B2 = optional isolated/non-conflicting secondary work. Role1 = independent milestone acceptance/bounded preflight. Role2 = forward implementation readiness. Role3 = trailing determinism/regression/FI/long-run verification.
No lane is kept busy for utilization alone.

## CORE-HISTORY-001 — legacy
Superseded/archived protocols are historical evidence only. They do not override current root, this core, or the current Rule ID owner.

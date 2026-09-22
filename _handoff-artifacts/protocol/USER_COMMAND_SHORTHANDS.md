# dollworld User Command Shorthands

authority: normative
rule-index: CONTROL_RULE_INDEX.md
scope: user -> GPT/PM/Role/Protocol Design control threads

This file is the **single normative owner** for short user commands / shorthand used to instruct dollworld GPT threads.
Do not redefine these meanings in audit, queue, handoff, automation, startup prompts, or task instructions. Consumers reference `USER-SHORTHAND-001` only.

## USER-SHORTHAND-001 — canonical shorthand dispatch

### General rules
- A shorthand changes only the user's requested action; it never overrides Git/spec authority, current live controls, actor ownership, safety, acceptance requirements, or protocol Rule owners.
- Resolve the shorthand against the **current thread role** and current Drive controls. Do not ask the user to restate information that current authority/control files can resolve.
- A longer explicit user instruction always overrides the shorthand meaning for that turn.
- Only commands listed here have canonical abbreviated meaning. Do not invent meanings for unknown one-letter/short commands.
- Leading/trailing whitespace and ordinary punctuation may be ignored when recognizing a standalone command.

### `k` / `ｋ` — 確認して・開始して
When the user sends standalone `k` or full-width `ｋ`:
1. confirm the current thread's live assignment/state from the minimum required current controls;
2. resolve the exact executable work under current authority;
3. **immediately start or continue substantive work in the same run** rather than stopping at a status report;
4. if the current thread is the active PM/control runtime, execute `QUEUE-PM-DRAIN-001` before reporting or idle exit;
5. when that PM run evaluates Cursor A/B2 publication or pickup state, apply the current `CURSOR-PUBLISH-001` / `CURSOR-PICKUP-001` owner rules before assigning a user-facing lane status. A raw Inbox `PREPARED` value alone is not sufficient evidence for `仕事投入済み`, `着手待ち`, working, healthy, or equivalent status; use those labels only after the owner-rule-required publication-integrity/pickup checks establish them. Invalid publication or control defects must be reported by their exact failure state rather than downgraded to ordinary waiting;
6. only after the governing actor-specific action-closure rule leaves no executable safe work may the thread report the exact blocker/waiting condition and resume condition; do not invent work merely to stay busy.

This is stronger than plain `確認して`: `k` explicitly means **check + begin/continue execution**. PM-specific drain semantics are owned by `QUEUE-PM-DRAIN-001`; Cursor publication/pickup validity is owned by `CURSOR-PUBLISH-001` / `CURSOR-PICKUP-001`; this shorthand only requires the PM `k` path to apply those owner rules before reporting their states.

### `確認して`
Confirm the current thread's live assignment/state and the latest relevant result using the minimum required current controls. Report the resolved state and perform any reconciliation/action that the governing protocol already makes mandatory, but this shorthand by itself does not request a new distinct substantive task family.

### `仕事確認して`
Same control resolution as `確認して`, with emphasis on: current assignment, whether executable work exists, blocker/resume condition, and the next authorized action. Do not substitute monitoring/logging for substantive work when the governing current assignment is already executable.

### `続けて`
Continue the current already-authorized assignment or its bounded same-assignment continuation. Do not silently mint a distinct new roadmap item/task family solely from this shorthand; new distinct work still follows PM/Roadmap/queue authority.

### `監査して`
Treat as a request to audit the current target using current Drive evidence. Follow `ROOT-AUDIT-ENTRY-001`, `AUDIT-EVIDENCE-001`, and `AUDIT-IDENTITY-001`; do not require the user to re-upload or restate the current Cursor/Role evidence when Drive controls resolve it.

### `再監査して`
Re-audit the current/latest corrected evidence for the same target. Reuse previously independent-passed surfaces when `CORE-ACCEPT-001` permits and verify the exact delta plus directly affected integrity.

### `最新成果物で確認して`
Resolve the target's latest **canonical current evidence** using `AUDIT-IDENTITY-001` and inspect it directly. "Latest" does not mean global newest timestamp or same-title search.

## Change rule
When the user introduces, changes, or retires a shorthand:
1. edit this file only for the shorthand meaning;
2. update `CONTROL_RULE_INDEX.md` only if the Rule ID/owner changes;
3. other files may reference `USER-SHORTHAND-001` but must not copy the command definitions;
4. old historical copies may remain only as non-normative history.

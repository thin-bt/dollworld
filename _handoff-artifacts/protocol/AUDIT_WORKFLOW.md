# 監査・受入・再監査ワークフロー


authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-BLOCK-001, CORE-ACCEPT-001, CORE-STORAGE-001
scope: audit-workflow


This file contains audit-specific rules only.


## AUDIT-EVIDENCE-001 — independent acceptance
Cursor/Role self-report alone never establishes acceptance.
For the target task, inspect the smallest sufficient independent set among: actual diff/files, branch/HEAD/Git state, required tests/checks/FI/static results, authoritative spec/freeze, hashes/manifests, and required task evidence.
`cursor-report.txt` is an index/report, not the sole proof.


When acceptance/debug concerns an active product defect or fix and the reviewing GPT/Role does not have direct authoritative repository visibility sufficient to trace the failure, the canonical task evidence MUST include enough CURRENT SOURCE proof for independent review, not only READY summaries, screenshots, or narrow derived evidence. The minimum sufficient set is: exact changed source file(s) or a task-scoped patch/diff; relevant surrounding source when control/data flow cannot otherwise be understood; the current test/fixture file(s) used for the fix; and fresh runtime/browser/error output for the failing path plus fresh passing output after repair when applicable. Prefer a minimal task-scoped source bundle/diff rather than whole-repository duplication, but it must be sufficient to trace the defect independently.


Cursor task completion should produce `audit/current/<task-key>/cursor-report.txt` plus the evidence required by the current instruction. Do not require redundant evidence forms when one canonical form proves the same fact. If required current-source proof is absent or too narrow for independent tracing, treat that as an evidence/observability gap to repair under `AUDIT-RECOVERY-001`; do not accept from self-report alone, and do not ask the user to manually upload local source when an authorized execution lane can publish the required evidence into the canonical task family.


## AUDIT-IDENTITY-001 — current evidence resolution
Resolve evidence identity in this order:
1. exact current task-key/canonical parent `audit/current/<task-key>/`;
2. live CURRENT/OUTBOX/Inbox/Active or manifest reference to the relevant generation/result;
3. branch/HEAD/hash/freeze identity;
4. timestamp/fix numbering only as a final tie-breaker.
Never choose a current artifact by global same-title search or newest timestamp alone. Archive, other task spec-package, and Rxx snapshot remain historical/frozen evidence unless explicitly referenced.


## AUDIT-STOP-001 — audit STOP
Classification uses `CORE-BLOCK-001`.
A material audit STOP identifies the exact conflicting authority/evidence and minimum resolution needed.
Uniquely determined wording/version/reference drift uses bounded correction/delta verification and does not reopen unrelated accepted surfaces.


## AUDIT-RECOVERY-001 — evidence visibility / transport recovery before audit BLOCK
Missing convenience reports, incomplete Drive/search visibility, or transient evidence transport failures are not implementation defects by themselves. Before returning `FIX_REQUIRED` / `BLOCKED` because expected evidence cannot be seen, apply `QUEUE-CAPABILITY-DISCOVERY-001`, `QUEUE-READ-COMPLETENESS-001`, and `QUEUE-TRANSIENT-FAILURE-001` to the evidence access path. If the same acceptance fact can be independently established from authoritative Git files/diff, branch/HEAD, tests, hashes, or another canonical proof allowed by `AUDIT-EVIDENCE-001`, continue the audit without requiring the missing redundant report.
If required independent proof genuinely cannot be obtained after bounded recovery, keep the audit pending/blocked on the exact evidence-access condition; do not relabel provider visibility failure as a product implementation defect or missing user/spec authority.


## AUDIT-OUTPUT-001 — acceptance output
Return one concise decision: ACCEPT / FIX_REQUIRED / BLOCKED, with exact evidence pointers and release token/resume condition when needed.
Detailed repeated summaries belong in the task artifact, not CURRENT/OUTBOX/handoff/activity simultaneously.


User shorthand dispatch, including `監査して`, `再監査して`, and `最新成果物で確認して`, is owned exclusively by `USER-SHORTHAND-001` in `USER_COMMAND_SHORTHANDS.md`. After dispatch, this file supplies the audit-specific evidence/identity/STOP/output rules.
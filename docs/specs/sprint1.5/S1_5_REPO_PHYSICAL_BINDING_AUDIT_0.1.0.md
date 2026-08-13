# Sprint 1.5 Repo Physical Binding Audit

- Document ID: `S1.5-REPO-PHYSICAL-BINDING-AUDIT`
- Version: `0.1.0`
- Target: real dollworld Git repository
- Accepted S01-008 commitish: `7c47847`
- Accepted S01-007 commitish: `a39e476`
- Status: `SUPPLEMENTAL PREBINDING EVIDENCE ONLY / HISTORICAL ACCEPTED-COMMIT LANE`
- Scope: DB-001～022 candidate/provenance evidence collection from accepted S01-008/S01-007 commits; **not final UI-000 P04 binding**

## 1. Why this can run now

S01-009 does not need to be implemented before inspecting the accepted S01-008 tree.

Git object inspection:

```text
git show 7c47847:<path>
git grep <pattern> 7c47847 -- <scope>
```

reads the accepted commit directly.

It does not:

- checkout `7c47847`
- reset current work
- apply/stash/drop anything
- create another worktree
- edit production files
- depend on the current branch being at S01-008

Therefore S01-009 work may continue in the normal worktree while this audit reads the immutable accepted S01-008 commit object.

## 2. Runner

Use the PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File ".\audit-s1-5-repo-bindings.ps1" `
  -RepoRoot "D:\xampp\htdocs\dollworld"
```

When running from PowerShell 7, `pwsh -File` is also acceptable.

The default output directory is under the OS temp directory, so the repo stays unchanged.

The PowerShell file is a thin wrapper around the testable Node runner `audit-s1-5-repo-bindings.mjs`.

The runner emits:

```text
s1-5-repo-binding-evidence.json
s1-5-repo-binding-evidence.md
```

Direct Node execution is equivalent:

```powershell
node ".\audit-s1-5-repo-bindings.mjs" --repo "D:\xampp\htdocs\dollworld"
```

## 3. Runner safety requirements

Before and after the audit it records:

```text
git status --porcelain=v1 --untracked-files=all
```

and requires exact equality.

It also verifies:

```text
7c47847 resolves to a commit object
a39e476 resolves to a commit object
a39e476 is an ancestor of 7c47847
```

The audit does not require current HEAD to equal or contain 7c47847; it records that relation only as context.

## 4. Machine status is not normative status

The runner may emit:

```text
machine_evidence_complete
machine_evidence_incomplete
dependency_pending
```

These are evidence-collection statuses only.

It must always emit:

```text
normativeMatchedClaimed = 0
```

Only UI-000 semantic review may convert a DB row to:

```text
matched
spec_fix_required
```

A regex hit is never sufficient by itself for `matched`.

## 5. Known source-artifact anchors

Returned accepted/clarifier artifacts already give high-confidence anchors that the real repo audit should confirm.

### DB-001

Known:

```text
BattleExecutionAbortError
packages/simulation-core/src/sprint1-spec-0.1.19-post-start-execution-abort.test.ts
```

Need exact class/module/export binding.

### DB-008

Known module and public API candidates:

```text
packages/simulation-core/src/sprint1/battle-participant.ts

isEligibleForBattleKind
validateBattleParticipant
validateBattleParticipantSnapshot
validateBattleParticipantSource
BattleParticipantSource
```

### DB-009 / DB-010

Known:

```text
packages/simulation-core/src/sprint1/technique-definition.ts

TECHNIQUE_DEFINITION_KEYS
TechniqueDefinition
rangeShiftAfterUse
RangeShiftAfterUse
RANGE_SHIFT_AFTER_USE
```

The key registry remains exact31.

### DB-011 / DB-012

S01-008 accepted contract anchors:

```text
WEEKLY_TRAINING_PROCESSOR_ID
"weekly-training"
Sprint1RunRuntimeState.eventStream
EventAllocationState
```

### DB-014

Known module/public API candidates:

```text
packages/simulation-core/src/sprint1/battle-turn-logs.ts

BattleActionLog
validateBattleActionLog
replacementReason
evadeDirection
activationFailureReason
```

### DB-015

Known regression test:

```text
packages/simulation-core/src/sprint1-spec-0.1.18-battle-result-contracts.test.ts
```

Need exact BattleResult / SummaryLog / judgeSummary physical module/type.

### DB-017

Known started side:

```text
packages/simulation-core/src/sprint1/battle-started-event.ts

BattleStartedEventCandidate
BattleStartedEventPayload
BATTLE_STARTED_EVENT_TYPE
"battle.started"
```

Need exact `battle.finished` side and final package/export binding.

### DB-018

S01-009 verification comparator is not a production dependency.

Bind only the accepted S01-008 canonical runtime/output source:

```text
Sprint1RunRuntimeState
eventStream
battleResults
buildAndWriteSprint1RunOutput / accepted fixed7 writer path
```

UI-009 later implements the same 05/S01-009 comparison semantics without importing a verification-private helper.

### DB-020

Known candidate owner:

```text
packages/simulation-core/src/sprint1/sprint1-run-context.ts
Sprint1RunContext
simulationIdentity
runRuleSnapshot
```

### DB-003 / DB-019

These remain CAL-JAN-SYNC dependencies and are not promoted by the S01-008 audit.

## 6. UI-000 interpretation procedure

For DB-001～022:

1. Read machine evidence from the accepted commit.
2. Open the exact source module with `git show <commit>:<path>`.
3. Confirm type/schema and semantic contract, not just the symbol name.
4. Confirm required package/public boundary where the Sprint 1.5 contract says public.
5. Confirm at least one accepted regression/integration test that exercises the required behavior.
6. Record the full commit hash.
7. Then and only then write `matched`.

If any semantic mismatch is found:

```text
spec_fix_required
```

If the Sprint 1 accepted implementation itself violates its own accepted contract and must be corrected before Sprint 1.5 can bind:

```text
code_fix_required
```

If only CAL or unfinished predecessor completion blocks the row:

```text
dependency_blocker
```

Do not create a compatibility alias/facade merely to conceal an upstream/spec mismatch.

## 7. Current expected outcome

Before running against the real repo:

```text
DB rows = 22
CAL-only = 2
repo physical-binding candidates = 20
normative matched = 0
```

After running the evidence collector, UI-000 obtains historical accepted-commit candidate evidence for many of those 20 rows.

The statements in this document about S01-009 being unfinished describe the evidence horizon when this supplemental audit was created; they are **not current project status**.
Final UI-000 P04 must bind against the P00-fixed repository baseline after all current predecessors (T01/T02/T03-A/required T03-B) are closed. A row may reuse 7c47847 evidence only after current-baseline inspection proves it unchanged. This collector by itself never satisfies final `matched`.

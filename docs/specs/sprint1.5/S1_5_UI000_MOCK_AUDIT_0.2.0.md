# Sprint 1.5 UI-000 Mock Audit

- Document ID: `S1.5-UI000-MOCK-AUDIT`
- Version: `0.2.0`
- Status: `HISTORICAL DRY-RUN SNAPSHOT / NON-CURRENT PROJECT STATUS`
- Target spec: `S1.5-SPEC-0.1.15` R12
- Purpose: Sprint 1完成前にUI-000をdry-runし、本番UI-000で止まり得る箇所を先に分類する。

## 1. Important limitation

これは実UI-000 PASSではない。

本書の「現時点」「S01-009 pending」等は**mock audit作成時点のhistorical evidence horizon**を指し、Sprint 1 COMPLETE後のcurrent project statusではない。
作成時点ではS01-008 accepted / S01-009 completion・CAL-JAN-SYNC final binding未完了だったため、DB rowを`matched`にはしなかった。

Current pre-binding statusは`S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md`を正とする。

```text
accepted_code_reference_bound = 5
accepted_contract_bound_needs_repo_exact = 13
accepted_s01_007_needs_repo_exact_binding = 2
calendar_dependency_pending = 2
normative matched = 0
```

以下の`candidate_evidence_strong`等はR6以前のmock progressionを説明するhistorical statusであり、current UI-000 inputへ使用しない。

使用するpre-completion status:

```text
candidate_evidence_strong
completion_binding_pending
calendar_dependency_pending
```

`candidate_evidence_strong`も本番UI-000ではfinal accepted commitへ再照合する。

## 2. Dry-run phase result

| Phase | Mock result | Reason |
|---|---|---|
| P00 repository/predecessor gate | STOP if run for real | **historical R6 condition:** S01-009 pendingのためSprint 1 completion/tag未確定 |
| P01 static spec package audit | PASS | current R6 package-only static checker pass |
| P02 Sprint 1 inventory | MATERIAL_PROGRESS | S01-001～008 implemented/accepted、S01-008 commit `7c47847`。exact repo physical bindingはreal UI-000で実施 |
| P03 calendar gate | STOP if run for real | CAL-JAN-SYNC final accepted bindingが必要 |
| P04 DB binding | DRY-RUN only | 22件のfinal physical matchはSprint 1 completion後 |
| P05 BRIDGE binding | DRY-RUN only | DB dependent rowsはfinal code待ち |
| P06 mutation/event maps | READY PLAN | semantics fixed; final producers/receipts only pending |
| P07 API readiness | READY PLAN | API semantics/owners/tests fixed; UI production code not required at UI-000 |
| P08 MIG readiness | READY PLAN | 36 rows owner/test plan; implementationはowner task later |
| P09 contract ownership | PASS static | 370 contract ownership rows |
| P10 acceptance ownership | PASS static | 174 acceptance ownership rows |
| P11 finding/STOP consolidation | dependency blockers only after R3 fixes | no open known semantic blocker in dry-run |
| P12 final UI-000 acceptance | NOT RUNNABLE YET | P00/P03/P04 final binding prerequisites not satisfied |

## 3. Spec issues found by this mock audit

### FIXED-UI000-MOCK-001 StableErrorCode was wrongly deferred

`StableErrorCode` is Sprint 1.5 API-adapter wire semantics. UI-000 happens before UI-002 adapter implementation, so a requirement to bind to a 'current adapter implementation' was dependency inversion.

Resolution:
- removed from DEFERRED_BINDING
- UI-002 owns local exact type/validator
- UI-000 checks owner/test plan only

### FIXED-UI000-MOCK-002 SHA-256 provider was wrongly deferred

`Sha256Provider` interface is already a public simulation-core dependency. The UI server production implementation is UI-002-owned Node infrastructure, not a Sprint-1-completion-only fact.

Resolution:
- removed from DEFERRED_BINDING
- UI-002 owns Node SHA-256 implementation satisfying public `Sha256Provider`
- no simulation RNG

### FIXED-UI000-MOCK-003 BattleActionLog activationFailureReason was overconstrained

Current S01-006 evidence has `activationFailureReason: string | null`, while replacementReason/evadeDirection use named types.

Resolution:
- DB-014 now binds each final upstream exact type
- closed union is used only where upstream actually has one
- UI never invents an enum for a free upstream string

### FIXED-UI000-MOCK-004 relationship binding was too broad

Canonical Relationship semantics already exist before Sprint 1 completion. Only the final S01-008 runtime collection/read/validator binding belongs in DEFERRED_BINDING.

Resolution:
- DB-022 narrowed to final runtime binding/cross-check

Result: DEFERRED_BINDING registry normalized from 24 to 22 rows.

## 4. Historical R6 DB-001～022 dry-run

| DB | Subject | Evidence now | Provisional status | Real UI-000 must verify | Risk |
|---|---|---|---|---|---|
| DB-001 | post-start battle execution abort final class/symbol/module | S01-007 fix7 artifact exists, exact final review/public export not retrieved | completion_binding_pending | final S01-007 accepted commit + package root exports + execution-abort tests | medium |
| DB-002 | canonical committed runtime snapshot/read public API | S01-008 integration contracts artifacts exist; production runtime API not verified | completion_binding_pending | final S01-008 runtime type/API/export + clone/validation tests | high |
| DB-003 | CAL-JAN-SYNC WorldDate/WorldCalendar physical fields | calendar migration not yet final-verified here | calendar_dependency_pending | CAL-JAN-SYNC accepted files/tests + runtime WorldDate shape | high |
| DB-004 | canonical Person collection runtime read path/API | Person shape exists; S01-008 final runtime placement pending | completion_binding_pending | final WorldEngine state/read API + Person collection validator | high |
| DB-005 | start/reset/step receipts and four aggregate counts | S01-008 integration concern; final receipt source unavailable | completion_binding_pending | final operation receipt/result types and WorldEngine integration tests | high |
| DB-006 | committed PersonTemporaryCondition integration path | PersonTemporaryCondition VO exists; WorldEngine commit path pending S01-008 | completion_binding_pending | final runtime Person temporary condition storage/read path | medium |
| DB-007 | canonical stored current-age/public Person read path | S01-002/Sprint0 evidence shows currentAge lifecycle | candidate_evidence_strong | final runtime Person type + validator + age consistency test | low |
| DB-008 | mock participant eligibility public helper/facade/module | battle participant/start validation exists; candidate-specific final facade not verified | completion_binding_pending | final public eligibility/participant validation export and tests | medium |
| DB-009 | TechniqueDefinition public type/module/schema/key registry | S01-003 accepted evidence is strong and public | candidate_evidence_strong | final package-root export + schemaVersion + 31-key registry unchanged | low |
| DB-010 | TechniqueDefinition nested literal unions | S01-003 definitions/tests exist; final union registry must be re-read | candidate_evidence_strong | final TechniqueDefinition nested types/validators for rangeShiftAfterUse etc. | low |
| DB-011 | weekly training sourceProcessor literal/module | weekly candidates are public; WorldEngine append producer literal is S01-008 integration | completion_binding_pending | final weekly processor registration + EventEnvelope sourceProcessor test | high |
| DB-012 | run-wide committed Event Stream query source | S01-004 emits candidates only; committed stream query is final runtime integration | completion_binding_pending | S01-008 Event Stream state/query/export + ordering tests | high |
| DB-013 | all ValidationResult concrete sources/facades saved by UI store | individual validation exists; final integration set depends on S01-008 | completion_binding_pending | S01-008 operation validation receipts/result union + tests | high |
| DB-014 | BattleActionLog 3 final exact types/modules | S01-006 proves replacementReason typed, evadeDirection typed, activationFailureReason string\|null | candidate_evidence_strong | final S01-006/S01-007 package-root type exports and validators; do not invent enum | low |
| DB-015 | BattleResult judgeSummary decisiveCriterion/seededRngRoll paths | requires final S01-007 BattleResult | completion_binding_pending | final BattleResult/summary validator/type/tests | medium |
| DB-016 | canonical replay runtime checkpoint type/rebuild API | depends on final S01-008 runtime checkpoint/rebuild boundary | completion_binding_pending | final checkpoint/export/rebuild public API + hash/cross-bind tests | high |
| DB-017 | battle.started/battle.finished pre-allocation candidate schemas | battle.started exists from S01-005; battle.finished/final pair depends S01-007 | completion_binding_pending | final candidate types/validators + commit plan event ordering | medium |
| DB-018 | CLI/UI canonical runtime snapshot/export + deterministic normalization registry | final runtime/export and verifier normalization need completed integration | completion_binding_pending | S01-008/009 deterministic snapshot exporter + verify:sprint0 normalizer registry | high |
| DB-019 | CAL-JAN-SYNC minimum N crossing year boundary/test source | calendar migration dependency | calendar_dependency_pending | accepted CAL-JAN-SYNC boundary tests | high |
| DB-020 | WorldSummary identity/rule final owner/path | RunRuleSnapshot/SimulationIdentity already strong; final runtime storage path pending | completion_binding_pending | final runtime snapshot fields + RunRuleSnapshot/SimulationIdentity package exports | medium |
| DB-021 | training.action_selected exact payload/validator/forcedReason | S01-004 accepted evidence exposes payload fields and event order | candidate_evidence_strong | final public payload validator/type + sourceProcessor integration | low |
| DB-022 | relationship runtime collection/read path/validator | canonical Relationship already validated in Sprint0/S01-002; final runtime read binding pending S01-008 | completion_binding_pending | final WorldEngine relationship collection/read API + existing counterpart fields/validator cross-check | medium |

### Historical R6 counts

```text
candidate_evidence_strong = 5
completion_binding_pending = 15
calendar_dependency_pending = 2
matched = 0  // mock audit must not pretend final match
spec_fix_required = 0 after R3 corrections
code_fix_required = 0 currently proven
```

## 5. Highest-risk real UI-000 rows

Priority A — likely to discover final integration differences:

- DB-002 committed runtime snapshot/read API
- DB-003 calendar physical fields
- DB-004 Person collection runtime read path
- DB-005 operation receipt/aggregate source
- DB-011 weekly sourceProcessor
- DB-012 committed Event Stream query
- DB-013 ValidationResult integration sources
- DB-016 replay runtime checkpoint
- DB-018 deterministic runtime snapshot/normalizer
- DB-019 calendar year-boundary N

Priority B — existing implementation evidence is strong but final export/path must be rechecked:

- DB-007 currentAge
- DB-009/010 TechniqueDefinition
- DB-014 BattleActionLog types
- DB-021 training.action_selected payload

## 6. Expected finding classification in real UI-000

Examples:

```text
same semantics, symbol/path moved
  -> binding_update

required S01-008 public read API absent
  -> code_fix_required

final upstream meaning conflicts with S1.5 semantics
  -> spec_fix_required

Sprint1/CAL commit unavailable
  -> dependency_blocker

Node/browser/test environment unavailable
  -> environment_blocker
```

`binding_update` is allowed only when semantic equivalence is proven.

## 7. Real UI-000 release sequence after Sprint 1 completion

```text
1. record Sprint 1 final accepted commit
2. record CAL-JAN-SYNC accepted commit
3. run static package audit
4. inventory package-root exports and final schemaVersion literals
5. bind DB-001..022 physical evidence
6. require matched=22 / unresolved=0
7. audit BRIDGE against matched DBs
8. materialize MIG readiness 36/36
9. verify API owner/readiness 15/15
10. verify contract ownership 370 / acceptance ownership 174
11. consolidate finding classes; STOP exact4 open=0
12. only then release UI-001
```

## 8. Mock verdict

```text
UI-000 MOCK VERDICT = PREPARED_BUT_DEPENDENCY_BLOCKED
known S1.5 semantic blocker after corrections = 0
known registry classification bug after corrections = 0
real DB matches asserted = 0
```

The remaining uncertainty is intentionally concentrated in UI-000 final physical binding, not pushed into UI-001+ implementation.


## 9. Second-pass mock UI-000 findings

### FIXED-UI000-MOCK-005 DB registry next-ID/count remnants

After DB normalization 24 -> 22, the UI-000 runbook still contained:

```text
row count 24
do not append DB-025
```

and the checklist still contained old `001..024` wording.

Current contract:

```text
row count 22
matched 22
current DB IDs = DB-001..022
next unregistered candidate = DB-023
```

The explicit negative fixture `add unregistered DB-023` remains intentional.

### FIXED-UI000-MOCK-006 base authority was not repo-bound

The amendment says authority is:

```text
S1.5-SPEC-0.1.13 base
+ S1.5-SPEC-0.1.14 amendment
```

but package-only checker could PASS without verifying the repository's base file.

Added:

```text
S1_5_BASE_AUTHORITY_GATE_0.1.0.md
S1_5_SPEC_FREEZE_POLICY_0.1.0.md
```

and checker modes:

```text
package_only
repo_bound
```

UI-000 GATE-015 requires repo-bound mode.

repo-bound exact conditions:

```text
tracked base file count = 1
base version = S1.5-SPEC-0.1.13
base dirty = false
blob hash recorded
last modifying commit recorded
```

### FIXED-UI000-MOCK-007 workflow heading ambiguity

Found duplicate exact numeric headings in implementation workflow docs:

```text
Implementation Plan:
  ## 12 duplicated
  ## 13 duplicated

Cursor common template:
  ## 13 duplicated
```

All workflow headings were renumbered to unique exact numeric sections.

Static checker now verifies:

```text
Implementation Plan exact numeric headings = 1..19
Cursor Template exact numeric headings = 1..16
UI-000 Runbook exact numeric headings = 1..18
```

### HARDENED-UI000-MOCK-008 task audit/instruction cross-check

The checker already verified API owner maps and task instruction API sections, but did not compare every task's Critical DB list with the implementability audit.

Now for UI-001..010 it exact-compares:

```text
implementability audit Critical DB bindings
==
task Cursor instruction Critical DB bindings
```

and:

```text
implementability audit Owned APIs
==
canonical API owner map
```

## 10. Second-pass verdict

```text
SECOND MOCK UI-000 VERDICT = PREPARED_BUT_DEPENDENCY_BLOCKED

new semantic blocker discovered in second pass = 0
workflow/spec-preparation defects found and fixed = 4
real final DB matches asserted = 0
remaining real blockers:
  Sprint 1 completion binding
  CAL-JAN-SYNC completion binding
```

The second pass again found actionable preparation defects, so repeating the mock audit was justified.

## 11. R4 real-gate note

Package-only checker PASS is not UI-000 GATE-015. Real UI-000 must run repo-bound mode against the fixed Git repository and bind the tracked `S1.5-SPEC-0.1.13` base authority. Until Sprint 1/CAL completion exists, repo-bound audit remains intentionally pending for the real project.


### FIXED-UI000-MOCK-009 Cursor bundle was not self-contained

The earlier task-instruction ZIP contained task docs/template/FI/report but omitted documents directly referenced by those task docs, including the Implementation Plan, ownership manifests, implementability audit, checker, and amendment.

Using that ZIP alone could make Cursor stop for missing referenced authority.

R4 adds:

```text
S1_5_EXECUTION_BUNDLE_MANIFEST_0.1.0.md
```

and builds a self-contained UI-000～UI-010 execution bundle.

The only intentionally external authority is the repository's tracked `S1.5-SPEC-0.1.13` base, verified in repo-bound mode.


## 12. R5 API state-transition audit

A third perspective pass audited all 15 endpoints as explicit state transitions:

```text
request
-> validation / security
-> journal lookup or fixed read snapshot
-> lifecycle/resource/integrity
-> commit/no-commit
-> response construction
-> serializer/transport failure
-> retry/replay
```

New normative artifact:

```text
S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md
ST-001..ST-015 == API-001..API-015 exact
```

Problems found and fixed in this pass:

1. `GET /session` was incorrectly described as owning `summary/lastOperation`.
   - API-001 data is exact3: sessionState/csrfToken/activeOperation.
   - `lastOperation` belongs only to API-006 `GET /simulation`.

2. `GET /session` bootstrap precedence did not distinguish:
   - invalid request with no valid session
   - invalid request with an already-valid idle/updating session.
   It now non-mutatingly inspects cookie/session first, validates query before any new-session generation, and retains valid-session revision/isUpdating metadata.

3. new-session DTO/JSON/Set-Cookie construction is prebuilt before store registration; post-registration transport failure does not roll back the registered session.

4. POST journal lookup was worded as if it were running acceptance.
   Running record/updateControl/operationStartReadSnapshot are now created only after lock/revision/lifecycle/resource existence pass.

5. canonical source/store integrity is checked after running acceptance but before domain/capacity/mutation; corrupt reset/replay/runtime source is not hidden by capacity failure.

6. API-012 same-person request is strict body-validation 400 before journal reservation/updateControl/eligibility/RNG/MatchId.

7. TX-083 retained an impossible atomic start `complete internal` case.
   It is removed; start/reset/mock/replay application failures are none-only.

8. `GET /presets.items` ordering is locked to `presetId` ascending.

9. authentic cookie + corrupt server-side UiSession is INTERNAL_ERROR, not invalid-cookie self-heal/new session.

10. fault-injection pseudo codes `FORBIDDEN_ORIGIN` / `FORBIDDEN_CSRF` were replaced by canonical `REQUEST_FORBIDDEN`.

Current R5 package-only checker:

```text
PASS
API state rows = 15
ST ownership missing = 0
known state-transition semantic ambiguity after fixes = 0
```

Real UI-000 remains dependency-blocked until Sprint 1 completion + CAL-JAN-SYNC and must use repo-bound checker mode.


## 13. R6 cross-API sequential audit

A further pass audited operation sequences instead of isolated endpoints.

New artifact:

```text
S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md
SCN-001..015
```

Key sequence under test:

```text
start
-> step
-> mock
-> step
-> replay
-> reset
-> old completed replay requestId resend
-> new replay requestId
```

### Findings fixed

1. **requestId journal namespace/lifetime**
   - Base authority defines one requestId namespace per UiSession across all mutation endpoints.
   - running/completed records must not be evicted until UiSession/process end.
   - R6 forbids endpoint-local journal maps, process-global cross-session maps, TTL/LRU/max-count eviction, and start/reset/revision-driven clear.

2. **K=0 partial_failure metadata generation**
   - `uiRevision` can remain unchanged while `lastOperationRequestId` changes.
   - Therefore uiRevision alone is not a unique full `UiReadSnapshot` generation/cache key.
   - K=0 completion invalidates any full-snapshot cache but does not invalidate pageable cursors solely because lastOperation changed.

3. **K=0 HTTP200 finalization atomicity**
   - running->completed journal, exact response bytes, new lastOperationRequestId, and updateControl release are one session completion boundary.

4. **process restart cookie/cursor precedence**
   - old cookie + non-bootstrap world GET -> 401 SESSION_REQUIRED before cursor auth.
   - bootstrap with old-process cookie -> new empty session.
   - new empty session + old cursor -> 409 SIMULATION_NOT_STARTED before cursor auth.
   - new run + old-process cursor -> 400 INVALID_REQUEST because old HMAC cannot authenticate; not STALE_CURSOR.

5. **security/strict DTO before saved replay**
   - Existing requestId text never bypasses Host/session/Origin/CSRF or strict DTO validation.
   - Only a strict-valid canonical request reaches completed/running/conflict lookup.

6. **saved response equality**
   - Exact idempotency equality is original HTTP status + response body bytes.
   - Non-deterministic transport headers are excluded from exact equality.
   - Stable API header requirements still apply.

7. **client disconnect/reload/AbortSignal**
   - Client transport loss after running acceptance does not cancel or roll back server execution.
   - Reload sees the same running activeOperation.
   - Same requestId gets UPDATE_IN_PROGRESS while running and saved response after completion.
   - Process crash before final journal boundary remains a separate non-resumable case.

8. **checker hardening**
   - An intentional no-eviction mutation initially exposed an overly broad checker search.
   - Checker was narrowed to normative §6N.2 and the full suite then passed 30/30.

### R6 mock verdict

```text
CROSS-API SCENARIOS = 15
SCN owner missing = 0
SCN duplicate owner = 0
known sequential-operation semantic ambiguity after fixes = 0
checker self-test = 30/30

historical R6 snapshot: final Sprint1/CAL binding was still pending
real UI-000 PASS not claimed
```


## 14. R7 S01-008 accepted pre-binding

Returned Sprint 1 documents now establish:

```text
HISTORICAL R7 SNAPSHOT
S01-001..008 implemented / accepted
S01-008 accepted commit 7c47847
S01-009 clarified but pending at snapshot creation
```

`S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md` reclassifies all DB-001..022 without claiming real `matched`.

```text
accepted_code_reference_bound = 5
accepted_contract_bound_needs_repo_exact = 13
accepted_s01_007_needs_repo_exact_binding = 2
s01_009_completion_evidence_pending = 0
calendar_dependency_pending = 2
normative matched = 0
```

Rows still waiting for S01-008 implementation = 0.


### DB-018 correction from returned S01-009 evidence

Returned sources exposed a Sprint 1.5 preparation defect in the prior R6 rule.

Wrong prior assumptions:

```text
same-seed raw simulationId/eventId are excluded
CLI/UI must reuse the same normalizer/helper implementation
DB-018 waits for S01-009 implementation
```

Correct contract:

```text
same-seed simulationId/eventId are deterministic and must match
S01-009 comparator is verification-private
CLI/UI share the 05/S01-009 semantic rule-set, not necessarily implementation code
DB-018 waits only for S01-008 runtime snapshot/export physical repo binding
At the R7 snapshot, S01-009 completion was a global Sprint 1 completion gate; current predecessor status comes from roadmap/P00. S01-009 is not a DB-018 physical dependency.
```


Real UI-000でR8 evidenceを再利用する場合も、final P04はP00で固定したcurrent repository baselineへ全DB rowを再照合する。`7c47847` machine collectionだけから`matched`へ昇格しない。

## 15. R8 accepted-commit physical audit path

R8 removes the need to wait for S01-009 merely to inspect accepted S01-008 source paths.

```text
git show 7c47847:<path>
git grep ... 7c47847 -- <scope>
```

can inspect the immutable accepted commit while the normal worktree remains on later work.

Artifacts:

```text
S1_5_REPO_PHYSICAL_BINDING_AUDIT_0.1.0.md
S1_5_CURSOR_UI000_REPO_BINDING_TASK_0.1.0.md
audit-s1-5-repo-bindings.mjs
audit-s1-5-repo-bindings.ps1
```

The Node runner was runtime-tested on temporary Git repos.

Expected real-repo workflow:

```text
machine collection against 7c47847
-> semantic UI-000 review
-> matched/spec_fix_required
```

not:

```text
regex hit
-> automatic matched
```

CAL DB-003/019 remain dependency pending until CAL-JAN-SYNC accepted evidence exists.


## 16. R9/R10 long-run Historical architecture audit

New authority:

```text
S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md
HIST-001..106
S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md
HSC-001..062
```

Compatibility audit result:

```text
direct existing conflicts = 5
existing gaps = 7
scenario edge hardening = 8
second deep-pass latent gaps = 10
third deep-pass control-plane/integrity gaps = 5
fourth deep-pass read-lifecycle gaps = 3
resolved = 38
current UI-001..010 semantic blockers added = 0
current API 0.2.0 schema expansion = 0
```

The important current/future split is:

```text
current monolithic Person/List/Detail = strict 0.2.0 behavior
future Historical reader            = local partial degradation + versioned wire contract
current weekly state                 = strict
Historical archive payload           = immutable / not weekly hot-path
```

Long-run non-regression now forbids:

- deleting deceased Persons or reusing PersonId
- weekly scan/clone/full-validation of all Historical payloads
- normal autosave rewriting the full immutable archive
- requiring all-history scan for WorldSummary.personCount
- making mutable reverse links the sole truth inside immutable Historical Person
- treating a single historical corruption as mandatory whole-tree/page failure
- treating missing/corrupted ancestry as not-related

The physical Historical storage schema is intentionally not fixed yet.


### R10 second-pass additions

R10 additionally closes:

- partial-read physical framing
- PersonDirectory location vs payload integrity distinction
- bounded normal-load metadata work
- no hot-path full-history fallback for stale indexes
- traversal-budget exhaustion -> cannot_determine
- generation-based repair/read isolation
- death-transition crash recovery
- append cursor without historical-prefix scan
- retention expiry != corruption
- supporting historical prefix no-weekly-wholesale clone/validation

Current UI-001..010 scope expansion remains 0.


### R10 third-pass additions

Further long-run review closes:

- bounded archive corruption blast radius
- historical control-plane degraded/unavailable mode instead of empty archive
- PersonId allocator/high-water integrity without scanning all history
- cached-valid invalidation after content identity/bitrot changes
- retention tombstone/identity continuity and no ID/sequence reuse

Current UI-001..010 scope expansion remains 0.


### R10 fourth-pass additions

Read-lifecycle audit adds:

- safe old-generation reclamation after live readers finish
- Historical paging/tree cursor generation binding
- validated unchanged Current->Historical reference evidence so ordinary weekly validation does not re-resolve ancient payloads

Current UI-001..010 scope expansion remains 0.


## 16. R10 Historical repeated deep audit

R10 repeatedly re-audited the R9 Historical boundary from storage framing, control-plane integrity, repair/read generations, crash recovery, retention and long-run resource lifetime perspectives.

Current future-architecture registries:

```text
HIST-001..106
HSC-001..062
CA-001..038
```

Newly closed R10 classes include:

```text
independently decodable partial-read framing
PersonDirectory existence vs payload integrity
bounded normal-load metadata work
no stale-index all-history hot-path fallback
traversal budget exhaustion = cannot_determine
copy-on-write Historical repair generations
read-generation isolation
crash-recoverable death transition
append cursor / no historical-prefix rescan
retention expiry != corruption
supporting history no-weekly-wholesale clone
bounded segment corruption blast radius
control-plane degraded != empty archive
history-dependent aggregate != fake active-only value
PersonId allocator no archive scan/reuse
cached-valid invalidation on bitrot/content identity change
retention tombstone identity/sequence continuity
live-reader-safe old-generation reclaim
multi-request Historical cursor generation binding
validated unchanged Current->Historical reference evidence
```

Final current-checker mutation validation:

```text
HIST-057..076 reversed one-by-one = 20/20 DETECTED
extra control-plane/active-only regressions = 2/2 DETECTED
R10 final current-checker Historical set = 22/22
```

This remains a future compatibility architecture. It does not claim that the Historical archive subsystem is already implemented or that real UI-000 physical binding is complete.
\n\n## 18. R11 fifth-pass historical hardening\n\nR10再監査でsave/checkpoint generation consistency、rule-specific evidence、durable generation pin、unsupported schema、history-dependent writes、repair retroactivity、integrity trust chain、relationship index generation、same-week death boundaryを追加。\n\n```text\nHIST-077..087 added\nHSC-033..043 added\nCA-039..049 added\ncurrent UI-001..010 scope expansion = 0\n```\n

### R12 sixth-pass additions

R12 additionally closes long-run gaps that remained outside the weekly processor loop itself:

- archive-wide weekly state hash/canonicalization must not reintroduce O(all history) cost
- physical storage compaction/cache layout must not alter gameplay determinism
- Historical Technique/catalog semantics need versioned provenance, not latest-definition reinterpretation
- checkpoint publication must occur only after referenced Historical state is durable
- save deletion and durable-pin release must be crash-safe
- retained branch/fork roots participate in Historical GC and ID namespace safety
- stale/degraded UI cache is presentation-only, not rule authority
- explicit full audit is read-only unless repair is separately requested
- relationship current/history views require temporal lifecycle consistency
- partial-read placeholders must preserve stable list/tree identity/order

Current registries:

```text
HIST-001..106
HSC-001..062
CA-001..068
```


### R12 seventh-pass additions

- bounded defensive decode/decompression for corrupted Historical fragments
- duplicate logical identity conflict is ambiguous, never implicit last-write-wins
- semantic catalog/provenance retention follows retained history/save references
- maintenance publish uses base-generation conflict detection to prevent lost updates
- checkpoint capture binds one committed Current+Historical boundary
- unpublished orphan segment bytes are non-authoritative

```text
HIST-001..106
HSC-001..062
CA-001..068
```

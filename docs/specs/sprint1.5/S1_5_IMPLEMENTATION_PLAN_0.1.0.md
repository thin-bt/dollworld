# Sprint 1.5 Implementation Plan

- Document ID: `S1.5-IMPLEMENTATION-PLAN`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Purpose: Cursor実装時の依存逆転・先行実装・仕様未定義手戻りを防ぐ
- Authority: implementation workflow companion。ゲーム意味論はSprint 1.5正本仕様を上書きしない。

## 1. Fixed acceptance sequence

```text
UI-000 -> UI-001 -> UI-002 -> UI-003 -> UI-004 -> UI-005 -> UI-006 -> UI-007 -> UI-008 -> UI-009 -> UI-010
```

並列task branchでfuture production codeを先行しない。

## 2. Task ownership

| Task | Preconditions | Production APIs | Must finish | Must not pre-implement |
|---|---|---|---|---|
| UI-000 | Sprint 1 accepted + CAL-JAN-SYNC accepted + T02 complete + T03-A complete + required T03-B residual=0 | none | GATE-001..015 actual evidence、DB/MIG/readiness/owner/test plans/static audit | UI production code |
| UI-001 | UI-000 accepted + post-UI-000 freeze/hash一致 + exact frozen bytes package-only/repo-bound re-audit PASS | none | React/Vite/Fastify scaffold, same-origin, Host/Origin, envelope/client primitives, static shell | live session, simulation adapter, domain endpoints |
| UI-002 | UI-001 accepted | API-001, API-002 | session cookie/CSRF, process keys, UiSession/UiReadSnapshot, journal/lock/revision, presets, common adapter | start/step/people/mock/event endpoints; isolated mock runner |
| UI-003 | UI-002 accepted | API-003,004,005,006 | start/step/reset/simulation, world+validation commit integration | people/mock/event feature routes |
| UI-004 | UI-003 accepted | API-007,011 | people list + mock candidate list, paging/cursor | person detail/mock execution |
| UI-005 | UI-004 accepted | API-008 | PersonDetail, stats/aptitudes/techniques/statHistory/trainingHistory | mock execution/log |
| UI-006 | UI-005 accepted | API-012,013,014 | new mock/replay/latest, isolation, optional IsolatedMockBattleRunner | battle-log/event/validation routes |
| UI-007 | UI-006 accepted | API-015 | battle log paging/presentation | event/validation routes |
| UI-008 | UI-007 accepted | API-009,010 | canonical events/validation and mock-area separation | determinism-specific production bypass |
| UI-009 | UI-008 accepted | none | DET-001..007 automated harness | new production endpoints/schema |
| UI-010 | UI-009 accepted | none | full traceability/evidence/quality/artifact acceptance | new features |

## 3. API owner exact-one map

| API ID | Method/path | Owner |
|---|---|---|
| API-001 | GET `/api/s1_5/session` | UI-002 |
| API-002 | GET `/api/s1_5/presets` | UI-002 |
| API-003 | POST `/api/s1_5/simulation/start` | UI-003 |
| API-004 | POST `/api/s1_5/simulation/step` | UI-003 |
| API-005 | POST `/api/s1_5/simulation/reset` | UI-003 |
| API-006 | GET `/api/s1_5/simulation` | UI-003 |
| API-007 | GET `/api/s1_5/people` | UI-004 |
| API-008 | GET `/api/s1_5/people/:personId` | UI-005 |
| API-009 | GET `/api/s1_5/events` | UI-008 |
| API-010 | GET `/api/s1_5/validation-results` | UI-008 |
| API-011 | GET `/api/s1_5/mock-battles/candidates` | UI-004 |
| API-012 | POST `/api/s1_5/mock-battles` | UI-006 |
| API-013 | POST `/api/s1_5/mock-battles/replay` | UI-006 |
| API-014 | GET `/api/s1_5/mock-battles/latest` | UI-006 |
| API-015 | GET `/api/s1_5/mock-battles/latest/log` | UI-007 |

No API ID may have zero or multiple production owners. API ID/path pair is inherited from S1.5-SPEC-0.1.13 and must not be renumbered by feature order.

## 4. UI-000 readiness phase

UI-000はUIコード実装taskではない。

完成させるもの: GATE-001..015 actual evidence、DB-001..022 physical bindings、MIG owner/negative-test plan、API owner/DTO/error/source/test plan、DISPLAY/EVENT maps、BRIDGE/TX/PAGE/DET/FIX owner/test/fixture plan、acceptance 1..174 TRACEABILITY-PLAN、static audit exit0。

完成させないもの: React feature pages、future endpoint handlers、future endpoint integration tests、全FIX fixture files、MIG new implementation evidence、UI-010 actual test paths。

## 5. Evidence lifecycle

```text
UI-000: readinessStatus=ready_to_implement / implementationStatus=not_started
owner task accepted: implementationStatus=implemented + actualTestPath/actualCommand/evidence
UI-010: not_started=0 / ready-only=0 / unused fixture=0 / missing evidence=0
```

## 6. Task-start preflight

```text
[ ] fixed repository is the project repository
[ ] immediate predecessor accepted commit is current base
[ ] no separate worktree/temp repo
[ ] package-only static spec audit passes
[ ] repo-bound static spec audit passes
[ ] base authority `S1.5-SPEC-0.1.13` tracked exact1 / dirty=false
[ ] UI-000: no pre-existing freeze record is required; follow P00～P12 and freeze only after PASS
[ ] UI-001～010: frozen spec/package/base/evidence hash record exists and matches current files
[ ] open STOP = 0
[ ] SPEC_UNDEFINED = 0
[ ] own APIs/contracts/fixtures are listed
[ ] all required DB bindings exist
[ ] own planned tests are executable with accepted dependencies
```

If any check fails, stop before production changes and report the exact blocker.

## 7. Cursor implementation rules

- Work in the fixed project repository only.
- Use a normal branch; do not create a worktree or copied development repository.
- Do not commit.
- Do not implement a future task to make the current task pass.
- Do not invent aliases/defaults/null fallbacks/temporary DTOs/spec semantics.
- Do not change simulation-core public contracts unless the current spec explicitly assigns a minimal facade to the current task.
- Semantic gap -> `spec_fix_required` before implementation.
- Sprint 1 code vs higher authority conflict -> `code_fix_required`; adapterで隠さない。

## 8. Required per-task acceptance evidence

```text
task id
branch
base commit
spec version
predecessor accepted commit
owned API IDs
owned contract/test/fixture IDs
changed files
added/updated tests
commands run
targeted test result
full quality gate result
static spec audit result
spec differences: none | exact list
unresolved: none | exact list
git status
staged file list
worktree list
```

Cursor stages reviewed task files but does not commit.

## 9. Handoff artifacts

Repository `_handoff-artifacts/`、task commit外。

```text
dollworld-<TASK>-review.patch
dollworld-<TASK>-files.zip
dollworld-<TASK>-verification.zip
dollworld-<TASK>-SHA256.txt
```

Correction cycleは`-fix1`, `-fix2`, ...。

## 10. No-forward-work audit

```text
future owned API handler count == 0
future feature page count == 0
unplanned endpoint/schema count == 0
temporary compatibility alias count == 0
TODO/TBD/skip for required contract count == 0
```

## 11. UI-010 final audit

- API-001..015 owner implementation complete
- acceptance 1..174 actual traceability complete
- MIG-001..036 implemented + negative tests PASS
- FIX-001..104 materialized and used
- TX-001..090 PASS
- PAGE-001..014 PASS
- DET-001..007 PASS
- DB-001..022 still match current accepted code
- static spec audit PASS
- full project quality gate PASS
- no open dependency/environment/code/spec blocker
- FI-001..076 evidence complete
- no required TODO/skip

## 12. Contract ownership semantics

`S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md` is normative for **final acceptance evidence ownership** of BRIDGE/TX/PAGE/DET/MIG/FIX contracts. It is not exclusive production-code ownership.

Cross-cutting contracts may be required by an earlier API owner before the manifest ownerTask. The earlier task MUST implement and test the portion required by its own accepted API/common primitive and append `consumerEvidence`, while leaving the contract `implementationStatus=ready_to_implement`. The manifest ownerTask later aggregates all consumerEvidence, tests the remaining branches, and sets `implemented`.

Cursor must never implement a future endpoint/feature merely to complete a cross-cutting contract early. API-001..015 route ownership remains exclusive exact-one. If the required current-task scope cannot be implemented with accepted dependencies, STOP before implementation and report the dependency mismatch.

## 12A. Ownership manifests

```text
S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md
  BRIDGE119 + TX90 + PAGE14 + DET7 + MIG36 + FIX104

S1_5_ACCEPTANCE_OWNERSHIP_MANIFEST_0.1.0.md
  ACC001..174
```

UI-000/Cursorはownerをその場で決めない。owner変更が必要ならSTOPしてmanifest/specを再監査する。


## 12B. Cross-cutting consumer evidence

Examples:

- UI-003 implements start/reset/step portions of TX-070/TX-072/TX-073 even if final contract owner is later.
- UI-004 implements totalCount/nextCursor for people/candidates before PAGE-007 final cross-endpoint evidence owner closes it.
- UI-007 implements BattleLog exact4 before later common paging matrix checks, without implementing Event/Validation routes.

Record:

```text
contractId
consumerTask
covered API/branch
test path/command
evidence
```

No future endpoint may be created to fill missing matrix cells.

## 13. UI-000 runbook / Cursor task template

```text
S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md
S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md
```

UI-000はrunbook P00～P12の順序を変更しない。
UI-001～010はCursor task templateのpreflight/STOP/report/artifact contractを共通使用する。

## 14. Numbered contract load by task

| Task | BRIDGE | TX | PAGE | DET | MIG | FIX | ACC | Total numbered ownership |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| UI-000 | 4 | 3 | 0 | 0 | 0 | 3 | 10 | 20 |
| UI-001 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| UI-002 | 12 | 4 | 1 | 0 | 4 | 4 | 12 | 37 |
| UI-003 | 21 | 21 | 0 | 0 | 1 | 17 | 15 | 75 |
| UI-004 | 2 | 2 | 2 | 0 | 1 | 3 | 1 | 11 |
| UI-005 | 17 | 14 | 0 | 0 | 10 | 19 | 24 | 84 |
| UI-006 | 29 | 27 | 0 | 0 | 7 | 30 | 24 | 117 |
| UI-007 | 6 | 3 | 3 | 0 | 4 | 5 | 6 | 27 |
| UI-008 | 18 | 15 | 8 | 0 | 9 | 19 | 11 | 80 |
| UI-009 | 2 | 1 | 0 | 7 | 0 | 4 | 8 | 22 |
| UI-010 | 8 | 0 | 0 | 0 | 0 | 0 | 63 | 71 |

`UI-001 = 0`は意図的。UI-001はframework/shell/common primitiveだけを作り、domain contractを先食いしないこと自体が責務。

合計:

```text
BRIDGE 119
TX 90
PAGE 14
DET 7
MIG 36
FIX 104
ACC 174
TOTAL 544
```


## 15. Single-task implementability audit rules

各taskはimmediate predecessorだけをaccepted dependencyとして完結可能であることを受入前に確認する。

### UI-001

- numbered domain ownership 0件は意図的。
- task acceptanceはframework/shell/common primitiveの専用instructionで固定する。
- live UiSession/session store/API routeを作らない。

### UI-002

- cursor security/query codecはunit testで閉じる。
- future paged endpointが存在しなくても受入可能。
- live APIはAPI-001/002だけ。

### UI-003

start/step/reset/simulationで必要なcross-cutting contractは、final ownerがUI-006/UI-010でもcurrent API branchを実装しconsumerEvidenceを残す。

最低consumer scope:

```text
TX-070 lastOperation
TX-072 uiRevision capacity
TX-073 commitState/committedWeeks
TX-077 POST errorReference acceptance boundary
TX-078 GET failure none // API-006 branch
TX-085 atomic mutation response boundary
TX-086 isUpdating final response
BRIDGE-099/101/102/106/107/114/115 corresponding branches
```

future mock/event endpointは作らない。

### UI-004

- API-007/011のみ。
- DB-004 Person read、DB-008 eligibility bindingを消費。
- common paging/query/cursorのPeople/Candidate branchをconsumerEvidence化。
- new mock executionは行わない。

### UI-005

- API-008のみ。
- DB-012 committed Event Stream read sourceをinternal adapterから使用可能。
- API-009 Event route/UIは未実装のままでよい。
- history計算のためfuture endpointを作らない。

### UI-006

UI-000 reportに:

```text
isolatedRunnerDecision = not_required
or
isolatedRunnerDecision = implement_in_UI_006
isolatedRunnerContract = exact public facade/type/test plan  // implementの場合
```

が必須。

未確定ならdependency_blockerでproduction edit前STOP。

UI-006はUI-003 consumerEvidenceをaggregateしてmock branchを追加するが、API-015 battle-log routeを作らない。

### UI-007

- API-015だけ。
- UI-006 latest store/detailedLogをread-only消費。
- common paging/cursor BattleLog branchをconsumerEvidence化。
- API-009/010を作らない。

### UI-008

- API-009/010を実装。
- ここでPeople/Candidate/BattleLogを含むcommon GET/paging/cursor matrixの残りをaggregate可能。
- canonical Event/Validationとmock確認領域を混同しない。

### UI-009

- production変更なし。
- DB-018 normalizer/DB-019 year-boundary bindingはUI-000 actual evidence必須。
- DET差分を新production alias/normalization exceptionで隠さない。

### UI-010

- production変更なし。
- missing evidence/failureは元owner task/specへ戻す。
- Chrome/Edge/Node/tooling不足はenvironment_blockerとして報告し、spec/code fixと混同しない。

## 16. STOP taxonomy

```text
spec_fix_required
code_fix_required
dependency_blocker
environment_blocker
```

preflight STOPではproduction files changed = none。

## 17. Task-specific Cursor instructions

UI-001～010は:

```text
S1_5_CURSOR_UI_001_0.1.0.md
...
S1_5_CURSOR_UI_010_0.1.0.md
```

を共通templateと併用する。

`S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`のtask verdictが`READY_AFTER_UI000_GATE`または`READY`以外なら開始禁止。


## 18. Fault injection and report contract

各UI-001～010は:

```text
S1_5_FAULT_INJECTION_MATRIX_0.1.0.md
```

で割り当てられたFIを全件実行する。

```text
FI-001～076
missing = 0
FAIL = 0
```

FI hookはtest-only dependency/providerとして作り、production debug branchを残さない。

最終Cursor reportは:

```text
S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md
```

に従う。

STOP exact4:

```text
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

UI-000だけは:

```text
S1_5_UI000_FINDING_RESOLUTION_MATRIX_0.1.0.md
```

で`binding_update`を非STOP findingとして追加利用できる。


## 19. Base authority and freeze

Real UI-000 / UI-001 release uses:

```text
S1_5_BASE_AUTHORITY_GATE_0.1.0.md
S1_5_SPEC_FREEZE_POLICY_0.1.0.md
```

Package-only checker PASS is not sufficient for UI-000 GATE-015.
Drive `specs/proposed`だけもsemantic authorityにはならない。

Real UI-000 must prove:
- repository contains exactly one tracked base `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` at `S1.5-SPEC-0.1.13`
- current `S1.5-SPEC-0.1.15` amendment is Git-tracked exact1 / dirty=false
- package amendment and Git amendment bytes/hash match
- all R12 semantic/control inputs used for implementation have completed proposal→Git adoption classification
- P00-fixed Git HEAD and latest `specs/current` manifest HEAD match
- proposal-only semantic/control input count = 0

After UI-000 acceptance, freeze the final Git-reflected spec/control authority, package and frozen-baseline evidence hashes before UI-001.
UI-000 must not require a pre-existing freeze record; UI-001～010 must require the post-UI-000 freeze record.
Semantic edits after freeze require a new Sprint 1.5 spec version.


## 20. API state-transition audit

Every production API owner must implement and accept the corresponding row in:

```text
S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md
```

Exact mapping:

```text
API-001 -> ST-001
...
API-015 -> ST-015
```

The owner task must test the endpoint through request/precondition/source/commit/failure/retry boundaries, not only happy-path DTO shape.

A task cannot mark an owned API accepted while its ST row is untested or contradicted.


## 21. Cross-API scenario audit

Cross-operation acceptance uses:

```text
S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md
SCN-001～015
```

Each SCN has exactly one final evidence owner.

Task acceptance requires all SCNs assigned to that task to PASS.

UI-010 final acceptance additionally requires:

```text
SCN-001..015 PASS
missing = 0
duplicate owner = 0
```

SCN tests must record the revision/lastOperation/latest/journal/cursor state transitions, not only final HTTP status.

Key cross-operation invariants include:

- requestId namespace is session-global across all mutation endpoints
- running/completed journal is not evicted before UiSession/process end
- K=0 partial_failure may change lastOperationRequestId without uiRevision change
- uiRevision alone is not a full UiReadSnapshot cache key
- saved response replay precedes current lock/revision/resource re-evaluation


## 22. S01-008 accepted pre-binding — historical/supplemental evidence lane

`S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md` is a **historical prebinding snapshot** created while Sprint 1 evidence horizon was S01-001..008.
Its `S01-009 clarified but pending` text describes that historical horizon only and is not current project status after Sprint 1 completion.

Use it only to reduce discovery work and preserve accepted provenance/candidate paths. It MUST NOT write normative DB status `matched` and MUST NOT replace final P04 binding against the UI-000 fixed repository baseline.

Historical evidence horizon:

```text
S01-001..008 implemented/accepted
S01-008 accepted commit = 7c47847
S01-009 was clarified but pending at snapshot creation time
```

Current project/predecessor status is resolved from latest `PROJECT_ROADMAP.md`, P00 evidence, and the fixed repository at UI-000 start.


## 23. Accepted-commit repo physical binding — supplemental immutable evidence only

The following artifacts remain useful as a **supplemental immutable-commit evidence collector**:

```text
S1_5_REPO_PHYSICAL_BINDING_AUDIT_0.1.0.md
audit-s1-5-repo-bindings.mjs
audit-s1-5-repo-bindings.ps1
S1_5_CURSOR_UI000_REPO_BINDING_TASK_0.1.0.md
```

They read immutable Git objects for historical accepted implementation anchors:

```text
S01-008 accepted commit = 7c47847
S01-007 accepted commit = a39e476
```

using `git show` / `git grep`, without checkout/reset/stash/worktree changes.

The runner only collects machine candidate evidence and MUST keep:

```text
normativeMatchedClaimed = 0
```

**Final real UI-000 P04 must not bind solely against 7c47847.**
After T01/T02/T03-A and required T03-B predecessors are closed, P00 fixes the repository baseline. P04 binds every DB-001..022 row against that final fixed repository state and records the actual source commit/path/type/test evidence.

The 7c47847 evidence may be reused only when current-baseline inspection proves the relevant contract/path is unchanged; otherwise it is candidate/provenance evidence only.
DB-003/019 and any T01-affected runtime/hash/checkpoint rows necessarily use post-T01 accepted/current baseline evidence.

## 24. Long-run Historical architecture compatibility

Normative architecture source:

```text
S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md
S1_5_LONG_RUN_HISTORICAL_COMPATIBILITY_AUDIT_0.1.0.md
S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md
HIST-001..106
HSC-001..062
```

Current UI-001～010 does **not** implement the archive subsystem. No new current API endpoint/schema is added solely for HIST.

All current tasks must preserve future compatibility:

- no deceased hard-delete / PersonId reuse
- no archive-all weekly loop/full-validation/deep-clone assumption
- no personCount contract requiring archive payload scan
- no mutable reverse-link truth inside immutable Historical Person
- no future historical corruption = mandatory whole-detail/tree failure assumption
- no missing/corrupted ancestry = not-related assumption
- no lossy mini-person as sole retained history
- no all-or-nothing historical storage framing that defeats partial reads
- no normal-load/hot-path fallback full-history scan requirement
- no traversal-budget exhaustion => not-related shortcut
- no in-place repair that mixes historical read generations
- no retention-expiry => corruption classification
- no wholesale weekly clone/validation of supporting historical prefixes
- no historical control-plane corruption => empty archive fallback
- no all-archive scan/ID reuse for normal PersonId allocation
- no stale cached-valid after content identity changes
- no retention-pruned Event/Result identity/sequence reuse
- no old-generation early reclaim/permanent leak
- no cross-page Historical generation mixing
- no unchanged Current->Historical weekly re-resolution/full validation
- no weekly archive-wide hash/canonicalization flattening
- no storage-layout/cache-state influence on gameplay determinism
- no latest-catalog reinterpretation of versioned historical semantics
- no checkpoint publish before referenced history durability
- no live-save dangling via early durable-pin release
- no retained branch/fork root omission from historical GC
- no stale UI salvage cache as rule/ID-allocation authority
- no implicit repair during full audit
- no relationship temporal lifecycle loss/current-history mixing
- no partial-read-driven Historical node/order instability
- no unbounded Historical decode/decompression from corrupted metadata
- no duplicate logical ID last-write-wins
- no semantic provenance GC before references/migration complete
- no stale maintenance publish that loses concurrent Historical writes
- no mixed-boundary Current/Historical checkpoint capture
- no orphan file/segment presence as logical-history authority

Current strict 0.2.0 PersonDetail/relationship failures remain valid for the current monolithic source. Historical partial read requires a future versioned wire contract.

Before 1000-year support is accepted, create dedicated HIST implementation/performance tasks and materialize all HIST-001..106 / HSC-001..062 tests.

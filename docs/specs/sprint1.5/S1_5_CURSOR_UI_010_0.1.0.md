# Sprint 1.5 Cursor Instruction — UI-010

- Document ID: `S1.5-CURSOR-UI-010`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-010
Predecessor gate: UI-009 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

final acceptance/traceability/full quality/E2E/artifact auditのみ。production feature変更なし。

### Owned production APIs

none

### Forbidden forward work

production feature/fix。問題は元ownerへ戻す。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-001`, `DB-002`, `DB-003`, `DB-004`, `DB-005`, `DB-006`, `DB-007`, `DB-008`, `DB-009`, `DB-010`, `DB-011`, `DB-012`, `DB-013`, `DB-014`, `DB-015`, `DB-016`, `DB-017`, `DB-018`, `DB-019`, `DB-020`, `DB-021`, `DB-022`

Production code rule: このtaskではproduction feature/schema/endpointを追加しない。

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs: none (this task owns no production API).

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs:

```text
SCN-014
```

All assigned cross-operation state/retry/cursor/journal assertions must PASS.

## 3C. Long-run Historical non-regression

UI-010はarchive subsystem実装を要求しない。

ただしfinal auditで`S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`のcurrent-scope禁止事項が新production codeへ混入していないことを確認する。

最低確認:

```text
deceased hard-delete/reuse assumption = 0
weekly all-history scan/clone/full-validation dependency = 0
archive-all personCount scan requirement = 0
historical always-whole-error common primitive = 0
missing ancestry -> unrelated helper = 0
lossy historical-only record conversion = 0
checkpoint/history generation silent mixing = 0
rule-irrelevant corruption poisons kinship = 0
history-dependent incomplete write success = 0
post-death same-week mutation/RNG = 0
historical relationship lifecycle loss = 0
death archive lifetime-history full scan = 0
all-history payload RAM residency requirement = 0
weekly historical hash/canonicalization full-archive scan = 0
physical storage layout affects gameplay determinism = 0
historical semantic provenance silently replaced by latest catalog = 0
checkpoint published before referenced historical durability = 0
live-save generation pin released early = 0
retained fork/branch omitted from historical GC roots = 0
stale historical UI cache used as rule/ID authority = 0
full audit implicit canonical repair = 0
relationship temporal lifecycle/history loss = 0
partial-read Historical identity/order instability = 0
unbounded historical decode/decompression requirement = 0
duplicate logical ID last-write-wins = 0
referenced historical semantic provenance early-GC = 0
stale maintenance publish lost-update path = 0
checkpoint mixed Current/Historical boundary = 0
orphan segment file-presence resurrection = 0
```

report: `historical architecture non-regression: PASS`必須。

## 4. Final evidence-owned numbered contracts

Total: **8**

### BRIDGE

- `BRIDGE-068` 0.1.14 §4A / page presentation override
- `BRIDGE-099` 0.1.14 §3D / failure commitState / lastOperation
- `BRIDGE-101` 0.1.14 §3E / uiRevision capacity preflight
- `BRIDGE-102` 0.1.14 §3F / commitState/committedWeeks matrix
- `BRIDGE-106` 0.1.14 §4.1 / POST errorReference acceptance boundary
- `BRIDGE-107` 0.1.14 §3F.1A / GET commitState
- `BRIDGE-114` 0.1.14 §3F/§13E / atomic mutation response boundary
- `BRIDGE-115` 0.1.14 §3C.5 / isUpdating final response semantics

### TX

- none

### PAGE

- none

### DET

- none

### MIG

- none

### FIX

- none

### Acceptance ownership

- `ACC-014` canonical data read-only UI
- `ACC-015` CLI standalone regression
- `ACC-016` Sprint1 public contract non-breakage
- `ACC-017` full quality gate
- `ACC-020` duplicate update/idempotency
- `ACC-028` requestId replay/conflict
- `ACC-029` base 0.1.13 acceptance 29 (cross-cutting final evidence)
- `ACC-030` base 0.1.13 acceptance 30 (cross-cutting final evidence)
- `ACC-031` base 0.1.13 acceptance 31 (cross-cutting final evidence)
- `ACC-032` base 0.1.13 acceptance 32 (cross-cutting final evidence)
- `ACC-033` base 0.1.13 acceptance 33 (cross-cutting final evidence)
- `ACC-034` base 0.1.13 acceptance 34 (cross-cutting final evidence)
- `ACC-035` base 0.1.13 acceptance 35 (cross-cutting final evidence)
- `ACC-036` base 0.1.13 acceptance 36 (cross-cutting final evidence)
- `ACC-040` uiRevision mutation matrix
- `ACC-042` saved old response is not current UI state
- `ACC-043` base 0.1.13 acceptance 43 (cross-cutting final evidence)
- `ACC-044` base 0.1.13 acceptance 44 (cross-cutting final evidence)
- `ACC-045` base 0.1.13 acceptance 45 (cross-cutting final evidence)
- `ACC-046` base 0.1.13 acceptance 46 (cross-cutting final evidence)
- `ACC-047` base 0.1.13 acceptance 47 (cross-cutting final evidence)
- `ACC-048` base 0.1.13 acceptance 48 (cross-cutting final evidence)
- `ACC-049` base 0.1.13 acceptance 49 (cross-cutting final evidence)
- `ACC-050` base 0.1.13 acceptance 50 (cross-cutting final evidence)
- `ACC-053` cursor session/data/query/revision binding
- `ACC-055` browser storage not canonical source
- `ACC-056` unit/API/E2E/CLI quality
- `ACC-057` Chrome/Edge E2E
- `ACC-058` request journal/running-completed/weekly commit
- `ACC-061` accessibility
- `ACC-062` base 0.1.13 acceptance 62 (cross-cutting final evidence)
- `ACC-063` base 0.1.13 acceptance 63 (cross-cutting final evidence)
- `ACC-064` base 0.1.13 acceptance 64 (cross-cutting final evidence)
- `ACC-065` base 0.1.13 acceptance 65 (cross-cutting final evidence)
- `ACC-066` base 0.1.13 acceptance 66 (cross-cutting final evidence)
- `ACC-067` base 0.1.13 acceptance 67 (cross-cutting final evidence)
- `ACC-068` base 0.1.13 acceptance 68 (cross-cutting final evidence)
- `ACC-069` base 0.1.13 acceptance 69 (cross-cutting final evidence)
- `ACC-070` base 0.1.13 acceptance 70 (cross-cutting final evidence)
- `ACC-071` base 0.1.13 acceptance 71 (cross-cutting final evidence)
- `ACC-072` base 0.1.13 acceptance 72 (cross-cutting final evidence)
- `ACC-073` base 0.1.13 acceptance 73 (cross-cutting final evidence)
- `ACC-074` base 0.1.13 acceptance 74 (cross-cutting final evidence)
- `ACC-075` base 0.1.13 acceptance 75 (cross-cutting final evidence)
- `ACC-076` base 0.1.13 acceptance 76 (cross-cutting final evidence)
- `ACC-077` base 0.1.13 acceptance 77 (cross-cutting final evidence)
- `ACC-078` base 0.1.13 acceptance 78 (cross-cutting final evidence)
- `ACC-079` base 0.1.13 acceptance 79 (cross-cutting final evidence)
- `ACC-084` accepted POSTのfallback 500がcompleted journalへ保存され、同requestId再送時に同じstatus/body bytesを返す。
- `ACC-116` 全GETの失敗判定順が`security/session -> request syntax -> read snapshot -> lifecycle -> cursor authentication/schema/binding -> resource existence -> inter...
- `ACC-117` 0.1.13の旧画面文言「所属／総合ランク／単数師匠／候補参加不可reason」が0.2.0で再合成されず、Family/Lineage ID、3 rank、formal master/parent配列、direct TechniqueDefinition、POST pre-start val...
- `ACC-119` ApiError.validationが`CanonicalObject[]`の1-result-1-element原形配列としてDOMAIN_VALIDATION_FAILED/BATTLE_PRE_START_FAILUREだけに現れ、single object/null/empty ar...
- `ACC-120` pageable GETの`totalCount`がfilter後・cursor/page前の全一致件数で全page不変、nextCursorが返却page後に残件がある場合だけ非nullとなる。
- `ACC-121` `INVALID_REQUEST`の`fieldErrors`がcanonical request JSON Pointerと固定7種のFieldErrorCodeを使用し、field特定不能時はfieldErrors自体を省略、複数itemはfield/codeのstable順で返し、mes...
- `ACC-141` MIG-001～036の0.1.13旧contractがproduction DTO/query/validator/page codeへdeprecated alias・互換変換として残らず、UI-000では36件すべてのold-contract absence・ownerTask・nega...
- `ACC-149` lastOperation/lastOperationRequestIdがHTTP200 completed journal responseだけを正本とし、atomic start/reset/mock/replayのapplication-level failureはcommit前none...
- `ACC-151` revision増加mutationが0.1.13のlock/revision/lifecycle/resource/domain/pre-start validationを通過した後、最初のstate/RNG/ID mutation直前にmaxRevisionDeltaをsafe prefl...
- `ACC-152` ApiError commitStateが0.1.13のatomic commit境界へ同期し、start/reset/new mock/replayのapp-level INTERNAL_ERRORはnoneだけ、stepは0週commit=none・1..N-1週commit=partia...
- `ACC-156` POST INTERNAL_ERRORのerrorReferenceがaccepted-request境界前は未検証raw requestIdを使わず`server:`、境界後だけ`request:<validatedRequestId>`となり、pre-accept failureはjour...
- `ACC-157` 全read-only GET failureが常に`commitState=none`でcommittedWeeks/completedUiRevisionを持たず、新UiSession登録・error counter・read snapshot等をmutation commitと数えてpar...
- `ACC-164` start/reset/new mock/replayがsuccess DTO/schema/JSON bytesとnext session state/completed success journalをcommit前に全検証し1 atomic commitするため、application-...
- `ACC-165` valid sessionの新規error responseが0.1.13正本どおりresponse構築時の`updateControl!=null`からisUpdatingを決め、accepted POSTが自分のlock保持中に確定する422/500等は`isUpdating=true`、...
- `ACC-173` readiness -> consumerEvidence -> final owner implementedの三段階evidence lifecycleを全cross-cutting contractへ適用し、UI-010で全implementedを確認する。

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- 全consumerEvidence/owner evidenceをaggregate。missing evidenceをUI-010内でproduction fixしない

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- full npm check/wiki/static audit
- Chrome/Edge E2E
- 544 ownership/evidence coverage
- MIG/FIX/TX/PAGE/DET complete
- artifact/SHA/staged diff audit
- no production feature diff

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-071
FI-072
FI-073
FI-074
FI-075
FI-076
```

受入条件:

```text
required FI missing = 0
required FI FAIL = 0
```

各FIについてtest path / injection point / expected / actual / provider call count / state-RNG-ID evidenceをreportへ記録する。

## 7. STOP conditions

次のいずれかならproduction code変更前/追加変更前にSTOP:

- `spec_fix_required`: semantic/owner/acceptance/test expectationが矛盾または未定義
- `code_fix_required`: accepted upstream/predecessor codeがhigher-authority contract違反
- `dependency_blocker`: predecessor、required DB binding、UI-000 readiness evidenceが未成立
- `environment_blocker`: fixed repo、Node/npm/browser/tool/build環境不足で証明不能

STOP後に仮実装・alias・fallback・future endpoint追加で回避しない。


STOP exact4:

```text
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

## 8. No-forward-work assertions

```text
future owned API handler count = 0
future feature page count = 0
unplanned endpoint/schema count = 0
temporary compatibility alias count = 0
required-contract TODO/TBD/skip count = 0
```

## 9. Handoff

共通templateのfinal report fieldsを全件埋める。特に:

```text
対象タスク: UI-010
predecessor: UI-009 accepted
owned API IDs: none
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。

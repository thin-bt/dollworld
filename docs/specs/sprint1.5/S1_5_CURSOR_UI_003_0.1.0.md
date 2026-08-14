# Sprint 1.5 Cursor Instruction — UI-003

- Document ID: `S1.5-CURSOR-UI-003`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- RunInitializationSnapshot: `0.2.0`（`initialWeeklyTrainingSidecarSnapshot` 必須。resetは保存payloadのみ）
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-003
Predecessor gate: UI-002 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-003～006、start/step/reset/simulation、WorldSummary、week commit、ValidationStore integration。

### Owned production APIs

- `API-003` POST `/api/s1_5/simulation/start`
- `API-004` POST `/api/s1_5/simulation/step`
- `API-005` POST `/api/s1_5/simulation/reset`
- `API-006` GET `/api/s1_5/simulation`

### Forbidden forward work

People/PersonDetail/Mock/Event/Validation route。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-002`, `DB-003`, `DB-005`, `DB-013`, `DB-020`

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-003
ST-004
ST-005
ST-006
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs:

```text
SCN-002
SCN-003
SCN-004
SCN-015
```

All assigned cross-operation state/retry/cursor/journal assertions must PASS.

## 3C. Long-run personCount compatibility

- Current monolithic Sprint1 storeではcanonical Person collection countを使用してよい。
- DTO/API契約として「全Person payloadを毎GET materialize/scanしなければpersonCountを出せない」と固定しない。
- 将来Historical partitionではvalidated maintained count/PersonDirectory countへ置換可能でなければならない。
- Historical archive subsystem自体はUI-003 scope外。

## 4. Final evidence-owned numbered contracts

Total: **60**

### BRIDGE

- `BRIDGE-001` start API
- `BRIDGE-003` SimulationIdentity
- `BRIDGE-004` RunRuleSnapshot
- `BRIDGE-005` WorldState read
- `BRIDGE-006` one-week progression
- `BRIDGE-007` multi-week progression
- `BRIDGE-010` calendar
- `BRIDGE-011` year-start outer transaction
- `BRIDGE-017` CommittedValidationViewStore
- `BRIDGE-034` year-start manifest
- `BRIDGE-035` year-start runtime/receipt
- `BRIDGE-036` CAL-SCHEMA-MAP
- `BRIDGE-038` RunInitializationSnapshot
- `BRIDGE-051` 0.1.14 §14 / WorldDate.absoluteWeek -> WorldSummaryView.elapsedWeeks
- `BRIDGE-057` 0.1.14 §6A / WorldSummaryView source map
- `BRIDGE-058` 0.1.14 §6B / failedWeek.validation failure collection
- `BRIDGE-079` 0.1.14 §6H / SimulationMutationView complete type
- `BRIDGE-108` 0.1.14 §6J / start/reset state scope
- `BRIDGE-110` 0.1.14 §5B / UiReadSnapshot 0.2.0
- `BRIDGE-112` 0.1.14 §6J.2 / start empty/ready lifecycle
- `BRIDGE-119` 0.1.14 §6M / ValidationStore occurrence lifecycle

### TX

- `TX-001` start成功
- `TX-002` start commit前失敗
- `TX-003` 1週domain validation失敗
- `TX-004` 複数週第1週domain failure
- `TX-005` step第1週unexpected failure
- `TX-006` 複数週途中domain failure
- `TX-007` 複数週途中unexpected failure
- `TX-008` 全週commit後response failure
- `TX-009` reset成功
- `TX-014` updating GET
- `TX-015` start/reset後old requestId replay
- `TX-016` pre-accept rejection
- `TX-022` errorReference / fallback GET
- `TX-027` WorldSummary source / commit generation
- `TX-028` failedWeek validation noncommit collection
- `TX-047` server errorReference allocator lifecycle
- `TX-050` SimulationMutationView complete invariants
- `TX-079` start/reset state-scope matrix
- `TX-081` UiReadSnapshot 0.2.0 completeness
- `TX-083` start empty/ready lifecycle
- `TX-090` validationOccurrence lifecycle

### PAGE

- none

### DET

- none

### MIG

- `MIG-032` SimulationMutationViewを旧型+差分で再合成

### FIX

- `FIX-005` 1/4/48/480 weeks
- `FIX-006` year-boundary transaction/overflow
- `FIX-009` precommit DTO failure
- `FIX-010` step none/partial/complete failure
- `FIX-012` year-start manifest mixed statuses
- `FIX-013` year-start receipt/provenance integrity
- `FIX-014` calendar/manifest/schema identity mismatch
- `FIX-017` year-start processor/age-career boundaries
- `FIX-019` reset after preset/source change
- `FIX-030` WorldDate.absoluteWeek 0/1/47/48/479/480 + year boundary
- `FIX-037` 同一run identityで2 committed snapshots + start後にpreset registry sourceだけ変更したfixture
- `FIX-038` partial failure committedWeeks=0/1/N。failed-week draftがlast committed stateと異なるfixture
- `FIX-039` failedWeek public validation collectionにgeneric success/failure混在。CommittedValidationViewStore非変更fixture
- `FIX-062` CSPRNG startup failure / errorCounter 1,2,3 / serialization gap / MAX_SAFE_INTEGER-1→fatal exhaustion
- `FIX-065` SimulationMutation exact14 start/reset/step1/stepN/partial0/partialN + every cross-field tamper
- `FIX-095` UiReadSnapshot exact7 old/new reset generations + missing run-init + current-run-init mixed read + post-snapshot source mutation
- `FIX-104` ValidationStore init0/1/3 + weekly0/2 + tentative rollback + multi-week partial failed validation + reset old max100 -> new occurrence1 + old cursor

### Acceptance ownership

- `ACC-001` browser start
- `ACC-002` week progression inputs
- `ACC-003` WorldDate/elapsed display
- `ACC-022` start/reset old-state isolation
- `ACC-037` RunInitializationSnapshot/start config
- `ACC-041` start/reset atomic init failure/success
- `ACC-060` WorldSummary identity/version display
- `ACC-097` `WorldSummaryView.elapsedWeeks`がcanonical `WorldDate.absoluteWeek`から直接取得される。
- `ACC-105` WorldSummary run固定/current fieldsを同一committed generationから取得。personCountはlogical active+historical全Person件数で、Historical partition後もnormal GETでarchive全payload scanを要求しない。
- `ACC-106` partial_failureの`failedWeek.validation`が失敗週public facadeの非commit正規validation collectionを元順のまま保持し、CommittedValidationViewStoreやStableErrorCode等から再構成...
- `ACC-129` SimulationMutationView 0.2.0がexact14 keyで、start/reset・step success・step partialのrevision/weeks/failedWeek/count/summary相関をstrict検証し、partial failure...
- `ACC-158` start/resetがworld-scoped状態とsession-scoped状態を分離し、start成功ではnew RunInitializationSnapshotを確定する一方、reset成功では保存済みRunInitializationSnapshotのcanonical valu...
- `ACC-160` UiReadSnapshotが0.2.0 exact7へ上書きされ`runInitializationSnapshot`を必須保持し、更新中GETのWorldSummary run固定fieldをcurrent sessionへ逃げずoperationStartReadSnapshot内の同一...
- `ACC-162` `POST /simulation/start`が0.1.13正本どおりempty/readyの両方で許可され、ready-startではaccepted start requestからnew world/new RunInitializationSnapshot/new-run valida...
- `ACC-169` CommittedValidationViewStoreのvalidationOccurrenceがstart/reset成功時に初期化ValidationResult元順で1から欠番なく振り直され、週commitだけ`nextValidationOccurrence`から連番を消費し、rol...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- TX-070/072/073/077/078/085/086のstart/step/reset/API-006 branch
- BRIDGE-099/101/102/106/107/114/115の同branch
- ACC-149/151/152/156のmutation branch

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- start empty/ready
- 1/4/48/multi-week step
- reset exact snapshot semantics
- none/partial/complete step failure
- WorldSummary/ValidationStore（current monolithicではPerson collection count、将来Historical partitionではmaintained logical countへ置換可能な境界）
- updating GET/read snapshot
- request replay

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-021
FI-022
FI-023
FI-024
FI-025
FI-026
FI-027
FI-028
FI-029
FI-030
FI-031
FI-032
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
対象タスク: UI-003
predecessor: UI-002 accepted
owned API IDs: API-003, API-004, API-005, API-006
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。

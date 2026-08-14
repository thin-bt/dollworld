# Sprint 1.5 Cursor Instruction — UI-008

- Document ID: `S1.5-CURSOR-UI-008`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-008
Predecessor gate: UI-007 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-009/010 Events/Validation、common GET/paging/cursor matrixの最終集約。

### Owned production APIs

- `API-009` GET `/api/s1_5/events`
- `API-010` GET `/api/s1_5/validation-results`

### Forbidden forward work

determinism専用production bypass、new endpoint/schema。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-012`, `DB-013`

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-009
ST-010
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs:

```text
SCN-011
```

All assigned cross-operation state/retry/cursor/journal assertions must PASS.

## 4. Final evidence-owned numbered contracts

Total: **69**

### BRIDGE

- `BRIDGE-012` EventEnvelope/year-start provenance
- `BRIDGE-013` Event store/query
- `BRIDGE-014` event person map
- `BRIDGE-015` eventGroup
- `BRIDGE-016` ValidationResult
- `BRIDGE-048` 0.1.14 §10 / EventEnvelope.entities.personIds
- `BRIDGE-055` 0.1.14 §10A / generic ValidationResult -> ValidationResultViewItem / ValidationQuery
- `BRIDGE-066` 0.1.14 §10B / Event eventGroup query
- `BRIDGE-067` 0.1.14 §5A / GET error precedence
- `BRIDGE-070` 0.1.14 §3A / ApiError.validation[]
- `BRIDGE-071` 0.1.14 §3B / INVALID_REQUEST fieldErrors
- `BRIDGE-072` 0.1.14 §10D / CanonicalGetQuery 0.2.0 exact union
- `BRIDGE-082` 0.1.14 §10E / GET /events item/data DTO
- `BRIDGE-083` 0.1.14 §10A.2 / Validation list complete DTO
- `BRIDGE-084` 0.1.14 §10F / paged success data
- `BRIDGE-087` 0.1.14 §10G / cursor dataIdentity matrix
- `BRIDGE-109` 0.1.14 §6K / reset cursor/journal lifetime
- `BRIDGE-113` 0.1.14 §6L / ready-start cursor/journal

### TX

- `TX-026` ValidationResult generic view / status filter
- `TX-036` Event eventGroup exact semantics
- `TX-037` GET error precedence collision matrix
- `TX-038` 0.2.0 page presentation override
- `TX-041` pageable totalCount / nextCursor
- `TX-042` INVALID_REQUEST fieldErrors exact contract
- `TX-043` CanonicalGetQuery 0.2.0
- `TX-053` EventList canonical EventEnvelope
- `TX-054` Validation list complete DTO
- `TX-055` pageable success data exact shapes
- `TX-056` API envelope complete types
- `TX-058` cursor dataIdentity compatibility vs stale
- `TX-078` GET failure commitState always none
- `TX-080` reset old cursor / journal behavior
- `TX-084` ready-start old cursor / journal

### PAGE

- `PAGE-003` events sequence cursor
- `PAGE-004` validation occurrence cursor
- `PAGE-006` canonical query default equivalence
- `PAGE-007` common totalCount/nextCursor
- `PAGE-008` CanonicalGetQuery exact union
- `PAGE-009` dataIdentity compatibility/stale
- `PAGE-011` reset cursor invalidation
- `PAGE-012` ready-start cursor invalidation

### DET

- none

### MIG

- `MIG-014` Validation query code
- `MIG-015` Validation共通表示のerror code/sourceProcessor/canContinue
- `MIG-016` Event person filterをeventType/payload pathで決める余地
- `MIG-017` EVENT-PERSON-MAPをfilter rule表として使用
- `MIG-025` fieldErrors.field/code自由string
- `MIG-026` page totalCountのcursor後件数解釈余地
- `MIG-027` CanonicalGetQueryの旧validation code member
- `MIG-033` page wrapper fieldの曖昧さ
- `MIG-034` Event一覧を縮約DTOにできる余地

### FIX

- `FIX-007` list sizes 0/50/51/200/201/5000
- `FIX-015` paging omitted vs explicit defaults
- `FIX-020` unseen event/validation filters
- `FIX-029` EventEnvelope.entities.personIds filter。payloadに別PersonId文字列を含むnegative caseも含む
- `FIX-034` generic ValidationResult success/failure。failureはpath/message必須、actual/expectedあり/なし双方
- `FIX-051` training.* + technique learning/mastery混在event stream + group変更old cursor fixture
- `FIX-052` GET collision: no-session/malformed/empty/missing/stale/corrupt/updating snapshot combinations
- `FIX-053` old page label expectations vs 0.2.0 Person/Technique/Mock direct-field presentation
- `FIX-056` paging 0/exact-limit/limit+1/multi-page/filter totalCount fixtures
- `FIX-057` fieldErrors: body/query/path各code、RFC6901 escape、複数stable order、fieldless malformed JSON/body-limit
- `FIX-058` CanonicalGetQuery 5 variants、default omitted/explicit pair、old validation code query/cursor、raw cursor exclusion
- `FIX-068` committed EventEnvelope11 + failed draft + mock candidates + invalid event/payload/sequence tamper
- `FIX-069` Validation success/failure multi-issue + raw actual/expected + reorder/dedupe/path-message mismatch tamper
- `FIX-070` People/Candidates/Events/Validation exact3 + BattleLog exact4 resultUiRevision + extra-wrapper-field injection + presets no-cursor shape
- `FIX-071` success/failure envelope all optional presence combinations + commitState/errorReference/revision tamper
- `FIX-073` five dataIdentity valid cursors + signed wrong prefix/kind/endpoint + old simulation/revision/query/schema cases
- `FIX-092` every GET failure category + session-create pre-store + server ref counter + stale cursor/resource/internal variants
- `FIX-094` reset-old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal replay + new-request contrast
- `FIX-098` ready-start old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal exact replay + new requestId contrast

### Acceptance ownership

- `ACC-010` events/ValidationResult
- `ACC-093` `GET /events?personId=`が`EventEnvelope.entities.personIds`だけを人物filter正本として使用する。
- `ACC-102` ValidationResult一覧がgeneric `ok/issues[path,message]`だけを共通意味論として使用し、存在しない共通`code/sourceProcessor/canContinue`を発明せず、0.2.0では`status=success/failure`だけ...
- `ACC-115` Event `eventGroup`が`training.` prefixと`technique.learning_progressed/technique.acquired`のexact規則へ固定され、masteryをtechnique_learningへ混入せず、group変更時の旧cur...
- `ACC-122` CanonicalGetQuery 0.2.0が5種のexact discriminated unionとして固定され、raw cursorを含まず、ValidationQueryが`kind/status/sortKey/sortOrder/limit`を全部materializeし、旧`c...
- `ACC-132` `GET /events`のitemが正規validated EventEnvelopeの11 top-level fieldを追加削除なしで直接返し、dataがexact3 key、sourceがcommitted Event Streamだけで、invalid event・draft/ca...
- `ACC-133` `GET /validation-results`のissue/item/list dataがexact2/5/3 keyで、status/issueCount/issuesをraw generic ValidationResultとindex単位で完全cross-referenceし、iss...
- `ACC-134` pageable success dataはPeople/Candidates/Events/Validationがexact3 `{items,totalCount,nextCursor}`、BattleLogだけ0.1.13正本どおり`resultUiRevision`を加えたexact4...
- `ACC-137` Cursor dataIdentityが5 endpointのexact matrixへ固定され、署名済みでもendpoint/query.kind/prefix不適合は400、current-compatible shapeのsimulationId/resultUiRevision/que...
- `ACC-159` reset前の正しく署名済みcollection/mock-log cursorがreset後にHMAC invalidではなく、少なくともold `uiRevision`またはold mock result identityとのbinding mismatchとして409 STALE_CUR...
- `ACC-163` ready-start前の正しく署名済みcollection/mock-log cursorがstart成功後に少なくともold uiRevision/result identity mismatchで409 STALE_CURSORとなり、old journalは保持されsame reque...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- People/Candidate/BattleLogの既存consumerEvidenceを含めcommon GET/paging/cursor matrixをaggregate

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- EventEnvelope exact11
- personId/eventGroup filter
- Validation exact mapping
- common totalCount/nextCursor/query/dataIdentity matrix
- reset/ready-start old cursor behavior
- GET error precedence

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-062
FI-063
FI-064
FI-065
FI-066
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
対象タスク: UI-008
predecessor: UI-007 accepted
owned API IDs: API-009, API-010
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。

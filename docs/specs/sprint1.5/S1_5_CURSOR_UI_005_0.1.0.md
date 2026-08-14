# Sprint 1.5 Cursor Instruction — UI-005

- Document ID: `S1.5-CURSOR-UI-005`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-005
Predecessor gate: UI-004 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-008 PersonDetail、stats/aptitudes/techniques/statHistory/trainingHistory。DB-012 internal Event Stream read可、Events route実装禁止。

### Owned production APIs

- `API-008` GET `/api/s1_5/people/:personId`

### Forbidden forward work

API-009 Event route、mock execution、battle log route。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-004`, `DB-006`, `DB-007`, `DB-009`, `DB-010`, `DB-011`, `DB-012`, `DB-021`, `DB-022`

History source rule:

- DB-012 committed Event Stream public read sourceをinternal adapterから使用してよい。
- `GET /api/s1_5/events`のhandler/DTO/UIへ依存しない。
- API-009を先行実装したらforward-work violation。

Long-run Historical boundary:

- UI-005でHistorical archive/store/quarantine/partial-read schemaを先行実装しない。
- current 0.2.0 PersonDetail strict contractはcurrent Sprint1 monolithic sourceに限定。
- 将来Historical readerがbroken ancestorをwhole-detail 500へ固定する設計を新たに共通primitiveへ埋め込まない。
- PersonId hard-delete/reuse、archive全scan/cloneを前提にするhelperを追加しない。

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-008
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs: none.

## 4. Final evidence-owned numbered contracts

Total: **60**

### BRIDGE

- `BRIDGE-043` 0.1.14 §6 / Person family/lineage/rank/stats/aptitudes/temporaryCondition source
- `BRIDGE-044` 0.1.14 §7 / parent/master canonical relationship型・counterpart field
- `BRIDGE-045` 0.1.14 §8 / TechniqueDefinition / PersonTechniqueState exact mapping
- `BRIDGE-053` 0.1.14 §9A / committed weekly-training EventEnvelope群 -> TrainingHistoryItemView
- `BRIDGE-062` 0.1.14 §6C / PersonDetail.statHistory / ABILITY-MUTATION-MAP
- `BRIDGE-065` 0.1.14 §6D / Person.sprint1State -> currentMental/focus/techniques/count
- `BRIDGE-069` 0.1.14 §8.3 / TechniqueDefinitionView exact key set
- `BRIDGE-073` 0.1.14 §6E / PersonDetail qualifiedMaster
- `BRIDGE-075` 0.1.14 §6F / Person wire DTO complete types
- `BRIDGE-078` 0.1.14 §6G / temporaryCondition/currentMental ranges
- `BRIDGE-080` 0.1.14 §8.2 / TechniqueView state exact semantics
- `BRIDGE-081` 0.1.14 §8A / TechniqueDefinition value contracts
- `BRIDGE-089` 0.1.14 §1C.7/§9A / training.action_selected payload binding
- `BRIDGE-092` 0.1.14 §6I / Person age source
- `BRIDGE-093` 0.1.14 §7 / §1C.8 / relationship display / DB-022
- `BRIDGE-098` 0.1.14 §8B / Person techniques array/focus
- `BRIDGE-103` 0.1.14 §9A.2A / DB-011 / TrainingHistory producer membership

### TX

- `TX-024` TrainingHistory aggregation
- `TX-032` Person statHistory exact chain
- `TX-035` Person Sprint1PersonState direct view
- `TX-039` TechniqueDefinition exact 31-key wire
- `TX-044` PersonDetail qualifiedMaster
- `TX-046` PersonList/Detail 0.2.0 complete DTO
- `TX-049` Person temporaryCondition / currentMental boundaries
- `TX-051` TechniqueView exact state semantics
- `TX-052` TechniqueDefinition exact value contracts
- `TX-060` TrainingHistory anchor target/forced binding
- `TX-063` Person age source consistency
- `TX-064` relationship all-record observation
- `TX-069` Person techniques order / focus
- `TX-074` TrainingHistory sourceProcessor isolation

### PAGE

- none

### DET

- none

### MIG

- `MIG-003` Person affiliationLabels
- `MIG-004` Person overallRank
- `MIG-005` PersonDetail singular mentorPersonId
- `MIG-006` TrainingHistory instructorPersonId
- `MIG-007` Technique usageConditions JsonValue
- `MIG-008` Technique hitParameters JsonValue
- `MIG-009` Technique consumptionAndUseLimit JsonValue
- `MIG-022` PersonDetail statHistory:nullを正常fallbackにできる余地
- `MIG-023` trainingHistory.available=falseで履歴source不足を隠す余地
- `MIG-031` PersonList/PersonDetailを旧型+差分で再合成

### FIX

- `FIX-018` living/deceased lists/detail/filter
- `FIX-026` child/trainee/living active/deceased active/living retired/deceased retired rank variants
- `FIX-027` familyId / lineageId / temporaryCondition / parent/master relationship variants
- `FIX-028` current TechniqueDefinition全field + sparse PersonTechniqueState
- `FIX-032` TrainingHistory正常7行動fixture + action_selected欠落/重複・event順序tamper
- `FIX-046` statHistory no-growth/current-week/W47/W48/>48weekの正規surface chain
- `FIX-047` statHistory before-after chain/final-current/negative-delta tamper
- `FIX-050` active/inactive/deceased Sprint1PersonState + missing state/focus catalog/duplicate technique tamper
- `FIX-054` TechniqueDefinition exact31 + missing one key + extra one key + upstream-key-drift simulation
- `FIX-059` qualifiedMaster: child/trainee/active false、retired true/false、living/deceased、missing/type/career tamper
- `FIX-061` PersonList exact16 / PersonDetail exact25 + missing/extra/undefined/old-field injection + same-revision pair
- `FIX-064` temporaryCondition 0/100/±20 boundaries + decimal/out-of-range + currentMental spirit0/50/100 + mixed-generation
- `FIX-066` TechniqueView exact9 + progress 0/cap/cap+1 + mastery 0/10000/10001 + acquired null/non-null + catalog mismatch
- `FIX-067` TechniqueDefinition all fixed enum/range boundaries + actionTraits 5 + canonical arrays + identity/literal drift
- `FIX-074` StableErrorCode exact-set add/remove/rename + training action four target correlations + forcedReason known/unknown union
- `FIX-077` living currentAge exact/mismatch + update old/new generation + deceased age null/death fields + three-view consistency
- `FIX-078` parent 0/1/2 + master 0/1/multiple + status metadata + broken ref/duplicate/cycle + qualifiedMaster cross-ref
- `FIX-083` catalog A/B/C + held B/C reordered + duplicate B + focus valid/dangling/catalog mismatch + acquired/learning count
- `FIX-088` one week with DB-011 training events + foreign processor technique/stat events + sourceProcessor tamper/duplicate/no-anchor

### Acceptance ownership

- `ACC-004` people list/detail
- `ACC-005` stats/aptitudes/techniques
- `ACC-006` training growth/learning display
- `ACC-023` 48-week person history
- `ACC-087` Person list/detailが`familyId`、`lineageId`、`currentRank`、`highestRank`、`retirementRank`をcanonical Personから直接mapし、`affiliationLabels`/`overallRank`を作...
- `ACC-088` abilities/aptitudesの表示・sort/filterが`surfaceValue`だけを使い、genetic valuesを混ぜない。
- `ACC-089` Person detailで`fatigue/injury/condition/confidence`がcanonical temporaryConditionから直接確認できる。
- `ACC-090` parent/master表示が全canonical relationshipから配列で導出され、単数mentorを推測しない。
- `ACC-091` TechniqueViewがPersonTechniqueStateとTechniqueDefinitionの直接mappingで構成され、`usageConditions`等のUI独自JsonValue合成を行わない。
- `ACC-092` 正規historical instructor PersonIdが存在しない場合、修行履歴へ現在の師匠を後付けしない。
- `ACC-100` TrainingHistoryItemViewが正規`training.action_selected`を週次anchorとしてevent列から機械的に構築され、0.1.13既存の`max(0,W-47)..W`の48週窓を`absoluteWeek desc`で返し、anchor欠落・重複・...
- `ACC-111` PersonDetail.statHistoryがcomplete ability mutation mapとrun全期間の`training.stat_growth_applied` chainからexactに算出され、ready正常時はobject必須、event欠落・chain不整合をn...
- `ACC-114` PersonDetailの`currentMental`、`learningFocusTechniqueId`、`techniques`および一覧の`learnedTechniqueCount`が同じvalidated `Person.sprint1State`を唯一sourceとして相互一致...
- `ACC-118` TechniqueDefinitionView 0.2.0がcurrent productionの`TECHNIQUE_DEFINITION_KEYS`とexact 31-key一致し、key driftをadapterで吸収せず仕様/API版上げへ戻す。
- `ACC-123` PersonDetailViewがcanonical `Person.qualifiedMaster`を必須booleanとして直接表示し、rank/formal-master関係/event等から再計算せず、career不変条件違反を補正せず500として検出する。
- `ACC-125` PersonListItemView/PersonDetailView 0.2.0が§6Fの完全型・exact key setへ統一され、ready正常PersonDetailではstatHistory非nullかつtrainingHistory.available=true、旧0.1.13 ...
- `ACC-128` PersonDetailのtemporaryConditionがfatigue/injury 0..100・condition/confidence -20..20のinteger exact rangeを持ち、currentMentalが同一snapshotの`0..50+spirit.su...
- `ACC-130` TechniqueView 0.2.0がexact9 keyで、learning progressを`0..definition.learningProgressRequired*10`、masteryを0..10000のintegerとして正規state+catalog semantic v...
- `ACC-131` TechniqueDefinitionViewがcurrent productionで確定済みのcategory/tier/consumption/priority/BattleRange、0..100系値域、learningProgressRequired 1..10000、mentalCo...
- `ACC-139` TrainingHistory anchorのtarget null相関がtrain_stat / learn_technique / practice_technique / restごとに固定され、forced/forcedReasonはvalidated upstream payload...
- `ACC-142` living PersonのageがPeople list/PersonDetail/MockCandidateの全てで保存`Person.currentAge`直結となり、`computeCurrentAge(worldDate.year,birthYear)`は同一snapshotのval...
- `ACC-143` PersonDetailのparentPersonIds/formalMasterPersonIdsがcurrent canonical relationship collectionの全対応recordを正本とし、active/current/first/latest等のUI独自filter...
- `ACC-148` PersonDetail.techniquesが保持PersonTechniqueStateだけをTechniqueId canonical昇順で返し、duplicate/synthetic catalog entryを禁止し、non-null learningFocusTechniqueId...
- `ACC-153` TrainingHistoryのgroup membershipがperson/weekだけでなくDB-011 weekly training `sourceProcessor`一致を必須とし、同週の別Processor由来技/能力eventをstatChanges/learnedTechni...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- TX-078/BRIDGE-107のPersonDetail GET branch
- DB-012 Event Stream sourceを内部readするがAPI-009 routeは作らない

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- Person exact DTOs
- TechniqueDefinition/TechniqueView
- statHistory 48-week chain
- trainingHistory aggregation/sourceProcessor
- relationships/age/temp condition
- DB-012 direct source without Event API route

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-039
FI-040
FI-041
FI-042
FI-043
FI-044
FI-045
FI-046
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
対象タスク: UI-005
predecessor: UI-004 accepted
owned API IDs: API-008
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。

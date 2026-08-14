# Sprint 1.5 簡易シミュレーション確認画面仕様
## S1.5-SPEC-0.1.15 規範追補

- 文書種別: Sprint 1.5 ミニ仕様・規範追補
- 対象プロジェクト: dollworld
- 基礎正本: `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` / `S1.5-SPEC-0.1.13`
- 先行追補: `S1.5-SPEC-0.1.14`（凍結履歴・変更しない）
- 追補仕様版: `S1.5-SPEC-0.1.15`
- 状態: 実装前仕様監査修正版
- 実装時期: Sprint 1完了後、Sprint 2実装着手前
- 本追補の目的: S1.5-SPEC-0.1.14を継承しつつ、RunInitializationSnapshotへInitialWeeklyTrainingSidecarSnapshot payloadを追加してACC-158 reset再構築を閉じる


## 0A. 0.1.13 → 0.1.15 破壊的変更インデックス

本追補は `S1.5-SPEC-0.1.14` の MIG-001～036 を継承し、0.1.15で MIG-037 を追加する。0.1.14追補本文は歴史正本として維持し、本ファイルをcurrent amendmentとする。

0.1.13本文は基礎正本として残るため、実装者が旧記述をcurrent contractと誤認しないよう、0.1.14で**明示的に廃止・置換したもの**をこの表へ集約する。

この表は索引であり、詳細意味論は参照節が正本。

| MIG ID | 0.1.13旧契約 | 0.1.14 current契約 | 正本節 |
|---|---|---|---|
| MIG-001 | API `apiSchemaVersion="0.1.0"` | 全success/failure `0.2.0` | §1A, §3C |
| MIG-002 | CursorPayload 0.1.0 | CursorPayload 0.2.0 / old valid cursorはSTALE | §1A, §10D, §10G |
| MIG-003 | Person `affiliationLabels` | `familyId` / `lineageId` direct | §6, §6F |
| MIG-004 | Person `overallRank` | `currentRank/highestRank/retirementRank` | §6, §6F |
| MIG-005 | PersonDetail singular `mentorPersonId` | `formalMasterPersonIds[]` | §7, §6F |
| MIG-006 | TrainingHistory `instructorPersonId` | field削除。historical sourceなし | §9, §9A |
| MIG-007 | Technique `usageConditions` JsonValue | TechniqueDefinitionView direct31 | §8, §8A |
| MIG-008 | Technique `hitParameters` JsonValue | TechniqueDefinitionView direct31 | §8, §8A |
| MIG-009 | Technique `consumptionAndUseLimit` JsonValue | TechniqueDefinitionView direct31 | §8, §8A |
| MIG-010 | Battle log sourceを`detailedLog.length`相当で扱う余地 | `detailedLog.actionLogs`だけをpaging source | §11 |
| MIG-011 | BattleLog `actionKind` | `requestedAction` + `resolvedAction` | §12 |
| MIG-012 | BattleLog `rngDisplay` | 削除。正規field + sourceLogEntry | §12 |
| MIG-013 | BattleLog `reasonText` | 削除。replacement/failure source direct | §12 |
| MIG-014 | Validation query `code` | `status=success|failure` | §10A, §10D |
| MIG-015 | Validation共通表示のerror code/sourceProcessor/canContinue | generic `ok/issues[path,message]` + raw result | §10A |
| MIG-016 | Event person filterをeventType/payload pathで決める余地 | `entities.personIds.includes(P)`だけ | §10 |
| MIG-017 | EVENT-PERSON-MAPをfilter rule表として使用 | producer entities cross-reference監査表 | §10, checklist |
| MIG-018 | Mock candidateで参加不可reasonを表示する余地 | GETはeligible-only exact4。reasonなし | §7A, §4A |
| MIG-019 | Mock `judgeDecision:boolean` | `endReasonIsJudgeDecision` + `judgementApplied` + `judgeScore` | §13B, §13E |
| MIG-020 | Mock failure `{code,message}` | finalState.failure direct5 field | §13C |
| MIG-021 | Mock final RNGをfinalState等から推測する余地 | BattleResult.finalRngState direct | §13B, §13C |
| MIG-022 | PersonDetail `statHistory:null`を正常fallbackにできる余地 | ready 200では必須object、source failureは500 | §6C, §6F |
| MIG-023 | `trainingHistory.available=false`で履歴source不足を隠す余地 | ready 200では`available=true`固定 | §9A, §6F |
| MIG-024 | Validation `error.validation`形の曖昧さ | `CanonicalObject[]` 1-result-1-element | §3A |
| MIG-025 | `fieldErrors.field/code`自由string | RFC6901 pointer + fixed7 code | §3B |
| MIG-026 | page `totalCount`のcursor後件数解釈余地 | filter後/page前の全一致件数 | §10C |
| MIG-027 | CanonicalGetQueryの旧validation `code` member | 0.2.0 exact union / validation `status` | §10D |
| MIG-028 | Mock replay checkpoint取得時点の曖昧さ | battle start前checkpointを保存しreplayでexact継承 | §13D |
| MIG-029 | Mock eventCandidates件数/orderの曖昧さ | exact `[battle.started,battle.finished]` 2件 | §13D |
| MIG-030 | `MockBattleView`旧field群を差分合成 | 0.2.0 exact34 complete type。BattleResult全文はwireへ追加せず専用log paging維持 | §13C, §13E |
| MIG-031 | `PersonList/PersonDetail`を旧型+差分で再合成 | exact16 / exact25 complete types | §6F |
| MIG-032 | `SimulationMutationView`を旧型+差分で再合成 | exact14 complete type | §6H |
| MIG-033 | page wrapper fieldの曖昧さ | 一般4一覧exact3、BattleLogは正本`resultUiRevision`付きexact4 | §10F |
| MIG-034 | Event一覧を縮約DTOにできる余地 | canonical EventEnvelope exact11 direct | §10E |
| MIG-035 | API envelopeを旧0.1.0 shapeのまま一部拡張 | success exact5 / failure exact6 / ApiError matrix | §3C |
| MIG-036 | `UiReadSnapshot 0.1.0`がRunInitializationSnapshotを保持しない | `UiReadSnapshot 0.2.0` exact7へ上書きしrunInitializationSnapshotを必須追加 | §5B |
| MIG-037 | `RunInitializationSnapshot 0.1.0`が sidecar payload を持たず hash のみ | `RunInitializationSnapshot 0.2.0` exact13へ版上げし `initialWeeklyTrainingSidecarSnapshot` を必須追加。payload hash = SimulationIdentity.initialWeeklyTrainingSidecarHash。resetは保存payloadのみ使用 | §6J / base RunInit |

current migration item count:

```text
37
```

## 0B. RunInitializationSnapshot 0.2.0 sidecar closure (S1.5-SPEC-0.1.15)

基礎正本 `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` の `RunInitializationSnapshot` 契約を本追補で次へ置換する（MIG-037）。

```text
schemaVersion: "0.2.0"
exact required keys: 13
added key: initialWeeklyTrainingSidecarSnapshot
```

開始受入:
1. Sprint 1 `InitialWeeklyTrainingSidecarSnapshot` を正規validatorで検証する
2. canonical deep-clone を `RunInitializationSnapshot.initialWeeklyTrainingSidecarSnapshot` へ保存する
3. `SHA-256(canonicalJson(saved sidecar)) = simulationIdentity.initialWeeklyTrainingSidecarHash` を必須とする
4. 不一致・欠落・不正形は fail-closed（commit前、旧世界維持）

reset:
1. 保存済み `RunInitializationSnapshot 0.2.0` だけを再構築入力とする
2. 保存 `initialWeeklyTrainingSidecarSnapshot` payload を直接使用する
3. current runtime/context sidecar を authority にしない
4. preset/file/catalog 再読込禁止
5. normalized→display-unit 逆変換禁止
6. `sprint1CliInputRaw` 禁止
7. hashから欠落payloadを合成する 0.1.0 compatibility converter 禁止
8. 成功時は同一 RunInitializationSnapshot canonical value を exact 維持する

BRIDGE-038 / TX-079 / ACC-158 / FIX-019 / FIX-037 / FIX-095 は本契約を前提とする。

### 0A.1 適用規則

MIG-001～037の旧contractは、0.1.15実装では**存在してはならない**。

ただし0.1.13の歴史記録、migration test fixture、negative test名、CHANGELOG内の旧名称は許可する。

production DTO/query/validator/page codeで旧contractをaliasとして残すことは禁止する。

例:

```text
judgeDecisionをdeprecated aliasとして残す
code queryをstatusへ内部変換する
mentorPersonIdをformalMasterPersonIds[0]から合成する
```

はいずれも禁止。

### 0A.2 API versionとの関係

MIG項目は0.2.0へのbreaking changeである。

`apiSchemaVersion="0.1.0"`の互換endpointを同processへ併設しない。

0.1.13 clientとの互換layerはSprint 1.5の対象外。

### 0A.3 UI-000 migration audit

UI-000はproduction UI実装工程ではない。MIG-001～037について、まだ存在しないUI-001以降のimplementation/test evidenceをUI-000で要求しない。

UI-000では`MIGRATION-OVERRIDE-AUDIT`を37 rowへmaterializeし、各rowに:

```text
migrationId
old contract search
production old-contract hit count
ownerTask: UI-001..UI-009
planned negative test id
planned implementation evidence kind
readinessStatus:
  ready_to_implement
  | code_fix_required
  | spec_fix_required
implementationStatus: not_started
```

を記録する。

UI-000 PASS条件:

```text
MIG row count = 37
production old-contract hit count = 0 for every row
ownerTask blank = 0
planned negative test id blank = 0
planned evidence kind blank = 0
readinessStatus = ready_to_implement for all 37
implementationStatus = not_started for all 37
```

owner task受入時にactual implementation evidenceとnegative test PASSを記録し`implementationStatus=implemented`へ更新する。

UI-010で全37件`implemented`を必須とする。

1件でもowner/test plan/readinessが未確定ならUI-001へ進まない。

---
## 0. 適用規則

`S1.5-SPEC-0.1.15`の正本は、次の文書を不可分に組み合わせたものとする。

1. `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` `S1.5-SPEC-0.1.13`
2. 先行凍結追補 `SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.14_AMENDMENT.md` / `S1.5-SPEC-0.1.14`（歴史正本。本文を変更しない）
3. 本文書 `S1.5-SPEC-0.1.15 規範追補`

本追補に同一対象の新契約が存在する場合、本追補を優先する。0.1.14および0.1.13のうち本追補で明示的に変更していない条項は、そのまま継承する。

本追補はSprint 1.5 production実装ではない。Sprint 1完成後のUI-000で実コードとの物理接続を監査し、意味論を新規発明してはならない。

---

## 1. 未確定事項の分類

### 1.1 DEFERRED_BINDING

Sprint 1完成後でなければ確定できない「実装接続情報」を`DEFERRED_BINDING`と呼ぶ。

対象例:

- package rootからの最終public symbol名
- export元module path
- facade関数名
- exception classのexport元
- Sprint 1完成commit hash
- 最終schemaVersion
- test file path / test name
- public query API名
- integration facadeの配置path
- runtime stateの最終物理field path

DEFERRED_BINDINGはUI-000で実コードへ1対1に接続してよい。

### 1.2 SPEC_UNDEFINED

成功・失敗・rollback・commit・RNG・HTTP・DTO・null・sort・cursor・journal・replay・保存・破棄・例外分類など、意味論そのものが未確定な状態を`SPEC_UNDEFINED`と呼ぶ。

SPEC_UNDEFINEDはUI-001開始前に0件でなければならない。

UI-000はSPEC_UNDEFINEDを埋める工程ではない。UI-000でSPEC_UNDEFINEDを検出した場合:

1. `spec_fix_required`としてSTOP台帳へ登録する。
2. Sprint 1.5仕様を先に版上げする。
3. 修正版を再監査する。
4. `matched`になるまでUI-001へ進まない。

仮alias、仮DTO、暗黙null補完、UI独自式、暫定failure分類で吸収してはならない。

### 1.3 現時点の扱い

本追補で今回までに発見した既知のSPEC_UNDEFINEDを解消する。ただし、これは「今後の横断監査で新たな穴が絶対に見つからない」ことを意味しない。

Sprint 1完成前であるためDEFERRED_BINDINGは意図的に残る。

---


## 1A. 画面API schemaVersion

0.1.13では画面用APIの初期版を`apiSchemaVersion="0.1.0"`としていたが、本0.1.14ではPerson／Technique／BattleLog／failure envelopeのwire field追加・削除・意味変更を行うため、0.1.13自身のschema版上げ規則に従い、画面用API schemaを次へ更新する。

```text
apiSchemaVersion = "0.2.0"
```

S1.5-SPEC-0.1.15を実装するprocessは、全JSON success/failure responseで`apiSchemaVersion="0.2.0"`だけを返す。通常responseとminimal fallback responseで版を分けない。

禁止:

- 0.1.14の新DTOを`apiSchemaVersion="0.1.0"`で返す
- endpointごとに0.1.0/0.2.0を混在させる
- failureだけ旧versionを返す
- saved journal responseの再送時にversionだけ書き換える

request journalは最初に確定したresponse bytesを正本とするため、same requestId再送時にも保存済み`apiSchemaVersion`を含むbody bytesをそのまま返す。

### 1A.1 CursorPayload

画面API schema更新に伴いcursor payload schemaも次へ更新する。

```text
CursorPayload 0.2.0 = {
  apiSchemaVersion: "0.2.0",
  sessionBindingHash: lowercase 64-hex string,
  endpoint: canonical method-and-path identifier,
  dataIdentity: non-empty string,
  uiRevision: non-negative safe integer,
  query: CanonicalGetQuery 0.2.0,
  nextPosition: JsonValue
}
```

署名方式、canonical JSON、HMAC、session/process/query/data identity binding等の0.1.13契約は変更しない。

current processが0.2.0を実装しているとき、署名自体は正しいが`CursorPayload.apiSchemaVersion="0.1.0"`の旧cursorを受信した場合:

```text
HTTP 409
error.code = STALE_CURSOR
commitState = none
refreshRequired = true
```

とする。

これは改ざんではなくschema binding不一致である。

一方、署名不正、非canonical encoding、unknown field、壊れたpayload等は従来どおり400系のinvalid cursorとして扱う。

process再起動によりsession/cursor secretが失効した場合は、既存のsession/process binding規則を優先する。

---


## 1C. DEFERRED_BINDING 登録台帳

DEFERRED_BINDINGを本文中の自由記述だけで管理しない。0.1.14時点で許可される未解決binding subjectを次の台帳へ固定する。

```text
DB-001  post-start battle execution abortの最終class/symbol/module
DB-002  canonical committed runtime snapshot/read public API used to build UiReadSnapshot
DB-003  CAL-JAN-SYNC後のWorldDate/WorldCalendar物理field・public symbol
DB-004  canonical Person collectionの最終runtime physical path/read API
DB-005  start/reset/step operation receiptと4件数aggregateの正規source
DB-006  S01-008後のcommitted PersonTemporaryCondition integration path
DB-007  canonical current-age保存field / public Person read path
DB-008  mock participant eligibility public helper/facade/module
DB-009  TechniqueDefinition public type/module/final upstream schemaVersion/key registry
DB-010  TechniqueDefinitionで未取得のnested literal union（例: rangeShiftAfterUse）
DB-011  weekly training正規processorのsourceProcessor literal / module
DB-012  run全期間committed Event Stream query public source
DB-013  CommittedValidationViewStoreへ保存され得る全具体ValidationResult型/facade/module
DB-014  BattleActionLog replacementReason / evadeDirection / activationFailureReason final upstream exact types/modules
DB-015  BattleResult.summaryLog.judgeSummary decisiveCriterion/seededRngRoll physical path
DB-016  Mock replay用canonical runtime checkpoint exact type/module/rebuild API
DB-017  battle.started / battle.finished pre-allocation candidate exact schemas/modules
DB-018  CLI/UI determinism比較用canonical runtime snapshot/export physical binding + 05/S01-009 deterministic comparison rule-set binding（shared implementation helper不要）
DB-019  CAL-JAN-SYNC後の「年境界を跨ぐ最小N」決定値/test source
DB-020  WorldSummary identity/rule fieldの最終owner（SimulationIdentity / RunRuleSnapshot）とphysical path
DB-021  training.action_selected exact payload union / validator / forcedReason literal binding
DB-022  S01-008後のcanonical relationship runtime collection/read path・validator binding（既存parent_child/master_disciple field schema cross-check）
```

current registry size:

```text
22
```

### 1C.1 台帳に載せてよいもの

各DB itemは**物理接続情報だけ**を未確定にしてよい。

各itemについて意味論は本文で既に固定済みでなければならない。

例:

```text
DB-006:
  未確定 -> temporaryConditionがruntimeのどのfield/pathに保存されるか
  確定済 -> committed canonical sourceを1正本とし、UI再構成/default禁止
```

### 1C.2 UI-000開始時

UI-000はDB-001～022を全部materializeした`DEFERRED-BINDING-REGISTER`を作る。

各row必須field:

```text
bindingId
semanticContractSection
actualSymbol
actualModule
actualTypeOrSchema
actualTestEvidence
actualCompletionCommit
status: "matched"|"spec_fix_required"
notes
```

`actual*`に`{{...}}`を残した状態でmatchedにしない。

### 1C.3 新しい未確定を発見した場合

UI-000でDB-001～022に該当しない未確定を発見した場合、勝手にDB-022を追加して作業続行しない。

まず:

```text
1. DEFERRED_BINDINGかSPEC_UNDEFINEDか分類
2. spec_fix_requiredでSTOP
3. Sprint 1.5仕様を版上げ
4. 台帳へ新IDを正規追加
5. 再監査
```

とする。

これはUI-000で意味論を発明しないためだけでなく、**事前監査で把握していない新しい物理依存も可視化するため**である。

### 1C.4 完了条件

UI-001開始条件:

```text
SPEC_UNDEFINED count == 0
DEFERRED_BINDING registry rows == 22
DEFERRED_BINDING matched == 22
DEFERRED_BINDING spec_fix_required == 0
DEFERRED_BINDING unresolved == 0
unregistered uncertainty == 0
```

台帳行数だけ合っていて同じbindingを重複登録し、別bindingを落とすことを禁止する。bindingId subjectを1対1で照合する。

### 1C.5 DB-010 / DB-014のupstream type binding

DB-010はactual upstream literal unionを取得しexact unionへ接続する。

DB-014は3 fieldそれぞれの**final upstream exact type**へ接続する。

- `replacementReason`: closed literal unionならexact union
- `evadeDirection`: closed literal unionならexact union
- `activationFailureReason`: final upstreamが`string|null`ならその型をそのまま許可し、UI側で架空のclosed unionを作らない

全fieldでproduction validator/testと一致確認する。

actual typeが本追補のdirect-source/null意味論と衝突しなければDEFERRED_BINDING解消でよい。意味論自体が変わる場合はmatchedにせずspec_fix_required。

---

### 1C.6 StableErrorCodeはDEFERRED_BINDINGではない

`StableErrorCode`はSprint 1のpublic modelではなくSprint 1.5 API adapterが所有するwire contract。

0.1.13から継承したliteral set / HTTP mappingを0.2.0で固定し、UI-002がそのexact local type/validatorを実装する。

UI-000ではactual adapter symbol/moduleを要求しない。代わりに:

- semantic literal setが本文/API matrixで完全定義済み
- ownerTask=UI-002
- planned schema/status testsが存在
- alias/temporary code追加なし

を`ready_to_implement`として確認する。

UI-002受入時にlocal implementation/test evidenceを追加する。

### 1C.7 DB-021 training.action_selected payload

TrainingHistoryのanchorは§9Aで意味論を固定済み。

DB-021でUI-000が接続するのは:

- `training.action_selected` exact event payload type
- exact payload validator
- `forcedReason`のupstream exact literal union（存在する場合）
- payloadのaction/target/forced相関を証明するproduction test

だけ。

UI adapterはpayload validatorに合格した値をdirect projectionする。

upstream final payload shapeが§9Aの固定意味論と衝突する場合はmatchedにせず`spec_fix_required`。

---

### 1C.8 DB-022 relationship schema binding

PersonDetailのrelationship表示意味論は§7で固定する。

`parent_child` / `master_disciple`の基本relationship field schemaは既存canonical Relationship契約を再利用し、UI-000で新規意味定義しない。

DB-022で未確定なのはS01-008完成後の:

- canonical runtime relationship collection physical path/read API
- canonical relationship/world validator binding
- existing parent_child/master_disciple counterpart field schemaがfinal runtimeでも維持されていること
- canonical PersonId sort comparator binding

だけ。

UI-000でactual runtime type/module/testへ接続する。

upstreamにactive/status/history metadataが存在しても、0.2.0表示意味論はcurrent canonical snapshot collectionに存在する正規relationship record全件。UI独自にactive/currentだけへfilterしない。

record存在自体がcurrent relationshipを意味しないtombstone混在構造なら意味論衝突なので`spec_fix_required`。

---

### 1C.9 本文参照規則

本追補の規範本文で個別の`DEFERRED_BINDING`を参照するときは、必ず同じ文または直後に:

```text
DB-xxx
```

を併記する。

一般原則説明（§1.1、台帳自体、受入条件の総称）を除き、DB-IDを持たない個別DEFERRED_BINDING記述を禁止する。

UI-000の文書監査で:

1. 全個別`DEFERRED_BINDING`記述を抽出
2. DB-IDを取得
3. DB-001～022 registry subjectと一致
4. 1文に複数subjectがある場合は各DB-IDを列挙
5. ID不明またはsubject不一致なら`spec_fix_required`

とする。

この規則により「台帳にはあるが本文のどの未確定か不明」と「本文にはあるが台帳にない」の両方を禁止する。

---
## 2. post-start battle execution abort

### 2.1 区別

Sprint 1の戦闘実行結果に関し、次を混同しない。

- `completed`: 正常完了
- `resolution_error`: 戦闘解決上の失敗だが、正規failed BattleResult / commit planを完全構築できた
- `pre_start_failure`: 戦闘開始前の失敗
- **post-start execution abort**: 戦闘開始用battle-local処理開始後、必須dependencyまたはproduction invariant failureにより、正規BattleResult / commit plan自体を信頼できる形で構築できない

post-start execution abortを第4のBattleResult種別として追加しない。

Sprint 1側の最終class/symbol/moduleはDEFERRED_BINDING **DB-001** とする。Sprint 1完成時に意味が変更されていた場合、UI-000で無理にadapter変換せず`spec_fix_required`とする。

### 2.2 UI API mapping

確認専用模擬戦または模擬戦replayでpost-start execution abortを受けた場合:

```text
HTTP status      = 500
error.code       = INTERNAL_ERROR
error.commitState= none
refreshRequired  = false
```

次を一切変更しない。

- canonical WorldState
- World RNG state
- MatchIdGeneratorState
- EventAllocationState
- canonical Event Stream
- ProcessorRuntimeState
- CommittedValidationViewStore
- MockBattleSessionStore.latest
- uiRevision
- lastOperationRequestId
- RunInitializationSnapshot

保存してはならない:

- partial `battle.started`
- partial `battle.finished`
- partial BattleResult
- partial developmentEffects
- partial replay snapshot
- battle-local途中RNGを正規Worldへ戻した値
- battle-local途中MatchId reservation

battle-local途中材料は破棄する。

execution abortを記録するためにsimulation RNG / battle RNG / World RNGを追加消費してはならない。

### 2.3 accepted POSTのjournal

requestIdの受理境界を通過済みなら、500応答もcompleted journal recordとして保存する。

- updateControl解除
- completed journal確定
- 最終response bytes確定

は既存0.1.13の不可分完了境界を維持する。

同じrequestId・同じfingerprintの再送は、元のHTTP statusとresponse body bytesをそのまま返す。

---

## 3. INTERNAL_ERROR用minimal fallback serializer

### 3.1 目的

通常response DTO builderまたは通常JSON serializer自体が失敗した場合、同じ壊れた経路で500 responseを再構築して再帰失敗してはならない。

通常response serializerとは独立した`minimal INTERNAL_ERROR fallback serializer`を設ける。

### 3.2 入力制限

fallback serializerへ渡せるのは、strict validation済みの次のprimitiveだけとする。

- `apiSchemaVersion: string`
- `uiRevision: non-negative safe integer`
- `isUpdating: boolean`
- `refreshRequired: boolean`
- `commitState: "none"|"partial"|"complete"`
- `errorReference: non-empty string`
- `committedWeeks: non-negative safe integer | absent`
- `completedUiRevision: non-negative safe integer | absent`

渡してはならない:

- arbitrary `Error.message`
- stack trace
- OS path
- module path
- source code location
- simulation-core object
- WorldState
- BattleResult
- ValidationResultの任意object
- CanonicalObject
- provider内部情報
- secret token / cookie / CSRF
- raw request body

### 3.3 fallback response

failure envelopeの最小形:

```text
{
  apiSchemaVersion,
  ok: false,
  uiRevision,
  isUpdating,
  refreshRequired,
  error: {
    code: "INTERNAL_ERROR",
    message: "内部処理に失敗しました。",
    commitState,
    errorReference,
    committedWeeks?,       // partial|completeで契約上必要な場合だけ
    completedUiRevision?   // partial|completeで契約上必要な場合だけ
  }
}
```

`commitState=none`では`committedWeeks`と`completedUiRevision`を出力しない。

通常の`error.validation`、`fieldErrors`はfallback responseへ含めない。

### 3.4 journal境界

accepted POSTではfallback serializerで最終bytesを生成・検証し、そのbytesをcompleted journalへ保存してからupdateControlを解除する。

同requestId再送では再serializeしない。保存済みstatus/body bytesを返す。

fallback serializer自身まで実行不能な場合、さらにfallbackを再帰生成しない。transport/process fatalとして扱い、simulation stateへ追加commitしない。

---


## 3A. ApiError.validationのarray契約

0.1.13正本のApiError型をそのまま維持する。

```text
validation?: CanonicalObject[]
```

`validation`はsingle objectではない。

許可code:

```text
DOMAIN_VALIDATION_FAILED
BATTLE_PRE_START_FAILURE
```

だけ。

正規public facadeが返したValidationResult collectionを、**1 result = 1 array element**として元順のままvalidated canonical cloneする。

sourceが正規single ValidationResultを返すAPIであっても、error envelopeでは:

```text
validation = [ canonicalClone(result) ]
```

の1要素配列とする。

複数resultを返す正規契約では:

```text
validation = [
  canonicalClone(result0),
  canonicalClone(result1),
  ...
]
```

とし、flatten / merge / issue単位分割 / sort / dedupeしない。

出現条件:

```text
eligible code + result count >= 1
  -> validation必須、length>=1

eligible code + result count == 0
  -> validation field自体を省略

その他code
  -> validation field禁止
```

禁止:

- `validation: null`
- `validation: []`
- `validation: ValidationResult`のsingle object
- `ValidationIssue[]`だけを直接格納
- BattleFailureInfoを格納
- UI用StableErrorCodeをValidationResult内部へ注入

各elementは正規ValidationResultの原形を保持する。画面表示用の`ValidationResultViewItem`へ変換してerror envelopeへ入れない。

`partial_failure`の`SimulationMutationView.failedWeek.validation`は§6Bの別契約であり、ApiError.validationと相互変換しない。

---


## 3B. ApiError.fieldErrorsの場所表現・分類

0.1.13は`fieldErrors`を`INVALID_REQUEST`のfield特定可能時だけ使用し、`message`類は表示用の非決定値として正規比較対象外にする契約を既に持つ。この方針は変更しない。

一方、0.1.13の:

```text
fieldErrors?: {
  field: string,
  code: string,
  message: string
}[]
```

では`field`の表記と`code`語彙が未定義だったため、0.2.0で次へ固定する。

```text
FieldErrorCode =
  | "required"
  | "unknown_field"
  | "invalid_type"
  | "invalid_format"
  | "out_of_range"
  | "duplicate"
  | "conflicting_fields"

FieldErrorView 0.2.0 = {
  field: CanonicalRequestFieldPointer,
  code: FieldErrorCode,
  message: non-empty string
}
```

`ApiError.fieldErrors`の型は:

```text
fieldErrors?: FieldErrorView[]
```

とする。

### 3B.1 CanonicalRequestFieldPointer

`field`はHTTP requestを概念的に:

```text
{
  path: {...},
  query: {...},
  body: {...}
}
```

とみなしたRFC 6901互換JSON Pointerとする。

必ず`/`から始める。

例:

```text
/path/personId
/query/limit
/query/sortBy
/body/requestId
/body/expectedUiRevision
/body/participantAId
/body/nested/0/value
```

token内のescapeはRFC 6901どおり:

```text
~ -> ~0
/ -> ~1
```

禁止:

- `weeks`
- `body.weeks`
- `query:limit`
- HTML form name
- 日本語表示label
- source-code property path
- filesystem/module path

root body全体のJSON parse失敗、raw body上限、rootがobjectでない等で**特定fieldを指せない場合はfieldErrors自体を省略**する。`/body`を仮fieldとして追加しない。

### 3B.2 code分類

分類は次だけを使う。

```text
required
  required field/query/path valueが欠落

unknown_field
  strict schemaで許可されないbody key/query parameter

invalid_type
  JSON primitive/object/array型が要求型と違う

invalid_format
  型は合うがUUID/ID/enum/cursor raw format/文字列形式等が不正

out_of_range
  数値・文字列長・weeks/limit等が許可範囲外

duplicate
  duplicate query parameter等、単一であるべき入力が重複

conflicting_fields
  各field単体は形式上validだが、同時指定が禁止
```

例:

```text
eventType + eventGroup
  -> /query/eventType conflicting_fields
  -> /query/eventGroup conflicting_fields

participantAId == participantBId
  -> /body/participantAId conflicting_fields
  -> /body/participantBId conflicting_fields
```

domain semanticsの不成立を`conflicting_fields`へ押し込まない。正規domain validationまたはbattle pre-start failureは422契約を使用する。

### 3B.3 fieldErrorsを出す条件

```text
error.code == "INVALID_REQUEST"
かつ
1件以上のfield-specific violationを特定できる
  -> fieldErrors必須、length>=1

error.code == "INVALID_REQUEST"
かつ
field-specific violationを1件も特定できない
  -> fieldErrors field自体を省略

その他code
  -> fieldErrors禁止
```

`fieldErrors:null`、`fieldErrors:[]`は禁止。

### 3B.4 並び順

複数itemは次のstable順で返す。

1. `field`をUnicode code point昇順
2. 同一fieldでは次のcode順

```text
required
unknown_field
invalid_type
invalid_format
out_of_range
duplicate
conflicting_fields
```

同一`(field,code)`を2件以上生成しない。

複数内部validatorが同じ`(field,code)`を報告した場合、adapterは重複itemを作らず最初に検出した1件だけを採用する。message自体は表示用非決定値なので、決定性比較には含めない。

### 3B.5 message

`message`は0.1.13どおり:

- non-empty string
- 表示専用
- 画面分岐に使用しない
- 正規simulation比較対象外
- exact固定文言表を要求しない

とする。

ただし内部stack、module path、secret、cookie、CSRF token、raw body等を露出してはならない。

同一requestIdの保存済みresponse再送では、非決定値であっても**保存済みbody bytesの一部として同じmessageをそのまま返す**。

---

## 3C. API success/failure envelope 0.2.0 完全型

0.1.13の共通envelopeを0.2.0へそのまま版上げし、本追補のfieldErrors/validation/errorReference/refreshRequired規則を統合する。

### 3C.1 success

```text
ApiSuccessEnvelope<T> 0.2.0 = {
  apiSchemaVersion: "0.2.0",
  ok: true,
  data: T,
  uiRevision: non-negative safe integer,
  isUpdating: boolean
}
```

exact top-level key count:

```text
5
```

success envelopeには次を置かない。

- `refreshRequired`
- `error`
- `lastOperationRequestId`
- `requestId`
- `durationMs`のenvelope-level複製

operation固有`durationMs`は`data` DTO自身に定義される場合だけ存在する。

### 3C.2 failure

```text
ApiFailureEnvelope 0.2.0 = {
  apiSchemaVersion: "0.2.0",
  ok: false,
  error: ApiError 0.2.0,
  uiRevision: non-negative safe integer|null,
  isUpdating: boolean,
  refreshRequired: boolean
}
```

exact top-level key count:

```text
6
```

failure envelopeへ`data`を置かない。

### 3C.3 ApiError 0.2.0

```text
ApiError 0.2.0 = {
  code: StableErrorCode,
  message: non-empty string,
  commitState: "none"|"partial"|"complete",

  fieldErrors?: FieldErrorView[],
  validation?: CanonicalObject[],
  committedWeeks?: non-negative safe integer,
  completedUiRevision?: non-negative safe integer,
  errorReference?: non-empty string
}
```

allowed key setは上記8 key exact。

required key:

```text
code
message
commitState
```

optional keyを`undefined`または`null`で出力しない。存在しない場合はown property自体を省略する。

`StableErrorCode`のliteral unionは0.1.13正本をそのまま継承する。retrieved excerptだけから新しいcode literalを追加しない。これはSprint 1.5 local API contractでありDEFERRED_BINDINGではない。UI-002がexact type/validatorを実装し、UI-000ではowner/test planを確認する。

### 3C.4 optional field presence matrix

`fieldErrors`:
- §3Bどおり`INVALID_REQUEST`かつfield-specific item>=1だけ必須
- それ以外禁止

`validation`:
- §3Aどおり`DOMAIN_VALIDATION_FAILED` / `BATTLE_PRE_START_FAILURE`かつ正規result>=1だけ必須
- 対象codeでも0件ならfield absent
- それ以外禁止

`committedWeeks` / `completedUiRevision`:

```text
commitState == "none"
  -> 両field禁止

commitState == "partial" | "complete"
  -> operationはstepだけ
  -> 両field必須
```

start/reset/new mock/replay/GETのfailureで`partial|complete`は禁止。

`errorReference`:

```text
code == "INTERNAL_ERROR"
  -> 必須

otherwise
  -> 禁止
```

### 3C.5 uiRevision / isUpdating

pre-session security failureまたは`/session`以外のmissing/invalid session:

```text
uiRevision = null
isUpdating = false
```

valid sessionに対して**新しく構築するerror response**:

```text
isUpdating = (response構築時の updateControl != null)
```

とする。

これはrequest自身がacceptedされupdateControlを保持中の最終errorにも適用する。

#### GET

```text
updateControl == null
  -> current committed UiReadSnapshot.uiRevision
  -> isUpdating=false

updateControl != null
  -> operationStartReadSnapshot.uiRevision
  -> isUpdating=true
```

#### POST success

0.1.13の明示特則:

```text
uiRevision = data.completedUiRevision
isUpdating = false
```

success bytesはcommit前にprebuildされても、wire値はliteral false。

#### POST rejection before acquiring own updateControl

例:

- body/Origin/CSRF/revision受理前error
- completed journal conflict
- stale revision
- lifecycle/resource error before own operation lock

では、その時点で**別operationのupdateControlがあるか**だけでisUpdatingを決める。

別operationなしならfalse。
別operation running中でそのerrorを返す契約ならtrue。

#### accepted POST final error

accepted requestが自分の`updateControl`を保持したまま最終error bytesを構築し、そのbytesをcompleted journalへ保存してからlockを解除する場合:

```text
isUpdating = true
```

対象例:

- accepted domain validation / battle pre_start_failure
- accepted capacity INTERNAL_ERROR
- atomic precommit INTERNAL_ERROR
- step none / partial / complete INTERNAL_ERROR

error response保存後にupdateControlを解除しても、保存済みbodyを`isUpdating=false`へ書換えない。

#### uiRevision correlation

`commitState=none` accepted error:
- operationStart/read-start時点からcommitがなければそのcommitted revision
- `isUpdating=true`

step `partial|complete`:
- `uiRevision = error.completedUiRevision`
- `isUpdating=true`

したがって`isUpdating=true`だから必ずoperationStart revisionを返す、という一般式をpartial/completeへ適用しない。partial/completeはcompletedUiRevision特則が優先。

#### saved response replay

completed journalのsame requestId/fingerprint replay:

- original `uiRevision`
- original `isUpdating`
- original `refreshRequired`

をbytes exactで維持する。

現在`updateControl==null`でも、保存bodyが`isUpdating=true`ならtrueのまま返す。

---
### 3C.6 refreshRequired

§5の既存0.1.14規則を再掲する。

```text
true:
- UPDATE_IN_PROGRESS
- STALE_UI_REVISION
- STALE_CURSOR
- INTERNAL_ERROR with commitState=partial|complete

false:
- 上記以外のfailure
```

successではfield自体禁止。

### 3C.7 strict envelope validation

serialize前にexact key set、discriminant、presence matrixを検証する。

拒否例:

- successにerror/refreshRequired追加
- failureにdata追加
- ok=trueだがfailure6 key shape
- optional field=null/undefined
- `commitState=none` + committedWeeks
- partial/completeでcompletedUiRevision欠落
- INTERNAL_ERRORでerrorReference欠落
- non-INTERNAL_ERRORでerrorReference存在
- failure top-level uiRevisionとcompletedUiRevisionの不整合

minimal fallback serializerもこのfailure exact6 / ApiError presence matrixを満たす。

---
## 3D. failure commitState と lastOperation

`lastOperation` / `lastOperationRequestId`は、最後にHTTP 200で完了しcompleted request journalへ保存されたmutation responseだけを正本とする。

### 3D.1 non-200

4xx / 409 / 422 / 500ではlastOperationを更新しない。

### 3D.2 atomic start/reset/mock/replay failure

application-level failureは必ずcommit前`commitState=none`。

- world/latest/revision不変
- lastOperation不変
- accepted failure responseをjournalへ保存できる
- same requestIdはexact failure replay

atomic success commit後のtransport failureは500ではなく、保存済みHTTP200 responseをsame requestIdで再取得する。

したがってatomic operationの「stateだけcommit済みだがlastOperationは旧successのまま」というapp-level 500状態を作らない。

### 3D.3 step INTERNAL_ERROR

step:

```text
none:
  週commit 0
  lastOperation unchanged

partial:
  1..N-1週commit済み
  current world/uiRevisionは進む
  lastOperationは直前HTTP200 successのまま

complete:
  N週commit済み
  current world/uiRevisionは最終週まで進む
  lastOperationは直前HTTP200 successのまま
```

`GET /simulation`ではtop-level response.uiRevision / data.summaryがcurrent fixed read snapshotを表す一方、data.lastOperation.completedUiRevisionは最後のHTTP200 mutation時点の古いrevisionでもよい。`GET /session` dataにはsummary/lastOperationを置かない。

### 3D.4 HTTP200 domain partial_failure

正常HTTP200 responseなので、その`SimulationMutationView`がlastOperationとなる。

### 3D.5 failed request replay

保存済みnon-200 requestId再送:

- status/body exact replay
- operation再実行なし
- lastOperation更新なし

---


## 3E. uiRevision capacity preflight

revision増加mutationは、**0.1.13のPOST error precedenceをすべて通過した後、最初のstate mutation/RNG/ID消費の直前**に最大deltaをpreflightする。

### 3E.1 maxRevisionDelta

```text
start/reset/new mock/replay -> 1
step -> requestedWeeks
```

必須:

```text
acceptedUiRevision <= Number.MAX_SAFE_INTEGER - maxRevisionDelta
```

加算してからoverflow判定せずsubtraction形式で判定する。

### 3E.2 exact precedence

新規POSTは、0.1.13正本順を維持して:

```text
1. Host / Content-Type / body size / session / Origin / CSRF
2. JSON parse + strict DTO validation
3. canonical fingerprint作成 + existing request journal lookup
4. existing completed/running/conflictの判定
5. recordなしならupdate lock確認
6. expectedUiRevision
7. session lifecycle
8. endpoint resource existence

9. running acceptance boundary
   - running journal record作成
   - updateControl取得
   - operationStartReadSnapshot固定
   を1不可分境界で行う

10. required canonical source / saved adapter record strict integrity validation
11. canonical domain validation / battle pre_start_failure
12. uiRevision capacity preflight
13. first simulation mutation / RNG / MatchId / Event allocation
```

**step 3はjournal lookupであってrunning acceptanceではない。**

次はすべてrunning受理前なので、新規journal record/requestId予約を行わない。

- strict DTO 400
- existing journal `REQUEST_ID_CONFLICT`
- `UPDATE_IN_PROGRESS`
- `STALE_UI_REVISION`
- lifecycle error
- endpoint resource `NOT_FOUND`

一方、step 9以降の:

- canonical source/store integrity 500
- domain/pre-start 422
- capacity 500
- simulation/serializer failure

はaccepted requestであり、確定可能なfailure responseをcompleted journalへ保存する。

したがって同一requestが複数条件を満たす場合:

```text
stale revision + capacity不足
  -> STALE_UI_REVISION

resource missing + capacity不足
  -> NOT_FOUND

domain validation failure + capacity不足
  -> DOMAIN_VALIDATION_FAILED

battle pre_start_failure + capacity不足
  -> BATTLE_PRE_START_FAILURE
```

capacity 500で前段errorを上書きしない。

同じく:

```text
resource/store corruption + capacity不足
  -> corruptionを500 INTERNAL_ERRORとして先に確定
  -> capacity判定で隠さない
```

例:

- reset用RunInitializationSnapshot strict integrity failure
- replay latest/replaySnapshot hash/cross-reference failure
- mutation sourceとなるcanonical runtime snapshot corruption

integrity failureでもstate/RNG/ID/revisionは変更しない。

integrity failureはrunning受理後なので、500 `INTERNAL_ERROR`は`errorReference=request:<validatedRequestId>`を持ち、確定可能ならcompleted journalへexact保存する。

capacity preflightのためにdomain validatorを省略しない。

### 3E.3 failure

capacity failure:

```text
HTTP 500
error.code = INTERNAL_ERROR
commitState = none
refreshRequired = false
uiRevision = acceptedUiRevision
errorReference = request:<validatedRequestId>
```

accepted request journalへ保存可能なcompleted failure responseとする。

変更なし:

- canonical world
- World RNG
- MatchIdGeneratorState
- EventAllocationState
- validation store
- mock latest
- lastOperation
- uiRevision

### 3E.4 step partialとの関係

stepではfull `requestedWeeks` deltaを事前確認する。

capacity safe確認後にdomain/runtimeが途中で正規partial failureとなり`committedWeeks < requestedWeeks`となることは許容する。

revision overflow自体を理由に途中partial commitを発生させない。

### 3E.5 exhausted revision

```text
acceptedUiRevision == Number.MAX_SAFE_INTEGER
```

ではrevision増加を伴う全mutationが、前段validationを通過した場合だけcapacity 500となる。

GETはread-onlyで継続可能。

同一session/worldのuiRevisionをwrap/0 resetしてmutation継続しない。

---

## 3F. ApiError commitState / committedWeeks のoperation別意味

0.1.13正本では:

```text
start / reset / new mock / replay
  -> response DTO/schema/JSON bytesをcommit前に確定
  -> state + uiRevision + completed journal success responseを1 atomic commit

step
  -> 1週ごとのcommitが先に成立し得る
  -> request全体の最終response確定前に複数commit境界が存在し得る
```

したがって、**HTTP APIとして返せる`INTERNAL_ERROR commitState=partial|complete`は0.2.0ではstepだけ**。

### 3F.1 atomic mutation: start / reset / new mock / replay

application-level failure responseを返す場合:

```text
commitState = "none"
committedWeeks absent
completedUiRevision absent
```

だけ。

正常系は:

```text
HTTP 200 success DTO bytes
+ next session state
+ uiRevision
+ completed journal success record
```

を1不可分commitで確定する。

正常response DTO build/schema validation/JSON serializationのどれかが失敗した場合、commit前500 none。

atomic commit完了後のHTTP transport/write failureは:

- state rollbackしない
- 500 ApiFailureEnvelopeへ変換しない
- `commitState="complete"`を新規生成しない
- saved HTTP200 responseをsame requestId再送でexact replay可能

とする。

atomic operationの`commitState="partial"`および`"complete"` error envelopeは禁止。

### 3F.2 step none

stepで最初の週commit前にinternal failure:

```text
commitState = "none"
committedWeeks absent
completedUiRevision absent
```

### 3F.3 step partial

```text
requestedWeeks = N >= 2
1 <= committedWeeks < N
commitState = "partial"
completedUiRevision = acceptedUiRevision + committedWeeks
```

1件以上の週commitが既に成立し、request全体を正常200として完了できないinternal failureだけ。

### 3F.4 step complete

全requested week commit後にrequest全体の最終response生成等でinternal failure:

```text
requestedWeeks = N >= 1
committedWeeks = N
commitState = "complete"
completedUiRevision = acceptedUiRevision + N
```

これは週commit済みstateをrollbackできないためのerror分類。

### 3F.5 domain partial_failure 200との区別

HTTP200:

```text
SimulationMutationView.outcome = "partial_failure"
0 <= committedWeeks < requestedWeeks
```

は正規domain failureを成功responseとして返せた契約。

HTTP500 step partial:

```text
1 <= committedWeeks < requestedWeeks
```

とは別。

### 3F.6 top-level revision

step partial/complete INTERNAL_ERRORだけ:

```text
failureEnvelope.uiRevision == error.completedUiRevision
```

noneではcompletedUiRevision field自体がない。

### 3F.7 fallback serializer

fallback serializerはoperation kindと確定済み週commit境界だけから分類する。

```text
atomic mutation -> always none
step K=0       -> none
step 0<K<N     -> partial
step K=N       -> complete
```

壊れた通常MutationViewからcommitStateを推測しない。

---

### 3F.1A GETは常にcommitState=none

全read-only GET failureはcodeに関係なく:

```text
commitState="none"
committedWeeks absent
completedUiRevision absent
```

新UiSession登録、server error counter、read snapshot/cache/cursor validationはsimulation mutation commitとして数えない。

GET INTERNAL_ERRORでpartial/completeを返さないためrefreshRequiredもINTERNAL_ERRORではfalse。

new session store commit後のtransport faultをsynthetic app-level `commitState=complete` responseへ変換しない。

---

## 4. errorReference

### 4.1 POSTのaccepted-request境界

POST INTERNAL_ERRORのerrorReferenceはaccepted-request境界で分ける。

accepted前:

```text
errorReference = server:<serverInstanceId>:<counter>
```

accepted後:

```text
errorReference = request:<validatedRequestId>
```

raw JSON内の未検証requestIdを使用しない。

parser/body validator/fingerprint/journal lookup infrastructure等でrequest acceptance自体を確定できないinternal failureはpre-accept `server:`、request journal recordなし。

accepted後のcapacity/simulation/response build/partial/complete internal failureは`request:`。completed journalへ保存できる場合、same requestId/fingerprint再送はstatus/body exact。

journal stateが信頼できず過去accepted済みか判定不能な場合、fresh acceptedと推測しない。


### 4.2 requestIdを持たないGET等

API process開始時にsimulationとは独立したOS CSPRNGでcanonical UUID v4 `serverInstanceId`を1回だけ生成する。

取得順を固定する。

```text
1. process config / loopback bind設定をstrict validate
2. OS CSPRNGからserverInstanceIdを生成
3. canonical UUID v4 validation
4. errorCounter=1を初期化
5. ここまで成功してからHTTP listenerをbind
```

`serverInstanceId`生成・validationに失敗した場合:

- HTTP listenerをbindしない
- UiSessionを生成しない
- canonical simulation stateを生成・変更しない
- fallback errorReferenceを別RNG/時刻/固定文字列で代用しない
- process startup failureとして非0終了または上位process supervisorへ失敗を返す

起動成功後のerrorReference発行にCSPRNGを再利用しない。

process-local `errorCounter`を1から開始するpositive safe integerとする。

```text
errorReference =
  "server:" + serverInstanceId + ":" + decimal(errorCounter)
```

発行処理は同期的な1不可分操作とする。

```text
allocateServerErrorReference():
  require errorCounter < Number.MAX_SAFE_INTEGER
  ref = "server:" + serverInstanceId + ":" + decimal(errorCounter)
  errorCounter = errorCounter + 1
  return ref
```

したがって発行可能な最大counter値は`Number.MAX_SAFE_INTEGER - 1`。

`errorCounter == Number.MAX_SAFE_INTEGER`で新しいGET等のerrorReferenceが必要になった場合:

- wrapしない
- 1へ戻さない
- UUIDを再生成して同processを継続しない
- timestamp/random fallbackを使わない
- simulation/API domain errorへ偽装しない
- 新しいerrorReferenceを返そうとせずprocess-fatal operational failureとしてlistenerを停止する
- canonical simulation state / session stateを追加変更しない

同一process内で発行済み`errorReference`は重複してはならない。

counter allocation後にresponse serialization/transport自体が失敗した場合、そのcounter値は再利用しない。欠番は許容する。

禁止:

- World RNG
- battle RNG
- seed
- PersonId
- simulationId
- MatchId
- `Math.random()`
- timestamp単独
- array index単独

serverInstanceId/errorCounterはsimulation canonical state、hash、determinism比較、checkpointへ含めない。

---

## 4A. UiSession生成時のCSPRNG failure

0.1.13のsession cookie / CSRF契約を維持する。

per-sessionで生成するrandom materialは:

```text
sessionId / session cookie value
csrfToken
```

だけ。

cursor署名用HMAC keyと`sessionBindingHash`用binding keyは§4Bの**process-level key**であり、新規sessionごとに生成しない。

### 4A.1 fixed generation contract

```text
SESSION_ID_GENERATION_MAX_ATTEMPTS = 3
```

session IDは1 attemptごとに:

```text
OS CSPRNG 32 bytes
-> paddingなしbase64url
-> exact 43 ASCII chars
```

へ変換する。

同一processの既存session IDと衝突した場合、そのcandidateだけを破棄して次attemptへ進む。

```text
attempt 1 collision -> retry
attempt 2 collision -> retry
attempt 3 collision -> failure
```

4回目を生成しない。

これは0.1.13の「既存session IDと衝突した場合は保存前に再生成する」を具体化するoperational contractであり、simulation結果へ影響しない。

unique session IDを確定した後、CSRF tokenを独立OS CSPRNG 32 bytesから1回生成し、paddingなしbase64url exact43へ変換する。

CSRF生成後にsession ID collision retryへ戻らない。

### 4A.2 draft-first / atomic registration

`GET /session`でnew sessionが必要な場合:

```text
1. sessionId candidateを最大3 attemptsでunique確定
2. csrfTokenを独立生成
3. NewUiSessionDraftをlocal構築
4. empty lifecycle / uiRevision=0 / stores / journal等を構築
5. UiSession strict validation
6. GET /session success DTOをstrict validateし、HTTP 200 body bytesを安全にserialize
7. Set-Cookie headerを完全構築・検証
8. ここまで成功してからsession storeへ1回登録
9. 登録済みsessionとprebuilt responseを送信
```

session storeへfield単位で部分commitしない。

session store登録後に通常serializer/DTO builderを初めて実行しない。

```text
DTO/schema/serializer/Set-Cookie構築failure
  -> store commit前500
  -> new session rowなし
  -> Set-Cookieなし

store登録成功後のtransport write failure
  -> 登録済みsessionをrollbackしない
  -> browserがcookieを受領できなければそのsessionは到達不能になってよい
  -> retryのcookieなしvalid bootstrapは別new sessionを生成
```

到達不能sessionの存在をsimulation mutation commitとして扱わない。

### 4A.3 dependency / exhaustion failure

次のどれか:

- OS CSPRNG failure
- session ID 3 attemptsすべてcollision
- session ID/CSRF length/format validation failure
- UiSession strict validation failure
- response/header構築failure before store commit

では:

```text
HTTP 500
error.code = INTERNAL_ERROR
commitState = none
uiRevision = null
isUpdating = false
refreshRequired = false
errorReference = server:<serverInstanceId>:<counter>
```

禁止:

- partial session store row
- Set-Cookie
- CSRF token response
- request journal
- canonical WorldState生成
- simulation RNG消費
- `Math.random()` / timestamp / fixed token fallback
- attempt上限を超えたretry

失敗candidate/random materialは別requestへ再利用しない。

### 4A.4 existing session

valid existing sessionの通常`GET /session`では:

- sessionIdを再生成しない
- csrfTokenをrotateしない
- process cursor HMAC key / binding keyを再生成しない

単なるsession readのためにOS CSPRNGを呼ばない。

### 4A.5 post-registration transport fault

session storeへ登録した後のnetwork/transport write failureは、登録済みsessionをrollback/reseedしない。

clientがcookieを受信しなかった場合、そのsessionはprocess-local orphanになり得るが別client/sessionへ再利用しない。

transport failureをsimulation mutation `commitState=complete`のJSON responseへ変換しない。

---

## 4B. process-level cursor security keys

0.1.13正本どおり、process起動時にsession生成とは独立して次を生成する。

```text
cursorHmacKey:
  OS CSPRNG >= 256 bits

sessionBindingKey:
  OS CSPRNG >= 256 bits
```

2つは別purpose・別generationであり、同じkey object/byte materialを意図的に共用しない。

### 4B.1 ownership

```text
cursorHmacKey
  -> cursor第1segment ASCII bytesへのHMAC-SHA-256だけ

sessionBindingKey
  -> HMAC-SHA-256(
       sessionBindingKey,
       sessionCookieAsciiBytes
     )
     = exact 32-byte digest
     -> lowercase hex encode
     -> exact 64 ASCII chars sessionBindingHash
```

CSRF/session ID生成へ使用しない。
simulation RNGへ使用しない。

### 4B.2 startup failure

process-level keyのCSPRNG/length validation failureではHTTP listenerをbindせずstartup failure。

sessionを生成しない。
fallback keyを固定値/time/Math.randomから作らない。

### 4B.3 lifetime

同一process中は両keyをrotationしない。

reset/start/step/mock/replayでrotationしない。

process restartでは新keyとなり、旧cursor/session bindingは既存0.1.13契約どおり失効する。

---

## 5. refreshRequiredのwire位置

failure envelopeでは`refreshRequired:boolean`をtop-level必須fieldとする。

`ApiError`内部へ入れてはならない。

success envelopeには`refreshRequired` field自体を存在させない。

値:

```text
true:
- UPDATE_IN_PROGRESS
- STALE_UI_REVISION
- STALE_CURSOR
- INTERNAL_ERROR かつ commitState=partial|complete

false:
- 上記以外のfailure
```

schema testで最低限次を拒否する。

- failureなのにtop-level refreshRequired欠落
- `error.refreshRequired`へnested
- success responseにrefreshRequired混入

---




## 4A. 0.1.14画面表示要件の上書き

0.1.13 §4の画面説明には、旧wire fieldを前提とする表示文言が残っている。本追補適用後は以下をcurrent表示要件とし、旧「所属」「総合ランク」「単数師匠」「候補の参加不可reason」を新しいUI独自合成値で復活させない。

### 4A.1 人物一覧

旧:

- `所属`
- `総合ランク`

を廃止する。

一覧では次を独立列または独立表示項目として扱う。

```text
Family ID
Lineage ID
Current Rank
Highest Rank
Retirement Rank
```

source/null規則は§6だけを使用する。

`familyId + lineageId`から「○○家／△△流」のような合成所属文字列をAPI DTOへ作らない。

Family/Lineageの名称を将来表示する場合は、canonical Family/Lineage name fieldのexact sourceを別途仕様化してwire版を上げる。現0.2.0ではID表示を正本とする。

rankも3値を統合して「総合ランク」1値へ戻さない。

### 4A.2 人物詳細

旧:

- `所属`
- `師匠`
- `親`

の曖昧表示を次へ置換する。

```text
Family ID
Lineage ID
Formal Master Person IDs
Parent Person IDs
Qualified Master
Current Rank
Highest Rank
Retirement Rank
```

Formal Masterは配列を全件表示し、先頭1件だけを「師匠」として選ばない。

Parentも配列を全件表示する。

canonical nullは「対象外／未設定」と表示してよいが、required sourceの欠落・invalid stateを「未設定」で隠して200を返さない。その場合は該当validator契約に従い500。

修行履歴に「指導者」列を置かない。§9のhistorical instructor契約を優先する。

### 4A.3 技状態

旧表の:

- 使用条件
- 命中関連値
- 消費・使用回数

をadapter独自summary objectへまとめない。

§8の`TechniqueDefinitionView` fieldを直接表示する。

画面上で見出し単位にgroupingしてよいが、API value/sourceを再合成しない。

PersonTechniqueState由来のlearning/mastery/use countと、TechniqueDefinition由来の性能・条件を視覚的に区別する。

### 4A.4 模擬戦候補

候補selectorには`GET /mock-battles/candidates`が返したeligible personだけを表示する。

不適格人物をdisabled optionとして混ぜない。
候補取得時に「参加不可reason一覧」を別途作らない。

POST後に正規pre-start validationで422になった場合だけ、そのrequestの`error.validation`をエラー領域へ表示する。

これは「候補GET時の参加不可reason」とは別物である。

### 4A.5 模擬戦結果

旧`judgeDecision`単独表示を廃止し、§13B/13Cに従い最低限:

- endReason
- endReasonIsJudgeDecision
- judgementApplied
- judgeScore
- battleSeed
- finalRngState
- validation.overallPassed

を分離表示する。

双方unable-to-continueで判定計算を使ったケースを「judgeDecision=falseだから判定なし」と表示してはならない。

---

## 5A. GET参照要求の判定順

0.1.13正本にはGETの優先順位が既に存在するため、本追補はその順序を変更しない。0.1.14では内部保存物のstrict integrity検査と`UiReadSnapshot`固定時点だけを補足し、既存優先順位へ挿入する。

### 5A.1 `/session`以外

`GET /session`以外は必ず次の順で評価する。

```text
1. Host / request-target transport-security boundary
2. 画面session cookie検証
3. endpoint固有path/queryの構文・型・範囲検証
4. responseが参照するUiReadSnapshotを固定
5. session lifecycle検証
6. cursor decode / HMAC認証 / strict schema / binding検証
7. endpoint固有の単一resource存在検証
8. resource / server保存物 / canonical sourceのstrict integrity validation
9. filter / sort / page projection
10. response DTO strict validation / serialization
```

後段のerrorで前段のerrorを置換してはならない。

#### 1. Host / request-target transport-security boundary

0.1.13のHost allow-list、request-target byte上限、percent encoding / UTF-8等のsecurity・transport契約を使用する。

session照合前に確定するfailureでは既存契約どおり`uiRevision=null`、`isUpdating=false`を返す。

#### 2. session cookie

`/session`以外でcookie欠落・無効・旧process発行:

```text
401 SESSION_REQUIRED
uiRevision = null
isUpdating = false
```

cookie authentication/store lookup自体は成功したが、対応する`UiSessionState` strict integrity validationが失敗した場合は**invalid cookie扱いにしない**。

```text
500 INTERNAL_ERROR
commitState=none
uiRevision=null
isUpdating=false
refreshRequired=false
errorReference=server:<serverInstanceId>:<counter>
```

- corrupt rowを削除しない
- new empty sessionへ置換しない
- session cookie/CSRFをrotateしない
- query/lifecycle/cursor/resourceへ進まない

「cookie無効」と「server-side session corruption」を同じ401へ畳み込まない。

query/lifecycle/cursor/resourceを評価しない。

したがって:

```text
no session + malformed query
-> 401 SESSION_REQUIRED
```

#### 3. path/query syntax

valid session確立後に次を検証する。

- path parameter lexical form
- unknown / duplicate query parameter
- query value type/range
- filter string length
- cursor raw query valueの型・許可文字列長等、cursorをdecodeしなくても判定できるquery構文

この段階でcursorのpayload decode、HMAC、payload strict schema、bindingは行わない。

例:

```text
valid session + malformed ordinary query + empty lifecycle
-> 400 INVALID_REQUEST

GET /people/:personId lexical invalid
-> 400 INVALID_REQUEST
```

#### 4. read snapshot固定

valid session + path/query構文合格後、0.1.13の既存契約どおり:

```text
updateControl == null
  -> current committed read snapshot

updateControl != null
  -> updateControl.operationStartReadSnapshot
```

をこのGETの唯一のread snapshotとして固定する。

以後、lifecycle / cursor binding / resource / integrity / projectionは同snapshotだけを見る。

#### 5. lifecycle

world依存GETで固定snapshotが`empty`なら:

```text
409 SIMULATION_NOT_STARTED
```

cursor decode/HMAC/bindingおよびresource lookupより先に返す。

したがって、ordinary query構文自体はvalidでcursor文字列もraw queryとして許可長内だが、そのcursor内容が壊れている場合でも:

```text
empty lifecycle
-> 409 SIMULATION_NOT_STARTED
```

を優先する。

`GET /presets`はworld lifecycle非依存。

#### 6. cursor decode / authentication / binding

cursorを受け取るendpointではlifecycle通過後に§10Gのexact順で検証する。

特に、署名済みでも:

```text
endpoint / query.kind / dataIdentity prefix
の組合せが当該endpointで不可能
-> 400 INVALID_REQUEST
```

とする。

一方:

```text
schema/prefix/kindはcurrent contractに適合しているが、
session / dataIdentity（simulationIdまたはmock result identity） /
payload.uiRevision / effective query / nextPosition
が現在targetと一致しない
-> 409 STALE_CURSOR
   refreshRequired=true
```

旧valid CursorPayload 0.1.0は§1Aどおり409 STALE_CURSOR。

decode/canonical/schema破損/HMAC invalidは400。

0.1.13の特則を維持する。

**過去の模擬戦結果用cursorが正しく署名され、current result identity / resultUiRevisionと異なる場合は、`MockBattleSessionStore.latest == null`であってもresource 404より先に`STALE_CURSOR`を返す。**

したがって:

```text
ready + authenticated old mock-log cursor + latest missing
-> 409 STALE_CURSOR
```

であり、404へ変更しない。

collectionのfilter値が現在0件であることはresource不存在ではない。valid cursor/queryなら通常の0件page契約へ進む。

#### 7. resource existence

cursorを使わないGET、またはcursor検証を通過したGETについて単一resourceの存在を確認する。

例:

```text
GET /people/:personId
  canonical Person不存在
  -> 404 NOT_FOUND

GET /mock-battles/latest
  latest == null
  -> 404 NOT_FOUND

GET /mock-battles/latest/log
  cursorなし、latest == null
  -> 404 NOT_FOUND
```

collection filterで一致0件は404ではない。

#### 8. internal integrity

存在するresource/store/canonical materialを正規validator/hash/cross-referenceでstrict validationする。

破損:

```text
500 INTERNAL_ERROR
commitState=none
refreshRequired=false
```

部分表示しない。

cursor bindingはstep 6で既に終わっているため:

```text
authenticated stale cursor + corrupt current resource
-> 409 STALE_CURSOR
```

とする。

**壊れたresourceをSTALE_CURSORで隠すという新規方針を作ったのではなく、0.1.13が固定するcursor-before-resource順を維持した結果である。**

cursorなし、またはcurrent bindingに一致するcursorではresource破損を500として検出する。

#### 9–10. projection / response

filter/sort/paging中にcanonical source不整合を検出した場合は500。

DTO strict validation / normal serializer failureは§3のminimal fallback契約へ従う。

### 5A.2 `GET /session`

`GET /session`はbootstrap endpointだが、**invalid requestで新sessionを生成しない**ことと、**既存valid sessionのerror metadataを失わない**ことを両立させる。

判定順:

```text
1. Host / request-target transport-security boundary

2. cookieをnon-mutating inspect
   valid current-process cookie + matching UiSession strict integrity pass
     -> existing UiSessionをbind
   missing / invalid / old-process cookie
     -> existingSession = null
   authentic cookie + matching UiSession strict integrity failure
     -> 500 INTERNAL_ERRORで終了
   この段階ではnew sessionを生成しない

3. path/query strict validation
   GET /sessionはqueryを1個も許可しない

4. requestがvalidなら:
   existingSession != null
     -> existing sessionを使用
   existingSession == null
     -> §4Aのdraft-first手順でnew empty sessionを生成

5. response DTO strict validation / serialization
```

cookie inspectは:

- corrupt existing session rowをinvalid cookieとして扱わない
- corruption時はrow delete/self-heal/new session generationを行わない

- sessionId/CSRF/cursor keyをrotateしない
- OS CSPRNGを呼ばない
- store rowを作らない
- invalid/old cookieを新sessionへ変換するのはstep 4だけ

`GET /session?x=1`等のinvalid requestではnew sessionを作らない。

error metadata:

```text
invalid request + existing valid idle session
  -> 400 INVALID_REQUEST
  -> uiRevision = current committed UiReadSnapshot.uiRevision
  -> isUpdating = false

invalid request + existing valid updating session
  -> 400 INVALID_REQUEST
  -> uiRevision = operationStartReadSnapshot.uiRevision
  -> isUpdating = true

invalid request + no valid existing session
  -> 400 INVALID_REQUEST
  -> uiRevision = null
  -> isUpdating = false
```

したがって、既存valid cookieを持つ`GET /session?x=1`をpre-session error扱いして`uiRevision=null`へ落とさない。

#### 5A.2A SessionDataView exact boundary

0.1.13のAPI-001 data shapeを変更しない。

```text
SessionDataView = {
  sessionState: "empty"|"ready"|"updating",
  csrfToken: string,
  activeOperation:
    null|{
      kind: "start"|"step"|"reset"|"mock_battle"|"mock_battle_replay",
      requestId: string
    }
}
```

exact top-level key count:

```text
3
```

source:

```text
sessionState:
  updateControl != null -> "updating"
  otherwise committedLifecycle

csrfToken:
  current UiSession.csrfToken
  operationStartReadSnapshotには入れない

activeOperation:
  updateControl == null -> null
  updateControl != null ->
    {
      kind: updateControl.operationKind,
      requestId: updateControl.requestId
    }
```

`GET /session` top-level envelopeの`uiRevision`は:

```text
updateControl == null
  -> current committed UiReadSnapshot.uiRevision

updateControl != null
  -> operationStartReadSnapshot.uiRevision
```

dataへ次を追加しない。

- summary
- lastOperation
- lastOperationRequestId
- uiRevision
- isUpdating
- requestJournal
- world/runtime data

`lastOperation`のwire表示先はAPI-006 `GET /simulation.data.lastOperation`だけ。

#### 5A.2B `GET /presets`

API-002はbootstrap後の通常session-required GET。

- session cookie必須
- queryを受け取らない
- world lifecycle非依存。empty/ready/updatingの全sessionで利用可
- cursor非対応
- startup時にstrict validate/freezeしたpreset registry snapshotだけをsourceとする
- current world / RunInitializationSnapshot / operation中draftからpresetを再構築しない
- `items`は`presetId` Unicode code point ascへsort
- `totalCount == items.length`
- `nextCursor == null`

top-level envelope metadataは他のvalid-session GETと同じ。

```text
updateControl == null
  -> uiRevision=current committed snapshot revision
  -> isUpdating=false

updateControl != null
  -> uiRevision=operationStartReadSnapshot.uiRevision
  -> isUpdating=true
```

preset data自体はoperationStart world snapshotから読むのではなく、process startup freeze済みimmutable registryを読む。

### 5A.3 更新中GET

更新中でも上記順序を変えない。

固定対象は`operationStartReadSnapshot`。

- ordinary path/query invalid -> 400
- operationStartReadSnapshotがempty -> 409 SIMULATION_NOT_STARTED
- authenticated cursor binding mismatch -> 409 STALE_CURSOR
- cursorなし/current cursorでsnapshot resourceなし -> 404
- cursorなし/current cursorでsnapshot resource破損 -> 500

更新途中の新commit stateをcursor/resource/integrity判定へ混ぜない。

---


## 5B. UiReadSnapshot 0.2.0 完全型

0.1.13の`UiReadSnapshot 0.1.0`には`runInitializationSnapshot`が含まれていない。fileciteturn127file0

0.1.14ではWorldSummaryのrun固定fieldを`RunInitializationSnapshot`から取得し、更新中GETは`operationStartReadSnapshot`だけを唯一sourceとするため、旧shapeをそのまま使用できない。

0.1.14では内部read snapshotを次へ上書きする。

```text
UiReadSnapshot 0.2.0 = {
  committedLifecycle: "empty"|"ready",
  uiRevision: non-negative safe integer,

  worldEngineRuntime:
    null | immutable WorldEngineRuntimeState,

  runInitializationSnapshot:
    null | immutable RunInitializationSnapshot,

  committedValidationStore:
    null | immutable CommittedValidationViewStore,

  mockBattleStore:
    immutable MockBattleSessionStore,

  lastOperationRequestId:
    string|null
}
```

exact top-level key count:

```text
7
```

### 5B.1 lifecycle相関

`committedLifecycle=="empty"`:

```text
uiRevision == 0
worldEngineRuntime == null
runInitializationSnapshot == null
committedValidationStore == null
mockBattleStore.latest == null
lastOperationRequestId == null
```

`committedLifecycle=="ready"`:

```text
worldEngineRuntime != null
runInitializationSnapshot != null
committedValidationStore != null
lastOperationRequestId != null
```

readyではworld runtime / RunInitializationSnapshot / validation storeのsimulation/run identityをstrict cross-referenceする。

### 5B.2 snapshot生成

current committed GET用read snapshotと`updateControl.operationStartReadSnapshot`は**同じUiReadSnapshot 0.2.0 builder**から作る。

builderは1つのcommitted UiSession generationから7 fieldをdeep immutable clone/reference-safe snapshotとして固定する。

長期運用HIST subsystem導入後、ここでいう`deep immutable clone/reference-safe`は**Historical Person payload全件のdeep cloneを意味しない**。current/active runtimeは従来どおりsnapshot-safeに固定する一方、immutable historical storeについては同一generationを指すread-only handle/token/index snapshotを保持してよい。通常GET/weekly stepのたびに死亡者数千～数万件をcloneする実装は禁止する。詳細は`S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md` HIST-037～043。

禁止:

- world runtimeだけoperation-start、RunInitializationSnapshotだけcurrent sessionから読む
- validation/mockだけcurrent mutable storeを参照
- runInitializationSnapshotをpreset registryから再解決
- missing runInitializationSnapshotをcurrent process defaultで補完

### 5B.3 更新中GET

`updateControl != null`の間:

- `GET /simulation`のrun-fixed summary field
- People/Event/Validation/Mockのworld-dependent read
- top-level GET `uiRevision`

は全て同じ`operationStartReadSnapshot` generationを使用する。

WorldSummaryの:

```text
profile/config/catalog/name/spec/hash identity fields
```

は`operationStartReadSnapshot.runInitializationSnapshot`だけから取得する。

更新中にcurrent UiSessionの新commit済み`runInitializationSnapshot`へ差し替えない。

### 5B.4 reset/update race

reset実行中のGETはoperation開始前snapshotを返すため:

- old world
- old RunInitializationSnapshot
- old validation store
- old mock latest
- old uiRevision

が1 generationとして一致する。

reset commit完了後の新GETだけがreset再初期化world / **reset前とcanonical exact同一値のRunInitializationSnapshot** / reset初期validation / latest=null / new revisionを見る。

RunInitializationSnapshot値が前後同一でも、更新中GETはcurrent sessionから読み直さずoperationStartReadSnapshot内のコピーだけを使用する。

### 5B.5 UiSessionState nested type

0.1.13のUiSessionState top-level field setは変更しない。

ただし:

```text
updateControl.operationStartReadSnapshot
```

の型参照は`immutable UiReadSnapshot 0.2.0`へ更新する。

process memory内typeなので旧0.1.0 snapshotとのruntime migrationを行わない。0.1.14 processは0.2.0 snapshotだけを生成する。

### 5B.6 strict snapshot validation

UiReadSnapshot 0.2.0はGET projection前にstrict validateする。

missing/extra/undefined/accessor/prototype/shared-mutable stateを拒否する。

snapshot生成後に元session objectの変更がsnapshot値へ反映される場合はfailure。

---

## 6A. WorldSummaryViewのsource境界

`WorldSummaryView`は1つのDTOだが、source意味論を「run固定」と「current committed state」に分ける。response生成時にpreset registryや失敗中draftから再計算してはならない。

### 6A.1 1つのimmutable read snapshot

`GET /simulation`、各mutation成功response、partial_failure responseでWorldSummaryViewを作るとき、まずそのresponseが指す**1つのimmutable committed UI read snapshot**を確定する。

同じWorldSummaryView内で、worldDateを新snapshot、personCountを旧snapshotのように異なるcommit世代から読むことを禁止する。

物理的なsnapshot/public APIはUI-000のDEFERRED_BINDING **DB-002** とする。

### 6A.2 run固定field

次は現在WorldStateから再導出せず、現在の世界を生成したvalidated `RunInitializationSnapshot`が保持する不変materialから取得する。

```text
seed
  <- RunInitializationSnapshot.seed

initialProfileId
  <- RunInitializationSnapshot.initialWorldConfig.profileId

initialWorldConfigHash
  <- RunInitializationSnapshot.initialWorldConfigHash

nameDataVersion
  <- RunInitializationSnapshot.nameDataVersion

nameDataHash
  <- RunInitializationSnapshot.nameDataHash

simulationIdentityHash
  <- RunInitializationSnapshot.simulationIdentityHash

runRuleSnapshotHash
  <- RunInitializationSnapshot.runRuleSnapshotHash
```

`simulationId`および次のidentity fieldは、同snapshot内のvalidated `simulationIdentity` / `runRuleSnapshot`の正規fieldから直接取得し、相互validator合格を必須とする。

```text
simulationId
sprint1ConfigVersion
sprint1ConfigHash
techniqueCatalogDataVersion
techniqueCatalogHash
simulationIdentitySchemaVersion
specVersions
rngAlgorithmVersion
canonicalJsonVersion
battleProfileAdapterVersion
matchIdGeneratorVersion
initialMatchIdGeneratorStateHash
defaultBattleStrategyVersion
hashAlgorithm
worldCalendarConfigHash
yearStartProcessorManifestHash
runRuleSnapshotSchemaVersion
worldYearStartMonth
```

exact field ownerがSimulationIdentityかRunRuleSnapshotかはDEFERRED_BINDING **DB-020**として、Sprint 1/CAL-JAN-SYNC完成後の正規型をUI-000で1 field 1 sourceへ物理接続する。ただし次の意味論は固定する。

- `sprint1ConfigVersion/hash`、TechniqueCatalog identityは現在runに固定されたRunRuleSnapshot側の値
- `worldYearStartMonth`は現在runに固定されたRunRuleSnapshot内WorldCalendarConfigの値
- `worldCalendarConfigHash`と`yearStartProcessorManifestHash`は同run identity/snapshotのcross-reference済み値
- `initialMatchIdGeneratorStateHash`はrun開始時stateのhashであり、現在のMatchId generator state hashへ置換しない
- `specVersions`はcurrent processの最新版一覧ではなく、当該runのSimulationIdentityに記録された配列

禁止:

- `GET /presets` registryからsummary identityを再解決
- process起動時の「現在config」を使用
- run開始後に更新されたfile/catalogからversion/hashを再計算
- current MatchId stateから`initialMatchIdGeneratorStateHash`を再計算
- 現在Sprint仕様版で`specVersions`を上書き

RunInitializationSnapshotとcommitted runtimeのsimulationId / identity hash / run-rule hash cross-referenceが一致しない場合は500 `INTERNAL_ERROR`であり、片方を正として自動修復しない。

### 6A.3 current committed field

次だけは同responseのimmutable committed runtime snapshotから直接取得する。

```text
worldDate
elapsedWeeks
personCount
```

`worldDate`:
- committed canonical WorldDateを`WorldDateView`へfield名だけmapする
- `week = canonical weekOfMonth`等、CAL-JAN-SYNC後の最終field名はDEFERRED_BINDING **DB-003**
- 日付をEvent末尾やlastOperationから推測しない

`elapsedWeeks`:
- §14どおりcommitted canonical `WorldDate.absoluteWeek`と同一値
- runtime側に保持値と再計算値の両方がある場合は正規validator一致を必須とし、UIがどちらかへfallbackしない

`personCount`:
- logical worldに存在するactive + historicalの**全Person件数**
- living/deceased、career、participationでfilterしない
- UI一覧filter後件数や`population.totalLiving`を使わない
- 現Sprint 1 monolithic storeではcanonical Person collection件数を使用してよい
- Historical partition導入後はvalidated maintained counter / PersonDirectory countを使用してよく、`GET /simulation`ごとにarchive全payloadをmaterialize/scanして数えない
- explicit full audit時はcounter/indexと実record数をcross-checkする
- duplicate PersonId / directory invariant failureはCurrent state integrity failureとして扱い、UI dedupeで補正しない

current Sprint 1 canonical Person collectionの最終物理pathはDEFERRED_BINDING **DB-004**。Historical partition後のlogical PersonDirectoryはHIST-009/042に従う。

### 6A.4 mutation別summary時点

`POST /simulation/start`成功:
- 新世界とRunInitializationSnapshotを原子的に置換した**後**のcommitted snapshot
- 旧世界summaryを返さない

`POST /simulation/reset`成功:
- 保存済みRunInitializationSnapshotをexact維持したままworldを再初期化し、原子的にcommitした**後**の新しいcommitted world snapshot
- summaryのrun固定fieldはreset前とcanonical exact同一のRunInitializationSnapshot値から取得
- worldDate/personCount/elapsedWeeksはreset再初期化後runtimeから取得
- reset前worldDate/personCountを返さない

`POST /simulation/step` success:
- `requestedWeeks`全件commit後の最終snapshot

`POST /simulation/step` partial_failure:
- `committedWeeks`件目までの最後の成功commit snapshot
- `committedWeeks=0`なら要求開始時の既存committed snapshot
- failure週のdraft state / draft RNG / candidate event / candidate person updateをsummaryへ一切混ぜない
- 既存契約どおり`failedWeek.worldDateBeforeStep == summary.worldDate`

mutation responseをjournalへ保存した後の別操作による新revisionを読み直してsummaryを書き換えてはならない。

---

## 6B. SimulationMutationView.failedWeek.validation

0.1.13の`failedWeek.validation: CanonicalObject[]`は、CommittedValidationViewStoreの保存済みresultsではない。

### 6B.1 source

partial failureを返した**その失敗週のpublic one-week/multi-week facade failure branchが返す、非commit validation result collection**を唯一sourceとする。

- 元collection順を維持
- 各itemをvalidated canonical clone
- 1件以上
- 少なくとも1 itemはgeneric `ok=false`
- committed前週のValidationResultを混ぜない
- CommittedValidationViewStoreから同じweekらしいitemを検索して再構成しない
- failed weekはrollback済みなので、このcollectionをCommittedValidationViewStoreへ保存しない

### 6B.2 physical shape gate

Sprint 1完成時の公開facadeが:

- failure validation collectionを公開しない
- generic ValidationResultではなくissuesだけを返す
- single resultだけで配列契約が存在しない
- 正規順序を復元不能
- canonical clone不能

のいずれかである場合、UI-000でwrapperやsynthetic ValidationResultを発明しない。

DEFERRED_BINDING **DB-013** 不成立 → `spec_fix_required`としてSprint 1.5仕様を版上げする。

### 6B.3 result validation

各itemについて§10Aのgeneric validation contractを適用する。

failure branchであるため、collection全体として`ok=false`が最低1件必要。

`ok=true` itemが同じ正規failure collectionに実際に含まれることは許容するが、UI側で除去・並べ替えしない。

APIのStableErrorCode、BattleFailureInfo等をこのarrayへ混入しない。

1週要求のdomain failureが422 error envelopeになる既存契約は変更しない。`failedWeek.validation`は`requestedWeeks>=2`のpartial_failureだけに存在する。

---


## 6C. PersonDetailView.statHistory

0.1.13の「安全に算出できる場合だけobject」という条件を実装者判断にしない。本追補ではSprint 1.5実装前gateとruntime契約を固定する。

### 6C.1 前提gate

Sprint 1完成commitに対してUI-000で`ABILITY-MUTATION-MAP`を作成し、canonical Person ability `surfaceValue`をcommit時に変更し得る全producerを列挙する。

current Sprint 1正本で期待するmutatorは:

```text
weekly training
  -> training.stat_growth_applied
```

だけである。

UI-000でこれ以外の正規ability mutatorを1件でも発見した場合、UI側で無視・推測集計せず`spec_fix_required`でSTOPし、Sprint 1.5仕様を版上げする。

`ABILITY-MUTATION-MAP`がcompleteであることをGATE対象とする。

### 6C.2 ready sessionでのnull禁止

UI-000が上記complete mapとrun全期間のcommitted Event Stream query sourceを接続できた場合、正常な`ready` sessionのPersonDetailでは:

```text
statHistory != null
```

を必須とする。

runtimeでEvent Streamまたは対象eventに破損/欠落を検出した場合、`statHistory=null`へ劣化200を返さず500 `INTERNAL_ERROR`。

`empty`ではPersonDetail endpoint自体を返さないためstatHistory分岐は存在しない。

Sprint 1完成時に完全sourceへ接続不能なら、UI-000で`spec_fix_required`とし、`null`実装で先へ進まない。

### 6C.3 event source

対象personIdについて、run開始からresponse対象committed snapshotの`WorldDate.absoluteWeek=W`までにcommitされた全:

```text
training.stat_growth_applied
```

EventEnvelopeをsequence昇順で取得する。

各eventは正規`EventEnvelope` validatorおよび当該eventType payload validatorの**全条件**に合格したうえで、statHistory用途としてさらに次をすべて満たさなければならない。

- `event.sourceProcessor == DB-011でbindingしたweekly training processor literal`
- `entities.personIds`に対象personIdを含む
- payload.personIdが存在するcurrent contractでは同じpersonId
- payload.targetStatが6 abilityのいずれか
- payload.before / payload.afterがnon-negative safe integer
- `after >= before`
- event worldDate.absoluteWeekが`0..W`

1条件でも不一致なら、そのeventを集計対象から黙って外さず500とする。

`training.stat_growth_applied`というeventType名だけでweekly training由来と推測しない。DB-011以外のsourceProcessorで同eventTypeが現れた場合はproducer integrity failureとして500。

`appliedMilliPoints`、remainder、factorBreakdownをStatSetView deltaへ加算しない。表示用surface deltaは常に:

```text
surfaceDelta = payload.after - payload.before
```

とする。

### 6C.4 statごとのchain validation

6 statを固定順:

```text
stamina
strength
skill
speed
spirit
magic
```

で処理する。

各statのevent列をsequence昇順`E[0..n-1]`とする。

`n == 0`:

```text
initial[stat] = current[stat]
last48WeeksDelta[stat] = 0
lastWeekDelta[stat] = 0
```

`n > 0`:

```text
initial[stat] = E[0].payload.before
```

かつ全隣接eventで:

```text
E[i].payload.after == E[i+1].payload.before
```

を必須とする。

最後のevent:

```text
E[n-1].payload.after == currentPerson.stats[stat].surfaceValue
```

を必須とする。

不一致を差分計算で相殺して正常化しない。500とする。

### 6C.5 current

```text
current
  = PersonDetailView.stats
```

すなわち同じimmutable read snapshotにあるcanonical Person `surfaceValue` 6項目。

Event Stream末尾からcurrentを作らない。

### 6C.6 last48WeeksDelta

```text
windowStart = max(0, W - 47)
```

各stat:

```text
sum(
  event.payload.after - event.payload.before
  where windowStart <= event.worldDate.absoluteWeek <= W
)
```

safe integer overflowを拒否する。

### 6C.7 lastWeekDelta

各stat:

```text
sum(
  event.payload.after - event.payload.before
  where event.worldDate.absoluteWeek == W
)
```

UI側で「最後にeventが発生した週」をlastWeekとして扱わない。現在absoluteWeek `W`だけを指す。

### 6C.8 exact wire

```text
statHistory = {
  initial: StatSetView,
  current: StatSetView,
  last48WeeksDelta: StatSetView,
  lastWeekDelta: StatSetView
}
```

全StatSetViewは6 keyすべて必須。unknown key禁止。

`initial + 累積全delta == current`を各statでsafe-integer exact検証する。

丸め、average、basis-points化をしない。

---

## 6D. PersonDetailView Sprint1PersonState direct binding

正常な`ready` worldでは、Sprint 1初期化済みの全Personがvalidated `sprint1State`を保持していることを前提とする。

PersonDetailViewの次のfieldは、同じimmutable committed Person snapshotの`Person.sprint1State`だけを唯一sourceとする。

```text
currentMental
  <- Person.sprint1State.currentMental

learningFocusTechniqueId
  <- Person.sprint1State.learningFocusTechniqueId

techniques
  <- Person.sprint1State.techniqueStates
```

Event Stream、TrainingHistory、BattleResult、直近operation、TechniqueCatalogの定義一覧から現在値を再構成しない。

### 6D.1 missing state

ready sessionのcanonical Personに`sprint1State` own propertyが存在しない、または`validateSprint1PersonState`相当が失敗する場合:

```text
HTTP 500
error.code = INTERNAL_ERROR
commitState = none
```

とする。

`createInitialSprint1PersonState`でGET時に補完しない。

archive activation前のcurrent Sprint 1 monolithic storeでは、deceased / waiting / stoppedを理由にmissing stateを許可しない。Sprint 1 weekly contract上のinactive Personも正規Sprint1PersonStateを保持する。

このcontractは「死亡後もactive weekly state objectとして毎週処理し続ける」ことを長期正本化しない。Historical partition導入時は死亡時点の最終Sprint1PersonState相当をHistorical payload/historyとして保持しつつ、active weekly processing membershipから外す（HIST-003～006/044/055）。

### 6D.2 currentMental

`currentMental`は保存値をそのまま返す。

Personの`spirit.surfaceValue`から最大mentalを再導出して、その最大値で上書きしない。

ただし正規Sprint1PersonState validatorが`spirit.surfaceValue` contextとの範囲整合を検証した後の値だけを表示する。

### 6D.3 learningFocusTechniqueId

値は:

```text
TechniqueId | null
```

をそのまま返す。

表示時に:

- acquiredならnullへ自動変換
- TechniqueCatalog先頭候補へfallback
- techniqueStates先頭へfallback
- 現在週のplanner結果から推測

してはならない。

Sprint 1の正規technique semantics validatorでcatalog membership等を検証し、不整合なら500。

### 6D.4 techniques

`Person.sprint1State.techniqueStates`の各entryだけをTechniqueViewへ変換する。

TechniqueCatalogに存在するがPersonTechniqueStateが存在しないTechniqueDefinitionを、progress=0/mastery=0のTechniqueViewとして追加しない。

配列順:

```text
techniqueId asc
```

同一TechniqueId重複は正規validator errorであり、UIでdedupeしない。

各entryは§8のPersonTechniqueState領域へ1対1 mapし、同じTechniqueIdのvalidated TechniqueDefinitionを`definition`へ付ける。

catalogにdefinitionがないstate、またはdefinition/state semantic validation失敗は500。

### 6D.5 learnedTechniqueCountとのcross-reference

PersonListItemView:

```text
learnedTechniqueCount
  = count(Person.sprint1State.techniqueStates where acquiredAbsoluteWeek != null)
```

PersonDetailView.techniquesについても:

```text
count(techniques where learnedState == "acquired")
  == learnedTechniqueCount相当の同一source再計算値
```

とする。

一覧と詳細が同じ`uiRevision`で同一Personを指す場合、習得件数が一致しなければならない。

異なるrevisionのresponseを比較して不一致扱いしない。

---

## 6E. PersonDetailView.qualifiedMaster

`qualifiedMaster`はcanonical Personの必須booleanであり、正式師匠関係・修行入力の妥当性確認に必要な正規状態である。PersonDetailView 0.2.0へ次を追加する。

```text
qualifiedMaster: boolean
```

source:

```text
PersonDetailView.qualifiedMaster
  <- canonical Person.qualifiedMaster
```

同じimmutable committed Person snapshotから直接取得する。

### 6E.1 推測禁止

次から`qualifiedMaster`を再計算・推測しない。

- currentRank
- highestRank
- retirementRank
- formalMasterPersonIdsに登場するか
- lineageId
- age
- Event Stream
- weekly training context
- BattleResult

rankや関係からUI側でtrue/falseを補完しない。

### 6E.2 current Sprint 1 invariant表示

current Sprint 1正本では:

```text
careerStatus == "child"
  -> qualifiedMaster == false

careerStatus == "trainee"
  -> qualifiedMaster == false

careerStatus == "active_competitor"
  -> qualifiedMaster == false

careerStatus == "retired"
  -> qualifiedMaster == canonical stored boolean
```

living/deceasedの双方で同じcareer ruleを適用する。

これはUIが導出する式ではなく、canonical Person validatorが合格していることを確認するためのcross-referenceである。

PersonDetail mapping時にこの不変条件が破れている場合は値をfalseへ補正せず500 `INTERNAL_ERROR`。

### 6E.3 formal master cross-reference

`formalMasterPersonIds`の各master PersonIdは、canonical world relationship validatorが許可する正規Personを参照しなければならない。

current world contractがformal masterに`qualifiedMaster=true`を要求する場合、UI-000でそのworld validator/testへ物理接続し、PersonDetailを作るときもcanonical world validation合格を前提にする。

ただしUI adapter自身が:

```text
formalMasterPersonIdsに登場した
-> qualifiedMaster=trueへ上書き
```

してはならない。

sourceは常にPerson自身の保存boolean。

### 6E.4 表示

人物詳細に:

```text
Qualified Master: true|false
```

相当の固定表示項目を設ける。

人物一覧へは0.2.0では追加しない。
一覧filter/sort条件にも追加しない。

将来一覧filter/sortが必要になった場合はAPI schemaを版上げする。

---

## 6F. Person wire DTO 0.2.0 完全型

0.1.13のPerson DTOと本追補の差分条項を実装時に再合成させない。0.2.0ではこの節をPerson wire型の**完全な最終宣言**とする。

この節にない旧Person wire fieldは0.2.0に存在しない。

### 6F.1 共通type

```text
Rank =
  | "F"|"E"|"D"|"C"|"B"|"A"|"S"

StatSetView = {
  stamina: number,
  strength: number,
  skill: number,
  speed: number,
  spirit: number,
  magic: number
}

AptitudeSetView = {
  unarmed: number,
  sword: number,
  magic: number
}

TemporaryConditionView = {
  fatigue: integer 0..100,
  injury: integer 0..100,
  condition: integer -20..20,
  confidence: integer -20..20
}
```

`StatSetView` / `AptitudeSetView`は§6.3どおりsurfaceValueだけ。

### 6F.2 PersonListItemView 0.2.0

```text
PersonListItemView 0.2.0 = {
  personId: string,
  displayName: string,

  lifeStatus: "living"|"deceased",
  participationStatus: "waiting"|"active"|"stopped"|null,
  careerStatus: "child"|"trainee"|"active_competitor"|"retired",

  age: Age|null,
  deathYear: integer|null,
  ageAtDeath: Age|null,

  familyId: string,
  lineageId: string|null,

  currentRank: Rank|null,
  highestRank: Rank|null,
  retirementRank: Rank|null,

  stats: StatSetView,
  aptitudes: AptitudeSetView,

  learnedTechniqueCount: non-negative safe integer
}
```

exact key count:

```text
16
```

0.2.0では次を持たない。

```text
affiliationLabels
overallRank
birthYear
qualifiedMaster
parentPersonIds
formalMasterPersonIds
temporaryCondition
currentMental
learningFocusTechniqueId
statHistory
techniques
trainingHistory
```

これらのうち詳細用fieldを一覧へ勝手に追加しない。

### 6F.3 PersonDetailView 0.2.0

```text
PersonDetailView 0.2.0 = {
  personId: string,
  displayName: string,

  lifeStatus: "living"|"deceased",
  participationStatus: "waiting"|"active"|"stopped"|null,
  careerStatus: "child"|"trainee"|"active_competitor"|"retired",

  birthYear: integer,
  age: Age|null,
  deathYear: integer|null,
  ageAtDeath: Age|null,

  familyId: string,
  lineageId: string|null,

  currentRank: Rank|null,
  highestRank: Rank|null,
  retirementRank: Rank|null,
  qualifiedMaster: boolean,

  parentPersonIds: string[],
  formalMasterPersonIds: string[],

  stats: StatSetView,
  aptitudes: AptitudeSetView,

  temporaryCondition: TemporaryConditionView,
  currentMental: non-negative safe integer,
  learningFocusTechniqueId: string|null,

  statHistory: {
    initial: StatSetView,
    current: StatSetView,
    last48WeeksDelta: StatSetView,
    lastWeekDelta: StatSetView
  },

  techniques: TechniqueView[],

  trainingHistory: {
    available: true,
    items: TrainingHistoryItemView[]
  }
}
```

exact key count:

```text
25
```

0.2.0では次を持たない。

```text
affiliationLabels
overallRank
mentorPersonId
instructorPersonId
battleDecisionProfile
injuryProneness
```

### 6F.4 statHistory非nullの理由

PersonDetail endpointはready lifecycleでしか200を返さない。

さらにUI-001開始条件として§6Cの:

- complete ABILITY-MUTATION-MAP
- run全期間Event Stream source
- chain validation source

をUI-000で接続済みにする。

したがって0.2.0の正常200 responseでは`statHistory`をnullableにしない。

current/active 0.2.0 source破損・欠落は:

```text
500 INTERNAL_ERROR
```

であり`statHistory=null`の劣化200ではない。

ただしこのstrict ruleはHistorical archive readerへ一般化しない。Historical PersonではstatHistory sectionだけがcorruptedなら、そのsectionをunavailableとして他の独立valid field/sectionを表示継続できる将来versioned read contractをHIST-025～030に従って用意する。

### 6F.5 trainingHistory.available

同じ理由で、UI-000のtraining history source gateを通過した正常ready responseでは:

```text
trainingHistory.available = true
```

だけを許可する。

`false`は0.2.0の正常200 wire値ではない。

Event source不全を`available=false`で隠さず500またはUI-000 STOPとする。

将来「履歴機能をoptional capabilityとして動的無効化する」要件を入れる場合はAPI schemaを版上げする。

### 6F.6 strict output validation

PersonListItemView / PersonDetailViewのDTO builderは、返却直前にexact key setをstrict検証する。

- missing key禁止
- unknown key禁止
- accessor/prototype object禁止
- optional fieldを`undefined`で残さない
- nullable fieldは`null`を明示
- arrayはdense
- source array/objectをmutationしない

PersonList/Detailのcanonical JSON比較ではobject key order自体を意味に使わない。

### 6F.7 list/detail cross-reference

同じ`uiRevision`の同一Personについて、重複fieldはexact一致する。

```text
personId
displayName
lifeStatus
participationStatus
careerStatus
age
deathYear
ageAtDeath
familyId
lineageId
currentRank
highestRank
retirementRank
stats
aptitudes
learnedTechniqueCount相当
```

最後の`learnedTechniqueCount相当`は:

```text
list.learnedTechniqueCount
==
count(detail.techniques where learnedState=="acquired")
```

とする。

detailだけに存在するfieldをlistへ補完しない。

### 6F.8 Historical Person read compatibility

0.2.0 `PersonListItemView` / `PersonDetailView`はcurrent Sprint 1 monolithic canonical Person sourceをstrict表示するschemaであり、Historical archiveのpartial-corruption read schemaを固定するものではない。

Historical subsystem導入後は:

- active/current Personはstrict path
- historical PersonはHIST-025～030のlocal degradation / field-level salvage path

へ分離する。

Historical recordの一部が壊れている場合に、0.2.0 exact25を維持するため全部500へ落とす設計を長期正本にしない。一方、現0.2.0へ場当たり的optional fieldを追加してpartial statusを表現することもしない。Historical wire表現はAPI schema versionを上げるか専用endpoint/read contractで定義する。

例:

```text
父relationship = valid
父displayName  = independently valid
父stats        = corrupted

=> 父名は表示可能
=> stats sectionだけunavailable
=> 家系図/Person全体500へ昇格しない
```

---

## 6G. temporaryCondition / currentMental 数値境界

### 6G.1 temporaryCondition

wireは§6Fのexact rangeを使用する。

```text
fatigue    : integer 0..100
injury     : integer 0..100
condition  : integer -20..20
confidence : integer -20..20
```

source値はS01-008後のcommitted canonical `PersonTemporaryCondition`を正規validatorへ通した値そのもの。

UI adapterで:

- clamp
- round
- percent換算
- absolute value
- default 0

を行わない。

範囲外・decimal・NaN/Infinity相当・unknown/missing keyは500 `INTERNAL_ERROR`。

### 6G.2 currentMental

`currentMental`はintegerで、同じPerson snapshotの:

```text
0 <= currentMental <= 50 + stats.spirit
```

を満たす。

ここで`stats.spirit`はPersonDetailViewへmapしたcanonical `spirit.surfaceValue`と同一値。

正規`validateSprint1PersonState`相当へ:

```text
{ spiritSurfaceValue: stats.spirit }
```

のcontextを渡して成功した値だけを返す。

上限`50 + stats.spirit`は**表示用に再計算して保存値を置換する式ではない**。保存`currentMental`の整合確認だけに使用する。

例:

```text
spirit=50 -> currentMental 0..100
```

decimal、負数、上限+1は500。

### 6G.3 cross-field source generation

`temporaryCondition`と`currentMental/stats.spirit`は同じUiReadSnapshotの同じPerson generationから取得する。

temporaryConditionだけ最新commit、Person/sprint1StateだけoperationStart snapshot等のmixed-generation mappingを禁止する。

S01-008の正規integration recordがPersonとtemporaryConditionを別collectionで保持する場合も、PersonIdとcommitted revision/world-state identityでcross-referenceして同一generationを証明する。

---

## 6H. SimulationMutationView 0.2.0 完全型

0.1.13の型・相関契約と、本追補§6A/6Bのsource契約を1か所へ統合する。0.2.0ではこの節をSimulationMutationViewの完全宣言とする。

```text
SimulationMutationView 0.2.0 = {
  acceptedUiRevision: non-negative safe integer,
  completedUiRevision: non-negative safe integer,

  operation: "start"|"step"|"reset",
  outcome: "success"|"partial_failure",

  requestedWeeks: non-negative safe integer,
  committedWeeks: non-negative safe integer,

  failedWeek: null|{
    requestWeekIndex: positive safe integer,
    worldDateBeforeStep: WorldDateView,
    validation: CanonicalObject[]
  },

  eventCount: non-negative safe integer,
  statIncreaseCount: non-negative safe integer,
  techniqueLearnedCount: non-negative safe integer,
  validationResultCount: non-negative safe integer,
  mockBattleCount: 0,

  durationMs: non-negative safe integer,
  summary: WorldSummaryView
}
```

exact top-level key count:

```text
14
```

`failedWeek`がnon-nullの場合、そのnested key countはexactに3。

missing/unknown/`undefined` keyを禁止する。

### 6H.1 start / reset

```text
operation == "start" | "reset"

outcome == "success"
requestedWeeks == 0
committedWeeks == 0
failedWeek == null
completedUiRevision == acceptedUiRevision + 1
```

start/resetの正規operationで`partial_failure`を作らない。

`completedUiRevision`加算不能ならcommit前INTERNAL_ERROR。

### 6H.2 step success

```text
operation == "step"
outcome == "success"
requestedWeeks >= 1
committedWeeks == requestedWeeks
failedWeek == null
completedUiRevision == acceptedUiRevision + committedWeeks
```

### 6H.3 step partial_failure

```text
operation == "step"
outcome == "partial_failure"
requestedWeeks >= 2
0 <= committedWeeks < requestedWeeks
failedWeek != null
failedWeek.requestWeekIndex == committedWeeks + 1
failedWeek.validation.length >= 1
failedWeek.worldDateBeforeStep == summary.worldDate
completedUiRevision == acceptedUiRevision + committedWeeks
```

`failedWeek.validation`は§6Bの非commit正規failure collection。

1週要求のdomain failureはこのDTOへ変換せず、0.1.13の422 error envelopeを使用する。

### 6H.4 counts

4件数の正本は0.1.13の既存契約を維持する。

```text
eventCount
statIncreaseCount
techniqueLearnedCount
validationResultCount
```

start/reset/stepそれぞれ、**当該operationで実際にcommitされた分だけ**を数える。

partial_failureではfailure週のdraft/event/validation/effectを1件も含めない。

`mockBattleCount`は正規world進行operationでは常にliteral `0`。

件数をsummary/Event Stream全期間の差分から後付け推測しない。operation commit transactionが保持する正規receipt/aggregate sourceへDEFERRED_BINDING **DB-005**する。

UI-000で4件数すべてについて「source field/public receipt/test」を1件ずつ固定する。

### 6H.5 summary generation

`summary`は§6Aの同一committed generationだけをsourceにする。

- start/reset success: 新しくcommitされた初期world
- step success: 最後のrequested week commit後
- step partial: 最後の成功週commit後。committedWeeks=0ならoperation開始時snapshot

failure週draftをsummaryへ混ぜない。

### 6H.6 duration / journal

`durationMs`は0.1.13のmonotonic契約。

HTTP 200 response bodyをcompleted request journalへ保存した後、同requestId再送時はSimulationMutationViewを再計算しない。

`GET /simulation.data.lastOperation`は0.1.13どおり、fixed UiReadSnapshot.lastOperationRequestIdが参照する成功200 journal responseをstrict revalidationして得た`data`を返す。別DTOを二重保存しない。`GET /session` dataへlastOperationを複製しない。

同一API-006 responseでは:

```text
summary
  <- fixed UiReadSnapshotのworld/run initialization generation

lastOperation
  <- 同じfixed UiReadSnapshot.lastOperationRequestId
     が指すcompleted journal HTTP200 mutation data
```

update中にcurrent UiSession.lastOperationRequestIdへ読み替えない。

参照recordが欠落・non-200・schema不一致・対象dataがSimulationMutationView/MockBattleMutationViewでない場合はAPI-006全体を500 `INTERNAL_ERROR`とし、`lastOperation=null`へ劣化しない。

### 6H.7 strict cross-field validation

DTOをserializeする前に、14 top-level fieldと上記operation/outcome相関を全部検証する。

たとえば:

- start + requestedWeeks=1
- reset + partial_failure
- step success + committed<requested
- partial + failedWeek=null
- completedUiRevision不一致
- mockBattleCount!=0

をUI adapterで補正して返さない。INTERNAL_ERROR。

---

## 6I. Person age source / cross-view consistency

PersonList / PersonDetail / MockBattleCandidateで年齢を別々に計算しない。

### 6I.1 living Person

同じUiReadSnapshotのliving Personについて:

```text
PersonListItemView.age
  = Person.currentAge

PersonDetailView.age
  = Person.currentAge

MockBattleCandidateView.age
  = Person.currentAge
```

wire生成前に正規Sprint 1年齢関数を使って:

```text
Person.currentAge
  == computeCurrentAge(snapshot.worldDate.year, Person.birthYear)
```

を必須cross-checkする。

`computeCurrentAge`の最終public symbol/moduleはDB-007のbinding evidenceへ含める。

正規式はvalidation専用であり、wire builderが`currentAge`を無視して再計算値だけを返してはならない。

不一致は500 `INTERNAL_ERROR`。保存値を再計算値で補正しない。

### 6I.2 deceased Person

0.1.13の既存null contractを維持する。

```text
PersonListItemView.age   = null
PersonDetailView.age     = null
```

`deathYear` / `ageAtDeath`はcanonical deceased Personの保存fieldをdirect projectionする。

UI側で:

- current world yearから故人のageを再計算
- deathYear/birthYearからageAtDeathを新規計算
- living時のcurrentAgeを履歴推測

してはならない。

archive activation前のcurrent 0.2.0 pathではcanonical deceased Person validatorのdeathYear/ageAtDeath相関を適用し、invalidなら500。

Historical readerではrecord全体のcoarse corruptionだけを理由に独立validなdisplayName/relationship/date fieldまで隠さない。death fields自体がinvalidならそのfield/sectionをunavailableとして扱う将来versioned contractをHIST-025～030/051に従って定義する。

### 6I.3 participationStatus

lifeStatusとの0.1.13既存null相関を維持する。

living:
- canonical participationStatusをdirect projection

deceased:
- wire participationStatusはnull

deceasedへ最後のparticipation statusを推測表示しない。

### 6I.4 same revision cross-view

同一`uiRevision`の同一living Personが:

- People list
- Person detail
- Mock candidates（eligibleな場合）

に現れるとき、`personId/displayName/age/careerStatus`の重複fieldはexact一致する。

候補endpointがageを再計算してlist/detailと値が異なることを禁止する。

### 6I.5 update中read snapshot

更新中GETでは3 endpointとも0.1.13の`operationStartReadSnapshot`からPerson/worldDateを読む。

Person.currentAgeだけ更新前、worldDateだけ更新後のmixed-generation cross-checkをしない。

---
## 6. PersonListItemView / PersonDetailView source mapping

### 6.1 UI独自合成fieldの廃止

current contractから次を廃止する。

- `affiliationLabels`
- `overallRank`
- singular `mentorPersonId`

UIが「所属」や「総合ランク」を独自合成してはならない。

### 6.2 rank

```text
Rank = "F"|"E"|"D"|"C"|"B"|"A"|"S"
```

PersonListItemView / PersonDetailViewの両方に次を持たせる。

```text
familyId: string
lineageId: string|null
currentRank: Rank|null
highestRank: Rank|null
retirementRank: Rank|null
```

canonical Personのlife/career discriminated unionをnullable wireへ投影するだけとする。

`PersonListItemView.displayName` / `PersonDetailView.displayName`はcanonical `Person.displayName`から直接取得し、givenName/familyNameをUIで再結合しない。

`familyId`はcanonical Personの必須fieldから直接取得する。

`lineageId`はcanonical Personではoptional own propertyである。wireでは:

```text
PersonがlineageId own propertyを持つ -> そのLineageId
PersonがlineageId own propertyを持たない -> null
```

とする。canonical Personへ`lineageId:null`を逆書きしたり、familyId等からlineageを推測したりしない。

```text
living active_competitor:
  currentRank    = Person.currentRank
  highestRank    = Person.highestRank
  retirementRank = null

deceased active_competitor:
  currentRank    = null
  highestRank    = Person.highestRank
  retirementRank = null

living/deceased retired:
  currentRank    = null
  highestRank    = Person.highestRank
  retirementRank = Person.retirementRank

child / trainee:
  currentRank    = null
  highestRank    = null
  retirementRank = null
```

canonical Person validatorに反する組合せをUIで補正しない。response生成時にINTERNAL_ERRORとする。

### 6.3 abilities / aptitudes

一覧・詳細・sort/filterに使用する能力/適性値はcanonical `StatValueTriple.surfaceValue`だけ。

禁止:

- expressedGeneticValue
- latentGeneticValue
- 複数値の平均
- UI独自補正

### 6.4 temporaryCondition

PersonDetailViewへ次を追加する。

```text
temporaryCondition = {
  fatigue: number,
  injury: number,
  condition: number,
  confidence: number
}
```

ここで`PersonTemporaryCondition`はPerson rootの永続fieldとはみなさない。Sprint 1では独立したvalidated value objectであり、WorldStateへの最終配線はS01-008側で確定する。

Sprint 1.5は、S01-008完了後の**committed canonical World integration record**が保持する正規`PersonTemporaryCondition`を1正本として、その同名4fieldを直接取得する。

その最終物理pathはSprint 1完成前には確定できないためDEFERRED_BINDING **DB-006**とする。

UI-000時点で正規committed sourceが存在しない、または複数の競合sourceが存在する場合は`SPEC_UNDEFINED`として`spec_fix_required`でSTOPする。Person本体、BattleResult、直近event、初期値等からUI独自に復元・defaultしてはならない。

丸め、percent化、表示補正をしない。

`currentMental`は既存どおりSprint1PersonState由来の別fieldとして維持する。

`battleDecisionProfile`および`injuryProneness`はPerson固有永続fieldとしてPersonDetailへ追加しない。

---


## 6J. start/resetのworld-scoped置換とsession-scoped保持

0.1.13のUiSession lifecycleを維持したまま、start/reset成功時の各保存物の扱いを0.1.14で横断固定する。

### 6J.1 scope分類

**world-scoped**:

- `worldEngineRuntime`
- `RunInitializationSnapshot`
- `CommittedValidationViewStore`
- `MockBattleSessionStore.latest`
- current simulationId / run identity
- current world read snapshot

**session/process-scoped**:

- `sessionId` / session cookie binding
- CSRF secret/token
- cursor HMAC/session binding secret
- request journal
- process-local serverInstanceId/errorCounter
- `uiRevision` counter自体
- update lock/control infrastructure

start/resetでこの2 scopeを混同しない。

### 6J.2 start成功

0.1.13正本では`POST /simulation/start`だけが:

```text
committedLifecycle == "empty"
または
committedLifecycle == "ready"
```

の両方で許可される。

したがってstartは:

```text
empty -> ready
ready -> ready
```

の2経路を持つ。

#### 6J.2.1 empty -> ready

accepted start requestのpreset/seed等から**新しいrun**を構築し、1つのsession commit境界で:

1. new world runtime
2. new RunInitializationSnapshot
3. new run initial ValidationResultだけを持つCommittedValidationViewStore
4. `MockBattleSessionStore.latest = null`
5. `uiRevision = acceptedUiRevision + 1`
6. successful start responseをcompleted journalへ保存
7. `lastOperationRequestId = start requestId`

を不可分確定する。

empty invariant上、start直前のvalid mock latest / old world / old RunInitializationSnapshot / validation store / lastOperationは存在しない。

過去のfailed start journal recordだけが存在していても、新start成功でそのjournalを消さない。

#### 6J.2.2 ready -> ready

readyでacceptedされたstartは**current runの継続・resetではなく、新しいstart request inputから別のnew runへ置換するoperation**。

1つのsession commit境界で:

1. accepted start requestのpreset/seed等からnew world runtimeを構築
2. そのnew run用の**new RunInitializationSnapshot**を生成・strict validate
3. CommittedValidationViewStoreをnew run initial ValidationResultだけへ置換
4. `MockBattleSessionStore.latest = null`
5. `uiRevision = acceptedUiRevision + 1`
6. successful start responseをcompleted journalへ保存
7. `lastOperationRequestId = start requestId`

を不可分確定する。

ready-startでは旧:

- world runtime
- RunInitializationSnapshot
- validation store
- mock latest / replaySnapshot

をnew runへ持ち越さない。

ただしsession/process scopeの:

- sessionId / cookie binding
- CSRF material
- cursor HMAC key / sessionBindingKey
- request journal
- process serverInstanceId/errorCounter
- uiRevision counter

は保持する。

uiRevisionを0へ戻さない。

#### 6J.2.3 startとresetの決定的差

```text
start:
  accepted start request inputから
  NEW RunInitializationSnapshotを確定する

reset:
  CURRENT saved RunInitializationSnapshotだけを使い
  そのcanonical valueをexact維持する
```

start-readyでold RunInitializationSnapshotをresetのように再利用しない。
resetでnew start requestのpreset/seed/defaultを読み込まない。

#### 6J.2.4 ready-start failure

application-level failure responseはcommit前`commitState=none`だけ。

- old world
- old RunInitializationSnapshot
- old validation store
- old mock latest
- old uiRevision
- old lastOperation

をexact保持する。

new world/new RunInitializationSnapshot/new validation/latest=null/HTTP200 bytesを全部事前構築・検証してから1 atomic commitする。

commit成功後のtransport failureはnew runをrollbackせず、saved HTTP200 start responseをsame requestIdでexact replayする。

`commitState=partial|complete`のstart error responseは禁止。

#### 6J.2.5 ready-start中GET

`updateControl.operationKind=="start"`かつoperation開始時がreadyなら、更新中GETは`operationStartReadSnapshot`の**old run**だけを見る。

new runの:

- world
- RunInitializationSnapshot
- validation
- latest=null
- new revision

をcommit完了前に混ぜない。

commit完了後の新GETだけがnew run generationを見る。

### 6J.3 reset成功

resetはready worldを新しい初期worldへ置換するoperation。

reset successは**reset開始時点で保存済みの同一`RunInitializationSnapshot`値だけ**から初期化入力を再構築し、1つのsession commit境界で:

1. 既存RunInitializationSnapshotから再構築・検証した初期world runtimeへ置換
2. `RunInitializationSnapshot`はreset前のvalidated canonical valueをexact維持
3. CommittedValidationViewStoreをreset初期化で得たValidationResultだけへ置換
4. `MockBattleSessionStore.latest = null`
5. `uiRevision = acceptedUiRevision + 1`
6. successful reset responseをcompleted journalへ保存
7. `lastOperationRequestId = reset requestId`

を不可分確定する。

resetでpreset registry、元設定file、process current default、ブラウザmetadataを再読込しない。
resetでRunInitializationSnapshotを再生成・再hash・current versionへupgradeしない。

old mock latestをreset後worldへ付け替えない。
old replaySnapshotをreset後worldへ持ち越さない。
old validation entriesをnew storeへappendしない。

### 6J.4 resetで保持するsession material

reset成功でも次をrotation/clearしない。

- sessionId / cookie binding
- CSRF material
- cursor HMAC/session binding secret
- request journal
- process-local serverInstanceId/errorCounter

`uiRevision`を0へ戻さず単調増加を維持する。

これによりreset前cursorは**署名自体は検証可能**であり、reset後の新identity/revisionとのbinding mismatchとしてSTALE判定できる。

### 6J.5 stepとmock latest

通常`step`成功では`MockBattleSessionStore.latest`をclearしない。

理由:
- replayは§13Hどおり保存checkpointをsourceとする
- current world進行とold mock result保存は別scope
- world進行後もreplay可能性を維持する

step後にcurrent Person/candidate状態が変わってもlatest/replaySnapshotを書換えない。

### 6J.6 failure境界

start/reset application-level failure:

```text
commitState=none
```

だけ。

- operation開始前world-scoped/session-scoped committed stateを全保持
- old validation/latest保持
- uiRevision不変
- accepted failure responseはjournalへ保存可能

start/reset successはnew candidate session state + prevalidated HTTP200 response bytesを1 atomic commit。

commit後transport failure:
- committed new stateを保持
- old stateへrollbackしない
- ApiFailureEnvelopeを新規生成しない
- same requestIdでsaved 200 response exact replay

start/reset `commitState=partial|complete` INTERNAL_ERRORは禁止。

### 6J.7 lifecycle invariant

ready状態では:

- world runtime non-null
- RunInitializationSnapshot non-null
- validation store non-null
- 3者のsimulation identity整合
- mock latestはnullまたはそのsession内のvalidated record

reset後latest=nullは正常ready状態。

empty状態では0.1.13 invariantどおりworld/run initialization/validation/lastOperationはnull、uiRevision=0、mock latest=null。failed start journal recordだけが存在してもempty invariantを変えない。

---

## 6K. reset後の旧cursor / request journal

### 6K.1 old collection cursor

reset前の正しく署名済み:

- people cursor
- mock candidates cursor
- events cursor

はreset後に`uiRevision`が必ず増加するためcurrent bindingへ一致しない。

```text
409 STALE_CURSOR
refreshRequired=true
```

resetが同じRunInitializationSnapshot/同じsimulation identityを維持する場合でも、**uiRevision mismatchだけでSTALE**となる。

validation cursorも同様に、`validation:<simulationId>`自体が同値であってもold `uiRevision`によりSTALE。simulationIdが変わることを前提にしない。

### 6K.2 old mock log cursor

reset成功で`MockBattleSessionStore.latest=null`になっても、reset前の正しく署名済みmock-log cursorは§5Aのcursor-before-resource規則を維持する。

```text
authenticated old mock-log cursor
+ current latest == null
-> 409 STALE_CURSOR
```

404へ変換しない。

cursor secretをresetでrotateして400 HMAC invalidへ変える実装は禁止。

### 6K.3 cursorなしlatest参照

reset後:

```text
GET /mock-battles/latest
GET /mock-battles/latest/log  // cursorなし
```

はcurrent latest不存在の既存404契約。

### 6K.4 request journalはresetを跨いで保持

request journal lifetimeは§6Nどおりsession/process scopeで、running/completedをそのlifetime中evictしない。

reset成功でold request recordsを削除しない。

reset前にcompletedしたrequestIdをreset後にsame fingerprintで再送した場合:

- 保存済みHTTP status + response body bytes exact replay。非決定的transport headerはexact一致対象外
- old response内のuiRevision/summary/resultをcurrent値へ書換えない
- canonical current worldをold stateへ戻さない
- latest/validation storeをold responseに合わせて復元しない
- lastOperationをold requestへ戻さない
- uiRevisionを増加させない

これは「過去operationを再実行」ではなくidempotency response replay。

reset前に完了済みの`POST /mock-battles/replay` requestIdも同じ。reset後latest=nullでもsame requestId再送はold replay responseをjournalから返し、new replayを実行したことにはしない。

### 6K.5 new requestIdはcurrent stateへ評価

reset前と同じoperation bodyでもnew requestIdならcurrent ready world / current uiRevisionに対する新request。

old journal responseをbody fingerprint一致だけで流用しない。

requestId + fingerprintの既存0.1.13契約を維持する。

### 6K.6 process restart

process restartでは旧session cookie/session secret/request journal/cursor binding自体が失効し、新empty sessionとなる0.1.13契約を維持する。

resetとprocess restartを同じ「全session material clear」として実装しない。

---


## 6L. ready-start後の旧cursor / request journal

### 6L.1 old collection cursor

ready-start前に発行された正しく署名済み:

- people
- mock candidates
- events
- validation

cursorは、start成功で`uiRevision`が増加するためnew runへbindingしない。

```text
409 STALE_CURSOR
refreshRequired=true
```

new runのsimulation identityが偶然old runと同一に見えるfixtureでも、old `uiRevision`だけでSTALE。

new run identityが異なる場合はそのbinding mismatchも加わるが、identity変更をSTALE成立の必須条件にしない。

### 6L.2 old mock log cursor

ready-start成功で`MockBattleSessionStore.latest=null`。

start前のauthenticated old mock-log cursor:

```text
cursor-before-resource
-> 409 STALE_CURSOR
```

latest=nullだから404へ変えない。

cursor secret/keyをready-startでrotateしてbad-HMAC 400へ変えない。

cursorなしの:

```text
GET /mock-battles/latest
GET /mock-battles/latest/log
```

はcurrent latest不存在の404。

### 6L.3 request journal

ready-start成功でもrequest journalをclearしない。

start前のcompleted requestIdをsame fingerprintで再送:

- saved old HTTP status + response body bytes exact replay。非決定的transport headerはexact一致対象外
- old responseのworld summary/result/uiRevisionをcurrent化しない
- current new runをold runへrollbackしない
- current latest/validation store/lastOperationをold responseへ合わせない
- current uiRevisionを増加させない

new requestIdならcurrent new runに対する新requestとして通常評価する。

ready-start前に完了済みreplay requestIdのsame-request再送はjournal exact replayであり、new runのlatest=nullを使ってreplayを再実行しない。

### 6L.4 resetとの共通点 / 相違点

共通:
- old signed cursorは少なくともuiRevision mismatchでSTALE
- old journalは保持
- old mock latestはsuccess時clear
- session/process secretsは保持

相違:
- ready-startはnew RunInitializationSnapshot
- resetはsame saved RunInitializationSnapshot value

---


## 6M. CommittedValidationViewStore occurrence lifecycle

0.1.13正本の`CommittedValidationViewStore`採番契約を0.1.14でも変更しない。

```text
CommittedValidationViewStore = {
  schemaVersion,
  simulationId,
  items: {
    validationOccurrence: positive safe integer,
    result: CanonicalObject
  }[],
  nextValidationOccurrence: positive safe integer
}
```

### 6M.1 store invariant

```text
items == []
  -> nextValidationOccurrence == 1

items != []
  -> itemsはvalidationOccurrence asc
  -> first.validationOccurrence == 1
  -> 隣接itemは+1
  -> nextValidationOccurrence == last.validationOccurrence + 1
```

欠番を許さない。

adapterでsort/dedupeして壊れたstoreを正常化しない。

### 6M.2 start / reset success

empty-start、ready-start、resetのいずれも、成功時に**新しいCommittedValidationViewStore object**を構築する。

初期化facadeが返した正規ValidationResult配列を元順のまま:

```text
result[0] -> occurrence 1
result[1] -> occurrence 2
...
result[M-1] -> occurrence M
```

へ採番する。

```text
M == 0
  -> items=[]
  -> nextValidationOccurrence=1

M > 0
  -> nextValidationOccurrence=M+1
```

ready-start/reset前storeの最大occurrenceを引き継がない。

resetでRunInitializationSnapshot canonical valueが同じでもoccurrenceは1から振り直す。

`simulationId` fieldは**reset/startで構築されたcurrent canonical world identityとexact一致する値**を入れる。reset時に「必ず旧値と異なる」ことは要求しない。

### 6M.3 weekly commit

各正規週commitがValidationResult配列:

```text
[r0, r1, ..., rK-1]
```

を返した場合、commit前storeの`nextValidationOccurrence=N`から:

```text
r0 -> N
r1 -> N+1
...
rK-1 -> N+K-1
```

を元配列順に付与する。

world state / Event Stream / validation items / nextValidationOccurrence / uiRevisionを同じ1週commit境界で確定する。

K=0ならitems/next値を変えない。

### 6M.4 rollback / noncommit

次ではoccurrenceを予約・消費しない。

- strict request validation failure
- lifecycle/resource/revision rejection
- domain/pre-start failureでstore非保存のValidationResult
- failed week draft
- step週rollback
- mock battle / replay validation
- capacity failure
- atomic start/reset precommit failure

1度仮採番したdraftがrollbackされた場合、store next値をcommit前へ戻す。

### 6M.5 multi-week partial

requested N週のうちJ週だけ正規commit後にdomain partial failureまたはINTERNAL_ERROR partialとなった場合:

- 1..J週で実際にcommitされたValidationResultだけstoreへ存在
- failed J+1週のresponse用validationはstoreへ入れない
- failed week用occurrenceを消費しない
- nextValidationOccurrenceはJ週目commit後の値

後続new requestの最初の保存ValidationResultはそのnext値から開始する。

### 6M.6 cursor / reset

Validation cursorは`validationOccurrence` nextPositionを使用する。

start/reset成功でstore occurrenceが1へ再構築されても、old cursorは:

- old `payload.uiRevision`
- 必要ならold store/data identity

によりSTALE。

occurrence番号が再び1から現れることを理由にold cursorをcurrent storeへ再利用しない。

### 6M.7 saved request replay

old completed responseのsame requestId replayはstoreを再実行・再採番しない。

response内`validationResultCount`等はsaved bytesのまま。
current store items/nextValidationOccurrenceは不変。

---

## 6N. request journal global namespace / lifetime

0.1.13正本のjournal契約を実装時に曖昧化しないため、cross-operation条件を明示する。

### 6N.1 namespace

`requestId` namespaceは**1 UiSession内の全更新endpointで共通**。

対象:

```text
POST /simulation/start
POST /simulation/step
POST /simulation/reset
POST /mock-battles
POST /mock-battles/replay
```

endpoint別に別Map/別namespaceを作らない。

一方、異なるUiSession同士は別namespace。

```text
session A requestId=X
session B requestId=X
```

は互いにconflict/replay lookupしない。

process-global 1個のrequestId Mapで全sessionを共有しない。

completed/running recordのfingerprint materialは0.1.13どおり少なくとも:

```text
method
endpoint
expectedUiRevision
canonical operation input
```

を区別する。

したがって:

```text
requestId=R で start completed
同じ R を step / reset / mock / replayへ使用
  -> REQUEST_ID_CONFLICT
```

current revision/lifecycle/resourceより先に既存journal conflictを確定する。

同じendpointでもexpectedUiRevisionまたはcanonical operation inputが異なればconflict。

same requestId + exact same fingerprintだけがrunning statusまたはsaved completed responseを参照できる。

ただしexisting journal lookupへ到達するのは**security + JSON parse + endpoint strict DTO validationを通過したrequestだけ**。

したがって既存completed requestIdと同じ文字列を含んでいても:

```text
invalid Host/session/Origin/CSRF
  -> security error
  -> saved response/conflict lookupへ進まない

malformed JSON / unknown field / invalid type/range
  -> 400 INVALID_REQUEST
  -> saved response/conflict lookupへ進まない

strict-valid DTO + same requestId
  -> ここで初めてsame fingerprint/running/conflictを判定
```

「requestId文字列が見えた」という理由だけでsaved responseをsecurity/DTO validationより先に返さない。

### 6N.2 lifetime / no eviction

running/completed recordは:

```text
current UiSession lifetime中
かつ
current process lifetime中
```

evictしない。

禁止:

- LRU eviction
- TTL eviction
- max-count到達時のold completed削除
- start/reset/ready-start/mock/replay成功時clear
- uiRevision進行時clear
- lastOperation以外のcompleted response削除
- endpoint別journalの個別clear

process終了またはそのUiSession終了でのみ保証対象外になる。

`lastOperationRequestId`が参照するcompleted recordは同じlifetime中必ず存在しなければならない。

### 6N.3 old response replayはcurrent resourceを再検証しない

journalへ永続するresponse正本は0.1.13どおり:

```text
original HTTP status
original response body byte sequence
```

である。

`uiRevision` / `isUpdating` / `refreshRequired`等はbody内の保存済み値としてexact維持する。

headerについて:

- APIが要求するstable response header契約はreplay時も満たす
- 非決定的transport headerはexact byte equality対象外
- Date/connection/runtime-generated header等をidempotencyのためにjournalへ固定保存する必要はない
- header差を理由にbodyを再serializeしない

completed same-fingerprint lookupが成立した場合:

```text
saved HTTP status + response body bytes exact replay。非決定的transport headerはexact一致対象外
```

で終了する。

その後に:

- expectedUiRevision再検証
- lifecycle再検証
- current Person/preset/latest/replaySnapshot存在確認
- current latest/hash integrity
- current world validation

を行わない。

たとえばreset後latest=nullでも、reset前completed mock/replay requestのsame-request再送はsaved responseを返す。

これはcurrent resourceを復元する意味ではない。

### 6N.4 process restart

process restart後は旧UiSession/request journal自体がcurrent process namespace外。

同じ文字列requestIdをnew sessionで使用しても旧process recordとはconflict/replayしない。

旧session cookieを復旧してold journalだけ再利用する実装は禁止。

旧cookie / 旧cursorの判定を次へ固定する。

```text
A. process restart直後
   old-process cookie + non-bootstrap world GET + old cursor
   -> session validationがcursorより先
   -> 401 SESSION_REQUIRED
   -> cursor decode/HMAC 0回

B. old-process cookie + GET /session
   -> bootstrap
   -> new current-process empty session + new cookie/CSRF

C. B直後のnew empty session + world GET + old cursor
   -> path/query構文通過後、empty lifecycleがcursor authより先
   -> 409 SIMULATION_NOT_STARTED
   -> old cursor HMACをstatus決定に使用しない

D. new sessionでstart成功後 + old-process cursor
   -> current session/lifecycleはvalid
   -> old process cursorHmacKeyで検証不能
   -> 400 INVALID_REQUEST
   -> STALE_CURSOR 409へ分類しない
```

process restartによるkey/session消失と、同一process内のrevision/dataIdentity staleを同じ409へ畳み込まない。

---

## 6O. uiRevisionとUiReadSnapshot full-generation identity

`uiRevision`はcanonical simulation/session revision counterであり、**UiReadSnapshot 7 field全体の一意generation IDではない**。

理由は0.1.13正本のstep domain `partial_failure` K=0。

```text
operation start:
  uiRevision = R
  lastOperationRequestId = L0

requestedWeeks >= 2
first week domain failure
committedWeeks = 0

HTTP200 partial_failure completion:
  canonical world unchanged
  validation store unchanged
  mock latest unchanged
  uiRevision = R
  lastOperationRequestId = L1  // current HTTP200 response
```

したがって同じ`uiRevision=R`で:

```text
before response completion:
  UiReadSnapshot.lastOperationRequestId = L0

after response completion:
  UiReadSnapshot.lastOperationRequestId = L1
```

となることが正規。

### 6O.1 cache禁止事項

次を禁止する。

```text
readSnapshotCache[uiRevision] -> UiReadSnapshot
```

のように`uiRevision`だけでfull UiReadSnapshotを永久再利用すること。

current committed GET用snapshotは、**request開始時のcurrent committed UiSession fieldsから毎回/正しくinvalidated cacheから**構築する。

cacheを使う場合は、UiReadSnapshot 7 fieldのどれかを変更するsession commitで必ずinvalidateする。

特にK=0 partial_failureでlastOperationRequestIdだけが変わった場合もinvalidate必須。

### 6O.2 operationStartReadSnapshot

K=0 partial_failure完了後に別mutationを開始する場合、その新operationの`operationStartReadSnapshot`は:

```text
same uiRevision R
new lastOperationRequestId L1
```

をcaptureする。

「revisionが同じだから前operation開始前snapshotを再利用」してはならない。

### 6O.3 cursorとの関係

cursor bindingはendpoint dataの既存契約どおり`payload.uiRevision`等を使用する。

K=0 partial_failureだけではcanonical pageable source/revisionが変わらないため、既存cursorを**lastOperation変更だけでSTALEにしない**。

対照:

```text
mock/replay success
  -> uiRevision +1
  -> People/Candidates/Events/Validation/BattleLogのold cursorは
     source内容が偶然同一でもold payload.uiRevisionによりSTALE

step K=0 partial_failure
  -> uiRevision unchanged
  -> lastOperationだけ変わる
  -> pageable cursor validityは維持
```

API-006 `GET /simulation`はcursorを使わないため、同じuiRevisionでも最新committed `lastOperationRequestId`を反映する。

### 6O.4 saved response replay

old completed responseのsame-request replayはUiSession fieldを変更しない。

したがって:

- uiRevision不変
- lastOperationRequestId不変
- read snapshot cache invalidation不要
- cursor validity不変

saved response bodyの古いrevision/summary/resultをcurrent UiReadSnapshotへ取り込まない。

### 6O.5 HTTP200 step finalization boundary

step successまたはdomain `partial_failure`の最終HTTP200を確定するとき、週commit済みstateとは別にsession metadataの完了境界を曖昧にしない。

response DTO/schema/JSON bytes確定後:

```text
running journal
-> completed journal with exact HTTP200 bytes

lastOperationRequestId
-> current requestId

updateControl
-> null
```

を同じ不可分session completion boundaryで確定する。

K=0 partial_failureではその境界で:

```text
uiRevision stays R
world/validation/latest unchanged
lastOperationRequestId L0 -> L1
running -> completed
updateControl -> null
```

となる。

観測可能な次の中間状態を禁止する。

- completed journalなのにlastOperationRequestId=L0
- lastOperationRequestId=L1なのにrunningのまま
- updateControl=nullなのにrunning recordが残る
- updateControl!=nullなのにcompleted responseだけcurrent readへ露出

K>0 success/partialでも最終session completion metadataは同じ規則。

HTTP500 step none/partial/completeはlastOperationRequestIdを更新しないため、completed error journal + updateControl解除だけを不可分確定する。


---

## 6P. client disconnect / reload / AbortSignal

0.1.13のtransport/client lifetime契約を維持する。

serverがrunning acceptanceを完了したmutationについて、次はserver-side rollback/cancel理由にならない。

- HTTP client connection close
- browser `AbortSignal`
- page reload
- SPA route change / page navigation
- browser側timeout

### 6P.1 accepted operation continues

accepted operationはclient transport lifetimeから独立して、既存commit boundaryまで処理を継続する。

```text
accepted start/reset/mock/replay
  -> atomic success/failure journal boundaryまで継続

accepted step
  -> canonical weekly commit / domain partial / internal failureの
     確定可能なjournal boundaryまで継続
```

client disconnectを検出しただけで:

- world rollback
- uiRevision巻戻し
- running record削除
- updateControl強制解除
- same operation自動再実行

を行わない。

### 6P.2 reconnect / reload

同じprocess・同じ有効session cookieでreload/reconnectした場合:

```text
GET /session
  running中 -> sessionState="updating"
              activeOperation=current request
              isUpdating=true

same requestId + same fingerprint resend
  running中   -> UPDATE_IN_PROGRESS
  completed後 -> original HTTP status + body bytes exact replay
```

clientは「応答が見えなかった」ことを理由に別requestIdで同じmutationを再試行してはならない。

### 6P.3 process failure contrast

process自体がfinal response/journal確定前に停止した場合はresumeを保証しない。

新processでは旧session/journalを復旧せず§6N.4のnew session boundaryへ移る。

client disconnectとprocess crashを同じretry semanticsへしない。


## 7. relationship表示

PersonDetailView:

```text
parentPersonIds: string[]
formalMasterPersonIds: string[]
```

### 7.1 parentPersonIds

固定UiReadSnapshotのcanonical relationship collectionから、DB-022でbindingした正規`parent_child` relationshipでchild側PersonIdが対象personIdとなる全recordを取得し、そのparent側PersonIdを返す。

- status/historyでUI独自filterしない
- canonical PersonId comparator昇順
- duplicate/broken referenceをdedupe/skipしない
- canonical relationship/world validator合格必須

### 7.2 formalMasterPersonIds

固定UiReadSnapshotのcanonical relationship collectionから、DB-022でbindingした正規`master_disciple` relationshipでdisciple側PersonIdが対象personIdとなる全recordを取得し、そのmaster側PersonIdを返す。

`formalMaster`は現在指導中/active/代表1名を意味しない。

- valid recordが複数なら全masterを返す
- upstream validatorが1件上限なら自然に0/1件になるがUI独自上限は作らない
- first()/latest()/最小PersonId等で1件選ばない
- status/history fieldがあっても0.2.0ではfilterしない
- canonical PersonId comparator昇順

### 7.3 strict validation — current/active source only

archive activation前のcurrent Sprint 1 monolithic canonical sourceでは、relationship collection/schema/counterpart PersonId/reference/world invariantが1件でもinvalidならPersonDetail全体を500 `INTERNAL_ERROR`。bad recordだけskip/dedupeして200にしない。

このwhole-detail 500契約をHistorical readerへ継承しない。Historical store/index導入後はHIST-025～035が優先し、broken historical record/referenceは可能な限り該当node/edge/fieldへ局所化する。

特に:

- readable parent displayName等は他section corruptionで隠さない
- unreadable targetはplaceholder nodeでgraph継続可能
- kinship rule queryではbroken/missingを`not_related`へ変換せず`cannot_determine`
- `cannot_determine`は個別rule actionをfail-closedし、simulation全体を停止させない

Historical partial-read wire schemaは0.2.0 exact25へ無理に混在させず、将来versioned contractで定義する。

### 7.4 qualifiedMaster cross-reference

master側Personの`qualifiedMaster`はPerson保存booleanが正本。relationship登場を理由にUI側でtrueへ補正しない。

### 7.5 将来変更

current/former分離やactive-only表示を追加する場合はcanonical relationship lifecycle正本を確認してAPI schemaを版上げする。

---

## 7A. MockBattleCandidateViewと参加不可reasonの分離

0.1.13の正本どおり、`GET /api/s1_5/mock-battles/candidates`は**そのread snapshot時点でmock battleへ参加可能な人物だけ**を返す。

```text
MockBattleCandidateView 0.2.0 = {
  personId: string,
  displayName: string,
  age: Age,
  careerStatus: "trainee"|"active_competitor"
}
```

exact key count:

```text
4
```

sourceはvalidated canonical Personの同一read snapshotへ固定する。

```text
personId
  <- Person.personId

displayName
  <- Person.displayName

age
  <- Person view/current-age canonical field
     （§7A.1でderivedAgeAtWorldDateとの一致validation済み）

careerStatus
  <- Person.careerStatus
```

`age`をwire生成時に再計算しない。正規年齢関数による再導出値は**validation用cross-check**にだけ使い、保存canonical current-age fieldと一致した後に、その保存値をwireへ写す。

UI-000でPerson current-ageの最終physical field pathをDEFERRED_BINDING **DB-007**する。Person view adapterが正規sourceである場合はそのpublic read fieldへ接続する。

missing/null age、careerStatusがcandidate union外、displayName/personId不正はcandidate除外ではなくcanonical state failureとして500。

候補DTOへ次を追加しない。

- eligible:boolean
- ineligibleReason
- validation
- disabledReason
- BattleFailureInfo
- 任意の参加不可説明文字列

候補外人物を「disabled候補」として同じ配列へ混ぜない。

### 7A.1 eligibility source

候補GETは「正規stateが壊れている人物」と「正規stateだがmock参加不可の人物」を分ける。

処理順は全Personについて固定する。

```text
1. 同じimmutable committed read snapshotのcanonical Personをstrict validate
2. Person.sprint1State / TechniqueCatalog semanticsをstrict validate
3. S01-008後のcommitted PersonTemporaryConditionをstrict validate
4. current WorldDateとbirthYear/currentAgeのcanonical age整合をstrict validate
5. 上記1～4がすべて成功した場合だけmock eligibility predicateを評価
6. predicate=trueだけCandidateViewへmap
```

1～4の失敗は「候補外」ではなくserver canonical state不整合なので:

```text
HTTP 500
INTERNAL_ERROR
commitState=none
refreshRequired=false
```

とし、候補配列を部分返却しない。

### 7A.1.1 exact mock eligibility predicate

validated sourceに対する0.2.0の個人predicateはexactに次である。

```text
mockCandidateEligible(person, temporaryCondition, worldDate, runRules)
=
  person.lifeStatus == "living"
  AND person.participationStatus == "active"
  AND (
    (person.careerStatus == "trainee"
      AND 8 <= derivedAgeAtWorldDate <= 15)
    OR
    (person.careerStatus == "active_competitor"
      AND 16 <= derivedAgeAtWorldDate <= 41)
  )
  AND temporaryCondition.injury
      < runRules.sprint1Config.battle.injury.unableToContinueThreshold
```

`derivedAgeAtWorldDate`はSprint 1の正規年齢関数と同じ結果であり、保存`currentAge`と一致することをpredicate評価**前**のstrict validationで確認する。

`isEligibleForBattleKind("mock", careerStatus, derivedAgeAtWorldDate)`のcurrent production helperは、上記career/age部分の正本binding候補である。最終public symbol/moduleはDEFERRED_BINDING **DB-008**としてUI-000で接続する。

### 7A.1.2 candidate predicateへ入れない条件

次は「Person sourceがvalidであるためのstrict validation」には必要だが、0.2.0のcandidate include/exclude predicateそのものではない。

- known TechniqueId / TechniqueCatalog cross-reference
- `currentMental` range
- Sprint1PersonState schema/semantics
- StatValueTriple schema
- temporaryCondition各fieldの型/範囲
- source object unknown/accessor/prototype safety
- battle profile neutral adapterの成功
- max durability / max mental deriv出可能性

これらに失敗したPersonを候補外として黙って除外してはならない。500で全候補responseを失敗させる。

### 7A.1.3 public participant validatorとのequivalence gate

UI-000でcurrent Sprint 1の標準Person source adapter + `validateBattleParticipant(..., battleKind="mock")`相当へ接続し、次をfixtureで証明する。

- predicate=trueの全boundary fixtureは標準participant validatorもsuccess
- predicate=falseの正常Person fixtureは、正規参加不可条件としてvalidator failure
- predicate外のsource/semantic corruption fixtureはCandidate GETが500であり「正常な候補外」扱いしない

Sprint 1完成時に、標準participant validatorへ上記predicate以外の**新しい正常参加可否条件**が追加されている場合、UI adapterで独自追加せず`spec_fix_required`としてSprint 1.5仕様を版上げする。

### 7A.1.4 pair-level条件

候補GETはPerson単体endpointなので、次のpair-level条件を候補配列のmembershipへ入れない。

```text
participantAId != participantBId
```

同一人物をA/B両方へ選んだ場合はPOST requestのcross-field validation / 正規pre-start validationで拒否する。

Aを選択したからB候補一覧から同じPersonをserver側で動的除外する、というselector状態依存APIにはしない。

### 7A.1.5 read-only

候補判定では:

- MatchId reservation
- World RNG消費
- battleSeed生成
- StartBattleRuntimeTransition生成
- event candidate生成
- participant source snapshot hashの**commit**

を行わない。

pure hash計算や正規participant validationに必要なSHA-256処理はread-only dependencyとして使用してよいが、provider failureは候補外扱いにせず500 `INTERNAL_ERROR`。

候補GET前後でcanonical World/RNG/MatchId/EventAllocation/uiRevision/lastOperation/mock latestは完全不変。


### 7A.2 POSTでの再検証

`POST /api/s1_5/mock-battles`は候補GETの結果を信用せず、accepted requestのimmutable source snapshotに対して正規battle pre-start validationを再実行する。

入力構文は正しいが参加者が正規battle開始条件を満たさない場合:

```text
HTTP 422
error.code = BATTLE_PRE_START_FAILURE
commitState = none
refreshRequired = false
```

正規pre-start `ValidationResult`が1件以上ある場合は、§3Aどおり`error.validation: CanonicalObject[]`へ1 result = 1 elementで元順のままvalidated canonical cloneを保持する。

この失敗では:

- MatchIdをcommitしない
- World RNGをcommitしない
- battleSeedを公開しない
- battle.started/battle.finished候補を保存しない
- MockBattleSessionStore.latestを変更しない
- uiRevisionを変更しない
- lastOperationを変更しない

accepted requestIdについては422 responseをcompleted journalへ保存し、same requestId/same fingerprint再送ではexact status/bodyを返す。

### 7A.3 revision優先順位

POST受付時は0.1.13の既存判定順を維持する。

`expectedUiRevision`が古い場合、participant eligibilityを評価する前に`STALE_UI_REVISION`を返す。古いsnapshotの人物を再検証して422へ置換してはならない。

---

## 8. TechniqueView

### 8.1 廃止field

次のUI独自`JsonValue`合成fieldを廃止する。

- `usageConditions`
- `hitParameters`
- `consumptionAndUseLimit`

### 8.2 PersonTechniqueState領域

```text
TechniqueView 0.2.0 = {
  techniqueId: string,
  learnedState: "learning"|"acquired",
  learningProgressTenths: non-negative safe integer,
  masteryHundredths: integer 0..10000,
  successfulUseCount: non-negative safe integer,
  attemptedUseCount: non-negative safe integer,
  lastPracticedAbsoluteWeek: non-negative safe integer|null,
  acquiredAbsoluteWeek: non-negative safe integer|null,
  definition: TechniqueDefinitionView
}
```

exact top-level key count:

```text
9
```

`learnedState`:

```text
acquiredAbsoluteWeek == null -> "learning"
acquiredAbsoluteWeek != null -> "acquired"
```

`learnedState`は保存fieldではなく上記1式だけのconvenience projection。別eventやprogress値から推測しない。

state/definition cross-reference:

```text
TechniqueView.techniqueId == definition.techniqueId
0 <= learningProgressTenths
learningProgressTenths <= definition.learningProgressRequired * 10
0 <= masteryHundredths <= 10000
```

`learningProgressRequired * 10`はsafe integerとして計算可能でなければならない。

PersonTechniqueState単体validatorが許可する大きな`learningProgressTenths`でも、catalog semantic validatorがdefinition cap超過を拒否する場合はTechniqueViewを返さない。PersonDetail生成前に必ず**PersonTechniqueState structural validator + Sprint1PersonTechniqueSemantics validatorの両方**を通す。

次はそのまま正規保存値を返す。

```text
successfulUseCount
attemptedUseCount
lastPracticedAbsoluteWeek
acquiredAbsoluteWeek
```

この4fieldについてUI独自の相関条件を新設しない。current Sprint 1 semantic validatorが持つ全条件だけを適用する。

missing/extra/undefined/decimal/out-of-range state fieldをUIで0/nullへ補完しない。

未保持TechniqueCatalog entryをゼロ状態として生成しない。

### 8.3 TechniqueDefinitionView

TechniqueDefinitionViewはcurrent production `TechniqueDefinition`のvalidated canonical cloneから直接作り、意味fieldをUI独自objectへ組み替えない。

0.2.0の`TechniqueDefinitionView` field setは**exactに31 key**で、次の全fieldを1対1で保持する。

```text
techniqueId
schemaVersion
dataVersion
name
category
primaryStats
requiredAptitude
requiredStats
prerequisiteTechniqueMastery
mentalCost
difficulty
learningTier
consumptionClass
learningProgressRequired
learningProgressOverrideReason
teachingProficiencyRequired
secrecy
power
accuracy
activationDifficulty
prerequisiteTechniqueIds
originPersonId
sourceTechniqueIds
tags
usableRanges
preferredRanges
rangeShiftAfterUse
priority
speedModifier
injuryModifier
actionTraits
```

同じ`apiSchemaVersion="0.2.0"`では:

- 上記31 keyの欠落禁止
- 32個目以降の追加禁止
- field名変更禁止
- null/optional意味変更禁止
- nested object/arrayのUI独自再構成禁止

UI-000ではcurrent productionの`TECHNIQUE_DEFINITION_KEYS`相当へ接続し:

```text
actual key count == 31
actual key set == 上記31 key exact
```

を検証する。

Sprint 1完成時の正規key setが1 keyでも異なる場合、adapterで追加/削除/aliasして0.2.0へ偽装せず`spec_fix_required`としてSprint 1.5仕様と`apiSchemaVersion`を先に版上げする。

exact literal union / module path / final upstream schemaVersionはDEFERRED_BINDING **DB-009**としてUI-000で実コードに照合する。

`displayName`を別fieldとして残さない。表示名は`definition.name`を使用する。

`category`はcurrent Sprint 1 contractの`unarmed | sword | magic`へ接続し、旧`martial` aliasを導入しない。

---


## 8A. TechniqueDefinitionView 0.2.0 確定済み値域

§8.3のexact31 keyに加え、current Sprint 1 production testで既に固定されている値域・literalをUI-000へ先送りしない。

### 8A.1 fixed literals

```text
category =
  | "unarmed"
  | "sword"
  | "magic"

learningTier =
  | "basic"
  | "standard"
  | "advanced"
  | "secret"

consumptionClass =
  | "small"
  | "medium"
  | "large"
  | "ultimate"

priority =
  | 2
  | 1
  | 0
  | -1

BattleRange =
  | "contact"
  | "close"
  | "middle"
  | "long"
```

`martial` aliasを追加しない。

### 8A.2 fixed numeric ranges

current production validatorへ合わせる。

```text
requiredAptitude            : integer 0..100
difficulty                  : integer 0..100
teachingProficiencyRequired : integer 0..100
secrecy                     : integer 0..100
power                       : integer 0..100
accuracy                    : integer 0..100
activationDifficulty        : integer 0..100

learningProgressRequired    : integer 1..10000

mentalCost                  : non-negative safe integer

speedModifier               : integer -20..20
injuryModifier              : integer -20..20
```

UI adapterでclamp/round/defaultしない。

`requiredStats`、`prerequisiteTechniqueMastery`等のnested値域はcurrent upstream validatorの**全条件**を適用する。ここで未確認の上限をUI側が新設しない。

### 8A.3 actionTraits

current production key set:

```text
ActionTraits = {
  simultaneous: boolean,
  counterOnHit: boolean,
  interception: boolean,
  interrupt: boolean,
  defenseBreak: boolean
}
```

exact5 key。

current Sprint 1 TechniqueDefinition validatorでは5値すべて`false`だけがvalidである。

したがって0.2.0でvalid TechniqueDefinitionViewとして表示できるcurrent valueは:

```text
{
  simultaneous: false,
  counterOnHit: false,
  interception: false,
  interrupt: false,
  defenseBreak: false
}
```

だけ。

将来Sprint 1側でtrue traitsが正式解禁された場合、UI-000で勝手に通さずupstream schema/validator driftとしてSprint 1.5仕様を版上げする。

### 8A.4 canonical arrays

current TechniqueDefinition validatorが正規化する配列:

- `primaryStats`
- `usableRanges`
- `preferredRanges`
- `prerequisiteTechniqueIds`
- `prerequisiteTechniqueMastery`
- `sourceTechniqueIds`
- `tags`

について、validated production valueの**canonical orderをそのまま返す**。

UIで再sortしない。

duplicate、sparse array、unknown literal等をUI側でdedupe/filterして隠さない。

`usableRanges` / `preferredRanges`の各値はBattleRange literal。

`primaryStats`の各値はcanonical AbilityKey。

### 8A.5 learningProgressOverrideReason

current production ruleをそのまま使用する。

- `learningProgressRequired`が当該`learningTier`の標準値と一致する場合、正規validatorが要求するnull/non-null相関に従う。
- 標準値から変更される場合、正規override reason ruleに従う。

UIで理由文字列を生成しない。

### 8A.6 schema/data identity

current expected binding:

```text
TechniqueDefinition.schemaVersion = "0.1.0"
initial TechniqueCatalog dataVersion = "techniques-0.1.0"
```

これは§15どおりupstream expected bindingであり、Sprint 1完成時に実versionへ再照合する。

`definition.dataVersion`は使用中catalog identityの`dataVersion`とexact一致する。

不一致をwire adapterで置換しない。

### 8A.7 未固定literalの扱い

`rangeShiftAfterUse`等、current手元成果物から全literal集合を証明できないnested typeは、**値をstringとして自由化するのではなく**正規TechniqueDefinition validatorを通過した値のdirect canonical projectionとする。

最終literal type/moduleはDEFERRED_BINDING **DB-010**だが、意味論は「upstream validated valueを変更せず返す」に固定済みである。

UI-000でactual unionを記録し、未解決のままUI-001へ進まない。

---
## 8B. PersonDetail.techniques 配列順・focus cross-reference

`PersonDetailView.techniques`はPersonがcanonical Sprint1PersonStateに実際に保持するPersonTechniqueStateだけのprojection。

- catalog未保持entryをzero-stateで追加しない
- duplicate TechniqueIdはdedupeせず500
- wire順はcanonical TechniqueId comparator昇順
- name/category/mastery/acquiredWeek等でsortしない

`learningFocusTechniqueId != null`なら同TechniqueIdが`techniques[]`にexact 1件存在し、active catalogにも定義が存在すること。dangling focusをnull補正しない。

同一uiRevision:

```text
PersonListItemView.learnedTechniqueCount
==
count(PersonDetailView.techniques where learnedState=="acquired")
```

---

## 9. 修行履歴の指導者

current Sprint 1の正規weekly training event / saved stateに「その週に実際に指導したPersonId」の履歴sourceが存在しない限り、`TrainingHistoryItemView.instructorPersonId`を削除する。

人物詳細画面の修行履歴から「指導者」表示も削除する。

禁止:

- current formal masterを過去週のinstructorとして後付け
- teacher contextの「教示可能」情報からPersonIdを推測
- null固定fieldを残して存在する情報のように見せる

将来canonical eventへhistorical instructor PersonIdが追加された場合、Sprint 1.5仕様を版上げして表示対象へ追加する。

---


## 9A. TrainingHistoryItemViewの正規集約

0.1.13の`TrainingHistoryItemView`は、単なるevent表示ではなく「人物の1週分の修行結果」を表示するsummaryである。実装者が任意にeventを束ねてはならない。

### 9A.1 wire型

本追補適用後:

```text
TrainingHistoryItemView = {
  worldDate: WorldDateView,
  trainingKind: "train_stat"|"learn_technique"|"practice_technique"|"rest",
  targetStat: "stamina"|"strength"|"skill"|"speed"|"spirit"|"magic"|null,
  targetTechniqueId: string|null,
  forced: boolean,
  forcedReason: string|null,
  statChanges: {
    stat: "stamina"|"strength"|"skill"|"speed"|"spirit"|"magic",
    amount: non-negative safe integer
  }[],
  learningAttempted: boolean,
  learnedTechniqueIds: string[],
  relatedEventSequences: non-negative safe integer[]
}
```

`instructorPersonId`は§9の契約どおり存在させない。

### 9A.2 1 itemの境界

1 itemは、committed Event Stream上の:

```text
(personId, WorldDate)
```

ごとに存在する**正規`training.action_selected` 1件**をanchorとして作る。

同じ人物・同じWorldDateについて、weekly training processor由来の正規eventは次の責務順だけを許可する。

```text
train_stat:
  training.action_selected
  training.stat_growth_applied
  technique.mastery_increased? 
  training.condition_updated

learn progress only:
  training.action_selected
  technique.learning_progressed
  training.condition_updated

learn progress + acquired:
  training.action_selected
  technique.learning_progressed
  technique.acquired
  training.condition_updated

acquirable immediate:
  training.action_selected
  technique.acquired
  training.condition_updated

practice:
  training.action_selected
  technique.mastery_increased
  training.condition_updated

forced rest:
  training.action_selected
  training.forced_rest_applied
  training.rest_applied

normal rest:
  training.action_selected
  training.rest_applied

inactive:
  item 0件
```

実際のweekly training processorの`sourceProcessor` literalはDEFERRED_BINDING **DB-011**とし、UI-000で正規producerへ接続する。

同じ人物・同じWorldDateに`training.action_selected`が2件以上ある、またはanchorなしでweekly training effect eventだけ存在する場合は、historyを部分補完せず500 `INTERNAL_ERROR`とする。

### 9A.2A group membershipのsourceProcessor固定

TrainingHistoryの1 groupに入るeventは全件:

```text
event.sourceProcessor == DB-011でbindingしたweekly training processor literal
```

を必須とする。

同じperson/week/eventTypeでも別sourceProcessorのeventをtraining groupへ入れない。

battle/year-start/admin/import等の別processor由来の技・能力eventを`learnedTechniqueIds/statChanges/relatedEventSequences`へ混入しない。

weekly training producer由来eventのsourceProcessor改ざんは正規producer/payload validatorで検出し、eventTypeだけ見てtraining eventへ再分類しない。

---
### 9A.3 field source

anchor=`training.action_selected`とする。

```text
worldDate
  <- anchor EventEnvelope.worldDate

trainingKind
  <- anchor.payload.action

targetStat
  <- anchor.payload.targetStat

targetTechniqueId
  <- anchor.payload.targetTechniqueId

forced
  <- anchor.payload.forced

forcedReason
  <- anchor.payload.forcedReason

learningAttempted
  <- (trainingKind == "learn_technique")
```

`targetStat` / `targetTechniqueId`のnull相関を0.2.0で固定する。

```text
trainingKind == "train_stat":
  targetStat != null
  targetTechniqueId == null

trainingKind == "learn_technique":
  targetStat == null
  targetTechniqueId != null

trainingKind == "practice_technique":
  targetStat == null
  targetTechniqueId != null

trainingKind == "rest":
  targetStat == null
  targetTechniqueId == null
```

これと異なるanchor payloadをUI側でnull補完・field移動して正常化しない。DB-021で接続した正規payload validator/testとの一致を必須にする。

`forced` / `forcedReason`はanchor payloadのvalidated値をそのまま返す。0.1.14では`forcedReason`の自由文をUIが生成しない。upstreamに閉じたliteral unionが存在する場合、そのexact unionをDB-021でbindingし、unknown literalをstringだからという理由で通さない。

`statChanges`は同group内の`training.stat_growth_applied`だけから作る。

```text
stat   = payload.targetStat
amount = payload.after - payload.before
```

`amount`はsurfaceValue単位であり、`appliedMilliPoints`ではない。

`payload.after < payload.before`、非safe integer、targetStat不一致等はINTERNAL_ERROR。

`learnedTechniqueIds`は同group内`technique.acquired`の`payload.techniqueId`だけを取得し、canonical TechniqueId昇順に並べる。`technique.learning_progressed`や`technique.mastery_increased`だけではlearned扱いしない。

`statChanges`は0.1.13の既存契約どおり`stamina,strength,skill,speed,spirit,magic`順に並べる。event発生順を表示順へ流用しない。

`relatedEventSequences`は同groupに属するweekly training eventの**全EventEnvelope.sequence**を数値昇順で保持する。anchor自身も含む。

### 9A.4 完全性

group内eventは同一personId、同一worldDateでなければならない。

`EventEnvelope.entities.personIds`には対象personIdが含まれ、payloadのpersonIdを持つeventでは同じ値でなければならない。

正規fixture順と矛盾するevent列をUIで並べ替えて正常化しない。正規event sequenceをそのまま検証する。

### 9A.5 availableと件数

`trainingHistory.available=true`にできるのは、当該runの開始からresponse対象commit snapshotまでのcommitted Event Streamへ欠落なくアクセスでき、§9Aのgroup validationを実行できる場合だけ。

Sprint 1完成時に完全Event Stream query sourceへDEFERRED_BINDING **DB-012**として接続できない場合はUI-000で`spec_fix_required`とする。正常稼働中に一部期間だけ欠落したhistoryを`available=false`で隠してはならない。

正常なready sessionのPersonDetailでは:

```text
trainingHistory.available = true
```

とする。

0.1.13の既存48週窓契約を維持する。現在commit snapshotの`WorldDate.absoluteWeek`を`W`として、対象anchorは:

```text
max(0, W - 47) <= anchor.worldDate.absoluteWeek <= W
```

だけとする。

`items`は`absoluteWeek desc`（最新週優先）で並べる。同一人物の同一absoluteWeekにはanchorが1件だけでなければならないため、本契約上tieは発生しない。もしtieが発生した場合は並べ替えで隠さずINTERNAL_ERRORとする。

48週窓より前の履歴はPersonDetailへ埋め込まない。完全履歴の調査はEvents画面を使用する。

---

## 10. Event personId filter

`GET /api/s1_5/events?personId=P`の人物filterは、全eventType共通で次のみを使う。

```text
event.entities.personIds.includes(P)
```

payloadを再帰探索しない。

eventTypeごとのpayload pathをfilter判定へ使わない。

`UI-000-EVENT-PERSON-MAP`の目的を変更する。

旧:
- eventTypeごとの「人物判定payload path」を決める

新:
- 各event producerが正しい`entities.personIds`を設定していることを監査する
- payload内PersonIdとのcross-referenceを監査する
- filter意味論は変更しない

---


## 10A. ValidationResult表示・filterのgeneric契約

0.1.13には`ValidationResult code` filter、および「エラーコード・発生処理・処理継続可否」の共通表示契約が存在した。しかしcurrent simulation-coreのgeneric `ValidationResult<T>` / `ValidationIssue`にこれらは共通fieldとして存在しない。

`BattleFailureInfo.code/canContinue`、API `StableErrorCode`、固定出力用validation report等の別概念をgeneric ValidationResultへ混入させてはならない。

### 10A.1 保存正本

`CommittedValidationViewStore`の役割は変更しない。

保存item:

```text
{
  validationOccurrence: positive safe integer,
  result: CanonicalObject
}
```

`result`は、正規初期化または正規週commit facadeが実際に返し、その世界commitと同じ境界で保存対象になったgeneric ValidationResultのvalidated canonical cloneである。

UI-000では、Sprint 1完成時点でstoreへ保存され得る**全具体ValidationResult型**を列挙し、次を確認する。

- `ok` discriminantを持つ
- failure分岐が`issues[]`を持つ
- 各issueが少なくとも`path:string`と`message:string`を持つ
- adapterによる値削除・独自code追加なしでcanonical JSON化できる
- 同じ具体型のsuccess/failure schemaを記録できる
- source facade / module / testを物理接続できる

1種類でもcanonical JSON化不能、またはgeneric契約と異なる正規resultが存在する場合はDEFERRED_BINDING **DB-013**未解消として`spec_fix_required`でSTOPする。UI adapterが独自serialization schemaを発明して吸収してはならない。

### 10A.2 GET wire item

`GET /api/s1_5/validation-results`の0.2.0 item:

```text
ValidationResultIssueView 0.2.0 = {
  path: string,
  message: string
}

ValidationResultViewItem 0.2.0 = {
  validationOccurrence: positive safe integer,
  status: "success"|"failure",
  issueCount: non-negative safe integer,
  issues: ValidationResultIssueView[],
  result: CanonicalObject
}
```

exact key counts:

```text
ValidationResultIssueView = 2
ValidationResultViewItem  = 5
```

`GET /api/s1_5/validation-results` success envelope内data:

```text
ValidationResultListDataView 0.2.0 = {
  items: ValidationResultViewItem[],
  totalCount: non-negative safe integer,
  nextCursor: string|null
}
```

exact key count:

```text
3
```

missing/unknown/`undefined` key、sparse `issues/items`を禁止する。

mapping:

```text
result.ok === true:
  status = "success"
  issueCount = 0
  issues = []

result.ok === false:
  status = "failure"
  issueCount = result.issues.length
  issues = result.issues.map(({path,message}) => ({path,message}))
```

`issues`は正規`result.issues`順を維持する。

`path`と`message`以外の正規issue field（例: `actual`, `expected`）を消したことにはしない。完全な正規内容は`result` raw JSON表示で確認できる。convenience `issues`へは共通保証される2 fieldだけを複製する。

cross-field:

```text
status == "success"
  <=> result.ok == true
  AND issueCount == 0
  AND issues.length == 0

status == "failure"
  <=> result.ok == false
  AND issueCount == result.issues.length
  AND issues.length == result.issues.length
```

failure時の各index `i`:

```text
issues[i].path    == result.issues[i].path
issues[i].message == result.issues[i].message
```

UI側でissueをsort/dedupe/filterしない。

### 10A.3 表示項目

ValidationResult領域で共通表示するもの:

- 成否
- failure時のissue件数
- 各issueの対象path
- 各issueのmessage
- validationOccurrence
- raw result JSON

generic共通fieldでないため、次を共通列から削除する。

- エラーコード
- 発生処理
- 処理継続可否

特定のBattleFailureInfo等が必要な場合は、その専用画面/専用result領域で表示する。ValidationResult画面へ合成しない。

### 10A.4 query

旧:

```text
GET /validation-results?code=...
```

を廃止する。

0.2.0で許可するqueryは:

```text
status: absent|"success"|"failure"
limit: absent|100|200
cursor: absent|string
```

CanonicalGetQueryでは§10Dの`ValidationQuery 0.2.0`を使用する。

raw `cursor`はCanonicalGetQueryへ含めない。ValidationQueryには`kind`、`status`、固定`sortKey`、固定`sortOrder`、`limit`を全部materializeする。

filter:

```text
status=null      -> 全item
status=success   -> result.ok === true
status=failure   -> result.ok === false
```

`code`、worldDate、personId、severity、sourceProcessor等を共通ValidationResult filterとして受理しない。未知query parameterは400。

0.1.13由来の`code` queryを0.2.0 endpointへ送った場合はunknown parameterとして400とする。旧意味を互換aliasとして残さない。

### 10A.5 paging

sortは既存どおり`validationOccurrence asc`。

cursor nextPosition:

```text
{ validationOccurrence: positive safe integer }
```

cursor bindingには0.2.0のCanonical ValidationQuery全文を含める。

statusを変えて旧cursorを使った場合は409 `STALE_CURSOR`。queryなし/明示statusなしは同じcanonical `status=null`へ正規化する。

---


## 10B. Event eventGroupのexact query semantics

0.1.13の`eventGroup`は表示専用query分類であり、EventEnvelopeへ書き戻さない。この意味論を維持しつつ、group membershipの決定方法を実装者判断にしない。

許可値:

```text
EventGroupQuery =
  | "training"
  | "technique_learning"
```

### 10B.1 training

```text
eventGroup=training
```

は正規EventEnvelopeの:

```text
event.eventType.startsWith("training.")
```

がtrueであるeventだけを返す。

UI-000で手作業のallow-listを作ってmembershipを決めない。

したがってcurrent Sprint 1の例では:

- `training.action_selected`
- `training.stat_growth_applied`
- `training.condition_updated`
- `training.forced_rest_applied`
- `training.rest_applied`

等の`training.` prefix eventを含む。

将来Sprint 1完成時点で別の正規`training.*` eventTypeが追加されていても、同じprefix ruleで含む。

`technique.*` eventは、weekly training processorから発生したものであっても`training` groupには含めない。

### 10B.2 technique_learning

```text
eventGroup=technique_learning
```

はexactに次の2 eventTypeだけを返す。

```text
technique.learning_progressed
technique.acquired
```

`technique.mastery_increased`は含めない。

`technique.*` prefix全体へ拡張しない。

将来別のtechnique learning eventTypeが必要になった場合、同じapiSchemaVersionのまま自動包含せずSprint 1.5仕様を版上げする。

### 10B.3 eventTypeとの排他

0.1.13どおり:

```text
eventType != null && eventGroup != null
  -> HTTP 400 INVALID_REQUEST
```

どちらか一方だけを指定する。

### 10B.4 他filterとのAND

`eventGroup`はyear/month/week/personIdとのAND条件。

personId判定は§10どおり`entities.personIds.includes(P)`だけを使う。

例:

```text
eventGroup=training&personId=P
```

は:

```text
eventType startsWith "training."
AND entities.personIds includes P
```

である。

### 10B.5 cursor binding

Canonical EventQueryへ`eventGroup`をliteralまたはnullとして含める。

group変更後に旧cursorを再利用した場合は409 `STALE_CURSOR`。

`eventGroup=training`と、その時点で偶然同じevent集合を返す複数eventType検索を「同一query」とみなさない。

---

## 10C. 一覧`totalCount` / `nextCursor`の共通意味論

0.1.13は一覧responseを`items / totalCount / nextCursor`へ統一しているが、`totalCount`を「cursor以降件数」と解釈してはならない。本追補で全pageable GETの意味を固定する。

対象:

- `GET /people`
- `GET /events`
- `GET /validation-results`
- `GET /mock-battles/candidates`
- `GET /mock-battles/latest/log`

### 10C.1 処理順

固定read snapshotに対して:

```text
1. source collectionをstrict validate
2. CanonicalGetQueryのfilterを全件へ適用
3. endpoint正規sortを全一致itemへ適用
4. totalCountを確定
5. cursorがあればexclusive start positionを確定
6. limit件までitemsをslice
7. items後に一致itemが残る場合だけnextCursorを発行
```

### 10C.2 totalCount

```text
totalCount =
  filter適用後・page/cursor適用前の全一致item件数
```

したがって同一:

- session binding
- read snapshot / uiRevision
- dataIdentity
- CanonicalGetQuery

に属する全pageで`totalCount`は同じ値。

`totalCount`から以下を引かない。

- 既読page件数
- cursor以前の件数
- 現page items.length

filterなしではsource collection全件数。

`GET /mock-battles/latest/log`は§11どおり:

```text
totalCount = battleResult.detailedLog.actionLogs.length
```

### 10C.3 items

cursorなし:
- sorted filtered collectionの先頭からlimit件。

cursorあり:
- cursorのnextPositionが示す最後の既返却itemを**exclusive**にして、その次からlimit件。

同一itemを次page先頭へ重複させない。

### 10C.4 nextCursor

```text
returned itemsの後に一致itemが1件以上残る
  -> nextCursor = non-empty signed cursor

残らない
  -> nextCursor = null
```

`items.length == limit`だけを理由にnextCursorを発行しない。ちょうどlimit件で全件終了ならnull。

一致0件:

```text
items = []
totalCount = 0
nextCursor = null
```

### 10C.5 Presets

`GET /presets`はcursor非対応。

```text
totalCount = items.length
nextCursor = null
```

startup freeze済みregistry snapshot全件を返す。

### 10C.6 revision間

別uiRevision / dataIdentityのresponse同士でtotalCountが異なることは正常。

旧cursorを新snapshotへ適用して差分を吸収せず、既存cursor契約どおりSTALE_CURSORとする。

---


## 10D. CanonicalGetQuery 0.2.0 exact union

0.1.13の原則を維持する。

```text
CanonicalGetQuery =
  raw URL queryそのものではない。
  cursor以外の許可queryをparse・strict validateし、
  endpoint別既定値をmaterializeした実効query。
```

**raw `cursor`はCanonicalGetQueryへ含めない。**

0.2.0ではValidation filterだけが`code -> status`へbreaking変更されたため、union全体を次へ再固定する。

```text
PeopleQuery 0.2.0 = {
  kind: "people",
  name: string|null,
  state: PersonStateFilter|null,
  sortKey:
    | "personId"
    | "stamina"
    | "strength"
    | "skill"
    | "speed"
    | "spirit"
    | "magic"
    | "unarmed"
    | "sword"
    | "magicAptitude",
  sortOrder: "asc"|"desc",
  limit: 50|100|200
}

MockCandidatesQuery 0.2.0 = {
  kind: "mock_candidates",
  name: string|null,
  sortKey: "personId",
  sortOrder: "asc",
  limit: 50|100|200
}

EventsQuery 0.2.0 = {
  kind: "events",
  year: positive safe integer|null,
  month: integer 1..12|null,
  week: integer 1..4|null,
  personId: string|null,
  eventType: string|null,
  eventGroup: "training"|"technique_learning"|null,
  sortKey: "sequence",
  sortOrder: "asc",
  limit: 100|200
}

ValidationQuery 0.2.0 = {
  kind: "validation",
  status: "success"|"failure"|null,
  sortKey: "validationOccurrence",
  sortOrder: "asc",
  limit: 100|200
}

BattleLogQuery 0.2.0 = {
  kind: "battle_log",
  sortKey: "sourceIndex",
  sortOrder: "asc",
  limit: 100|200
}

CanonicalGetQuery 0.2.0 =
  | PeopleQuery
  | MockCandidatesQuery
  | EventsQuery
  | ValidationQuery
  | BattleLogQuery
```

各objectは記載fieldを**全部必須**とし、unknown field / `undefined` / raw `cursor` fieldを禁止する。

### 10D.1 raw query -> canonical query

raw queryで省略された値は0.1.13のendpoint既定値をmaterializeする。

```text
people:
  name missing        -> null
  state missing       -> null
  sortBy missing      -> personId
  sortOrder missing   -> asc
  limit missing       -> 50

mock candidates:
  name missing        -> null
  limit missing       -> 50
  sortKey/sortOrder   -> personId/asc fixed

events:
  year/month/week/personId/eventType/eventGroup missing -> null
  sortKey/sortOrder -> sequence/asc fixed
  limit missing -> 100

validation:
  status missing -> null
  sortKey/sortOrder -> validationOccurrence/asc fixed
  limit missing -> 100

battle log:
  sortKey/sortOrder -> sourceIndex/asc fixed
  limit missing -> 100
```

raw cursorは別にdecode/authenticateし、CanonicalGetQueryへmaterializeしない。

### 10D.2 cursor binding

`CursorPayload 0.2.0.query`は**上記CanonicalGetQuery 0.2.0 exact object**。

初回pageで作成したCanonicalGetQuery全文をcursor payloadへ保存する。

2ページ目以降:

1. current raw requestからcursorを除外
2. 残りqueryをparse/default materialize
3. CanonicalGetQuery 0.2.0を作る
4. cursor payload `query`とcanonical JSON exact比較

1 fieldでも異なれば409 `STALE_CURSOR`。

省略既定値と明示的な同じ既定値は同じcanonical objectになる。

例:

```text
/validation-results
/validation-results?status=
```

のような空文字queryは「省略」と同一扱いにしない。空文字が許可値でなければ400。

一方:

```text
/validation-results
/validation-results?limit=100
```

は同じeffective queryである。

### 10D.3 0.1.13 old validation query

0.2.0では:

```text
?code=...
```

はunknown query parameterで400。

CursorPayload内に正しく署名された0.1.0形式:

```text
{ kind:"validation", code:..., ... }
```

が入っている場合は、CursorPayload schema/apiSchemaVersion drift契約に従い409 `STALE_CURSOR`。

`code`を`status`へ自動変換しない。

### 10D.4 key order

Canonical JSON serializerがobject keyを正規化する契約とは別に、型定義・builder・fixtureでは上記記載順をcanonical construction orderとして使用する。

入力objectのproperty insertion orderをquery意味論へ使用しない。

---

## 10E. Event一覧itemは正規EventEnvelopeそのもの

`GET /api/s1_5/events`のitemについてUI独自の縮約DTOを作らない。

0.2.0では:

```text
EventListItemView 0.2.0 = validated canonical EventEnvelope
```

とする。

### 10E.1 exact top-level event shape

current canonical EventEnvelopeのtop-levelは次の11 fieldである。

```text
EventEnvelope = {
  schemaVersion,
  eventId,
  simulationId,
  sequence,
  eventType,
  importance,
  worldDate,
  origin,
  sourceProcessor,
  entities,
  payload
}
```

EventListItemViewはこの11 fieldを**追加・削除・renameせず**validated canonical cloneとして返す。

`rawEvent`のような二重格納fieldを作らない。

### 10E.2 success data

API success envelope内の`data`はexactに:

```text
EventListDataView 0.2.0 = {
  items: EventListItemView[],
  totalCount: non-negative safe integer,
  nextCursor: string|null
}
```

exact top-level key count:

```text
3
```

paging semanticsは§10C / CanonicalGetQueryは§10Dを使用する。

### 10E.3 source

`items`のsourceは固定UiReadSnapshotが参照する**committed canonical Event Stream**だけ。

- candidate event
- uncommitted week event
- failed-week draft event
- MockBattleSessionStore.eventCandidates
- UI内部operation log

を混ぜない。

各itemについて正規EventEnvelope union validatorを通し、eventType固有payload validatorも含めて成功した値だけを返す。

1件でもinvalidなら、そのeventだけ除外して200にせず500 `INTERNAL_ERROR`。

### 10E.4 filter source

filterはcanonical EventEnvelope fieldへだけ適用する。

```text
year/month/week
  <- event.worldDate

personId
  <- event.entities.personIds

eventType
  <- event.eventType

eventGroup
  <- §10B event.eventType rule
```

`payload`をyear/person filterのfallback sourceとして検索しない。

### 10E.5 sort / sequence

sortは:

```text
event.sequence asc
```

だけ。

sequenceが重複、逆行、非safe integer等でcanonical Event Stream invariantに違反する場合はUI側でsortして正常化せず500。

UI表示順を変えるための別sort parameterを0.2.0へ追加しない。

### 10E.6 UI表示

Events画面では最低限:

- sequence
- worldDate
- eventType
- importance
- origin
- sourceProcessor
- entities
- payload

を確認可能にする。

`eventId` / `simulationId` / `schemaVersion`もraw canonical itemとして必ず保持される。

payloadを人間向けsummaryへ置換してraw値を失わない。

### 10E.7 EventId / simulationId

このendpointは**既にcommit済みのEventEnvelope**を返すため、MockBattleのpre-allocation candidateとは異なる。

したがってEventListItemViewには正規EventEnvelopeの:

```text
eventId
simulationId
sequence
```

が存在しなければならない。

これらをUI adapterで新規採番・再生成しない。

---

## 10F. Pageable list success dataの完全型

一般一覧4 endpointは共通shape:

```text
PagedListDataView<T> 0.2.0 = {
  items: T[],
  totalCount: non-negative safe integer,
  nextCursor: string|null
}
```

exact3。

適用:

```text
PeopleListDataView
MockBattleCandidatesDataView
EventListDataView
ValidationResultListDataView
```

### 10F.1 BattleLogListDataView

0.1.13正本どおり、battle logだけは返却結果identityをwireで確認できるよう:

```text
BattleLogListDataView 0.2.0 = {
  items: BattleLogItemView[],
  totalCount: non-negative safe integer,
  nextCursor: string|null,
  resultUiRevision: non-negative safe integer
}
```

exact4。

source:

```text
resultUiRevision
  <- fixed UiReadSnapshot.mockBattleStore.latest.resultUiRevision
```

`resultUiRevision`はpage全件で同値。

cursor payload直下へ同義`resultUiRevision` fieldを追加する意味ではない。

cursor側結果identityは§10Gどおり:

```text
dataIdentity="mock-result:<resultUiRevision>"
```

の1か所だけ。

### 10F.2 endpoint mapping

```text
GET /people
  -> exact3 PeopleListDataView

GET /mock-battles/candidates
  -> exact3 MockBattleCandidatesDataView

GET /events
  -> exact3 EventListDataView

GET /validation-results
  -> exact3 ValidationResultListDataView

GET /mock-battles/latest/log
  -> exact4 BattleLogListDataView
```

### 10F.3 wrapperへ追加禁止field

一般exact3 listへ:

- page/pageSize/hasMore/query/sort/filter/dataIdentity
- endpoint独自identity

を追加しない。

BattleLog exact4でも`resultUiRevision`以外の:

- matchId
- sourceWorldUiRevision
- dataIdentity
- currentUiRevision
- page/pageSize/hasMore/query/sort/filter

を追加しない。

top-level response envelopeの`uiRevision`は**fixed read snapshotのsession revision**、`data.resultUiRevision`は**latest battle result revision**であり別意味。

通常step後は:

```text
response.uiRevision > data.resultUiRevision
```

となり得る。これを不整合として拒否しない。

### 10F.4 item型

- People: §6F exact16
- Candidates: §7A exact4
- Events: §10E EventEnvelope exact11
- Validation: §10A exact5
- BattleLog: §12 exact40

### 10F.5 paging

`totalCount` / `nextCursor` / exclusive cursor semanticsは§10C。

BattleLog page 2以降も`resultUiRevision`はfixed read snapshot latestの値とexact一致。

### 10F.6 presets

`GET /presets`は既存items/totalCount/nextCursor shape、`nextCursor=null`、`totalCount=items.length`。

---

## 10G. Cursor dataIdentity 0.2.0 exact matrix

0.1.13のdataIdentity規則を0.2.0でもそのまま維持する。

```text
GET /people
  dataIdentity = "simulation:" + simulationId

GET /mock-battles/candidates
  dataIdentity = "simulation:" + simulationId

GET /events
  dataIdentity = "simulation:" + simulationId

GET /validation-results
  dataIdentity = "validation:" + simulationId

GET /mock-battles/latest/log
  dataIdentity = "mock-result:" + decimal(resultUiRevision)
```

dataIdentityはcursor内部比較値だけであり:

- canonical worldへ保存しない
- response DTOへ書き戻さない
- hash identityとして別用途へ流用しない

### 10G.1 endpoint/query/dataIdentity compatibility

CursorPayload 0.2.0の:

```text
endpoint
query.kind
dataIdentity prefix
```

にはexact compatibility matrixがある。

```text
people:
  query.kind = "people"
  prefix = "simulation:"

mock candidates:
  query.kind = "mock_candidates"
  prefix = "simulation:"

events:
  query.kind = "events"
  prefix = "simulation:"

validation:
  query.kind = "validation"
  prefix = "validation:"

battle log:
  query.kind = "battle_log"
  prefix = "mock-result:"
```

署名/HMACが正しくても、この組合せが不可能なら:

```text
HTTP 400
INVALID_REQUEST
commitState=none
```

とする。

例:

- people cursor + `validation:` prefix
- validation cursor + query.kind=`people`
- battle-log cursor + `simulation:` prefix
- endpointがeventsなのにpayload endpointがpeople

これをSTALE_CURSORへ変換しない。

### 10G.1A dataIdentity suffix canonical syntax

compatibility stepではprefixだけでなくsuffix lexical formも検証する。

```text
simulation:<simulationId>
validation:<simulationId>
```

の`simulationId`部分はcurrent canonical SimulationId validatorのlexical schemaへ合格必須。

```text
mock-result:<decimal>
```

の`decimal`は:

```text
0
または
[1-9][0-9]*
```

だけ。

さらにdecimal parse結果はnon-negative safe integer。

禁止例:

```text
mock-result:
mock-result:+1
mock-result:-1
mock-result:01
mock-result:1.0
mock-result: 1
mock-result:9007199254740992
```

署名/HMACがvalidでも、current CursorPayload schemaのdataIdentityとしてlexical不正なら:

```text
400 INVALID_REQUEST
commitState=none
```

とする。

**canonical syntaxに合格したdataIdentityの値がcurrent targetと異なる場合だけ409 STALE_CURSOR。**

したがって:

```text
mock-result:01
  -> 400

mock-result:1
  current latest.resultUiRevision == 2
  -> 409
```

UI adapterはsuffixをparse後に再formatして受理しない。wire文字列そのものがcanonicalであることを要求する。

### 10G.2 stale value

`CursorPayload 0.2.0`に`resultUiRevision`専用fieldは存在しない。

全cursor共通:

```text
payload.uiRevision
  = cursor発行元のfixed UiReadSnapshot.uiRevision
```

battle logだけ結果identityを:

```text
payload.dataIdentity
  = "mock-result:" + decimal(latest.resultUiRevision)
```

へ保持する。

したがってbindingは次のexact matrix。

```text
people/candidates/events:
  dataIdentityのsimulationId != fixed read snapshot simulationId
  OR payload.uiRevision != fixed read snapshot.uiRevision
  -> 409 STALE_CURSOR

validation:
  dataIdentityのvalidation:<simulationId> != fixed validation store identity
  OR payload.uiRevision != fixed read snapshot.uiRevision
  -> 409 STALE_CURSOR

battle log:
  dataIdentityからparseしたresultUiRevision
    != fixed read snapshotのvalid latest.resultUiRevision
  OR payload.uiRevision
    != fixed read snapshot.uiRevision
  -> 409 STALE_CURSOR
```

battle logで`resultUiRevision`をpayload直下へ重複追加しない。

### 10G.2A normal step後のbattle-log cursor

通常`step`成功は§6Jどおり`MockBattleSessionStore.latest`を保持するが:

```text
UiSession.uiRevision
```

は進む。

そのためstep前に発行済みbattle-log cursorは、latest.resultUiRevision/dataIdentityが同じでも:

```text
old payload.uiRevision != current fixed read snapshot.uiRevision
```

となり409 `STALE_CURSOR`。

これはlatest結果が破棄されたという意味ではない。

新しいcursorなし`GET /mock-battles/latest/log`を行えば同じlatest actionLogsを新current uiRevisionで再ページングできる。

### 10G.2B 更新中GET

`step` / `start` / `reset`等の更新中GETは`operationStartReadSnapshot`を固定する。

そのため更新開始前に発行されたcursorが:

- operationStartReadSnapshot.uiRevision
- operationStartReadSnapshot内latest.resultUiRevision

へ一致していれば、更新処理が内部で新commitを進めていても**そのGET完了まではvalid**。

更新完了後の次GETではnew committed uiRevisionへ変わるためSTALE。

### 10G.2C latest置換/clear

new mock/replay:
- latest.resultUiRevisionもuiRevisionも変化
- old battle-log cursor -> STALE

ready-start/reset:
- latest=null
- uiRevisionも変化
- authenticated old battle-log cursorはcursor-before-resourceでSTALE
- cursorなしは404

process restart:
- session/process binding/HMAC契約を優先し、旧session自体が失効

queryは§10Dどおり:

```text
query.kind / schema incompatible
  -> 400 INVALID_REQUEST

same kind but effective query differs
  -> 409 STALE_CURSOR
```

### 10G.3 old api schema cursor

正しく署名されたCursorPayload 0.1.0は§1Aどおり409 STALE_CURSOR。

これは「current 0.2.0 schemaと互換なpayloadの組合せミス」とは別分類。

### 10G.4 validation order

未認証payloadのsemantic fieldを信頼しない。また0.1.13正本どおり、HMAC署名対象は**decode後payload bytesではなく、第1 base64url segmentのASCII bytesそのもの**。

```text
cursor =
  payloadSegmentAscii
  + "."
  + signatureSegmentAscii
```

検証順:

```text
1. cursor全体のASCII/byte上限、exact 2 segment、空segment禁止
2. 両segmentのbase64url lexical form確認
   - padding禁止
   - base64url外文字禁止
3. signatureSegmentだけdecodeし、HMAC-SHA-256長を検証
4. expectedHmac =
     HMAC-SHA-256(
       processCursorHmacKey,
       ASCII bytes of payloadSegmentAscii
     )
   を計算しconstant-time compare
5. HMAC成功後にpayloadSegmentをdecode
6. decode->canonical base64url再encodeがpayloadSegmentAsciiとexact一致
7. payload bytesをstrict UTF-8 decode
8. canonical JSON parse
   - duplicate key禁止
   - canonical JSON byte表現exact
9. recognized CursorPayload schema classification + strict validation
10. endpoint/query.kind/dataIdentity prefix + canonical suffix compatibility
11. sessionBindingHash
12. current endpoint
13. current dataIdentity target value
    - battle log resultUiRevision比較はdataIdentity suffixを通じてここで行う
14. payload.uiRevision == fixed UiReadSnapshot.uiRevision
15. current CanonicalGetQuery exact
16. nextPosition binding
```

重要:

- payload JSONの`apiSchemaVersion` / `endpoint` / `query.kind`等を読むのはstep 4のHMAC成功後
- HMAC比較はconstant-time
- HMAC keyと`sessionBindingHash`用binding keyを同一鍵にしない
- payload segmentをdecode/re-serializeした別bytesへ署名し直して比較しない
- HMAC前にJSON parseしてold/current schemaを分類しない

分類:

```text
1～3 invalid
  -> 400 INVALID_REQUEST

4 HMAC invalid
  -> 400 INVALID_REQUEST
  （payload内version/kindをstatus分類に使わない）

5～8 encoding/canonical invalid
  -> 400 INVALID_REQUEST

9 valid HMAC + known old 0.1.0 strict schema
  -> 409 STALE_CURSOR

9 unknown/malformed schema
  -> 400 INVALID_REQUEST

10 incompatible current-schema endpoint/query.kind/dataIdentity prefix/suffix syntax
  -> 400 INVALID_REQUEST

11～16 current binding mismatch
  -> 409 STALE_CURSOR
```

未署名/不正署名payloadへ`apiSchemaVersion="0.1.0"`を書いても409にはならない。


---
## 11. Battle DetailedLog paging

### 11.1 canonical shape

BattleResultのDetailedLogは単一配列として扱わない。

current Sprint 1 contract:

```text
DetailedLog = {
  turnOrderLogs: BattleTurnOrderLog[],
  actionLogs: BattleActionLog[]
}
```

### 11.2 log endpoint source

`GET /api/s1_5/mock-battles/latest/log`の唯一のpaging source:

```text
fixed UiReadSnapshot.mockBattleStore.latest.battleResult.detailedLog.actionLogs
```

同じfixed latest recordから:

```text
BattleLogListDataView.resultUiRevision
  = latest.resultUiRevision
```

を返す。

```text
totalCount = actionLogs.length
sourceIndex = actionLogs array index
sequenceInBattle = sourceIndex + 1
```

`sequenceInBattle`は表示用1-based番号であり、canonical `BattleActionLog.actionSequence`を変更しない。

`sourceLogEntry`は同じindexのvalidated canonical action log cloneとする。

`turnOrderLogs`を暗黙joinしてBattleLogItemViewへ合成しない。

turnOrderLogsは0.2.0のlog endpointでは公開しない。将来ActionLog itemまたは別endpointで表示する場合は仕様版を上げる。

---

## 12. BattleLogItemView

0.1.14のwire field集合を完全固定する。「最低限」「必要なら追加」のようにUI実装時の選択余地を残さない。

```text
BattleLogItemView 0.2.0 = {
  sequenceInBattle: positive safe integer,
  actionSequence: non-negative safe integer,
  turnNumber: positive safe integer,
  actorPersonId: string,
  actorSide: "sideA"|"sideB",

  strategySeed: number|null,
  strategyCandidateScores: {
    action: CanonicalObject,
    score: number
  }[]|null,
  strategyTieBreakUsed: boolean|null,

  requestedAction: CanonicalObject,
  resolvedAction: CanonicalObject,
  replacementReason: string|null,
  techniqueId: string|null,

  priority: -1|0|1|2|null,
  actionOrderScore: number|null,

  rangeBefore: "contact"|"close"|"middle"|"long",
  rangeAfter: "contact"|"close"|"middle"|"long",
  rangeShiftApplied: boolean|null,
  rangeShiftBlockChance: number|null,
  rangeShiftBlockRoll: number|null,
  movementChance: number|null,
  movementRoll: number|null,
  evadeDirection: string|null,

  activationChance: number|null,
  activationRoll: number|null,
  activationSucceeded: boolean|null,
  activationFailureReason: string|null,

  hitChance: number|null,
  hitRoll: number|null,
  hit: boolean|null,

  damageVariance: number|null,
  damage: number|null,

  focusBaseRecovery: number|null,
  focusAppliedRecovery: number|null,

  injuryChance: number|null,
  injuryRoll: number|null,
  majorInjuryChance: number|null,
  majorInjuryRoll: number|null,
  injuryResult: "none"|"minor"|"major"|null,

  advantageTurnAwardedTo: "sideA"|"sideB"|null,

  sourceLogEntry: CanonicalObject
}
```

exact top-level key count:

```text
40
```

このfield集合以外を同じ`apiSchemaVersion="0.2.0"`のBattleLogItemViewへ追加しない。

`strategyCandidateScores`はsource `StrategyCandidateScoreEntry[]`の各entryをexactに`{action,score}`としてvalidated cloneする。unknown/missing nested keyは禁止。

`priority`は正規ActionLogが許可する`2|1|0|-1|null`だけを返す。

### 12.1 source

各fieldは同じ`BattleResult.detailedLog.actionLogs[sourceIndex]`からだけ取得する。

```text
sequenceInBattle = sourceIndex + 1
actionSequence    = sourceLogEntry.actionSequence
turnNumber        = sourceLogEntry.turnNumber
...
```

`sourceLogEntry`は`validateBattleActionLog`相当の正規validatorを通過したBattleActionLogのcanonical cloneであり、全63 fieldを保持する。

上記wire convenience fieldは、同じsourceLogEntryの同名fieldを**値変更なしで直接複製**する。丸め、文字列化、percent変換、別logとのjoinをしない。

`strategyCandidateScores`の各entryはsource配列順を維持し、`{action,score}`のvalidated canonical cloneとする。

`requestedAction` / `resolvedAction`は正規action objectのvalidated canonical cloneであり、field追加削除・display label挿入をしない。

`replacementReason`、`evadeDirection`、`activationFailureReason`のfinal upstream exact typeはSprint 1完成codeへDEFERRED_BINDING **DB-014**する。closed unionでないfieldをUIが勝手にenum化しない。ただしwire値はsourceの値そのものであり、UI独自のreason文字列へ置換しない。

### 12.2 techniqueId

```text
resolvedAction.kind == "use_technique"
  -> techniqueId = resolvedAction.techniqueId

otherwise
  -> techniqueId = null
```

requestedAction側のTechniqueIdを「実行技」として使用しない。

### 12.3 rawだけで確認するfield

BattleActionLogの次のfield等は`sourceLogEntry`に必ず存在するが、0.2.0のconvenience fieldへ二重化しない。

例:

- actor/target durability before/after
- actor/target mental before/after
- guarding/evading before/after
- inBattleConsumption before/delta/after
- passiveActionCountDelta
- invalidActionCountDelta
- nextHitModifier before/after
- nextActivationModifier before/after
- surrenderedAfter
- unableToContinueAfter
- canActAfter
- rngStateBefore
- rngStateAfter

UIのraw JSON表示で確認する。

### 12.4 禁止

- `actionKind`の再導入
- `rngDisplay`というUI独自objectの生成
- `reasonText`という自由文章の生成
- requested/resolvedの混同
- TurnOrderLogの暗黙join
- raw RNG stateをconvenience fieldへ別形式で複製
- 同じ0.2.0のままconvenience field集合を増減

人間向け表示labelは画面側の固定label tableでのみ付与し、API DTOへ書き戻さない。

---

## 13. MockBattleSessionStore.latest / replay保存物破損

### 13.1 latest不存在

`latest == null`は既存どおり404。

### 13.2 latest存在だが破損

保存済みrecord / replaySnapshot / BattleResult / hash / cross-referenceがstrict validationに失敗した場合:

```text
HTTP 500
error.code = INTERNAL_ERROR
commitState = none
refreshRequired = false
```

404、422へ落とさない。

部分表示しない。

`replayAvailable=false`へ劣化させて200を返さない。

current World/preset/requestから不足fieldを補完しない。

### 13.3 replay POST

accepted後に内部保存物破損を検出した場合:

- world unchanged
- mock latest unchanged
- uiRevision unchanged
- lastOperation unchanged
- 500 responseをcompleted journalへ保存
- same requestId再送はexact response replay

---


## 13A. MockBattleSessionStore完全性hash

0.1.13では`MockBattleReplaySnapshot`の「schema・hash・相互参照検証」を要求していたが、snapshot/store自身のhash fieldが未定義だった。本追補で明示する。

### 13A.1 schema更新

internal adapter storeを次へ更新する。

```text
MockBattleReplaySnapshot 0.2.0 = {
  schemaVersion: "0.2.0",
  sourceWorldUiRevision: non-negative safe integer,
  runtimeCheckpoint: CanonicalObject,
  participantAId: string,
  participantBId: string,
  battleKind: "mock",
  participantAActionSourceIdentity: CanonicalObject,
  participantBActionSourceIdentity: CanonicalObject,
  replaySnapshotHash: Sha256Hex
}
```

```text
MockBattleLatestRecord 0.2.0 = {
  resultUiRevision: non-negative safe integer,
  battleResult: CanonicalObject,
  eventCandidates: CanonicalObject[],
  replaySnapshot: MockBattleReplaySnapshot,
  latestRecordHash: Sha256Hex
}
```

```text
MockBattleSessionStore 0.2.0 = {
  schemaVersion: "0.2.0",
  latest: null | MockBattleLatestRecord
}
```

これは画面セッション内部型であり、simulation-coreのcanonical stateへ追加しない。

### 13A.2 replaySnapshotHash

hash input:

```text
MockBattleReplaySnapshotHashInput = {
  schemaVersion: "0.2.0",
  sourceWorldUiRevision,
  runtimeCheckpoint,
  participantAId,
  participantBId,
  battleKind,
  participantAActionSourceIdentity,
  participantBActionSourceIdentity
}
```

```text
replaySnapshotHash =
  SHA-256(UTF-8(canonicalJson(MockBattleReplaySnapshotHashInput)))
```

`replaySnapshotHash`自身をinputへ含めない。

### 13A.3 latestRecordHash

hash input:

```text
MockBattleLatestRecordHashInput = {
  resultUiRevision,
  battleResult,
  eventCandidates,
  replaySnapshot
}
```

`replaySnapshot`には検証済み`replaySnapshotHash`を含む完全snapshotを入れる。

```text
latestRecordHash =
  SHA-256(UTF-8(canonicalJson(MockBattleLatestRecordHashInput)))
```

`latestRecordHash`自身をinputへ含めない。

### 13A.4 生成順

新規mock / replay commit成功時:

1. clone側正規commit完了
2. BattleResultの正規validator成功
3. eventCandidates strict validation成功
4. replay snapshot全field確定
5. `replaySnapshotHash`計算
6. snapshot再validation
7. latest record全field確定
8. `latestRecordHash`計算
9. latest record再validation
10. `uiRevision`更新と同一画面セッションcommit境界で`latest`全体置換

hash計算途中失敗またはvalidation失敗では旧latestを保持する。

### 13A.5 読込順

`GET /mock-battles/latest`、log endpoint、replay POSTは、同じimmutable read snapshotから次の順に検証する。

1. MockBattleSessionStore strict schema
2. latestRecordHash再計算一致
3. replaySnapshotHash再計算一致
4. runtimeCheckpoint正規validator
5. BattleResult正規validator
6. eventCandidates strict validator
7. result/snapshot/checkpoint/eventCandidatesのcross-reference

どこか1件でも失敗した場合は§13の500契約を使用する。

hash一致だけでsemantic validationを省略しない。

### 13A.6 hash dependency

hash計算はsimulation-coreが公開済みの`Sha256Provider` interfaceへ接続し、UI-002がNode server用SHA-256実装を所有する。DEFERRED_BINDINGではない。simulation RNGは使用しない。

SHA-256 provider failureはデータ破損422へ変換せず500 `INTERNAL_ERROR`として扱う。

保存済みhash不一致とprovider実行失敗は内部診断上区別してよいが、browserへ秘密情報を返さない。

### 13A.6A UI server SHA-256 ownership

UI serverのproduction providerはUI-002がNode server boundaryで実装する。

必須:

```text
implements Sha256Provider.hashUtf8(text)
lowercase 64-hex SHA-256
UTF-8 exact
simulation RNG不使用
provider throwをraw browser errorへ露出しない
```

simulation-coreへproviderを注入する既存public contractを使用する。
Sprint 1完成後の新symbol/moduleを待つ必要はないためDEFERRED_BINDINGへ登録しない。

---


## 13B. MockBattleViewの判定・最終RNG表示

0.1.13の`MockBattleView.judgeDecision:boolean`だけでは判定計算の実態を表せない。Sprint 1正本では`judgeScore`は次の場合に必須である。

- `endReason == "judge_decision"`
- `endReason == "unable_to_continue"`かつ最終状態で双方`unableToContinue == true`

またBattleResultは`finalRngState`を独立fieldとして保持する。

### 13B.1 wire変更

0.1.13の:

```text
judgeDecision: boolean
```

を廃止し、0.2.0では次へ置換する。

```text
endReasonIsJudgeDecision: boolean
judgementApplied: boolean
judgeScore: CanonicalObject|null
finalRngState: CanonicalObject
```

`judgeDecision`という旧fieldは0.2.0 responseへ残さない。

### 13B.2 mapping

```text
endReasonIsJudgeDecision
  = (battleResult.endReason == "judge_decision")

judgementApplied
  = (battleResult.judgeScore != null)

judgeScore
  = battleResult.judgeScoreのvalidated canonical clone

finalRngState
  = battleResult.finalRngStateのvalidated canonical clone
```

`judgementApplied`を`endReason == "judge_decision"`から推測しない。

### 13B.3 judgeScore null相関

current Sprint 1正本と同じ条件を使用する。

```text
judgeScore != null:
- endReason == "judge_decision"
- または
  endReason == "unable_to_continue"
  かつ
  finalState.participantA.unableToContinue == true
  かつ
  finalState.participantB.unableToContinue == true

judgeScore == null:
- 上記以外
```

したがって双方続行不能時は:

```text
endReason = "unable_to_continue"
endReasonIsJudgeDecision = false
judgementApplied = true
judgeScore != null
```

となる。

UI上では「終了理由」と「判定計算を使用したか」を別表示する。

### 13B.4 seeded final tie-break

judgeScore totalおよび正規同点比較1～5がすべて同値でseeded RNG比較を使用した場合、Sprint 1のBattleResult / summaryLogが保持する正規情報だけを表示・検証する。

Sprint 1.5側で次から勝者またはRNG rollを再構成してはならない。

- PersonId順
- participant配列順
- actionSequence
- `battleSeed % 2`
- `finalState.rngState`との差分推測
- UI側で新しくSeededRngを初期化して再抽選

Sprint 1正本の`summaryLog.judgeSummary`が保持する`decisiveCriterion` / `seededRngRoll`とのcross-referenceはUI-000で監査する。最終physical pathはDEFERRED_BINDING **DB-015**でよいが、意味論を変更しない。

### 13B.5 finalRngState

`finalRngState`はBattleResultの正規validatorを通過した値だけをwireへ出す。

BattleResult validatorが検証する:

- DetailedLog RNG chain
- 判定seeded RNGの追加消費
- terminal RNG
- finalRngState
- finalStateHash

の整合を前提とする。

UI側で`battleSeed`または`finalState.rngState`からfinalRngStateを再生成しない。

`resolution_error`でもBattleResultに保存された正規`finalRngState`をそのまま返し、初期値/nullへ置換しない。

### 13B.6 模擬戦結果画面の最低表示

最低限確認可能にする。

- `endReason`
- `endReasonIsJudgeDecision`
- `judgementApplied`
- `judgeScore`（non-null時はparticipant A/B内訳）
- `battleSeed`
- `finalRngState`
- `validation.overallPassed`

MockBattleViewへBattleResult全文を埋め込まない。上記convenience fieldと専用log endpointを用い、詳細log pagingを迂回しない。

---

## 13C. MockBattleView 0.2.0 全field source mapping

0.1.13のMockBattleViewは一部fieldのsourceが暗黙で、特に`battleSeed`、participant source hash、failure表示をUI側で再構成できてしまう。本追補で全fieldのsourceを固定する。

```text
MockBattleView 0.2.0 = {
  resultUiRevision: non-negative safe integer,
  sourceWorldUiRevision: non-negative safe integer,

  battleResultSchemaVersion: "0.5.0",
  matchId: string,
  simulationId: string,
  battleKind: "mock",

  participantAPersonId: string,
  participantBPersonId: string,
  participantAActionSourceIdentity: CanonicalObject,
  participantBActionSourceIdentity: CanonicalObject,
  participantSourceSnapshotHashes: {
    participantA: Sha256Hex,
    participantB: Sha256Hex
  },

  sourceWorldDate: WorldDateView,
  battleSeed: uint32,

  resultKind: "completed"|"failed",
  winnerPersonId: string|null,
  loserPersonId: string|null,
  endReason: "knockout"|"surrender"|"unable_to_continue"|"judge_decision"|"resolution_error",
  endReasonIsJudgeDecision: boolean,
  judgementApplied: boolean,
  judgeScore: CanonicalObject|null,
  turnsExecuted: non-negative safe integer,

  battleInputHash: Sha256Hex,
  runRuleSnapshotHash: Sha256Hex,
  sprint1ConfigVersion: string,
  sprint1ConfigHash: Sha256Hex,
  techniqueCatalogDataVersion: string,
  techniqueCatalogHash: Sha256Hex,

  finalState: CanonicalObject,
  finalRngState: CanonicalObject,
  failure: null|{
    code: string,
    severity: string,
    targetIds: string[],
    reason: string,
    canContinue: boolean
  },

  eventCandidates: CanonicalObject[],
  validation: CanonicalObject,
  logTotalCount: non-negative safe integer,
  replayAvailable: true
}
```

exact top-level key count:

```text
34
```

missing/unknown top-level keyを禁止する。nested objectは各専用strict schemaへ従う。

### 13C.1 adapter store由来field

```text
resultUiRevision
  <- MockBattleLatestRecord.resultUiRevision

sourceWorldUiRevision
  <- MockBattleLatestRecord.replaySnapshot.sourceWorldUiRevision

eventCandidates
  <- MockBattleLatestRecord.eventCandidates validated canonical clones

replayAvailable
  = true
```

`GET /mock-battles/latest`はvalid latest recordがある場合だけ200なので、`replayAvailable=false`という200分岐を作らない。

### 13C.1B GET latestのsession revision / result revision

`GET /api/s1_5/mock-battles/latest`のHTTP success envelope:

```text
response.uiRevision
  = fixed UiReadSnapshot.uiRevision

response.data.resultUiRevision
  = fixed UiReadSnapshot.mockBattleStore.latest.resultUiRevision

response.data.sourceWorldUiRevision
  = latest.replaySnapshot.sourceWorldUiRevision
```

正常latest recordでは:

```text
sourceWorldUiRevision
<= resultUiRevision
<= fixed UiReadSnapshot.uiRevision
```

を必須とする。

新規mock/replay commit直後は:

```text
resultUiRevision == response.uiRevision
```

通常stepを1回以上commitしlatestを保持した後は:

```text
resultUiRevision < response.uiRevision
```

となり得る。これは正常。

`GET latest` mapper/validatorで:

```text
resultUiRevision == response.uiRevision
```

を一般不変条件にしない。

更新中GETではfixed snapshotが`operationStartReadSnapshot`なので、そのsnapshot内:

```text
latest.resultUiRevision <= operationStartReadSnapshot.uiRevision
```

だけを見る。内部で新週commitが進んでもcurrent UiSession revisionを混ぜない。

---
### 13C.2 BattleResult top-level直結

```text
battleResultSchemaVersion
  <- battleResult.schemaVersion

matchId
  <- battleResult.matchId

simulationId
  <- battleResult.simulationId

battleKind
  <- battleResult.battleKind

participantAPersonId
  <- battleResult.participantAId

participantBPersonId
  <- battleResult.participantBId

participantAActionSourceIdentity
  <- battleResult.participantAActionSourceIdentity

participantBActionSourceIdentity
  <- battleResult.participantBActionSourceIdentity

sourceWorldDate
  <- battleResult.worldDate

resultKind
  <- battleResult.resultKind

winnerPersonId
  <- battleResult.winnerPersonId

loserPersonId
  <- battleResult.loserPersonId

endReason
  <- battleResult.endReason

turnsExecuted
  <- battleResult.turnsExecuted

battleInputHash
  <- battleResult.battleInputHash

runRuleSnapshotHash
  <- battleResult.runRuleSnapshotHash

sprint1ConfigVersion
  <- battleResult.sprint1ConfigVersion

sprint1ConfigHash
  <- battleResult.sprint1ConfigHash

techniqueCatalogDataVersion
  <- battleResult.techniqueCatalogDataVersion

techniqueCatalogHash
  <- battleResult.techniqueCatalogHash

judgeScore
  <- battleResult.judgeScore

finalState
  <- battleResult.finalState

finalRngState
  <- battleResult.finalRngState

validation
  <- battleResult.validation
```

validated canonical objectはfieldを追加削除せずcloneする。

### 13C.3 finalStateから取るfield

BattleResult top-levelに存在しない次の値は、validated `battleResult.finalState`だけを正本にする。

```text
battleSeed
  <- battleResult.finalState.battleSeed

participantSourceSnapshotHashes.participantA
  <- battleResult.finalState.participantA.sourceSnapshotHash

participantSourceSnapshotHashes.participantB
  <- battleResult.finalState.participantB.sourceSnapshotHash
```

battle.started / battle.finished candidate、replaySnapshot、current Worldのparticipantから再取得しない。

BattleResult validatorがtop-level/finalState identityを検証済みであることを前提にする。

### 13C.4 failure

0.1.13の:

```text
failure: null|{ code, message }
```

を廃止する。

```text
resultKind == "completed"
  -> failure = null

resultKind == "failed"
  -> failure = canonical fields from battleResult.finalState.failure
```

具体的mapping:

```text
code        <- finalState.failure.code
severity    <- finalState.failure.severity
targetIds   <- finalState.failure.targetIds
reason      <- finalState.failure.reason
canContinue <- finalState.failure.canContinue
```

`reason`を`message`へ言い換えない。
UI独自の日本語文章をfailure DTOへ保存しない。
`validation.violations[0]`、battle.finished summary、Error.messageをfailure sourceとして使わない。

failedなのに`finalState.failure == null`、completedなのにfailure non-nullならMockBattleViewを生成せず500 `INTERNAL_ERROR`。

### 13C.5 derived convenience field

§13B以外のderived fieldを追加しない。

```text
endReasonIsJudgeDecision
  = (endReason == "judge_decision")

judgementApplied
  = (judgeScore != null)

logTotalCount
  = battleResult.detailedLog.actionLogs.length
```

`participantSourceSnapshotHashes`、battleSeed、failure、sourceWorldDateはderived値ではなく上記正規sourceのdirect projectionである。

### 13C.6 cross-reference

DTO生成前に、各構成objectの正規strict validator/hash validatorを**全件**実行し、さらに次のcross-referenceをすべて検証する。

- latestRecordHash / replaySnapshotHash
- BattleResult正規validation
- `battleKind=="mock"`
- replaySnapshot participant A/B == BattleResult participant A/B
- replaySnapshot action-source identities == BattleResult action-source identities
- sourceWorldUiRevision <= resultUiRevision
- resultUiRevision == current latest recordの保存revision
- eventCandidatesとBattleResultでcurrent schema上重複する全field
- BattleResult.finalStateとBattleResult top-levelでcurrent schema上重複する全field
- `logTotalCount == detailedLog.actionLogs.length`

列挙外だから検証不要と解釈してはならない。current upstream schemaに新しい重複fieldが追加された場合はUI-000で検出し、spec/API版上げなしに未検証のまま通さない。

不一致をDTOのsource優先順位で吸収しない。500とする。

---

## 13D. MockBattle replay checkpoint時点とeventCandidates

### 13D.1 新規mockのcheckpoint取得時点

`POST /mock-battles`が受理され、`expectedUiRevision`・lifecycle・participant pre-start validationまで成功した後、**battle startによるMatchId reservationまたはWorld RNG 1回消費より前**のaccepted immutable source world snapshotを正本とする。

新規mockの処理順:

```text
1. accepted requestのsourceUiRevisionを固定
2. 同revisionのimmutable committed source snapshotを固定
3. participant A/BとActionSourceIdentityを正規adapterで検証
4. source snapshotからfresh isolated runtimeを構築
5. isolated runtimeのbattle開始前checkpointをcanonical clone
6. checkpoint validator成功
7. そのcheckpointをMockBattleReplaySnapshot.runtimeCheckpointへ固定
8. 同じisolated runtimeから正規battle run+commitを1回実行
9. result/eventCandidatesを検証
10. replaySnapshotとresultをlatestへ一括保存
```

`runtimeCheckpoint`は手順8より後のclone stateから作ってはならない。

次を含む、正規battle開始前のrestart/replayに必要な全canonical runtime stateを保持する。

- WorldState / persons / relationships
- source WorldDate
- World RNG state
- MatchIdGeneratorState
- processor runtime states
- RunRuleSnapshot/identityへの正規参照
- battle participant adapterが必要とするcommitted person state
- その他S01-008完成時の正規checkpointがrestartに必要とするstate

exact checkpoint型/moduleはDEFERRED_BINDING **DB-016**。

UI adapterがWorldStateだけを保存し、World RNGまたはMatchId generatorをcurrent worldから後付けしてはいけない。

### 13D.2 sourceWorldUiRevision

新規mock:

```text
replaySnapshot.sourceWorldUiRevision
  = acceptedUiRevision
```

かつ`runtimeCheckpoint`は、そのacceptedUiRevisionで読んだcommitted runtime snapshotとcanonical identity/hashで一致しなければならない。

`sourceWorldUiRevision`はcheckpoint内容そのものへ埋め込むsimulation fieldではなく、adapter cross-reference metadataである。

### 13D.3 replay

`POST /mock-battles/replay`ではcurrent canonical worldから入力を再取得しない。

必ず保存済みvalidated `MockBattleReplaySnapshot`を1正本として:

```text
1. latestRecordHash / replaySnapshotHashを検証
2. runtimeCheckpointをstrict validate
3. runtimeCheckpointからfresh isolated runtimeを再構築
4. 保存済みparticipant A/BとActionSourceIdentityをsnapshotとcross-reference
5. 正規battle run+commitを1回実行
6. 新BattleResult/eventCandidatesを検証
7. 元replaySnapshotとcanonical完全一致するsnapshotを新latestへ引き継ぐ
```

replay成功後に「再実行後clone」から新しいruntimeCheckpointを取り直さない。

replay request受付時のcurrent `uiRevision`は新しい`resultUiRevision`確定のために使用してよいが、次を変更しない。

- replaySnapshot.sourceWorldUiRevision
- replaySnapshot.runtimeCheckpoint
- participant A/B
- ActionSourceIdentity
- replaySnapshotHash

したがって、正規worldが元mock後に進行していても、replayのMatchId reservation前state、World RNG開始state、battleSeed、battleInputHash、BattleResult、eventCandidatesは元実行と完全一致する。

### 13D.4 eventCandidates

`completed`または`resolution_error`のvalid MockBattle latest record:

```text
eventCandidates.length == 2
eventCandidates[0].eventType == "battle.started"
eventCandidates[1].eventType == "battle.finished"
```

正規`RunBattleCommitPlan.eventCandidates`のsource順をそのまま維持する。

追加・削除・sort・dedupeしない。

EventId、simulationId、global sequenceをSprint 1.5 adapterで付与しない。共通Event Stream append前の正規candidateを保持する。

`pre_start_failure`ではlatestを保存しないため、`eventCandidates=[]`を持つMockBattleViewを200で作らない。

post-start execution abortでもlatestを保存しない。

### 13D.5 candidate cross-reference

2候補はcurrent candidate schemaとBattleResultで重複する**全field**を一致させる。次は現時点の代表項目であり、検証対象の上限ではない。

- matchId
- simulationId相当のrun identity（candidate schema上の保持位置に従う）
- participant A/B
- ActionSourceIdentity
- worldDate
- battleKind=mock
- battleSeed
- run/config/catalog identity
- `battle.finished` resultKind/endReason/winner/loser/turns/failure summary
- `battle.finished` finalStateHash等、current Sprint 1 candidate schemaでBattleResultと重複する全field

exact candidate field集合はSprint 1完成codeへDEFERRED_BINDING **DB-017**するが、「重複fieldを全部照合する」という意味論は固定する。

片方だけ一致するcandidate、逆順candidate、3件以上のcandidate、同type2件は500 `INTERNAL_ERROR`。

---

## 13E. MockBattleMutationView 0.2.0 と結果不変条件

0.1.13のrevision契約を維持し、13B～13Dの新MockBattleViewへ同期した完全型を固定する。

### 13E.1 complete wire type

```text
MockBattleMutationView 0.2.0 = {
  acceptedUiRevision: non-negative safe integer,
  completedUiRevision: non-negative safe integer,
  replay: boolean,
  durationMs: non-negative safe integer,
  result: MockBattleView
}
```

exact key count:

```text
5
```

### 13E.2 200 responseが存在する条件

`POST /mock-battles`または`POST /mock-battles/replay`がHTTP 200を返すのは、正規battle runが:

```text
completed
または
resolution_error
```

の完全な`RunBattleCommitPlan`をisolated clone内で正規commitでき、validated latest record全体を画面セッションへ原子的置換できた場合だけ。

次ではMockBattleMutationViewを返さない。

- request validation error
- stale revision
- pre_start_failure
- post-start execution abort
- latest/replay store corruption
- latest record hash生成/validation失敗
- response commit前に発生したinternal failure

それぞれ既存error envelope契約を使用する。

### 13E.3 revision

新規/replay共通:

```text
completedUiRevision = acceptedUiRevision + 1
result.resultUiRevision = completedUiRevision
UiSession.uiRevision after commit = completedUiRevision
MockBattleSessionStore.latest.resultUiRevision = completedUiRevision
```

全加算はsafe integer。

`acceptedUiRevision == Number.MAX_SAFE_INTEGER`等で`+1`不能ならcommit前`INTERNAL_ERROR`、latest/world/revision不変。

4値のどれかが不一致なら200 DTOを構築しない。

### 13E.4 replay flag / source revision

```text
POST /mock-battles
  -> replay = false
  -> result.sourceWorldUiRevision = acceptedUiRevision

POST /mock-battles/replay
  -> replay = true
  -> result.sourceWorldUiRevision
       = saved replaySnapshot.sourceWorldUiRevision
  -> result.sourceWorldUiRevision <= acceptedUiRevision
```

replayでsourceWorldUiRevisionを受付revisionへ更新しない。

`result.sourceWorldUiRevision`は結果を生成した**正規world source**のrevision、`result.resultUiRevision`はlatest recordを画面sessionへ保存したrevisionであり、意味を混同しない。

### 13E.5 durationMs

0.1.13のmonotonic duration契約をそのまま使う。

durationMsはadapter operationの表示用値であり:

- BattleResult
- latestRecordHash
- replaySnapshotHash
- determinism projection

へ含めない。

same requestId response replayでは保存済みdurationMsをそのまま返し再計測しない。

### 13E.6 `resultKind="completed"`

必須:

```text
result.resultKind == "completed"
result.winnerPersonId != null
result.loserPersonId != null
winner != loser
winner/loser are exactly the two participants
result.endReason != "resolution_error"
result.failure == null
result.finalState.status == "completed"
result.validation.overallPassed == true
```

judge関連は§13Bのnull相関を追加適用する。

- judge_decision -> judgementApplied=true
- 双方unable_to_continue -> judgementApplied=true
- その他 -> current BattleResult正本に従いjudgeScore null

### 13E.7 `resultKind="failed"`

0.2.0でMockBattleViewとして保存可能なfailedは正規`resolution_error`だけ。

必須:

```text
result.resultKind == "failed"
result.winnerPersonId == null
result.loserPersonId == null
result.endReason == "resolution_error"
result.endReasonIsJudgeDecision == false
result.judgementApplied == false
result.judgeScore == null
result.failure != null
result.finalState.status == "failed"
result.finalState.failure != null
result.validation.overallPassed == false
```

`result.failure`は§13CどおりfinalState.failure直結。

failed BattleResultでもeventCandidatesは§13Dどおり正規2件:

```text
battle.started
battle.finished
```

を持つ。

### 13E.8 event / latest / responseの同一record性

0.1.13 atomic commit契約に従い、MockBattle responseは**commit後readbackで初めて構築してはならない**。

手順:

```text
1. isolated battle完了
2. candidate MockBattleSessionStore.latest recordをimmutable構築
3. replaySnapshotHash / latestRecordHash確定
4. candidate latest strict validation
5. candidate next UiSessionStateを構築
   - latest=candidate record
   - uiRevision=accepted+1
6. candidate latestからMockBattleViewを構築
7. MockBattleMutationViewを構築
8. success envelope strict validation
9. final HTTP200 JSON bytesを安全にserialize
10. candidate next session state
    + uiRevision
    + exact completed journal success bytes
    を1 atomic commit
11. transportへsaved bytes送信
```

responseの`result`とcommitされる`latest`は、**同じimmutable candidate latest record**を唯一sourceとする。

commit後に別sourceから再mapして差分を作らない。

commit前local `BattleResult`からresponse convenience fieldを独立構築することも禁止する。

commit完了直後、別requestを挟まないなら:

```text
saved POST response.data.result
==
GET /mock-battles/latest.data
```

のcanonical contentがexact。

### 13E.9 atomic failure boundary

step 1～9のどこかでfailure:

```text
HTTP 500
commitState=none
world unchanged
latest unchanged
uiRevision unchanged
lastOperation unchanged
```

accepted requestならfallback/normal failure responseをcompleted journalへ保存可能。

step 10のatomic commitは部分適用禁止。

step 10成功後step 11 transport failure:

- latest/new uiRevision/completed success journalを保持
- 500 `commitState=complete`へ変換しない
- same requestIdでsaved HTTP200 response exact replay

MockBattleMutationView exact5 key、MockBattleView exact34 keyをcommit前serializerまでstrict検証する。

旧:

```text
judgeDecision
failure.message
```

を再導入した場合はunknown keyでcommit前拒否。


---
## 13F. MockBattle participant A/B order

`participantAId`と`participantBId`はunordered pairではない。

```text
request.participantAId -> sideA
request.participantBId -> sideB
```

snapshot、ActionSourceIdentity、BattleState、battleInputHash material、event candidates、BattleResult、MockBattleView、replay snapshot、BattleLog actorSideまで同順序。

PersonId/displayName/candidate順でsortしない。

`participantAId == participantBId`はbattle eligibility前の400 `INVALID_REQUEST`。両fieldへ`conflicting_fields`を返す。

これは**strict request-body validation段階の受理前拒否**であり:

- request journal recordを作らない
- requestIdを予約しない
- updateControlを取得しない
- participant eligibility/pre-start validatorを呼ばない
- MatchId / World RNG / battle seed生成を実行しない

同じrequestIdを再送してもsaved 400 replayではなく、その時点のrequest validationから新規評価する。

A/B swapは別request意味論・別fingerprint。unordered pairへnormalizeしない。

replayは保存A/B順をexact継承する。

---


## 13G. 連続new mockとcanonical world不変性

new mockはUiSession latest/uiRevisionだけを更新し、canonical worldへcommitしない。

canonical world、ordered A/B、rules/config/catalog/action sourceが同じままnew mockを2回実行した場合:

```text
BattleResult #1 == #2
eventCandidates #1 == #2
battleSeed #1 == #2
matchId #1 == #2
finalRngState #1 == #2
```

を必須とする。

uiRevision/source-result revisions/requestId/journal/duration/latest hashesは異なってよい。

adapter metadataをbattle input/RNG/hashへ混入せず、mock-only uniquenessのためMatchId/seedを再採番しない。

---


## 13H. replayは保存source snapshotを唯一正本とする

`POST /mock-battles/replay`は現在worldで同じ2人を再戦させる操作ではなく、保存replaySnapshotの元battle開始直前sourceを同じ入力/RNG/ID状態で再実行する。

current `expectedUiRevision`はsession concurrency gateだけ。battle sourceは保存`replaySnapshot`だけ。

DB-016 checkpoint/rebuild APIからWorldDate、Person/Sprint1PersonState/temporary condition、World RNG、MatchIdGeneratorState、EventAllocation、run rules/config/catalog等を復元する。

latest保存後にworldが進み、現在Personがretired/deceased/injured/技状態変更してもcurrent candidate/eligibilityを再評価しない。保存snapshotがvalidならoriginal battleをexact再現する。

replay成功:
- canonical current world不変
- latest/uiRevision/journal/lastOperationだけ既存契約どおり更新
- sourceWorldUiRevisionはoriginal replaySnapshot値を維持
- BattleResult/eventCandidates/matchId/battleSeed/finalRng/A-B identitiesはoriginal exact

start/resetで旧latestをclearした後はold checkpointを**新しいreplay requestへ再利用しない**。

区別:

```text
start/reset後 + new requestId replay
  -> current latest不存在を通常評価
  -> old checkpointを探し直さない

start/reset前にcompleted journalへ保存済みのreplay requestIdを
same fingerprintでstart/reset後に再送
  -> request journal precedence
  -> replay operationを再実行しない
  -> latest/resource existenceを再評価しない
  -> 保存済み旧HTTP status + response body bytesをexact replayし、非決定的transport headerはexact一致対象外
```

old completed replay responseのjournal replayでは:

- current latest=nullのまま
- current world/validation/lastOperation/uiRevisionを変更しない
- old checkpointをnew/reset後worldへ適用しない

したがって「replay sourceはclear済み」と「old requestIdのresponse replay」は別契約。

---

## 14. elapsedWeeks

canonical Sprint 1 `WorldDate`に`absoluteWeek`が存在するため、WorldSummaryViewの`elapsedWeeks`を次へ固定する。

```text
WorldSummaryView.elapsedWeeks
  = committed canonical WorldDate.absoluteWeek
```

`WorldDateView.week`はcanonical `WorldDate.weekOfMonth`からmapする。

禁止:

- uiRevisionから算出
- Event countから算出
- lastOperationから算出
- worldDateのyear/month/weekをUI独自式で逆算
- ProcessorRuntimeStateの別counterをelapsedWeeksの正本にする

statHistoryのwindow計算も同じ`elapsedWeeks=W`を使う。

---

## 15. upstream schemaVersion drift

Sprint 1.5文書内の以下のliteral versionはUI独自versionではない。

例:

- SimulationIdentity schemaVersion
- RunRuleSnapshot schemaVersion
- BattleResult schemaVersion
- TechniqueDefinition schemaVersion
- EventEnvelope schemaVersion

これらは「現時点で期待するupstream binding」である。

UI-000でSprint 1完成commitの実versionへ再照合する。

不一致なら:

- adapterで旧versionを偽装しない
- 古いversion文字列のまま新構造を返さない
- `spec_fix_required`としてSprint 1.5仕様を版上げしてからUI-001へ進む

現時点で確認済みのBattleResult `0.5.0`等を根拠なく変更しない。

---

## 16. 今回変更しない既存契約

次は0.1.13ですでに一意であり、本追補では変更しない。

- requestId fingerprint
- same requestId stored response exact replay
- request journalのsession/process lifetime
- durationMs monotonic計測
- updating中GETのoperationStartReadSnapshot
- start/reset failure時の旧world保持
- cursor HMAC/session/process/query/revision binding
- 15 endpoint構成
- normal battle draw禁止
- BattleResult schemaVersion 0.5.0の現時点binding
- mock battleで正規run/commit pathを使用する契約
- EventId/global sequenceを共通append層で割り当てる契約
- learnedTechniqueCountがacquiredのみを数える契約
- TechniqueCategoryが`unarmed | sword | magic`である契約
- PersonDetailへbattleDecisionProfile/injuryPronenessを永続値として追加しないこと

特に、`commitRunBattlePlan`と未割当eventCandidatesは矛盾しない。clone内の正規commitと、後段の共通EventEnvelope allocationを区別する現行契約を維持する。

---


## 16A. UI-009 決定性比較projection

UI-009では、raw UI session objectを独立run同士でそのまま比較しない。一方、**canonical simulation側の決定的IDを「IDだから」という理由で除外しない**。

決定性比較のauthority:

```text
1. 05-statistics-output の決定性比較規則
2. accepted Sprint 0 verifierが固定した意味論
3. S01-009 current same-seed contract
```

S01-009のverification comparator自体は`apps/simulator`内部のverification-private実装であり、Sprint 1.5 production UIからimport/reuseすることを要求しない。

UI-009は独立実装してよいが、**同じauthority rule-setをexactに実装**し、fixtureでS01-009/Sprint0の決定性意味論と一致させる。

同一seed / 同一config / 同一implementationでは次を決定的比較対象として保持する。

```text
simulationId
EventEnvelope.eventId
EventEnvelope.simulationId
EventEnvelope.sequence
PersonId / FamilyId / LineageId / RelationshipId
MatchId
world/runtime canonical content
event payload
RNG state
RunRuleSnapshot / hash
```

特に:

```text
same-seedでsimulationIdだけ違う -> FAIL
same-seedでeventId/simulationId由来event metadataだけ違う -> FAIL
```

different-seed検証では`simulationId`が違うだけでは実体差の証明として不十分であり、S01-009どおりworld/entity contentの差も要求する。

除外してよいのはauthorityが非決定と定義するexecution/runtime環境metadataおよびUI adapter-only metadataだけ。

S01-009 current run-metadata same-seed契約では非決定除外はexactに:

```text
runId
realStartedAt
realEndedAt
```

で、同一verification HEAD内の`commitId`は比較対象。

05正本が非決定とする現実時刻・処理時間・最大メモリ・出力path・実行環境固有値は、それらが比較projectionへ存在する場合だけ除外する。

UI独自の非決定field追加やblanket `*Id`除外は禁止。

### 16A.1 CanonicalSimulationComparisonProjection

```text
CanonicalSimulationComparisonProjection 0.2.0 = {
  deterministicIdentityMaterial: CanonicalObject,
  runRuleSnapshot: CanonicalObject,
  runRuleSnapshotHash: Sha256Hex,
  deterministicRuntimeSnapshot: CanonicalObject,
  deterministicEventStream: CanonicalObject[],
  deterministicStatistics: CanonicalObject|null
}
```

`deterministicIdentityMaterial`はsame-seedで一致すべきcanonical simulation identityを保持し、`simulationId`を除外しない。

runtime/eventはDB-018でrepo-boundするcanonical snapshot/export sourceから構築し、上記authority rule-setだけを適用する。

`EventEnvelope.eventId` / `simulationId` / `sequence` / payloadを保持する。

### 16A.2 UI metadata exclusion

次はsimulation canonical contentではなくUI adapter/session側metadataなのでprojection外。

```text
UiSession
uiRevision
csrf
request journal
lastOperation
updateControl
HTTP metadata
duration
errorReference
serverInstance
cursor
MockBattleSessionStore adapter record/hash/revision
process-local/session-local IDs
```

現実時刻・performance・output path等はauthority上の非決定metadataとして、存在する場合だけ除外する。

### 16A.3 DET-001 UI 1週×N vs UI N週

同じpreset/seed/upstream versionsで、1週×NとN週一括をDB-018 deterministic comparison projection全文exact比較。simulationId/eventIdを含む決定的fieldを保持する。Nは1,4,48とDB-019年境界値。

### 16A.4 DET-002 UI vs CLI

CLIとUIは同じcanonical snapshot/export意味論と同じ05/S01-009 authority rule-setを使用し、comparison projection全文exact。実装helperの同一性は要求しない。same-seedのsimulationId/eventId差はFAIL。

### 16A.5 DET-003 UI same seed

同じ操作列の独立session 2件でdeterministic comparison projection exact。session-local metadataだけを除外し、simulationId/eventIdは一致必須。

### 16A.6 boundary seed

seed 0 / 4294967295それぞれ独立run 2回をdeterministic comparison projection exact比較。simulationId/eventIdを含むcanonical deterministic fieldsを保持。

### 16A.7 MockBattleDeterminismProjection

same-source mock/replay比較はvalidated canonical:

```text
{ battleResult, eventCandidates }
```

をexact比較。adapter-only revisions/hash/request/durationは除外。

### 16A.8 DET-006 模擬戦前後

mock/replay前後のcanonical worldをDB-018 deterministic comparison projectionでexact比較。

### 16A.8A DET-007 repeated new mock from unchanged canonical world

同一canonical source・同じordered A/B new mock 2回でMockBattleDeterminismProjection exact。matchId/battleSeed/finalRng/eventCandidatesもdirect exact。

### 16A.9 hash-only比較禁止

deterministic comparison projectionのcanonical JSON本文を比較し、hashだけで済ませない。

### 16A.10 normalization drift

05/S01-009 authority rule-setの変更・新しい正規非決定field追加・UI独自除外を検出したら`spec_fix_required`。verification-private helperの内部実装変更だけではspec_fix_requiredにしない。

---

## 17. 追加受入条件

0.1.13の受入条件1～79を維持し、次を追加する。

80. UI-000で`DEFERRED_BINDING`と`SPEC_UNDEFINED`が区別され、UI-001開始時にSPEC_UNDEFINEDが0件である。
81. 模擬戦またはreplayのpost-start execution abortが500 `INTERNAL_ERROR` / `commitState=none`となり、canonical world、RNG、ID、event、mock latest、uiRevision、lastOperationを変更しない。
82. execution abortをBattleResultの第4種または`resolution_error`へ偽装しない。
83. 通常response serializer失敗時に独立minimal fallback serializerが使用され、秘密情報・stack・任意Error.messageを返さない。
84. accepted POSTのfallback 500がcompleted journalへ保存され、同requestId再送時に同じstatus/body bytesを返す。
85. `errorReference`がPOSTではrequestId、GET等ではsimulation非依存process-local sourceから生成され、simulation RNGを消費しない。
86. failure responseの`refreshRequired`がtop-level必須、ApiError内禁止、success responseではfield自体禁止である。
87. Person list/detailが`familyId`、`lineageId`、`currentRank`、`highestRank`、`retirementRank`をcanonical Personから直接mapし、`affiliationLabels`/`overallRank`を作らない。
88. abilities/aptitudesの表示・sort/filterが`surfaceValue`だけを使い、genetic valuesを混ぜない。
89. Person detailで`fatigue/injury/condition/confidence`がcanonical temporaryConditionから直接確認できる。
90. parent/master表示が全canonical relationshipから配列で導出され、単数mentorを推測しない。
91. TechniqueViewがPersonTechniqueStateとTechniqueDefinitionの直接mappingで構成され、`usageConditions`等のUI独自JsonValue合成を行わない。
92. 正規historical instructor PersonIdが存在しない場合、修行履歴へ現在の師匠を後付けしない。
93. `GET /events?personId=`が`EventEnvelope.entities.personIds`だけを人物filter正本として使用する。
94. mock battle log endpointが`BattleResult.detailedLog.actionLogs`だけをpage sourceとし、turnOrderLogsを暗黙joinしない。
95. BattleLogItemViewがrequestedActionとresolvedActionを区別し、置換前TechniqueIdを実行技として表示しない。
96. 保存済みmock latest/replay recordの破損が404/422/劣化200ではなく500 `INTERNAL_ERROR`となり、状態を変更しない。
97. `WorldSummaryView.elapsedWeeks`がcanonical `WorldDate.absoluteWeek`から直接取得される。
98. UI-000でupstream schemaVersion driftを検出した場合、adapterで吸収せずSprint 1.5仕様を先に修正する。
99. S1.5-SPEC-0.1.15の全success/failure responseおよびCursorPayloadが`apiSchemaVersion="0.2.0"`へ同期し、署名済み旧0.1.0 cursorをcurrent 0.2.0 processへ渡した場合は改ざん400ではなく409 `STALE_CURSOR`として拒否する。
100. TrainingHistoryItemViewが正規`training.action_selected`を週次anchorとしてevent列から機械的に構築され、0.1.13既存の`max(0,W-47)..W`の48週窓を`absoluteWeek desc`で返し、anchor欠落・重複・fixture不整合を部分補完しない。
101. MockBattleReplaySnapshotおよびlatest recordが明示的SHA-256 hashを持ち、GET/log/replayでhash再計算・正規validator・cross-referenceを順に実行し、改ざんを500として検出する。
102. ValidationResult一覧がgeneric `ok/issues[path,message]`だけを共通意味論として使用し、存在しない共通`code/sourceProcessor/canContinue`を発明せず、0.2.0では`status=success|failure`だけをfilterとして使用する。
103. UI-009がtest-only canonical comparison projectionを使用し、UI 1週×N対N週、CLI対UI、same-seed、boundary-seed、模擬戦replay、模擬戦前後を明示projectionのcanonical JSON全文で比較し、uiRevision/request/journal/duration等のUI metadataをsimulation比較へ混入させない。
104. 模擬戦replayでwire MockBattleView全文を比較せず、canonical BattleResult + pre-allocation eventCandidatesだけのMockBattleDeterminismProjectionを元実行とexact比較する。
105. WorldSummaryViewのrun固定fieldがRunInitializationSnapshot内のvalidated identity/rule materialから、worldDate/elapsedWeeks/personCountが1つの同一committed runtime generationから取得され、personCountはlogical active+historical全Person件数を表す。Historical partition後もnormal summary GETでarchive全payload scanを要求せず、partial_failure時に失敗週draftまたはpreset registryを参照しない。
106. partial_failureの`failedWeek.validation`が失敗週public facadeの非commit正規validation collectionを元順のまま保持し、CommittedValidationViewStoreやStableErrorCode等から再構成されない。
107. MockBattleCandidateViewが適格者だけを返して参加不可reasonを合成せず、POST accepted後の参加不可は正規pre-start validationにより422 `BATTLE_PRE_START_FAILURE`として非commitで返される。
108. MockBattleViewが`endReasonIsJudgeDecision`と`judgementApplied`を分離し、双方`unable_to_continue`時に`endReasonIsJudgeDecision=false`かつ`judgementApplied=true`かつ`judgeScore!=null`を正しく表現する。
109. MockBattleViewの`finalRngState`がvalidated BattleResultの同fieldを唯一sourceとし、battleSeed/finalState/PersonId等からUI側で再生成・再抽選しない。
110. MockBattleView 0.2.0の全field sourceが固定され、battleSeed/participant source hashesはBattleResult.finalState、failureはfinalState.failureを直接正本とし、event/validation/error messageから再構成しない。
111. PersonDetail.statHistoryがcomplete ability mutation mapとrun全期間の`training.stat_growth_applied` chainからexactに算出され、ready正常時はobject必須、event欠落・chain不整合をnullへ劣化させない。
112. 新規mockのMockBattleReplaySnapshot.runtimeCheckpointがMatchId予約・World RNG消費前のaccepted committed source runtimeを完全保持し、replayではcurrent worldを参照せず同snapshotをcanonical exactで引き継ぐ。
113. valid MockBattle latestのeventCandidatesが正規RunBattleCommitPlanどおり`[battle.started,battle.finished]`の2件exact orderであり、全重複fieldをBattleResultとcross-referenceし、pre_start_failure/execution abortではlatestを保存しない。
114. PersonDetailの`currentMental`、`learningFocusTechniqueId`、`techniques`および一覧の`learnedTechniqueCount`が同じvalidated `Person.sprint1State`を唯一sourceとして相互一致し、GET時補完・event/resultからの再構成を行わない。
115. Event `eventGroup`が`training.` prefixと`technique.learning_progressed|technique.acquired`のexact規則へ固定され、masteryをtechnique_learningへ混入せず、group変更時の旧cursorをSTALE_CURSORとして拒否する。
116. 全GETの失敗判定順が`security/session -> request syntax -> read snapshot -> lifecycle -> cursor authentication/schema/binding -> resource existence -> internal integrity -> projection`へ固定され、旧valid schemaは認証成功後だけSTALE、cursor-before-resourceを含む複合失敗条件でもstatus/codeが一意である。
117. 0.1.13の旧画面文言「所属／総合ランク／単数師匠／候補参加不可reason」が0.2.0で再合成されず、Family/Lineage ID、3 rank、formal master/parent配列、direct TechniqueDefinition、POST pre-start validation表示へ置換される。
118. TechniqueDefinitionView 0.2.0がcurrent productionの`TECHNIQUE_DEFINITION_KEYS`とexact 31-key一致し、key driftをadapterで吸収せず仕様/API版上げへ戻す。
119. ApiError.validationが`CanonicalObject[]`の1-result-1-element原形配列としてDOMAIN_VALIDATION_FAILED/BATTLE_PRE_START_FAILUREだけに現れ、single object/null/empty array/issue flattenを許さない。
120. pageable GETの`totalCount`がfilter後・cursor/page前の全一致件数で全page不変、nextCursorが返却page後に残件がある場合だけ非nullとなる。
121. `INVALID_REQUEST`の`fieldErrors`がcanonical request JSON Pointerと固定7種のFieldErrorCodeを使用し、field特定不能時はfieldErrors自体を省略、複数itemはfield/codeのstable順で返し、messageは既存どおり表示専用非決定値として扱う。
122. CanonicalGetQuery 0.2.0が5種のexact discriminated unionとして固定され、raw cursorを含まず、ValidationQueryが`kind/status/sortKey/sortOrder/limit`を全部materializeし、旧`code` query/cursorを自動変換しない。
123. PersonDetailViewがcanonical `Person.qualifiedMaster`を必須booleanとして直接表示し、rank/formal-master関係/event等から再計算せず、career不変条件違反を補正せず500として検出する。
124. MockBattle候補GETがcanonical source/semantics破損を500として候補外と区別し、validated sourceに対してliving+active+mock career/age+injury閾値のexact predicateだけでmembershipを決め、pair-level同一人物条件をGETへ混ぜない。
125. PersonListItemView/PersonDetailView 0.2.0が§6Fの完全型・exact key setへ統一され、ready正常PersonDetailではstatHistory非nullかつtrainingHistory.available=true、旧0.1.13 fieldやdetail-only fieldを暗黙再追加しない。
126. GET等の`server:` errorReference用serverInstanceIdがHTTP bind前にOS CSPRNGから1回だけ生成・検証され、生成失敗はprocess startup failure、counter枯渇はwrap/fallbackなしのprocess-fatalとなり、simulation stateへ影響しない。
127. MockBattleMutationView 0.2.0がexact5 key、MockBattleViewがexact34 keyで、revision4値・new/replay source revision・completed/failed不変条件・candidate latestとresponse sourceが一致し、旧judgeDecision/failure.messageやraw BattleResult全文を再導入しない。
128. PersonDetailのtemporaryConditionがfatigue/injury 0..100・condition/confidence -20..20のinteger exact rangeを持ち、currentMentalが同一snapshotの`0..50+spirit.surfaceValue`を正規Sprint1PersonState validatorで満たし、UI clamp/default/mixed-generationを行わない。
129. SimulationMutationView 0.2.0がexact14 keyで、start/reset・step success・step partialのrevision/weeks/failedWeek/count/summary相関をstrict検証し、partial failure週のdraftを件数・summary・validation storeへ混入させない。
130. TechniqueView 0.2.0がexact9 keyで、learning progressを`0..definition.learningProgressRequired*10`、masteryを0..10000のintegerとして正規state+catalog semantic validatorで検証し、learnedStateをacquiredAbsoluteWeekのnull相関だけから導出する。
131. TechniqueDefinitionViewがcurrent productionで確定済みのcategory/tier/consumption/priority/BattleRange、0..100系値域、learningProgressRequired 1..10000、mentalCost safe integer、modifier ±20、actionTraits exact5 false、canonical array順をそのまま保持し、未確認nested literalだけをdirect validated DEFERRED_BINDING **DB-010**として残す。
132. `GET /events`のitemが正規validated EventEnvelopeの11 top-level fieldを追加削除なしで直接返し、dataがexact3 key、sourceがcommitted Event Streamだけで、invalid event・draft/candidate eventを除外/混入しない。
133. `GET /validation-results`のissue/item/list dataがexact2/5/3 keyで、status/issueCount/issuesをraw generic ValidationResultとindex単位で完全cross-referenceし、issueをsort/dedupe/filterしない。
134. pageable success dataはPeople/Candidates/Events/Validationがexact3 `{items,totalCount,nextCursor}`、BattleLogだけ0.1.13正本どおり`resultUiRevision`を加えたexact4となり、top-level envelope `uiRevision`とbattle result revisionの意味を分離して不要なwrapper fieldを追加しない。
135. API success/failure envelopeが0.2.0 exact5/exact6へ固定され、ApiError allowed8 keyのpresence matrix、uiRevision/isUpdating、refreshRequired、errorReference、commitState相関をstrict検証し、success/failure field混在を許さない。
136. 既知DEFERRED_BINDINGがDB-001～022のID付き台帳へ全件登録され、UI-000で全rowのactual symbol/module/type/test/commitをmatchedにし、未登録の新しい未確定を発見した場合は勝手に追加せずspec_fix_requiredで仕様版上げへ戻る。
137. Cursor dataIdentityが5 endpointのexact matrixへ固定され、署名済みでもendpoint/query.kind/prefix不適合は400、current-compatible shapeのsimulationId/resultUiRevision/query/revision不一致だけを409 STALE_CURSORとして分類する。
138. DEFERRED_BINDING台帳がDB-001～022へ正規化され、Sprint 1完成後でなければ確定できない物理bindingだけを保持する。StableErrorCodeとUI server SHA-256 providerはSprint 1.5 local ownershipへ移し、training.action_selectedはDB-021、relationship runtime collection/read/validator bindingはDB-022として残し、GATE-012でmatched=22を要求する。
139. TrainingHistory anchorのtarget null相関がtrain_stat / learn_technique / practice_technique / restごとに固定され、forced/forcedReasonはvalidated upstream payloadからのみdirect projectionし、UI自由文生成・null補完を行わない。
140. 規範本文中の個別DEFERRED_BINDINGが必ずDB-001～022のIDを併記し、台帳subjectと1対1対応し、IDなし・台帳外・subject不一致をUI-000文書監査でspec_fix_requiredとして検出する。
141. MIG-001～037の0.1.13旧contractがproduction DTO/query/validator/page codeへdeprecated alias・互換変換として残らず、UI-000では37件すべてのold-contract absence・ownerTask・negative test plan・planned evidence kindを監査して`ready_to_implement`へ揃え、各owner taskでimplementation evidence/negative testを追加し、UI-010で全37件`implemented`を確認する。
142. living PersonのageがPeople list/PersonDetail/MockCandidateの全てで保存`Person.currentAge`直結となり、`computeCurrentAge(worldDate.year,birthYear)`は同一snapshotのvalidation専用cross-check、deceased ageはnull・deathYear/ageAtDeathは保存値直結となる。

143. PersonDetailのparentPersonIds/formalMasterPersonIdsがcurrent canonical relationship collectionの全対応recordを正本とし、active/current/first/latest等のUI独自filter・単数化を行わず、exact relationship schema/field/validatorだけをDB-022でbindingする。

144. Cursor検証が第1base64url segmentのASCII bytesそのものをHMAC-SHA-256署名対象とし、constant-time認証成功後にだけpayload decode/canonical JSON/schema/semantic分類を行う。known-old 0.1.0の409はvalid HMAC+valid old strict schemaだけで、不正署名payloadは内部version/kindに関係なく400となる。

145. MockBattleのparticipantAId/BId順がrequestからsideA/sideB・hash・event・result・replayまで意味のある順序としてexact保持され、同一Personは400 conflicting_fields、A/B swapをsort/normalize/cache同一化しない。

146. canonical world unchangedかつordered A/B等のsimulation input同一で連続new mockした場合、BattleResult/eventCandidates/battleSeed/matchId/finalRngStateがexact一致し、uiRevision/requestId/latest hash等adapter metadataだけが変化可能で、mock重複回避のID/seed再採番を行わない。

147. MockBattleView 0.2.0はBattleResult全文をraw fieldとして返さずexact34を維持し、表示に必要なconvenience fieldはvalidated BattleResultからdirect mapping、詳細action logは`GET /mock-battles/latest/log`だけでページングしてwire重複・paging迂回を行わない。

148. PersonDetail.techniquesが保持PersonTechniqueStateだけをTechniqueId canonical昇順で返し、duplicate/synthetic catalog entryを禁止し、non-null learningFocusTechniqueIdを同配列1件＋active catalogへexact cross-referenceする。

149. lastOperation/lastOperationRequestIdがHTTP200 completed journal responseだけを正本とし、atomic start/reset/mock/replayのapplication-level failureはcommit前noneでstate/lastOperation不変、stepの500 partial/completeだけがstate/uiRevisionを進め得る一方lastOperationを更新せず、HTTP200 domain partial_failureだけは正常lastOperationになる。

150. 新規UiSessionがsession IDをOS CSPRNG 32 bytesから最大3 attemptsでunique確定し、既存ID衝突時は保存前に再生成、3回全衝突で500 INTERNAL_ERROR noneとなる。unique ID確定後に独立CSRF 32 bytesを生成し、draft-first strict validation後だけ一括store commitし、既存session readではsessionId/CSRF/process cursor keysをrotateしない。

151. revision増加mutationが0.1.13のlock/revision/lifecycle/resource/domain/pre-start validationを通過した後、最初のstate/RNG/ID mutation直前にmaxRevisionDeltaをsafe preflightし、start/reset/mock/replay=1・step=requestedWeeksでMAX_SAFE_INTEGER超過可能なら500 INTERNAL_ERROR noneとして1件もcommitせず、前段422/404/409をcapacity errorで上書きせずoverflow由来partial/wrapを発生させない。

152. ApiError commitStateが0.1.13のatomic commit境界へ同期し、start/reset/new mock/replayのapp-level INTERNAL_ERRORはnoneだけ、stepは0週commit=none・1..N-1週commit=partial・全N週commit済み後段failure=completeとなり、atomic commit後transport failureを500 completeへ変換しない。

153. TrainingHistoryのgroup membershipがperson/weekだけでなくDB-011 weekly training `sourceProcessor`一致を必須とし、同週の別Processor由来技/能力eventをstatChanges/learnedTechniqueIds/relatedEventSequencesへ混入しない。

154. UI-009決定性比較がDB-018でcanonical snapshot/exportをrepo-boundし、05/S01-009の同じdeterministic comparison rule-setを実装する。verification-private comparator/helperのproduction共用は要求せず、same-seedではsimulationId/EventEnvelope.eventId/sequence/payload/MatchId等の決定的fieldを保持して差異をFAILし、除外は正本が非決定と定義するexecution/runtime/UI adapter metadataだけに限定する。

155. Mock replayがcurrent session revisionをconcurrency gateにだけ使い、battle source/eligibility/RNG/MatchId/Person状態は保存replaySnapshot checkpointだけから再構築し、world進行後の現在人物を再validateせずoriginal BattleResult/eventCandidatesをexact再現する。

156. POST INTERNAL_ERRORのerrorReferenceがaccepted-request境界前は未検証raw requestIdを使わず`server:`、境界後だけ`request:<validatedRequestId>`となり、pre-accept failureはjournal recordを作らず、journal acceptance自体が不明なら新規accepted扱いしない。

157. 全read-only GET failureが常に`commitState=none`でcommittedWeeks/completedUiRevisionを持たず、新UiSession登録・error counter・read snapshot等をmutation commitと数えてpartial/completeへ変換しない。

158. start/resetがworld-scoped状態とsession-scoped状態を分離し、start成功ではnew `RunInitializationSnapshot 0.2.0`（`initialWeeklyTrainingSidecarSnapshot` payload含む）を確定し、sidecar canonical hashが`simulationIdentity.initialWeeklyTrainingSidecarHash`と一致することを必須とする一方、reset成功では保存済みRunInitializationSnapshot 0.2.0のcanonical valueだけからworldを再初期化して同snapshot値をexact維持し、保存sidecar payloadを直接使用しcurrent runtime/context sidecarをauthorityにしない。reset初期validation storeへ置換・mock latestをnullへclearする。session/CSRF/cursor secret/request journal/uiRevision counterは保持し、stepではold mock latestをclearしない。0.1.0欠落payloadのhash合成fallbackは禁止する。

159. reset前の正しく署名済みcollection/mock-log cursorがreset後にHMAC invalidではなく、少なくともold `uiRevision`またはold mock result identityとのbinding mismatchとして409 STALE_CURSORとなり、resetが同じsimulation identityを維持する場合でもstatusを変えない。request journalはresetを跨いで保持され、same requestId再送はold response bytesだけをexact replayしてcurrent world/latest/lastOperationを巻き戻さない。

160. UiReadSnapshotが0.2.0 exact7へ上書きされ`runInitializationSnapshot`を必須保持し、更新中GETのWorldSummary run固定fieldをcurrent sessionへ逃げずoperationStartReadSnapshot内の同一generationから取得し、reset中もworld/run-init/validation/mock/revisionを混在させない。

161. cursorHmacKeyとsessionBindingKeyがprocess起動時に別purposeのOS CSPRNG 256bit以上keyとして生成され、cursor署名とsessionBindingHashへ用途分離され、per-session生成・reset時rotation・CSRF/session ID/simulation RNGとの共用を行わず、生成failureはlistener bind前startup failureとなる。

162. `POST /simulation/start`が0.1.13正本どおりempty|readyの両方で許可され、ready-startではaccepted start requestからnew world/new RunInitializationSnapshot/new-run validationへ原子的置換しmock latestをclearする一方、session/CSRF/process cursor keys/request journal/uiRevision counterを保持し、resetのsaved RunInitializationSnapshot exact再利用と明確に区別される。

163. ready-start前の正しく署名済みcollection/mock-log cursorがstart成功後に少なくともold uiRevision/result identity mismatchで409 STALE_CURSORとなり、old journalは保持されsame requestId再送がold response bytesだけをexact replayしてnew run/latest/validation/lastOperationを巻き戻さない。

164. start/reset/new mock/replayがsuccess DTO/schema/JSON bytesとnext session state/completed success journalをcommit前に全検証し1 atomic commitするため、application-level INTERNAL_ERRORはcommitState=noneだけとなり、commit後transport failureはrollback/500 complete化せずsaved HTTP200 responseをexact replayする。

165. valid sessionの新規error responseが0.1.13正本どおりresponse構築時の`updateControl!=null`からisUpdatingを決め、accepted POSTが自分のlock保持中に確定する422/500等は`isUpdating=true`、POST successだけはfalse特則、saved response再送は現在のlock状態に関係なく元uiRevision/isUpdating/refreshRequiredをexact維持する。

166. battle-log cursorが0.1.13正本どおり結果revisionを`dataIdentity="mock-result:<resultUiRevision>"`の1か所だけに保持し、全cursor共通`payload.uiRevision`には発行元fixed UiReadSnapshot.uiRevisionを保持する。通常stepでlatestを保持していてもuiRevision進行によりold log cursorは409 STALEとなり、更新中GETではoperationStartReadSnapshotへ一致するcursorだけがそのrequest中validを維持する。

167. MockBattleViewへraw BattleResult全文を埋め込む途中変更を撤回しexact34へ戻し、BattleLogListDataViewは0.1.13正本の`resultUiRevision`を保持するexact4へ復元する。これにより詳細logは専用paging endpointだけで公開しつつ、top-level session uiRevisionとlatest result revisionをwire上で別々に確認できる。

168. `GET /mock-battles/latest`がtop-level envelope `uiRevision`をfixed UiReadSnapshot revision、data.resultUiRevisionをlatest生成時revisionとして分離し、`sourceWorldUiRevision <= resultUiRevision <= response.uiRevision`を満たす一方、通常step後の`resultUiRevision < response.uiRevision`を正常として等値強制しない。

169. CommittedValidationViewStoreのvalidationOccurrenceがstart/reset成功時に初期化ValidationResult元順で1から欠番なく振り直され、週commitだけ`nextValidationOccurrence`から連番を消費し、rollback・failed week・pre-start/domain noncommit・mock・saved request replayでは番号を予約/消費しない。

170. UI-000がproduction UI実装工程ではないことを完了条件へ反映し、future UI contract/TX/PAGE/DET/FIX/MIG/traceabilityは実テストPASSではなくowner・exact test plan・fixture recipe・resolved upstream bindingを持つ`ready_to_implement`までをUI-000条件とし、actual implementation証跡は各owner task受入へ延期する。

171. Sprint 1.5の受入順がUI-000→UI-001→UI-002→UI-003→UI-004→UI-005→UI-006→UI-007→UI-008→UI-009→UI-010へ固定され、API-001～015のproduction route ownerはexact 1 task、TX/PAGE/BRIDGE/FIX/MIG/受入条件のownerTaskはcross-cutting契約全体を最終的に閉じるacceptance evidence ownerと区別され、前段taskは自分のAPIに必要な同契約部分をconsumerEvidence付きで実装できるがfuture endpoint自体は先行実装しない。

172. UI-001がframework/shell/security primitiveだけ、UI-002がlive session/CSRF/uiRevision/journal/common adapter/API-001～002を所有し、`IsolatedMockBattleRunner`の必要判定はUI-000、必要な場合のproduction実装ownerはUI-006となり、live sessionやmock facadeの先行実装依存を作らない。

173. UI-010-TRACEABILITYとcontract ownershipがUI-000 readiness、前段taskのconsumerEvidence、最終ownerTaskの`implemented`へ三段階化され、cross-cutting契約を後段ownerまで未実装のまま放置せず、同時に最終ownerのためのfuture endpoint先行実装も行わない。MIG-001～037・FIX-001～104・TX-001～090・PAGE-001～014・DET-001～007はUI-010時に全implemented/未使用fixture0/actual evidence完備となる。

174. `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`、`S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md`、`S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`とstatic spec auditが各task開始前/受入前の共通gateとなり、task owner外のfuture endpoint/feature先行実装、未解決semanticの仮実装、spec/checker/owner manifest不整合が受入前に検出される。

Sprint 1.5の受入条件範囲は、本追補適用後 **1～174** とする.

---

## 18. 追加fixture要件

0.1.13のFIX-001～020を維持し、次を追加する。

```text
FIX-021 post-start execution abort
FIX-022 minimal fallback INTERNAL_ERROR
FIX-023 corrupt MockBattleSessionStore.latest / replaySnapshot
FIX-024 DetailedLog {turnOrderLogs, actionLogs} 正常fixture
FIX-025 requestedAction != resolvedAction + replacementReason != null
FIX-026 life/career別rank Person
FIX-027 familyId / lineageId / temporaryCondition Person
FIX-028 TechniqueDefinition全field
FIX-029 EventEnvelope.entities.personIds人物filter
FIX-030 WorldDate.absoluteWeek / elapsedWeeks
FIX-031 current keyで正しく署名された旧CursorPayload 0.1.0
FIX-032 TrainingHistory: train/learn+acquired/practice/forced-rest + anchor欠落/重複tamper
FIX-033 MockBattle latest: valid hash / replaySnapshotHash tamper / latestRecordHash tamper
FIX-034 generic ValidationResult success/failure + issues[path,message,actual?,expected?]
FIX-035 deterministic projection same-world with deliberately different UI metadata
FIX-036 mock replay: identical BattleResult/events but different resultUiRevision/latestRecordHash
FIX-037 WorldSummary: same run identity + successive committed runtime snapshots + deliberately mutated preset registry after start
FIX-038 step partial failure: committedWeeks=0/1/N + failed-week draft differs from last committed state
FIX-039 failedWeek validation: mixed success/failure generic results in public failure collection + store remains unchanged
FIX-040 mock candidate: eligible trainee/active + deceased/waiting/stopped/child/retired/age/injury boundary exclusions
FIX-041 accepted mock POST: syntactically valid PersonId but pre-start ineligible participant -> 422
FIX-042 unable_to_continue双方true + judgeScore non-null
FIX-043 seeded final tie-break + summary judge seededRngRoll + finalRngState
FIX-044 completed/failed MockBattleView 0.2.0 exact field-source fixture
FIX-045 conflicting eventCandidate/replaySnapshot/current-world values that must not override BattleResult source
FIX-046 statHistory: no-growth / current-week / 48-week-boundary / >48-week growth chains
FIX-047 statHistory tamper: broken before-after chain / final-after != current / negative delta
FIX-048 mock replay checkpoint: pre-start RNG/MatchId state + current world changed after original mock
FIX-049 mock eventCandidates exact two + reversed/extra/missing/cross-reference tamper
FIX-050 Sprint1PersonState currentMental/focus/techniqueStates + inactive Person + missing-state tamper
FIX-051 eventGroup training prefix / technique_learning exact-two / mastery exclusion / cursor query mismatch
FIX-052 GET error precedence collision matrix
FIX-053 legacy page labels vs 0.2.0 direct-field presentation
FIX-054 TechniqueDefinition exact 31-key + missing/extra-key drift
FIX-055 ApiError.validation single/multiple/empty/single-object/flatten cases
FIX-056 paging totalCount 0/limit/limit+1/multi-page + filtered page cases
FIX-057 INVALID_REQUEST fieldErrors body/query/path + duplicate/conflicting + fieldless parse failure
FIX-058 CanonicalGetQuery 0.2.0 all five variants + omitted/default-equivalent + old validation code/cursor
FIX-059 qualifiedMaster child/trainee/active/retired + living/deceased + invalid career-boolean tamper
FIX-060 mock candidate exact predicate + valid-ineligible vs canonical-corruption distinction + pair-level same-person
FIX-061 PersonList/Detail exact 0.2.0 key sets + same-revision cross-reference + old-field injection
FIX-062 errorReference startup CSPRNG failure + consecutive allocation + near-exhaustion + serialization gap
FIX-063 MockBattleMutation exact5 / MockBattleView exact34 + completed/resolution_error + revision/candidate-source tamper
FIX-064 temporaryCondition all bounds/out-of-range + currentMental spirit-context min/max/decimal + mixed-generation
FIX-065 SimulationMutation exact14 + start/reset/step-success/partial cross-field tamper + count source
FIX-066 TechniqueView exact9 + progress cap/mastery bounds/learnedState null-correlation + structural-vs-semantic cap
FIX-067 TechniqueDefinition enum/range/actionTraits/canonical-array boundaries + upstream literal drift
FIX-068 EventList canonical EventEnvelope11 + committed/draft/mock-candidate separation + invalid-stream tamper
FIX-069 ValidationList issue2/item5/data3 + success/failure cross-reference + issue order/tamper
FIX-070 common paged wrapper exact3 across people/candidates/events/validation/battle-log + extra-wrapper-field tamper
FIX-071 API success exact5 / failure exact6 / ApiError optional presence matrix / revision-discriminant tamper
FIX-072 DEFERRED_BINDING DB-001..022 complete registry + duplicate/missing/unregistered/spec-undefined classification
FIX-073 cursor dataIdentity five-endpoint matrix + signed impossible-prefix/kind vs stale-value cases
FIX-074 StableErrorCode local exact-set drift + DB-021 training action payload/target/forcedReason binding
FIX-075 DEFERRED_BINDING body-reference ID coverage + wrong/missing/out-of-registry subject
FIX-076 MIG-001..037 old-symbol negative scan + alias/migration compatibility injection
FIX-077 Person age living currentAge/derived mismatch + deceased null/direct death fields + same-revision list/detail/candidate
```

各fixtureは正規初期化・正規validatorを通して生成する。不正stateが必要なtamper fixtureは、正常fixtureを生成後に対象fieldだけを明示改ざんする。

---

## 19. UI-000への同期要求

`UI_000_BRIDGE_AUDIT_CHECKLIST`は0.2.5へ上げ、少なくとも次を追加する。

- GATE-011 `SPEC_UNDEFINED=0`
- GATE-001～015
- BRIDGE-040～119
- TX-017～090
- FIX-021～104
- PAGE-001～014
- DET-001～007は§16Aへ同期
- traceabilityの受入条件範囲 `1～174`

詳細は`UI_000_BRIDGE_AUDIT_CHECKLIST_0.2.5_AMENDMENT.md`を正本とする。

---

## 20. 今回の監査結論

本追補で、今回までに特定した既知の意味論穴を規範条項へ反映した。

ただしSprint 1.5仕様全体の横断監査は継続する。新しいSPEC_UNDEFINEDが見つかった場合は、0.1.14を「最終版」と扱わず、次版へ修正する。


## 21. 実装タスク依存・所有・UI-000 phase separation

0.1.13のタスク案・完了条件は、本節で同一対象を上書きする。

### 21.1 fixed acceptance sequence

```text
UI-000 -> UI-001 -> UI-002 -> UI-003 -> UI-004 -> UI-005 -> UI-006 -> UI-007 -> UI-008 -> UI-009 -> UI-010
```

後続task production codeを先行実装して依存を満たした扱いにしない。

### 21.2 exact task responsibility

- UI-000: Sprint 1完成コードとのbinding/readiness監査。production UI実装なし。
- UI-001: React/Vite/Fastify scaffold、same-origin、Host/Origin、common envelope/client primitive、static shellのみ。live sessionなし。
- UI-002: API-001/002、session cookie/CSRF、process security keys、UiSession/UiReadSnapshot、updateControl、journal、uiRevision、common adapter/cursor primitive。
- UI-003: API-003～006、start/step/reset/simulation、world/validation commit integration。
- UI-004: API-007/011、people listとmock candidates。
- UI-005: API-008 PersonDetail、stat/aptitude/technique/statHistory/trainingHistory。
- UI-006: API-012～014、new mock/replay/latest。必要な`IsolatedMockBattleRunner` facadeのproduction owner。
- UI-007: API-015 battle log。
- UI-008: API-009/010 events/validation。
- UI-009: DET-001～007 test harnessのみ。新production endpoint/schemaなし。
- UI-010: final acceptanceのみ。新featureなし。

### 21.3 dependency strengthening

strict linear acceptanceを採用する。そのうえで最低論理依存は:

```text
UI-005 requires UI-003 + UI-004 accepted
UI-006 requires UI-004 + UI-005 accepted
UI-008 requires UI-003 + UI-006 + UI-007 accepted
```

### 21.4 API owner exact-one

API-001～015は`S1_5_IMPLEMENTATION_PLAN_0.1.0.md`のowner mapを正本補助として使用し、production owner countは各ID exactly 1。owner外taskはfuture route/DTO/handlerを先行実装しない。

### 21.5 UI-000 readiness phase

UI-000でfuture itemへ許可する完了状態は`ready_to_implement`。future endpoint/page/testを未実装のまま`implemented`と偽記しない。

`ready_to_implement`にはownerTask、semantic section、required upstream binding、planned test ID、fixture construction/tamper recipe、success/failure boundaryが必要。SPEC_UNDEFINED/code_fix_required/spec_fix_requiredが1件でもあればSTOP。

### 21.6 progressive evidence

TX/PAGE/DET/FIX/MIG/acceptance traceabilityはUI-000でowner/test/fixture plan、各owner taskでactual test/path/command/evidence、UI-010で全`implemented`を確認する。

### 21.7 UI-010-TRACEABILITY-PLAN

UI-000で受入条件1～174をexact174 rowへmaterializeし、ownerTask/planned test/fixture/readinessを記録する。future actual test path/commit hashをUI-000で捏造しない。

### 21.8 task-start preflight

各UI-001～010のproduction edit前に:

```text
fixed repository
immediate predecessor accepted commit
static spec audit PASS
open STOP = 0
SPEC_UNDEFINED = 0
own API/contract/fixture IDs exact
required DB binding evidence present
planned tests executable with accepted dependencies
```

を確認。不成立ならproduction codeを変更せずSTOP。

### 21.9 no-forward-work

task Nでtask N+1以降のproduction endpoint handler、feature page、endpoint-specific DTO mapper、feature-specific workaroundを完成させない。shared primitiveは21.2 owner範囲だけ例外。

### 21.10 migration phase

MIG-001～037はUI-000でold production hit=0・owner/test plan・readinessを確認し、owner taskでimplementation/negative test evidenceを追加、UI-010で37 implemented。

### 21.11 fixture/test phase

UI-000ではTX/PAGE/DET/FIXのruntime PASSを要求せず、owner/test plan/fixture recipeを固定。UI-010でTX-001～090、PAGE-001～014、DET-001～007 PASS、FIX-001～104 materialized+used/unused=0。

### 21.12 static specification audit

UI-000開始前および各task受入前に`node verify-s1-5-spec-package.mjs <package-dir>`相当を実行しexit 0必須。spec/checklist/owner manifest/planのrange、ownership、stale contractを機械検査する。

### 21.13 UI-000 runbook / Cursor task template

UI-000は`S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md`に従う。UI-001～010をCursorへ渡すときは`S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`を共通header/STOP/acceptance templateとして使用する。

これらcompanion documentはゲーム意味論を上書きしない。semantic conflictを見つけた場合はspec_fix_requiredでSTOPし、specを先に修正する。

### 21.14 cross-cutting contract ownership semantics

`S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md`および`S1_5_ACCEPTANCE_OWNERSHIP_MANIFEST_0.1.0.md`の`ownerTask`は、**その契約全体を最終的にimplementedとして閉じるacceptance evidence owner**を意味する。

`ownerTask`は「そのtaskより前は契約意味論を実装してはいけない」というexclusive production ownerではない。

cross-cutting契約の例:

- lastOperation / request journal
- uiRevision capacity
- commitState / committedWeeks
- common error envelope / serializer
- cursor/query/paging common rules
- totalCount / nextCursor

これらは複数endpoint/taskで同一契約を共有する。

前段taskは、自分が所有するAPI/common primitiveを正本どおり実装するために必要な**自分のscope部分**を実装・testしてよい。むしろ必要契約を後段ownerまで未実装にしてはいけない。

前段task受入時:

```text
contract implementationStatus = ready_to_implement のまま
consumerEvidence += {
  taskId,
  covered endpoint/branch,
  test path/command,
  evidence
}
```

最終`ownerTask`は:

1. それまでのconsumerEvidenceを検証
2. owner時点で利用可能になった残りendpoint/branchをtest
3. contract全体coverageを満たす
4. `implementationStatus=implemented`

へ更新する。

禁止:

- 最終owner testを通すためfuture endpoint/featureを前段taskで先行実装
- 前段consumerEvidenceがないのに「後段ownerがやるから」と共通契約を未実装
- ownerTaskをexclusive code ownershipと誤解して必要な共通primitiveを遅延
- ownerTask時に過去consumer evidenceを無検証で信用

`API-001～015`のproduction route ownerは§21.4どおりexclusive exact-oneであり、このcross-cutting ruleの対象外。API route/feature ownerとcontract acceptance ownerを混同しない。


### 21.15 single-task implementability constraints

UI-001～010は、strict linear predecessorだけをaccepted dependencyとして各task単独で実装・受入可能でなければならない。

特に次を固定する。

```text
UI-002:
  cursor codec/HMAC/schemaはunit-level common primitiveとして検証可能。
  People/Event/BattleLog等のfuture cursor endpoint実装を要求しない。

UI-004:
  mock candidateはDB-008でUI-000時にresolvedされたeligibility public bindingを使用。
  battle execution/new mock/replayを先行実装しない。

UI-005:
  statHistory/trainingHistoryはDB-012でresolvedされたcommitted Event Stream public read sourceを内部adapterから読む。
  API-009 GET /events のroute/UI完成を依存にしない。
  Event endpoint handler/DTOを先行実装しない。

UI-006:
  IsolatedMockBattleRunnerの要否はUI-000で決定済みでなければならない。
  UI-006開始後に「必要そうだから」新facadeの意味論を判断しない。
  UI-000 outcomeは exact one:
    - isolatedRunnerDecision = not_required
    - isolatedRunnerDecision = implement_in_UI_006 + exact facade contract/evidence plan

UI-007:
  UI-006が保存したlatest.battleResult.detailedLog.actionLogsを消費する。
  Event/Validation endpointを先行実装しない。

UI-009:
  accepted UI-008時点のproduction APIだけを使うtest harness。
  determinism差分をproduction normalization例外で吸収しない。

UI-010:
  final auditのみ。production fixを行わない。
```

### 21.16 STOP taxonomy

production edit前/実装中STOPは次の4種類へ固定する。

```text
spec_fix_required
  semantic/contract/owner/acceptanceが仕様上未定義・矛盾

code_fix_required
  accepted Sprint 1/current predecessor codeがhigher-authority contractを満たさない

dependency_blocker
  predecessor未受入、必要binding/evidence未確定、current task開始条件未成立

environment_blocker
  fixed repo/runtime/tool/browser/build dependency等の実行環境不足で証明不能
```

`dependency_blocker`/`environment_blocker`をspec/code修正として偽装しない。

STOP reportでは:

```text
type
blocking task/contract/tool
observed state
required state
production files changed before STOP = none  // preflight時
resolution owner
```

を必須とする。

### 21.17 task-specific Cursor instruction

UI-001～010は共通templateだけでなく、次のtask専用instructionを使用する。

```text
S1_5_CURSOR_UI_001_0.1.0.md
...
S1_5_CURSOR_UI_010_0.1.0.md
```

各instructionは最低:

- predecessor
- owned API IDs
- final evidence-owned contract IDs
- acceptance IDs
- current-task consumerEvidence requirements
- required DB bindings
- allowed internal canonical reads
- forbidden future scope
- task-specific test matrix
- STOP triggers
- final handoff fields

を固定する。

task専用instructionとimplementation plan/ownership manifestに差異があればstatic audit FAIL。


---

## 22. 長期運用Historical Person architecture

1000年級long-runを将来可能にするため、死亡済みPersonをnormal weekly hot pathから分離するarchitecture boundaryを`S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`へ固定する。 Current long-run contract registry is `HIST-001～106`; scenario minimum is `HSC-001～062`.

### 22.1 current/historical split

```text
Current / Active:
  strict validation
  weekly simulation対象
  corruptionはcurrent transactionを止め得る

Historical:
  PersonId維持
  基本immutable
  weekly hot path対象外
  lazy validation可
  corruptionはlocal degradation
```

死亡済みPersonをhard-deleteしない。

### 22.2 no lossy mini-person

Historical Personを家系図用の名前/親IDだけへ不可逆縮約しない。能力、技、流派、師弟、戦績、婚姻、所属、過去実績等を将来参照可能な情報を保持できる。

### 22.3 relationship/index boundary

canonical relationshipを正本とし、`parentIdsByChild` / `childIdsByParent` / `spouseIdsByPerson`等のadjacency indexを検索高速化に利用できる。

`childIds`等をimmutable Historical Person payloadの唯一正本にしない。死後出生等でreverse relationshipが増えてもPerson payload mutationを要求しないため。

### 22.4 historical corruption

Historicalはlogical existenceとpayload integrityを分ける。

```text
PersonDirectory location:
  active | historical | absent

Historical payload/section integrity:
  unchecked | valid | corrupted | missing

schema compatibility:
  supported | migration_required | unsupported_schema

retention availability:
  not_retained_by_policy
```

`historical + missing`はknown Personのpayload欠損であり`absent`へ変換しない。canonical retentionにより正常に保持対象外となった詳細履歴をmissing/corruptedへ分類しない。

UIはfield/section単位でreadable dataを表示し続ける。1 Person/1 section corruptionをwhole tree/page/simulation crashへ昇格させない。

### 22.5 rule query safety

kinship等のrule queryは:

```text
related | not_related | cannot_determine
```

三値。missing/corrupted historyを存在しないものとして`not_related`へ落とさない。ただしruleに無関係なstats/techniques/display corruptionだけでcannot_determineへ落とさず、kinshipに必要なdirectory identity + canonical relationship frontierがcompleteならheavy payload missingでもrelated/not_relatedを判定可能。`cannot_determine`はrule-required evidenceが不完備な個別処理だけ安全側拒否。

### 22.6 weekly performance

normal history queryなしの週は将来instrumentationで:

```text
historicalPersonPayloadVisits = 0
historicalPersonPayloadClones = 0
historicalFullValidations = 0
```

を検証可能な構造とする。

`UiReadSnapshot`/`WorldSummary`もarchive全件clone/scanをAPI契約として要求しない。

### 22.7 Sprint 1.5 implementation scope

UI-001～010でHistorical archive subsystem自体を先行実装しない。現在のsimple UI scopeは維持する。

ただしcurrent implementationで次を将来不可避にする設計は禁止:

- deceased hard-delete
- PersonId reuse
- archive全件weekly clone/validation
- archive全scanでしかpersonCountを得られない構造
- historical corruption = always whole-detail 500
- missing/corrupted ancestry = no relation
- all-or-nothing historical blobだけを唯一正本にする
- stale relationship index時にweekly hot pathで全history scanへfallbackする
- Historical repairをopen中read generationへin-place反映する
- retention期限切れをcorruption/missingへ変換する
- Historical control-plane corruptionをarchive emptyへ補正する
- PersonId allocationのため全archive scanまたはID再利用を許す
- cached validをcontent identity変化後も信用する
- retention pruning後にEvent/Result ID/sequenceを再利用する
- live readerが使うHistorical generationを早期reclaimする、またはold generationを永久保持する
- Historical paging/tree cursorがpage間でgenerationを無言切替する
- unchanged Current->Historical referenceを毎週再解決/full-validateする
- ruleに無関係なHistorical payload corruptionだけでkinshipをcannot_determineへ落とす
- known Person placeholderを1個のanonymous nodeへcollapseしてgraph identityを失う
- resumable Current checkpointを別Historical generationと無言mixする
- retained save/checkpointが参照するold generationをreclaimする
- old save allocatorを単純巻戻ししてfuture-used IDを同namespace再利用する
- unsupported schema/versionをcorruption扱いする
- history-dependent writeをrequired historical record欠落のままsuccess commitする
- Historical repairだけで既commit gameplayを暗黙rollback/replayする
- unchecked fragment内の自己申告hashだけで同fragmentをvalid判定する
- canonical relationship generationと不一致のindexでnot_relatedを証明する
- death commit後の同week後続training/state/event/RNGを許す
- current relationship終了時にhistorical relationをhard-delete/上書き消失する
- death freezeで生涯Event/Result detailを全scan/clone/materializeする
- 全Historical heavy payloadをnormal runtimeでRAM常駐必須にする
- weekly state hash/canonicalizationでarchive全payload/segmentを毎回flatten/full-hashする
- storage compaction/cache layout差をgameplay determinismへ混入する
- old Historical TechniqueId等をlatest catalog semanticsへ無言reinterpretする
- referenced Historical stateがdurableになる前にcheckpointをpublishする
- save/checkpointが残るのにdurable pinを先にreleaseしてgenerationをreclaimする
- retained fork/branch rootをHistorical GC rootsから除外する
- stale/degraded UI cacheをkinship negative proof・marriage rule・ID allocation authorityへ流用する
- full auditだけでcanonical historyを自動repair/mutateする
- relationship temporal lifecycle/current-history viewをcollapseする
- payload unreadableを理由にHistorical nodeをcollapse/reorderしてpaging identityを不安定化する
- corrupt length/compression/countを無制限allocate/decodeしてprocess全体を落とす
- duplicate logical ID conflictをlast-write-winsで黙ってcanonical化する
- retained historyが参照するsemantic catalog/provenanceを先にGCする
- stale maintenance generationをpublishして並行committed history writeを失う
- checkpoint captureでCurrent/Historicalのbefore/after世代を混在する
- unpublished orphan segmentをfile presenceだけでlogical historyへ復活する

現0.2.0 strict PersonDetail/relationship corruption contractはcurrent monolithic sourceに限定し、Historical reader導入時はHIST契約が優先する。

### 22.8 physical storage/read minimum boundary

exact table/file/chunk形式は後続specで選べるが、partial readとlong-run costを成立させるため次の性質はdeferredしない。

- identity/routing materialとheavy/optional sectionを独立decode/integrity-check可能にできる
- normal loadはHistorical root/generation/segment manifest等のcoarse validationから開始でき、全payload/全index entry scanを必須にしない
- stale index時はbounded keyed canonical lookupまたは`cannot_determine`で処理し、weekly全archive fallback scanをしない
- traversal safety budgetがrequired frontier完了前に尽きた場合は`cannot_determine`
- Event/Result/relationship等のappendはvalidated append cursor/segment metadataを使い、old prefix全件scanを要求しない

### 22.9 maintenance / persistence / retention boundary

Historical repair/migrationはnew generationを作ってatomic publishし、open中readerのold generationをin-place変更しない。death transitionのpersistent stateはcrash recovery後もold activeまたはnew historicalのどちらか一方へ復旧でき、half-stateを残さない。

canonical retention policyで正常に期限切れした詳細履歴は`not_retained_by_policy`として表示し、corruption扱いしない。Historical化だけを理由に既存retentionを無限保持へ変更しない。一方、将来game ruleに必要なPerson identity / ancestry / relationship materialはretention expiry対象にしてはならない。

Person以外のHistorical relationship/Event/Result/achievement prefixも通常weekly whole-clone/full-validation対象へ含めない。

Historical control-plane（PersonDirectory/manifest/index root）がcorruptな場合はarchive emptyへ補正せずdegraded/unavailableとして隔離する。history-dependent ruleはcannot_determine、unrelated Current processingは依存しない限り継続可能。PersonId allocator/high-water等のglobal identity stateを検証できなければ新ID allocationだけfail-closedし、全archive scanやID再利用で補わない。

Integrity/quarantine cacheはgeneration + content identityへbindし、bitrot/content変化を検出したらcached validを破棄する。retentionでdetail payloadを消してもstable identity/sequence/tombstoneを維持し再利用しない。

old Historical generationはlive read handleが存在する間だけ必要segmentを保持し、reader終了後は安全にreclaim可能にする。将来Historical paging/tree cursorはgenerationへbindし、repair publishを跨いで新旧generationを無言混在させない。unchanged Current->Historical referenceはvalidated generation/reference evidenceを利用でき、普通のweekly stepで古いparent payloadを毎回再解決/full-validateしない。

### 22.10 checkpoint / rule-dependency / write consistency boundary

- resumable save/checkpointはCurrent stateとHistorical generation/root + allocation/reference evidenceを同一logical checkpointへbindする
- retained save/checkpoint/backupが参照するold generationはdurable pinとしてreclaimしない
- old save continuationはexact historical generationまたはexplicit fork/namespaceでID collisionを防ぎ、allocator巻戻しだけでfuture-used IDを再利用しない
- unsupported Historical schemaはcorruptionと区別し、rule-required sectionだけfail-closedする
- kinshipはrule-required evidenceだけをdependencyとし、stats/techniques等の無関係corruptionを判定不能理由にしない
- history-dependent writeはHistorical authority unavailable時に必要recordを落としたsuccessをcommitしない
- repairはfuture readへ反映するが既commit gameplayを暗黙rollback/replayしない
- integrity expected valueはvalidated manifest/root等へanchorし、unchecked payloadの自己申告hashだけを信頼しない
- adjacency indexはcanonical relationship generation/rootへbindし、stale/unbound indexをnegative proofへ使わない
- death commit後は同week後続processorからそのPersonを除外し、death transition自身のdeath eventを除くpost-death training/state/person-week-event/RNGを行わない
- marriage等のcurrent relationship終了でcanonical historical relationshipをhard-delete/上書き消失させない
- death freezeのため全生涯Event/Result/achievement detailをscan/clone/materializeしない
- normal runtimeで全Historical Person heavy payloadのRAM常駐を必須にしない。lazy load + bounded/evictable cacheを許容する

### 22.11 hash / durability / provenance / query-stability boundary

- normal weekly state hash/canonicalization/determinism準備でHistorical archive全件をserialize/full-hashしない。unchanged logical Historical root/content identityを再利用可能にする
- logical historyが同一ならcompaction/repacking/cache residency/physical generation差だけでRNG・canonical ID allocation・battle/training outcomeを変えない
- TechniqueId等、Historical fieldの意味が外部catalog/definitionへ依存する場合はversioned provenanceへbindし、latest semanticsへ無言reinterpretしない
- checkpoint manifestは参照Historical generation/root + allocator/reference evidenceがdurable/validatedになってからpublishし、crashでdangling saveを作らない
- save/checkpoint削除とdurable pin releaseはlive save保護を優先してcrash-safeにし、retained branch/fork rootもHistorical GC rootへ含める
- degraded時のlast-known UI cacheはstale/degraded表示へ使えてもrule authority/negative proof/ID allocationへ使わない
- full Historical auditはread-onlyをdefaultとし、自動repairは別明示maintenanceへ分離する
- relationship lifecycleはcurrent-active viewとpast intervalsを区別でき、1 relation status corruptionを他relationへ波及させない
- Historical list/tree/pagingはpayload missing/corrupt時もstable PersonId/relationship identityとfallback tie-breakでnode/order/countを維持する

### 22.12 hostile decode / concurrent publication boundary

- corrupt Historical length/count/compression/depthでunbounded allocation/CPU/stackを起こさず、resource budget超過をfragment-local unavailable/corruptedへする
- duplicate PersonId/RelationshipId/EventId/ResultId conflictをstorage-order last-write-winsで黙って解決しない
- Historical semantic catalog/provenanceは参照record/saveより先にGCせず、削除前にdeterministic migrationを完了する
- repair/migration/compaction publishはbase generation/root mismatchを検出し、並行death/relationship/Event commitをlost updateしない
- checkpoint captureはCurrent/Historical/allocator/reference evidenceをone committed boundaryから取り、weekly/maintenance中間stateを無言mixしない
- root/manifest未publishのorphan segment bytesをlogical Person/Event/Relationshipとして復活させない

Future implementation acceptanceは`S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md` HSC-001～062を最低scenario setとして使用する。

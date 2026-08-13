# Sprint 1.5 Acceptance Ownership Manifest

- Document ID: `S1.5-ACCEPTANCE-OWNERSHIP`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Purpose: 受入条件1～174の最終証跡ownerをUI-000実行前に固定し、UI-000/Cursorへowner判断を残さない。

## 1. Rules

- `ownerTask`は当該受入条件の最終PASS証跡を完成させるtask。
- UI-010 ownerはcross-feature/final auditであり、UI-010で新機能を実装する意味ではない。必要production実装はAPI/TX/PAGE/FIX等のowner taskで先に完了する。
- UI-000 ownerは実装ではなくreadiness/static audit。
- ownerを実装時に変更しない。変更が必要ならspec/manifestを再監査する。
- 0.1.13受入条件1～79の正本文言は基礎正本を参照し、このmanifestは意味論を複製・上書きしない。

## 1A. ownerTask semantics

`ownerTask` = acceptance condition全体を最終的に閉じるevidence owner。cross-cutting条件の一部が前段APIで必要なら前段taskがそのscopeを実装/testしconsumerEvidenceを残す。future endpoint先行実装は禁止。

---

## 2. Acceptance ownership (001-174)

| Acceptance ID | ownerTask | subject/source | UI-000 status |
|---|---|---|---|
| ACC-001 | UI-003 | browser start | ready_to_implement |
| ACC-002 | UI-003 | week progression inputs | ready_to_implement |
| ACC-003 | UI-003 | WorldDate/elapsed display | ready_to_implement |
| ACC-004 | UI-005 | people list/detail | ready_to_implement |
| ACC-005 | UI-005 | stats/aptitudes/techniques | ready_to_implement |
| ACC-006 | UI-005 | training growth/learning display | ready_to_implement |
| ACC-007 | UI-006 | mock battle execution | ready_to_implement |
| ACC-008 | UI-007 | readable battle log | ready_to_implement |
| ACC-009 | UI-006 | no draw/judge decision | ready_to_implement |
| ACC-010 | UI-008 | events/ValidationResult | ready_to_implement |
| ACC-011 | UI-009 | same seed reproducibility | ready_to_implement |
| ACC-012 | UI-009 | CLI/UI same simulation-core result | ready_to_implement |
| ACC-013 | UI-009 | mock world unchanged determinism | ready_to_implement |
| ACC-014 | UI-010 | canonical data read-only UI | ready_to_implement |
| ACC-015 | UI-010 | CLI standalone regression | ready_to_implement |
| ACC-016 | UI-010 | Sprint1 public contract non-breakage | ready_to_implement |
| ACC-017 | UI-010 | full quality gate | ready_to_implement |
| ACC-018 | UI-009 | 1week×N vs Nweeks | ready_to_implement |
| ACC-019 | UI-009 | year-boundary/calendar progression | ready_to_implement |
| ACC-020 | UI-010 | duplicate update/idempotency | ready_to_implement |
| ACC-021 | UI-006 | saved checkpoint replay exact | ready_to_implement |
| ACC-022 | UI-003 | start/reset old-state isolation | ready_to_implement |
| ACC-023 | UI-005 | 48-week person history | ready_to_implement |
| ACC-024 | UI-006 | mock artifacts excluded from canonical world | ready_to_implement |
| ACC-025 | UI-006 | clone mutable-reference isolation | ready_to_implement |
| ACC-026 | UI-006 | DefaultBattleStrategy/run-rule source | ready_to_implement |
| ACC-027 | UI-006 | weekly planner/mock separation | ready_to_implement |
| ACC-028 | UI-010 | requestId replay/conflict | ready_to_implement |
| ACC-029 | UI-010 | base 0.1.13 acceptance 29 (cross-cutting final evidence) | ready_to_implement |
| ACC-030 | UI-010 | base 0.1.13 acceptance 30 (cross-cutting final evidence) | ready_to_implement |
| ACC-031 | UI-010 | base 0.1.13 acceptance 31 (cross-cutting final evidence) | ready_to_implement |
| ACC-032 | UI-010 | base 0.1.13 acceptance 32 (cross-cutting final evidence) | ready_to_implement |
| ACC-033 | UI-010 | base 0.1.13 acceptance 33 (cross-cutting final evidence) | ready_to_implement |
| ACC-034 | UI-010 | base 0.1.13 acceptance 34 (cross-cutting final evidence) | ready_to_implement |
| ACC-035 | UI-010 | base 0.1.13 acceptance 35 (cross-cutting final evidence) | ready_to_implement |
| ACC-036 | UI-010 | base 0.1.13 acceptance 36 (cross-cutting final evidence) | ready_to_implement |
| ACC-037 | UI-003 | RunInitializationSnapshot/start config | ready_to_implement |
| ACC-038 | UI-006 | public WorldEngine/isolated runner boundary | ready_to_implement |
| ACC-039 | UI-006 | MockBattle latest/replay lifecycle | ready_to_implement |
| ACC-040 | UI-010 | uiRevision mutation matrix | ready_to_implement |
| ACC-041 | UI-003 | start/reset atomic init failure/success | ready_to_implement |
| ACC-042 | UI-010 | saved old response is not current UI state | ready_to_implement |
| ACC-043 | UI-010 | base 0.1.13 acceptance 43 (cross-cutting final evidence) | ready_to_implement |
| ACC-044 | UI-010 | base 0.1.13 acceptance 44 (cross-cutting final evidence) | ready_to_implement |
| ACC-045 | UI-010 | base 0.1.13 acceptance 45 (cross-cutting final evidence) | ready_to_implement |
| ACC-046 | UI-010 | base 0.1.13 acceptance 46 (cross-cutting final evidence) | ready_to_implement |
| ACC-047 | UI-010 | base 0.1.13 acceptance 47 (cross-cutting final evidence) | ready_to_implement |
| ACC-048 | UI-010 | base 0.1.13 acceptance 48 (cross-cutting final evidence) | ready_to_implement |
| ACC-049 | UI-010 | base 0.1.13 acceptance 49 (cross-cutting final evidence) | ready_to_implement |
| ACC-050 | UI-010 | base 0.1.13 acceptance 50 (cross-cutting final evidence) | ready_to_implement |
| ACC-051 | UI-002 | session cookie/CSRF/Host/Origin/no-store | ready_to_implement |
| ACC-052 | UI-002 | strict body/query validation | ready_to_implement |
| ACC-053 | UI-010 | cursor session/data/query/revision binding | ready_to_implement |
| ACC-054 | UI-000 | UI-000 bridge completeness | ready_to_implement |
| ACC-055 | UI-010 | browser storage not canonical source | ready_to_implement |
| ACC-056 | UI-010 | unit/API/E2E/CLI quality | ready_to_implement |
| ACC-057 | UI-010 | Chrome/Edge E2E | ready_to_implement |
| ACC-058 | UI-010 | request journal/running-completed/weekly commit | ready_to_implement |
| ACC-059 | UI-002 | preset immutable registry | ready_to_implement |
| ACC-060 | UI-003 | WorldSummary identity/version display | ready_to_implement |
| ACC-061 | UI-010 | accessibility | ready_to_implement |
| ACC-062 | UI-010 | base 0.1.13 acceptance 62 (cross-cutting final evidence) | ready_to_implement |
| ACC-063 | UI-010 | base 0.1.13 acceptance 63 (cross-cutting final evidence) | ready_to_implement |
| ACC-064 | UI-010 | base 0.1.13 acceptance 64 (cross-cutting final evidence) | ready_to_implement |
| ACC-065 | UI-010 | base 0.1.13 acceptance 65 (cross-cutting final evidence) | ready_to_implement |
| ACC-066 | UI-010 | base 0.1.13 acceptance 66 (cross-cutting final evidence) | ready_to_implement |
| ACC-067 | UI-010 | base 0.1.13 acceptance 67 (cross-cutting final evidence) | ready_to_implement |
| ACC-068 | UI-010 | base 0.1.13 acceptance 68 (cross-cutting final evidence) | ready_to_implement |
| ACC-069 | UI-010 | base 0.1.13 acceptance 69 (cross-cutting final evidence) | ready_to_implement |
| ACC-070 | UI-010 | base 0.1.13 acceptance 70 (cross-cutting final evidence) | ready_to_implement |
| ACC-071 | UI-010 | base 0.1.13 acceptance 71 (cross-cutting final evidence) | ready_to_implement |
| ACC-072 | UI-010 | base 0.1.13 acceptance 72 (cross-cutting final evidence) | ready_to_implement |
| ACC-073 | UI-010 | base 0.1.13 acceptance 73 (cross-cutting final evidence) | ready_to_implement |
| ACC-074 | UI-010 | base 0.1.13 acceptance 74 (cross-cutting final evidence) | ready_to_implement |
| ACC-075 | UI-010 | base 0.1.13 acceptance 75 (cross-cutting final evidence) | ready_to_implement |
| ACC-076 | UI-010 | base 0.1.13 acceptance 76 (cross-cutting final evidence) | ready_to_implement |
| ACC-077 | UI-010 | base 0.1.13 acceptance 77 (cross-cutting final evidence) | ready_to_implement |
| ACC-078 | UI-010 | base 0.1.13 acceptance 78 (cross-cutting final evidence) | ready_to_implement |
| ACC-079 | UI-010 | base 0.1.13 acceptance 79 (cross-cutting final evidence) | ready_to_implement |
| ACC-080 | UI-000 | UI-000で`DEFERRED_BINDING`と`SPEC_UNDEFINED`が区別され、UI-001開始時にSPEC_UNDEFINEDが0件である。 | ready_to_implement |
| ACC-081 | UI-006 | 模擬戦またはreplayのpost-start execution abortが500 `INTERNAL_ERROR` / `commitState=none`となり、canonical world、RNG、ID、event、mock latest、uiRevision、lastOperat... | ready_to_implement |
| ACC-082 | UI-006 | execution abortをBattleResultの第4種または`resolution_error`へ偽装しない。 | ready_to_implement |
| ACC-083 | UI-002 | 通常response serializer失敗時に独立minimal fallback serializerが使用され、秘密情報・stack・任意Error.messageを返さない。 | ready_to_implement |
| ACC-084 | UI-010 | accepted POSTのfallback 500がcompleted journalへ保存され、同requestId再送時に同じstatus/body bytesを返す。 | ready_to_implement |
| ACC-085 | UI-002 | `errorReference`がPOSTではrequestId、GET等ではsimulation非依存process-local sourceから生成され、simulation RNGを消費しない。 | ready_to_implement |
| ACC-086 | UI-002 | failure responseの`refreshRequired`がtop-level必須、ApiError内禁止、success responseではfield自体禁止である。 | ready_to_implement |
| ACC-087 | UI-005 | Person list/detailが`familyId`、`lineageId`、`currentRank`、`highestRank`、`retirementRank`をcanonical Personから直接mapし、`affiliationLabels`/`overallRank`を作... | ready_to_implement |
| ACC-088 | UI-005 | abilities/aptitudesの表示・sort/filterが`surfaceValue`だけを使い、genetic valuesを混ぜない。 | ready_to_implement |
| ACC-089 | UI-005 | Person detailで`fatigue/injury/condition/confidence`がcanonical temporaryConditionから直接確認できる。 | ready_to_implement |
| ACC-090 | UI-005 | parent/master表示が全canonical relationshipから配列で導出され、単数mentorを推測しない。 | ready_to_implement |
| ACC-091 | UI-005 | TechniqueViewがPersonTechniqueStateとTechniqueDefinitionの直接mappingで構成され、`usageConditions`等のUI独自JsonValue合成を行わない。 | ready_to_implement |
| ACC-092 | UI-005 | 正規historical instructor PersonIdが存在しない場合、修行履歴へ現在の師匠を後付けしない。 | ready_to_implement |
| ACC-093 | UI-008 | `GET /events?personId=`が`EventEnvelope.entities.personIds`だけを人物filter正本として使用する。 | ready_to_implement |
| ACC-094 | UI-007 | mock battle log endpointが`BattleResult.detailedLog.actionLogs`だけをpage sourceとし、turnOrderLogsを暗黙joinしない。 | ready_to_implement |
| ACC-095 | UI-007 | BattleLogItemViewがrequestedActionとresolvedActionを区別し、置換前TechniqueIdを実行技として表示しない。 | ready_to_implement |
| ACC-096 | UI-006 | 保存済みmock latest/replay recordの破損が404/422/劣化200ではなく500 `INTERNAL_ERROR`となり、状態を変更しない。 | ready_to_implement |
| ACC-097 | UI-003 | `WorldSummaryView.elapsedWeeks`がcanonical `WorldDate.absoluteWeek`から直接取得される。 | ready_to_implement |
| ACC-098 | UI-000 | UI-000でupstream schemaVersion driftを検出した場合、adapterで吸収せずSprint 1.5仕様を先に修正する。 | ready_to_implement |
| ACC-099 | UI-002 | S1.5-SPEC-0.1.14の全success/failure responseおよびCursorPayloadが`apiSchemaVersion="0.2.0"`へ同期し、署名済み旧0.1.0 cursorをcurrent 0.2.0 processへ渡した場合は改ざん400ではなく4... | ready_to_implement |
| ACC-100 | UI-005 | TrainingHistoryItemViewが正規`training.action_selected`を週次anchorとしてevent列から機械的に構築され、0.1.13既存の`max(0,W-47)..W`の48週窓を`absoluteWeek desc`で返し、anchor欠落・重複・... | ready_to_implement |
| ACC-101 | UI-006 | MockBattleReplaySnapshotおよびlatest recordが明示的SHA-256 hashを持ち、GET/log/replayでhash再計算・正規validator・cross-referenceを順に実行し、改ざんを500として検出する。 | ready_to_implement |
| ACC-102 | UI-008 | ValidationResult一覧がgeneric `ok/issues[path,message]`だけを共通意味論として使用し、存在しない共通`code/sourceProcessor/canContinue`を発明せず、0.2.0では`status=success/failure`だけ... | ready_to_implement |
| ACC-103 | UI-009 | UI-009がtest-only canonical comparison projectionを使用し、UI 1週×N対N週、CLI対UI、same-seed、boundary-seed、模擬戦replay、模擬戦前後を明示projectionのcanonical JSON全文で比較し、ui... | ready_to_implement |
| ACC-104 | UI-009 | 模擬戦replayでwire MockBattleView全文を比較せず、canonical BattleResult + pre-allocation eventCandidatesだけのMockBattleDeterminismProjectionを元実行とexact比較する。 | ready_to_implement |
| ACC-105 | UI-003 | WorldSummary run固定/current fieldsを同一committed generationから取得。personCountはlogical active+historical全Person件数で、Historical partition後もnormal GETでarchive全payload scanを要求しない | ready_to_implement |
| ACC-106 | UI-003 | partial_failureの`failedWeek.validation`が失敗週public facadeの非commit正規validation collectionを元順のまま保持し、CommittedValidationViewStoreやStableErrorCode等から再構成... | ready_to_implement |
| ACC-107 | UI-006 | MockBattleCandidateViewが適格者だけを返して参加不可reasonを合成せず、POST accepted後の参加不可は正規pre-start validationにより422 `BATTLE_PRE_START_FAILURE`として非commitで返される。 | ready_to_implement |
| ACC-108 | UI-006 | MockBattleViewが`endReasonIsJudgeDecision`と`judgementApplied`を分離し、双方`unable_to_continue`時に`endReasonIsJudgeDecision=false`かつ`judgementApplied=true`か... | ready_to_implement |
| ACC-109 | UI-006 | MockBattleViewの`finalRngState`がvalidated BattleResultの同fieldを唯一sourceとし、battleSeed/finalState/PersonId等からUI側で再生成・再抽選しない。 | ready_to_implement |
| ACC-110 | UI-006 | MockBattleView 0.2.0の全field sourceが固定され、battleSeed/participant source hashesはBattleResult.finalState、failureはfinalState.failureを直接正本とし、event/valida... | ready_to_implement |
| ACC-111 | UI-005 | PersonDetail.statHistoryがcomplete ability mutation mapとrun全期間の`training.stat_growth_applied` chainからexactに算出され、ready正常時はobject必須、event欠落・chain不整合をn... | ready_to_implement |
| ACC-112 | UI-006 | 新規mockのMockBattleReplaySnapshot.runtimeCheckpointがMatchId予約・World RNG消費前のaccepted committed source runtimeを完全保持し、replayではcurrent worldを参照せず同snapsho... | ready_to_implement |
| ACC-113 | UI-006 | valid MockBattle latestのeventCandidatesが正規RunBattleCommitPlanどおり`[battle.started,battle.finished]`の2件exact orderであり、全重複fieldをBattleResultとcross-ref... | ready_to_implement |
| ACC-114 | UI-005 | PersonDetailの`currentMental`、`learningFocusTechniqueId`、`techniques`および一覧の`learnedTechniqueCount`が同じvalidated `Person.sprint1State`を唯一sourceとして相互一致... | ready_to_implement |
| ACC-115 | UI-008 | Event `eventGroup`が`training.` prefixと`technique.learning_progressed/technique.acquired`のexact規則へ固定され、masteryをtechnique_learningへ混入せず、group変更時の旧cur... | ready_to_implement |
| ACC-116 | UI-010 | 全GETの失敗判定順が`security/session -> request syntax -> read snapshot -> lifecycle -> cursor authentication/schema/binding -> resource existence -> inter... | ready_to_implement |
| ACC-117 | UI-010 | 0.1.13の旧画面文言「所属／総合ランク／単数師匠／候補参加不可reason」が0.2.0で再合成されず、Family/Lineage ID、3 rank、formal master/parent配列、direct TechniqueDefinition、POST pre-start val... | ready_to_implement |
| ACC-118 | UI-005 | TechniqueDefinitionView 0.2.0がcurrent productionの`TECHNIQUE_DEFINITION_KEYS`とexact 31-key一致し、key driftをadapterで吸収せず仕様/API版上げへ戻す。 | ready_to_implement |
| ACC-119 | UI-010 | ApiError.validationが`CanonicalObject[]`の1-result-1-element原形配列としてDOMAIN_VALIDATION_FAILED/BATTLE_PRE_START_FAILUREだけに現れ、single object/null/empty ar... | ready_to_implement |
| ACC-120 | UI-010 | pageable GETの`totalCount`がfilter後・cursor/page前の全一致件数で全page不変、nextCursorが返却page後に残件がある場合だけ非nullとなる。 | ready_to_implement |
| ACC-121 | UI-010 | `INVALID_REQUEST`の`fieldErrors`がcanonical request JSON Pointerと固定7種のFieldErrorCodeを使用し、field特定不能時はfieldErrors自体を省略、複数itemはfield/codeのstable順で返し、mes... | ready_to_implement |
| ACC-122 | UI-008 | CanonicalGetQuery 0.2.0が5種のexact discriminated unionとして固定され、raw cursorを含まず、ValidationQueryが`kind/status/sortKey/sortOrder/limit`を全部materializeし、旧`c... | ready_to_implement |
| ACC-123 | UI-005 | PersonDetailViewがcanonical `Person.qualifiedMaster`を必須booleanとして直接表示し、rank/formal-master関係/event等から再計算せず、career不変条件違反を補正せず500として検出する。 | ready_to_implement |
| ACC-124 | UI-004 | MockBattle候補GETがcanonical source/semantics破損を500として候補外と区別し、validated sourceに対してliving+active+mock career/age+injury閾値のexact predicateだけでmembershipを... | ready_to_implement |
| ACC-125 | UI-005 | PersonListItemView/PersonDetailView 0.2.0が§6Fの完全型・exact key setへ統一され、ready正常PersonDetailではstatHistory非nullかつtrainingHistory.available=true、旧0.1.13 ... | ready_to_implement |
| ACC-126 | UI-002 | GET等の`server:` errorReference用serverInstanceIdがHTTP bind前にOS CSPRNGから1回だけ生成・検証され、生成失敗はprocess startup failure、counter枯渇はwrap/fallbackなしのprocess-fat... | ready_to_implement |
| ACC-127 | UI-006 | MockBattleMutationView 0.2.0がexact5 key、MockBattleViewがexact34 keyで、revision4値・new/replay source revision・completed/failed不変条件・candidate latestとres... | ready_to_implement |
| ACC-128 | UI-005 | PersonDetailのtemporaryConditionがfatigue/injury 0..100・condition/confidence -20..20のinteger exact rangeを持ち、currentMentalが同一snapshotの`0..50+spirit.su... | ready_to_implement |
| ACC-129 | UI-003 | SimulationMutationView 0.2.0がexact14 keyで、start/reset・step success・step partialのrevision/weeks/failedWeek/count/summary相関をstrict検証し、partial failure... | ready_to_implement |
| ACC-130 | UI-005 | TechniqueView 0.2.0がexact9 keyで、learning progressを`0..definition.learningProgressRequired*10`、masteryを0..10000のintegerとして正規state+catalog semantic v... | ready_to_implement |
| ACC-131 | UI-005 | TechniqueDefinitionViewがcurrent productionで確定済みのcategory/tier/consumption/priority/BattleRange、0..100系値域、learningProgressRequired 1..10000、mentalCo... | ready_to_implement |
| ACC-132 | UI-008 | `GET /events`のitemが正規validated EventEnvelopeの11 top-level fieldを追加削除なしで直接返し、dataがexact3 key、sourceがcommitted Event Streamだけで、invalid event・draft/ca... | ready_to_implement |
| ACC-133 | UI-008 | `GET /validation-results`のissue/item/list dataがexact2/5/3 keyで、status/issueCount/issuesをraw generic ValidationResultとindex単位で完全cross-referenceし、iss... | ready_to_implement |
| ACC-134 | UI-008 | pageable success dataはPeople/Candidates/Events/Validationがexact3 `{items,totalCount,nextCursor}`、BattleLogだけ0.1.13正本どおり`resultUiRevision`を加えたexact4... | ready_to_implement |
| ACC-135 | UI-002 | API success/failure envelopeが0.2.0 exact5/exact6へ固定され、ApiError allowed8 keyのpresence matrix、uiRevision/isUpdating、refreshRequired、errorReference、co... | ready_to_implement |
| ACC-136 | UI-000 | 既知DEFERRED_BINDINGがDB-001～022のID付き台帳へ全件登録され、UI-000で全rowのactual symbol/module/type/test/commitをmatchedにし、未登録の新しい未確定を発見した場合は勝手に追加せずspec_fix_requiredで... | ready_to_implement |
| ACC-137 | UI-008 | Cursor dataIdentityが5 endpointのexact matrixへ固定され、署名済みでもendpoint/query.kind/prefix不適合は400、current-compatible shapeのsimulationId/resultUiRevision/que... | ready_to_implement |
| ACC-138 | UI-000 | DEFERRED_BINDING台帳をDB-001～022へ正規化。StableErrorCode/SHA providerはlocal ownership、training payload=DB-021、relationship runtime binding=DB-022、matched=22を要求 | ready_to_implement |
| ACC-139 | UI-005 | TrainingHistory anchorのtarget null相関がtrain_stat / learn_technique / practice_technique / restごとに固定され、forced/forcedReasonはvalidated upstream payload... | ready_to_implement |
| ACC-140 | UI-000 | 規範本文中の個別DEFERRED_BINDINGが必ずDB-001～022のIDを併記し、台帳subjectと1対1対応し、IDなし・台帳外・subject不一致をUI-000文書監査でspec_fix_requiredとして検出する。 | ready_to_implement |
| ACC-141 | UI-010 | MIG-001～036の0.1.13旧contractがproduction DTO/query/validator/page codeへdeprecated alias・互換変換として残らず、UI-000では36件すべてのold-contract absence・ownerTask・nega... | ready_to_implement |
| ACC-142 | UI-005 | living PersonのageがPeople list/PersonDetail/MockCandidateの全てで保存`Person.currentAge`直結となり、`computeCurrentAge(worldDate.year,birthYear)`は同一snapshotのval... | ready_to_implement |
| ACC-143 | UI-005 | PersonDetailのparentPersonIds/formalMasterPersonIdsがcurrent canonical relationship collectionの全対応recordを正本とし、active/current/first/latest等のUI独自filter... | ready_to_implement |
| ACC-144 | UI-002 | Cursor検証が第1base64url segmentのASCII bytesそのものをHMAC-SHA-256署名対象とし、constant-time認証成功後にだけpayload decode/canonical JSON/schema/semantic分類を行う。known-old 0... | ready_to_implement |
| ACC-145 | UI-006 | MockBattleのparticipantAId/BId順がrequestからsideA/sideB・hash・event・result・replayまで意味のある順序としてexact保持され、同一Personは400 conflicting_fields、A/B swapをsort/nor... | ready_to_implement |
| ACC-146 | UI-006 | canonical world unchangedかつordered A/B等のsimulation input同一で連続new mockした場合、BattleResult/eventCandidates/battleSeed/matchId/finalRngStateがexact一致し、ui... | ready_to_implement |
| ACC-147 | UI-007 | MockBattleView 0.2.0はBattleResult全文をraw fieldとして返さずexact34を維持し、表示に必要なconvenience fieldはvalidated BattleResultからdirect mapping、詳細action logは`GET /mo... | ready_to_implement |
| ACC-148 | UI-005 | PersonDetail.techniquesが保持PersonTechniqueStateだけをTechniqueId canonical昇順で返し、duplicate/synthetic catalog entryを禁止し、non-null learningFocusTechniqueId... | ready_to_implement |
| ACC-149 | UI-010 | lastOperation/lastOperationRequestIdがHTTP200 completed journal responseだけを正本とし、atomic start/reset/mock/replayのapplication-level failureはcommit前none... | ready_to_implement |
| ACC-150 | UI-002 | 新規UiSessionがsession IDをOS CSPRNG 32 bytesから最大3 attemptsでunique確定し、既存ID衝突時は保存前に再生成、3回全衝突で500 INTERNAL_ERROR noneとなる。unique ID確定後に独立CSRF 32 bytesを生成し... | ready_to_implement |
| ACC-151 | UI-010 | revision増加mutationが0.1.13のlock/revision/lifecycle/resource/domain/pre-start validationを通過した後、最初のstate/RNG/ID mutation直前にmaxRevisionDeltaをsafe prefl... | ready_to_implement |
| ACC-152 | UI-010 | ApiError commitStateが0.1.13のatomic commit境界へ同期し、start/reset/new mock/replayのapp-level INTERNAL_ERRORはnoneだけ、stepは0週commit=none・1..N-1週commit=partia... | ready_to_implement |
| ACC-153 | UI-005 | TrainingHistoryのgroup membershipがperson/weekだけでなくDB-011 weekly training `sourceProcessor`一致を必須とし、同週の別Processor由来技/能力eventをstatChanges/learnedTechni... | ready_to_implement |
| ACC-154 | UI-009 | DB-018でS01-008 canonical snapshot/exportをbindし、05/S01-009 deterministic comparison rule-setを実装。verification-private helper共用は要求せず、same-seed simulationId/EventEnvelope.eventId/sequence/payload/MatchId等を保持し、正本非決定metadataだけ除外 | ready_to_implement |
| ACC-155 | UI-006 | Mock replayがcurrent session revisionをconcurrency gateにだけ使い、battle source/eligibility/RNG/MatchId/Person状態は保存replaySnapshot checkpointだけから再構築し、world... | ready_to_implement |
| ACC-156 | UI-010 | POST INTERNAL_ERRORのerrorReferenceがaccepted-request境界前は未検証raw requestIdを使わず`server:`、境界後だけ`request:<validatedRequestId>`となり、pre-accept failureはjour... | ready_to_implement |
| ACC-157 | UI-010 | 全read-only GET failureが常に`commitState=none`でcommittedWeeks/completedUiRevisionを持たず、新UiSession登録・error counter・read snapshot等をmutation commitと数えてpar... | ready_to_implement |
| ACC-158 | UI-003 | start/resetがworld-scoped状態とsession-scoped状態を分離し、start成功ではnew RunInitializationSnapshotを確定する一方、reset成功では保存済みRunInitializationSnapshotのcanonical valu... | ready_to_implement |
| ACC-159 | UI-008 | reset前の正しく署名済みcollection/mock-log cursorがreset後にHMAC invalidではなく、少なくともold `uiRevision`またはold mock result identityとのbinding mismatchとして409 STALE_CUR... | ready_to_implement |
| ACC-160 | UI-003 | UiReadSnapshotが0.2.0 exact7へ上書きされ`runInitializationSnapshot`を必須保持し、更新中GETのWorldSummary run固定fieldをcurrent sessionへ逃げずoperationStartReadSnapshot内の同一... | ready_to_implement |
| ACC-161 | UI-002 | cursorHmacKeyとsessionBindingKeyがprocess起動時に別purposeのOS CSPRNG 256bit以上keyとして生成され、cursor署名とsessionBindingHashへ用途分離され、per-session生成・reset時rotation・CS... | ready_to_implement |
| ACC-162 | UI-003 | `POST /simulation/start`が0.1.13正本どおりempty/readyの両方で許可され、ready-startではaccepted start requestからnew world/new RunInitializationSnapshot/new-run valida... | ready_to_implement |
| ACC-163 | UI-008 | ready-start前の正しく署名済みcollection/mock-log cursorがstart成功後に少なくともold uiRevision/result identity mismatchで409 STALE_CURSORとなり、old journalは保持されsame reque... | ready_to_implement |
| ACC-164 | UI-010 | start/reset/new mock/replayがsuccess DTO/schema/JSON bytesとnext session state/completed success journalをcommit前に全検証し1 atomic commitするため、application-... | ready_to_implement |
| ACC-165 | UI-010 | valid sessionの新規error responseが0.1.13正本どおりresponse構築時の`updateControl!=null`からisUpdatingを決め、accepted POSTが自分のlock保持中に確定する422/500等は`isUpdating=true`、... | ready_to_implement |
| ACC-166 | UI-007 | battle-log cursorが0.1.13正本どおり結果revisionを`dataIdentity="mock-result:<resultUiRevision>"`の1か所だけに保持し、全cursor共通`payload.uiRevision`には発行元fixed UiReadSna... | ready_to_implement |
| ACC-167 | UI-007 | MockBattleViewへraw BattleResult全文を埋め込む途中変更を撤回しexact34へ戻し、BattleLogListDataViewは0.1.13正本の`resultUiRevision`を保持するexact4へ復元する。これにより詳細logは専用paging endp... | ready_to_implement |
| ACC-168 | UI-006 | `GET /mock-battles/latest`がtop-level envelope `uiRevision`をfixed UiReadSnapshot revision、data.resultUiRevisionをlatest生成時revisionとして分離し、`sourceWorld... | ready_to_implement |
| ACC-169 | UI-003 | CommittedValidationViewStoreのvalidationOccurrenceがstart/reset成功時に初期化ValidationResult元順で1から欠番なく振り直され、週commitだけ`nextValidationOccurrence`から連番を消費し、rol... | ready_to_implement |
| ACC-170 | UI-000 | UI-000がproduction UI実装工程ではないことを完了条件へ反映し、future UI contract/TX/PAGE/DET/FIX/MIG/traceabilityは実テストPASSではなくowner・exact test plan・fixture recipe・resolv... | ready_to_implement |
| ACC-171 | UI-000 | API route owner exact-oneとcross-cutting acceptance ownerを分離し、前段API taskは必要scopeをconsumerEvidence付きで実装、future endpointは先行実装しない。 | ready_to_implement |
| ACC-172 | UI-000 | UI-001がframework/shell/security primitiveだけ、UI-002がlive session/CSRF/uiRevision/journal/common adapter/API-001～002を所有し、IsolatedMockBattleRunnerの必要判... | ready_to_implement |
| ACC-173 | UI-010 | readiness -> consumerEvidence -> final owner implementedの三段階evidence lifecycleを全cross-cutting contractへ適用し、UI-010で全implementedを確認する。 | ready_to_implement |
| ACC-174 | UI-000 | `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`、`S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md`、`S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`とstatic spec auditが各task開始前/受入前の共通gateとなり、task owner外のfuture endpoint/feature先行実装、未解決semanticの仮実装、spec/checker/owner manifest不整合が受入前に検出される。 | ready_to_implement |

## 3. Machine conditions

```text
row count = 174
Acceptance IDs = ACC-001..ACC-174 exact once
ownerTask blank = 0
ownerTask outside UI-000..UI-010 = 0
UI-000 status != ready_to_implement count = 0
```

## 4. Cross-feature owner rule

複数feature/taskを跨ぐ条件は、最後のfeature taskへ無理に寄せず`UI-010`をfinal evidence ownerにしてよい。
UI-010は既存test/artifactを集約して判定するだけで、production behaviorを追加しない。

## 5. No reassignment fallback

owner taskで条件を証明不能と判明した場合、その場で別taskへ持ち越さずSTOPし、dependency/owner contractを再監査する。

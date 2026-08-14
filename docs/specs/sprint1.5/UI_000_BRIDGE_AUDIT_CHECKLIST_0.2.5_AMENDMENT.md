# UI-000 実装開始前ブリッジ監査チェックシート
## 0.2.5 規範追補

- 文書ID: `UI-000-CHECKLIST`
- 基礎版: `0.2.4`
- 追補版: `0.2.5`
- 対象仕様: `S1.5-SPEC-0.1.15`
- 前提: Sprint 1受入完了、CAL-JAN-SYNC完了
- Project predecessor: latest `PROJECT_ROADMAP.md` に従い、T02完了・T03-A完了・T03-BのUI-000-required common-spec residual=0をP00で確認する（GATE-001～015の件数を増やす意味ではない）
- 適用規則: 0.2.4の未変更条項を継承し、本追補の変更・追加条項を優先する

## 1. 使用規則追加

### 1.1 未確定の分類

`{{...}}`を一律に扱わず、各未確定を次のどちらかへ分類する。

```text
DEFERRED_BINDING
SPEC_UNDEFINED
```

DEFERRED_BINDING:
- Sprint 1完成commit後に実コードを見なければ確定できない物理接続情報
- public symbol/module/test/schemaVersion等
- UI-000で解消可能

SPEC_UNDEFINED:
- failure/rollback/commit/RNG/HTTP/null/DTO/source/sort/cursor/replay/storage等の意味論
- UI-000で発明禁止
- 発見時は`spec_fix_required`

`matched`にする前に、対象行がDEFERRED_BINDING由来だったか、SPEC_UNDEFINED修正済みだったかを証跡へ残す。

## 1A. UI-000 readiness / implementation status

UI-000とUI-001以降のstatusを分離する。

```text
UI-000 future contract: ready_to_implement
owner task accepted: implemented
```

`matched`はDB-001～022等、UI-000時点でSprint 1完成コードへ物理接続できるbinding証跡に使用する。

future endpoint/page/testが存在しないことを理由にUI-000で`implemented`と偽記しない。owner/test/fixture planが未確定なら`ready_to_implement`にしない。

---

## 2. 開始gate追加

| Gate ID | 必須証跡 | 実値 | 判定 |
|---|---|---|---|
| GATE-011 | `SPEC_UNDEFINED=0`。未確定はDEFERRED_BINDINGだけであり、全DEFERRED_BINDINGが実コードへ物理接続済み | `{{report}}` | `{{判定}}` |
| GATE-012 | DEFERRED-BINDING-REGISTERがDB-001～022 exact subjectを各1回保持し、matched=22 / unresolved=0 / unregistered=0 | `{{report}}` | `{{判定}}` |
| GATE-013 | 規範本文の個別DEFERRED_BINDING全記述がDB-001～022 IDを併記し、registry subjectと1対1対応 | `{{report}}` | `{{判定}}` |
| GATE-014 | MIGRATION-OVERRIDE-AUDITがMIG-001～036を36 rowへ展開し、production old contract hit=0、owner/test plan空欄0、全readinessStatus=ready_to_implement | `{{report}}` | `{{判定}}` |
| GATE-015 | repo-bound static spec auditがpackage整合に加えtracked base `S1.5-SPEC-0.1.13` exact1・base dirty=falseを検査しexit 0 | `{{command/report + base authority evidence}}` | `{{判定}}` |

GATE-001～015の1件でも不合格ならUI-001へ進まない。


## 2A. UI-000-DEFERRED-BINDING-REGISTER

S1.5-SPEC-0.1.14 §1CのDB-001～022を**subject変更なし**で各1 row登録する。

| bindingId | semantic section | actual symbol | actual module | actual type/schema/value | test evidence | completion commit | status | notes |
|---|---|---|---|---|---|---|---|---|
| DB-001 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-002 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-003 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-004 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-005 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-006 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-007 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-008 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-009 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-010 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-011 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-012 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-013 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-014 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-015 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-016 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-017 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-018 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-019 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-020 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{type}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-021 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{training.action_selected payload/forcedReason union}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |
| DB-022 | `{{section}}` | `{{symbol}}` | `{{module}}` | `{{parent_child/master_disciple schemas & counterpart fields}}` | `{{test}}` | `{{commit}}` | `{{status}}` | `{{notes}}` |

完了時の機械条件:

```text
row count = 22
unique bindingId count = 22
matched count = 22
spec_fix_required count = 0
blank/{{...}} actual fields = 0
unregistered uncertainty = 0
```

新binding subjectを発見したらこの表へ即席追加せず、仕様版上げへ戻る。


## 2B. UI-000-MIGRATION-OVERRIDE-AUDIT

MIG-001～036を36 rowへmaterializeする。UI-000でfuture implementation evidenceを捏造しない。

| MIG ID | old contract search | production hit count | ownerTask | planned negative test | planned evidence kind | readinessStatus | implementationStatus |
|---|---|---:|---|---|---|---|---|
| MIG-001..036 | `{{per item}}` | `{{0 required}}` | `{{UI-001..009}}` | `{{test id}}` | `{{evidence kind}}` | `{{ready_to_implement|code_fix_required|spec_fix_required}}` | `not_started` |

UI-000条件:

```text
row count = 36
old production hit = 0 every row
ownerTask blank = 0
planned negative test blank = 0
planned evidence kind blank = 0
ready_to_implement = 36
code_fix_required = 0
spec_fix_required = 0
implementationStatus not_started = 36
```

owner task受入でactual evidence + negative test PASS + `implementationStatus=implemented`。UI-010でimplemented=36。

歴史docs/negative fixture名をproduction scanから除外する場合は除外pathをreportへ明記する。


## 3. BRIDGE追加

既存BRIDGE-001～119を維持し、次を追加する。

| 契約ID | 本仕様参照 | 必須接続対象 | 状態・時点／RNG／commit | 失敗契約 | 必須検証 | 判定 |
|---|---|---|---|---|---|---|
| BRIDGE-040 | 0.1.14 §2 | post-start battle execution abortの実class/symbol/module | abortはBattleResult外。canonical world/RNG/ID/event/mock/revision非変更 | 500 INTERNAL_ERROR, commitState=none | dependency failure / invariant failure / same-request retry | `{{判定}}` |
| BRIDGE-041 | 0.1.14 §3 | normal response serializerとminimal fallback serializer | fallbackは安全primitiveだけ。journal保存後unlock | fallback自体失敗は再帰しない | none/partial/complete各response serialize fault | `{{判定}}` |
| BRIDGE-042 | 0.1.14 §4 | errorReference generator | POST=requestId、GET=process-local UUID+counter。simulation RNG非消費 | generator失敗をsimulation failureへ偽装しない | same request exact ref / GET unique ref | `{{判定}}` |
| BRIDGE-043 | 0.1.14 §6 | current 0.2.0 Person family/lineage/rank/stats/aptitudes/temporaryCondition source | current commit snapshotから直接map | current invalid canonical PersonはINTERNAL_ERROR。Historical future partial-readerへ一般化禁止 | life/career全variant + surfaceValue | `{{判定}}` |
| BRIDGE-044 | 0.1.14 §7 | parent/master canonical relationship型・counterpart field | current snapshot全relationship、canonical PersonId sort | broken ref/truncate/first禁止 | 0/1/複数 parent/master | `{{判定}}` |
| BRIDGE-045 | 0.1.14 §8 | TechniqueDefinition / PersonTechniqueState exact mapping | UI独自usage object禁止 | catalog欠落/unknown enumはresponse failure | 全field fixture / sparse state | `{{判定}}` |
| BRIDGE-046 | 0.1.14 §11 | BattleResult.detailedLog.actionLogs | paging sourceはactionLogsだけ | turnOrderLogs暗黙join禁止 | 0/100/101/200/201 actionLogs | `{{判定}}` |
| BRIDGE-047 | 0.1.14 §12 | BattleActionLog -> BattleLogItemView 0.2.0 | exact40 convenience fieldを同一actionLogs[index]から直接map。candidate score={action,score}、priority=-1|0|1|2|null、raw63 fieldはsourceLogEntry | field追加削除・join・自由文章化禁止 | 全convenience field + requested!=resolved fixture | `{{判定}}` |
| BRIDGE-048 | 0.1.14 §10 | EventEnvelope.entities.personIds | person filterの唯一正本 | payload recursive search禁止 | 各eventType producerのentities監査 | `{{判定}}` |
| BRIDGE-049 | 0.1.14 §13 | MockBattleSessionStore.latest / replaySnapshot validator | GET/POSTとも利用前strict validation | corrupt recordは500 none | hash/cross-reference tamper | `{{判定}}` |
| BRIDGE-050 | 0.1.14 §15 | upstream schemaVersion registry | Sprint 1完成commit実versionへ接続 | driftはspec_fix_required | current expected vs actual table | `{{判定}}` |
| BRIDGE-051 | 0.1.14 §14 | WorldDate.absoluteWeek -> WorldSummaryView.elapsedWeeks | committed WorldDateのdirect map | uiRevision/event count等から算出禁止 | start/1/48/480週 + year boundary | `{{判定}}` |
| BRIDGE-052 | 0.1.14 §1A | apiSchemaVersion / CursorPayload schema binding | 全responseとcursorを0.2.0へ同期。saved response bytesは書換禁止 | 署名済み旧0.1.0 cursorは409 STALE_CURSOR、tamperは400 | success/failure/fallback/cursor migration | `{{判定}}` |
| BRIDGE-053 | 0.1.14 §9A | committed weekly-training EventEnvelope群 -> TrainingHistoryItemView | action_selectedを(personId,absoluteWeek) anchor。W-47..WをabsoluteWeek降順 | anchor欠落/重複/fixture不整合は500 | train/learn/acquire/practice/rest fixtures | `{{判定}}` |
| BRIDGE-054 | 0.1.14 §13A | MockBattleReplaySnapshot/LatestRecord hash | canonical SHA-256 + semantic validator + cross-reference | hash不一致/provider failureは500 none | snapshot/record one-field tamper | `{{判定}}` |
| BRIDGE-055 | 0.1.14 §10A | generic ValidationResult -> ValidationResultViewItem / ValidationQuery | 共通意味論はok/issues[path,message]。filter=statusだけ | code/sourceProcessor/canContinue発明禁止。旧code queryは400 | success/failure/raw issue + status cursor | `{{判定}}` |
| BRIDGE-056 | 0.1.14 §16A | UI-009 canonical comparison projection | CLI/UI/segmentationはDB-018 deterministic comparison projection、mock replayはsame-source battle projection。UI metadata＋upstream正本の非決定IDだけを除外 | wire DTO全文/表示文字列/hash-only比較禁止 | DET-001～007 projection exact diff | `{{判定}}` |
| BRIDGE-057 | 0.1.14 §6A | WorldSummaryView source map | run固定field=RunInitializationSnapshot identity/rule、可変3field=同一committed runtime snapshot | preset再解決・failed draft混入・mixed revision禁止 | start/reset/step/partial + preset mutation fixture | `{{判定}}` |
| BRIDGE-058 | 0.1.14 §6B | failedWeek.validation failure collection | public week facadeの非commit validation collectionを元順canonical clone | store再構成・synthetic result・StableErrorCode混入禁止 | 0/partial commit + mixed generic validations | `{{判定}}` |
| BRIDGE-059 | 0.1.14 §7A | MockBattleCandidateView / POST eligibility | GETはeligible only・reasonなし。POSTはaccepted snapshotで正規pre-start再検証 | ineligibleは422 BATTLE_PRE_START_FAILURE、非commit | age/life/participation/injury境界 + stale revision優先 | `{{判定}}` |
| BRIDGE-060 | 0.1.14 §13B | MockBattleView judge/final RNG mapping | judge_decisionとjudgementAppliedを分離。finalRngStateはBattleResult直結 | 双方UTC判定・seeded tie-breakのUI再推測禁止 | judge_decision / both-UTC / seeded RNG / resolution_error | `{{判定}}` |
| BRIDGE-061 | 0.1.14 §13C | MockBattleView 0.2.0全field source | BattleResult top-level/finalState/latest recordを1 field 1 sourceへ固定 | failure message合成・event/current world fallback禁止 | completed/failed/source-conflict fixtures | `{{判定}}` |
| BRIDGE-062 | 0.1.14 §6C | PersonDetail.statHistory / ABILITY-MUTATION-MAP | surface mutator全列挙 + training.stat_growth_applied chain exact | source欠落をnull劣化・milliPoints集計・chain補正禁止 | no-growth/48-week/tamper fixtures | `{{判定}}` |
| BRIDGE-063 | 0.1.14 §13D | MockBattle replay checkpoint capture | accepted source revisionのbattle開始前runtime checkpointを完全保存・replay継承 | replay後checkpoint再採取/current world補完禁止 | RNG/MatchId/world-changed replay fixture | `{{判定}}` |
| BRIDGE-064 | 0.1.14 §13D | Mock eventCandidates exact pair | `[battle.started,battle.finished]` source order + BattleResult全重複field cross-reference | extra/missing/reverse/dedupe/ID割当禁止 | exact pair + tamper fixture | `{{判定}}` |
| BRIDGE-065 | 0.1.14 §6D | Person.sprint1State -> currentMental/focus/techniques/count | 同一committed Person stateからdirect mapping | GET補完・event/result再構成・catalog zero-state合成禁止 | active/inactive/missing/catalog mismatch fixtures | `{{判定}}` |
| BRIDGE-066 | 0.1.14 §10B | Event eventGroup query | training=`training.` prefix、technique_learning=progressed/acquired exact | allow-list発明・mastery混入・eventType併用禁止 | group/filter/cursor fixtures | `{{判定}}` |
| BRIDGE-067 | 0.1.14 §5A | GET error precedence | security/session/syntax/snapshot/lifecycle/resource/integrity/cursorの固定順 | collision条件で後段errorを先行させない | endpoint別collision matrix | `{{判定}}` |
| BRIDGE-068 | 0.1.14 §4A | page presentation override | 旧affiliation/overallRank/mentor/reason表示を0.2.0 direct fieldsへ置換 | synthetic display DTO再導入禁止 | people/detail/technique/mock E2E | `{{判定}}` |
| BRIDGE-069 | 0.1.14 §8.3 | TechniqueDefinitionView exact key set | production TECHNIQUE_DEFINITION_KEYSと31-key exact一致 | missing/extra/aliasはspec_fix_required | key-count/key-set/drift fixture | `{{判定}}` |
| BRIDGE-070 | 0.1.14 §3A | ApiError.validation[] | CanonicalObject[]、1 result=1 element、原順・原形維持 | single object/null/[]/flatten/other code禁止 | domain/pre-start single+multi cases | `{{判定}}` |
| BRIDGE-071 | 0.1.14 §3B | INVALID_REQUEST fieldErrors | RFC6901 request pointer + fixed 7 FieldErrorCode + stable order | fieldless時省略、[]/null/free code/secret message禁止 | body/query/path/duplicate/conflict/parse fixtures | `{{判定}}` |
| BRIDGE-072 | 0.1.14 §10D | CanonicalGetQuery 0.2.0 exact union | cursor除外、5 discriminants、全default materialize。Validation=status | old code/cursor自動migration禁止 | 5 query variants/default equivalence/stale cursor | `{{判定}}` |
| BRIDGE-073 | 0.1.14 §6E | PersonDetail qualifiedMaster | canonical Person boolean直結。career invariantはvalidator cross-check | rank/relation/eventから推測・補正禁止 | child/trainee/active/retired living/deceased/tamper | `{{判定}}` |
| BRIDGE-074 | 0.1.14 §7A.1 | Mock candidate exact eligibility | source strict validation後、living+active+mock age/career+injuryだけでmembership | corruptionを候補外扱い・pair条件混入・RNG/MatchId消費禁止 | boundary/ineligible/corrupt/equivalence fixtures | `{{判定}}` |
| BRIDGE-075 | 0.1.14 §6F | Person wire DTO complete types | list16/detail25 exact keys、detail statHistory nonnull、training available=true | old field再導入・detail fieldをlist追加・null劣化禁止 | key-set/cross-revision/old-field injection | `{{判定}}` |
| BRIDGE-076 | 0.1.14 §4.2 | server errorReference allocator | bind前OS CSPRNG UUIDv4 1回 + sync safe-int counter | startup fallback/wrap/reseed/domain-error偽装禁止 | CSPRNG fail/unique refs/exhaustion/serialization gap | `{{判定}}` |
| BRIDGE-077 | 0.1.14 §13E | MockBattleMutation/View final invariants | mutation5/view34 exact keys、same immutable candidate latestからresponse+commit | postcommit response build・old judgeDecision/failure.message禁止 | completed/failed/replay/revision/readback tamper | `{{判定}}` |
| BRIDGE-078 | 0.1.14 §6G | temporaryCondition/currentMental ranges | temp 0..100/±20、mental 0..50+spiritを同一snapshot正規validatorで検証 | clamp/default/decimal/mixed-generation禁止 | all bounds/out-of-range/spirit-context/mixed snapshot | `{{判定}}` |
| BRIDGE-079 | 0.1.14 §6H | SimulationMutationView complete type | exact14 + operation/outcome/revision/weeks/count/summary相関 | partial失敗週混入・補正・lastOperation二重保存禁止 | start/reset/step success/partial/tamper | `{{判定}}` |
| BRIDGE-080 | 0.1.14 §8.2 | TechniqueView state exact semantics | exact9、progress<=definition.required*10、mastery0..10000、learnedState=acquiredWeek null相関 | structural-only受理・zero補完・progress推測禁止 | bounds/cap/null-correlation/state+catalog semantic fixtures | `{{判定}}` |
| BRIDGE-081 | 0.1.14 §8A | TechniqueDefinition value contracts | fixed enums/ranges/actionTraits5/canonical arraysをproduction validatorへexact接続 | clamp/alias/re-sort/trait解禁/未確認literal自由化禁止 | enum/range/array/drift fixtures | `{{判定}}` |
| BRIDGE-082 | 0.1.14 §10E | GET /events item/data DTO | item=canonical EventEnvelope11 exact、data=items/totalCount/nextCursor exact3 | shrink/raw二重化/draft候補混入/invalid除外禁止 | committed stream/filter/invalid/draft/mock-candidate fixtures | `{{判定}}` |
| BRIDGE-083 | 0.1.14 §10A.2 | Validation list complete DTO | issue2/item5/data3 exact + raw ValidationResult index cross-reference | issue sort/dedupe/filter・raw loss・field drift禁止 | success/failure/multi-issue/tamper fixtures | `{{判定}}` |
| BRIDGE-084 | 0.1.14 §10F | paged success data | People/Candidate/Event/Validation exact3、BattleLog exact4 + resultUiRevision | result revision削除・不要wrapper追加・session/result revision混同禁止 | all five endpoints + step-after-log identity | `{{判定}}` |
| BRIDGE-085 | 0.1.14 §3C | API envelope complete types | success exact5/failure exact6/ApiError allowed8 + presence/revision matrix | success/failure混在・null optional・commit/errorRef相関破壊禁止 | all envelope branches + tamper | `{{判定}}` |
| BRIDGE-086 | 0.1.14 §1C | DEFERRED_BINDING register | DB-001～022 subject exact、actual physical evidenceを1対1解決 | unregistered/duplicate/missing/semantic invention禁止 | registry machine audit + spec-fix injection | `{{判定}}` |
| BRIDGE-087 | 0.1.14 §10G | cursor dataIdentity matrix | 5 endpoint exact identity/prefix/query-kind mapping | impossible signed combo=400、stale current value=409、DTO書戻し禁止 | prefix/kind/simulation/result-revision cases | `{{判定}}` |
| BRIDGE-088 | 0.1.14 §1C.6 | StableErrorCode binding | 0.1.13正本 literal set == current adapter exact set | alias/追加削除/rename吸収禁止 | exact-set drift/status-matrix evidence | `{{判定}}` |
| BRIDGE-089 | 0.1.14 §1C.7/§9A | training.action_selected payload binding | action/target/forced payload validatorをdirect接続 | target null補完・forcedReason自由生成・unknown literal通過禁止 | four actions/target correlation/forcedReason drift | `{{判定}}` |
| BRIDGE-090 | 0.1.14 §1C.8 | DEFERRED_BINDING body-reference coverage | 個別未確定記述 -> DB-ID -> registry subject exact | IDなし/誤ID/台帳外/複数subject漏れ禁止 | document scan + injected wrong-ID fixture | `{{判定}}` |
| BRIDGE-091 | 0.1.15 §0A | migration override index | MIG-001～037 old contract production hit=0/new evidenceあり | deprecated alias/implicit migration/partial old DTO禁止 | old-symbol scan + alias injection | `{{判定}}` |
| BRIDGE-092 | 0.1.14 §6I | Person age source | living=currentAge direct + computeCurrentAge cross-check、deceased age null/death direct | UI再計算/補正/mixed-generation禁止 | living mismatch/deceased/list-detail-candidate/update snapshot | `{{判定}}` |
| BRIDGE-093 | 0.1.14 §7 / §1C.8 | relationship display / DB-022 | current snapshot全parent/master records、status filterなし、counterpart schema物理binding | first/current-only推測・dedupe・bad record除外禁止 | multiple/status metadata/broken/cycle fixtures | `{{判定}}` |
| BRIDGE-094 | 0.1.14 §10G.4 | cursor authentication precedence | payload segment ASCIIをHMAC -> payload decode/canonical parse/schema -> semantic binding | 未認証schemaで409分類・非constant-time比較禁止 | forged old/current/unknown + valid old/current | `{{判定}}` |
| BRIDGE-095 | 0.1.14 §13F | Mock participant A/B order | request A->sideA/B->sideBをhash/event/result/replayまでexact保持 | PersonId sort・swap normalize・same participant実行禁止 | same/swap/replay-order/hash fixtures | `{{判定}}` |
| BRIDGE-096 | 0.1.14 §13G/§16A | repeated new mock determinism | unchanged canonical sourceではBattleResult/events/matchId/seed exact | uiRevision/request/hashをsimulation input化・mock一意ID再採番禁止 | repeated new mock + world-step contrast | `{{判定}}` |
| BRIDGE-097 | 0.1.14 §13C | MockBattleView raw-result prohibition | exact34 convenience projectionのみ、BattleResult全文はwire非公開、action logは専用paging | raw BattleResult追加・detailedLog重複・paging迂回禁止 | exact34 + raw-field injection negative fixture | `{{判定}}` |
| BRIDGE-098 | 0.1.14 §8B | Person techniques array/focus | held-state only、TechniqueId asc、unique、focus exact reference | catalog synthetic zero-state・別sort・dangling focus補正禁止 | order/duplicate/focus/catalog/count fixtures | `{{判定}}` |
| BRIDGE-099 | 0.1.14 §3D | failure commitState / lastOperation | atomic failure=none、step partial/completeだけstate進行可、lastOperation=latest HTTP200 journal data | atomic complete 500・error journal採用禁止 | prior success + all failure states + replay | `{{判定}}` |
| BRIDGE-100 | 0.1.14 §4A | UiSession CSPRNG lifecycle | session ID max3 retry + unique後CSRF + atomic store registration | no-retry誤実装/attempt4/partial session/fallback禁止 | collision1/2/3・CSRF fault・existing/transport | `{{判定}}` |
| BRIDGE-101 | 0.1.14 §3E | uiRevision capacity preflight | domain/pre-start通過後・first mutation前にstart/reset/mock/replay +1、step +requestedWeeksをsafe check | mid-operation overflow/partial化/wrap/stale precedence逆転禁止 | MAX boundaries/all mutations/stale request | `{{判定}}` |
| BRIDGE-102 | 0.1.14 §3F | commitState/committedWeeks matrix | atomic error=none only、step complete=N、step partial=1..N-1、step0=none | atomic partial/complete・0-week partial・wrong count禁止 | all operation/error timing matrix | `{{判定}}` |
| BRIDGE-103 | 0.1.14 §9A.2A / DB-011 | TrainingHistory producer membership | person/week + weekly sourceProcessor exactでgroup化 | 同週別processor event混入・bad producer silently ignore禁止 | mixed-source/acquire/stat/sequence fixtures | `{{判定}}` |
| BRIDGE-104 | 0.1.14 §16A / DB-018 | CLI/UI deterministic comparison authority | S01-008 canonical snapshot/export + 05/S01-009 rule-setを使用。verification-private helper実体の共用不要 | same-seed simulationId/eventId/sequence/payload等の決定的field除外・UI独自除外・ID blanket除外禁止 | deterministic-ID-only tamper FAIL + authorized nondeterministic metadata-only difference PASS | `{{判定}}` |
| BRIDGE-105 | 0.1.14 §13H / DB-016 | replay saved-source isolation | current revisionはconcurrencyだけ、battle inputはsaved checkpoint exact | current eligibility/world/RNG/ID再読込・source revision上書き禁止 | advance/retire/injury/start-reset/stale/journal fixtures | `{{判定}}` |
| BRIDGE-106 | 0.1.14 §4.1 | POST errorReference acceptance boundary | pre-accept=server ref/no journal、post-accept=request validated ID/journal exact | raw requestId採用・journal推測・境界後ref切替禁止 | parser/fingerprint/journal/capacity/serialize/replay fixtures | `{{判定}}` |
| BRIDGE-107 | 0.1.14 §3F.1A | GET commitState | all read-only GET failures always none/no week/no completed revision | session registration/error counter/cacheをcommit扱いすること禁止 | all GET codes/new-session/internal/read side effects | `{{判定}}` |
| BRIDGE-108 | 0.1.14 §6J | start/reset state scope | reset=world再初期化/same run-init exact維持/validation置換+latest null、session secret/journal/revision counter保持、stepはlatest保持 | resetでjournal/secret全clear・old latest持越し・revision zero化禁止 | start/reset/step/failure state matrix | `{{判定}}` |
| BRIDGE-109 | 0.1.14 §6K | reset cursor/journal lifetime | old signed cursor=STALE、cursorなしlatest=404、old journal exact replayはstate非変更 | reset secret rotationで400化・old response current化・state巻戻し禁止 | all cursor kinds + old/new requestId fixtures | `{{判定}}` |
| BRIDGE-110 | 0.1.14 §5B | UiReadSnapshot 0.2.0 | exact7 + runInitializationSnapshot必須、current/operation-start共通builder | current run-init混読・preset再解決・shared mutable snapshot禁止 | reset/update generation + missing/extra/mutation fixtures | `{{判定}}` |
| BRIDGE-111 | 0.1.14 §4B | process cursor security keys | cursorHmacKey/bindingKey別256bit key・startup生成・用途分離 | per-session生成/reset rotation/key共用/fallback禁止 | key generation failure/purpose separation/restart fixtures | `{{判定}}` |
| BRIDGE-112 | 0.1.14 §6J.2 | start empty/ready lifecycle | empty/ready両方許可、ready-start=new run/new RunInitializationSnapshot、atomic success/none failure | reset扱い・old run持越し・atomic complete error・revision zero化禁止 | empty-start/ready-start/precommit-fail/transport/updating fixtures | `{{判定}}` |
| BRIDGE-113 | 0.1.14 §6L | ready-start cursor/journal | old signed cursors=STALE、latest cursorless=404、old journal exact replay state非変更 | key rotationで400化・journal clear・old response current化禁止 | all cursor kinds + old/new requestId after ready-start | `{{判定}}` |
| BRIDGE-114 | 0.1.14 §3F/§13E | atomic mutation response boundary | start/reset/mock/replayはsuccess bytes+next state+journalをprecommit検証し1 atomic commit | app-level partial/complete・postcommit DTO build・transport500化禁止 | serializer fault/commit/transport/same-request replay | `{{判定}}` |
| BRIDGE-115 | 0.1.14 §3C.5 | isUpdating final response semantics | new error=construction-time updateControl、accepted final error=true、POST success=false、saved replay原文 | error保存後falseへ書換・partial revisionをoperationStartへ戻すこと禁止 | preaccept/running/accepted none/partial/complete/saved replay | `{{判定}}` |
| BRIDGE-116 | 0.1.14 §10G.2 | battle-log cursor dual binding | result revision=dataIdentityのみ、payload.uiRevision=fixed read snapshot revision | direct resultUiRevision field追加・step後cursor継続・更新中current revision混読禁止 | step/latest-retain/update-in-progress/new-mock/reset fixtures | `{{判定}}` |
| BRIDGE-117 | 0.1.14 §10F/§13C | Mock result/log wire boundary | MockView exact34 no raw result、BattleLog data exact4 resultUiRevision保持 | raw resultでpaging迂回・log result revision削除・session/result revision同一視禁止 | large log + step-retained latest + exact wrapper fixtures | `{{判定}}` |
| BRIDGE-118 | 0.1.14 §13C.1B | GET latest revision separation | envelope uiRevision=fixed snapshot、data.resultUiRevision=latest creation、source<=result<=response | step後result==response強制・current revision混読禁止 | new mock/replay直後 + step後 + updating GET | `{{判定}}` |
| BRIDGE-119 | 0.1.14 §6M | ValidationStore occurrence lifecycle | start/reset=1から再構築、weekly commit=nextから元順、rollback/noncommit=no consume | old max引継ぎ・failed draft採番・dedupe補正禁止 | init0/multi + week0/multi + rollback/partial/reset/cursor fixtures | `{{判定}}` |

BRIDGE-040～119も既存表と同様、最終版では実symbol、module path、test name、解決参照を記入する。`{{...}}`が残る場合は未完了。


## 3A. BRIDGE-016/017補正

0.2.4のBRIDGE-016/017は0.1.14 §10Aを優先して解釈する。

- BRIDGE-016: generic ValidationResultの実type/module、`ok/issues[path,message]`、canonical化可能性を全具体型で監査する。
- BRIDGE-017: CommittedValidationViewStoreのoccurrence採番、commit/rollback境界、0.2.0 view mappingを監査する。
- `code`、`sourceProcessor`、`canContinue`をgeneric ValidationResultのrequired fieldとして要求しない。


## 4A. UI-000-ABILITY-MUTATION-MAP

Sprint 1完成codeについて、Person ability `surfaceValue`をcommit時に変更可能な全production pathを列挙する。

| mutator | source module/public facade | emitted canonical event | unit | rollback boundary | test | 判定 |
|---|---|---|---|---|---|---|
| `{{mutator}}` | `{{source}}` | `{{eventType}}` | `{{unit}}` | `{{boundary}}` | `{{test}}` | `{{判定}}` |

期待current contract:

```text
weekly training -> training.stat_growth_applied
```

だけ。

追加mutatorが発見された場合、statHistory実装で吸収せず`spec_fix_required`。
未分類mutator 0件を必須とする。

## 4. EVENT-PERSON-MAP変更

EVENT-PERSON-MAPは「filterのpayload path決定表」ではない。

全eventTypeについて次を監査する。

| eventType | producer | expected entities.personIds | payload内PersonId field | cross-reference rule | test | 判定 |
|---|---|---|---|---|---|---|
| `{{eventType}}` | `{{producer}}` | `{{persons}}` | `{{payload paths}}` | entitiesとpayloadの意味整合 | `{{test}}` | `{{判定}}` |

`GET /events?personId=P`の判定は全行共通で:

```text
event.entities.personIds.includes(P)
```

payload pathをfilterへ使用しない。

## 5. DISPLAY-MAP追加必須行

既存DISPLAY-MAPへ少なくとも次を1field1行で追加する。

- people.familyId
- people.lineageId
- people.currentRank
- people.highestRank
- people.retirementRank
- people.stats.stamina/strength/skill/speed/spirit/magic -> surfaceValue
- people.aptitudes.unarmed/sword/magic -> surfaceValue
- person.temporaryCondition.fatigue/injury/condition/confidence
- person.parentPersonIds
- person.formalMasterPersonIds
- technique state全field
- TechniqueDefinitionView全field
- mock log.actionSequence
- requestedAction
- resolvedAction
- replacementReason
- techniqueId
- activationChance/roll/result
- hitChance/roll/result
- damageVariance/damage
- rangeBefore/rangeAfter
- sourceLogEntry
- simulation.elapsedWeeks -> WorldDate.absoluteWeek
- failureEnvelope.refreshRequired
- INTERNAL_ERROR.errorReference

object単位「確認済み」は禁止。

## 6. TX追加

既存TX-001～090を維持し、次を追加する。

### TX-017 Mock battle / replay post-start execution abort

前提:
- valid ready session
- accepted requestId
- battle start相当のbattle-local処理後にdependency failure注入

必須:
- HTTP500
- INTERNAL_ERROR
- commitState=none
- refreshRequired=false
- canonical world hash unchanged
- World RNG unchanged
- MatchId generator unchanged
- EventAllocationState/Event Stream unchanged
- validation store unchanged
- mock latest unchanged
- uiRevision unchanged
- lastOperation unchanged
- completed journalあり
- same request exact response replay
- partial battle events/resultsなし

### TX-018 normal serializer failure -> minimal fallback

case:
- start/reset/mock commit前
- step 0週commit
- step partial commit後
- step complete commit後

必須:
- 正しいcommitState
- fallback public message固定
- stack/path/secretなし
- fallback bytes journal保存可能

### TX-019 fallback 500 exact request replay

- first requestでfallback 500
- same requestId/same fingerprint再送
- status同一
- body bytes同一
- errorReference同一
- duration等も保存済み値のまま
- state再実行なし

### TX-020 corrupt mock latest / replay

case:
- BattleResult hash tamper
- replaySnapshot cross-reference tamper
- schema unknown key
- sourceWorldUiRevision不整合

GET latest:
- 500 none
- partial displayなし

POST replay accepted:
- 500 none
- journal completed
- latest/world/revision unchanged

### TX-021 Battle log cursor / actionLogs revision

- sourceはactionLogs
- 0/100/101/200/201境界
- resultUiRevision置換後の旧cursor -> STALE_CURSOR
- sourceIndex tamper -> INVALID_REQUESTまたはcursor validation failure
- turnOrderLogs count差はactionLogs paging countへ影響しない

### TX-022 errorReference / fallback GET

- 同一accepted POST replayで同じerrorReference
- requestIdを持たない独立GET 500は別errorReference
- errorReference発行でsimulation RNG不変
- process restart後serverInstanceIdは旧値を再利用しない
- errorCounter overflow前に安全にprocess errorとして停止しsimulation stateへ影響しない


### TX-023 apiSchemaVersion / old cursor migration

- current responseはsuccess/failure/fallbackすべて`apiSchemaVersion="0.2.0"`
- current processが発行するCursorPayloadはschema 0.2.0かつ`apiSchemaVersion="0.2.0"`
- current keyで正しく署名された旧0.1.0 cursorをcurrent 0.2.0 endpointへ渡す
  - HTTP409
  - STALE_CURSOR
  - commitState=none
  - refreshRequired=true
- 同じpayloadを署名改ざんした場合は400 invalid cursor
- old cursor rejectionでsimulation state / uiRevision / journal / RNGは不変


### TX-024 TrainingHistory aggregation

- 同一人物のtrain_stat / learn progress / learn+acquired / acquirable / practice / forced rest / normal restを各1週生成
- 1 item = 1 action_selected anchor
- trainingKind/target/forcedはanchor payload直結
- statChanges.amount = stat_growth_applied.after-before（surfaceValue単位）
- learnedTechniqueIdsはtechnique.acquiredだけ
- relatedEventSequencesはgroup全event sequence昇順
- itemsは`max(0,W-47)..W`の48週窓、absoluteWeek降順
- anchor欠落、anchor重複、順序不整合、person/worldDate不一致は500で部分historyを返さない

### TX-025 MockBattle latest integrity hash

- valid record -> GET latest/log/replay可
- replaySnapshot内1 field改ざん + hash据置 -> 500
- replaySnapshot改ざん + replaySnapshotHash再計算 + latestRecordHash据置 -> 500
- latest record内eventCandidates改ざん + latestRecordHash据置 -> 500
- 両hashを攻撃側が再計算してもBattleResult/runtimeCheckpoint/cross-reference不整合なら500
- hash provider failure -> 500 INTERNAL_ERROR, state/revision/latest不変
- hash検証のためsimulation RNGを消費しない


### TX-026 ValidationResult generic view / status filter

- generic success ValidationResult:
  - status=success
  - issueCount=0
  - issues=[]
  - raw result unchanged
- generic failure ValidationResult with multiple issues:
  - status=failure
  - issueCount=issues.length
  - path/message convenience fields preserve original order
  - actual/expected等はraw resultから失われない
- `?status=success|failure` filters only by`result.ok`
- status omitted and canonical null are equivalent
- status変更 + old cursor -> 409 STALE_CURSOR
- old `?code=...` -> 400 unknown query parameter
- BattleFailureInfo.code/API StableErrorCodeをValidationResult filterへ混ぜない
- validationOccurrenceの採番/rollback非消費は既存契約どおり


### TX-027 WorldSummary source / commit generation

- start成功後summaryのidentity/rule fieldが新RunInitializationSnapshotとexact一致
- start後にpreset registry元データをテスト上差し替えても、既存run summaryは変わらない
- step success後:
  - identity fixed fields unchanged
  - worldDate/elapsedWeeks/personCountは最終commit snapshot
- partial failure committedWeeks=0:
  - summaryはoperation-start committed snapshot exact
- partial failure committedWeeks>0:
  - summaryは最後の成功週commit exact
  - failed draftだけを変更してもsummary不変
- `failedWeek.worldDateBeforeStep == summary.worldDate`
- current MatchId stateを進めても`initialMatchIdGeneratorStateHash`不変
- living/deceased filterを変えてもpersonCountはlogical active+historical全Person件数。現monolithic storeではcollection countでよい。Historical partition後はmaintained validated count/index可で、normal GETのarchive全payload scanは禁止
- mixed-generation source readをfault injectionで検出して500

### TX-028 failedWeek validation noncommit collection

- public failure collection `[successValidation, failureValidation, failureValidation]` fixture:
  - wire order exact
  - canonical content exact
  - at least one ok=false
- partial failure response後:
  - failed-week collectionはCommittedValidationViewStoreへ追加されない
  - previous committed validation itemsだけ残る
- collection空 -> internal contract failure
- all ok=true -> internal contract failure
- issuesだけ/single custom failureしかpublic facadeにない場合はUI-000 gate failure fixtureで検出
- 1週domain failureは従来どおり422でSimulationMutationViewを返さない


### TX-029 Mock candidate / accepted pre-start eligibility

GET candidates:
- eligible trainee age 8/15 -> included
- eligible active competitor age 16/41 -> included
- age 7/42 -> excluded
- deceased/waiting/stopped/child/retired -> excluded
- injury unable-to-continue threshold以上 -> excluded
- CandidateViewにreason/eligible flagなし

POST:
- valid current revision + syntactically valid but ineligible PersonId -> 422 BATTLE_PRE_START_FAILURE
- error.validationは正規pre-start ValidationResult
- MatchId/RNG/event/mock latest/uiRevision/lastOperation不変
- accepted request journalへ422保存、same request exact replay
- stale expectedUiRevision + 同時に現在不適格 -> 409 STALE_UI_REVISIONを先に返し、pre-start validatorを実行しない


### TX-030 MockBattle judge / finalRngState

case A:
- endReason=judge_decision
- judgeScore!=null
- endReasonIsJudgeDecision=true
- judgementApplied=true

case B:
- endReason=unable_to_continue
- participantA/BともunableToContinue=true
- judgeScore!=null
- endReasonIsJudgeDecision=false
- judgementApplied=true

case C:
- knockout/surrender/片側unable_to_continue
- judgeScore=null
- judgementApplied=false

case D:
- seeded final tie-break使用
- summary judge decisiveCriterion=seeded_rng
- seededRngRollはSprint 1正本値
- finalRngStateはBattleResult同field exact
- PersonId/battleSeed/modulo/新規RNGからUI再計算しない

case E:
- resolution_error
- BattleResultに保存されたfinalRngStateをそのまま返す

全caseでBattleResult validator合格を前提にし、UI mappingでRNGを追加消費しない。


### TX-031 MockBattleView exact source precedence

completed:
- failure=null
- battleSeed == BattleResult.finalState.battleSeed
- participant source hashes == finalState participant sourceSnapshotHash
- logTotalCount == detailedLog.actionLogs.length

resolution_error:
- failure全5field == finalState.failure
- `reason`をmessageへ変換しない
- validation.violations先頭を入れ替えてもfailure不変

source-conflict tamper:
- eventCandidate battleSeed/participant/matchIdをBattleResultと不一致にする
- replaySnapshot participant/action identityをBattleResultと不一致にする
- current World participant source hashを後から変更する
- adapterはどれもfallback sourceにせずstrict cross-reference failureとして500

BattleResult finalState/top-level不一致はBattleResult validatorまたはDTO cross-referenceで500。


### TX-032 Person statHistory exact chain

case 1 no growth:
- initial=current
- last48=0
- lastWeek=0

case 2 current week growth:
- event.after-beforeだけをlast48/lastWeekへ加算
- appliedMilliPointsを使用しない

case 3 W=47 / W=48:
- max(0,W-47)境界をexact確認

case 4 >48 weeks:
- initialはrun全event chainの最初のbefore
- last48は窓内だけ
- currentはPerson surfaceValue
- old eventを捨ててもinitial算出sourceとしては必要なので、PersonDetail生成時にrun全Event Streamへアクセスできること

tamper:
- adjacent before/after chain mismatch
- final event.after != current surfaceValue
- after < before
- wrong personId/stat/worldDate
- safe integer overflow

上記tamperは500。statHistory=nullや0補完で200にしない。


- training.stat_growth_applied from foreign sourceProcessor -> 500, not included

### TX-033 Mock replay checkpoint exact capture

new mock:
- acceptedUiRevision=R
- capture checkpoint before MatchId reserve / World RNG draw
- original run consumes clone-only MatchId/RNG
- stored checkpoint still equals pre-start state

after original mock:
- canonical world is advanced by normal step(s)
- current world RNG/MatchId/person state differs
- replay uses stored checkpoint only
- replay BattleResult/eventCandidates exact match original
- sourceWorldUiRevision stays R
- replaySnapshotHash stays identical
- new resultUiRevision may differ

fault:
- replace only runtimeCheckpoint World RNG with current world value
- replace only MatchId generator with current value
- both must fail integrity/cross-reference; no fallback


### TX-034 Mock eventCandidates exact pair

valid completed/resolution_error:
- length=2
- [0]=battle.started
- [1]=battle.finished
- all overlapping fields exact BattleResult

tamper independently:
- reverse order
- remove started
- remove finished
- append third candidate
- duplicate started
- change matchId/person/worldDate/battleSeed/resultKind/endReason/finalStateHash
- add fake EventId/sequence if candidate schema forbids allocation fields

all tamper -> 500 INTERNAL_ERROR, latest partial displayなし。

pre_start_failure / execution abort:
- latest unchanged
- no 200 MockBattleView with empty eventCandidates


### TX-035 Person Sprint1PersonState direct view

valid active/inactive/deceased:
- currentMental exact sprint1State.currentMental
- learningFocusTechniqueId exact
- techniques count == stored techniqueStates count
- techniqueId asc
- acquired count == learnedTechniqueCount

negative:
- ready Person missing sprint1State -> 500
- invalid currentMental vs spirit context -> 500
- focus TechniqueId missing from catalog -> 500
- stored technique state missing catalog definition -> 500
- duplicate techniqueId -> 500

禁止確認:
- GETがinitial stateを自動付与しない
- catalog未保持definitionをzero-state TechniqueViewとして追加しない
- event historyからcurrentMental/focusを復元しない


### TX-036 Event eventGroup exact semantics

training:
- training.action_selected -> included
- training.stat_growth_applied -> included
- training.condition_updated -> included
- synthetic valid future `training.test_added` -> included by prefix
- technique.mastery_increased -> excluded

technique_learning:
- technique.learning_progressed -> included
- technique.acquired -> included
- technique.mastery_increased -> excluded
- synthetic `technique.other` -> excluded

query:
- eventType + eventGroup -> 400
- eventGroup + personId/year/month/week -> AND
- same uiRevisionでeventGroupだけ変更してold cursor使用 -> 409 STALE_CURSOR
- groupをEventEnvelope payload/entityへ書き戻さない


### TX-037 GET error precedence collision matrix

最低限、各組合せを別caseで固定する。

- no session + malformed query -> 401 SESSION_REQUIRED
- valid session + malformed ordinary query + empty lifecycle -> 400 INVALID_REQUEST
- valid session + raw cursor queryは構文validだがpayload/HMAC invalid + empty lifecycle -> 409 SIMULATION_NOT_STARTED
- ready + malformed/tampered cursor + latest missing -> 400 INVALID_REQUEST
- ready + authenticated old mock-log cursor + latest missing -> 409 STALE_CURSOR
- ready + current valid cursorなし + person missing -> 404 NOT_FOUND
- ready + cursorなし + latest missing -> 404 NOT_FOUND
- ready + authenticated stale cursor + corrupt current latest -> 409 STALE_CURSOR
- ready + current-binding cursor + corrupt current latest -> 500 INTERNAL_ERROR
- updating + current world has resource but operationStartReadSnapshot lacks it -> snapshot側404
- updating + pre-update cursorがoperationStartReadSnapshotへ一致 -> request完了までvalid

GET /session:
- malformed/unknown query + no cookie -> 400, new sessionを作らない
- valid request + no/old cookie -> new empty session 200

GET /session bootstrap metadata:
- invalid query + no/invalid/old cookie -> 400 uiRevision=null/isUpdating=false/new sessionなし
- invalid query + valid idle cookie -> 400 current integer revision/isUpdating=false/CSPRNG0/rotation0
- invalid query + valid updating cookie -> 400 operationStart revision/isUpdating=true/CSPRNG0/rotation0
- valid queryless request + no/old cookie -> new empty session 200/uiRevision=0/isUpdating=false
- valid existing updating session -> data.sessionState=updating + current csrfToken/activeOperation, envelope revision=operationStart revision
- SessionDataView exact3; summary/lastOperation/uiRevisionをdataへ追加禁止

GET /presets:
- valid empty session -> 200
- valid updating session -> preset items unchanged, envelope operationStart revision/isUpdating=true
- no session -> 401
- any query/cursor -> 400

session corruption:
- /session以外 authentic cookie + corrupt UiSession -> 500 uiRevision=null/isUpdating=false、401へ畳み込まない
- GET /session authentic cookie + corrupt UiSession -> 500 uiRevision=null/isUpdating=false、新session生成0
- corrupt row delete/self-heal/session rotation 0

### TX-038 0.2.0 page presentation override

People list:
- Family/Lineage IDsと3 rankを別表示
- affiliationLabels/overallRank API fieldを要求しない

Person detail:
- formalMasterPersonIds/parentPersonIds全件表示
- singular mentorを選ばない
- training historyにinstructor列を作らない

Technique:
- direct TechniqueDefinition fieldsを表示
- usageConditions/hitParameters/consumptionAndUseLimit synthetic objectを作らない

Mock candidates:
- eligible only
- disabled ineligible person/reason一覧なし
- POST 422時だけerror.validationを表示

Mock result:
- endReasonIsJudgeDecisionとjudgementAppliedを別表示
- both-UTC judge caseを正しく表示


### TX-039 TechniqueDefinition exact 31-key wire

- valid production definition:
  - Object.keys(definition view) set == TECHNIQUE_DEFINITION_KEYS set
  - key count == 31
  - each value canonical clone exact
- one required key missing -> response mapping拒否
- synthetic extra key -> response mapping拒否
- test-only upstream key set 32/mismatch -> UI-000 spec_fix_required
- displayName aliasを追加しない
- same apiSchemaVersion 0.2.0のままkey driftを許さない

### TX-040 ApiError.validation exact array

DOMAIN_VALIDATION_FAILED:
- single ValidationResult -> validation=[result]
- multiple results -> same order array
- zero results -> validation field absent

BATTLE_PRE_START_FAILURE:
- single/multiple same rule
- result original canonical fieldsを保持

reject:
- validation:null
- validation:[]
- validation:{ok:false,...} single object
- validation:[...issues] issue flatten
- INTERNAL_ERROR等other code + validation
- ValidationResultViewItemへ変換済みobject

same requestId replayではvalidation配列を含むbody bytes exact。

### TX-041 pageable totalCount / nextCursor

各pageable endpointで:

- 0 matches -> items=[], totalCount=0, nextCursor=null
- exactly limit matches -> totalCount=limit, nextCursor=null
- limit+1 matches -> first page totalCount=limit+1,nextCursor!=null; second page totalCount同値
- >2 pages -> 全page totalCount同値、重複/欠落なし
- filterで元100件→7件 -> totalCount=7を全pageで維持
- cursor以降件数をtotalCountにしない
- items.length==limitでも残件0ならnextCursor=null
- presets -> totalCount=items.length,nextCursor=null


### TX-042 INVALID_REQUEST fieldErrors exact contract

body:
- missing requestId -> `/body/requestId`, `required`
- requestId numeric -> `/body/requestId`, `invalid_type`
- UUID文字列だがcanonical v4不正 -> `/body/requestId`, `invalid_format`
- weeks範囲外 -> `/body/weeks`, `out_of_range`
- unknown body key -> `/body/<escaped-key>`, `unknown_field`

query/path:
- duplicate limit -> `/query/limit`, `duplicate`
- malformed personId -> `/path/personId`, `invalid_format`
- eventType + eventGroup -> 両field `conflicting_fields`
- same participant A/B -> 両body field `conflicting_fields`

fieldless:
- malformed JSON
- raw body上限超過
- root objectでないrequest body

上記はINVALID_REQUESTだがfieldErrors field自体を省略。

order:
- pointer Unicode code point asc
- same pointerはfixed code order
- duplicate `(field,code)`なし

security:
- messageへstack/path/secret/raw bodyを含めない
- message exact textはassertしない
- same accepted request response replayでは保存済みmessage bytes exact


### TX-043 CanonicalGetQuery 0.2.0

全5 endpoint queryで:
- raw cursorを除外してcanonical builderを実行
- exact discriminant/key setをassert
- unknown/undefined/cursor key混入reject

default equivalence:
- people no query == explicit sortBy=personId&sortOrder=asc&limit=50
- events no query == explicit limit=100
- validation no query == explicit limit=100
- candidates no query == explicit limit=50
- battle log no query == explicit limit=100

validation:
- omitted status -> null
- status=success/failure exact
- `code` query -> 400
- raw `status=` -> 400
- status changed with old current-schema cursor -> 409 STALE_CURSOR
- correctly signed old 0.1.0 ValidationQuery/code cursor -> 409 STALE_CURSOR

cursor payload:
- query has no cursor property
- nextPosition only in CursorPayload.nextPosition
- same effective query with explicit defaults remains valid


### TX-044 PersonDetail qualifiedMaster

valid:
- child living/deceased -> false
- trainee living/deceased -> false
- active_competitor living/deceased -> false
- retired living/deceased -> canonical stored true/false

mapping:
- PersonDetail.qualifiedMaster == canonical Person.qualifiedMaster exact
- rank変更だけではadapterがqualifiedMasterを再計算しない
- formalMasterPersonIds membershipだけでは値を上書きしない

tamper:
- child/trainee/active qualifiedMaster=true -> canonical validation/response mapping 500
- required qualifiedMaster欠落 -> 500
- non-boolean -> 500

UI:
- detailで確認可能
- people list/query/sortへ0.2.0で新条件を増やさない


### TX-045 Mock candidate exact predicate / corruption distinction

eligible:
- living active trainee age 8 / 15 injury threshold-1 -> included
- living active active_competitor age 16 / 41 injury threshold-1 -> included
- CandidateView exact 4 keys
- age == validated canonical stored current-age field
- derived age is equality cross-check only; DTO builderで再計算しない

valid but ineligible:
- deceased
- waiting
- stopped
- child
- retired
- trainee age 7 / 16
- active competitor age 15 / 42
- injury == threshold / threshold+1
-> excluded, endpoint自体は200

canonical/source corruption:
- currentAge != derived age
- unknown techniqueId
- invalid Sprint1PersonState/currentMental
- invalid StatValueTriple
- invalid temporaryCondition shape
- hash provider failure
-> endpoint whole体500、部分candidate listなし

pair:
- same Person can appear once in candidate collection normally
- A/B同一選択はGET membershipへ影響させない
- POSTでINVALID_REQUEST/pre-start正本順に拒否

read-only:
- GET前後 World RNG / MatchIdGeneratorState / EventAllocationState / uiRevision / latest exact unchanged
- participant validatorが内部hash計算してもruntime state非変更


### TX-046 PersonList/Detail 0.2.0 complete DTO

PersonList:
- Object.keys exact 16
- affiliationLabels/overallRank/qualifiedMaster等旧・detail-only fieldなし

PersonDetail:
- Object.keys exact 25
- statHistory object必須
- trainingHistory.available === true
- mentorPersonId/affiliationLabels/overallRank/instructorPersonIdなし

strict:
- one required key delete -> output validation fail
- old field inject -> output validation fail
- `undefined` nullable field -> fail
- null-required field -> fail
- sparse array -> fail

same revision:
- list/detail shared fields exact
- acquired technique count exact
- list/detailを異なるrevisionで取ったcaseはcross-response equality assertion対象外

long-run scope:
- TX-046 exact16/exact25はcurrent API 0.2.0のstrict wire contract
- Historical partial-corruption list/detailの将来wire schemaではない
- Historical reader導入時にexact16/25を理由としてwhole-list/detail 500を強制しない


### TX-047 server errorReference allocator lifecycle

startup:
- OS CSPRNG success + UUIDv4 valid -> listener bind後にserver開始
- CSPRNG throw/failure -> listener未bind、session/world未生成、nonzero startup failure
- invalid UUID bytes/result -> same
- Math.random/timestamp/fixed fallbackを使用しない

running:
- first refs end with `:1`, `:2`, `:3`
- all refs same serverInstanceId within process
- unique exact
- allocation itselfでsimulation RNG/uiRevision/session revision不変

serialization failure:
- ref N allocation後にresponse serialize/transport fault
- next ref is N+1
- Nを再利用しない

exhaustion:
- counter=MAX_SAFE_INTEGER-1 -> その値で最後のref発行、counter becomes MAX_SAFE_INTEGER
- next allocation requirement -> process-fatal、wrap/reseedなし
- canonical world/session state追加変更なし


### TX-048 MockBattleMutation/View complete invariants

new success:
- mutation exact5 keys
- result exact34 keys
- replay=false
- completedUiRevision=accepted+1
- result.resultUiRevision=completed
- latest.resultUiRevision=completed
- session uiRevision=completed
- sourceWorldUiRevision=accepted

replay success:
- replay=true
- revision4値同規則
- sourceWorldUiRevision remains saved original <= accepted

completed result:
- winner/loser both nonnull/distinct/two participants
- failure=null
- finalState.status=completed
- validation.overallPassed=true
- endReason != resolution_error

resolution_error:
- resultKind=failed
- winner/loser null
- endReason=resolution_error
- endReasonIsJudgeDecision=false
- judgementApplied=false
- judgeScore=null
- failure exact finalState.failure
- finalState.status=failed
- validation.overallPassed=false
- eventCandidates still exact started/finished pair

source identity:
- candidate immutable latest is built/validated before commit
- response.result and candidate next session latest derive from that exact same object
- force independent BattleResult/convenience builder divergence -> precommit failure
- no postcommit readback-only response construction

strict:
- judgeDecision injection -> reject
- failure.message injection -> reject
- one mutation/view key missing/extra -> reject
- revision mismatch -> reject/no partial fix


### TX-049 Person temporaryCondition / currentMental boundaries

temporaryCondition valid:
- fatigue 0 / 100
- injury 0 / 100
- condition -20 / 20
- confidence -20 / 20

invalid independently:
- fatigue -1 / 101 / 0.5
- injury -1 / 101 / 0.5
- condition -21 / 21 / 0.5
- confidence -21 / 21 / 0.5
- missing/extra key
-> 500、clamp/defaultなし

currentMental:
- spirit=0 -> 0 / 50 valid, 51 invalid
- spirit=50 -> 0 / 100 valid, 101/99.5/-1 invalid
- spirit=100 -> 150 valid, 151 invalid

mixed-generation:
- Person.stats.spirit from revision R
- sprint1State/temporaryCondition from R+1
-> response builder must reject / never mix


### TX-050 SimulationMutationView complete invariants

start:
- exact14
- success, requested=0, committed=0, failed=null
- completed=accepted+1
- summary=new initial commit

reset:
- same structural rules
- old world summary/results not leaked

step success:
- requested=1/N
- committed=requested
- failed=null
- completed=accepted+committed
- summary=final successful commit

step partial:
- requested>=2
- committed=0 and >0 cases
- failed index=committed+1
- failed validation length>=1 and §6B exact
- failed worldDateBeforeStep=summary.worldDate
- completed=accepted+committed
- counts exclude failure week
- validation store excludes failure week

tamper independently:
- operation/outcome illegal pair
- requested/committed mismatch
- failedWeek wrong nullness/index/date/empty validation
- completed revision mismatch
- mockBattleCount=1
- extra/missing top-level key
-> output validation fail; no auto-fix

journal:
- same request replay returns exact saved mutation body
- lastOperation derives from saved success body, not separate mutable record


### TX-051 TechniqueView exact state semantics

valid:
- exact9 keys
- learningProgressTenths=0
- cap-1 / cap
- mastery=0 / 10000
- use counts 0
- weeks null / valid nonnegative
- acquiredWeek null -> learnedState=learning
- acquiredWeek nonnull -> learnedState=acquired

invalid:
- progress -1 / decimal / cap+1
- mastery -1 / 10001 / decimal
- state techniqueId != definition.techniqueId
- missing/extra/undefined state key
- catalog missing definition
-> 500、0/null補完なし

structural-vs-semantic:
- raw PersonTechniqueState validatorが大きいprogressを許しても
- catalog definition capを超えれば PersonDetail/TechniqueView mappingは拒否

UI独自にsuccessful<=attempted等の新相関を追加せず、upstream semantic validatorだけを正本とする。


### TX-052 TechniqueDefinition exact value contracts

enums:
- category unarmed/sword/magic valid、martial/unknown invalid
- learningTier basic/standard/advanced/secret
- consumption small/medium/large/ultimate
- priority 2/1/0/-1 valid、3/-2/decimal invalid
- BattleRange contact/close/middle/long only in range arrays

numeric boundaries:
- all 0..100 fields at 0/100 valid、-1/101 invalid
- learningProgressRequired 1/10000 valid、0/10001 invalid
- mentalCost 0/MAX_SAFE_INTEGER valid、negative/decimal/MAX+1 invalid
- speedModifier/injuryModifier -20/20 valid、-21/21 invalid

actionTraits:
- exact5 false valid
- each single true current contract invalid
- missing/extra key invalid

arrays:
- reversed valid input -> validated canonical order
- duplicate/sparse -> invalid
- UI output exactly validated order、再sortなし

identity:
- definition.dataVersion != active catalog dataVersion -> invalid
- upstream schema/key/literal drift -> UI-000 spec_fix_required、adapter alias禁止


### TX-053 EventList canonical EventEnvelope

valid:
- each item exact canonical EventEnvelope 11 fields
- data exact3 keys
- item canonical JSON == committed Event Stream source item
- importance/origin/entities/payload preserved
- eventId/simulationId/sequence preserved

filter:
- year/month/week from worldDate only
- personId from entities.personIds only
- eventType/group from eventType only
- payloadに似たPersonId/year文字列があってもfallbackしない

source separation:
- failed-week draft event -> absent
- current in-progress update candidate -> operationStart committed streamのみ
- mock latest eventCandidates -> absent from canonical events endpoint

invalid stream:
- one event unknown key / invalid payload / duplicate sequence / broken EventId
-> whole response 500、bad itemだけ除外して200にしない

adapter:
- rawEvent二重fieldなし
- new EventId/sequence採番なし


### TX-054 Validation list complete DTO

success item:
- issue view exact2 schema exists but array empty
- item exact5
- status=success
- issueCount=0
- issues=[]
- result canonical raw `ok=true`

failure item:
- item exact5
- status=failure
- issueCount == result.issues.length
- issues same length/order
- each path/message same source index
- raw actual/expected等additional fields remain in result

list data:
- exact3
- PAGE-007 totalCount/nextCursor semantics

reject:
- issue extra/missing key
- item extra/missing key
- success with issueCount>0
- failure with reordered/deduped/filtered issues
- convenience issue message/path differs from raw result
- sparse arrays


### TX-055 pageable success data exact shapes

exact3:
- GET /people
- GET /mock-battles/candidates
- GET /events
- GET /validation-results

each:
- data top-level exact3
- items element exact endpoint item schema
- totalCount/nextCursor PAGE semantics
- missing/extra/undefined wrapper field reject

BattleLog:
- data exact4
- items/totalCount/nextCursor/resultUiRevision
- resultUiRevision == fixed latest.resultUiRevision
- top-level response.uiRevision may differ from data.resultUiRevision after normal step
- adding matchId/sourceWorldUiRevision/dataIdentity/currentUiRevision/page/hasMore -> reject
- removing resultUiRevision -> reject

Presets:
- items/totalCount/nextCursor
- nextCursor always null
- no paging cursor accepted

### TX-056 API envelope complete types

success:
- exact5
- apiSchemaVersion=0.2.0
- ok=true
- no error/refreshRequired
- GET uiRevision == read snapshot
- POST mutation uiRevision == data.completedUiRevision, isUpdating=false

failure:
- exact6
- ok=false
- no data
- pre-session uiRevision=null,isUpdating=false
- valid-session uiRevision nonnull
- accepted POST final error while own lock held -> isUpdating=true
- saved response replay preserves original isUpdating

ApiError:
- required3 always
- no unknown/undefined/null optional
- INVALID_REQUEST fieldErrors matrix
- DOMAIN/BATTLE validation matrix
- none forbids committedWeeks/completedUiRevision
- partial/complete requires both
- INTERNAL_ERROR requires errorReference
- other code forbids errorReference

refresh:
- exact true/false matrix

reject each independently:
- success+refreshRequired
- failure+data
- wrong api version
- partial missing completedUiRevision
- none with committedWeeks
- INTERNAL missing ref
- other with ref
- top-level uiRevision mismatch completedUiRevision

minimal fallback must also pass exact failure validator.


### TX-057 DEFERRED_BINDING register completeness

happy:
- DB-001..022 exactly once
- all actual fields concrete
- all status=matched
- no unregistered uncertainty
- GATE-012 pass

negative independently:
- delete DB-006
- duplicate DB-014
- rename DB subject to different meaning
- leave actualModule `{{...}}`
- status spec_fix_required
- discover new physical binding not matching 001..022
- discover semantic unknown mislabeled as deferred

all negative -> UI-000 PASS禁止 / UI-001開始禁止。

new physical binding discovery:
- do not append DB-023 in-place
- require Sprint1.5 spec version bump then registry update


### TX-058 cursor dataIdentity compatibility vs stale

valid matrix:
- people/candidates/events -> `simulation:<simulationId>`
- validation -> `validation:<simulationId>`
- battle log -> `mock-result:<resultUiRevision>`

signed impossible combinations:
- people + validation prefix
- validation + query.kind people
- battle log + simulation prefix
- events request + cursor endpoint people
-> 400 INVALID_REQUEST, not STALE

stale current-compatible:
- same endpoint/kind/prefix but old simulationId
- old uiRevision
- validation old store identity
- battle log old resultUiRevision
- same kind/prefix but different effective filter/query
-> 409 STALE_CURSOR

old schema:
- correctly signed CursorPayload 0.1.0 -> 409 STALE_CURSOR

state:
- all cases no mutation
- dataIdentity never appears in response DTO/canonical world


canonical suffix:
- canonical SimulationId suffix only for simulation:/validation:
- mock-result:0 / mock-result:1 / mock-result:9007199254740991 valid lexical forms
- mock-result:01 / +1 / -1 / 1.0 / empty / MAX_SAFE_INTEGER+1 -> 400 even with valid HMAC
- canonical mock-result:1 with current latest resultUiRevision=2 -> 409 STALE
- parser must not normalize `01` to `1` before validation

### TX-059 StableErrorCode exact binding

- 0.1.13正本literal setを列挙
- current adapter StableErrorCode setを列挙
- set exact一致
- endpoint/status matrixで参照されるcodeは全てset member
- one literal add/remove/rename fixture -> GATE/BRIDGE fail, aliasで吸収しない


### TX-060 TrainingHistory anchor target/forced binding

valid target correlations:
- train_stat -> targetStat nonnull / targetTechniqueId null
- learn_technique -> targetStat null / targetTechniqueId nonnull
- practice_technique -> targetStat null / targetTechniqueId nonnull
- rest -> both null

invalid each opposite combination -> 500、UI補完なし。

forced:
- upstream payload validatorが許可するforced/forcedReason pairをexact pass-through
- UIがreason stringを新規生成しない
- upstream closed literal unionならunknown literalをreject
- DB-021 actual union/test未解決 -> UI-001禁止


### TX-061 DEFERRED_BINDING body-reference coverage

document machine scan:
- general definition/registry summary lines are exempt
- every individual deferred subject line must include DB-xxx
- ID must be 001..022
- ID subject must equal registry subject
- multiple deferred subjects in one sentence require all IDs

negative:
- remove DB-006 from temporaryCondition line
- mark checkpoint line DB-017 instead of DB-016
- add unregistered DB-023
- mention two subjects with one ID
-> GATE-013 fail / UI-001禁止


### TX-062 migration override audit

for MIG-001..036:
- production source search of old field/query/schema symbol -> 0 hits
- new contract implementation evidence exists
- negative test proves old shape/query/alias rejected

inject examples independently:
- judgeDecision alias
- overallRank computed field
- mentorPersonId=masters[0]
- `?code=` compatibility conversion
- apiSchemaVersion 0.1.0 on one failure endpoint
- BattleLog wrapperからresultUiRevisionを削除、または未定義identity fieldを追加
- Technique usageConditions synthetic object
-> GATE-014 readiness fail / UI-001禁止

history docs/changelog may contain old strings only if excluded path is explicitly reported.


### TX-063 Person age source consistency

living valid:
- Person.currentAge == computeCurrentAge(worldYear,birthYear)
- list age == currentAge
- detail age == currentAge
- eligible candidate age == currentAge
- same revision shared fields exact

living tamper:
- currentAge +1 while birthYear/worldDate unchanged -> all relevant GETs 500, no UI recompute fix

update snapshot:
- operationStartReadSnapshot has old worldDate/currentAge pair
- current state has new pair
- updating GET uses old pair consistently, no mixed-generation failure

deceased:
- list/detail age=null
- deathYear/ageAtDeath direct canonical fields
- participationStatus=null
- UI does not compute hypothetical current age or ageAtDeath
- invalid deceased canonical correlation -> 500

### TX-064 relationship all-record observation — current/active 0.2.0 path

- parent 0/1/2 valid records -> all IDs canonical sort
- master 0/1/multiple valid records -> all IDs canonical sort
- active/current/former/status metadataでUI独自filterしない
- first/latest代表選択なし
- current Sprint 1 monolithic sourceのbroken ref / duplicate / cycle / world validator failure -> whole PersonDetail 500
- このwhole-detail 500をHistorical readerへ一般化しない
- Historical archive導入後: readable field/edgeは保持、unreadable node/sectionだけplaceholder/unavailable、rule-critical missing/corruptionはcannot_determine


### TX-065 cursor HMAC-before-schema classification

signature target:
- expected HMAC input == first payload base64url segment ASCII bytes exact
- HMAC over decoded JSON bytes implementation -> FAIL
- HMAC over reserialized canonical JSON bytes implementation -> FAIL
- signature decode length exact SHA-256 HMAC bytes
- cursor HMAC key != sessionBindingHash binding key

bad HMAC:
- payload claims old/current/unknown schema -> always 400
- semantic JSON parse/classification not used for error status

valid HMAC:
- payload base64url decode/re-encode noncanonical -> 400
- payload JSON noncanonical / duplicate key / invalid UTF-8 -> 400
- strict old 0.1.0 -> 409 STALE_CURSOR
- current incompatible endpoint/kind/prefix -> 400
- current stale identity/revision/query -> 409

constant-time signature compare必須。

sessionBindingHash:
- exact64 lowercase hex valid
- uppercase / 63 chars / 65 chars / non-hex / null -> 400 strict schema
- recompute HMAC-SHA-256(bindingKey, session cookie ASCII) exact equality
- cursor HMAC keyでsessionBindingHashを再計算する実装 -> FAIL

### TX-066 Mock participant A/B order

- A=P,B=P -> 400 + two conflicting_fields、no RNG/MatchId
- A=X,B=Y -> exact side order across state/result/events/view/log
- swap -> different fingerprint/journal
- replay -> saved A/B order exact


same-person pre-accept:
- request journal create=0
- requestId reservation=0
- updateControl acquire=0
- eligibility/pre-start/RNG/MatchId calls=0
- same requestId resend is freshly validated 400, not journal replay

### TX-067 repeated new mock unchanged-world determinism

- same A/B new mock twice without world mutation
- BattleResult/events/seed/matchId/finalRng exact
- adapter revisions/hash/request/duration may differ
- inject uiRevision into seed / increment mock MatchId -> fail
- #2 replaces latest, #1 cursor stale, #1 journal remains exact replay


### TX-068 MockBattleView exact34 / raw BattleResult prohibition

valid:
- MockBattleView exact34
- convenience fields map from validated latest.battleResult/finalState/eventCandidates
- no `battleResult` top-level field
- no embedded `detailedLog`

negative:
- add raw `battleResult` -> output strict schema reject
- add raw `detailedLog` -> reject
- reintroduce old judgeDecision/failure.message -> reject
- log content accessible only through `GET /mock-battles/latest/log`

paging:
- large detailedLog does not inflate MockBattleView response

### TX-069 Person techniques order / focus

- catalog A/B/C, held B/C -> only B/C
- reversed source -> TechniqueId canonical asc
- duplicate state -> 500
- focus existing exact one + catalog -> valid
- dangling/catalog mismatch -> 500
- list learned count == acquired detail count


### TX-070 lastOperation across failures

prior HTTP200 success S:

atomic start/reset/mock/replay:
- precommit 4xx/422/500 none -> lastOperation S, state unchanged
- successful atomic commit -> new success becomes lastOperation
- transport failure after commit -> state/new lastOperation already success; same request replays saved 200
- no app-level atomic partial/complete case

step:
- 500 none -> S
- 500 partial/complete -> current world/revision may advance, lastOperation still S
- HTTP200 domain partial_failure -> that response becomes lastOperation

failed non-200 request replay never updates lastOperation.

wire ownership:
- GET /simulation.data.lastOperation only
- GET /session data exact3 and contains no summary/lastOperation
- API-006 summary and lastOperation use the same fixed UiReadSnapshot generation
- updating API-006 uses operationStartReadSnapshot.lastOperationRequestId, not current session pointer
- missing/corrupt/non-200 referenced journal record -> API-006 500, not lastOperation=null


K=0 HTTP200 partial_failure generation:
- uiRevision R before/after exact same
- world/validation/latest unchanged
- lastOperationRequestId old->new
- GET /simulation at same R must expose new lastOperation
- revision-only UiReadSnapshot cache must fail this fixture
- next mutation operationStartReadSnapshot at same R captures new lastOperationRequestId

HTTP200 finalization atomicity:
- K=0 partial: running->completed + exact 200 bytes + lastOperationRequestId new + updateControl null in one boundary
- never observe completed journal + old lastOperation
- never observe new lastOperation + running record
- never observe updateControl null + running record
- 500 step completion never updates lastOperation

### TX-071 UiSession CSPRNG failure / atomic registration

session ID:
- attempt1 unique -> CSPRNG session-id call count 1
- attempt1 collision, attempt2 unique -> count 2
- attempts1/2 collision, attempt3 unique -> count 3
- attempts1/2/3 collision -> 500 none、attempt4 callなし
- existing sessions never overwritten

CSRF:
- generated exactly once after unique session ID fixed
- independent 32-byte CSPRNG result / exact43 base64url
- CSRF failure -> no session row/cookie/journal/world

atomicity:
- any pre-store fault -> no partial session
- valid existing session GET -> no sessionId/CSRF regeneration
- no Math.random/time/fixed fallback

### TX-072 uiRevision capacity preflight

boundary:
- accepted=MAX-1 atomic +1 -> capacity allowed
- accepted=MAX atomic -> 500 none after prior validation passes
- step MAX-5 +5 -> allowed
- step MAX-5 +6 -> 500 none / zero weeks / zero RNG-ID consumption

precedence:
- malformed body + capacity不足 -> INVALID_REQUEST
- update lock + capacity不足 -> UPDATE_IN_PROGRESS
- stale expected revision + capacity不足 -> STALE_UI_REVISION
- invalid lifecycle + capacity不足 -> lifecycle error
- missing replay/latest resource + capacity不足 -> NOT_FOUND
- domain invalid + capacity不足 -> DOMAIN_VALIDATION_FAILED
- mock pre_start_failure + capacity不足 -> BATTLE_PRE_START_FAILURE
- corrupt reset snapshot + capacity不足 -> integrity INTERNAL_ERROR before capacity
- corrupt replay/latest + capacity不足 -> integrity INTERNAL_ERROR before capacity
- only when all above pass -> capacity INTERNAL_ERROR

state:
- capacity failure changes no world/RNG/MatchId/EventAllocation/validation/latest/lastOperation/revision
- accepted request failure can journal exact response
- no overflow-driven partial commit or revision wrap

### TX-073 commitState / committedWeeks matrix

atomic start/reset/new mock/replay:
- any DTO/schema/serializer/integrity/dependency failure before atomic commit -> 500 none
- committedWeeks/completedUiRevision absent
- partial/complete error forbidden
- success commit includes state + revision + saved HTTP200 journal response
- transport failure after commit -> no 500; same request returns saved 200

step:
- K=0 internal failure -> none
- 1<=K<N internal failure -> partial, committedWeeks=K
- K=N final response internal failure -> complete, committedWeeks=N
- top uiRevision == completedUiRevision for partial/complete

domain 200 partial_failure:
- K=0 allowed
- not ApiError commitState

### TX-074 TrainingHistory sourceProcessor isolation

- same person/week DB-011 training events -> included
- foreign processor technique/stat events -> excluded
- relatedEventSequences only DB-011 group
- tampered weekly producer sourceProcessor -> canonical validation failure/500
- eventType aloneでtrainingへ再分類しない


statHistory cross-check:
- DB-011 training.stat_growth_applied -> eligible for statHistory chain
- same eventType from foreign sourceProcessor -> statHistory whole response 500
- UI does not include foreign event by eventType name alone

### TX-075 deterministic comparison authority exact

- same-seed simulationId difference -> comparison FAIL
- same-seed EventEnvelope.eventId/simulationId difference -> comparison FAIL
- change sequence/payload/MatchId/person/RNG -> comparison FAIL
- no blanket `*Id` removal
- S01-009 run-metadata nondeterministic exclusion exact3: runId / realStartedAt / realEndedAt
- same verification HEADのcommitIdはcomparison対象
- 05正本の現実時刻/処理時間/最大メモリ/output path/環境固有値は存在時だけ除外
- CLI/UIはsame authority rule-setを使うが、同じ実装helper/moduleのimport/reuseは要求しない
- verification-private comparatorをproduction UIからimportしない
- authority rule-set drift / UI独自除外 -> UI-000 spec_fix_required


### TX-076 replay after current world advances

- original mock save result/events/source revision
- advance world/change age/career/injury/technique
- replay with current expected revision
- no current eligibility/person/RNG/MatchId read for battle source
- original result/events/matchId/seed/finalRng exact
- sourceWorldUiRevision remains original
- start/reset clear old latest -> old replay unavailable


- after reset/start clear: new requestId replay sees current latest missing / normal resource error
- after reset/start clear: old completed replay requestId exact-journal replays old response without operation execution
- old journal replay leaves current latest=null/world/revision/lastOperation unchanged

### TX-077 POST errorReference acceptance boundary

- pre-accept parser/body/fingerprint/journal infra fault -> server ref, no journal
- valid-looking raw UUID does not control ref before acceptance
- post-accept capacity/sim/serialize/partial/complete fault -> request:<validatedId>
- accepted saved failure exact replay
- journal ambiguity never treated as fresh accepted


journal lookup != running acceptance:
- valid DTO/fingerprint後のexisting record lookupだけではrequestを予約しない
- no record + lock/revision/lifecycle/resource existence pass後にrunning acceptance
- UPDATE_IN_PROGRESS/STALE/lifecycle/NOT_FOUND -> no new journal/requestId reservation
- source/store corruption after running acceptance -> request:<validatedId> + completed 500 when response can be finalized


global requestId namespace/lifetime:
- same requestId across start->step/reset/mock/replay different endpoint -> REQUEST_ID_CONFLICT
- same endpoint but different expectedUiRevision/input -> REQUEST_ID_CONFLICT
- same fingerprint -> running/saved response semantics only
- per-endpoint journal maps must fail
- running/completed record eviction before session/process end must fail
- reset/ready-start/revision progress does not evict old completed record
- saved replay lookup does not revalidate current resource/latest/world

security/strict DTO before existing journal lookup:
- completed requestId text + bad Origin/CSRF/session -> security error, no saved response/conflict lookup
- completed requestId text + malformed/unknown/wrong-type body -> 400 INVALID_REQUEST, no saved response/conflict lookup
- only strict-valid canonical DTO proceeds to completed/running/conflict match

saved response equality:
- same fingerprint replay -> original HTTP status + response body bytes exact
- body内 uiRevision/isUpdating/refreshRequired exact
- non-deterministic transport header exact equality is NOT required
- stable API response-header contract remains required
- do not persist Date/connection/runtime-generated header merely for idempotency

cross-session namespace:
- same requestId in session A and session B -> independent journal records
- no cross-session REQUEST_ID_CONFLICT/replay
- process-global shared requestId Map must fail

### TX-078 GET failure commitState always none

- every GET failure: commitState none, committedWeeks/completedUiRevision absent
- INTERNAL_ERROR refreshRequired=false
- GET /session pre-store fault none
- successful new session registration is not simulation mutation commit
- error counter/read snapshot/cache/cursor validation do not change commitState


### TX-079 start/reset state-scope matrix

start success from empty:
- new world/run-init/initial validation
- latest=null
- revision +1
- journal retains prior failed-start records
- lastOperation=start

reset success:
- ready->ready
- world reinitialized from saved RunInitializationSnapshot 0.2.0 (including saved initialWeeklyTrainingSidecarSnapshot payload)
- no current runtime/context sidecar authority
- RunInitializationSnapshot canonical value exact unchanged
- validation store = reset initialization results only
- latest=null
- revision +1, never zero
- session/csrf/cursor secret unchanged
- request journal retained
- lastOperation=reset

step success:
- latest/replay snapshot retained unchanged

reset none failure:
- old world/validation/latest/revision exact retained

reset transport failure after successful atomic commit:
- reset success state/revision/journal/lastOperation already committed
- no 500 response / no rollback
- same request replays saved 200


- validationOccurrence restarts at 1 from initialization result order

### TX-080 reset old cursor / journal behavior

after reset:
- old people/candidate/events cursor -> 409 STALE_CURSOR
- old validation cursor -> 409 STALE_CURSOR
- old authenticated mock-log cursor + latest null -> 409 STALE_CURSOR
- GET latest/log without cursor -> 404
- cursor secret unchanged across reset
- tampered/bad-HMAC cursor remains 400

old journal:
- pre-reset completed request same requestId/fingerprint -> original HTTP status + body bytes exact saved response。non-deterministic transport header exact一致は要求しない
- no world/latest/validation/lastOperation/revision mutation
- new requestId with same operation body -> evaluate current world normally


### TX-081 UiReadSnapshot 0.2.0 completeness

shape:
- exact7 keys
- includes immutable runInitializationSnapshot
- empty all null correlations + revision0/latest null
- ready world/run-init/validation/lastOp nonnull and identities match

updating reset:
- operationStart snapshot captures old world/run-init/validation/mock/revision together
- reset commits reinitialized world while RunInitializationSnapshot value remains canonical exact
- updating GET still sees operation-start full generation
- completion後GET sees reset world/same run-init value/new validation/latest/revision
- no old world + new runInitializationSnapshot mixing

negative:
- omit runInitializationSnapshot
- read current session runInitializationSnapshot while updateControl exists
- rebuild run identity from preset registry/defaults
- mutate source object after snapshot and observe changed snapshot
-> FAIL


### TX-082 process cursor security keys

startup happy:
- cursorHmacKey >=32 bytes
- sessionBindingKey >=32 bytes
- generated independently
- listener binds only after both valid

purpose:
- cursor signature changes with cursorHmacKey
- sessionBindingHash changes with sessionBindingKey
- swapping/reusing one key for both -> FAIL
- session/CSRF generation never consumes these providers

lifetime:
- start/reset/step/mock/replay do not rotate keys
- new UiSession does not rotate keys
- process restart uses new keys and old cursor/session binding becomes invalid

failure:
- either key CSPRNG/length failure -> startup failure, listener/session unavailable
- no fixed/time/Math.random fallback

restart cross-API precedence:
- old cookie + non-bootstrap GET + old cursor -> 401 SESSION_REQUIRED, cursor HMAC calls0
- old cookie + GET /session -> new empty session/cookie
- new empty session + syntactically valid old cursor on world GET -> 409 SIMULATION_NOT_STARTED before cursor auth
- new started session + old-process cursor -> 400 INVALID_REQUEST due HMAC/auth failure, not STALE_CURSOR
- same textual old requestId in new session has no old conflict/replay

### TX-083 start empty/ready lifecycle

empty start:
- empty -> ready
- new world/new RunInitializationSnapshot/new initial validation
- latest=null
- revision 0->1
- session/process secrets/journal preserved

ready start:
- ready -> ready
- new accepted preset/seed input builds new world
- new RunInitializationSnapshot != old source object; canonical value follows new start input
- validation store contains new run initialization results only
- old latest/replay cleared
- revision accepted+1, never reset to 0
- sessionId/CSRF/process cursor keys/journal unchanged
- lastOperation=start on HTTP200

contrast reset:
- reset reuses saved RunInitializationSnapshot canonical value exact
- ready-start must not reuse old snapshot as reset input

failure:
- all application-level 4xx/422/500 -> commitState=none
- old run/snapshot/validation/latest/revision/lastOperation exact
- atomic startでpartial/complete ApiErrorを作らない
- successful atomic commit後のtransport failureはerror responseへ変換せず、new run + saved HTTP200を保持

updating:
- ready-start in progress GET sees old operationStartReadSnapshot full generation only


- validationOccurrence restarts at 1 from initialization result order

### TX-084 ready-start old cursor / journal

after ready-start:
- old people/candidates/events cursor -> 409 STALE_CURSOR
- old validation cursor -> 409 STALE_CURSOR
- old authenticated mock-log cursor + latest null -> 409 STALE_CURSOR
- GET latest/log without cursor -> 404
- old cursor remains HMAC-authentic; process keys unchanged

old journal:
- pre-start completed request same requestId/fingerprint -> original HTTP status + body bytes exact saved response。non-deterministic transport header exact一致は要求しない
- no rollback/current-state rewrite/revision increment
- new requestId + same body -> evaluated against current new run

identity:
- even if old/new simulation identity fixture is equal, uiRevision mismatch alone makes old cursor STALE


### TX-085 atomic mutation response boundary

for start/reset/new mock/replay independently:

precommit faults:
- success DTO builder fault
- success schema validation fault
- JSON serializer fault
- candidate next-session strict validation fault
-> 500 INTERNAL_ERROR none
-> no world/latest/revision/lastOperation success mutation
-> accepted failure journal may complete

success:
- prebuilt exact HTTP200 bytes + next state + uiRevision + completed success journal commit atomically
- lastOperation points to that success

transport fault after atomic commit:
- committed success state remains
- no ApiFailureEnvelope generated
- no commitState=complete
- same requestId/fingerprint returns saved original HTTP200 bytes

mock-specific:
- response.result and committed latest originate same immutable candidate latest
- no postcommit response mapping/readback dependency


### TX-086 isUpdating response construction semantics

no other operation:
- preaccept INVALID_REQUEST/STALE/lifecycle error -> isUpdating=false

other operation running:
- request rejected due UPDATE_IN_PROGRESS -> isUpdating=true
- uiRevision=operationStartReadSnapshot.uiRevision

accepted own operation:
- domain 422 built before unlock -> isUpdating=true
- mock pre_start 422 -> true
- capacity 500 none -> true
- atomic precommit 500 none -> true
- step 500 none -> true
- step 500 partial/complete -> true
- partial/complete uiRevision == completedUiRevision, not operationStart revision

success:
- POST HTTP200 -> isUpdating=false even though bytes are prebuilt while lock exists

journal replay:
- saved error with isUpdating=true replayed later while current updateControl=null -> still true exact
- saved success false remains false even if another operation currently running



cross-operation concurrency:
- operation A running + request B invalid Origin/CSRF/body -> security/strict error wins before UPDATE_IN_PROGRESS, but valid-session opStart revision/isUpdating=true metadata remains
- operation A running + different valid requestId -> UPDATE_IN_PROGRESS
- operation A running + same running requestId/fingerprint -> UPDATE_IN_PROGRESS from journal
- operation A running + same requestId/different fingerprint -> REQUEST_ID_CONFLICT
- completed same-fingerprint response replay while another operation is running -> saved bytes win before current lock and preserve original isUpdating value

client disconnect/reload:
- client AbortSignal/connection close after running acceptance does not cancel/rollback server operation
- GET /session reload during execution shows same activeOperation/updating
- same requestId resend while running -> UPDATE_IN_PROGRESS, execution count remains1
- same requestId after completion -> original status/body exact
- process crash before final journal boundary is distinct and resume not guaranteed

### TX-087 battle-log cursor result identity + uiRevision

creation:
- dataIdentity == `mock-result:<latest.resultUiRevision>`
- payload.uiRevision == fixed UiReadSnapshot.uiRevision
- payload direct `resultUiRevision` key absent

normal step:
- latest record exact unchanged
- session uiRevision advances
- pre-step battle-log cursor -> 409 STALE_CURSOR due payload.uiRevision mismatch
- cursorless latest/log still reads same retained result and can issue fresh cursor

updating step:
- operationStartReadSnapshot latest/resultUiRevision/uiRevision fixed
- cursor minted before update and matching operationStart snapshot remains valid during update GET
- internal new week commits do not affect that GET
- after update completion same cursor -> STALE

new mock/replay:
- result identity and uiRevision both change -> old cursor STALE

reset/ready-start:
- latest=null + uiRevision changed
- authenticated old cursor -> STALE before resource 404
- cursorless latest/log -> 404

schema:
- adding payload.resultUiRevision direct field -> 400 strict schema / migration audit fail


### TX-088 Mock result/log wire boundary

MockBattleView:
- exact34
- no battleResult/detailedLog raw fields
- large actionLogs count does not change view key set

BattleLog page:
- exact4 wrapper includes resultUiRevision
- resultUiRevision == latest record resultUiRevision
- top-level envelope uiRevision == fixed read snapshot uiRevision

after normal step:
- latest retained
- envelope uiRevision advances
- data.resultUiRevision stays old latest revision
- cursorless log request succeeds with exact4
- pre-step cursor is STALE per TX-087

negative:
- assume envelope.uiRevision == data.resultUiRevision -> FAIL
- drop resultUiRevision from log wrapper -> FAIL
- embed full BattleResult in MockBattleView -> FAIL


### TX-089 GET latest session/result revision separation

new mock/replay just committed:
- response.uiRevision == data.resultUiRevision
- sourceWorldUiRevision <= resultUiRevision

after normal step retaining latest:
- response.uiRevision advances
- data.resultUiRevision unchanged
- sourceWorldUiRevision unchanged
- source <= result < response is valid
- GET latest must remain 200

updating step:
- operationStartReadSnapshot has old envelope revision/latest result
- GET latest during update uses those exact old values
- current internally advanced UiSession revision not mixed

negative:
- validator requiring resultUiRevision==response.uiRevision always -> FAIL
- mapper overwriting resultUiRevision with current uiRevision -> FAIL
- mapper overwriting sourceWorldUiRevision after step -> FAIL


### TX-090 validationOccurrence lifecycle

start/reset:
- initialization results [] -> items=[], next=1
- [A] -> occurrence1,next2
- [A,B,C] -> occurrences1,2,3,next4
- ready-start/reset old store max=100でも new store starts at1
- reset same RunInitializationSnapshot identity value does not preserve occurrence counter

weekly:
- next=N + [] -> unchanged
- next=N + [A,B] -> N,N+1,next=N+2
- original result array order preserved

rollback/noncommit:
- failed draft tentatively producing K results -> store/next unchanged
- domain/pre-start response validation not stored and consumes no occurrence
- mock/replay never consumes
- capacity failure never consumes

multi-week:
- week1/2 committed, week3 fails -> only committed-week results stored
- failed week validation absent from store
- next is exactly after week2
- next later successful request continues without gap

reset cursor:
- old occurrence numbers can repeat after reset, but old cursor STALE by revision/binding


## 7. FIX追加

既存FIX-001～104を維持する。

| Fixture ID | 必須内容 |
|---|---|
| FIX-021 | post-start execution abort。start相当処理後dependency failure |
| FIX-022 | normal serializer failureからminimal fallback INTERNAL_ERROR |
| FIX-023 | corrupt MockBattleSessionStore.latest / replaySnapshot |
| FIX-024 | DetailedLog `{turnOrderLogs, actionLogs}`。両配列countが異なる正常fixture |
| FIX-025 | `requestedAction != resolvedAction`かつ`replacementReason != null` |
| FIX-026 | child/trainee/living active/deceased active/living retired/deceased retired rank variants |
| FIX-027 | familyId / lineageId / temporaryCondition / parent/master relationship variants |
| FIX-028 | current TechniqueDefinition全field + sparse PersonTechniqueState |
| FIX-029 | EventEnvelope.entities.personIds filter。payloadに別PersonId文字列を含むnegative caseも含む |
| FIX-030 | WorldDate.absoluteWeek 0/1/47/48/479/480 + year boundary |
| FIX-031 | current HMAC keyで正しく署名された旧CursorPayload 0.1.0。schema binding mismatch専用 |
| FIX-032 | TrainingHistory正常7行動fixture + action_selected欠落/重複・event順序tamper |
| FIX-033 | MockBattleReplaySnapshot 0.2.0 / MockBattleLatestRecord 0.2.0 valid hash + one-field tamper |
| FIX-034 | generic ValidationResult success/failure。failureはpath/message必須、actual/expectedあり/なし双方 |
| FIX-035 | canonical simulation state同一だがsessionId/requestId/uiRevision/durationMs等が異なる2 UI session |
| FIX-036 | mock replayでBattleResult/eventCandidates同一、resultUiRevision/latestRecordHashだけ異なる正常record pair |
| FIX-037 | 同一run identityで2 committed snapshots + start後にpreset registry sourceだけ変更したfixture |
| FIX-038 | partial failure committedWeeks=0/1/N。failed-week draftがlast committed stateと異なるfixture |
| FIX-039 | failedWeek public validation collectionにgeneric success/failure混在。CommittedValidationViewStore非変更fixture |
| FIX-040 | mock candidate eligibility: trainee 7/8/15/16、active 15/16/41/42、life/participation/career/injury境界 |
| FIX-041 | accepted mock POSTで構文validだが正規pre-start participant validation failure |
| FIX-042 | endReason=unable_to_continue、双方unableToContinue=true、judgeScore non-null |
| FIX-043 | seeded final tie-break。summary decisiveCriterion/seededRngRollとfinalRngStateを含む正常BattleResult |
| FIX-044 | completed/failed MockBattleView 0.2.0 exact field-source fixture |
| FIX-045 | eventCandidate/replaySnapshot/current-worldだけをBattleResultと矛盾させたsource-conflict tamper |
| FIX-046 | statHistory no-growth/current-week/W47/W48/>48weekの正規surface chain |
| FIX-047 | statHistory before-after chain/final-current/negative-delta tamper |
| FIX-048 | pre-start World RNG/MatchId checkpoint + original mock後にcanonical worldを進行させたreplay fixture |
| FIX-049 | `[battle.started,battle.finished]` exact pair + reverse/extra/missing/cross-reference tamper |
| FIX-050 | active/inactive/deceased Sprint1PersonState + missing state/focus catalog/duplicate technique tamper |
| FIX-051 | training.* + technique learning/mastery混在event stream + group変更old cursor fixture |
| FIX-052 | GET collision: no-session/malformed/empty/missing/stale/corrupt/updating snapshot combinations |
| FIX-053 | old page label expectations vs 0.2.0 Person/Technique/Mock direct-field presentation |
| FIX-054 | TechniqueDefinition exact31 + missing one key + extra one key + upstream-key-drift simulation |
| FIX-055 | ApiError.validation single/multiple/zero/single-object/issue-flatten invalid forms |
| FIX-056 | paging 0/exact-limit/limit+1/multi-page/filter totalCount fixtures |
| FIX-057 | fieldErrors: body/query/path各code、RFC6901 escape、複数stable order、fieldless malformed JSON/body-limit |
| FIX-058 | CanonicalGetQuery 5 variants、default omitted/explicit pair、old validation code query/cursor、raw cursor exclusion |
| FIX-059 | qualifiedMaster: child/trainee/active false、retired true/false、living/deceased、missing/type/career tamper |
| FIX-060 | mock candidate eligibility boundaries + valid ineligible + source corruption + same-person pair + provider failure |
| FIX-061 | PersonList exact16 / PersonDetail exact25 + missing/extra/undefined/old-field injection + same-revision pair |
| FIX-062 | CSPRNG startup failure / errorCounter 1,2,3 / serialization gap / MAX_SAFE_INTEGER-1→fatal exhaustion |
| FIX-063 | MockMutation exact5 + MockView exact34 completed/failed/replay + revision/candidate-source/old-field tamper |
| FIX-064 | temporaryCondition 0/100/±20 boundaries + decimal/out-of-range + currentMental spirit0/50/100 + mixed-generation |
| FIX-065 | SimulationMutation exact14 start/reset/step1/stepN/partial0/partialN + every cross-field tamper |
| FIX-066 | TechniqueView exact9 + progress 0/cap/cap+1 + mastery 0/10000/10001 + acquired null/non-null + catalog mismatch |
| FIX-067 | TechniqueDefinition all fixed enum/range boundaries + actionTraits 5 + canonical arrays + identity/literal drift |
| FIX-068 | committed EventEnvelope11 + failed draft + mock candidates + invalid event/payload/sequence tamper |
| FIX-069 | Validation success/failure multi-issue + raw actual/expected + reorder/dedupe/path-message mismatch tamper |
| FIX-070 | People/Candidates/Events/Validation exact3 + BattleLog exact4 resultUiRevision + extra-wrapper-field injection + presets no-cursor shape |
| FIX-071 | success/failure envelope all optional presence combinations + commitState/errorReference/revision tamper |
| FIX-072 | DB-001..022 complete/missing/duplicate/unresolved/new-unregistered/semantic-misclassification register fixtures |
| FIX-073 | five dataIdentity valid cursors + signed wrong prefix/kind/endpoint + old simulation/revision/query/schema cases |
| FIX-074 | StableErrorCode exact-set add/remove/rename + training action four target correlations + forcedReason known/unknown union |
| FIX-075 | deferred body reference missing ID / wrong ID / DB-022 / multi-subject missing second ID |
| FIX-076 | MIG36 clean production tree + judgeDecision/overallRank/code-query/api0.1/usageConditions alias injection cases |
| FIX-077 | living currentAge exact/mismatch + update old/new generation + deceased age null/death fields + three-view consistency |
| FIX-078 | parent 0/1/2 + master 0/1/multiple + status metadata + broken ref/duplicate/cycle + qualifiedMaster cross-ref |
| FIX-079 | bad-HMAC payloads claiming old/current/unknown schema + valid-HMAC old/current/incompatible/stale variants |
| FIX-080 | same participant + A/B ordered pair + swapped pair + changed candidate sort + replay swapped result/event tamper |
| FIX-081 | two identical new mocks separated only by latest/uiRevision + old cursor/journal + third after canonical step |
| FIX-082 | MockBattleView exact34 valid + injected raw battleResult/detailedLog + old judgeDecision/failure.message negative cases |
| FIX-083 | catalog A/B/C + held B/C reordered + duplicate B + focus valid/dangling/catalog mismatch + acquired/learning count |
| FIX-084 | prior HTTP200 success + atomic precommit failures + step INTERNAL none/partial/complete + atomic transport-success replay |
| FIX-085 | session ID attempt1/2/3 collision patterns + retry exhaustion + CSRF fault + existing-session no-rotation + transport fault |
| FIX-086 | uiRevision MAX/MAX-1/MAX-N across start/reset/step/mock/replay + stale/malformed precedence + zero-execution proof |
| FIX-087 | each operation with fault before/after commit + step K=0/1/N-1/N + HTTP200 domain partial K=0 contrast |
| FIX-088 | one week with DB-011 training events + foreign processor technique/stat events + sourceProcessor tamper/duplicate/no-anchor |
| FIX-089 | same-seed canonical resultのsimulationId/eventId deterministic-ID-only tamper + sequence/payload/MatchId tamper + authorized nondeterministic metadata-only difference + UI authority rule-set drift |
| FIX-090 | original mock + advanced world/current-ineligible person + exact replay + start/reset clear + stale expected revision + saved journal |
| FIX-091 | malformed/valid-looking raw request IDs + pre-accept parser/fingerprint/journal faults + post-accept capacity/sim/serialize faults |
| FIX-092 | every GET failure category + session-create pre-store + server ref counter + stale cursor/resource/internal variants |
| FIX-093 | empty start + ready reset + existing latest/validation/journal/session secrets + reset precommit fault/transport-after-success + step latest retention |
| FIX-094 | reset-old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal replay + new-request contrast |
| FIX-095 | UiReadSnapshot exact7 old/new reset generations + missing run-init + current-run-init mixed read + post-snapshot source mutation |
| FIX-096 | process cursorHmac/binding key independent generation + purpose swap/reuse + startup failure + reset/new-session no-rotation |
| FIX-097 | empty start + ready start different preset/seed + old snapshot/latest/validation/journal + start precommit fault/transport-after-success + updating GET |
| FIX-098 | ready-start old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal exact replay + new requestId contrast |
| FIX-099 | atomic start/reset/new-mock/replay success bytes prevalidation + serializer fault before commit + transport fault after commit + same-request saved-200 replay |
| FIX-100 | isUpdating: no-lock preaccept error + UPDATE_IN_PROGRESS + accepted domain422/capacity500/step partial-complete + POST success + later saved-response replay |
| FIX-101 | battle-log cursor before normal step + retained latest/new uiRevision + updating operationStart snapshot + fresh cursor + new mock/reset clear |
| FIX-102 | large MockBattle detailedLog + exact34 latest view + exact4 log wrapper + normal step causing envelope uiRevision > resultUiRevision + raw-result injection |
| FIX-103 | mock latest immediately after commit + same latest after 1/N normal steps + updating operationStart snapshot + forced revision-equality mapper negative |
| FIX-104 | ValidationStore init0/1/3 + weekly0/2 + tentative rollback + multi-week partial failed validation + reset old max100 -> new occurrence1 + old cursor |

正規fixtureを先に生成し、tamper fixtureは1箇所改ざんを原則とする。

## 8. GATE/BRIDGE/TX/FIX完了範囲更新

UI-000完了条件のcurrent rangeを次へ更新する。

```text
GATE-001～015
BRIDGE-001～119
API-001～015
TX-001～090
PAGE-001～014
DET-001～007
FIX-001～104
Sprint 1.5受入条件1～174
```

旧current表記（歴史記録）:
- GATE-001～014
- BRIDGE-001～119
- TX-001～090
- FIX-001～104
- 受入条件1～169以前

を完了判定として残してはならない。歴史記録であることが明示された箇所だけ保持可。

## 9. STOP条件追加

既存STOP条件に次を追加する。

- DEFERRED_BINDINGとSPEC_UNDEFINEDの未分類
- post-start execution abortの意味論不一致
- normal/fallback serializerが同じ壊れうる経路
- errorReferenceがsimulation RNG/時刻単独依存
- Person DTOにUI独自overallRank/affiliation合成
- formal masterの単数推測
- TechniqueDefinitionのJsonValue再合成
- historical instructorの現師匠後付け
- event person filterのpayload探索
- DetailedLogを単一array扱い
- requested/resolved action混同
- corrupt internal mock recordを404/422/200劣化
- elapsedWeeksのUI独自算出
- upstream schemaVersion driftのadapter吸収
- S1.5-SPEC-0.1.14でapiSchemaVersion 0.1.0/0.2.0を混在させること
- TrainingHistoryをaction_selected以外から推測・部分補完すること
- MockBattle latest/replayの完全性をhash fieldなしで「hash検証済み」と扱うこと
- generic ValidationResultへcode/sourceProcessor/canContinueをUI独自追加すること
- 決定性比較でwire DTO全文・表示文字列・hashだけを正本比較にすること
- DET-005でresultUiRevision/latestRecordHash等のadapter metadataをcanonical battle比較へ含めること
- WorldSummaryViewをpreset registry・failed draft・複数commit世代から合成すること
- failedWeek.validationをCommittedValidationViewStoreやsynthetic codeから再構成すること
- mock候補endpointへineligible reason/eligible flagを合成し不適格人物を混在させること
- judgeScoreの有無をendReason=judge_decisionだけから推測すること
- finalRngStateをbattleSeed/finalState/PersonIdからUI側で再生成すること
- MockBattle failureをvalidation.violations/battle.finished/Error.messageから合成すること
- MockBattle battleSeed/sourceSnapshotHashをevent candidate/current Worldからfallback取得すること
- statHistoryのinitial/last48/lastWeekをEvent chain以外から推測すること
- ability surface mutatorを未分類のままUI-001へ進むこと
- replay checkpointをbattle実行後stateから採取・replay成功ごとに取り直すこと
- mock eventCandidatesを正規2件以外で保存・sort/dedupeすること
- Person.sprint1State欠落をGET時に初期値で補完すること
- Person technique listへcatalogだけに存在するzero-state技を合成すること
- eventGroup=trainingを手作業allow-listへ変え、training. prefix正規則と不一致にすること
- eventGroup=technique_learningへtechnique.mastery_increasedを含めること
- GET複合error条件で§5A（0.1.13正本のcursor-before-resource順を含む）と異なる優先順位をendpointごとに実装すること
- 旧ページ文言を理由にaffiliationLabels/overallRank/singular mentor/ineligible reason DTOを再導入すること
- TechniqueDefinitionViewの31 keyを同じapiSchemaVersionで増減・aliasすること
- ApiError.validationをsingle object/issue array/null/empty arrayで返すこと
- pageable totalCountをcursor以降件数または現page件数として返すこと
- fieldErrors.fieldを自由文字列/表示labelで返すこと
- fieldErrors.codeへ未定義文字列を追加すること
- field特定不能INVALID_REQUESTへfieldErrors=[]/nullを付けること
- CanonicalGetQueryへraw cursorを含めること
- ValidationQuery 0.2.0からkind/sortKey/sortOrderを省略すること
- old validation `code` query/cursorをstatusへ暗黙migrationすること
- qualifiedMasterをrank/formal-master関係/eventからUI側で再計算・補正すること
- canonical Person/technique/currentMental破損をmock候補外として静かに除外すること
- mock candidate GETのmembershipへparticipantA!=participantB等pair-level条件を混ぜること
- PersonList/Detail完全型にないfieldを旧0.1.13記述から復活させること
- ready正常PersonDetailでstatHistory=null/trainingHistory.available=falseを返すこと
- serverInstanceId CSPRNG失敗時にlistenerを起動し別sourceでerrorReferenceを代用すること
- errorCounterをwrap/reuse/reseedすること
- MockBattleMutation responseをcommit前local BattleResultから直接構築しlatest readbackを省略すること
- MockBattleViewへ旧judgeDecision/failure.messageを0.2.0で再導入すること
- temporaryConditionをclamp/default/roundしてinvalid canonical stateを隠すこと
- currentMentalをspiritから再生成して保存値を置換すること
- Person/temporaryCondition/sprint1Stateを異なるread generationから混ぜること
- SimulationMutationViewをoperation/outcome相関違反のまま補正して返すこと
- partial failure週のdraft event/effect/validationをcommit件数やsummaryへ含めること
- TechniqueViewをPersonTechniqueState structural validationだけで生成しcatalog semantic capを省略すること
- learnedStateをprogress/mastery/eventから推測しacquiredAbsoluteWeek null相関とずらすこと
- TechniqueDefinitionの既知enum/range/actionTraitsをstring/number自由値へ緩和すること
- TechniqueDefinition canonical arrayをUI都合で再sort/dedupeすること
- Event一覧itemをEventEnvelopeから縮約してimportance/origin/entities/payload等を失うこと
- Event一覧へfailed draft/mock eventCandidatesを混入すること
- invalid canonical eventだけ除外して200を返すこと
- ValidationResult convenience issuesをsort/dedupe/filterしてraw resultとindex対応を壊すこと
- Validation list item/dataへ未定義fieldを追加すること
- People/Candidates/Events/Validationのpageable wrapperへendpoint独自fieldを追加しexact3 shapeを壊すこと
- BattleLog wrapperから正本`resultUiRevision`を削除すること、またはmatchId/sourceWorldUiRevision/dataIdentity/currentUiRevision等の未定義fieldを追加すること
- success/failure envelopeのexact key setを混在させること
- ApiError optional fieldをnull/undefinedでmaterializeすること
- commitState/errorReference/revisionのpresence相関を補正なしで破ること
- DEFERRED_BINDING台帳外の未確定を即席bindingで吸収すること
- DB registryのsubjectを別意味へ流用・重複・欠落させること
- MIG-001～036旧contractをproductionへdeprecated alias/compatibility layerとして残すこと
- Person ageをendpointごとに別計算し保存currentAgeと正規年齢cross-checkを分離すること
- deceased age/ageAtDeathをcurrent world/birthYearからUI側で新規推測すること
- 署名済みcursorのwrong dataIdentity prefix/query.kindをSTALE_CURSORへ誤分類すること
- current-compatible cursorのold simulationId/resultUiRevision/queryをINVALID_REQUESTへ誤分類すること
- StableErrorCodeのexact unionをDB台帳外で暗黙変更・aliasすること
- TrainingHistory target null相関をpayload validator未確認のまま補完すること
- forcedReasonをUI側で自由文章として生成すること


- UI-000でfuture endpoint/test/fixtureを未実装のまま`implemented`/PASSと偽記すること
- UI-000完了条件へUI-001以降でしか作れないactual test path/feature implementationを要求すること
- API-001～015をowner task以外で先行実装すること
- UI-001でlive UiSession/sessionId/CSRF storeを完成させUI-002責務を先食いすること
- UI-002でIsolatedMockBattleRunnerを先行実装すること
- UI-005がhistory実装のためAPI-009 Event route/DTO/UIを先行実装すること
- UI-006開始時に`isolatedRunnerDecision`が未確定のままfacade要否を実装判断すること
- `dependency_blocker` / `environment_blocker`がopenのまま次taskへ進むこと
- task-specific Cursor instructionが欠落・manifestと不一致のまま開始すること
- task開始前static spec audit failureを無視すること

## 9A. UI-000完了判定 0.2.5 override

UI-000 PASSで必須:

- GATE-001～015 pass
- DB-001～022 actual binding matched、unresolved=0
- SPEC_UNDEFINED=0、open STOP=0
- API-001～015 owner/success-error/source/test plan全件確定
- BRIDGE-001～119はactual upstream binding必要箇所を証拠化し、future behaviorはowner/test plan付き`ready_to_implement`
- TX-001～090、PAGE-001～014、FIX-001～104はowner/test/fixture recipe確定
- DET-001～007はowner=UI-009かつDB-018/020必要binding/test plan確定
- MIG-001～036は§2Bのreadiness条件を満たす
- `UI-010-TRACEABILITY-PLAN`が受入条件1～174をexact174 rowでowner/test/fixtureへ割当
- static spec audit exit 0

UI-000 PASSで要求しない:

- future endpoint/page implementation
- future TX/PAGE/DET runtime PASS
- FIX全fixture file materialize/use
- MIG new implementation evidence
- UI-010 actual future test path/commit hash

owner task受入で`implemented`へ進め、UI-010で全implemented/未使用fixture0/actual evidence blank0を要求する。

future implementationをUI-000 PASS条件へ戻したらdependency inversionとしてspec_fix_required。

---

## 10. UI-000完了記録更新

完了記録のSprint 1.5 spec versionを:

```text
S1.5-SPEC-0.1.14
```

へ更新する。

追加記録:

```text
SPEC_UNDEFINED count: {{0であること}}
DEFERRED_BINDING resolved count: {{non-negative integer}}
DEFERRED_BINDING unresolved count: {{0であること}}
Execution-abort binding: {{symbol/module/test}}
Fallback serializer test: {{test}}
Upstream version binding report: {{report}}
Readiness manifest: {{path/hash}}
Implementation plan: S1_5_IMPLEMENTATION_PLAN_0.1.0.md {{hash}}
Static spec audit: {{command/report}}
TRACEABILITY-PLAN row count: {{174}}
MIG ready_to_implement count: {{36}}
Future implemented-at-UI000 count: {{0}}
Task implementability audit: S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md {{hash}}
Task-specific Cursor instructions: {{10 files / hashes}}
isolatedRunnerDecision: {{not_required | implement_in_UI_006}}
isolatedRunnerContract: {{n/a | exact symbol/type/module/test plan}}
dependency_blocker count: {{0}}
environment_blocker count: {{0}}
```

UI-000 PASS時:
- SPEC_UNDEFINED=0
- unresolved DEFERRED_BINDING=0
- open STOP=0
- readinessStatus未確定=0
- API owner未確定=0
- TRACEABILITY-PLAN=174 row
- static spec audit PASS
- task implementability verdict UI-001～010 = READY_AFTER_PREDECESSOR_GATE
- task-specific Cursor instruction 10 files present/hash verified
- isolatedRunnerDecision resolved
- dependency_blocker=0 / environment_blocker=0
- future implementationをimplementedと偽記した件数=0
でなければならない。


## 10A. UI task / endpoint owner manifest

| Task | predecessor | owned API IDs |
|---|---|---|
| UI-000 | Sprint1 + CAL-JAN-SYNC | none |
| UI-001 | UI-000 | none |
| UI-002 | UI-001 | API-001, API-002 |
| UI-003 | UI-002 | API-003～006 |
| UI-004 | UI-003 | API-007, API-011 |
| UI-005 | UI-004 | API-008 |
| UI-006 | UI-005 | API-012～014 |
| UI-007 | UI-006 | API-015 |
| UI-008 | UI-007 | API-009, API-010 |
| UI-009 | UI-008 | none |
| UI-010 | UI-009 | none |

API-001～015 production owner count=exact1。future endpointをnon-owner taskで先行実装しない。

## 10B. task start preflight

production edit前にpredecessor accepted、static audit PASS、open STOP=0、SPEC_UNDEFINED=0、own contract/fixture plan exact、required DB binding evidenceを確認。不成立ならproduction codeへ触れずSTOP。

---

## 8A. PAGE-007 common totalCount / nextCursor

| ID | endpoints | totalCount | nextCursor | BattleLog exception | test | 判定 |
|---|---|---|---|---|---|---|
| PAGE-007 | people/candidates/events/validation/battle-log | filter後・page slice前の全一致件数 | exclusive next position、終端null | wrapperは§10FどおりBattleLogだけ`resultUiRevision`を加えexact4 | `{{test}}` | `{{判定}}` |

cursor以降件数/現page件数をtotalCountとして返さない。BattleLogのresultUiRevisionはendpoint固有の正規fieldであり削除しない。

## 8B. PAGE-008 CanonicalGetQuery 0.2.0

| ID | 対象 | canonical query | cursor除外 | 旧validation query | test | 判定 |
|---|---|---|---|---|---|---|
| PAGE-008 | 全cursor対応GET | §10Dの5種exact union。filter null、fixed sort、effective limitを全部materialize | raw cursorは絶対に含めない | `code` raw query=400、old signed cursor=409 | `{{test}}` | `{{判定}}` |

PAGE-006の「cursor以外をparse・default適用したCanonicalGetQuery全文」を0.2.0ではPAGE-008のexact unionとして解釈する。



## 8C. PAGE-009 cursor dataIdentity matrix

| ID | endpoint | dataIdentity | incompatible signed cursor | stale valid cursor | test | 判定 |
|---|---|---|---|---|---|---|
| PAGE-009 | people/candidates/events/validation/battle-log | §10G exact matrix | wrong endpoint/query.kind/prefix or noncanonical suffix -> 400 | current-compatible shapeのold identity/revision/query -> 409 | `{{test}}` | `{{判定}}` |

PAGE-006/008のquery bindingと同時に満たす。



## 8D. PAGE-010 cursor authentication precedence

| ID | raw/decode | HMAC | semantic classification | result | test | 判定 |
|---|---|---|---|---|---|---|
| PAGE-010 | framing + segment lexical | payload segment ASCIIへconstant-time HMAC | valid signature後にpayload decode/canonical JSON/current-old判定 | bad HMAC=400、valid old=409、valid currentはbindingへ | `{{test}}` | `{{判定}}` |


## 8E. DET-007 repeated new mock

同一canonical world、同一ordered A/B、同一rules/config/catalog/action sourceでnew mockを2回実行する。

必須exact:

```text
MockBattleDeterminismProjection
battleResult.matchId
battleResult.finalState.battleSeed
battleResult.finalRngState
eventCandidates
```

差分許可:

```text
accepted/completed/source/result uiRevision
requestId
request journal
durationMs
replaySnapshotHash
latestRecordHash
```

uiRevision等adapter metadataをbattle input/RNG/hashへ混入した場合はFAIL。


## 8F. PAGE-011 reset cursor invalidation

| ID | reset前cursor | reset後binding | resource state | expected |
|---|---|---|---|---|
| PAGE-011A | people/candidates/events | old uiRevision（simulationId同値でも可） | reset後world exists | 409 STALE_CURSOR |
| PAGE-011B | validation | old uiRevision（validation:simulationId同値でも可） | reset validation store | 409 STALE_CURSOR |
| PAGE-011C | mock latest log | old resultUiRevision | latest=null | 409 STALE_CURSOR |
| PAGE-011D | no cursor | n/a | latest=null | 404 NOT_FOUND |

resetでcursor secretをrotateせず、old valid cursorをHMAC invalid 400へ変えない。


## 8G. PAGE-012 ready-start cursor invalidation

| ID | ready-start前cursor | start後binding/resource | expected |
|---|---|---|---|
| PAGE-012A | people/candidates/events | old uiRevision、new run | 409 STALE_CURSOR |
| PAGE-012B | validation | old uiRevision/store identity | 409 STALE_CURSOR |
| PAGE-012C | mock latest log | old result identity、latest=null | 409 STALE_CURSOR |
| PAGE-012D | no cursor | latest=null | 404 NOT_FOUND |

ready-startでprocess cursor HMAC/binding keysをrotateしない。


## 8H. PAGE-013 battle-log cursor lifetime

| ID | latest | session/read uiRevision | old log cursor | expected |
|---|---|---|---|---|
| PAGE-013A | unchanged by step | advanced | pre-step result identity same / uiRevision old | 409 STALE_CURSOR |
| PAGE-013B | operationStart snapshot old latest | operationStart old revision | pre-update matching cursor | valid for that updating GET |
| PAGE-013C | replaced by new mock/replay | advanced | old result identity + old revision | 409 STALE_CURSOR |
| PAGE-013D | cleared by reset/ready-start | advanced | authenticated old cursor | 409 STALE_CURSOR before 404 |
| PAGE-013E | unchanged | current | no cursor / fresh cursor | normal page |

CursorPayloadへdirect `resultUiRevision` fieldを追加しない。


## 8I. PAGE-014 BattleLog response identity

| ID | top-level envelope uiRevision | data.resultUiRevision | latest | expected |
|---|---|---|---|---|
| PAGE-014A | R | R | newly committed mock result R | equal |
| PAGE-014B | R+N | R | retained through normal step | may differ; valid |
| PAGE-014C | R2 | R2 | replaced by new mock/replay | equal to new latest |
| PAGE-014D | any ready revision | n/a | latest=null | 404 without cursor |

BattleLog dataはexact4。`resultUiRevision`を削除しない。


## 20. Long-run Historical architecture non-regression

Source: `S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md` (`HIST-001～106`).

Current UI-001～010はarchive subsystemそのものを実装しないが、次を新たに固定したらspec/code review FAIL。

```text
deceased hard-delete
PersonId reuse
normal weekly loop over every historical Person
normal weekly full historical validation
UiReadSnapshot archive-all deep clone
WorldSummary personCount archive-all payload scan requirement
immutable Historical Person payloadを唯一正本とするmutable childIds/spouseIds
historical corruption -> always whole page/tree 500
missing/corrupted ancestry -> not_related
lossy historical mini-person conversion
all-or-nothing historical storage blob as sole truth
normal load full historical payload/index scan requirement
stale index -> weekly all-history scan fallback
traversal budget exhausted -> not_related
in-place historical repair visible to open readers
policy-expired detailed record -> corrupted/missing
Historical control-plane corruption -> archive empty
normal PersonId allocation -> all-archive ID scan or ID reuse
cached-valid survives content identity change
retention-pruned Event/Result ID/sequence reuse
old Historical generation early reclaim / permanent leak
Historical cursor generation mixing across pages
unchanged Current->Historical reference weekly re-resolution/full-validation
rule-irrelevant Historical payload corruption poisons kinship result
unknown placeholders collapse distinct PersonIds
checkpoint/history generation silent mixing
durable-save referenced generation early reclaim
old-save allocator rollback causes identity reuse
unsupported schema classified as corruption
history-dependent write succeeds without required history record
repair silently rewrites committed gameplay
self-reported checksum inside unchecked fragment treated as trust anchor
stale/unbound relationship index proves not_related
post-death same-week training/state/event/RNG
ended relationship hard-delete/history loss
death transition lifetime-history full materialization
all historical payload RAM-resident requirement
weekly wholesale clone/validation of Historical relationship/Event/Result prefixes
weekly archive-wide hash/canonicalization flatten/full-hash
physical storage layout/cache state changes gameplay determinism
historical semantic/catalog IDs silently reinterpreted using latest catalog
checkpoint published before referenced historical state is durable
live save survives after required durable pin is released
retained branch/fork root omitted from historical GC roots
stale/degraded UI cache used as rule/ID-allocation authority
full audit implicitly mutates/repairs canonical history
relationship temporal lifecycle/current-history view collapsed
partial-read placeholder changes stable historical paging identity/order
unbounded Historical decode from corrupt length/count/compression
duplicate logical identity last-write-wins
semantic dependency early-GC/latest fallback
stale maintenance generation publish/lost update
checkpoint Current/Historical mixed commit boundary
unpublished orphan segment treated as logical history
```

Current 0.2.0 strict PersonDetail/TX-064/FI-039/040はarchive activation前のcurrent/active source testであり、将来Historical partial-read APIの意味論正本ではない。

Future scenario source: `S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md` (`HSC-001～062`).

Long-run implementation taskでは最低:

```text
HIST-001..106 semantic audit
active vs historical partition
death transition atomicity
adjacency index consistency
kinship tri-state
partial-read corruption fixtures
independently framed identity/heavy sections
directory historical+missing vs absent distinction
normal-load bounded manifest validation
stale-index no-full-scan fallback
traversal-budget cannot_determine
maintenance generation/read isolation
death-transition crash recovery
append cursor without prefix scan
retention-expiry classification
bounded corruption blast radius
control-plane degraded mode
allocator integrity/no archive scan
cached-valid bitrot invalidation
retention tombstone/identity continuity
generation reclamation after live-reader release
historical paging/tree generation binding
validated unchanged Current->Historical reference evidence
rule-specific evidence minimality
placeholder stable identity/topology
resumable checkpoint historical-generation binding
durable save generation pin/reclaim
old-save restore/fork identity safety
unsupported-schema classification
history-dependent write atomic fail-closed
repair non-retroactivity
integrity trust-chain anchoring
relationship-index canonical-generation binding
post-death same-week exclusion
relationship lifecycle history preservation
bounded death archive materialization
bounded/evictable Historical payload residency
historical weekly scan/clone/revalidation counters for Person + supporting prefixes
```

を別途受入する。

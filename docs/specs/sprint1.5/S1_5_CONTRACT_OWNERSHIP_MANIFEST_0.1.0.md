# Sprint 1.5 Contract Ownership Manifest

- Document ID: `S1.5-CONTRACT-OWNERSHIP`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Purpose: UI-000実行時にcontract ownerを新規判断させず、各taskの受入範囲を事前固定する。

## 1. Rules

- `ownerTask`は当該contractの**最終実装/実行証跡を完成させるtask**。
- UI-000 ownerは実装ではなくstatic/readiness audit contract。
- 同じcontractを複数task ownerへしない。前段taskのunit testは補助証跡として追加可。
- owner変更は実装判断で行わずSprint 1.5仕様/本manifestを版上げする。
- strict linear acceptance orderのためowner task開始時には前taskが全てaccepted済み。

## 1A. ownerTask semantics

`ownerTask` = final acceptance evidence owner。exclusive production code ownerではない。

cross-cutting contractを前段API taskが必要とする場合、前段taskは自分のscopeだけ正本どおり実装/testし`consumerEvidence`を残す。ownerTaskは後で全scopeをaggregateして`implemented`へ閉じる。

API route ownershipだけは`S1_5_IMPLEMENTATION_PLAN_0.1.0.md`のexact-one mapがexclusive。

---

## 2. TX ownership (001-090)

| Contract ID | ownerTask | subject | UI-000 status |
|---|---|---|---|
| TX-001 | UI-003 | start成功 | ready_to_implement |
| TX-002 | UI-003 | start commit前失敗 | ready_to_implement |
| TX-003 | UI-003 | 1週domain validation失敗 | ready_to_implement |
| TX-004 | UI-003 | 複数週第1週domain failure | ready_to_implement |
| TX-005 | UI-003 | step第1週unexpected failure | ready_to_implement |
| TX-006 | UI-003 | 複数週途中domain failure | ready_to_implement |
| TX-007 | UI-003 | 複数週途中unexpected failure | ready_to_implement |
| TX-008 | UI-003 | 全週commit後response failure | ready_to_implement |
| TX-009 | UI-003 | reset成功 | ready_to_implement |
| TX-010 | UI-006 | new mock成功/resolution_error | ready_to_implement |
| TX-011 | UI-006 | replay成功 | ready_to_implement |
| TX-012 | UI-006 | mock/replay accepted precommit failure | ready_to_implement |
| TX-013 | UI-006 | postcommit transport disconnect | ready_to_implement |
| TX-014 | UI-003 | updating GET | ready_to_implement |
| TX-015 | UI-003 | start/reset後old requestId replay | ready_to_implement |
| TX-016 | UI-003 | pre-accept rejection | ready_to_implement |
| TX-017 | UI-006 | Mock battle / replay post-start execution abort | ready_to_implement |
| TX-018 | UI-006 | normal serializer failure -> minimal fallback | ready_to_implement |
| TX-019 | UI-006 | fallback 500 exact request replay | ready_to_implement |
| TX-020 | UI-006 | corrupt mock latest / replay | ready_to_implement |
| TX-021 | UI-007 | Battle log cursor / actionLogs revision | ready_to_implement |
| TX-022 | UI-003 | errorReference / fallback GET | ready_to_implement |
| TX-023 | UI-004 | apiSchemaVersion / old cursor migration | ready_to_implement |
| TX-024 | UI-005 | TrainingHistory aggregation | ready_to_implement |
| TX-025 | UI-006 | MockBattle latest integrity hash | ready_to_implement |
| TX-026 | UI-008 | ValidationResult generic view / status filter | ready_to_implement |
| TX-027 | UI-003 | WorldSummary source / commit generation | ready_to_implement |
| TX-028 | UI-003 | failedWeek validation noncommit collection | ready_to_implement |
| TX-029 | UI-006 | Mock candidate / accepted pre-start eligibility | ready_to_implement |
| TX-030 | UI-006 | MockBattle judge / finalRngState | ready_to_implement |
| TX-031 | UI-006 | MockBattleView exact source precedence | ready_to_implement |
| TX-032 | UI-005 | Person statHistory exact chain | ready_to_implement |
| TX-033 | UI-006 | Mock replay checkpoint exact capture | ready_to_implement |
| TX-034 | UI-006 | Mock eventCandidates exact pair | ready_to_implement |
| TX-035 | UI-005 | Person Sprint1PersonState direct view | ready_to_implement |
| TX-036 | UI-008 | Event eventGroup exact semantics | ready_to_implement |
| TX-037 | UI-008 | GET error precedence collision matrix | ready_to_implement |
| TX-038 | UI-008 | 0.2.0 page presentation override | ready_to_implement |
| TX-039 | UI-005 | TechniqueDefinition exact 31-key wire | ready_to_implement |
| TX-040 | UI-006 | ApiError.validation exact array | ready_to_implement |
| TX-041 | UI-008 | pageable totalCount / nextCursor | ready_to_implement |
| TX-042 | UI-008 | INVALID_REQUEST fieldErrors exact contract | ready_to_implement |
| TX-043 | UI-008 | CanonicalGetQuery 0.2.0 | ready_to_implement |
| TX-044 | UI-005 | PersonDetail qualifiedMaster | ready_to_implement |
| TX-045 | UI-004 | Mock candidate exact predicate / corruption distinction | ready_to_implement |
| TX-046 | UI-005 | PersonList/Detail 0.2.0 complete DTO | ready_to_implement |
| TX-047 | UI-003 | server errorReference allocator lifecycle | ready_to_implement |
| TX-048 | UI-006 | MockBattleMutation/View complete invariants | ready_to_implement |
| TX-049 | UI-005 | Person temporaryCondition / currentMental boundaries | ready_to_implement |
| TX-050 | UI-003 | SimulationMutationView complete invariants | ready_to_implement |
| TX-051 | UI-005 | TechniqueView exact state semantics | ready_to_implement |
| TX-052 | UI-005 | TechniqueDefinition exact value contracts | ready_to_implement |
| TX-053 | UI-008 | EventList canonical EventEnvelope | ready_to_implement |
| TX-054 | UI-008 | Validation list complete DTO | ready_to_implement |
| TX-055 | UI-008 | pageable success data exact shapes | ready_to_implement |
| TX-056 | UI-008 | API envelope complete types | ready_to_implement |
| TX-057 | UI-000 | DEFERRED_BINDING register completeness | ready_to_implement |
| TX-058 | UI-008 | cursor dataIdentity compatibility vs stale | ready_to_implement |
| TX-059 | UI-002 | StableErrorCode exact binding | ready_to_implement |
| TX-060 | UI-005 | TrainingHistory anchor target/forced binding | ready_to_implement |
| TX-061 | UI-000 | DEFERRED_BINDING body-reference coverage | ready_to_implement |
| TX-062 | UI-000 | migration override audit | ready_to_implement |
| TX-063 | UI-005 | Person age source consistency | ready_to_implement |
| TX-064 | UI-005 | relationship all-record observation | ready_to_implement |
| TX-065 | UI-002 | cursor HMAC-before-schema classification | ready_to_implement |
| TX-066 | UI-006 | Mock participant A/B order | ready_to_implement |
| TX-067 | UI-006 | repeated new mock unchanged-world determinism | ready_to_implement |
| TX-068 | UI-006 | MockBattleView exact34 / raw BattleResult prohibition | ready_to_implement |
| TX-069 | UI-005 | Person techniques order / focus | ready_to_implement |
| TX-070 | UI-006 | lastOperation across failures | ready_to_implement |
| TX-071 | UI-002 | UiSession CSPRNG failure / atomic registration | ready_to_implement |
| TX-072 | UI-006 | uiRevision capacity preflight | ready_to_implement |
| TX-073 | UI-006 | commitState / committedWeeks matrix | ready_to_implement |
| TX-074 | UI-005 | TrainingHistory sourceProcessor isolation | ready_to_implement |
| TX-075 | UI-009 | deterministic normalization exact reuse | ready_to_implement |
| TX-076 | UI-006 | replay after current world advances | ready_to_implement |
| TX-077 | UI-006 | POST errorReference acceptance boundary | ready_to_implement |
| TX-078 | UI-008 | GET failure commitState always none | ready_to_implement |
| TX-079 | UI-003 | start/reset state-scope matrix | ready_to_implement |
| TX-080 | UI-008 | reset old cursor / journal behavior | ready_to_implement |
| TX-081 | UI-003 | UiReadSnapshot 0.2.0 completeness | ready_to_implement |
| TX-082 | UI-002 | process cursor security keys | ready_to_implement |
| TX-083 | UI-003 | start empty/ready lifecycle | ready_to_implement |
| TX-084 | UI-008 | ready-start old cursor / journal | ready_to_implement |
| TX-085 | UI-006 | atomic mutation response boundary | ready_to_implement |
| TX-086 | UI-006 | isUpdating response construction semantics | ready_to_implement |
| TX-087 | UI-007 | battle-log cursor result identity + uiRevision | ready_to_implement |
| TX-088 | UI-007 | Mock result/log wire boundary | ready_to_implement |
| TX-089 | UI-006 | GET latest session/result revision separation | ready_to_implement |
| TX-090 | UI-003 | validationOccurrence lifecycle | ready_to_implement |

## 3. PAGE ownership (001-014)

| Contract ID | ownerTask | subject | UI-000 status |
|---|---|---|---|
| PAGE-001 | UI-004 | people cursor/sort/filter | ready_to_implement |
| PAGE-002 | UI-004 | mock candidates cursor | ready_to_implement |
| PAGE-003 | UI-008 | events sequence cursor | ready_to_implement |
| PAGE-004 | UI-008 | validation occurrence cursor | ready_to_implement |
| PAGE-005 | UI-007 | battle log sourceIndex cursor | ready_to_implement |
| PAGE-006 | UI-008 | canonical query default equivalence | ready_to_implement |
| PAGE-007 | UI-008 | common totalCount/nextCursor | ready_to_implement |
| PAGE-008 | UI-008 | CanonicalGetQuery exact union | ready_to_implement |
| PAGE-009 | UI-008 | dataIdentity compatibility/stale | ready_to_implement |
| PAGE-010 | UI-002 | cursor HMAC/auth precedence | ready_to_implement |
| PAGE-011 | UI-008 | reset cursor invalidation | ready_to_implement |
| PAGE-012 | UI-008 | ready-start cursor invalidation | ready_to_implement |
| PAGE-013 | UI-007 | battle-log cursor lifetime | ready_to_implement |
| PAGE-014 | UI-007 | BattleLog response identity | ready_to_implement |

## 4. DET ownership (001-007)

| Contract ID | ownerTask | subject | UI-000 status |
|---|---|---|---|
| DET-001 | UI-009 | UI 1週×N vs N週 | ready_to_implement |
| DET-002 | UI-009 | UI vs CLI | ready_to_implement |
| DET-003 | UI-009 | same seed independent sessions | ready_to_implement |
| DET-004 | UI-009 | boundary seeds | ready_to_implement |
| DET-005 | UI-009 | mock replay | ready_to_implement |
| DET-006 | UI-009 | mock before/after world unchanged | ready_to_implement |
| DET-007 | UI-009 | repeated new mock unchanged world | ready_to_implement |

## 5. MIG ownership (001-036)

| Contract ID | ownerTask | old-contract subject | UI-000 status |
|---|---|---|---|
| MIG-001 | UI-002 | API apiSchemaVersion="0.1.0" | ready_to_implement |
| MIG-002 | UI-002 | CursorPayload 0.1.0 | ready_to_implement |
| MIG-003 | UI-005 | Person affiliationLabels | ready_to_implement |
| MIG-004 | UI-005 | Person overallRank | ready_to_implement |
| MIG-005 | UI-005 | PersonDetail singular mentorPersonId | ready_to_implement |
| MIG-006 | UI-005 | TrainingHistory instructorPersonId | ready_to_implement |
| MIG-007 | UI-005 | Technique usageConditions JsonValue | ready_to_implement |
| MIG-008 | UI-005 | Technique hitParameters JsonValue | ready_to_implement |
| MIG-009 | UI-005 | Technique consumptionAndUseLimit JsonValue | ready_to_implement |
| MIG-010 | UI-007 | Battle log sourceをdetailedLog.length相当で扱う余地 | ready_to_implement |
| MIG-011 | UI-007 | BattleLog actionKind | ready_to_implement |
| MIG-012 | UI-007 | BattleLog rngDisplay | ready_to_implement |
| MIG-013 | UI-007 | BattleLog reasonText | ready_to_implement |
| MIG-014 | UI-008 | Validation query code | ready_to_implement |
| MIG-015 | UI-008 | Validation共通表示のerror code/sourceProcessor/canContinue | ready_to_implement |
| MIG-016 | UI-008 | Event person filterをeventType/payload pathで決める余地 | ready_to_implement |
| MIG-017 | UI-008 | EVENT-PERSON-MAPをfilter rule表として使用 | ready_to_implement |
| MIG-018 | UI-004 | Mock candidateで参加不可reasonを表示する余地 | ready_to_implement |
| MIG-019 | UI-006 | Mock judgeDecision:boolean | ready_to_implement |
| MIG-020 | UI-006 | Mock failure {code,message} | ready_to_implement |
| MIG-021 | UI-006 | Mock final RNGをfinalState等から推測する余地 | ready_to_implement |
| MIG-022 | UI-005 | PersonDetail statHistory:nullを正常fallbackにできる余地 | ready_to_implement |
| MIG-023 | UI-005 | trainingHistory.available=falseで履歴source不足を隠す余地 | ready_to_implement |
| MIG-024 | UI-006 | Validation error.validation形の曖昧さ | ready_to_implement |
| MIG-025 | UI-008 | fieldErrors.field/code自由string | ready_to_implement |
| MIG-026 | UI-008 | page totalCountのcursor後件数解釈余地 | ready_to_implement |
| MIG-027 | UI-008 | CanonicalGetQueryの旧validation code member | ready_to_implement |
| MIG-028 | UI-006 | Mock replay checkpoint取得時点の曖昧さ | ready_to_implement |
| MIG-029 | UI-006 | Mock eventCandidates件数/orderの曖昧さ | ready_to_implement |
| MIG-030 | UI-006 | MockBattleView旧field群を差分合成 | ready_to_implement |
| MIG-031 | UI-005 | PersonList/PersonDetailを旧型+差分で再合成 | ready_to_implement |
| MIG-032 | UI-003 | SimulationMutationViewを旧型+差分で再合成 | ready_to_implement |
| MIG-033 | UI-008 | page wrapper fieldの曖昧さ | ready_to_implement |
| MIG-034 | UI-008 | Event一覧を縮約DTOにできる余地 | ready_to_implement |
| MIG-035 | UI-002 | API envelopeを旧0.1.0 shapeのまま一部拡張 | ready_to_implement |
| MIG-036 | UI-002 | UiReadSnapshot 0.1.0がRunInitializationSnapshotを保持しない | ready_to_implement |

## 6. FIX ownership (001-104)

| Contract ID | ownerTask | fixture subject | UI-000 status |
|---|---|---|---|
| FIX-001 | UI-009 | seed=0 | ready_to_implement |
| FIX-002 | UI-009 | seed=4294967295 | ready_to_implement |
| FIX-003 | UI-004 | population/person filter 0/1/2 | ready_to_implement |
| FIX-004 | UI-004 | mock candidates 0/1/2+ | ready_to_implement |
| FIX-005 | UI-003 | 1/4/48/480 weeks | ready_to_implement |
| FIX-006 | UI-003 | year-boundary transaction/overflow | ready_to_implement |
| FIX-007 | UI-008 | list sizes 0/50/51/200/201/5000 | ready_to_implement |
| FIX-008 | UI-007 | battle log 0/100/101/200/201 | ready_to_implement |
| FIX-009 | UI-003 | precommit DTO failure | ready_to_implement |
| FIX-010 | UI-003 | step none/partial/complete failure | ready_to_implement |
| FIX-011 | UI-006 | postcommit transport disconnect | ready_to_implement |
| FIX-012 | UI-003 | year-start manifest mixed statuses | ready_to_implement |
| FIX-013 | UI-003 | year-start receipt/provenance integrity | ready_to_implement |
| FIX-014 | UI-003 | calendar/manifest/schema identity mismatch | ready_to_implement |
| FIX-015 | UI-008 | paging omitted vs explicit defaults | ready_to_implement |
| FIX-016 | UI-006 | replay after world advance | ready_to_implement |
| FIX-017 | UI-003 | year-start processor/age-career boundaries | ready_to_implement |
| FIX-018 | UI-005 | living/deceased lists/detail/filter | ready_to_implement |
| FIX-019 | UI-003 | reset after preset/source change | ready_to_implement |
| FIX-020 | UI-008 | unseen event/validation filters | ready_to_implement |
| FIX-021 | UI-006 | post-start execution abort。start相当処理後dependency failure | ready_to_implement |
| FIX-022 | UI-006 | normal serializer failureからminimal fallback INTERNAL_ERROR | ready_to_implement |
| FIX-023 | UI-006 | corrupt MockBattleSessionStore.latest / replaySnapshot | ready_to_implement |
| FIX-024 | UI-007 | DetailedLog `{turnOrderLogs, actionLogs}`。両配列countが異なる正常fixture | ready_to_implement |
| FIX-025 | UI-007 | `requestedAction != resolvedAction`かつ`replacementReason != null` | ready_to_implement |
| FIX-026 | UI-005 | child/trainee/living active/deceased active/living retired/deceased retired rank variants | ready_to_implement |
| FIX-027 | UI-005 | familyId / lineageId / temporaryCondition / parent/master relationship variants | ready_to_implement |
| FIX-028 | UI-005 | current TechniqueDefinition全field + sparse PersonTechniqueState | ready_to_implement |
| FIX-029 | UI-008 | EventEnvelope.entities.personIds filter。payloadに別PersonId文字列を含むnegative caseも含む | ready_to_implement |
| FIX-030 | UI-003 | WorldDate.absoluteWeek 0/1/47/48/479/480 + year boundary | ready_to_implement |
| FIX-031 | UI-002 | current HMAC keyで正しく署名された旧CursorPayload 0.1.0。schema binding mismatch専用 | ready_to_implement |
| FIX-032 | UI-005 | TrainingHistory正常7行動fixture + action_selected欠落/重複・event順序tamper | ready_to_implement |
| FIX-033 | UI-006 | MockBattleReplaySnapshot 0.2.0 / MockBattleLatestRecord 0.2.0 valid hash + one-field tamper | ready_to_implement |
| FIX-034 | UI-008 | generic ValidationResult success/failure。failureはpath/message必須、actual/expectedあり/なし双方 | ready_to_implement |
| FIX-035 | UI-009 | canonical simulation state同一だがsessionId/requestId/uiRevision/durationMs等が異なる2 UI session | ready_to_implement |
| FIX-036 | UI-006 | mock replayでBattleResult/eventCandidates同一、resultUiRevision/latestRecordHashだけ異なる正常record pair | ready_to_implement |
| FIX-037 | UI-003 | 同一run identityで2 committed snapshots + start後にpreset registry sourceだけ変更したfixture | ready_to_implement |
| FIX-038 | UI-003 | partial failure committedWeeks=0/1/N。failed-week draftがlast committed stateと異なるfixture | ready_to_implement |
| FIX-039 | UI-003 | failedWeek public validation collectionにgeneric success/failure混在。CommittedValidationViewStore非変更fixture | ready_to_implement |
| FIX-040 | UI-004 | mock candidate eligibility: trainee 7/8/15/16、active 15/16/41/42、life/participation/career/injury境界 | ready_to_implement |
| FIX-041 | UI-006 | accepted mock POSTで構文validだが正規pre-start participant validation failure | ready_to_implement |
| FIX-042 | UI-006 | endReason=unable_to_continue、双方unableToContinue=true、judgeScore non-null | ready_to_implement |
| FIX-043 | UI-006 | seeded final tie-break。summary decisiveCriterion/seededRngRollとfinalRngStateを含む正常BattleResult | ready_to_implement |
| FIX-044 | UI-006 | completed/failed MockBattleView 0.2.0 exact field-source fixture | ready_to_implement |
| FIX-045 | UI-006 | eventCandidate/replaySnapshot/current-worldだけをBattleResultと矛盾させたsource-conflict tamper | ready_to_implement |
| FIX-046 | UI-005 | statHistory no-growth/current-week/W47/W48/>48weekの正規surface chain | ready_to_implement |
| FIX-047 | UI-005 | statHistory before-after chain/final-current/negative-delta tamper | ready_to_implement |
| FIX-048 | UI-006 | pre-start World RNG/MatchId checkpoint + original mock後にcanonical worldを進行させたreplay fixture | ready_to_implement |
| FIX-049 | UI-006 | `[battle.started,battle.finished]` exact pair + reverse/extra/missing/cross-reference tamper | ready_to_implement |
| FIX-050 | UI-005 | active/inactive/deceased Sprint1PersonState + missing state/focus catalog/duplicate technique tamper | ready_to_implement |
| FIX-051 | UI-008 | training.* + technique learning/mastery混在event stream + group変更old cursor fixture | ready_to_implement |
| FIX-052 | UI-008 | GET collision: no-session/malformed/empty/missing/stale/corrupt/updating snapshot combinations | ready_to_implement |
| FIX-053 | UI-008 | old page label expectations vs 0.2.0 Person/Technique/Mock direct-field presentation | ready_to_implement |
| FIX-054 | UI-005 | TechniqueDefinition exact31 + missing one key + extra one key + upstream-key-drift simulation | ready_to_implement |
| FIX-055 | UI-006 | ApiError.validation single/multiple/zero/single-object/issue-flatten invalid forms | ready_to_implement |
| FIX-056 | UI-008 | paging 0/exact-limit/limit+1/multi-page/filter totalCount fixtures | ready_to_implement |
| FIX-057 | UI-008 | fieldErrors: body/query/path各code、RFC6901 escape、複数stable order、fieldless malformed JSON/body-limit | ready_to_implement |
| FIX-058 | UI-008 | CanonicalGetQuery 5 variants、default omitted/explicit pair、old validation code query/cursor、raw cursor exclusion | ready_to_implement |
| FIX-059 | UI-005 | qualifiedMaster: child/trainee/active false、retired true/false、living/deceased、missing/type/career tamper | ready_to_implement |
| FIX-060 | UI-006 | mock candidate eligibility boundaries + valid ineligible + source corruption + same-person pair + provider failure | ready_to_implement |
| FIX-061 | UI-005 | PersonList exact16 / PersonDetail exact25 + missing/extra/undefined/old-field injection + same-revision pair | ready_to_implement |
| FIX-062 | UI-003 | CSPRNG startup failure / errorCounter 1,2,3 / serialization gap / MAX_SAFE_INTEGER-1→fatal exhaustion | ready_to_implement |
| FIX-063 | UI-006 | MockMutation exact5 + MockView exact34 completed/failed/replay + revision/candidate-source/old-field tamper | ready_to_implement |
| FIX-064 | UI-005 | temporaryCondition 0/100/±20 boundaries + decimal/out-of-range + currentMental spirit0/50/100 + mixed-generation | ready_to_implement |
| FIX-065 | UI-003 | SimulationMutation exact14 start/reset/step1/stepN/partial0/partialN + every cross-field tamper | ready_to_implement |
| FIX-066 | UI-005 | TechniqueView exact9 + progress 0/cap/cap+1 + mastery 0/10000/10001 + acquired null/non-null + catalog mismatch | ready_to_implement |
| FIX-067 | UI-005 | TechniqueDefinition all fixed enum/range boundaries + actionTraits 5 + canonical arrays + identity/literal drift | ready_to_implement |
| FIX-068 | UI-008 | committed EventEnvelope11 + failed draft + mock candidates + invalid event/payload/sequence tamper | ready_to_implement |
| FIX-069 | UI-008 | Validation success/failure multi-issue + raw actual/expected + reorder/dedupe/path-message mismatch tamper | ready_to_implement |
| FIX-070 | UI-008 | People/Candidates/Events/Validation exact3 + BattleLog exact4 resultUiRevision + extra-wrapper-field injection + presets no-cursor shape | ready_to_implement |
| FIX-071 | UI-008 | success/failure envelope all optional presence combinations + commitState/errorReference/revision tamper | ready_to_implement |
| FIX-072 | UI-000 | DB-001..022 complete/missing/duplicate/unresolved/new-unregistered/semantic-misclassification register fixtures | ready_to_implement |
| FIX-073 | UI-008 | five dataIdentity valid cursors + signed wrong prefix/kind/endpoint + old simulation/revision/query/schema cases | ready_to_implement |
| FIX-074 | UI-005 | StableErrorCode exact-set add/remove/rename + training action four target correlations + forcedReason known/unknown union | ready_to_implement |
| FIX-075 | UI-000 | deferred body reference missing ID / wrong ID / DB-022 / multi-subject missing second ID | ready_to_implement |
| FIX-076 | UI-000 | MIG36 clean production tree + judgeDecision/overallRank/code-query/api0.1/usageConditions alias injection cases | ready_to_implement |
| FIX-077 | UI-005 | living currentAge exact/mismatch + update old/new generation + deceased age null/death fields + three-view consistency | ready_to_implement |
| FIX-078 | UI-005 | parent 0/1/2 + master 0/1/multiple + status metadata + broken ref/duplicate/cycle + qualifiedMaster cross-ref | ready_to_implement |
| FIX-079 | UI-002 | bad-HMAC payloads claiming old/current/unknown schema + valid-HMAC old/current/incompatible/stale variants | ready_to_implement |
| FIX-080 | UI-006 | same participant + A/B ordered pair + swapped pair + changed candidate sort + replay swapped result/event tamper | ready_to_implement |
| FIX-081 | UI-006 | two identical new mocks separated only by latest/uiRevision + old cursor/journal + third after canonical step | ready_to_implement |
| FIX-082 | UI-006 | MockBattleView exact34 valid + injected raw battleResult/detailedLog + old judgeDecision/failure.message negative cases | ready_to_implement |
| FIX-083 | UI-005 | catalog A/B/C + held B/C reordered + duplicate B + focus valid/dangling/catalog mismatch + acquired/learning count | ready_to_implement |
| FIX-084 | UI-006 | prior HTTP200 success + atomic precommit failures + step INTERNAL none/partial/complete + atomic transport-success replay | ready_to_implement |
| FIX-085 | UI-002 | session ID attempt1/2/3 collision patterns + retry exhaustion + CSRF fault + existing-session no-rotation + transport fault | ready_to_implement |
| FIX-086 | UI-006 | uiRevision MAX/MAX-1/MAX-N across start/reset/step/mock/replay + stale/malformed precedence + zero-execution proof | ready_to_implement |
| FIX-087 | UI-006 | each operation with fault before/after commit + step K=0/1/N-1/N + HTTP200 domain partial K=0 contrast | ready_to_implement |
| FIX-088 | UI-005 | one week with DB-011 training events + foreign processor technique/stat events + sourceProcessor tamper/duplicate/no-anchor | ready_to_implement |
| FIX-089 | UI-009 | same-seed canonical resultのsimulationId/eventId deterministic-ID-only tamper + sequence/payload/MatchId tamper + authorized nondeterministic metadata-only difference + UI authority rule-set drift | ready_to_implement |
| FIX-090 | UI-006 | original mock + advanced world/current-ineligible person + exact replay + start/reset clear + stale expected revision + saved journal | ready_to_implement |
| FIX-091 | UI-006 | malformed/valid-looking raw request IDs + pre-accept parser/fingerprint/journal faults + post-accept capacity/sim/serialize faults | ready_to_implement |
| FIX-092 | UI-008 | every GET failure category + session-create pre-store + server ref counter + stale cursor/resource/internal variants | ready_to_implement |
| FIX-093 | UI-006 | empty start + ready reset + existing latest/validation/journal/session secrets + reset precommit fault/transport-after-success + step latest retention | ready_to_implement |
| FIX-094 | UI-008 | reset-old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal replay + new-request contrast | ready_to_implement |
| FIX-095 | UI-003 | UiReadSnapshot exact7 old/new reset generations + missing run-init + current-run-init mixed read + post-snapshot source mutation | ready_to_implement |
| FIX-096 | UI-002 | process cursorHmac/binding key independent generation + purpose swap/reuse + startup failure + reset/new-session no-rotation | ready_to_implement |
| FIX-097 | UI-006 | empty start + ready start different preset/seed + old snapshot/latest/validation/journal + start precommit fault/transport-after-success + updating GET | ready_to_implement |
| FIX-098 | UI-008 | ready-start old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal exact replay + new requestId contrast | ready_to_implement |
| FIX-099 | UI-006 | atomic start/reset/new-mock/replay success bytes prevalidation + serializer fault before commit + transport fault after commit + same-request saved-200 replay | ready_to_implement |
| FIX-100 | UI-006 | isUpdating: no-lock preaccept error + UPDATE_IN_PROGRESS + accepted domain422/capacity500/step partial-complete + POST success + later saved-response replay | ready_to_implement |
| FIX-101 | UI-007 | battle-log cursor before normal step + retained latest/new uiRevision + updating operationStart snapshot + fresh cursor + new mock/reset clear | ready_to_implement |
| FIX-102 | UI-007 | large MockBattle detailedLog + exact34 latest view + exact4 log wrapper + normal step causing envelope uiRevision > resultUiRevision + raw-result injection | ready_to_implement |
| FIX-103 | UI-006 | mock latest immediately after commit + same latest after 1/N normal steps + updating operationStart snapshot + forced revision-equality mapper negative | ready_to_implement |
| FIX-104 | UI-003 | ValidationStore init0/1/3 + weekly0/2 + tentative rollback + multi-week partial failed validation + reset old max100 -> new occurrence1 + old cursor | ready_to_implement |

## 7. Owner task exit rule

owner task受入時、自taskの全rowを:

```text
ready_to_implement -> implemented
actualTestPath != blank
actualCommand != blank
evidence != blank
```

へ更新する。

UI-010ではTX/PAGE/DET/MIG/FIXの全rowが`implemented`であることを確認する。

## 8. BRIDGE ownership (001-119)

| Contract ID | ownerTask | subject | UI-000 status |
|---|---|---|---|
| BRIDGE-001 | UI-003 | start API | ready_to_implement |
| BRIDGE-002 | UI-002 | preset registry | ready_to_implement |
| BRIDGE-003 | UI-003 | SimulationIdentity | ready_to_implement |
| BRIDGE-004 | UI-003 | RunRuleSnapshot | ready_to_implement |
| BRIDGE-005 | UI-003 | WorldState read | ready_to_implement |
| BRIDGE-006 | UI-003 | one-week progression | ready_to_implement |
| BRIDGE-007 | UI-003 | multi-week progression | ready_to_implement |
| BRIDGE-008 | UI-006 | clone/snapshot | ready_to_implement |
| BRIDGE-009 | UI-006 | restore/reload | ready_to_implement |
| BRIDGE-010 | UI-003 | calendar | ready_to_implement |
| BRIDGE-011 | UI-003 | year-start outer transaction | ready_to_implement |
| BRIDGE-012 | UI-008 | EventEnvelope/year-start provenance | ready_to_implement |
| BRIDGE-013 | UI-008 | Event store/query | ready_to_implement |
| BRIDGE-014 | UI-008 | event person map | ready_to_implement |
| BRIDGE-015 | UI-008 | eventGroup | ready_to_implement |
| BRIDGE-016 | UI-008 | ValidationResult | ready_to_implement |
| BRIDGE-017 | UI-003 | CommittedValidationViewStore | ready_to_implement |
| BRIDGE-018 | UI-004 | battle eligibility | ready_to_implement |
| BRIDGE-019 | UI-006 | BattleState generation | ready_to_implement |
| BRIDGE-020 | UI-006 | battle run | ready_to_implement |
| BRIDGE-021 | UI-006 | run+commit facade | ready_to_implement |
| BRIDGE-022 | UI-006 | BattleResult | ready_to_implement |
| BRIDGE-023 | UI-007 | action log | ready_to_implement |
| BRIDGE-024 | UI-006 | MockBattle store/replay snapshot | ready_to_implement |
| BRIDGE-025 | UI-006 | canonical world unchanged | ready_to_implement |
| BRIDGE-026 | UI-006 | WorldState clone completeness | ready_to_implement |
| BRIDGE-027 | UI-006 | World RNG clone | ready_to_implement |
| BRIDGE-028 | UI-006 | MatchId generator clone | ready_to_implement |
| BRIDGE-029 | UI-006 | Event allocation/stream clone | ready_to_implement |
| BRIDGE-030 | UI-006 | ProcessorRuntimeState clone | ready_to_implement |
| BRIDGE-031 | UI-006 | same-week transaction state clone | ready_to_implement |
| BRIDGE-032 | UI-006 | SimulationIdentity/RunRuleSnapshot clone | ready_to_implement |
| BRIDGE-033 | UI-006 | calendar identity clone | ready_to_implement |
| BRIDGE-034 | UI-003 | year-start manifest | ready_to_implement |
| BRIDGE-035 | UI-003 | year-start runtime/receipt | ready_to_implement |
| BRIDGE-036 | UI-003 | CAL-SCHEMA-MAP | ready_to_implement |
| BRIDGE-037 | UI-002 | request journal/lastOperation | ready_to_implement |
| BRIDGE-038 | UI-003 | RunInitializationSnapshot 0.2.0 (+sidecar payload) | ready_to_implement |
| BRIDGE-039 | UI-002 | UiSessionState/UiReadSnapshot | ready_to_implement |
| BRIDGE-040 | UI-006 | 0.1.14 §2 / post-start battle execution abortの実class/symbol/module | ready_to_implement |
| BRIDGE-041 | UI-002 | 0.1.14 §3 / normal response serializerとminimal fallback serializer | ready_to_implement |
| BRIDGE-042 | UI-002 | 0.1.14 §4 / errorReference generator | ready_to_implement |
| BRIDGE-043 | UI-005 | 0.1.14 §6 / Person family/lineage/rank/stats/aptitudes/temporaryCondition source | ready_to_implement |
| BRIDGE-044 | UI-005 | 0.1.14 §7 / parent/master canonical relationship型・counterpart field | ready_to_implement |
| BRIDGE-045 | UI-005 | 0.1.14 §8 / TechniqueDefinition / PersonTechniqueState exact mapping | ready_to_implement |
| BRIDGE-046 | UI-007 | 0.1.14 §11 / BattleResult.detailedLog.actionLogs | ready_to_implement |
| BRIDGE-047 | UI-007 | 0.1.14 §12 / BattleActionLog -> BattleLogItemView 0.2.0 | ready_to_implement |
| BRIDGE-048 | UI-008 | 0.1.14 §10 / EventEnvelope.entities.personIds | ready_to_implement |
| BRIDGE-049 | UI-006 | 0.1.14 §13 / MockBattleSessionStore.latest / replaySnapshot validator | ready_to_implement |
| BRIDGE-050 | UI-000 | 0.1.14 §15 / upstream schemaVersion registry | ready_to_implement |
| BRIDGE-051 | UI-003 | 0.1.14 §14 / WorldDate.absoluteWeek -> WorldSummaryView.elapsedWeeks | ready_to_implement |
| BRIDGE-052 | UI-002 | 0.1.14 §1A / apiSchemaVersion / CursorPayload schema binding | ready_to_implement |
| BRIDGE-053 | UI-005 | 0.1.14 §9A / committed weekly-training EventEnvelope群 -> TrainingHistoryItemView | ready_to_implement |
| BRIDGE-054 | UI-006 | 0.1.14 §13A / MockBattleReplaySnapshot/LatestRecord hash | ready_to_implement |
| BRIDGE-055 | UI-008 | 0.1.14 §10A / generic ValidationResult -> ValidationResultViewItem / ValidationQuery | ready_to_implement |
| BRIDGE-056 | UI-009 | 0.1.14 §16A / UI-009 canonical comparison projection | ready_to_implement |
| BRIDGE-057 | UI-003 | 0.1.14 §6A / WorldSummaryView source map | ready_to_implement |
| BRIDGE-058 | UI-003 | 0.1.14 §6B / failedWeek.validation failure collection | ready_to_implement |
| BRIDGE-059 | UI-006 | 0.1.14 §7A / MockBattleCandidateView / POST eligibility | ready_to_implement |
| BRIDGE-060 | UI-006 | 0.1.14 §13B / MockBattleView judge/final RNG mapping | ready_to_implement |
| BRIDGE-061 | UI-006 | 0.1.14 §13C / MockBattleView 0.2.0全field source | ready_to_implement |
| BRIDGE-062 | UI-005 | 0.1.14 §6C / PersonDetail.statHistory / ABILITY-MUTATION-MAP | ready_to_implement |
| BRIDGE-063 | UI-006 | 0.1.14 §13D / MockBattle replay checkpoint capture | ready_to_implement |
| BRIDGE-064 | UI-006 | 0.1.14 §13D / Mock eventCandidates exact pair | ready_to_implement |
| BRIDGE-065 | UI-005 | 0.1.14 §6D / Person.sprint1State -> currentMental/focus/techniques/count | ready_to_implement |
| BRIDGE-066 | UI-008 | 0.1.14 §10B / Event eventGroup query | ready_to_implement |
| BRIDGE-067 | UI-008 | 0.1.14 §5A / GET error precedence | ready_to_implement |
| BRIDGE-068 | UI-010 | 0.1.14 §4A / page presentation override | ready_to_implement |
| BRIDGE-069 | UI-005 | 0.1.14 §8.3 / TechniqueDefinitionView exact key set | ready_to_implement |
| BRIDGE-070 | UI-008 | 0.1.14 §3A / ApiError.validation[] | ready_to_implement |
| BRIDGE-071 | UI-008 | 0.1.14 §3B / INVALID_REQUEST fieldErrors | ready_to_implement |
| BRIDGE-072 | UI-008 | 0.1.14 §10D / CanonicalGetQuery 0.2.0 exact union | ready_to_implement |
| BRIDGE-073 | UI-005 | 0.1.14 §6E / PersonDetail qualifiedMaster | ready_to_implement |
| BRIDGE-074 | UI-004 | 0.1.14 §7A.1 / Mock candidate exact eligibility | ready_to_implement |
| BRIDGE-075 | UI-005 | 0.1.14 §6F / Person wire DTO complete types | ready_to_implement |
| BRIDGE-076 | UI-002 | 0.1.14 §4.2 / server errorReference allocator | ready_to_implement |
| BRIDGE-077 | UI-006 | 0.1.14 §13E / MockBattleMutation/View final invariants | ready_to_implement |
| BRIDGE-078 | UI-005 | 0.1.14 §6G / temporaryCondition/currentMental ranges | ready_to_implement |
| BRIDGE-079 | UI-003 | 0.1.14 §6H / SimulationMutationView complete type | ready_to_implement |
| BRIDGE-080 | UI-005 | 0.1.14 §8.2 / TechniqueView state exact semantics | ready_to_implement |
| BRIDGE-081 | UI-005 | 0.1.14 §8A / TechniqueDefinition value contracts | ready_to_implement |
| BRIDGE-082 | UI-008 | 0.1.14 §10E / GET /events item/data DTO | ready_to_implement |
| BRIDGE-083 | UI-008 | 0.1.14 §10A.2 / Validation list complete DTO | ready_to_implement |
| BRIDGE-084 | UI-008 | 0.1.14 §10F / paged success data | ready_to_implement |
| BRIDGE-085 | UI-002 | 0.1.14 §3C / API envelope complete types | ready_to_implement |
| BRIDGE-086 | UI-000 | 0.1.14 §1C / DEFERRED_BINDING register | ready_to_implement |
| BRIDGE-087 | UI-008 | 0.1.14 §10G / cursor dataIdentity matrix | ready_to_implement |
| BRIDGE-088 | UI-002 | 0.1.14 §1C.6 / StableErrorCode binding | ready_to_implement |
| BRIDGE-089 | UI-005 | 0.1.14 §1C.7/§9A / training.action_selected payload binding | ready_to_implement |
| BRIDGE-090 | UI-000 | 0.1.14 §1C.8 / DEFERRED_BINDING body-reference coverage | ready_to_implement |
| BRIDGE-091 | UI-000 | 0.1.14 §0A / migration override index | ready_to_implement |
| BRIDGE-092 | UI-005 | 0.1.14 §6I / Person age source | ready_to_implement |
| BRIDGE-093 | UI-005 | 0.1.14 §7 / §1C.8 / relationship display / DB-022 | ready_to_implement |
| BRIDGE-094 | UI-002 | 0.1.14 §10G.4 / cursor authentication precedence | ready_to_implement |
| BRIDGE-095 | UI-006 | 0.1.14 §13F / Mock participant A/B order | ready_to_implement |
| BRIDGE-096 | UI-006 | 0.1.14 §13G/§16A / repeated new mock determinism | ready_to_implement |
| BRIDGE-097 | UI-007 | 0.1.14 §13C / MockBattleView raw-result prohibition | ready_to_implement |
| BRIDGE-098 | UI-005 | 0.1.14 §8B / Person techniques array/focus | ready_to_implement |
| BRIDGE-099 | UI-010 | 0.1.14 §3D / failure commitState / lastOperation | ready_to_implement |
| BRIDGE-100 | UI-002 | 0.1.14 §4A / UiSession CSPRNG lifecycle | ready_to_implement |
| BRIDGE-101 | UI-010 | 0.1.14 §3E / uiRevision capacity preflight | ready_to_implement |
| BRIDGE-102 | UI-010 | 0.1.14 §3F / commitState/committedWeeks matrix | ready_to_implement |
| BRIDGE-103 | UI-005 | 0.1.14 §9A.2A / DB-011 / TrainingHistory producer membership | ready_to_implement |
| BRIDGE-104 | UI-009 | 0.1.14 §16A / DB-018 / CLI/UI deterministic normalization | ready_to_implement |
| BRIDGE-105 | UI-006 | 0.1.14 §13H / DB-016 / replay saved-source isolation | ready_to_implement |
| BRIDGE-106 | UI-010 | 0.1.14 §4.1 / POST errorReference acceptance boundary | ready_to_implement |
| BRIDGE-107 | UI-010 | 0.1.14 §3F.1A / GET commitState | ready_to_implement |
| BRIDGE-108 | UI-003 | 0.1.14 §6J / start/reset state scope | ready_to_implement |
| BRIDGE-109 | UI-008 | 0.1.14 §6K / reset cursor/journal lifetime | ready_to_implement |
| BRIDGE-110 | UI-003 | 0.1.14 §5B / UiReadSnapshot 0.2.0 | ready_to_implement |
| BRIDGE-111 | UI-002 | 0.1.14 §4B / process cursor security keys | ready_to_implement |
| BRIDGE-112 | UI-003 | 0.1.14 §6J.2 / start empty/ready lifecycle | ready_to_implement |
| BRIDGE-113 | UI-008 | 0.1.14 §6L / ready-start cursor/journal | ready_to_implement |
| BRIDGE-114 | UI-010 | 0.1.14 §3F/§13E / atomic mutation response boundary | ready_to_implement |
| BRIDGE-115 | UI-010 | 0.1.14 §3C.5 / isUpdating final response semantics | ready_to_implement |
| BRIDGE-116 | UI-007 | 0.1.14 §10G.2 / battle-log cursor dual binding | ready_to_implement |
| BRIDGE-117 | UI-007 | 0.1.14 §10F/§13C / Mock result/log wire boundary | ready_to_implement |
| BRIDGE-118 | UI-006 | 0.1.14 §13C.1B / GET latest revision separation | ready_to_implement |
| BRIDGE-119 | UI-003 | 0.1.14 §6M / ValidationStore occurrence lifecycle | ready_to_implement |

UI-000ではBRIDGEのactual Sprint 1 physical bindingが必要な行を`matched`まで解決し、future UI behaviorのimplementation evidenceは上記owner taskで完成させる。

## 9. No reassignment fallback

実装時に「このcontractは別taskでないとtestできない」と判明した場合:

```text
ownerをその場で変更しない
-> STOP
-> dependency/owner contractを再監査
-> spec_fix_requiredなら仕様版上げ
```

future taskへ黙って持ち越さない。

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

| Contract ID | ownerTask | subject | UI-000 status | evidence |
|---|---|---|---|---|
| TX-001 | UI-003 | start成功 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-002 | UI-003 | start commit前失敗 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-003 | UI-003 | 1週domain validation失敗 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-004 | UI-003 | 複数週第1週domain failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-005 | UI-003 | step第1週unexpected failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-006 | UI-003 | 複数週途中domain failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-007 | UI-003 | 複数週途中unexpected failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-008 | UI-003 | 全週commit後response failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-009 | UI-003 | reset成功 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-010 | UI-006 | new mock成功/resolution_error | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-011 | UI-006 | replay成功 | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-012 | UI-006 | mock/replay accepted precommit failure | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-013 | UI-006 | postcommit transport disconnect | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-014 | UI-003 | updating GET | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-015 | UI-003 | start/reset後old requestId replay | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-016 | UI-003 | pre-accept rejection | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-017 | UI-006 | Mock battle / replay post-start execution abort | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-018 | UI-006 | normal serializer failure -> minimal fallback | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-019 | UI-006 | fallback 500 exact request replay | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-020 | UI-006 | corrupt mock latest / replay | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-021 | UI-007 | Battle log cursor / actionLogs revision | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-022 | UI-003 | errorReference / fallback GET | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-023 | UI-004 | apiSchemaVersion / old cursor migration | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-024 | UI-005 | TrainingHistory aggregation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-025 | UI-006 | MockBattle latest integrity hash | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-026 | UI-008 | ValidationResult generic view / status filter | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-027 | UI-003 | WorldSummary source / commit generation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-028 | UI-003 | failedWeek validation noncommit collection | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-029 | UI-006 | Mock candidate / accepted pre-start eligibility | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-030 | UI-006 | MockBattle judge / finalRngState | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-031 | UI-006 | MockBattleView exact source precedence | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-032 | UI-005 | Person statHistory exact chain | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-033 | UI-006 | Mock replay checkpoint exact capture | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-034 | UI-006 | Mock eventCandidates exact pair | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-035 | UI-005 | Person Sprint1PersonState direct view | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-036 | UI-008 | Event eventGroup exact semantics | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-037 | UI-008 | GET error precedence collision matrix | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-038 | UI-008 | 0.2.0 page presentation override | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-039 | UI-005 | TechniqueDefinition exact 31-key wire | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-040 | UI-006 | ApiError.validation exact array | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-041 | UI-008 | pageable totalCount / nextCursor | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-042 | UI-008 | INVALID_REQUEST fieldErrors exact contract | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-043 | UI-008 | CanonicalGetQuery 0.2.0 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-044 | UI-005 | PersonDetail qualifiedMaster | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-045 | UI-004 | Mock candidate exact predicate / corruption distinction | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-046 | UI-005 | PersonList/Detail 0.2.0 complete DTO | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-047 | UI-003 | server errorReference allocator lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-048 | UI-006 | MockBattleMutation/View complete invariants | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-049 | UI-005 | Person temporaryCondition / currentMental boundaries | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-050 | UI-003 | SimulationMutationView complete invariants | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-051 | UI-005 | TechniqueView exact state semantics | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-052 | UI-005 | TechniqueDefinition exact value contracts | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-053 | UI-008 | EventList canonical EventEnvelope | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-054 | UI-008 | Validation list complete DTO | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-055 | UI-008 | pageable success data exact shapes | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-056 | UI-008 | API envelope complete types | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-057 | UI-000 | DEFERRED_BINDING register completeness | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-058 | UI-008 | cursor dataIdentity compatibility vs stale | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-059 | UI-002 | StableErrorCode exact binding | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-060 | UI-005 | TrainingHistory anchor target/forced binding | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-061 | UI-000 | DEFERRED_BINDING body-reference coverage | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-062 | UI-000 | migration override audit | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-063 | UI-005 | Person age source consistency | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-064 | UI-005 | relationship all-record observation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-065 | UI-002 | cursor HMAC-before-schema classification | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-066 | UI-006 | Mock participant A/B order | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-067 | UI-006 | repeated new mock unchanged-world determinism | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-068 | UI-006 | MockBattleView exact34 / raw BattleResult prohibition | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-069 | UI-005 | Person techniques order / focus | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-070 | UI-006 | lastOperation across failures | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-071 | UI-002 | UiSession CSPRNG failure / atomic registration | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-072 | UI-006 | uiRevision capacity preflight | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-073 | UI-006 | commitState / committedWeeks matrix | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-074 | UI-005 | TrainingHistory sourceProcessor isolation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-075 | UI-009 | deterministic normalization exact reuse | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| TX-076 | UI-006 | replay after current world advances | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-077 | UI-006 | POST errorReference acceptance boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-078 | UI-008 | GET failure commitState always none | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-079 | UI-003 | start/reset state-scope matrix | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-080 | UI-008 | reset old cursor / journal behavior | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-081 | UI-003 | UiReadSnapshot 0.2.0 completeness | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-082 | UI-002 | process cursor security keys | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-083 | UI-003 | start empty/ready lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| TX-084 | UI-008 | ready-start old cursor / journal | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-085 | UI-006 | atomic mutation response boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-086 | UI-006 | isUpdating response construction semantics | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-087 | UI-007 | battle-log cursor result identity + uiRevision | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-088 | UI-007 | Mock result/log wire boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| TX-089 | UI-006 | GET latest session/result revision separation | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| TX-090 | UI-003 | validationOccurrence lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |

## 3. PAGE ownership (001-014)

| Contract ID | ownerTask | subject | UI-000 status | evidence |
|---|---|---|---|---|
| PAGE-001 | UI-004 | people cursor/sort/filter | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| PAGE-002 | UI-004 | mock candidates cursor | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| PAGE-003 | UI-008 | events sequence cursor | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-004 | UI-008 | validation occurrence cursor | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-005 | UI-007 | battle log sourceIndex cursor | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-006 | UI-008 | canonical query default equivalence | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-007 | UI-008 | common totalCount/nextCursor | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-008 | UI-008 | CanonicalGetQuery exact union | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-009 | UI-008 | dataIdentity compatibility/stale | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-010 | UI-002 | cursor HMAC/auth precedence | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| PAGE-011 | UI-008 | reset cursor invalidation | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-012 | UI-008 | ready-start cursor invalidation | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-013 | UI-007 | battle-log cursor lifetime | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| PAGE-014 | UI-007 | BattleLog response identity | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |

## 4. DET ownership (001-007)

| Contract ID | ownerTask | subject | UI-000 status | evidence |
|---|---|---|---|---|
| DET-001 | UI-009 | UI 1週×N vs N週 | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-002 | UI-009 | UI vs CLI | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-003 | UI-009 | same seed independent sessions | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-004 | UI-009 | boundary seeds | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-005 | UI-009 | mock replay | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-006 | UI-009 | mock before/after world unchanged | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| DET-007 | UI-009 | repeated new mock unchanged world | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |

## 5. MIG ownership (001-036)

| Contract ID | ownerTask | old-contract subject | UI-000 status | evidence |
|---|---|---|---|---|
| MIG-001 | UI-002 | API apiSchemaVersion="0.1.0" | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-002 | UI-002 | CursorPayload 0.1.0 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-003 | UI-005 | Person affiliationLabels | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-004 | UI-005 | Person overallRank | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-005 | UI-005 | PersonDetail singular mentorPersonId | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-006 | UI-005 | TrainingHistory instructorPersonId | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-007 | UI-005 | Technique usageConditions JsonValue | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-008 | UI-005 | Technique hitParameters JsonValue | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-009 | UI-005 | Technique consumptionAndUseLimit JsonValue | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-010 | UI-007 | Battle log sourceをdetailedLog.length相当で扱う余地 | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-011 | UI-007 | BattleLog actionKind | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-012 | UI-007 | BattleLog rngDisplay | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-013 | UI-007 | BattleLog reasonText | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-014 | UI-008 | Validation query code | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-015 | UI-008 | Validation共通表示のerror code/sourceProcessor/canContinue | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-016 | UI-008 | Event person filterをeventType/payload pathで決める余地 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-017 | UI-008 | EVENT-PERSON-MAPをfilter rule表として使用 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-018 | UI-004 | Mock candidateで参加不可reasonを表示する余地 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-019 | UI-006 | Mock judgeDecision:boolean | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-020 | UI-006 | Mock failure {code,message} | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-021 | UI-006 | Mock final RNGをfinalState等から推測する余地 | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-022 | UI-005 | PersonDetail statHistory:nullを正常fallbackにできる余地 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-023 | UI-005 | trainingHistory.available=falseで履歴source不足を隠す余地 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-024 | UI-006 | Validation error.validation形の曖昧さ | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-025 | UI-008 | fieldErrors.field/code自由string | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-026 | UI-008 | page totalCountのcursor後件数解釈余地 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-027 | UI-008 | CanonicalGetQueryの旧validation code member | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-028 | UI-006 | Mock replay checkpoint取得時点の曖昧さ | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-029 | UI-006 | Mock eventCandidates件数/orderの曖昧さ | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-030 | UI-006 | MockBattleView旧field群を差分合成 | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| MIG-031 | UI-005 | PersonList/PersonDetailを旧型+差分で再合成 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-032 | UI-003 | SimulationMutationViewを旧型+差分で再合成 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-033 | UI-008 | page wrapper fieldの曖昧さ | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-034 | UI-008 | Event一覧を縮約DTOにできる余地 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| MIG-035 | UI-002 | API envelopeを旧0.1.0 shapeのまま一部拡張 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| MIG-036 | UI-002 | UiReadSnapshot 0.1.0がRunInitializationSnapshotを保持しない | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |

## 6. FIX ownership (001-104)

| Contract ID | ownerTask | fixture subject | UI-000 status | evidence |
|---|---|---|---|---|
| FIX-001 | UI-009 | seed=0 | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| FIX-002 | UI-009 | seed=4294967295 | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| FIX-003 | UI-004 | population/person filter 0/1/2 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-004 | UI-004 | mock candidates 0/1/2+ | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-005 | UI-003 | 1/4/48/480 weeks | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-006 | UI-003 | year-boundary transaction/overflow | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-007 | UI-008 | list sizes 0/50/51/200/201/5000 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-008 | UI-007 | battle log 0/100/101/200/201 | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-009 | UI-003 | precommit DTO failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-010 | UI-003 | step none/partial/complete failure | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-011 | UI-006 | postcommit transport disconnect | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-012 | UI-003 | year-start manifest mixed statuses | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-013 | UI-003 | year-start receipt/provenance integrity | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-014 | UI-003 | calendar/manifest/schema identity mismatch | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-015 | UI-008 | paging omitted vs explicit defaults | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-016 | UI-006 | replay after world advance | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-017 | UI-003 | year-start processor/age-career boundaries | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-018 | UI-005 | living/deceased lists/detail/filter | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-019 | UI-003 | reset after preset/source change | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-020 | UI-008 | unseen event/validation filters | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-021 | UI-006 | post-start execution abort。start相当処理後dependency failure | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-022 | UI-006 | normal serializer failureからminimal fallback INTERNAL_ERROR | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-023 | UI-006 | corrupt MockBattleSessionStore.latest / replaySnapshot | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-024 | UI-007 | DetailedLog `{turnOrderLogs, actionLogs}`。両配列countが異なる正常fixture | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-025 | UI-007 | `requestedAction != resolvedAction`かつ`replacementReason != null` | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-026 | UI-005 | child/trainee/living active/deceased active/living retired/deceased retired rank variants | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-027 | UI-005 | familyId / lineageId / temporaryCondition / parent/master relationship variants | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-028 | UI-005 | current TechniqueDefinition全field + sparse PersonTechniqueState | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-029 | UI-008 | EventEnvelope.entities.personIds filter。payloadに別PersonId文字列を含むnegative caseも含む | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-030 | UI-003 | WorldDate.absoluteWeek 0/1/47/48/479/480 + year boundary | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-031 | UI-002 | current HMAC keyで正しく署名された旧CursorPayload 0.1.0。schema binding mismatch専用 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-032 | UI-005 | TrainingHistory正常7行動fixture + action_selected欠落/重複・event順序tamper | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-033 | UI-006 | MockBattleReplaySnapshot 0.2.0 / MockBattleLatestRecord 0.2.0 valid hash + one-field tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-034 | UI-008 | generic ValidationResult success/failure。failureはpath/message必須、actual/expectedあり/なし双方 | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-035 | UI-009 | canonical simulation state同一だがsessionId/requestId/uiRevision/durationMs等が異なる2 UI session | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| FIX-036 | UI-006 | mock replayでBattleResult/eventCandidates同一、resultUiRevision/latestRecordHashだけ異なる正常record pair | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-037 | UI-003 | 同一run identityで2 committed snapshots + start後にpreset registry sourceだけ変更したfixture | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-038 | UI-003 | partial failure committedWeeks=0/1/N。failed-week draftがlast committed stateと異なるfixture | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-039 | UI-003 | failedWeek public validation collectionにgeneric success/failure混在。CommittedValidationViewStore非変更fixture | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-040 | UI-004 | mock candidate eligibility: trainee 7/8/15/16、active 15/16/41/42、life/participation/career/injury境界 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-041 | UI-006 | accepted mock POSTで構文validだが正規pre-start participant validation failure | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-042 | UI-006 | endReason=unable_to_continue、双方unableToContinue=true、judgeScore non-null | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-043 | UI-006 | seeded final tie-break。summary decisiveCriterion/seededRngRollとfinalRngStateを含む正常BattleResult | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-044 | UI-006 | completed/failed MockBattleView 0.2.0 exact field-source fixture | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-045 | UI-006 | eventCandidate/replaySnapshot/current-worldだけをBattleResultと矛盾させたsource-conflict tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-046 | UI-005 | statHistory no-growth/current-week/W47/W48/>48weekの正規surface chain | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-047 | UI-005 | statHistory before-after chain/final-current/negative-delta tamper | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-048 | UI-006 | pre-start World RNG/MatchId checkpoint + original mock後にcanonical worldを進行させたreplay fixture | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-049 | UI-006 | `[battle.started,battle.finished]` exact pair + reverse/extra/missing/cross-reference tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-050 | UI-005 | active/inactive/deceased Sprint1PersonState + missing state/focus catalog/duplicate technique tamper | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-051 | UI-008 | training.* + technique learning/mastery混在event stream + group変更old cursor fixture | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-052 | UI-008 | GET collision: no-session/malformed/empty/missing/stale/corrupt/updating snapshot combinations | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-053 | UI-008 | old page label expectations vs 0.2.0 Person/Technique/Mock direct-field presentation | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-054 | UI-005 | TechniqueDefinition exact31 + missing one key + extra one key + upstream-key-drift simulation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-055 | UI-006 | ApiError.validation single/multiple/zero/single-object/issue-flatten invalid forms | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-056 | UI-008 | paging 0/exact-limit/limit+1/multi-page/filter totalCount fixtures | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-057 | UI-008 | fieldErrors: body/query/path各code、RFC6901 escape、複数stable order、fieldless malformed JSON/body-limit | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-058 | UI-008 | CanonicalGetQuery 5 variants、default omitted/explicit pair、old validation code query/cursor、raw cursor exclusion | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-059 | UI-005 | qualifiedMaster: child/trainee/active false、retired true/false、living/deceased、missing/type/career tamper | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-060 | UI-006 | mock candidate eligibility boundaries + valid ineligible + source corruption + same-person pair + provider failure | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-061 | UI-005 | PersonList exact16 / PersonDetail exact25 + missing/extra/undefined/old-field injection + same-revision pair | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-062 | UI-003 | CSPRNG startup failure / errorCounter 1,2,3 / serialization gap / MAX_SAFE_INTEGER-1→fatal exhaustion | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-063 | UI-006 | MockMutation exact5 + MockView exact34 completed/failed/replay + revision/candidate-source/old-field tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-064 | UI-005 | temporaryCondition 0/100/±20 boundaries + decimal/out-of-range + currentMental spirit0/50/100 + mixed-generation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-065 | UI-003 | SimulationMutation exact14 start/reset/step1/stepN/partial0/partialN + every cross-field tamper | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-066 | UI-005 | TechniqueView exact9 + progress 0/cap/cap+1 + mastery 0/10000/10001 + acquired null/non-null + catalog mismatch | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-067 | UI-005 | TechniqueDefinition all fixed enum/range boundaries + actionTraits 5 + canonical arrays + identity/literal drift | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-068 | UI-008 | committed EventEnvelope11 + failed draft + mock candidates + invalid event/payload/sequence tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-069 | UI-008 | Validation success/failure multi-issue + raw actual/expected + reorder/dedupe/path-message mismatch tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-070 | UI-008 | People/Candidates/Events/Validation exact3 + BattleLog exact4 resultUiRevision + extra-wrapper-field injection + presets no-cursor shape | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-071 | UI-008 | success/failure envelope all optional presence combinations + commitState/errorReference/revision tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-072 | UI-000 | DB-001..022 complete/missing/duplicate/unresolved/new-unregistered/semantic-misclassification register fixtures | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-073 | UI-008 | five dataIdentity valid cursors + signed wrong prefix/kind/endpoint + old simulation/revision/query/schema cases | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-074 | UI-005 | StableErrorCode exact-set add/remove/rename + training action four target correlations + forcedReason known/unknown union | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-075 | UI-000 | deferred body reference missing ID / wrong ID / DB-022 / multi-subject missing second ID | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-076 | UI-000 | MIG36 clean production tree + judgeDecision/overallRank/code-query/api0.1/usageConditions alias injection cases | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-077 | UI-005 | living currentAge exact/mismatch + update old/new generation + deceased age null/death fields + three-view consistency | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-078 | UI-005 | parent 0/1/2 + master 0/1/multiple + status metadata + broken ref/duplicate/cycle + qualifiedMaster cross-ref | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-079 | UI-002 | bad-HMAC payloads claiming old/current/unknown schema + valid-HMAC old/current/incompatible/stale variants | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-080 | UI-006 | same participant + A/B ordered pair + swapped pair + changed candidate sort + replay swapped result/event tamper | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-081 | UI-006 | two identical new mocks separated only by latest/uiRevision + old cursor/journal + third after canonical step | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-082 | UI-006 | MockBattleView exact34 valid + injected raw battleResult/detailedLog + old judgeDecision/failure.message negative cases | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-083 | UI-005 | catalog A/B/C + held B/C reordered + duplicate B + focus valid/dangling/catalog mismatch + acquired/learning count | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-084 | UI-006 | prior HTTP200 success + atomic precommit failures + step INTERNAL none/partial/complete + atomic transport-success replay | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-085 | UI-002 | session ID attempt1/2/3 collision patterns + retry exhaustion + CSRF fault + existing-session no-rotation + transport fault | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-086 | UI-006 | uiRevision MAX/MAX-1/MAX-N across start/reset/step/mock/replay + stale/malformed precedence + zero-execution proof | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-087 | UI-006 | each operation with fault before/after commit + step K=0/1/N-1/N + HTTP200 domain partial K=0 contrast | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-088 | UI-005 | one week with DB-011 training events + foreign processor technique/stat events + sourceProcessor tamper/duplicate/no-anchor | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-089 | UI-009 | same-seed canonical resultのsimulationId/eventId deterministic-ID-only tamper + sequence/payload/MatchId tamper + authorized nondeterministic metadata-only difference + UI authority rule-set drift | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| FIX-090 | UI-006 | original mock + advanced world/current-ineligible person + exact replay + start/reset clear + stale expected revision + saved journal | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-091 | UI-006 | malformed/valid-looking raw request IDs + pre-accept parser/fingerprint/journal faults + post-accept capacity/sim/serialize faults | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-092 | UI-008 | every GET failure category + session-create pre-store + server ref counter + stale cursor/resource/internal variants | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-093 | UI-006 | empty start + ready reset + existing latest/validation/journal/session secrets + reset precommit fault/transport-after-success + step latest retention | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-094 | UI-008 | reset-old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal replay + new-request contrast | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-095 | UI-003 | UiReadSnapshot exact7 old/new reset generations + missing run-init + current-run-init mixed read + post-snapshot source mutation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-096 | UI-002 | process cursorHmac/binding key independent generation + purpose swap/reuse + startup failure + reset/new-session no-rotation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| FIX-097 | UI-006 | empty start + ready start different preset/seed + old snapshot/latest/validation/journal + start precommit fault/transport-after-success + updating GET | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-098 | UI-008 | ready-start old people/events/validation/mock-log cursors + cursorless latest 404 + old same-request journal exact replay + new requestId contrast | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-099 | UI-006 | atomic start/reset/new-mock/replay success bytes prevalidation + serializer fault before commit + transport fault after commit + same-request saved-200 replay | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-100 | UI-006 | isUpdating: no-lock preaccept error + UPDATE_IN_PROGRESS + accepted domain422/capacity500/step partial-complete + POST success + later saved-response replay | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-101 | UI-007 | battle-log cursor before normal step + retained latest/new uiRevision + updating operationStart snapshot + fresh cursor + new mock/reset clear | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-102 | UI-007 | large MockBattle detailedLog + exact34 latest view + exact4 log wrapper + normal step causing envelope uiRevision > resultUiRevision + raw-result injection | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| FIX-103 | UI-006 | mock latest immediately after commit + same latest after 1/N normal steps + updating operationStart snapshot + forced revision-equality mapper negative | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| FIX-104 | UI-003 | ValidationStore init0/1/3 + weekly0/2 + tentative rollback + multi-week partial failed validation + reset old max100 -> new occurrence1 + old cursor | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |

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

| Contract ID | ownerTask | subject | UI-000 status | evidence |
|---|---|---|---|---|
| BRIDGE-001 | UI-003 | start API | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-002 | UI-002 | preset registry | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-003 | UI-003 | SimulationIdentity | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-004 | UI-003 | RunRuleSnapshot | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-005 | UI-003 | WorldState read | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-006 | UI-003 | one-week progression | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-007 | UI-003 | multi-week progression | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-008 | UI-006 | clone/snapshot | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-009 | UI-006 | restore/reload | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-010 | UI-003 | calendar | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-011 | UI-003 | year-start outer transaction | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-012 | UI-008 | EventEnvelope/year-start provenance | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-013 | UI-008 | Event store/query | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-014 | UI-008 | event person map | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-015 | UI-008 | eventGroup | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-016 | UI-008 | ValidationResult | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-017 | UI-003 | CommittedValidationViewStore | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-018 | UI-004 | battle eligibility | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-019 | UI-006 | BattleState generation | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-020 | UI-006 | battle run | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-021 | UI-006 | run+commit facade | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-022 | UI-006 | BattleResult | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-023 | UI-007 | action log | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-024 | UI-006 | MockBattle store/replay snapshot | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-025 | UI-006 | canonical world unchanged | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-026 | UI-006 | WorldState clone completeness | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-027 | UI-006 | World RNG clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-028 | UI-006 | MatchId generator clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-029 | UI-006 | Event allocation/stream clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-030 | UI-006 | ProcessorRuntimeState clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-031 | UI-006 | same-week transaction state clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-032 | UI-006 | SimulationIdentity/RunRuleSnapshot clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-033 | UI-006 | calendar identity clone | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-034 | UI-003 | year-start manifest | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-035 | UI-003 | year-start runtime/receipt | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-036 | UI-003 | CAL-SCHEMA-MAP | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-037 | UI-002 | request journal/lastOperation | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-038 | UI-003 | RunInitializationSnapshot 0.2.0 (+sidecar payload) | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-039 | UI-002 | UiSessionState/UiReadSnapshot | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-040 | UI-006 | 0.1.14 §2 / post-start battle execution abortの実class/symbol/module | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-041 | UI-002 | 0.1.14 §3 / normal response serializerとminimal fallback serializer | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-042 | UI-002 | 0.1.14 §4 / errorReference generator | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-043 | UI-005 | 0.1.14 §6 / Person family/lineage/rank/stats/aptitudes/temporaryCondition source | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-044 | UI-005 | 0.1.14 §7 / parent/master canonical relationship型・counterpart field | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-045 | UI-005 | 0.1.14 §8 / TechniqueDefinition / PersonTechniqueState exact mapping | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-046 | UI-007 | 0.1.14 §11 / BattleResult.detailedLog.actionLogs | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-047 | UI-007 | 0.1.14 §12 / BattleActionLog -> BattleLogItemView 0.2.0 | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-048 | UI-008 | 0.1.14 §10 / EventEnvelope.entities.personIds | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-049 | UI-006 | 0.1.14 §13 / MockBattleSessionStore.latest / replaySnapshot validator | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-050 | UI-000 | 0.1.14 §15 / upstream schemaVersion registry | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-051 | UI-003 | 0.1.14 §14 / WorldDate.absoluteWeek -> WorldSummaryView.elapsedWeeks | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-052 | UI-002 | 0.1.14 §1A / apiSchemaVersion / CursorPayload schema binding | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-053 | UI-005 | 0.1.14 §9A / committed weekly-training EventEnvelope群 -> TrainingHistoryItemView | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-054 | UI-006 | 0.1.14 §13A / MockBattleReplaySnapshot/LatestRecord hash | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-055 | UI-008 | 0.1.14 §10A / generic ValidationResult -> ValidationResultViewItem / ValidationQuery | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-056 | UI-009 | 0.1.14 §16A / UI-009 canonical comparison projection | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| BRIDGE-057 | UI-003 | 0.1.14 §6A / WorldSummaryView source map | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-058 | UI-003 | 0.1.14 §6B / failedWeek.validation failure collection | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-059 | UI-006 | 0.1.14 §7A / MockBattleCandidateView / POST eligibility | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-060 | UI-006 | 0.1.14 §13B / MockBattleView judge/final RNG mapping | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-061 | UI-006 | 0.1.14 §13C / MockBattleView 0.2.0全field source | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-062 | UI-005 | 0.1.14 §6C / PersonDetail.statHistory / ABILITY-MUTATION-MAP | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-063 | UI-006 | 0.1.14 §13D / MockBattle replay checkpoint capture | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-064 | UI-006 | 0.1.14 §13D / Mock eventCandidates exact pair | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-065 | UI-005 | 0.1.14 §6D / Person.sprint1State -> currentMental/focus/techniques/count | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-066 | UI-008 | 0.1.14 §10B / Event eventGroup query | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-067 | UI-008 | 0.1.14 §5A / GET error precedence | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-068 | UI-010 | 0.1.14 §4A / page presentation override | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-069 | UI-005 | 0.1.14 §8.3 / TechniqueDefinitionView exact key set | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-070 | UI-008 | 0.1.14 §3A / ApiError.validation[] | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-071 | UI-008 | 0.1.14 §3B / INVALID_REQUEST fieldErrors | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-072 | UI-008 | 0.1.14 §10D / CanonicalGetQuery 0.2.0 exact union | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-073 | UI-005 | 0.1.14 §6E / PersonDetail qualifiedMaster | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-074 | UI-004 | 0.1.14 §7A.1 / Mock candidate exact eligibility | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-075 | UI-005 | 0.1.14 §6F / Person wire DTO complete types | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-076 | UI-002 | 0.1.14 §4.2 / server errorReference allocator | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-077 | UI-006 | 0.1.14 §13E / MockBattleMutation/View final invariants | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-078 | UI-005 | 0.1.14 §6G / temporaryCondition/currentMental ranges | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-079 | UI-003 | 0.1.14 §6H / SimulationMutationView complete type | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-080 | UI-005 | 0.1.14 §8.2 / TechniqueView state exact semantics | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-081 | UI-005 | 0.1.14 §8A / TechniqueDefinition value contracts | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-082 | UI-008 | 0.1.14 §10E / GET /events item/data DTO | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-083 | UI-008 | 0.1.14 §10A.2 / Validation list complete DTO | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-084 | UI-008 | 0.1.14 §10F / paged success data | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-085 | UI-002 | 0.1.14 §3C / API envelope complete types | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-086 | UI-000 | 0.1.14 §1C / DEFERRED_BINDING register | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-087 | UI-008 | 0.1.14 §10G / cursor dataIdentity matrix | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-088 | UI-002 | 0.1.14 §1C.6 / StableErrorCode binding | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-089 | UI-005 | 0.1.14 §1C.7/§9A / training.action_selected payload binding | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-090 | UI-000 | 0.1.14 §1C.8 / DEFERRED_BINDING body-reference coverage | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-091 | UI-000 | 0.1.14 §0A / migration override index | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-092 | UI-005 | 0.1.14 §6I / Person age source | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-093 | UI-005 | 0.1.14 §7 / §1C.8 / relationship display / DB-022 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-094 | UI-002 | 0.1.14 §10G.4 / cursor authentication precedence | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-095 | UI-006 | 0.1.14 §13F / Mock participant A/B order | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-096 | UI-006 | 0.1.14 §13G/§16A / repeated new mock determinism | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-097 | UI-007 | 0.1.14 §13C / MockBattleView raw-result prohibition | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-098 | UI-005 | 0.1.14 §8B / Person techniques array/focus | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-099 | UI-010 | 0.1.14 §3D / failure commitState / lastOperation | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-100 | UI-002 | 0.1.14 §4A / UiSession CSPRNG lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-101 | UI-010 | 0.1.14 §3E / uiRevision capacity preflight | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-102 | UI-010 | 0.1.14 §3F / commitState/committedWeeks matrix | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-103 | UI-005 | 0.1.14 §9A.2A / DB-011 / TrainingHistory producer membership | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-104 | UI-009 | 0.1.14 §16A / DB-018 / CLI/UI deterministic normalization | implemented | _handoff-artifacts/audit/current/S1_5-UI009-IMPLEMENTATION-20260816/owned-contracts-matrix.txt |
| BRIDGE-105 | UI-006 | 0.1.14 §13H / DB-016 / replay saved-source isolation | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-106 | UI-010 | 0.1.14 §4.1 / POST errorReference acceptance boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-42-EVIDENCE-AND-SERIALIZATION-20260817/per-id-owner-evidence.txt |
| BRIDGE-107 | UI-010 | 0.1.14 §3F.1A / GET commitState | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-108 | UI-003 | 0.1.14 §6J / start/reset state scope | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-109 | UI-008 | 0.1.14 §6K / reset cursor/journal lifetime | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-110 | UI-003 | 0.1.14 §5B / UiReadSnapshot 0.2.0 | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-111 | UI-002 | 0.1.14 §4B / process cursor security keys | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-112 | UI-003 | 0.1.14 §6J.2 / start empty/ready lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |
| BRIDGE-113 | UI-008 | 0.1.14 §6L / ready-start cursor/journal | implemented | _handoff-artifacts/audit/current/S1_5-UI008-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-114 | UI-010 | 0.1.14 §3F/§13E / atomic mutation response boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI010-FINAL-62-OWNER-EVIDENCE-CLOSURE-20260817/per-id-owner-evidence.txt |
| BRIDGE-115 | UI-010 | 0.1.14 §3C.5 / isUpdating final response semantics | implemented | _handoff-artifacts/audit/current/S1_5-UI010-ISUPDATING-OWNER-BEHAVIOR-FIX-20260817/per-id-owner-evidence.txt |
| BRIDGE-116 | UI-007 | 0.1.14 §10G.2 / battle-log cursor dual binding | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-117 | UI-007 | 0.1.14 §10F/§13C / Mock result/log wire boundary | implemented | _handoff-artifacts/audit/current/S1_5-UI007-IMPLEMENTATION-20260815/owned-contracts-matrix.txt |
| BRIDGE-118 | UI-006 | 0.1.14 §13C.1B / GET latest revision separation | implemented | _handoff-artifacts/audit/current/S1_5-UI006-IMPLEMENTATION-20260815/owned-contract-completeness-matrix.txt |
| BRIDGE-119 | UI-003 | 0.1.14 §6M / ValidationStore occurrence lifecycle | implemented | _handoff-artifacts/audit/assignments/ROLE1_OUTBOX.md |

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

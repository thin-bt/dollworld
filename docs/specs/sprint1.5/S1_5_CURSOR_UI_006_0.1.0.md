# Sprint 1.5 Cursor Instruction — UI-006

- Document ID: `S1.5-CURSOR-UI-006`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.14`
- Common template: `S1_5_CURSOR_TASK_TEMPLATE_0.1.0.md`
- Implementation plan: `S1_5_IMPLEMENTATION_PLAN_0.1.0.md`
- Implementability audit: `S1_5_TASK_IMPLEMENTABILITY_AUDIT_0.1.0.md`

## 1. Mandatory task identity

```text
作業repo: D:\xampp\htdocs\dollworld
Task: UI-006
Predecessor gate: UI-005 accepted
Cursor commit: 禁止
git worktree add: 禁止
future task production implementation: 禁止
```

Production edit前にstatic spec auditとpredecessor/base commitを確認する。

## 2. Exact scope

API-012～014、new mock/replay/latest、world isolation、UI-000決定済みならIsolatedMockBattleRunner facade。

### Owned production APIs

- `API-012` POST `/api/s1_5/mock-battles`
- `API-013` POST `/api/s1_5/mock-battles/replay`
- `API-014` GET `/api/s1_5/mock-battles/latest`

### Forbidden forward work

API-015 battle log route、API-009/010 Event/Validation route。

## 3. Required binding/precondition evidence

Critical DB bindings: `DB-001`, `DB-008`, `DB-015`, `DB-016`, `DB-017`

UI-000 reportに次のexact one decisionが必要:

```text
isolatedRunnerDecision = not_required
or
isolatedRunnerDecision = implement_in_UI_006
isolatedRunnerContract = exact symbol/type/module/test plan
```

未確定なら`dependency_blocker`でproduction edit前STOP。UI-006で意味論を発明しない。

## 3A. Required API state transitions

Source: `S1_5_API_STATE_TRANSITION_AUDIT_0.1.0.md`

Required IDs:

```text
ST-012
ST-013
ST-014
```

Owned API acceptance requires all listed ST paths/retry/failure boundaries PASS.

## 3B. Required cross-API scenarios

Source: `S1_5_CROSS_API_SCENARIO_AUDIT_0.1.0.md`

Required IDs:

```text
SCN-001
SCN-005
SCN-006
SCN-007
SCN-008
SCN-009
SCN-010
SCN-013
```

All assigned cross-operation state/retry/cursor/journal assertions must PASS.

## 4. Final evidence-owned numbered contracts

Total: **93**

### BRIDGE

- `BRIDGE-008` clone/snapshot
- `BRIDGE-009` restore/reload
- `BRIDGE-019` BattleState generation
- `BRIDGE-020` battle run
- `BRIDGE-021` run+commit facade
- `BRIDGE-022` BattleResult
- `BRIDGE-024` MockBattle store/replay snapshot
- `BRIDGE-025` canonical world unchanged
- `BRIDGE-026` WorldState clone completeness
- `BRIDGE-027` World RNG clone
- `BRIDGE-028` MatchId generator clone
- `BRIDGE-029` Event allocation/stream clone
- `BRIDGE-030` ProcessorRuntimeState clone
- `BRIDGE-031` same-week transaction state clone
- `BRIDGE-032` SimulationIdentity/RunRuleSnapshot clone
- `BRIDGE-033` calendar identity clone
- `BRIDGE-040` 0.1.14 §2 / post-start battle execution abortの実class/symbol/module
- `BRIDGE-049` 0.1.14 §13 / MockBattleSessionStore.latest / replaySnapshot validator
- `BRIDGE-054` 0.1.14 §13A / MockBattleReplaySnapshot/LatestRecord hash
- `BRIDGE-059` 0.1.14 §7A / MockBattleCandidateView / POST eligibility
- `BRIDGE-060` 0.1.14 §13B / MockBattleView judge/final RNG mapping
- `BRIDGE-061` 0.1.14 §13C / MockBattleView 0.2.0全field source
- `BRIDGE-063` 0.1.14 §13D / MockBattle replay checkpoint capture
- `BRIDGE-064` 0.1.14 §13D / Mock eventCandidates exact pair
- `BRIDGE-077` 0.1.14 §13E / MockBattleMutation/View final invariants
- `BRIDGE-095` 0.1.14 §13F / Mock participant A/B order
- `BRIDGE-096` 0.1.14 §13G/§16A / repeated new mock determinism
- `BRIDGE-105` 0.1.14 §13H / DB-016 / replay saved-source isolation
- `BRIDGE-118` 0.1.14 §13C.1B / GET latest revision separation

### TX

- `TX-010` new mock成功/resolution_error
- `TX-011` replay成功
- `TX-012` mock/replay accepted precommit failure
- `TX-013` postcommit transport disconnect
- `TX-017` Mock battle / replay post-start execution abort
- `TX-018` normal serializer failure -> minimal fallback
- `TX-019` fallback 500 exact request replay
- `TX-020` corrupt mock latest / replay
- `TX-025` MockBattle latest integrity hash
- `TX-029` Mock candidate / accepted pre-start eligibility
- `TX-030` MockBattle judge / finalRngState
- `TX-031` MockBattleView exact source precedence
- `TX-033` Mock replay checkpoint exact capture
- `TX-034` Mock eventCandidates exact pair
- `TX-040` ApiError.validation exact array
- `TX-048` MockBattleMutation/View complete invariants
- `TX-066` Mock participant A/B order
- `TX-067` repeated new mock unchanged-world determinism
- `TX-068` MockBattleView exact34 / raw BattleResult prohibition
- `TX-070` lastOperation across failures
- `TX-072` uiRevision capacity preflight
- `TX-073` commitState / committedWeeks matrix
- `TX-076` replay after current world advances
- `TX-077` POST errorReference acceptance boundary
- `TX-085` atomic mutation response boundary
- `TX-086` isUpdating response construction semantics
- `TX-089` GET latest session/result revision separation

### PAGE

- none

### DET

- none

### MIG

- `MIG-019` Mock judgeDecision:boolean
- `MIG-020` Mock failure {code,message}
- `MIG-021` Mock final RNGをfinalState等から推測する余地
- `MIG-024` Validation error.validation形の曖昧さ
- `MIG-028` Mock replay checkpoint取得時点の曖昧さ
- `MIG-029` Mock eventCandidates件数/orderの曖昧さ
- `MIG-030` MockBattleView旧field群を差分合成

### FIX

- `FIX-011` postcommit transport disconnect
- `FIX-016` replay after world advance
- `FIX-021` post-start execution abort。start相当処理後dependency failure
- `FIX-022` normal serializer failureからminimal fallback INTERNAL_ERROR
- `FIX-023` corrupt MockBattleSessionStore.latest / replaySnapshot
- `FIX-033` MockBattleReplaySnapshot 0.2.0 / MockBattleLatestRecord 0.2.0 valid hash + one-field tamper
- `FIX-036` mock replayでBattleResult/eventCandidates同一、resultUiRevision/latestRecordHashだけ異なる正常record pair
- `FIX-041` accepted mock POSTで構文validだが正規pre-start participant validation failure
- `FIX-042` endReason=unable_to_continue、双方unableToContinue=true、judgeScore non-null
- `FIX-043` seeded final tie-break。summary decisiveCriterion/seededRngRollとfinalRngStateを含む正常BattleResult
- `FIX-044` completed/failed MockBattleView 0.2.0 exact field-source fixture
- `FIX-045` eventCandidate/replaySnapshot/current-worldだけをBattleResultと矛盾させたsource-conflict tamper
- `FIX-048` pre-start World RNG/MatchId checkpoint + original mock後にcanonical worldを進行させたreplay fixture
- `FIX-049` `[battle.started,battle.finished]` exact pair + reverse/extra/missing/cross-reference tamper
- `FIX-055` ApiError.validation single/multiple/zero/single-object/issue-flatten invalid forms
- `FIX-060` mock candidate eligibility boundaries + valid ineligible + source corruption + same-person pair + provider failure
- `FIX-063` MockMutation exact5 + MockView exact34 completed/failed/replay + revision/candidate-source/old-field tamper
- `FIX-080` same participant + A/B ordered pair + swapped pair + changed candidate sort + replay swapped result/event tamper
- `FIX-081` two identical new mocks separated only by latest/uiRevision + old cursor/journal + third after canonical step
- `FIX-082` MockBattleView exact34 valid + injected raw battleResult/detailedLog + old judgeDecision/failure.message negative cases
- `FIX-084` prior HTTP200 success + atomic precommit failures + step INTERNAL none/partial/complete + atomic transport-success replay
- `FIX-086` uiRevision MAX/MAX-1/MAX-N across start/reset/step/mock/replay + stale/malformed precedence + zero-execution proof
- `FIX-087` each operation with fault before/after commit + step K=0/1/N-1/N + HTTP200 domain partial K=0 contrast
- `FIX-090` original mock + advanced world/current-ineligible person + exact replay + start/reset clear + stale expected revision + saved journal
- `FIX-091` malformed/valid-looking raw request IDs + pre-accept parser/fingerprint/journal faults + post-accept capacity/sim/serialize faults
- `FIX-093` empty start + ready reset + existing latest/validation/journal/session secrets + reset precommit fault/transport-after-success + step latest retention
- `FIX-097` empty start + ready start different preset/seed + old snapshot/latest/validation/journal + start precommit fault/transport-after-success + updating GET
- `FIX-099` atomic start/reset/new-mock/replay success bytes prevalidation + serializer fault before commit + transport fault after commit + same-request saved-200 replay
- `FIX-100` isUpdating: no-lock preaccept error + UPDATE_IN_PROGRESS + accepted domain422/capacity500/step partial-complete + POST success + later saved-response replay
- `FIX-103` mock latest immediately after commit + same latest after 1/N normal steps + updating operationStart snapshot + forced revision-equality mapper negative

### Acceptance ownership

- `ACC-007` mock battle execution
- `ACC-009` no draw/judge decision
- `ACC-021` saved checkpoint replay exact
- `ACC-024` mock artifacts excluded from canonical world
- `ACC-025` clone mutable-reference isolation
- `ACC-026` DefaultBattleStrategy/run-rule source
- `ACC-027` weekly planner/mock separation
- `ACC-038` public WorldEngine/isolated runner boundary
- `ACC-039` MockBattle latest/replay lifecycle
- `ACC-081` 模擬戦またはreplayのpost-start execution abortが500 `INTERNAL_ERROR` / `commitState=none`となり、canonical world、RNG、ID、event、mock latest、uiRevision、lastOperat...
- `ACC-082` execution abortをBattleResultの第4種または`resolution_error`へ偽装しない。
- `ACC-096` 保存済みmock latest/replay recordの破損が404/422/劣化200ではなく500 `INTERNAL_ERROR`となり、状態を変更しない。
- `ACC-101` MockBattleReplaySnapshotおよびlatest recordが明示的SHA-256 hashを持ち、GET/log/replayでhash再計算・正規validator・cross-referenceを順に実行し、改ざんを500として検出する。
- `ACC-107` MockBattleCandidateViewが適格者だけを返して参加不可reasonを合成せず、POST accepted後の参加不可は正規pre-start validationにより422 `BATTLE_PRE_START_FAILURE`として非commitで返される。
- `ACC-108` MockBattleViewが`endReasonIsJudgeDecision`と`judgementApplied`を分離し、双方`unable_to_continue`時に`endReasonIsJudgeDecision=false`かつ`judgementApplied=true`か...
- `ACC-109` MockBattleViewの`finalRngState`がvalidated BattleResultの同fieldを唯一sourceとし、battleSeed/finalState/PersonId等からUI側で再生成・再抽選しない。
- `ACC-110` MockBattleView 0.2.0の全field sourceが固定され、battleSeed/participant source hashesはBattleResult.finalState、failureはfinalState.failureを直接正本とし、event/valida...
- `ACC-112` 新規mockのMockBattleReplaySnapshot.runtimeCheckpointがMatchId予約・World RNG消費前のaccepted committed source runtimeを完全保持し、replayではcurrent worldを参照せず同snapsho...
- `ACC-113` valid MockBattle latestのeventCandidatesが正規RunBattleCommitPlanどおり`[battle.started,battle.finished]`の2件exact orderであり、全重複fieldをBattleResultとcross-ref...
- `ACC-127` MockBattleMutationView 0.2.0がexact5 key、MockBattleViewがexact34 keyで、revision4値・new/replay source revision・completed/failed不変条件・candidate latestとres...
- `ACC-145` MockBattleのparticipantAId/BId順がrequestからsideA/sideB・hash・event・result・replayまで意味のある順序としてexact保持され、同一Personは400 conflicting_fields、A/B swapをsort/nor...
- `ACC-146` canonical world unchangedかつordered A/B等のsimulation input同一で連続new mockした場合、BattleResult/eventCandidates/battleSeed/matchId/finalRngStateがexact一致し、ui...
- `ACC-155` Mock replayがcurrent session revisionをconcurrency gateにだけ使い、battle source/eligibility/RNG/MatchId/Person状態は保存replaySnapshot checkpointだけから再構築し、world...
- `ACC-168` `GET /mock-battles/latest`がtop-level envelope `uiRevision`をfixed UiReadSnapshot revision、data.resultUiRevisionをlatest生成時revisionとして分離し、`sourceWorld...

## 5. Required consumerEvidence for later-owner cross-cutting contracts

- UI-003 consumerEvidenceを再検証しmutation common contractのmock branchを追加
- BRIDGE-114/TX-085 atomic responseのmock/replay branch
- BRIDGE-115/TX-086 isUpdating mock/replay branch

consumerEvidenceはcurrent task/API branchだけ。future endpointを作ってmatrixを埋めない。

## 6. Task-specific acceptance tests

- new mock/replay/latest
- A/B order
- world/RNG/MatchId unchanged
- checkpoint exact replay
- execution abort/fallback/serializer
- candidate -> POST pre-start revalidation
- isolatedRunnerDecision assertion

加えて共通templateのstructural/success/failure/tamper/regression/full quality/static auditを実行する。

## 6A. Required fault injections

Source: `S1_5_FAULT_INJECTION_MATRIX_0.1.0.md`

Required IDs:

```text
FI-047
FI-048
FI-049
FI-050
FI-051
FI-052
FI-053
FI-054
FI-055
FI-056
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
対象タスク: UI-006
predecessor: UI-005 accepted
owned API IDs: API-012, API-013, API-014
consumerEvidence IDs/branches:
static spec audit result:
future-work violation count: 0
STOP/open blocker: none
commit: 未実施
```

## 10. Acceptance report schema

`S1_5_CURSOR_ACCEPTANCE_REPORT_SCHEMA_0.1.0.md`のexact field orderを使用する。

---
title: Wiki更新履歴
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/wiki/index.md
  - docs/SPRINT_1_BACKLOG.md
  - docs/SPEC_CHANGELOG.md
  - tag:sprint0-complete
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
  - commit:60d5b6b821983b047debd51bccc43389d363f953
last_verified: 2026-08-11
---

# Wiki更新履歴

## 2026-08-11 — S01-009実装前clarifier
- 追加監査でpopulation performance用sidecar templateをaccepted tiny `sprint1-input.json`のPersonId昇順先頭validated entryへ固定し、各generated PersonIdでは`personId`だけ差し替える契約を追加。performance専用balance値の発明を禁止。
- 追加監査でintegrated scenarioのfixed7をS01-008 accepted `buildAndWriteSprint1RunOutput`＋`evaluateReferenceIntegrity`／run-key→runId layoutへ固定。Sprint0回帰report読込先を`output/sprint0-verification/sprint0-completion-report.json`へ固定し、必須diff gate表記を`git diff --check HEAD`へ統一。
- 追加監査で`verify:sprint1`のsub-gate順序を固定し、`npm run wiki:check`／`git diff --check HEAD`を独立commandとして明記。script起動方式は既存`verify:sprint0`のbuild／Node patternを踏襲し、新runner依存追加を禁止。
- 追加監査でverification `runs/<run-key>/`は`runCli`のoutputRootであり、fixed7は既存layoutの`<run-key>/<runId>/`に置くことを明記。runId階層のflatten禁止、各run-key成功時exactly 1 runId directoryを固定。
- 追加監査でofficial verifierのGit HEAD解決必須・`verify:sprint1`自身のtag操作禁止、weekly eventの`sourceProcessor=weekly-training` bind、Sprint1 performance warning code/scopeを固定。

- S01-008 accepted（commit `7c47847`）を正本current-stateへ同期。
- S01-009の正規入口を`npm run verify:sprint1`、completion reportを`output/sprint1-verification/sprint1-completion-report.json`へ固定。
- same-seed 100年×2、different-seed実体差、boundary seed、10／50／100／300年、weekly＋technique＋battle統合、600／2000／5000人性能、Sprint 0回帰を完了ゲートとして明文化。
- 性能超過aloneはSprint 0と同じwarning扱い。S01-009 accepted後はclean masterで再検証し、合格commitへ`Sprint 1`完了tag `sprint1-complete`を付ける契約を追加。
- 再監査で、存在しないS01-008 production comparator前提を削除し05仕様準拠verification-private comparatorへ修正。integrated battleを`official`＋`default_strategy`へ固定。
- verifier exit 0/1、stale report防止、atomic report／read-back validation、required gate `blocked`扱い、100年run再利用規則、最終clean run前のhandoff artifact退避を追記。
- 再々監査でverification-owned run rootを`output/sprint1-verification/runs/<run-key>/`へ固定し、一般`output/`のcleanup禁止を明記。integrated battleはaccepted public helperでeligibility／participant／World hash／same-week countを組み立てる契約へ具体化。identity mutation／`Math.random` scan範囲も固定。
- current WikiのS01-001〜007／architecture indexに残っていた旧「次タスク」「WorldEngine未接続」表現をS01-008 accepted／S01-009 pendingへ同期。
- 追加再監査で、run分離は既存programmatic `outputRoot`のみ（新`--output-root`禁止）、integrated technique actor→official participant bind、performance seed=12345、`not_performed`表記、report自己SHA禁止／self-recursion禁止／tag force禁止を固定。
- Sprint 0 warning sourceをaccepted reportの`warningCount`＋`performanceWarnings`へ修正し、5000 measure-only profileはrequired gateとして成功時`passed`、integrated fixed7はweekly exact 2回・yearly data row 0へ固定。
- 追加監査でweekly-training event actorを`EventEnvelope.entities.personIds` exact 1件へ固定。Sprint0 `performanceWarnings`のwire型はS01-009側で再定義せずaccepted Sprint0 completion-report型／validatorを再利用し、集約可能なverification failureでは`overallPassed=false` reportを必須化。
- 追加監査でpopulation performanceを600→2000→5000の逐次child実行へ固定し、same-seed run-metadataは非決定exact 3 fieldだけ除外したproduction canonical比較、`Math.random`はcall expressionだけのtoken-aware scanへ固定。
- `S1-SPEC-0.1.20`は非bump。ゲーム仕様・wire shapeは変更していない。

## 概要

このファイルは **Wiki全体（全Sprint共通）** の更新履歴だけを記録する。ゲーム仕様の変更履歴（[`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md)）とは別である。

## 履歴

### 2026-08-11 — S01-008 受入完了status同期

- 版番号は`S1-SPEC-0.1.20`のまま（仕様本文・コード・テストは変更しない）
- S01-008を**implemented / accepted**へ同期（Wiki current-stateのみ）
- S01-009はpending／未着手。Sprint 1全体は未完了
- 過去のchangelog履歴にある「当時受入監査中」記述は歴史記録として維持

### 2026-08-10 — S01-008 最終受入監査修正3（promotion equal-id／years=0 options）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- S01-008は引き続き**implemented / 受入監査中**（acceptedへ上げない）
- provisionalSimulationIdとfinalSimulationIdの「必ず異なる」制約を削除（promotionはidentity確定境界）
- `runSprint1Years`開始時に`legacyProcessors` validationを実施（years=0でもreserved ID reject）

### 2026-08-10 — S01-008 受入監査修正2（legacyProcessors境界／reload全文bind）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- S01-008は引き続き**implemented / 受入監査中**（acceptedへ上げない）
- `legacyProcessors`へSprint1 transactional adapter ID（`weekly-training`）を注入した場合はweekly adapter実行前にreject。`processorId` getter非実行
- `runSprint1Years`はyears=0でも開始時に`validateSprint1RunSession`必須
- rename前reloadでfixed7 `expectedContents` exact bindに加え、final-world／initial-world／events／run-metadata／validation-reportの独立semantic bindを強化
- battle commit → week reset → fixed7 一本回帰を追加。`legacyProcessors`はWorldEngine補助hook専用と明記

### 2026-08-10 — S01-008 受入監査修正1（session/structural/output projection）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- S01-008は引き続き**implemented / 受入監査中**（acceptedへ上げない）
- `commitRunBattlePlan`でstored `structuralValidation`をhash materialへbind。descriptor-safe snapshot／hostile getter拒否
- `validateSprint1RunSession`をinit／weekly／battle境界へ配線。`eventAllocationState.nextSequence === eventStream.length`等
- provisional initial eventのsimulationId bind、initial-world sidecar投影ownerをcontextへ揃える
- validation-report／rename前reloadがactual projectionを検証。非空BattleResult fixed7回帰

### 2026-08-10 — S01-008 production実装完了（受入監査中）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- S01-008を**implemented / 受入監査中**へ更新（accepted前）。S01-009はpending／未着手。Sprint 1全体は未完了
- production実装: `createSprint1RunSession`／`runSprint1WeeklyStep`／`runSprint1Years`／`commitRunBattlePlan`／weekly-training adapter（legacy WorldProcessor非登録）／CLI `--sprint1-input`／fixed7 Sprint1 writers（run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0）
- fixtures: `apps/simulator/fixtures/sprint1/`
- Wiki: S01-008／tasks index／sprint1／architecture（processing-flow／world-engine／output-contract／battle-lifecycle）／backlog／SPEC_PREPARATION_PLANを追随

### 2026-08-09 — S1-SPEC-0.1.20 受入監査修正5（battleResults store／final-world投影）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- `Sprint1RunRuntimeState.battleResults`をrun全体canonical storeとして追加。week registryと役割分離
- final-world 0.3.0へ`battleResults`全文投影（0.4.0非bump）。retention削除未実装。events.jsonlへturn詳細非複製
- week suffix invariant／`cloneRuntimeState` getter非実行

### 2026-08-09 — S1-SPEC-0.1.20 受入監査修正4（adapter境界／document schema投影）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- weekly-trainingはSprint1 transactional adapter ID／`sourceProcessor`であり、legacy WorldProcessor／`RunWorldOneWeekInput.processors`へは登録しない
- document schema: initial-world `0.4.0`（`initialWeeklyTrainingSidecarSnapshot`）、final-world `0.3.0`（`weeklyTrainingSidecars`）
- `Sprint1RunContext`最終shapeに`initialWeeklyTrainingSidecarSnapshot`。runtime checkpoint vs projectionを明文化
- fixed7は exactly 7 files

### 2026-08-09 — S1-SPEC-0.1.20 受入監査修正2（BattleResultWeekState／RNG labels／processorRuntimeStates）

- 版番号は`S1-SPEC-0.1.20`のまま
- `BattleResultWeekState`／battle World RNG `battle/world-rng`／weekly-training RNG `processor/weekly-training`／`processorSpecificStates`最小拡張
- fresh new-run初期化を21ステップへ更新。S01-008再判断禁止契約を追記

### 2026-08-09 — S1-SPEC-0.1.20 受入監査修正1（promotion／EventAllocation／S01-007 current-state同期）

- 版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）
- S01-001〜007をimplemented／acceptedへ同期（S01-007受入完了commit `a39e476`）。現在は0.1.20 clarifier中
- fresh Sprint 1 initialization promotion／`EventAllocationState`／`eventStream` ownerを正本化
- SimulationIdentity 0.3.0専用legacy readerはrepositoryに無く新設しない旨を明記
- 過去日時点の「当時S01-007受入監査中」履歴エントリは歴史記録として維持

### 2026-08-09 — S1-SPEC-0.1.20 S01-008 integration contracts clarification

- Sprint 1ミニ仕様を`S1-SPEC-0.1.20`へ版上げ。S01-008着手前の統合契約を明文化
- `weekly-training` literal／production adapter pipeline`[weekly-training]`／`Sprint1RunRuntimeState`／`InitialWeeklyTrainingSidecarSnapshot`／SimulationIdentity `0.4.0`＋`initialWeeklyTrainingSidecarHash`／CLI `--sprint1-input`／run-metadata `0.4.0`（当時の記述: initial-world／final-world非bump。fix4でinitial-world 0.4.0／final-world 0.3.0へ更新）
- S01-008はpendingのまま。WorldEngine／CLI配線は未実装。foundation契約テストを追加
- Wiki: S01-008確定契約一覧、sprint1／architecture／glossaryを追随

### 2026-08-09 — S01-007 受入監査修正2進行（0.1.19 abort配線／validator bind）

- S01-007 production WIPを`S1-SPEC-0.1.19`上へ復元。受入監査中・未commit（当時の履歴）
- `BattleExecutionAbortError` production配線、BattleResult top-level↔finalState bind、structuralValidation全field bindを実施中
- 次はS01-008（WorldEngine commit）

### 2026-08-09 — S1-SPEC-0.1.19 post-start execution abort 契約clarification

- Sprint 1ミニ仕様を`S1-SPEC-0.1.19`へ版上げ。`runBattleToCompletion`の3 result kindを維持し、start後のdependency／invariant failureを`BattleExecutionAbortError` throwとして明文化
- `dependency_failure`／`internal_invariant_violation`、原子的abort、S01-008でのcommit禁止を固定
- Sprint1Config balance／SHAは不変

### 2026-08-09 — S01-007 受入監査修正1（BattleResult validator／post-start分類／structuralValidation）

- `validateBattleResult`を元データ独立再計算で実装し、`finalizeBattleResult`から接続
- start成功後のprepare／resolver failureを`pre_start_failure`へ落とさず`resolution_error` commitPlanへ分類
- `RunBattleCommitPlan.structuralValidation`をbusiness／構造整合まで完成（`commitPlanHash`循環なし）
- `battle.finished` failed summaryは`finalState.failure`正本（`validation.violations[0]`不使用）

### 2026-08-09 — S1-SPEC-0.1.18 BattleResult決定的契約clarification

- Sprint 1ミニ仕様を`S1-SPEC-0.1.18`へ版上げ。BattleSummaryLog下位型、battleExperienceSummary、判定同点比較式、seeded RNG tie-break、戦闘mastery適用順を正本へ固定
- Sprint1Config balance／SHAは不変。S01-007 production実装は未着手（pending）
- BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-09 — S01-006 受入監査修正5-4（custom injury実delta／guard reducedBy受入テスト）

- custom minor／major injury受入を、ログ自己生成cursorではなく実際のparticipantB.injury前後差（7／19）で検証
- guard reductionを、公開純関数で再計算したguard適用前normalDamageから`applyGuardedDamage`のreducedBy／guardedDamageを独立確認
- 不要になった`injuryCursorAfterLogs` helperを削除
- BattleResult／WorldEngineは未実装。S01-007はpending／未着手のまま

### 2026-08-09 — S01-006 受入監査修正5-3（受入テスト意味成立／成果物一時領域整理）

- default strategy coordinated tamperを、canonical candidateScores維持＋別basic_attack profileのunique最高scoreへ相互整合する構造へ修正（validateBattleActionLog成功後にprovenance再導出で拒否）
- custom injury境界をminor／major／unableToContinueThresholdの3必須ケースへ分離
- evade／guard境界に原因条件（withoutEvade counterfactual／reducedBy経路）を明示assert
- packaging scratchはOS一時領域のみ（worktree直下のartifact scratchを残さない）
- BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-09 — S01-006 受入監査修正5-2（requestedAction制約／strategy provenance／tamper強化）

- `BattleActionLog.requestedAction`をBattleAction限定。`no_action`はresolvedAction専用（validate／replay／replacementで拒否）
- strategy metadataのログ自己正当化を廃止。scriptedはnull三項目、defaultはDefaultBattleStrategy再導出（`derive-battle-action-request.ts`共用）
- coordinated tamper（消費2ターン／priority構造整合／別battleSeed完全chain／final bind technique use counts）と正常境界replayを強化
- BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-09 — S01-006 受入監査修正5-1（replay意味再計算／battleSeed連続RNG）

- ActionLog after／delta／判定結果を状態遷移入力にせず、sourceSnapshot baseline＋RunRuleSnapshot＋catalog＋共有`resolveOneAction`から期待結果を導出して比較
- RNGを`createSeededRng(battleSeed)`へ根付け、全turn／actionで連続消費。ログ記載beforeから個別再開しない
- successfulEvasions／successfulDefenses／advantageをResolverと一致する意味導出へ修正
- BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-08 — S01-006 受入監査修正5（sourceSnapshotHash常時検証＋DetailedLog replay）

- mid-battleでも`hash(sourceSnapshot)===sourceSnapshotHash`を常時検証（turnNumber=0限定省略を廃止）
- `sourceSnapshot`＋`BattleDetailedLog`（＋検証済みRunRuleSnapshot）からbattle-local最終状態を再生照合するreplay validatorを実装（その後fix5-1で意味再計算済み）
- `resolveBattleTurn`は実行前／成功前にreplay検証。BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-08 — S1-SPEC-0.1.17 戦闘開始sourceSnapshot baselineの明確化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.17`へ版上げ。`BattleParticipantSnapshot.sourceSnapshot`（戦闘開始baseline）を正本へ固定し、戦闘中も`sourceSnapshotHash`を常時検証可能とする
- 不変currentフィールド／techniques不変部の一致、可変（`currentMental`／`injury`／use counts／battle-local runtime）を分離。BattleState schema `0.5.0`→`0.6.0`
- Sprint1Config balance／SHAは不変
- Sprint 1全体は未完了。次はS01-007（S01-006 productionターンResolverは別エントリどおり実装済み）

### 2026-08-08 — S01-006 受入監査修正4（committed／PreparedTurn分離とログbind）

- committed BattleStateは`turnNumber===logs.length`のみ。PreparedTurn.stateViewは専用経路でlength+1を許可
- TurnOrder↔ActionLogのpriority／score bind、range履歴chainを追加
- BattleResult／WorldEngineは未実装。次はS01-007

### 2026-08-08 — S01-006 受入監査修正3（ログ契約）

- `actionSequence`を0始まりへ修正。DetailedLog履歴検証（連続性・RNG chain・BattleState bind）を完成
- TurnOrderLog／StrategyCandidateScores／ActionLog意味相関を厳密化。Resolver経路のmovementChance goldensを追加
- BattleResult／WorldEngineは未実装。次はS01-007。Sprint 1全体は未完了（S01-001〜006 implemented）

### 2026-08-08 — S01-006 戦闘ターン解決を実装（fix2）

- productionターンResolver（`prepareBattleTurn`／`resolveBattleTurn`／`DefaultBattleStrategy`）を実装
- 負傷判定→`rangeShift`の適用順、`BattleActionLog.movementChance`のproduction実装（`S1-SPEC-0.1.16`）、ActionLog完全検証を反映
- BattleResult／WorldEngineは未実装。次はS01-007。Sprint 1全体は未完了（S01-001〜006 implemented、S01-007〜009 pending）

### 2026-08-08 — S1-SPEC-0.1.16 BattleActionLog.movementChanceの明確化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.16`へ版上げ。対抗式の離散一様`movementRoll`から事前成功率`movementChance`（floor整数パーセント0..100、RNG非消費）を正本へ固定
- 判定時は双方non-null、非movement時は双方null。移動RNG数・判定式は変更なし
- Sprint1Config balance／SHAは不変。当時はS01-006 productionターンResolverは未実装だった（その後S01-006で実装）
- 当時の次着手はS01-006。Sprint 1全体は未完了

### 2026-08-08 — S1-SPEC-0.1.15 移動状態補正の明文化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.15`へ版上げ。`moverStateModifier`／`opponentStateModifier`の明示式（`battle.actionOrder`係数共用）を正本へ固定
- Sprint1Config balance／SHAは不変。当時はS01-006 productionターンResolverは未実装だった（その後S01-006で実装）
- 当時の次着手はS01-006。Sprint 1全体は未完了

### 2026-08-08 — S1-SPEC-0.1.14 戦闘ターン入力契約の明文化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.14`へ版上げ。`BattleActionReplacementReason`完全enum、`battle-action-script-0.1.0`完全構造、技使用回数（attempted／successful）契約を正本へ固定
- Sprint1Config balance／SHAは不変。当時はS01-006 productionターンResolverは未実装だった（その後S01-006で実装）
- 当時の次着手はS01-006。Sprint 1全体は未完了

### 2026-08-07 — S01-005 戦闘開始・BattleState生成を実装

- `match-id-generator-0.1.0` のproduction実装（形式・state 5キー・予約遷移・canonical state hash・枯渇sentinel）。MatchId操作でRNGを消費しない
- `RunRuleSnapshot` `0.4.0`／`BattleRulesSnapshotRef` `0.1.0`／`BattleActionSourceIdentity` `0.1.0`／`BattleState` `0.5.0`／`StartBattleRuntimeTransition` `0.1.0` を追加
- 参加資格・年齢整合・負傷続行不能閾値・`currentMental`非clamp・開始耐久の基準点整数計算を実装
- `startBattleTransaction` は未commit計画のみを返す内部純粋関数。成功時だけWorld RNGを1回進め、両next stateを1つのruntime transitionへ封入する
- `reserveNextMatchId`／`createBattleState`／`beginBattle`／`startBattleTransaction`／runtime transition適用APIはpackage rootへ公開しない
- ターン解決・BattleResult・WorldEngine登録は対象外
- 次はS01-006。Sprint 1全体は未完了

### 2026-08-07 — S1-SPEC-0.1.13 MatchId決定的生成器契約の明文化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.13`へ版上げ。MatchId形式・GeneratorState・予約遷移・seed役割・canonical hashを正本へ固定
- Sprint1Config balance／SHAは不変。MatchId生成器／S01-005戦闘開始は未実装
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-07 — S01-004 最終イベント契約修正（technique unit）

- `technique.learning_progressed`へ`unit: "tenths"`、`technique.mastery_increased`へ`unit: "hundredths"`を追加
- `technique.acquired`は既存payloadのまま（unit／before／afterなし）
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 最終受入監査修正2（年齢境界／teacher CareerStatus／公開API）

- 正式訓練対象を`isFormalTrainingEligible`（8..41）へ揃え、42歳以上はrest限定
- teacher contextの`masterCareerStatus`をS01-003と同じCareerStatus列挙で完全検証
- package rootから内部draft／effect／commit前validatorを除外
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 受入監査修正（inactive state／focus／post-validation／Person境界／rng harden）

- inactiveを含む全人物へ`Sprint1PersonState`を必須化。欠落は週全体failure
- 週開始時の`normalizeWeeklyLearningFocus`、effect後の`validateProcessedWeeklyPersonRecord`、`Person`構造検証、`validateSeededRngState`を追加
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 週間行動・訓練・技習得を実装

- 週間行動列挙・強制休養／fallback理由・整数`scoreHundredths`・`multiplyBasisPointsFloor`・`drawInclusiveBasisPoints`・`TrainingProcessorRuntimeState`・`processWeeklyTrainingWeek` を追加
- 週開始スナップショット凍結、週単位の原子性、同一週再処理／週番号逆行の拒否を実装
- 正本10・14がルールを定義していない入力（planner context score、師匠推薦度、styleMatch、相性など）は sidecar 入力として受け取り、処理側で導出しない
- イベントはcandidateのみ。EventEnvelope化とWorldEngine登録は S01-008
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-05 — S1-SPEC-0.1.12 最終受入監査修正（整数score・RNG BP・一括floor・acquirable・累積）

- LearningTarget／PracticeTargetの整数`scoreHundredths`、効果RNGの`drawInclusiveBasisPoints`、`multiplyBasisPointsFloor`、`acquirable`週間契約、RuntimeState累積、行動別イベントfixtureを正本へ追補
- Wikiの「Sprint 1実装未着手」旧記述を削除。`2800d3b`は`S1-SPEC-0.1.11`確定commitと明記
- **実装ではない**。仕様版は`S1-SPEC-0.1.12`のまま（0.1.13へ上げない）。次の実装着手はS01-004
- 詳細は [`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md) の同日エントリを正とする

### 2026-08-05 — S1-SPEC-0.1.12 週間処理仕様の未確定事項を明文化（clarification）

- Sprint 1ミニ仕様を`S1-SPEC-0.1.12`へ版上げ。週間Plannerの強制休養／rest fallback／scoreHundredths／RuntimeState／event責務順などを正本へ補完
- **実装ではない**。S01-004の週間Processor実装は別タスク
- 詳細は [`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md) の同日エントリを正とする

### 2026-08-05 — S01-003 最終受入監査修正2（provider境界／検証順）

- `validateTechniqueCatalogAgainstIdentity` は expectedIdentity を先に検証し、不正時は SHA provider を呼ばない
- `validateSprint1PersonTechniqueSemantics` は Sprint1PersonState 構造を catalog より先に検証し、不正時は SHA provider を呼ばない
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-003 受入監査修正（teacher定義結び付け／progress cap／safe mentalCost／context harden）

- `teacherCanTeach(definition, context)` へ変更。閾値は `TechniqueDefinition.teachingProficiencyRequired` のみ。師匠状態の TechniqueId 一致を必須
- `deriveLearningTargetStatus` は定義と state の TechniqueId 一致、および progress の `0..cap` を強制（cap+1 は failure）
- `mentalCost` を safe integer に限定。`TechniqueSemanticsPersonContext` は `spiritSurfaceValue` のみへ harden
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-003 技カタログ・熟練度・習得状態を実装

- `TechniqueDefinition`／`TechniqueCatalogIdentity`／`TechniqueCatalog`、catalog hash、参照整合、PersonTechniqueState 意味validation、習得条件、LearningTargetDerivedStatus、requiredStatsFactor、mastery 参照、teacherCanTeach、basicAttackProfiles 分離を追加
- 正式な production 技一覧は未作成。週間更新・RNG・戦闘・WorldEngine は未実装
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-002 最終受入監査修正（fresh initial date 固定）

- `attachSprint1PersonStateToInitialWorld` は `worldDate` が 1年4月第1週・absoluteWeek=0 のときだけ成功
- 有効な途中／checkpoint world（週送り後）を adapter 固有条件で拒否。日時巻戻し・ID再採番なし
- `cloneWorldEngineState` による validate／clone／revalidate を再利用
- Sprint 1全体は未完了（次はS01-003）

### 2026-08-04 — S01-002 受入監査修正（初期化adapter入力検証）

- `attachSprint1PersonStateToInitialWorld` が付与前に `validateWorldEngineState` で世界全体を検証
- raw Person 部分読み／spread を廃止し、検証済み Person を clone してから `sprint1State` を付与
- getter／class／symbol／Proxy／必須欠落／参照壊れの negative 試験を追加
- Sprint 1全体は未完了（次はS01-003）

### 2026-08-04 — S01-002 人物能力・成長状態を実装

- `Sprint1PersonState`（4項目）／一時状態VO／成長端数／GrowthProfile／InjuryStage／factor selector／週間適格predicate／`attachSprint1PersonStateToInitialWorld`を追加
- Personへ`sprint1State?`のみ追加。growthPotential等のWorldState本統合はS01-008へ送る
- S01-003へカタログ意味validation、S01-004へ週間更新を引渡し。Sprint 1全体は未完了

### 2026-08-04 — S01-001 第5回受入監査修正（単位契約）

- weeklyPlanner の整数 score 罰／上限と strategy の整数 surrender score／threshold を `number` に修正（BasisPoints誤分類を解消）
- BasisPoints は小数 factor／ratio／multiplier／per-point 係数のみ。field名に weight があっても整数 score は number
- `countNumericLeaves` を package root から非公開化。型契約テストを追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-04 — S01-001 第4回受入監査修正（厳密basis points／API境界）

- basis points変換は `value * 10000` が safe integer の場合だけ成功（Math.round／許容差なし）
- raw／normalized ネスト型を分離。`BasisPoints` を normalized 係数 field に使用。無検証 brand API を削除
- `validateNormalizedSprint1Config` を追加。normalized clone／freeze は registry canonical 照合付き
- deprecated alias（`createDefaultSprint1Config` 等）と registry introspection を非公開化
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 第3回受入監査修正（basis points）

- raw `Sprint1ConfigInput`とnormalized `Sprint1Config`を分離。小数係数はvalidation時にbasis points整数化
- config hash／registryは正規化後canonical JSONを固定。固定SHA-256 fixtureを更新
- normalized configの全number leafはsafe integer。次はS01-002。Sprint 1全体は未完了

### 2026-08-03 — S01-001 第2回受入監査修正

- reflection全経路（getPrototypeOf／Array.isArray／length descriptor／ownKeys）をValidationResult failureへ変換
- public clone／freezeもvalidation経由の`ValidationResult`へ変更（getter／toJSON非実行）
- `sprint1-balance-0.2.0` canonical SHA-256固定fixtureとregistry不変化を追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 受入監査修正

- configVersion registryによる内容一意性、public hash入口のvalidation必須化、hardened plain-data snapshot／deep freeze、配列extra property拒否、RangeShiftAfterUse完全union、specVersions canonical正規化をWikiタスクへ反映
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 Sprint 1ドメイン型・設定基盤

- S01-001（TechniqueId／PersonTechniqueState保存型／Sprint1Config／canonical・hash／SimulationIdentity）を実装
- `PersonTechniqueState`保存型の所有境界（S01-001）を維持し、S01-003で再定義しない
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — Sprint 1実装バックログ定義 受入監査修正同期

- `PersonTechniqueState`保存構造の所有をS01-001へ明示するバックログ修正をWikiタスクへ反映
- S01-001／S01-002／S01-003の責務境界を同期
- Sprint 1 実装は未着手のまま

### 2026-08-03 — Sprint 1実装バックログ定義同期

- `docs/SPRINT_1_BACKLOG.md`（S01-001〜S01-009）定義に伴う Wiki タスク索引・ページ追加
- `tasks/index.md` の scope を `cross-sprint` へ変更
- Sprint 1 実装は未着手のまま（タスク定義のみ）

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期 受入監査修正

- `battle-result-and-log.md` の draw 記述を正本 13 の勝者決定規則へ修正
- 共通索引・運用ページの `scope` を `cross-sprint` へ変更
- 各索引概要を Sprint 0 限定表現から横断表現へ修正
- `governance.md` / `contradictions.md` を Wiki 全体・Sprint 横断の記載へ更新

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期

- Sprint 1 仕様 `S1-SPEC-0.1.11` 確定（commit `2800d3b959e575f57660c27b344507dd0e38ddb6`）に伴う Wiki 同期
- `sprint1-pending.md` を正式な `sprint1.md` へ変更
- 08〜14 の説明・索引・不変条件ページを追加
- Sprint 1 実装は未着手であることを明記

### 2026-08-01 — S00-011 LLM Wiki開発知識基盤

- `docs/wiki/` の基本構成を追加
- Sprint 0（`sprint0-complete` / `504fa3cc16346dd0c6480e8328e42518e68215d3`）の確定情報のみを収録
- 当時は Sprint 1 を pending 入口のみとしていた（本同期で正式ページへ置換）
- リンク・front matter・sources パス検証スクリプト `scripts/check-wiki.mjs` を追加

## 関連する正本

該当なし（Wikiメタ履歴）。

## 関連するコード

- `scripts/check-wiki.mjs`

## 関連するテスト

- `npm run wiki:check`

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [README.md](README.md)

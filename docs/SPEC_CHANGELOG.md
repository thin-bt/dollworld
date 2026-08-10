# 変更履歴

## 2026-08-11：S01-009 Sprint 1総合受入検証 clarification（管理資料）
- 追加監査で`verify:sprint1`のsub-gate順序を固定し、`npm run wiki:check`／`git diff --check HEAD`を独立commandとして明記。script起動方式は既存`verify:sprint0`のbuild／Node patternを踏襲し、新runner依存追加を禁止。
- 追加監査でverification `runs/<run-key>/`は`runCli`のoutputRootであり、fixed7は既存layoutの`<run-key>/<runId>/`に置くことを明記。runId階層のflatten禁止、各run-key成功時exactly 1 runId directoryを固定。
- 追加監査でofficial verifierのGit HEAD解決必須・`verify:sprint1`自身のtag操作禁止、weekly eventの`sourceProcessor=weekly-training` bind、Sprint1 performance warning code/scopeを固定。

- 再監査: weekly-training event actorを`EventEnvelope.entities.personIds` exact 1件へ固定。Sprint0 `performanceWarnings` wire型はS01-009で再定義せずaccepted report型／validatorを再利用。集約可能なfailureは`overallPassed=false` report必須。population performanceは600→2000→5000逐次child、same-seed run-metadataは非決定exact 3 fieldだけ除外したproduction canonical比較、`Math.random`はcall expressionのみtoken-aware scanへ固定。
S01-008受入完了後、S01-009を実装時再判断なしで開始できるよう、Sprint 1総合verificationの実行入口・検証matrix・completion report・clean-tree完了手順を管理資料へ明文化した。ゲーム仕様・wire shape・RNG・balanceの変更ではなく、`S1-SPEC-0.1.20`は非bump。

- current state: S01-001〜008 implemented / accepted（S01-008受入完了commit `7c47847`）、S01-009 pending／未着手、Sprint 1全体は未完了
- 正規入口`npm run verify:sprint1`、completion report `output/sprint1-verification/sprint1-completion-report.json`（verification schema `0.1.0`）
- same-seed 12345・100年×2、different-seed 12345 vs 54321の実体差、boundary seed 0／4294967295各1年×2、10／50／100／300年profile
- integrated scenarioはweekly→official participant自身の技状態更新event→更新済みPersonのbattle source反映→`official` battle（production `default_strategy`）→commit→次週registry reset→fixed7。自動battle scheduler／scripted actionによる結果固定は禁止
- population performanceはseed 12345固定で600／2000／5000人×100年。30秒／120秒warning、5000 measure only。性能超過aloneではfunctional failureにしないが、各profileのsession／invariant failureはfunctional failure
- verifierはexit 0/1、stale completion report防止、report atomic write／read-back validation、required gateのsilent skip禁止を契約化
- same-seed比較は05仕様の決定性除外規則を正本とし、存在しないS01-008 production comparator APIを前提にしない。verification-private comparatorはapps/simulator内部に限定
- accepted後はclean masterで再実行し、reportと実`git status`の双方がcleanであることを確認後、合格commitへ`Sprint 1`完了tag `sprint1-complete`を付ける。`_handoff-artifacts/`等のuntracked artifactは最終clean run前にrepository外へ退避または削除し、tag通過目的の`.gitignore`追加は禁止
- 再監査でrun分離は既存programmatic `runCli(...,{outputRoot})`を使用し新`--output-root` optionを作らないこと、integrated scenarioの技状態更新actorを実際のofficial participantへbindすること、performance seed=12345、共通status=`not_performed`表記、completion report自己SHA禁止、`verify:sprint1`自己再帰禁止、tag force move禁止を追加固定
- Sprint 0回帰warningはaccepted completion reportの`warningCount`＋`performanceWarnings`を正本とし、存在しないsource `warnings`配列を前提にしない。5000人measure-only profileはrequired functional gateとして成功時`passed`。integrated scenario fixed7はweekly exact 2回（`weeksExecuted=2`／`yearsExecuted=0`／yearly data row 0）へ固定

## 2026-08-09：S1-SPEC-0.1.20（S01-008 integration contracts clarification）

S01-008着手時に判明した正本未定義（週間processor literal／production processor配列／runtime root／weekly sidecar／CLI入力経路）と、外部sidecarをSimulationIdentityへbindする不足を明文化した。既存balanceの意図変更ではなく、統合契約の未定義解消である。WorldEngine／CLI本体配線は本clarifierの対象外（S01-008実装）。版番号は`S1-SPEC-0.1.20`のまま（0.1.21へ上げない）。受入監査修正1で初期化promotion／EventAllocation／S01-007 current-state同期／0.3.0 reader記述整理を、受入監査修正2で`BattleResultWeekState`／battle World RNG／weekly-training processorRuntimeStates物理ownerを、受入監査修正3で`processorSpecificStates` deep-clone／Sprint1 adapter境界／`Sprint1RunContext`／`WeeklyTrainingSidecarState`／developmentEffects適用先／weekly transaction最終順を、受入監査修正4でweekly-training／legacy WorldProcessor矛盾解消・document schema投影（initial-world 0.4.0／final-world 0.3.0）・`Sprint1RunContext.initialWeeklyTrainingSidecarSnapshot`最終shapeを、受入監査修正5でrun全体`battleResults` canonical store／final-world 0.3.0への`battleResults`投影／week suffix invariant／`cloneRuntimeState` getter非実行を同版へ追記した。

- production週間processor literalを`weekly-training`へ固定（Sprint1 transactional processor adapter IDかつ週間由来`EventEnvelope.sourceProcessor`と同一literal）。既存`WorldProcessor` interfaceは変更しない。production配列`[weekly-training]`はSprint1 transactional processor adapter pipelineのみを意味し、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`へは登録しない（二重実行禁止）
- Sprint 1 production normal-week adapter pipelineは`[weekly-training]`のみ。`battle-simulation`はpipeline外の明示的run／`commitRunBattlePlan` facade経由
- runtime-only root `Sprint1RunRuntimeState`最終論理shape: `worldState`／`worldRngState`／`matchIdGeneratorState`／`weeklyTrainingSidecars`／`processorRuntimeStates`／`eventStream`／`eventAllocationState`／`battleResults`／`battleResultWeekState`。加えてimmutable `Sprint1RunContext`と論理`Sprint1RunSession`
- `battleResults`: run全体のcommit順canonical BattleResult store。fresh `[]`。completed／`resolution_error`のみappend。`pre_start_failure`／abort／commit failureは非append。duplicate matchId reject。week advanceでは`battleResultWeekState.results`のみ`[]`へresetし、`battleResults`は保持。week.resultsはglobal suffixとcanonical一致必須。count sourceはweek registryのみ
- `Sprint1RunContext`最終shape: `sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecarSnapshot`／`simulationIdentity`(+hash)／`simulationId`／`runRuleSnapshot`(+hash)。context validationは外部`initialMatchIdGeneratorState`依存なし（identity seedから再構築）
- `EventAllocationState` 0.1.0／`BattleResultWeekState` 0.1.0。`matchesCompletedThisWorldWeekBeforeBattle`はparticipant別completed件数（`results.length`ではない）。`resolution_error`はregistry登録するがcompleted countへ加算しない
- battle World RNG label `battle/world-rng`、weekly-training RNG label `processor/weekly-training`。両stream分離。`ProcessorRuntimeState`へoptional `processorSpecificStates`を最小拡張（Sprint 0省略可）。`specificState`はplain JSON descriptor-safe deep-clone。`cloneRuntimeState`／entry getter非実行
- `WeeklyTrainingSidecarState`／`PersonTemporaryCondition` sidecar正本／developmentEffects物理適用先／`battleResultWeekState.absoluteWeek === worldDate.absoluteWeek`／weekly transaction最終順とEventEnvelope順
- fresh Sprint1 new-run初期化は21ステップ（promotion／RNG／processor runtime／EventAllocation／BattleResultWeekState／root束ね／adapter pipeline登録）
- `InitialWeeklyTrainingSidecarSnapshot` schemaVersion `0.1.0`（Person本体非複製・PersonId昇順・initial Worldと1:1・neutral default禁止・`motivationFactor`欠落拒否）
- `SimulationIdentity` schemaVersion `0.3.0`→`0.4.0`。必須field `initialWeeklyTrainingSidecarHash`を追加し、sidecar変更でsimulationIdentityHash／simulationIdが変わることを必須とする
- current new-run `validateSimulationIdentity`は0.4.0のみ受理。repositoryに0.3.0専用public legacy readerは無く、clarifierで新設しない。維持するlegacyはSprint 0 fixed7／EventEnvelope 0.1.0／`createSimulationId`／保存済みSprint 0 simulationId
- CLI新規optionは`--sprint1-input`のみ。`Sprint1CliInput` schemaVersion `0.1.0`（`schemaVersion`／`sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecar`）。path／mtimeはidentity材料にしない
- 文書schema: `run-metadata.json` Sprint1 new-run `0.4.0`、`initial-world.json` `0.3.0`→`0.4.0`（トップレベル`initialWeeklyTrainingSidecarSnapshot`）、`final-world.json` `0.2.0`→`0.3.0`（トップレベル`weeklyTrainingSidecars`＋`battleResults`を同一0.3.0最終shapeとして確定。0.4.0へ追加bumpしない）。**非bump**: `RunRuleSnapshot` `0.4.0`、`EventEnvelope` `0.2.0`、`InitialWeeklyTrainingSidecarSnapshot` `0.1.0`、`EventAllocationState` `0.1.0`、`BattleResultWeekState` `0.1.0`、`BattleResult` `0.5.0`
- runtime checkpoint vs projection: `Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。`weeklyTrainingSidecars`および`battleResults`（`detailedLog`含む全文）はfinal-worldへ、`initialWeeklyTrainingSidecarSnapshot`はinitial-worldへ投影。fixed7は exactly 7 files（`sidecar.json`／`battle-results.json`禁止）。events.jsonlへturn詳細非複製。Sprint 1ではretention削除未実装
- RunRuleSnapshotへsidecar全文／`initialWeeklyTrainingSidecarHash`を直接追加しない（`simulationIdentityHash`経由でbind）
- Sprint1Config構造・既定値・canonical SHAは不変。Sprint 0 CLI／legacy simulationId／固定7件数は不変
- 実装状態（当時）: S01-001〜S01-007はimplemented／accepted（S01-007受入完了commit `a39e476`）。この0.1.20 clarification当時はS01-008実装前。current stateは上記2026-08-11管理資料を参照

## 2026-08-09：S1-SPEC-0.1.19（post-start execution abort 契約clarification）

S01-007受入監査で判明した、`startBattleTransaction`成功後のdependency／infrastructure failure契約を明文化した。既存balanceの意図変更ではなく、結果型境界の未定義解消である。

- `RunBattleToCompletionResult`のpublic discriminantは`completed`／`resolution_error`／`pre_start_failure`の3種類のまま（第4kind追加なし）
- `runBattleToCompletion`はすべての障害をresult型へ変換する関数ではない
- start後に正規`RunBattleCommitPlan`を構築不能な場合は`BattleExecutionAbortError`をthrowする
- `failureKind`: `dependency_failure`｜`internal_invariant_violation`
- `stage`: `prepare_turn`／`resolve_turn`／`mark_failed_state`／`finalize_battle_result`／`build_commit_plan`
- start前のdependency／hash failureは従来どおり`pre_start_failure`
- start後の正規battle semantic／resolution failureでfailed plan完全構築可能な場合だけ`resolution_error`
- execution abort時はstartRuntimeTransition／started／finished／BattleResultを返却・commitしない（原子的破棄）
- dependency failure後の仮hash／空BattleResult／validation=false commit等のfallback禁止
- domain failure後のplan生成中dependency failureは`dependency_failure` abortへ昇格
- S01-008は`completed`／`resolution_error`のplanだけcommit可能。abort時はWorld RNG／events／participant sourceを変更しない
- Sprint1Config構造・既定値・canonical SHAは不変。S01-006 RNG順・行動解決は不変。BattleResult `resultKind`／`BattleEndReason`は不変

## 2026-08-09：S1-SPEC-0.1.18（BattleResult決定的契約clarification）

S01-007実装開始前に判明した、BattleResult周辺の未定義を明文化した。既存balanceの意図変更ではなく、決定性に必要な実装契約の明文化である。

- BattleSummaryLog下位構造（phaseSummaries／keyMoments／finalDurabilityRatios／finalMentalValues／judgeSummary／injurySummary）を固定
- battleExperienceSummaryを戦闘経験サマリー（非XP）として型固定。resolution_errorでは非生成
- 判定同点比較1〜5をBigInt交差積／直接比較で厳密化。PersonId順等を禁止
- 最終seeded RNG tie-breakを`nextInt(0, 2)`・0→A／1→B・正確に1回だけ消費と固定
- 戦闘使用masteryは全熟練度帯で現在値係数を適用し、attemptごとにfloor（一括floor禁止）
- Sprint1Config構造・既定値・canonical SHAは不変。S01-006 RNG順・行動解決は不変

## 2026-08-08：S1-SPEC-0.1.17（戦闘開始sourceSnapshot baselineの明確化）

S01-006実装開始前に判明した、戦闘中の`sourceSnapshotHash`検証とbattle-local可変フィールドの両立を明文化した。既存balanceの意図変更ではなく、参加者baseline契約の未定義解消である。

- `BattleParticipantSnapshot.sourceSnapshot`（`BattleParticipantSourceSnapshot`）を追加。戦闘開始時点の値をdeep-clone／freezeして保持する
- `sourceSnapshotHash = SHA-256(UTF-8 canonicalJson(sourceSnapshot))`。hash材料の意味・アルゴリズム・canonical内容は変更しない
- 戦闘中は常に`hash(sourceSnapshot)===sourceSnapshotHash`を検証する（`turnNumber=0`限定の省略を廃止）
- 不変currentフィールドはsourceSnapshotと完全一致。techniquesはTechniqueIdと学習／熟練／習得フィールドが一致し、use countのみ差分許可
- 可変を許可: `currentMental`／`injury`／technique use counts、および既存battle-local runtimeフィールド。これらは`sourceSnapshotHash`へ再入場しない
- `BattleState.schemaVersion` Sprint 1現行値を`0.6.0`へ上げ、新規`0.5.0`を拒否
- 最終battle-local状態検証のcanonical baselineは戦闘開始`sourceSnapshot`＋`BattleDetailedLog`。具体的replay validatorはS01-006（本clarificationではログフィールドを新設しない）
- Sprint1Config構造・既定値・canonical SHAは不変

## 2026-08-08：S1-SPEC-0.1.16（BattleActionLog.movementChanceの明確化）

S01-006実装開始前に判明した、`BattleActionLog.movementChance`の未定義を明文化した。既存balanceの意図変更ではなく、ログ再生契約の未定義解消である。

- 対抗式の離散一様`movementRoll`から事前成功率`movementChance`を算出する契約を固定
- `movementChance`はfloor整数パーセント（0..100）
- approach／retreatの比較判定時は`movementChance`と`movementRoll`が双方non-null、非movement時は双方null
- `movementChance`算出はRNGを消費しない
- 移動のRNG消費数・判定式自体は変更なし
- Sprint1Config構造・既定値・canonical SHAは不変

## 2026-08-08：S1-SPEC-0.1.15（移動状態補正の明文化）

S01-006実装開始前に判明した、移動式の`moverStateModifier`／`opponentStateModifier`未定義を明文化した。既存balanceの意図変更ではなく、決定性に必要な実装契約の明文化である。

- `moverStateModifier`／`opponentStateModifier`の明示式（`battle.actionOrder.conditionPerPoint`／`fatiguePenaltyPerPoint`／`injuryPenaltyPerPoint`を共用）
- 移動専用の状態補正configキーを新設しない
- state modifierへ`consumptionPerformanceFactor`を掛けない
- `nextHitModifier`／`nextActivationModifier`は移動に影響せず、移動では消費しない
- 移動は解決時点の最新battle-local `condition`／`fatigue`／`injury`を使用（ターン開始スナップショットではない）。先手でinjuryが上昇した場合、後続移動は更新後のinjuryを使う
- 対比: `ActionOrderScore`はターン開始値を使用する
- golden cases: `0/0/0→0`、`20/0/0→+5`、`-20/100/100→-30`、mover／opponent独立
- RNG消費順・回数は不変
- Sprint1Config構造・既定値・canonical SHAは不変

## 2026-08-08：S1-SPEC-0.1.14（戦闘ターン入力契約の明文化）

S01-006実装開始時に判明した未確定ターン入力契約を明文化した。既存balanceの意図変更ではなく、決定性・replay・ログ互換性に必要な実装契約の明文化である。

- `BattleActionReplacementReason`完全enum（`unknown_technique`／`unlearned_technique`／`requirements_not_met`／`insufficient_mental`／`unusable_range`／`unable_to_act`／`opponent_ended_battle`）
- 置換優先順位と`invalidActionCountDelta`規則（`opponent_ended_battle`は0、他6理由は1）
- BattleAction canonical object形状（requested 8 variants、`no_action`はResolved専用）
- `battle-action-script-0.1.0`完全JSON構造（`scriptFormatVersion`／`turns`、各turnは`turnNumber`／`sideA`／`sideB`）
- scriptは1戦全体・全turn・両sideを保持。`turns.length = maxTurns`の完全連番としscript枯渇を禁止
- `canonicalScript`文字列（validated scriptの`toCanonicalJson`）と`actionScriptHash`（UTF-8 bytesのSHA-256）
- scripted modeでは両side同一script／同一hash／同一format versionを必須
- `attemptedUseCount`は技実行開始時（置換完了後・精神消費前）に+1
- `successfulUseCount`はactivation成功（命中結果は問わない）で+1
- `successfulUseCount <= attemptedUseCount`不変条件
- Sprint1Config構造・既定値・canonical SHAは不変

## 2026-08-07：S1-SPEC-0.1.13（MatchId決定的生成器契約の明文化）

S01-005開始時に判明したMatchId決定的生成器の未確定契約を明文化した。既存balanceの意図変更ではなく、決定性・checkpoint・未commit遷移に必要な実装契約の明文化である。

- MatchId形式 `match_<12桁の0埋め10進数>`（正規表現 `^match_[0-9]{12}$`）
- 数値部分の有効範囲 `1..999999999999`（`match_000000000000`は無効）
- `MatchIdGeneratorState.schemaVersion` `0.1.0`（field: schemaVersion／generatorVersion／namespace／seed／nextSequence）
- fresh run初期状態は `nextSequence=1`
- 枯渇sentinel `nextSequence=1000000000000`（新規発行不可）
- 予約成功時は `nextSequence` を `N+1` へ進める
- seedはstate hash／identity bindingに使用し、MatchId文字列へは混ぜない
- 異なるrunでは同じMatchId文字列を許可する（一意性は `(simulationId, matchId)`）
- pre-start failure／週rollback時は同一MatchIdを再試行可能
- state canonical JSON SHA-256を`initialMatchIdGeneratorStateHash`へ保存
- `matchIdGeneratorVersion`は`match-id-generator-0.1.0`のまま（発行規則変更時のみ版上げ）
- Sprint1Config構造・既定値・canonical SHAは不変

## 2026-08-05：S1-SPEC-0.1.12（週間Processor実装契約の明文化）

週間Processor実装開始時に判明した未確定事項を補完した。既存balanceの意図変更ではなく、決定性に必要な実装契約の明文化である。

- TrainingProcessorRuntimeState schema（`schemaVersion` `0.1.0`）
- actionCounts（4行動キー・inactive除外・processedPersonCount集計）
- forced／fallback reason（`WeeklyForcedRestReason`／`WeeklyRestFallbackReason`）
- battle `unableToContinueThreshold`との責務分離（週間Planner非使用）
- scoreHundredths整数式
- StatTargetScore weights統合
- growthPotential係数式
- motivationFactor入力契約
- mental exhaustion floor位置
- event責務順
- LearningTargetScore／PracticeTargetScoreの整数式（`LearningTargetScoreHundredths`／`PracticeTargetScoreHundredths`）
- 効果RNG BasisPoints生成（`drawInclusiveBasisPoints`、両端含む9000..11000）
- 複数係数の最終一括floor（`multiplyBasisPointsFloor`、sequential floor禁止）
- `acquirable`技の週間処理契約（効果RNG 0・初期mastery加算）
- RuntimeState累積契約（週ごと上書き禁止・`next = previous + currentWeek`）

上記のうちLearningTarget／PracticeTarget整数式・効果RNG・一括floor・acquirable・RuntimeState累積は、S1-SPEC-0.1.12受入監査での追補であり、別仕様版（0.1.13）へ上げない。Sprint1Config構造・既定値・canonical SHAは不変。

## 2026-08-03：Sprint 1実装バックログ受入監査修正（管理資料）

- `docs/SPRINT_1_BACKLOG.md`で`PersonTechniqueState`保存構造の所有をS01-001へ明示し、S01-002／S01-003の責務境界を明確化した。
- `docs/SPEC_INDEX.md`のS01-001参照へ09（保存型定義部分のみ）を追加した。
- 依存順`S01-001 → S01-002 → S01-003`は維持。タスク数の増減なし。
- 仕様版`S1-SPEC-0.1.11`自体の内容変更はない（08〜14の本文変更なし・版上げなし）。

## 2026-08-03：Sprint 1実装バックログ定義（管理資料）

- `docs/SPRINT_1_BACKLOG.md`を追加し、実装タスクS01-001〜S01-009の依存順・対象／対象外・受入条件を定義した。
- `docs/SPEC_INDEX.md`へS01タスク参照を追加した。
- `docs/SPEC_PREPARATION_PLAN.md`へ、仕様定義済み・Wiki同期済み・実装バックログ定義済み・実装未着手・次はS01-001から開始、を反映した。
- 仕様版`S1-SPEC-0.1.11`自体の内容変更はない（08〜14の本文変更なし・版上げなし）。
- 本変更は管理資料追加であり、Sprint 1実装完了を意味しない。

## 2026-08-01：Sprint 1受入監査修正（S1-SPEC-0.1.11）

- Sprint 1ミニ仕様を`S1-SPEC-0.1.10-draft`から正式版`S1-SPEC-0.1.11`へ確定。SimulationIdentity.specVersionsのsprint1版も同値へ更新。
- `BaseStat`をSprint 0公開型`AbilityKey`（`stamina | strength | skill | speed | spirit | magic`）へ完全統一。`vitality`／`technique`を基礎能力キーとして使用しない。
- `TechniqueCategory`／`BasicAttackProfile`／`DomainAptitude`を`unarmed | sword | magic`へ統一し、`martial`と暗黙対応を廃止。
- 戦闘開始時の`currentMental`は0..maxMentalの整数検証のみとし、範囲外は開始前失敗。clampによる補正を禁止。
- 戦闘命中・移動式の能力参照名を`skill`へ統一。
- `SPEC.md`冒頭へSprint 0／Sprint 1ミニ仕様版を併記。`SPEC_INDEX.md`へSprint 1領域索引を追加。`SPEC_PREPARATION_PLAN.md`へ08〜14の作成・受入監査済み状態を記載。

## 2026-08-01：Sprint 1仕様統合（SPEC-0.1.2／S1-SPEC-0.1.10-draft）

- ゲーム仕様を`SPEC-0.1.2`へ更新。Sprint 0ミニ仕様は`S0-SPEC-0.1.5`を維持。
- Sprint 1ミニ仕様`S1-SPEC-0.1.10-draft`として`docs/specs/08`〜`14`を追加（成長、技、修行・習得、戦闘状態、ターン解決、結果・ログ、Sprint 1設定スキーマ）。
- 現役年齢の境界を明確化し、41歳を現役最終年齢、42歳到達時の4月第1週年初処理での強制引退、公式戦参加可能年齢を16〜41歳へ統一。
- 成長年齢係数を35〜41歳帯へ合わせ、42歳以上の正式訓練係数を0とした。
- 技の必要能力と前提技・前提熟練度を分離し、戦闘内消耗区分（小技・中技・大技・奥義）と習得難度を別管理とした。
- 基礎最大耐久`100+体力`、最大精神力`50+精神`、試合内消耗0〜100と消耗帯補正、人物AIによる降参、`unable_to_continue`を定義。
- 戦闘識別子に`MatchId`を使用し、戦闘RNG（World RNGからのbattleSeed、Resolver連続消費、Strategy派生seed）の再現性契約を追加。
- Sprint 1新規run向けに`SimulationIdentity` schemaVersion `0.3.0`を追加。Sprint 0の既存`simulationId`材料式はlegacy契約として維持する。
- `RunBattleCommitPlan`によるWorld RNG／MatchId生成器／人物効果／開始・終了イベント候補／BattleResultの原子的commit契約を追加。
- `structuralValidation`と`commitPlanHash`の検証工程を分離し、structuralValidationはcommitPlanHashを検証せず、確定後にcommitPlanHashを計算する。
- 固定7出力ファイルを維持し、`initial-world.json`へ`RunRuleSnapshot`を1件保存する。Sprint 1人物一時状態の初期値（現在精神力・技状態・重点習得技）を追加。
- EventEnvelopeは新規runで`0.2.0`（必須`matchIds`、`battle.started`／`battle.finished`）とし、既存`0.1.0`の読込契約は維持する。

## 2026-07-31：world.year_stats_finalized追加とイベント基盤同期

- Sprint 0ミニ仕様を`S0-SPEC-0.1.5`へ更新（ゲーム仕様は`SPEC-0.1.1`のまま）。
- `simulationId`材料を`SPEC-0.1.1|S0-SPEC-0.1.5|...`へ更新。
- S00-004の`year_stats_finalized`遷移を`world.year_stats_finalized`へ対応付け、payloadと3月第4週の日時規則を03ミニ仕様へ追加。
- 01発生イベント一覧へ`world.year_stats_finalized`を追加。

## 2026-07-31：16歳正式デビューと最低ランク付与の確定

- ゲーム仕様を`SPEC-0.1.1`、Sprint 0ミニ仕様を`S0-SPEC-0.1.4`へ更新。
- 16歳到達時に正式デビューし、共通ランク定義の最低ランク（現在の体系ではF）を`currentRank`と`highestRank`へ付与する仕様へ統一。
- デビュー時期を人物AIが遅らせる記述を削除し、人物AIはデビュー後の大会選択などを判断するよう整理。
- `simulationId`材料の仕様版文字列を`SPEC-0.1.1|S0-SPEC-0.1.4|...`へ更新。
- `canDebut`を未デビュー人物（childまたはtrainee）だけに限定。
- `person.debuted`をSprint 0イベントへ追加。
- 年初加齢対象を存命かつ活動中へ明確化。
- 過去年への年齢逆行を拒否。

## 2026-07-30：AI開発スターター再監査（第5回・最終）

- Node.js公式配布を再確認し、前回指定した24.18.1は未公開であることを確認。S00-001の最低版を、2026-07-30時点で取得可能な24系最新LTS `>=24.18.0 <25`へ戻した。
- 技術決定を`TECH-0.1.4`へ更新し、README、技術決定書、S00-001タスク、実行プロンプト、監査報告を再同期。
- 配布ZIPは38ファイル揃っていた一方、同名の展開フォルダが25ファイルへ欠落していたため、ZIPの完全版から38ファイルへ復元。
- 展開フォルダ、再作成ZIP、別ディレクトリへの再展開版について、ファイル一覧・SHA-256・CRC・JSON・UTF-8・LF・内部参照・正本コピー・名前データを再検証。

## 2026-07-30：AI開発スターター再監査（第4回）

- 7月27日のセキュリティリリース告知を公開済み版と誤認し、一時的に未公開のNode.js 24.18.1を指定した。この指定は同日の第5回再監査で撤回。
- 技術決定を`TECH-0.1.3`へ更新し、README、技術決定書、S00-001タスク、実行プロンプトのNode.js指定を統一。
- S00-001へ不足していた「入力」「出力」を追加し、S00-001〜S00-010の個別タスク構成を統一。
- ZIP再展開、CRC、JSON、UTF-8・LF、内部参照、正本コピー、名前件数・重複・ハッシュを再検証。

## 2026-07-29：AI開発スターター再監査（第3回）

- Sprint 0ミニ仕様を`S0-SPEC-0.1.3`、設定スキーマを`0.2.3`、Sprint 0バックログを`S0-BACKLOG-0.1.2`へ更新。
- S00-002〜S00-010をタスクテンプレートと同じ構成へ統一し、変更可能範囲、入出力、必須テスト、必須コマンド、完了報告を明記。
- 初期世界生成の家系割当前に人物名を生成していた順序不整合を修正し、家系割当後に家名・表示名を確定する順へ変更。
- Seeded RNGのサブストリームlabel、候補選択、年齢・性別・ランク・師匠・能力・関係生成の決定規則を追加。
- 初期世界生成へ`Sha256Provider`注入を追加し、`simulation-core`とNodeの`node:crypto`実装の責務を一致。
- EventEnvelopeが参照するTournamentId・MatchIdをSprint 0の型専用予約IDとして定義。
- 固定7ファイルのcanonical JSON、UTF-8、LF、末尾改行、CSV列順を明文化。

## 2026-07-29：AI開発スターター再監査（第2回）

- Sprint 0ミニ仕様を`S0-SPEC-0.1.2`、技術決定を`TECH-0.1.2`、名前データを`NAMES-0.1.2`へ更新。
- 死亡済み人物と存命人物の状態項目、性別、基礎能力6項目・適性3項目の固定キー、親子・婚姻・師弟関係の向きを明文化。
- 42歳強制引退時にcurrentRankをretirementRankへ移し、highestRankを保持するルールを追加。
- 1週ステップを「現週終了→日時進行→年初処理」と定義し、100年4,800ステップと年次統計100行の境界を固定。
- 初期世界では世界1年のworld.year_startedを生成せず、eventIdをsequence+1から作る規則へ統一。
- 名前候補ハッシュを生ファイルではなく正規化JSONから生成する方式へ変更し、Windows等の改行差による誤検出を防止。
- Seeded RNGを`xoshiro128ss-v1`として新規ミニ仕様化し、golden sequence、派生seed、状態保存を固定。
- Sprint 0では外部実行時依存を追加せず、設定検証は明示的バリデータ、CLI引数解析はNode標準機能を使用する方針を追加。

> 現在の実装仕様は常に仕様書本体と最新の変更項目を優先する。2026-07-29の「全人物の出生・加齢時期を4月第1週へ統一」は、それ以前の人物別誕生週に関する記録を上書きする。

## 2026-07-29：AI開発スターター再監査

- Sprint 0ミニ仕様を`S0-SPEC-0.1.1`、技術決定を`TECH-0.1.1`、名前データを`NAMES-0.1.1`へ更新。
- 公開されていない`@eslint/js@10.7.0`指定を`10.0.1`へ修正し、Node.js 24.18.0同梱npm 11.16.0を基準化。
- 初回lockfile生成手順を`npm install --package-lock-only`後の`npm ci`へ修正。
- Prettierによる既存仕様・データの意図しない変更を防ぐ対象外ルールを追加。
- RunId、simulationId、worldIdの役割と決定的ID生成材料を統一。
- 関係生成割合の対象母数・丸め規則、初期イベント粒度、初期流派名生成を明文化。
- 家名と個人名で重複していた3候補を差し替え、manifestのSHA-256を更新。

## 2026-07-29：AI開発スターター最終整合性監査

- 正本へ仕様バージョン `SPEC-0.1.0`、Sprint 0ミニ仕様バージョン `S0-SPEC-0.1.1` を付与。
- AI開発スターター内に正本仕様書・変更履歴・技術決定書・仕様索引を実ファイルとして同梱。
- 人物別誕生週に関する旧記述をミニ仕様、イベント例、初期世界生成条件から削除し、全人物4月第1週出生・一斉加齢へ統一。
- PostgreSQLの旧記述を削除し、MySQL 8.x採用・Sprint 0はDB非依存へ統一。
- Sprint 0の出力を7ファイルへ統一し、初期年齢帯の16〜41歳／42歳以上の境界を修正。
- S00-001〜S00-010の個別タスクを作成し、S00-001実行プロンプトを追加。
- Node.js 24 LTS、npm workspaces、TypeScript 6.0系、Vitest、ESLint flat config、PrettierをSprint 0基盤として固定。

## 2026-07-29：NPC・家系の静的名前候補を追加

- システム生成するNPC、死亡済み祖先、家系の名前は、生成AIではなくバージョン管理された静的候補リストからSeeded RNGで選ぶ方針を追加。
- 初期候補数を家名200件、男性名400件、女性名400件、共通名100件とした。
- 個人名と家名を分離して保持し、表示名を「個人名・家名」とする。
- 初期家系の家名は重複なしとし、同時存命・同一家系の完全同名を回避する。
- ユーザー始祖の自由入力、禁止語、重複ルールは引き続き検討事項とした。

## 2026-07-28

- Word運用からMarkdown正本へ移行。
- 企画の核、自律進行、共有世界、血統・師系継承を統合。
- 技術体系を「格闘・剣技・魔法」に確定。
- 大会区分を「総合戦・魔法限定戦・剣技限定戦・格闘限定戦」に確定。
- 基礎能力を「体力・筋力・技量・速度・精神・魔力」の6項目に整理。
- 魔力を威力、精神を魔法・高度技の使用回数と安定性へ主に反映する仕様を追加。
- Webアプリ、共有世界のサーバ進行、AI実装用の技術構成を整理。

## 2026-07-28 能力設計詳細化

- 能力値の表示範囲と内部値の持ち方を追加。
- 基礎能力6項目が格闘・剣技・魔法へ与える具体的な影響を追加。
- 基礎能力、系統適性、技熟練度、成長素質の違いを明確化。
- 技データの参照能力、必要適性、必要熟練度、精神消費、難度を定義。
- 能力の成長、全盛期、衰え、血統継承、公開情報の方針を追加。

## 2026-07-28 年齢・人生段階ルール確定

- 原作準拠として、8歳から入門・修行可能とする仕様を追加。
- 16歳から競技デビュー可能とする仕様を追加。
- 18歳から自律的な引退判断を可能とする仕様を追加。
- 42歳を現役上限とし、未引退者は強制引退とする仕様を追加。
- 結婚・出産は引退後のみ可能とする仕様を追加。
- 人物の生涯、自律行動、引退後の役割、世界進行順、初期実装範囲、確定方針へ反映。

## 2026-07-28 婚外子仕様追加

- 出産は引退後のみ可能とする既存ルールを維持。
- 出産に結婚を必須条件とせず、婚姻関係にない人物間の子（婚外子）も発生可能とした。
- 婚外子も父母・親子関係・血統へ正式に記録し、能力継承上は婚内子と同じ扱いとした。
- 結婚判定と出産判定を別処理として整理した。
- 子の姓・所属家系・公開範囲などは今後の決定事項へ追加した。

## 2026-07-28 週・月・年の進行単位確定

- 世界の最小進行単位を1週間に確定。
- 1か月を4週間、1年を12か月・48週間に確定。
- 世界日時を世界年・月・週と通算世界週で保持する仕様を追加。
- 人物の年齢は誕生月・誕生週に到達した時点で加算する仕様を追加。
- 大会、入門、デビュー、引退、結婚、出産などを週単位で判定する方針を追加。
- 管理者の手動進行単位を1週・1か月・1年・10年として整理。

## 2026-07-28 4月出生ルール確定

- 世界の全人物を4月生まれに統一。
- ユーザー始祖、初期NPC、ゲーム内で誕生する子のすべてへ適用。
- 誕生週は4月第1週〜第4週のいずれかとして人物ごとに保持。
- 年齢は毎年4月の各人物の誕生週に1歳加算し、入門・デビュー・引退・現役上限の資格も同週から適用。
- 子の誕生イベントと出産判定は4月に限定し、5月〜翌年3月には出生イベントを発生させない。

## 2026-07-28 年初一斉開始ルール確定

- 世界年を4月第1週から翌年3月第4週までとする仕様を追加。
- 共有世界を世界1年・4月第1週から開始する仕様を追加。
- 世界開始時のユーザー始祖と初期NPCは全員同時に処理を開始する仕様を追加。
- 世界開始後の新規始祖は年途中から即時参加させず、次の世界年・4月第1週まで参加待機とする仕様を追加。
- 各世界年の4月第1週に、始祖の一斉参加、年間行動サイクル、大会日程、年間ランキング・記録集計を開始する年初処理を追加。
- 世界内で誕生する子は4月の自身の誕生週から処理を開始することを明記。
- 始祖の参加状態として、作成中・参加待機・活動中・停止を追加。



## 2026-07-28 結婚・出産・家系継承ルール追加

- 結婚・出産・家系継承の判定を、3月第4週から4月第1週へ移る年初処理で年1回実行する仕様へ統一。
- 恋人関係にある人物同士は、双方が引退済み・婚姻可能状態であれば年初に自動結婚する仕様を追加。
- 恋人でない人物同士も、個人相性・交流履歴・家系間交流回数・家系間好感度から結婚候補になる仕様を追加。
- 家系ペアごとに交流回数、好感度、最終交流年を保持する方針を追加。
- 出産判定は結婚判定の後に年1回行い、婚外子も同一条件で扱い、誕生週を4月第1週〜第4週へ割り当てる仕様を追加。
- 子の所属家系は父系を基本とし、父系継承不能または母系断絶救済時に母系所属を可能とする仕様を追加。
- 家系状態として存続・断絶危機・断絶・再興を保持し、母系直系子孫による家系再興を可能とする方針を追加。

## 2026-07-28 「再挑戦」の大会選択への統合

- 「再挑戦」を独立した週間行動から削除。
- 再挑戦は私闘ではなく、過去に敗れた相手が参加する公式大会を人物AIが選びやすくなる要因として定義。
- 対戦は原則として公式大会内のみとし、私闘・決闘は初期仕様に含めないことを明記。
- ライバル関係、自信、負けず嫌いが公式大会への再出場判断へ影響するよう記述を統一。

## 2026-07-28 師匠資格・門下人数・親子入門ルール追加

- 正式な流派師匠になれる人物を、引退後かつ一定以上の公式成績を収めた人物に限定。
- 師匠資格の具体的な成績基準はバランス調整項目として保持。
- 門下人数には世界共通の固定上限を設けず、人数が増えるほど門下生1人あたりの指導効率を係数で低下させる仕様を追加。
- 各師匠が性格、指導能力、後継者志向、許容効率から門下受入上限を自律設定する仕様を追加。
- 親は師匠資格の有無にかかわらず、直下の実子へ0〜7歳まで幼少期の影響を与えられる仕様を追加。
- 8歳時は、特別な理由がない限り、師匠資格を持つ親の門下へ優先所属する仕様を追加。
- 格上師匠への師事、親への反発、親子相性、系統不一致、親の受入上限などを親以外へ入門する例外条件として追加。
- 正式な師匠を持てない場合は親が一時指導を担当し、資格のない親は基礎訓練のみ行える仕様を追加。


## 2026-07-28 血縁制限・家系別出生率・初子ボーナス追加

- 従兄妹同士の結婚・出産を許可し、従兄妹を婚姻可能な最も近い血縁関係として定義。
- 直系親族、兄弟姉妹、異父・異母兄弟姉妹、おじ・おばと甥・姪の結婚・出産を禁止。
- 家系ごとに家系基準出生率を保持する仕様を追加。
- 各人物に個人出生率を持たせ、家系基準値、父母の個人値、変異から生成する仕様を追加。
- 父母の個人出生率を組み合わせた基準率へ、年齢補正、初子ボーナス、関係補正、世界人口補正を適用し、年1回判定する方式を追加。
- 実子がまだいない人物には初子ボーナスを与え、父母双方に子がいない場合はより強い補正を適用可能とした。
- 婚内子と婚外子で出生率・血統継承率に差を付けないことを明記。

## 2026-07-28 家系所属判定の拡張
- 子の所属を「原則父系だが固定ではない」方式へ変更。
- 婚外子は父系家系の受入判定を行い、子・後継者が多い、父が認知しないなどの場合は母系所属を可能とした。
- 父母両家の競技実績、名声、歴史、家系人数、父系所属後継者数、断絶リスクを比較して所属家系を決定する仕組みを追加。
- 母系の実績・名声が明確に高い場合や、母の家系で後継者が少ない場合、母系所属を優先可能とした。
- 同じ父母の兄弟姉妹が父系・母系へ分かれることを許可。
- 子の誕生イベントに父系受入可否、両家の所属評価値、最終所属理由を追加。

## 2026-07-28 大会形式・詳細戦闘ログ仕様追加

- 大会形式を総当たりまたはトーナメントとし、大会種別とは別属性で保持する仕様を追加。
- 総当たりは順位決定、トーナメントは昇格・王者決定などに利用する基本方針を追加。
- リアルタイム操作型ではなく、内部で行動・間合い・技・精神消費・状態変化を順番に処理する戦闘方式を追加。
- 対戦結果、対戦概要、詳細戦闘ログを別データとして保持する仕様を追加。
- 詳細戦闘ログに行動順、間合い、使用技、判定、精神消費、状態変化、決着理由を構造化して保存する仕様を追加。
- 世界イベントには対戦概要と詳細ログIDを保存し、詳細ログ本体は別データとして参照する構成へ変更。
- 原則として全公式対戦の詳細ログを保持し、長期運営時は削除ではなく圧縮・アーカイブを検討する方針を追加。

## 2026-07-28 表面能力・潜在遺伝値・隔世遺伝仕様追加

- 各基礎能力と格闘・剣技・魔法適性に、表面能力値とは別の顕在遺伝値・潜在遺伝値を持たせる仕様を追加。
- 表面能力は訓練、年齢、師匠、負傷などで変化し、潜在遺伝値は本人の能力へ原則直接加算しないことを明記。
- 父母それぞれの顕在・潜在遺伝値から子への継承値を選び、子の顕在値・潜在値を決める出生時遺伝処理を追加。
- 親に表れなかった祖先由来の潜在値が子や孫で顕在化する隔世遺伝を正式仕様化。
- 顕在・潜在遺伝値に由来祖先IDを保持できるデータ構造を追加。
- 遺伝内部値は通常非公開とし、祖先由来の可能性などを推定表示する方針を追加。

## 2026-07-28：最高位大会の開催周期案を追加

- F〜S・最高位の現行ランク体系を仮仕様として維持する方針を明記。
- 世界王者を決める最高位大会について、毎年開催案と4年に1回開催案を追加。
- 毎年開催は挑戦機会と年度ごとの王者史、4年周期は希少性と原作に近い周期性を重視する案として整理。
- 4年周期時の世界年区分、通常大会の継続開催、出場資格の基本方針を追記。
- 実装では `championshipCycleYears` により1年・4年を切替可能にする方針を追加。
- 開催周期、出場資格、周期実績、王者の在位表記は今後の決定事項として整理。

## 2026-07-28：詳細戦闘ログの保持期間
- 全公式対戦の結果・対戦概要・戦績は永久保存する方針を追加。
- 通常大会の詳細戦闘ログは直近4世界年を保持する仮仕様とし、1〜10年で設定変更可能とした。
- 最高位大会、各大会決勝、歴史的記録更新試合など重要対戦の詳細ログは100世界年保持する方針を追加。
- 保持期限経過後は詳細ログのみ削除または集約し、概要・戦績・記録は残す方針を追加。

## 2026-07-28：戦闘の行動順・間合い・判定骨格を確定
- 通常行動は速度を中心とした行動順評価で処理する方針を確定。
- 一部の技に優先属性を持たせ、通常の速度順へ割り込める仕様を追加。
- 双方が優先技を使用した場合は、優先度段階・速度・技特性で順序を決める方針を追加。
- 規定ターン以内に決着しなかった場合は判定勝ちとする仕様を確定。
- 間合いを密着・近距離・中距離・遠距離の4段階で管理する仕様を確定。
- 毎行動の選択肢を、技、通常攻撃、接近、距離を取る、防御、回避優先、精神を整える、降参の8種類で仮確定。
- ダメージ、試合中耐久、戦闘不能、試合後疲労・負傷の基本構造を追加。
- 判定勝ちを有効打、技成功、主導権、戦闘不能への接近度、防御・回避・反撃、大技、消極性から評価する方針を追加。
- 各行動の具体効果、最大ターン数、優先度段階、計算係数は次の設計項目として整理。
## 2026-07-28：戦闘行動の具体効果を暫定決定
- 技、通常攻撃、接近、距離を取る、防御、回避優先、精神を整える、降参の8行動について、主効果とリスクを暫定決定。
- 技データに使用間合い、得意間合い、威力、命中、精神消費、優先度、使用後間合い、失敗時の隙、特殊効果を持たせる方針を追加。
- 通常攻撃を低威力・高安定性・原則無消費の基本行動として定義。
- 接近・離脱を原則1段階の間合い変化とし、迎撃、追撃、被弾しながらの成功、失敗・中断を処理する方針を追加。
- 防御と回避の役割を分離し、防御は被害軽減、回避は命中回避を中心とする仕様を追加。
- 精神を整える行動に精神回復、不発率軽減、次行動安定補正、被弾による中断を設定。
- 降参を負傷悪化の回避手段とし、人物の性格、残存状態、次試合予定などからAIが判断する仕様を追加。
- 1ターンの処理順を、行動選択、条件確認、優先行動、速度順行動、状態更新、決着確認、ログ保存の順に暫定決定。
- 各行動の具体的な成功率、効果量、精神・疲労消費、最大ターン数、優先度段階はバランステストで調整する項目として残した。


## 2026-07-28：戦闘数値の暫定値を設定
- 1試合の最大ターン数を暫定20ターンに設定。
- 試合開始時の最大耐久を「100＋体力」、最大精神力を「50＋精神」とする暫定式を追加。
- 優先度を+2、+1、0、-1の4段階とし、優先度を先に比較して同段階内を速度順で処理する方式を追加。
- 同優先度内の行動順評価に、速度、行動固有補正、状態補正、シード付き乱数を使用する暫定式を追加。
- 命中率を基本命中、技量、相手速度、熟練度、適性、間合い、状態、回避補正から算出し、5〜95％へ収める暫定式を追加。
- 通常攻撃、小技、中技、大技、奥義の威力・精神消費・試合内消耗の暫定範囲を設定。
- ダメージを技威力、参照能力、熟練度、適性、相手の体力・技量などから算出する暫定式を追加。
- 接近・離脱の無妨害時成功率を90％とし、対抗時の速度・技量差による成功率計算を追加。
- 防御の技規模別軽減率、回避優先の命中低下と失敗時ダメージ増加、精神回復量と被弾中断条件を設定。
- 試合内消耗を人物の継続疲労と分離し、行動別増加量、段階別能力低下、試合後の疲労変換率を設定。
- 単発ダメージ割合による負傷率と、重大負傷への移行率を暫定設定。
- 20ターン終了時の判定配点と、同点時の比較順を設定。初期仕様では公式戦の引き分けを設けない方針を追加。
## 2026-07-28：大会の年間開催頻度と限定戦の昇格経路を暫定決定
- 通常のランク大会を月1回、年間12回開催する暫定方針を追加。
- 昇格大会を原則として四半期ごと、年4回まで開催する方針を追加。
- Cランク以上で格闘・剣技・魔法限定戦を各年4回開催する方針を追加。
- 毎月の通常総合戦に加え、3系統の限定戦を月ごとに交代で並行開催する年間枠の例を追加。
- 同月の通常総合戦と限定戦は原則どちらか一方へ出場する方針を追加。
- Cランク以降は限定戦の優勝・入賞・連勝・年間成績も昇格資格へ反映し、専門特化型の人物が昇格大会へ進みやすくなる経路を追加。
- 限定戦だけで世界王者にはならず、最高位は総合戦を基準とする既存方針を維持。
- 限定戦実績の昇格評価比率、具体的な開催月、同月複数出場の可否は今後の調整事項とした。


## 2026-07-28：ランク人口に応じた大会開催頻度の可変化
- 通常総合戦を全ランク一律で月1回開催する仕様から、ランク別人口に応じて開催回数を減らす可変開催制へ変更。
- F～Dなど人口の多い下位ランクは月1回を基本とし、CまたはB付近から上は隔月・四半期・半年単位へ集約できる方針を追加。
- どのランクから回数を減らすかは固定せず、出生・昇格・引退を含む長期人口シミュレーションで決定する。
- 大会ごとに最低成立人数と推奨参加人数を持たせ、参加者不足時は延期して次回枠へ候補者を集約する仕様を追加。
- 参加者が多すぎる場合は予選組・複数ブロック・予選総当たり＋決勝トーナメントで処理し、大会を細分化しすぎない方針を追加。
- 限定戦も年4回を上限とし、参加者不足時は延期・集約できるよう変更。
- ランク別の仮開催数として、F～D年12回、C年6～12回、B年4～6回、A年2～4回、S年1～数回をシミュレーション初期候補として追加。

## 2026-07-28：降格なし・A以上オープンクラス制を追加
- 競技ランクの降格を設けず、一度到達したランクを引退まで保持する方針を確定。
- 現在の実力はランクではなく、ランキング、直近成績、勝率、評価点で別管理する方針を追加。
- Aランク到達を競馬などにおけるオープンクラス入りに相当する境界として設定。
- AランクとSランクを通常大会では分離せず、A・S共通のオープン大会へ出場させる仕様を追加。
- SランクはAへ降格するのではなく、S資格を保持したままオープン大会へ出場することを明記。
- S専用の通常大会は原則設けず、Sのみの大会は最高位大会、王者決定戦、特別招待戦などに限定。
- F〜Bは原則ランク別大会を維持し、下位ランク大会への上位者参加は認めない方針を追加。
- ランク別開催頻度の仮案を、A年2〜4回・S年1〜数回から、A・S共通オープン大会年2〜6回へ変更。

## 2026-07-28：週間修行・技習得・教授判断・独自技の暫定値を設定
- 週間行動を、基礎鍛錬、専門鍛錬、技の習得訓練、習得済み技の反復、模擬戦・合同修行、間合い・精神訓練、独自技研究、休養に整理。
- 各週間行動の基礎成長値、技熟練度上昇値、疲労増減を暫定設定。
- 週間能力成長を、成長素質、年齢、現在値、師匠、門下人数、疲労、負傷、意欲・調子、シード付き乱数の各係数から算出する方式を追加。
- 一般的な人物の重点能力が若年期から全盛期に年1.5〜4程度伸びる想定を初期目標として追加。
- 技を基礎技、標準技、上級技、奥義・秘伝の4段階に分け、必要習得進捗を100、180、320、500に暫定設定。
- 技習得進捗に、系統適性、必要能力、学習特性、師匠伝達、師弟相性、門下人数、疲労・負傷の補正を適用する方式を追加。
- 師匠が4週ごとに教授技を再評価し、適性、前提条件、信頼、必要性、後継者優先度、秘匿方針から教授判断を行う仕様を追加。
- 技段階ごとに、師匠が教えるために必要な熟練度と教授評価の暫定条件を追加。
- 独自技を単純抽選ではなく研究値蓄積で発生させ、派生技180、複合技320、完全独自技・新奥義550を暫定閾値として設定。
- 独自技生成失敗時は研究値80％保持、24週間の再判定待機、単純な完全上位互換を禁止する方針を追加。
- 技データへ習得段階、必要進捗、教授必要熟練度、秘匿度、創始者、元技を保持する項目を追加。

## 2026-07-29：開発データベースをMySQLへ変更
- ローカル開発環境で既に利用可能な構成へ合わせ、採用データベース候補をPostgreSQLからMySQL 8.xへ変更。
- シミュレーション中核をDB非依存の純粋なTypeScriptとして分離する既存方針は維持。
- Sprint 0では永続DBを導入せず、MySQL接続・スキーマ・マイグレーション方式は後続の永続化Sprintで決定する方針とした。

## 2026-07-29：全人物の出生・加齢時期を4月第1週へ統一
- 全人物の出生時期を4月第1週へ固定し、人物ごとの誕生月・誕生週・誕生日を保持しない仕様へ変更。
- 毎年4月第1週に、その年より前に出生した全現存人物を一斉に1歳加算する仕様へ変更。
- 8歳の入門資格、16歳のデビュー資格、18歳の引退資格、42歳の現役上限も、4月第1週の一斉加齢直後に同時適用する。
- 年初の出産判定で誕生が決まった子は、全員同じ4月第1週に0歳で出生し、その年の一斉加齢対象には含めない。
- 従来の人物別誕生週、第1〜4週への出生割当、週ごとの段階的加齢に関する仕様を廃止。
- Sprint 0ミニ仕様、設定スキーマ、初期世界生成、イベント形式、タスク指示書を同ルールへ統一。

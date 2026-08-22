# 14 Sprint 1共通設定スキーマ付録

- 仕様版: `S1-SPEC-0.1.21`
- 状態: 08〜13が参照する型付き設定の固定構造
- 対象: 成長、週間Planner、技習得、戦闘、戦闘後効果
- 非対象: 初期世界生成設定、正式技一覧、大会設定

## 1. 目的

08〜13で「設定化する」とした値について、実装者が独自のキー・単位・既定値を作らないよう共通構造を固定する。

```text
Sprint1Config
- schemaVersion
- configVersion
- growth
- temporaryCondition
- weeklyPlanner
- techniqueLearning
- techniqueBalance
- battle
```

- 未知キーは拒否する
- 必須キー欠落を0や空配列で補完しない
- 全数値は有限値
- 小数はJSON numberで入力できるが、validation時にbasis points（10000倍整数）へ正規化し、決定処理は整数演算を使用する
- 複数BasisPoints係数の積は08仕様§5.3の`multiplyBasisPointsFloor`（最終1回floor）を正本とする。factorごとのsequential floorは禁止
- 負値を含む補正は最終丸め後に対象範囲へclampする
- 確率値は12仕様どおり整数％へfloorしてから乱数と比較する
- Strategy候補点はbasis points整数へ正規化後に比較する
- ルートの`Sprint1Config.configVersion`だけを版識別子とする。`battle.configVersion`を重複保持しない
- 同じconfigVersionの内容は不変

### 1.1 設定識別

```text
Sprint1ConfigIdentity
- configVersion
- configHash
```

`configHash`は完全なSprint1Configをcanonical JSON化したSHA-256とする。同じconfigVersionでhashまたは内容が異なる設定は拒否する。RunRuleSnapshot、BattleRulesSnapshotRef、BattleResultへconfigVersion・configHashを保存する。

### 1.2 Sprint 1版レジストリ

初期実装で使用する版文字列を次へ固定する。空文字や別表記を許可しない。

| 対象 | 初期値 | 変更条件 |
|---|---|---|
| SimulationIdentity.schemaVersion | `0.5.0` | `worldCalendarConfigHash`／`yearStartProcessorManifestHash`を必須追加（legacy 0.4.0 field setは不変） |
| Sprint1Config.schemaVersion | `0.2.0` | 年齢帯キーを正本の42歳強制引退境界へ統一した設定JSON構造 |
| Sprint1Config.configVersion | `sprint1-balance-0.2.0` | 42歳以上の成長係数0と年齢帯キー変更を含む係数・既定値 |
| TechniqueDefinition.schemaVersion | `0.1.0` | 技定義構造変更 |
| TechniqueCatalog.dataVersion | `techniques-0.1.0` | 正式技データ内容変更 |
| InitialWeeklyTrainingSidecarSnapshot.schemaVersion | `0.1.0` | 週間訓練sidecar外部入力スナップショット |
| Sprint1CliInput.schemaVersion | `0.1.0` | CLI `--sprint1-input` 集約入力 |
| RunMetadataDocument.schemaVersion | `0.5.0` | nested SimulationIdentity 0.5.0を含むrun-metadata.json構造変更 |
| InitialWorldOutputDocument.schemaVersion | `0.5.0` | initial-world.json構造変更（RunRuleSnapshot 0.5.0＋calendar／year-start bind） |
| FinalWorldOutputDocument.schemaVersion | `0.3.0` | final-world.json構造変更（トップレベル`weeklyTrainingSidecars`＋`battleResults`追加） |
| Sprint1PersonState.sprint1StateSchemaVersion | `0.1.0` | currentMental・技状態・習得focusの人物追加状態 |
| BattleReplayBundle.schemaVersion | `0.1.0` | 監査用自己完結replay bundle |
| RunRuleSnapshot.schemaVersion | `0.5.0` | `worldCalendar`／`yearStartProcessorManifest`／各hashを必須追加（legacy 0.4.0 field setは不変） |
| BattleRulesSnapshotRef.schemaVersion | `0.1.0` | 戦闘ルール参照hash入力構造 |
| BattleActionSourceIdentity.schemaVersion | `0.1.0` | Strategy／scripted actionsの決定性identity |
| StartBattleRuntimeTransition.schemaVersion | `0.1.0` | World RNG／MatchIdGeneratorStateの未commit遷移 |
| MatchIdGeneratorState.schemaVersion | `0.1.0` | MatchId決定的生成器のopaque state（seed／nextSequence） |
| RunBattleCommitPlan.schemaVersion | `0.2.0` | structural validationとcommit plan hash入力を分離した原子commit計画 |
| BattleState.schemaVersion | `0.6.0` | sourceSnapshot baselineとterminalReason／両ActionSourceIdentityを含む戦闘状態構造 |
| BattleResult.schemaVersion | `0.5.0` | summaryLogHashと両ActionSourceIdentityを含む戦闘結果構造 |
| EventEnvelope.schemaVersion | `0.2.0` | 共通イベント構造変更 |
| TrainingProcessorRuntimeState.schemaVersion | `0.1.0` | 週間訓練Processorの再開・集計状態 |
| WorldYearStartRuntimeState.schemaVersion | `0.1.0` | 年初phase runtime（`processorSpecificStates`物理owner） |
| WorldYearStartReceipt.schemaVersion | `0.1.0` | 年初transaction receipt |
| WorldYearStartTransactionAggregate.schemaVersion | `0.1.0` | 年初transaction集約 |
| ActiveYearStartProcessorManifest.schemaVersion | `0.1.0` | 年初processor manifest |
| EventAllocationState.schemaVersion | `0.1.0` | Sprint1RunRuntimeStateのglobal event sequence allocator（runtime-only） |
| BattleResultWeekState.schemaVersion | `0.1.0` | 同週確定BattleResult registry（runtime-only） |

- schemaVersionとdata/config versionを同じ意味で使用しない
- 同じ版文字列のcanonical内容は不変
- 版を上げずに未知キー追加、既定値変更、配列順変更を行わない
- run-metadata／initial-world／final-worldの旧版readerと新版本writerを別validatorとして実装し、未知版を拒否する。ここでの旧版readerは実在するSprint 0 fixed7／EventEnvelope 0.1.0等を指す。repositoryに無い`SimulationIdentity` 0.3.0専用legacy readerを新設しない（02仕様）
- `age35to41`は現役最終年齢41歳までにだけ適用する。
- 42歳到達時は年初処理で`retired`となるため、`age42plus`は必ず0であり、正式訓練・公式戦へ使用しない。
- `battleProfileAdapterVersion` のSprint 1初期値は `battle-profile-adapter-0.1.0` とする。
- `matchIdGeneratorVersion` のSprint 1初期値は `match-id-generator-0.1.0` とし、空文字・暗黙既定値を禁止する。
- `MatchIdGeneratorState.schemaVersion` のSprint 1初期値は `0.1.0` とする。canonical fieldは schemaVersion／generatorVersion／namespace／seed／nextSequence のみ。
- MatchId文字列形式は `match_<12桁の0埋め10進数>`。seedはID文字列へ混ぜず、state hash／SimulationIdentity bindingへだけ使用する。
- `defaultBattleStrategyVersion` とDefaultBattleStrategyの初期`strategyVersion`は `default-battle-strategy-0.1.0` とする。
- ScriptedActionSourceの初期`scriptFormatVersion`は `battle-action-script-0.1.0` とする。完全JSON構造・turns規則・canonicalScript／actionScriptHash・両side bindingは12仕様§2.1を正本とする。`scriptFormatVersion`文字列自体は本版でも変更しない。
- 正本仕様版（SimulationIdentity.specVersions.main）の現行値は `SPEC-0.1.3`、Sprint 0は `S0-SPEC-0.1.6`、Sprint 1仕様版（SimulationIdentity.specVersions.sprint1）の現行値は `S1-SPEC-0.1.21` とする。旧`S1-SPEC-0.1.20`／`0.1.19`およびSimulationIdentity schemaVersion `0.4.0`／`0.3.0`を新規runの現行Sprint 1 identityとして受理しない。
- 週間訓練production processor literalは`weekly-training`（`WEEKLY_TRAINING_PROCESSOR_ID`）。Sprint1 transactional processor adapter IDおよび週間由来`EventEnvelope.sourceProcessor`と同一literal（10・03仕様）。既存`WorldProcessor` interfaceは変更しない。production配列`[weekly-training]`はSprint1 transactional adapter pipelineのみを意味し、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`へは登録しない（二重実行禁止）。
- Sprint 1 production normal-week adapter pipelineは`[weekly-training]`のみ。`battle-simulation`は配列へ登録しない。`WORLD_YEAR_START_PROCESSOR_ID = "world-year-start"`はnormal-week pipeline／`processorOrder`／`rngStates`／legacy WorldProcessorへ追加しない。
- battle World RNG labelは`battle/world-rng`、weekly-training processor RNG labelは`processor/weekly-training`（10仕様）。SimulationIdentityへlabel fieldは追加しない。
- `BattleResultWeekState`／`eventAllocationState`／`worldRngState`／`matchIdGeneratorState`／`processorRuntimeStates.processorSpecificStates`はruntime-only。CAL-JAN新規runの`processorSpecificStates`はexact 2件（`weekly-training`→`world-year-start`順）。`specificState`はplain JSON deep-clone。年開始runtimeはここに1回だけ格納し、Sprint1RunRuntimeStateトップレベル新fieldやWorldState／event／UIへ複製しない。`Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。一方`initialWeeklyTrainingSidecarSnapshot`はinitial-world 0.5.0へ、`weeklyTrainingSidecars`および`battleResults`はfinal-world 0.3.0へ投影する。fixed7は exactly 7 files（`battle-results.json`／`year-start.json`禁止）。
- immutable `Sprint1RunContext`（`initialWeeklyTrainingSidecarSnapshot`含む）／`WeeklyTrainingSidecarState`／`battleResults`／`battleResultWeekState.absoluteWeek === worldDate.absoluteWeek`／week suffix invariantは10・02仕様。context validationは外部`initialMatchIdGeneratorState`依存を持たない。
- `InitialWeeklyTrainingSidecarSnapshot`／`Sprint1CliInput`の初期schemaVersionはいずれも`0.1.0`。CLI新規optionは`--sprint1-input`のみ（TECHNICAL_DECISIONS）。
- `SimulationIdentity.initialWeeklyTrainingSidecarHash`は検証済みsidecarのcanonical JSON SHA-256。RunRuleSnapshotへsidecar全文や同hash fieldを直接追加しない。
- 移動の`moverStateModifier`／`opponentStateModifier`は`battle.actionOrder.conditionPerPoint`／`fatiguePenaltyPerPoint`／`injuryPenaltyPerPoint`を共用する。移動専用の状態補正キーを`battle.movement`へ新設しない。
- `BattleActionLog.movementChance`は既存の`battle.movement.randomMinimum`／`randomMaximum`を参照する。configスキーマ・既定値・canonical SHAの変更はない。
- `BattleParticipantSnapshot.sourceSnapshot`（戦闘開始baseline）により、戦闘中も`sourceSnapshotHash`検証を常時可能とする。BattleState.schemaVersionのSprint 1現行値は`0.6.0`（新規`0.5.0`は拒否）。
- Sprint1Configの構造・schemaVersion／configVersion・既定値・canonical SHAは本版でも不変とする。

## 2. growth

```text
growth
- fixedPointScale: 1000
- baseMilliPointsPerTraining: 500
- potentialMinimumFactor: 0.65
- potentialMaximumFactor: 1.35
- ageFactorsByProfile:
    early: { age0to7: 0.00, age8to11: 0.90, age12to15: 1.10, age16to20: 1.15, age21to27: 0.90, age28to34: 0.65, age35to41: 0.35, age42plus: 0.00 }
    normal: { age0to7: 0.00, age8to11: 0.80, age12to15: 1.00, age16to20: 1.15, age21to27: 1.00, age28to34: 0.75, age35to41: 0.45, age42plus: 0.00 }
    late: { age0to7: 0.00, age8to11: 0.70, age12to15: 0.90, age16to20: 1.05, age21to27: 1.10, age28to34: 0.85, age35to41: 0.55, age42plus: 0.00 }
- currentValueFactors:
    value0to39: 1.15
    value40to59: 1.00
    value60to74: 0.75
    value75to89: 0.45
    value90to100: 0.20
- teacherFactors:
    noFormalMasterOrUnqualifiedParent: 0.75
    averageMaster: 1.00
    goodMaster: 1.10
    renownedInstructor: 1.20
    eraLeadingInstructor: 1.30
- discipleCountFactors:
    count1to3: 1.00
    count4to6: 0.92
    count7to10: 0.82
    count11to20: 0.70
    count21to40: 0.55
    count41plus: 0.40
- fatigueFactors:
    value0to20: 1.00
    value21to40: 0.90
    value41to60: 0.70
    value61to80: 0.40
    value81to100: 0.15
- injuryFactors:
    none0: 1.00
    light1to24: 0.85
    medium25to59: 0.55
    severe60to100: 0.20
- motivationConditionMinimumFactor: 0.80
- motivationConditionMaximumFactor: 1.15
- rngMinimumFactor: 0.90
- rngMaximumFactor: 1.10
```

帯境界は連続・重複なしとし、08仕様と完全一致させる。age profileの表、現在値、師匠、門下人数、疲労、負傷を実装側で別値へ置換しない。

- 正式師匠なし・資格なし親ではteacherFactor=0.75を使用し、discipleCountFactorは1.00として追加減衰させない
- 正式師匠ありの場合、対象弟子を含む門下人数は1以上であり、discipleCountFactorsの該当帯を使用する
- 門下人数0を正式師匠ありとして入力する場合は不正とする
- 成長素質係数の整数式は08仕様の`growthPotentialFactorBasisPoints`を正本とする。`potentialMinimumFactor`／`potentialMaximumFactor`をnormalized BasisPoints化した値で境界`0→6500`／`50→10000`／`100→13500`を満たすこと
- `GrowthInput.motivationFactor`の入力契約（必須・8000..11500 BasisPoints・欠落補完禁止）も08仕様を正本とする
- 複数BasisPoints係数の積は08仕様§5.3の`multiplyBasisPointsFloor`を正本とする。能力成長は次式:

```text
GrowthGainMilliPoints
= multiplyBasisPointsFloor(
    baseMilliPointsPerTraining,
    [
      growthPotentialFactor,
      ageFactor,
      currentValueFactor,
      teacherFactor,
      discipleCountFactor,
      fatigueFactor,
      injuryFactor,
      motivationFactor,
      rngFactor
    ]
  )
```

- 効果RNG係数は08仕様§5.4の`drawInclusiveBasisPoints(rng, minimumBp, maximumBp) = rng.nextInt(minimumBp, maximumBp + 1)`を正本とする。Sprint 1既定は`rngMinimumFactor`／`rngMaximumFactor`のnormalized値9000..11000（両端含む2001値）。`nextFloat`補間・半開区間・％取得後100倍・`Math.round`・moduloは禁止
- 「RNGを1回消費する」は公開`nextInt`を1回呼ぶこと。内部rejection samplingのuint32回数は固定1とは定義しない
- 固定テスト: `base=500`、`factors=[6500,9000,11500]` → final-floor 336（sequential floor 335は正式結果にしない）

## 3. temporaryCondition

```text
temporaryCondition
- injuryBands:
    none: 0
    light: 1..24
    medium: 25..59
    severe: 60..100
- weeklyFatigueDelta:
    trainStat: 8
    learnTechnique: 7
    practiceTechnique: 6
    rest: -18
- restConditionDelta: 2
- restMentalRecovery: 20
- restInjuryRecovery: 5
- forcedRestFatigueThreshold: 81
```

`restMentalRecovery=20`、`restInjuryRecovery=5` は `[Sprint 1暫定]` の必須既定値であり、欠落時に0を補わない。

## 4. weeklyPlanner

```text
weeklyPlanner
- baseScoresByCareerStatus:
    trainee: { train: 35, learn: 30, practice: 20, rest: 15 }
    activeCompetitor: { train: 30, learn: 20, practice: 30, rest: 20 }
    retired: { train: 0, learn: 0, practice: 0, rest: 100 }
- contextScoreRange: -20..20
    personality: 1.0
    developmentNeed: 1.0
    recentResult: 1.0
    teacherAdvice: 1.0
    schedule: 1.0
- baseFatiguePenaltyPerFivePoints: 1
- baseInjuryPenaltyPerFivePoints: 1
- baseMentalExhaustionPenaltyMaximum: 20
- burdenPenaltyMultipliersByAction:
    trainStat: { fatigue: 1.00, injury: 1.00, mental: 0.60 }
    learnTechnique: { fatigue: 0.80, injury: 0.80, mental: 1.00 }
    practiceTechnique: { fatigue: 0.70, injury: 0.60, mental: 0.75 }
    rest: { fatigue: 0.00, injury: 0.00, mental: 0.00 }
- restNeedBonuses:
    fatiguePerFivePoints: 1.50
    fatigueMaximum: 30
    injuryPerFivePoints: 1.25
    injuryMaximum: 25
    mentalExhaustionMaximum: 25
- statTargetWeights:
    remainingCapacity: 1.0
    growthPotential: 1.0
    relatedAptitude: 0.5
    teacherRecommendation: 1.0
- learningTargetWeights:
    aptitude: 25
    requiredStats: 15
    currentProgress: 25
    teacherAvailability: 20
    styleMatch: 10
    tierAccessibility: 5
- practiceTargetWeights:
    masteryNeed: 50
    recentPracticeNeed: 20
    teacherPriority: 15
    styleMatch: 15
```

`baseScoresByCareerStatus`（`retired.rest=100` を含む）の参照は、`10-training-and-learning.md` §3.0 の週間行動パイプライン適格判定**通過後**のみ行う。設定互換のため `retired` 行は保持するが、非適格人物をPlannerへ再投入したり、`training.action_selected`／`training.rest_applied`／通常の週間訓練action履歴を synthetic に生成しない。

- personality等のcontext scoreは入力側で-20..20へ正規化する
- Planner比較は整数`scoreHundredths`のみを使用し、表示用小数や`Math.round`を挟まない。負値はJavaScript truncateではなく`mathematicalFloor`を使う
- `baseScoreHundredths = baseScore * 100`
- `contextNumerator = Σ(contextValue * contextWeightBasisPoints)`、`contextScoreHundredths = mathematicalFloor(contextNumerator / 100)`
- `baseFatiguePenalty = floor(fatigue / 5) * baseFatiguePenaltyPerFivePoints`
- `baseInjuryPenalty = floor(injury / 5) * baseInjuryPenaltyPerFivePoints`
- `baseMentalExhaustionPenalty = floor((maxMental - currentMental) * baseMentalExhaustionPenaltyMaximum / maxMental)`。`maxMental<=0`は設定補完せず人物状態不正
- action別負担: `penaltyHundredths = floor(basePenalty * burdenPenaltyMultiplierBasisPoints / 100)`。train／learn／practiceへ減算し、restの3倍率は0のため減算しない
- rest fatigue bonus hundredths: `min(fatigueMaximum * 100, floor(floor(fatigue / 5) * fatiguePerFivePointsBasisPoints / 100))`
- rest injury bonus hundredthsも同式（`injuryMaximum`／`injuryPerFivePointsBasisPoints`）
- rest mental bonus hundredths: `floor((maxMental - currentMental) * mentalExhaustionMaximum / maxMental) * 100`
- ActionScoreHundredthsは上記整数値の加減のみで求める（10仕様）
- `StatTargetScoreHundredths`は`statTargetWeights`のnormalized BasisPointsを使い、次式とする。

```text
StatTargetScoreHundredths
= floor(
    (
      (100 - currentValue)
        * statTargetWeights.remainingCapacity
      + growthPotential
        * statTargetWeights.growthPotential
      + relatedAptitude
        * statTargetWeights.relatedAptitude
      + teacherRecommendation
        * statTargetWeights.teacherRecommendation
    ) / 100
  )
```

既定`10000`／`10000`／`5000`／`10000`は旧10暫定浮動小数式と一致する
- `trainStat`／`learnTechnique`／`practiceTechnique`は10仕様の`train_stat`／`learn_technique`／`practice_technique`へ一対一対応する
- 基礎スコアは10仕様の表と一致させる
- learningTargetWeightsとpracticeTargetWeightsは各合計100の整数weight
- styleMatchとteacherPriorityは0..100。存在しないstyleMatchは50、師匠なしteacherPriorityは0
- recentPracticeNeedは10仕様の12週線形式を使用する
- スコア同点時だけRNGを使用する
- `battle.injury.unableToContinueThreshold`は戦闘中の続行不能判定専用であり、週間Plannerの強制休養（`WeeklyForcedRestReason`）へ使用しない
- `TrainingProcessorRuntimeState.schemaVersion`は`0.1.0`。構造・初期値・`actionCounts`キー・`processedPersonCount`集計規則・累積契約は10仕様§9を正本とする
- `LearningTargetScoreHundredths`／`PracticeTargetScoreHundredths`の整数式は10仕様§6.2／§6.3を正本とする。要約:

```text
LearningTargetScoreHundredths
= aptitudeContributionHundredths
+ requiredStatsContributionHundredths
+ progressContributionHundredths
+ teacherContributionHundredths
+ styleContributionHundredths
+ tierContributionHundredths
```

各寄与のfloor規則・入力validation（`learningProgressTenths`範囲外拒否）・golden 7320は10仕様を正本とする。

```text
PracticeTargetScoreHundredths
= masteryNeedContributionHundredths
+ recentPracticeContributionHundredths
+ teacherPriorityContributionHundredths
+ practiceStyleContributionHundredths
```

golden 5050は10仕様を正本とする。

## 5. techniqueLearning

```text
techniqueLearning
- baseWeeklyProgressTenths: 100
- aptitudeFactorRange: 0.60..1.40
- aptitudeFactorFormula: 0.60 + aptitude / 100 * 0.80
- requiredStatsFactorRange: 0.70..1.20
- learningTraitFactorRange: 0.70..1.30
- learningTraitFactorFormula: 0.70 + learningTrait / 100 * 0.60
- teacherTransmissionFactorRange: 0.70..1.30
- teacherTransmissionFactorFormula: 0.70 + teachingAbility / 100 * 0.60
- compatibilityFactorRange: 0.80..1.20
- compatibilityFactorFormula: 0.80 + compatibility / 100 * 0.40
- selfStudyFactor: 0.40
- rngFactorRange: 0.90..1.10
- initialMasteryByTier:
    basic: 20
    standard: 15
    advanced: 10
    secret: 5
- masteryGainHundredths:
    dedicatedPractice: 150
    normalTraining: 50
    officialSuccess: 20
    officialFailure: 10
    mockSuccess: 10
    mockFailure: 5
- masteryPracticeRngFactorRange: 0.90..1.10
- masteryCurrentValueFactors:
    mastery0to39: 1.00
    mastery40to59: 0.80
    mastery60to79: 0.55
    mastery80to89: 0.25
    mastery90to100: 0.10
```

`baseWeeklyProgressTenths=100` は表示進捗10.0に相当する。aptitudeは人物の対応系統適性、learningTrait／teachingAbility／compatibilityは09仕様の`TechniqueLearningContext`を使用する。各入力範囲は0..100、欠落時は中立50とし、上記式をそのまま使用する。Sprint 1では`teacherCanTeach=true`の技だけを習得候補とし、teacherTransmissionとcompatibilityを必ず適用する。`selfStudyFactor=0.40`はSprint 2以降の予約値で、Sprint 1の計算へ使用しない。

整数積とRNG:

```text
WeeklyProgressTenths
= multiplyBasisPointsFloor(
    baseWeeklyProgressTenths,
    [
      aptitudeFactor,
      requiredStatsFactor,
      learningTraitFactor,
      teacherTransmissionFactor,
      compatibilityFactor,
      discipleCountFactor,
      fatigueFactor,
      injuryFactor,
      rngFactor
    ]
  )

DedicatedPracticeGainHundredths
= multiplyBasisPointsFloor(
    masteryGainHundredths.dedicatedPractice,
    [
      masteryCurrentValueFactor,
      masteryPracticeRngFactor
    ]
  )

NormalTrainingMasteryGainHundredths
= multiplyBasisPointsFloor(
    masteryGainHundredths.normalTraining,
    [masteryCurrentValueFactor]
  )
```

- `multiplyBasisPointsFloor`／`drawInclusiveBasisPoints`は08仕様§5.3／§5.4を正本とし、09仕様が同契約を参照する
- `rngFactorRange`／`masteryPracticeRngFactorRange`の既定0.90..1.10はnormalized 9000..11000から両端含みで取得する

## 6. techniqueBalance

```text
techniqueBalance
- powerBands:
    basicAttack: 20
    small: 20..35
    standard: 36..55
    advanced: 56..75
    secret: 76..100

`powerBands.small / standard / advanced / secret` は **TechniquePowerBand上のlabel** であり、`TechniqueConsumptionClass`または`learningTier`ではない。TechniquePowerBandは説明上の区分名で、新しい保存field・公開型・config keyではない。同名キーがあっても対応関係を推測しない。`TechniqueDefinition.power`は技データの明示値を使用する。`basicAttack`は4つの連続した技威力帯の外にある単一参照値であり、`basicAttack=20`と`small.min=20`は帯同士の重複として扱わない。この意味明確化では設定shape・既定値・schemaVersion・configVersion・canonical JSON・configHashを変更しない。

- basicAttackProfiles:
    unarmed:
      primaryStats: [strength, skill]
      usableRanges: [contact, close]
      preferredRanges: [contact, close]
      power: 20
      accuracy: 75
      mentalCost: 0
      priority: 0
      speedModifier: 0
      rangeShiftAfterUse: none
      injuryModifier: 0
      effectiveMastery: 50
      activationCheck: false
    sword:
      primaryStats: [skill, strength]
      usableRanges: [close, middle]
      preferredRanges: [close]
      power: 20
      accuracy: 75
      mentalCost: 0
      priority: 0
      speedModifier: 0
      rangeShiftAfterUse: none
      injuryModifier: 0
      effectiveMastery: 50
      activationCheck: false
    magic:
      primaryStats: [magic, spirit]
      usableRanges: [middle, long]
      preferredRanges: [long]
      power: 20
      accuracy: 75
      mentalCost: 0
      priority: 0
      speedModifier: 0
      rangeShiftAfterUse: none
      injuryModifier: 0
      effectiveMastery: 50
      activationCheck: false
```

配列順も固定し、09仕様と完全一致させる。基本攻撃はTechniqueDefinition・TechniqueCatalogへ含めず、Sprint1Config hashへ含める。`basicAttackProfiles`のキーは`unarmed | sword | magic`とし、`TechniqueCategory`／`DomainAptitude`／`AptitudeKey`と同じキーで系統適性を取得する。`martial`と暗黙対応は禁止する。

## 7. battle

```text
battle
- maxTurns: 20
- defaultInitialRange: middle
- startDurability
- actionOrder
- hit
- damageFormula
- defense
- movement
- focusMind
- activation
- mentalCost
- injury
- consumption
- judgement
- strategy
- postEffects
```

### 7.1 startDurability

```text
startDurability
- conditionPercentPerPoint: 0.50
- fatiguePercentPerPoint: 0.25
- injuryPercentPerPoint: 0.50
- minimumPercent: 10
```

### 7.2 actionOrder／hit

```text
actionOrder
- conditionPerPoint: 0.25
- fatiguePenaltyPerPoint: 0.10
- injuryPenaltyPerPoint: 0.15
- randomMinimum: -5
- randomMaximum: 5

hit
- minimumPercent: 5
- maximumPercent: 95
- preferredRangeModifier: 10
- usableNonPreferredRangePenalty: 15
- evadePenalty: 30
```

### 7.3 damageFormula

08〜13の暫定値を一か所に保持する。

```text
damageFormula
- aptitudeBase: 0.70
- aptitudeDivisor: 250
- masteryBase: 0.80
- masteryDivisor: 500
- staminaDefenseWeight: 0.45
- skillDefenseWeight: 0.20
- conditionDefenseWeight: 0.10
- fatigueDefensePenaltyWeight: 0.05
- injuryDefensePenaltyWeight: 0.10
- techniquePowerWeight: 0.35
- attackValueWeight: 0.25
- defenseValueReductionWeight: 0.20
- varianceMinimum: 0.90
- varianceMaximum: 1.10
- minimumDamage: 1
```

### 7.4 defense／movement／focusMind／activation／mentalCost

```text
defense
- damageFactorByConsumptionClass:
    basicAttack: 0.55
    small: 0.55
    medium: 0.60
    large: 0.70
    ultimate: 0.80
- rangeShiftBlockChanceByConsumptionClass:
    basicAttack: 70
    small: 70
    medium: 60
    large: 45
    ultimate: 30

movement
- speedWeight: 0.50
- skillWeight: 0.30
- actionBonus: 5
- opponentPreferredRangeControlBonus: 5
- opposingMovementBonus: 10
- guardingRangeControlBonus: 5
- randomMinimum: -10
- randomMaximum: 10

focusMind
- recoveryRatio: 0.10
- partialRecoveryRatio: 0.50
- interruptDamageRatio: 0.20
- noDamageNextHitModifier: 3
- noDamageNextActivationModifier: 3
- partialDamageNextHitModifier: 1
- partialDamageNextActivationModifier: 1

activation
- minimumPercent: 5
- maximumPercent: 100
- basePercent: 95
- difficultyPenaltyPerPoint: 0.50
- spiritBonusPerPointFrom50: 0.25
- masteryBonusPerPointFrom50: 0.20
- aptitudeBonusPerPointFrom50: 0.10
- fatiguePenaltyPerPoint: 0.10
- injuryPenaltyPerPoint: 0.10
- consumptionPenaltyPerPoint: 0.10

mentalCost.maximumMasteryReductionRatio: 0.10
```

### 7.5 injury

```text
injury
- baseChanceBands:
    below10Percent: 0
    10to19Percent: 2
    20to29Percent: 6
    30to39Percent: 12
    40PercentOrMore: 25
- fatigueChancePerPoint: 0.10
- existingInjuryChancePerPoint: 0.10
- staminaReductionPerPoint: 0.08
- injuryPronenessChancePerPointFrom50: 0.10
- maximumPercent: 95
- guardedChanceFactor: 0.50
- majorChanceWhenInjured: 0.20
- minorInjuryDelta: 10
- majorInjuryDelta: 30
- unableToContinueThreshold: 100
```

### 7.6 consumption

```text
consumption
- actionBase:
    basicAttack: 2
    techniqueSmall: 3
    techniqueMedium: 5
    techniqueLarge: 8
    techniqueUltimate: 12
    approach: 3
    retreat: 3
    basicDefense: 1
    evade: 4
    focusMind: 1
    surrender: 0
    noAction: 0
- highPriorityAdditional: 2
- performanceBands:
    0..29: 1.00
    30..49: 0.95
    50..69: 0.90
    70..84: 0.80
    85..100: 0.70
- highBandInjuryMultiplier: 1.25
```

帯境界・performanceFactor・行動別基礎消耗は正本値として固定する。`highBandInjuryMultiplier`だけがSprint 1暫定値である。

### 7.7 judgement

13仕様の100点配点と変換式を保持する。

```text
judgement
- totalMinimum: 0
- totalMaximum: 100
- damageMaximum: 50
- hitMaximum: 15
- techniqueMaximum: 15
- initiativeMaximum: 10
- defenseMaximum: 10
- passivityPenaltyMaximum: 20
- passivityPenaltyPerAction: 2
- invalidActionPenaltyPerAction: 2
- techniqueImportancePoints:
    basic: 1
    standard: 2
    advanced: 3
    secret: 5
```

### 7.8 strategy

```text
strategy
- expectedDamageWeight: 1.0
- rangeControlWeight: 10
- defenseNeedWeight: 20
- mentalRecoveryNeedWeight: 15
- mentalCostPenaltyWeight: 0.5
- injuryRiskPenaltyWeight: 20
- personalityModifiers:
    attackAggressionPerPointFrom50: 0.20
    attackRiskTolerancePerPointFrom50: 0.10
    defenseCautionPerPointFrom50: 0.20
    defenseRiskTolerancePenaltyPerPointFrom50: 0.05
    focusCautionPerPointFrom50: 0.10
    movementAggressionMinusCaution: 0.05
    surrenderCautionPerPointFrom50: 0.10
    surrenderPerseveranceReductionPerPointFrom50: 0.20
    surrenderRiskToleranceReductionPerPointFrom50: 0.10
- surrenderCandidateThreshold: 70
- surrenderActionBaseScore: 0
- surrender:
    durabilityWeight: 45
    mentalWeight: 15
    injuryWeight: 20
    consumptionWeight: 15
    opponentLeadWeight: 20
    confidenceWeight: 10
    majorInjuryRiskWeight: 20
- highConsumptionSurrenderBonus: 10
```

これらの数値は `[Sprint 1暫定]`。各candidate scoreの算出式は12仕様を正本とし、実装側で別の近似式を作らない。BattleDecisionProfileの各値は0..100、50中立。自動降参機能自体を未実施へ送らない。

### 7.9 postEffects

```text
postEffects
- continuedFatigueRatio: 0.25
- damageAdditionalFatigueRules:
    below10Percent: 0
    10to19Percent: 2
    20to29Percent: 4
    30to39Percent: 7
    40PercentOrMore: 10
- majorInjuryAdditionalFatigue: 8
- consecutiveMatchAdditionalFatigueRules:
    firstMatch: 0
    secondMatch: 3
    thirdOrLater: 6
- ageAdditionalFatigueRules:
    age0to27: 0
    age28to34: 2
    age35to41: 4
- resultModifiersByBattleKindAndEndReason:
    officialWin: { condition: 2, confidence: 3 }
    officialLoss: { condition: -2, confidence: -3 }
    mockWin: { condition: 1, confidence: 1 }
    mockLoss: { condition: -1, confidence: -1 }
    surrenderAdditional: { condition: -1, confidence: -2 }
    knockoutAdditional: { condition: -1, confidence: -1 }
```

すべて `[Sprint 1暫定]` だが必須。欠落値を0で補完しない。単体試験では完全なfixtureを渡す。

- まずbattleKind別のwin／loss値を取得する
- 次にendReasonがsurrenderまたはknockoutならadditional値を加算する
- unable_to_continue／judge_decisionはadditional 0ではなく「追加規則なし」として扱い、base値だけを使う
- final resultがfailedなら一切適用しない
- 最終condition／confidenceは08仕様の-20..20へclampする

## 8. validation

- schemaVersionは`0.2.0`、初期configVersionは`sprint1-balance-0.2.0`
- schemaVersion、configVersion空文字不可
- 未知キー拒否
- `small → standard → advanced → secret` の4つのTechniquePowerBandに隙間・重複なし。`basicAttack`はこの帯検査の対象外
- technique consumptionClassとactionBaseの4キーが完全一致
- min <= max
- penalty／reductionキーは非負の大きさとして保持し、式側で減算する。負係数を設定へ保存しない
- ratioは定義された範囲内
- weeklyPlannerのlearningTargetWeights／practiceTargetWeightsは各合計100
- burdenPenaltyMultipliersByActionは4行動すべてを必須とし、restの3倍率は0
- ageFactorsByProfile、currentValueFactors、teacherFactors、discipleCountFactors、fatigueFactors、injuryFactors、masteryCurrentValueFactors、basicAttackProfilesは列挙キーの欠落・追加を拒否
- basicAttackProfilesのprimaryStatsは基礎能力固定順（`stamina < strength < skill < speed < spirit < magic`）、usableRanges／preferredRangesは`contact < close < middle < long`へ正規化し、preferredRangesはusableRangesの部分集合
- basicAttackProfilesのキーは`unarmed | sword | magic`のみ。`martial`を拒否する
- basicAttackProfilesはmentalCost=0、priority=0、speedModifier=0、rangeShiftAfterUse=none、injuryModifier=0、effectiveMastery=50、activationCheck=falseを必須とする
- TechniqueDefinitionで整数指定された項目へ小数を許可しない
- 0..100値は範囲外拒否
- `injury.unableToContinueThreshold`は1..100。戦闘続行不能判定専用であり、週間Planner強制休養へは使用しない
- `judgement.totalMinimum=0`、`totalMaximum=100`かつminimum < maximum
- `defaultInitialRange`は4間合いのいずれか
- maxTurns=20
- 消耗帯・行動別消耗・判定最大点を実装側から上書き不可
- 同じconfigVersionでcanonical JSONとSHA-256が一致
- 版レジストリの全初期値が08〜13、03統合仕様と一致
- RunRuleSnapshotへ完全設定を1回だけ保存し、各BattleStateへ完全設定を複製しない

## 9. 必須テスト

- 完全設定の受理
- 各必須キー欠落拒否
- 未知キー拒否
- 数値範囲外拒否
- `small → standard → advanced → secret` の4つのTechniquePowerBandの隙間・重複拒否。`basicAttack`は当該検査対象外
- 既定値fixtureのcanonical JSON固定
- 同configVersion内容差異拒否
- 版レジストリの初期値、用途別version上げ条件
- RunRuleSnapshot 1件と複数BattleRulesSnapshotRefで完全設定・完全カタログが重複保存されないこと
- 08〜13が同じconfig型を参照すること
- root configVersionとBattleState記録値の一致
- ageFactorsByProfile／currentValueFactors／teacherFactors／discipleCountFactors／fatigueFactors／injuryFactorsの全列挙値が08仕様と完全一致
- weeklyPlannerのaction別負担倍率とrest回復必要度により、高疲労・高負傷・精神不足でrestの相対scoreが増えること
- WeeklyPlannerContext、LearningTargetScoreHundredths、PracticeTargetScoreHundredthsを10仕様どおり再計算できること（golden 7320／5050含む）
- masteryPracticeRngFactorRangeの0.90／1.10境界（9000／11000）と`DedicatedPracticeGainHundredths`／`NormalTrainingMasteryGainHundredths`
- `multiplyBasisPointsFloor`固定テスト（336）と`drawInclusiveBasisPoints`の`nextInt(min, max+1)`契約
- 発動率・命中率・負傷率のbasis points計算、floor、clamp順
- basicAttackProfilesの3系統完全列挙、固定field、range順序
- Strategy score、referenceOffense、predictedSelfInjuryChanceを12仕様どおり再計算できること
- unableToContinueThreshold境界
- judge total 0..100 clamp

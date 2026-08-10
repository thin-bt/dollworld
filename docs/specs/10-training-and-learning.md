# 10 週間行動・訓練・習得処理仕様

- 仕様版: `S1-SPEC-0.1.20`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 週次行動選択、能力訓練、技習得、休養、処理順
- 非対象: 大会日程、師匠選択、恋愛、結婚、出産

## 1. 目的

人物が1週間ごとに自律的に行う行動を決定し、08・09仕様に従って能力、技、一時状態を決定的かつ原子的に更新する。

正本ではユーザーが訓練等を直接指示せず、人物の性格・能力・関係性に基づく自律判断を観察する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

## 1.1 production processorId / sourceProcessor

週間訓練の正式literalは次へ固定する。

```text
WEEKLY_TRAINING_PROCESSOR_ID = "weekly-training"
```

- `WEEKLY_TRAINING_PROCESSOR_ID = "weekly-training"` は **Sprint1 transactional processor adapter ID** かつ週間訓練由来`EventEnvelope.sourceProcessor`の同一literalとする。
- legacy `WorldProcessor`／`RunWorldOneWeekInput.processors` へは登録しない。二重実行禁止。
- production constantは1箇所だけに置き、別文字列を二重管理しない。
- `eventType`文字列からproducerを推測しない。
- 戦闘イベントの`sourceProcessor=battle-simulation`は変更しない。

Sprint 1 production normal-week **Sprint1 transactional processor adapter pipeline** は次の1件のみとする。

```text
[ "weekly-training" ]
```

- `battle-simulation`をadapter pipelineへ登録しない。戦闘はadapter pipeline外の明示的run／`commitRunBattlePlan` facade経由とし、自動match schedulingはSprint 1範囲外。
- 既存WorldEngine骨格（current-week phase／worldDate advance／year-start／aging）の順序をS01-008で変更しない。ただし`weekly-training`自体はlegacy WorldProcessor配列には載せない。
- `weekly-training`はSprint1 transactional processor adapterとして当該週に1回だけ実行する。legacy `WorldProcessor.process`契約での実行や`RunWorldOneWeekInput.processors`への登録は禁止。
- 新しいcalendar processorを作らない。既存のcalendar／year-start処理をprocessor配列へ移さない。

## 1.2 InitialWeeklyTrainingSidecarSnapshot

S01-004の`WeeklyTrainingPersonRecord`ではPerson以外に次がrequiredであり、WorldEngine adapterは欠落時にneutral／defaultを捏造してはならない。

- `growthProfile`／`growthPotential`／`statGrowthRemainders`／`temporaryCondition`／`motivationFactor`
- `plannerContext`／`statTargetContext`／`techniqueTargetContexts`
- `teacherFactorKey`／`discipleCount`

`motivationFactor`を10000へdefaultすることは禁止する。S01-004で既に明文化されたoptional field fallback（例: `styleMatch` omitted→50）は既存契約どおり使用できるが、上記top-level sidecar required field欠落を同じ仕組みで補ってはならない。

```text
InitialWeeklyTrainingSidecarSnapshot
- schemaVersion: "0.1.0"
- entries: InitialWeeklyTrainingSidecarEntry[]  // PersonId Unicode code point ascending、重複禁止

InitialWeeklyTrainingSidecarEntry
- personId
- growthProfile
- growthPotential
- statGrowthRemainders
- temporaryCondition
- motivationFactor
- plannerContext
- statTargetContext
- techniqueTargetContexts
- teacherFactorKey
- discipleCount
```

- Person本体は重複保存しない。
- Sprint 1 run開始時、initial Worldの全Personとsidecar entryはexact 1:1でなければならない（missing／extra／duplicate／malformedはreject。neutral補完禁止）。
- 各週のadapterは `current World Person + current sidecar entry` から`WeeklyTrainingPersonRecord`を構築する。
- `processWeeklyTrainingWeek`成功後、`result.personRecords[].person`をWorld Personへ戻し、person以外（personId／growthProfile／growthPotential／statGrowthRemainders／temporaryCondition／motivationFactor／plannerContext／statTargetContext／techniqueTargetContexts／teacherFactorKey／discipleCount）をcurrent `WeeklyTrainingSidecarState`へ戻す。result側field欠落を前週値で補完せずfailure。
- sidecar stateは同じweek transactionに含め、任一failure時はrollbackする（battle failure時もcurrent sidecar非変更）。
- S01-008時点ではsidecar contextをWorld relationshipsから独自に再導出しない。入力された正規sidecarを正本とする。
- `initialWeeklyTrainingSidecarHash = SHA-256(canonicalJson(validated snapshot))`をSimulationIdentity 0.4.0へbindする（02仕様）。current sidecarが週ごとに変わってもidentity／hash／simulationId／initialWeeklyTrainingSidecarHashは再計算しない。

## 1.3 Sprint1RunRuntimeState／Sprint1RunContext（runtime root／context）

World RNG current stateとMatchIdGeneratorState current stateを、WorldEngineStateへ安易に追加しない。Sprint 1 production runはWorldEngineStateの外に正規runtime rootを持つ。immutableなrun固定材料は別owner `Sprint1RunContext`とし、mutableな`Sprint1RunRuntimeState`と論理`Sprint1RunSession`で束ねる。`Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続だが、canonicalである`weeklyTrainingSidecars`および`battleResults`はfinal-worldへ投影する。

```text
Sprint1RunRuntimeState（mutable / rollback対象）
- worldState: WorldEngineState
- worldRngState: SeededRngState
- matchIdGeneratorState: MatchIdGeneratorState
- weeklyTrainingSidecars: WeeklyTrainingSidecarState
- processorRuntimeStates: 既存WorldEngine ProcessorRuntimeState collection
- eventStream: promoted／committed EventEnvelope[]（最終出力先は既存events.jsonl）
- eventAllocationState: EventAllocationState 0.1.0
- battleResults: BattleResult[]（run全体commit順canonical store。final-worldへ投影）
- battleResultWeekState: BattleResultWeekState 0.1.0（同週count専用registry）

Sprint1RunContext（immutable / week・battleで変更しない）
- sprint1Config
- techniqueCatalog
- initialWeeklyTrainingSidecarSnapshot
- simulationIdentity
- simulationIdentityHash
- simulationId
- runRuleSnapshot
- runRuleSnapshotHash

Sprint1RunSession = { context, runtimeState }
```

- context validationは上記fieldのみ。外部`initialMatchIdGeneratorState`依存は持たない（`SimulationIdentity.seed`からfresh初期状態を再構築して`initialMatchIdGeneratorStateHash`を検証する）。

```text
EventAllocationState 0.1.0
- schemaVersion: "0.1.0"
- nextSequence: non-negative safe integer

BattleResultWeekState 0.1.0
- schemaVersion: "0.1.0"
- absoluteWeek: non-negative safe integer
- results: BattleResult[]（同週commit順。run全体storeのcurrent-week suffix）
```

必須invariant: `battleResultWeekState.absoluteWeek === worldState.worldDate.absoluteWeek`（battle facade／commitRunBattlePlan／weekly stepの前に毎回確認）。
必須invariant: `battleResultWeekState.results`は`battleResults`のcurrent-week committed suffixと順序込みcanonical一致（一方だけappend禁止。同前チェック点で確認）。

### 1.3.0 legacy WorldProcessor vs Sprint1 weekly adapter

既存`WorldProcessor = { processorId, process({state,rng})→WorldEngineState }`は変更しない。production配列`[weekly-training]`は**Sprint1 transactional processor adapter pipeline**のみを意味する。`WEEKLY_TRAINING_PROCESSOR_ID`はadapter ID／`EventEnvelope.sourceProcessor`であり、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`への登録対象ではない。二重実行禁止。S01-004 candidatesは既存WorldEngineのcalendar／aging eventsより前にglobal Event Streamへ並ぶ（outer transaction成功時のみallocation）。

### 1.3.1 battle World RNG

- label: `SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL = "battle/world-rng"`
- `initialWorldRngState = createSeededRng(deriveSeed(runSeed, label)).exportState()`
- `runSeed`は`SimulationIdentity.seed`と同じvalidated seed
- `generateInitialWorld`内部RNGの現在位置を流用しない
- fresh生成自体のRNG drawは0。最初の`startBattleTransaction`成功時だけS01-005どおり`nextUint32()`を1回消費してbattleSeedを得る
- pre_start_failure／commit failureではstate変更0。commit success時だけ`StartBattleRuntimeTransition.nextWorldRngState`へ置換
- Battle Resolver最終RNG stateをWorld RNGへ戻さない
- SimulationIdentityへ新fieldを追加しない（seed＋RNG algorithm version＋固定labelから純粋決定）

### 1.3.2 weekly-training processor runtime／RNG

- owner field名は`processorRuntimeStates`（既存`ProcessorRuntimeState` collection）
- exact型: `{ processorOrder: string[]; rngStates: { processorId; state: SeededRngState }[]; processorSpecificStates?: { processorId; specificState }[] }`（`packages/simulation-core/src/world-engine/types.ts`）
- Sprint 0互換: `processorSpecificStates`省略可または`[]`。Sprint 1 fresh／run adapterだけがweekly-training specific state exact 1件を要求。resume時missingはreject（欠落を勝手にinitial化しない）
- weekly-trainingについて`processorId = "weekly-training"` entryをexact 1件持つ
- RNG label: `WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL = "processor/weekly-training"`（WorldEngine `createInitialRuntime`の`world-engine/processor/${id}`とは別。Sprint1 freshは本labelを使う）
- `TrainingProcessorRuntimeState`は`processorSpecificStates`のweekly-training entryの`specificState`として保持する。初期値は必ず`createInitialTrainingProcessorRuntimeState()`
- `specificState`はplain JSON valueのみ（null／boolean／string／finite number／dense array／plain object）。validate／clone／export／restoreはdescriptor-safe deep cloneでsourceとnested参照を共有しない（getter実行禁止／structuredClone単独信用禁止）
- `processWeeklyTrainingWeek`成功時: `result.runtimeState`／`result.rngState`を同entryへ同じweek transactionでcommit。後段failure時はTrainingProcessorRuntimeState／weekly RNG／World／sidecar／eventStream／eventAllocationState／worldDateを全部同時rollback。rngStateだけ先行commitしない

### 1.3.3 BattleResult store（run全体）とBattleResultWeekState（同週count registry）

- run全体canonical owner: `Sprint1RunRuntimeState.battleResults: BattleResult[]`（commit順）。fresh `battleResults = []`
- 同週count registry owner: `Sprint1RunRuntimeState.battleResultWeekState`
- fresh week registry: `{ schemaVersion:"0.1.0", absoluteWeek: promotedWorld.worldDate.absoluteWeek, results: [] }`
- `commitRunBattlePlan`成功時: `completed` BattleResultおよび`resolution_error`のfailed BattleResultを、同一outer transactionで`battleResults`と`battleResultWeekState.results`の両方へcommit順append。`pre_start_failure`／post-start execution abort／commit failureはどちらにもappendなし
- 同じmatchIdの二重登録はpreflightでrejectし、`battleResults`を含む全runtime変更0
- `matchesCompletedThisWorldWeekBeforeBattle`のcount sourceは`battleResultWeekState.results`のみ（`battleResults.length`を使わない）。対象personIdについて current absoluteWeek の results のうち `resultKind === "completed"` かつ finalState の participantA/B.personId が一致する件数。`resolution_error`（`resultKind="failed"`）は両storeへ登録するがcompleted countへ加算しない
- WorldEngine facadeがweek registryから`BattlePostProcessContext`を生成する。callerが任意countを指定して正本化しない
- 週跨ぎ: week transaction成功で`worldDate.absoluteWeek`が進んだ時点で、同じouter transaction内に`battleResultWeekState`を`{ schemaVersion:"0.1.0", absoluteWeek: newAbsoluteWeek, results: [] }`へreset。**`battleResults`は変更しない**（過去BattleResultを週resetで削除しない）。week failure時はworldDate／旧registry／`battleResults`ともunchanged。worldDateだけ進んでregistryが旧週のまま残る状態／registryだけ先行resetは禁止
- suffix invariant: `battleResultWeekState.results`は`battleResults`のcurrent-week committed suffixと順序込みcanonical一致必須（battle facade／commit／weekly step前に確認）
- `battleResults`は`final-world.json`トップレベルへBattleResult全文（`detailedLog`含む）として投影。`battleResultWeekState`はruntime-only。`battle-results.json`等の固定7追加禁止。events.jsonlには既存どおり`battle.started`／`battle.finished`のみ（turn詳細を複製しない）
- Sprint 1ではBattleResult retention削除を実装しない（本体SPECの4年／100年方針を先取りしない）

### 1.3.4 WeeklyTrainingSidecarState／battle developmentEffects適用先

- `WeeklyTrainingSidecarState`はInitial snapshotと同じshape。fresh current = deep clone(initial)。current変更でも`initialWeeklyTrainingSidecarHash`／SimulationIdentityは再計算しない
- owner: current runtimeは`Sprint1RunRuntimeState.weeklyTrainingSidecars`。初期固定値は`Sprint1RunContext.initialWeeklyTrainingSidecarSnapshot`
- `PersonTemporaryCondition`のcurrent正本は`weeklyTrainingSidecars[].temporaryCondition`。Personへfatigue／injury／condition／confidenceを新field追加しない
- BattleParticipantSource: Person本体＋sidecar temporaryCondition。missing sidecar reject／neutral補完禁止
- completedのみ適用: fatigue／injury→sidecar（injuryはsource+delta clamp）、condition／confidence→authoritative `conditionAfter`／`confidenceAfter`をsidecarへ（`conditionRequestedDelta`／`confidenceRequestedDelta`を直接加算しない）、currentMental／techniqueStateDeltas→`Person.sprint1State`。`battleExperienceSummary`はPersonへ新規保存しない（BattleResult内部）
- resolution_error／abort／pre_start／commit failure: Person・sidecar変更0

### 1.3.5 共通

- 現行WorldEngineは`startSequence`／`nextSequence`の裸整数のみを持ち、同意味のnamed Event allocation runtime型は存在しないため`eventAllocationState`を新規定義する
- EventId用の独立mutable generator stateは作らない。eventIdは03契約どおりsequenceから純粋決定する
- RNG stream分離: (A) generateInitialWorld用RNG (B) weekly-training processor RNG `processor/weekly-training` (C) battle World RNG `battle/world-rng`。Battle Resolver内部RNGはCから1回drawしたbattleSeedで初期化。weekly RNGからbattleSeedを取らない／battle World RNGでtrainingを処理しない
- fresh initialization promotion後の初期値: `eventStream = promoted initialEvents`、`eventAllocationState.nextSequence = promotedInitialEvents.length`（initial sequences `0..N-1` ⇒ nextSequence = N）
- `Sprint1RunRuntimeState`はS01-008のtransaction rootとする（contextは不変）。week／battle commitではruntime全componentをdraft cloneし、全validation成功後にだけrootを置換する。任一failure時はroot全体非変更（sequenceだけ進むことを禁止）
- `battle.started`／`battle.finished`も同じglobal `eventAllocationState`から連続割当する
- **runtime checkpoint vs projection**: `Sprint1RunRuntimeState`オブジェクト自体はcheckpointとして固定7へ永続化しない（resume／checkpoint disk persistenceはS01-008対象外）。一方、canonicalである`weeklyTrainingSidecars`および`battleResults`は`final-world.json`トップレベルへ投影する。`Sprint1RunContext.initialWeeklyTrainingSidecarSnapshot`は`initial-world.json`トップレベルへ投影する。`eventAllocationState`／`battleResultWeekState`／`worldRngState`／`matchIdGeneratorState`／`processorRuntimeStates`はruntime-onlyのまま。固定7は exactly 7 files（`sidecar.json`／`battle-results.json`等の8ファイル目を作らない）

## 2. 週間行動

```text
WeeklyAction =
  train_stat
  | learn_technique
  | practice_technique
  | rest
  | inactive
```

- `train_stat`: 対象基礎能力を1つ訓練
- `learn_technique`: 重点習得中の未習得技を練習
- `practice_technique`: 習得済み技を反復
- `rest`: 疲労・調子・負傷回復を優先
- `inactive`: `deceased`、`waiting`、`stopped`。行動として適用せず、人物を完全に非更新とする

大会出場はSprint 2で追加する。Sprint 1の模擬戦は戦闘エンジン単体試験用であり、標準週間Plannerへはまだ含めない。

### 2.1 週開始snapshotと更新draft

週間Processorは処理開始時に不変な`weekStartWorldSnapshot`を1件作り、更新先として別の`nextWorldDraft`を使用する。

- 全人物のPlannerContext、師弟関係、師匠の技状態、門下人数、直近結果、他人物参照は`weekStartWorldSnapshot`だけから算出する。
- 全対象人物が08仕様の有効な`Sprint1PersonState`を持つことをsnapshot確定前に検証し、legacy personを週間処理中に暗黙初期化しない。
- PersonId順で先に処理した人物の`nextWorldDraft`を、同じ週の後続人物の判断・係数・教授可否へ使用しない。
- 各人物の更新結果は`nextWorldDraft`へ書き、全人物・世界不変条件・イベント候補検証の成功後にだけ週全体をcommitする。
- これによりPersonIdは処理順とイベント順だけを決め、同一週内のゲームルール入力を変化させない。

## 3. 行動可能条件

| 状態 | 許可行動 |
|---|---|
| 0〜7歳 | rest |
| trainee | train_stat / learn_technique / practice_technique / rest |
| active_competitor | train_stat / learn_technique / practice_technique / rest |
| retired | 本人行動はrest。明示的なteach行動はSprint 3。既存師弟関係によるSprint 1の静的teacherCanTeach参照は可能 |
| deceased | inactive |
| waiting | inactive |
| stopped | inactive |

### 3.1 強制休養

Sprint 1週間Plannerの強制休養は次の2条件だけとする。

```text
WeeklyForcedRestReason =
  severe_injury
  | fatigue_threshold
```

判定:

- `severe_injury`: 負傷段階が`severe`（08仕様の`temporaryCondition.injuryBands`から導出）
- `fatigue_threshold`: `fatigue >= temporaryCondition.forcedRestFatigueThreshold`

複数該当時の優先順（記録する`forcedReason`もこの順）:

1. `severe_injury`
2. `fatigue_threshold`

`battle.injury.unableToContinueThreshold`は戦闘中の続行不能判定専用であり、週間Plannerの強制休養判定へ使用しない。

### 3.2 候補なしrest fallback

訓練系3行動（`train_stat`／`learn_technique`／`practice_technique`）に有効対象がなく、`rest`だけが候補として残った場合の理由を次で表す。

```text
WeeklyRestFallbackReason =
  no_trainable_stat
  | no_learning_candidate
  | no_practice_candidate
```

イベント候補の`fallbackReasons: WeeklyRestFallbackReason[]`は次を満たす。

- dense配列（sparse禁止）
- 重複なし
- 固定順: `no_trainable_stat`、`no_learning_candidate`、`no_practice_candidate`
- 強制休養時は空配列
- 人物が自由意志で`rest`を選んだ場合も空配列
- 訓練系3行動に有効対象がなく`rest`だけが残った場合に、該当する理由だけを上記固定順で記録する

## 4. 行動評価

正本で定義されている主な評価要因を使用する。

### 4.1 訓練

加点:

- 向上心
- 敗戦
- 昇格戦の接近
- 師匠の助言
- 成長余地

減点:

- 疲労
- 負傷
- 精神的消耗

### 4.2 休養

加点:

- 疲労
- 怪我
- 長期連戦

減点:

- 大会の接近
- 負けず嫌い

Sprint 1では大会要因を入力値として受け取れる構造だけを用意し、実際の日程評価はSprint 2へ送る。師匠情報や大会情報が入力されない場合、対応するスコアは0とし、架空の値を補完しない。

### 4.3 WeeklyPlannerContext

各ActionScoreの曖昧な再解釈を防ぐため、人物ごと・候補行動ごとに次を入力する。

```text
WeeklyPlannerContext
- byAction:
    train_stat: WeeklyActionContextScore
    learn_technique: WeeklyActionContextScore
    practice_technique: WeeklyActionContextScore
    rest: WeeklyActionContextScore

WeeklyActionContextScore
- personality: -20..20
- developmentNeed: -20..20
- recentResult: -20..20
- teacherAdvice: -20..20
- schedule: -20..20
```

- 各値は入力adapterが既存人物・関係・直近結果から正規化する
- 情報が存在しない要因だけ0とし、情報があるのに0へ丸めて無視しない
- ActionScoreでは14仕様の`contextWeights`を掛ける
- 同一人物・同一週・同一入力では同じcontext全文となる
- Sprint 2で大会日程を接続するまではscheduleを0とする

## 5. 標準Planner `[Sprint 1暫定]`

固定成功値ではなく、型付き設定による整数`scoreHundredths`方式を使用する。表示用小数を状態へ保存しない。追加の浮動小数変換や`Math.round`は使用しない。負値の切り捨てはJavaScriptのtruncateではなく数学的floor（`mathematicalFloor`）を使う。

```text
baseScoreHundredths = baseScore * 100

contextNumerator
= Σ(contextValue * contextWeightBasisPoints)

contextScoreHundredths
= mathematicalFloor(contextNumerator / 100)

baseFatiguePenalty
= floor(fatigue / 5) * baseFatiguePenaltyPerFivePoints

baseInjuryPenalty
= floor(injury / 5) * baseInjuryPenaltyPerFivePoints

baseMentalExhaustionPenalty
= floor(
    (maxMental - currentMental)
    * baseMentalExhaustionPenaltyMaximum
    / maxMental
  )

penaltyHundredths
= floor(
    basePenalty
    * burdenPenaltyMultiplierBasisPoints
    / 100
  )

fatigueBonusHundredths
= min(
    fatigueMaximum * 100,
    floor(
      floor(fatigue / 5)
      * fatiguePerFivePointsBasisPoints
      / 100
    )
  )

injuryBonusHundredths
= min(
    injuryMaximum * 100,
    floor(
      floor(injury / 5)
      * injuryPerFivePointsBasisPoints
      / 100
    )
  )

mentalBonusHundredths
= floor(
    (maxMental - currentMental)
    * mentalExhaustionMaximum
    / maxMental
  ) * 100

TrainingActionScoreHundredths(action)
= baseScoreHundredths(action)
+ contextScoreHundredths(action)
- penaltyHundredths(fatigue)
- penaltyHundredths(injury)
- penaltyHundredths(mental)

RestActionScoreHundredths
= baseScoreHundredths(rest)
+ contextScoreHundredths(rest)
+ fatigueBonusHundredths
+ injuryBonusHundredths
+ mentalBonusHundredths
```

- `TrainingActionScoreHundredths` は `train_stat`、`learn_technique`、`practice_technique` へ適用する
- `rest` へ訓練行動と同じ負担減点を適用しない。疲労・負傷・精神消耗が高いほど、14仕様の回復必要度bonusにより休養を選びやすくする
- context／burden／restNeedの各係数は14仕様のnormalized BasisPointsを使用する
- `maxMental<=0`は人物状態不正としてPlannerを失敗させ、0除算を補正値で隠さない
- ActionScoreHundredthsは上記整数値の加減のみで求め、比較にも同じ整数を使う

### 5.1 基礎スコア

| careerStatus | train | learn | practice | rest |
|---|---:|---:|---:|---:|
| trainee | 35 | 30 | 20 | 15 |
| active_competitor | 30 | 20 | 30 | 20 |
| retired | 0 | 0 | 0 | 100 |

- 候補が存在しない行動は除外する
- 強制休養時は採点せずrest
- 最高スコアを選ぶ
- 最高スコアが複数の場合だけ、同点候補を固定順へ正規化してseeded RNGを1回使用する
- 係数は `weeklyPlanner` 設定で管理する

これは正本に未定義のため `[Sprint 1暫定]` であり、長期シミュレーション後に調整する。

## 6. 対象選択

### 6.1 訓練能力

候補ごとに次を評価する。

- 現在値係数
- 能力別成長素質
- 得意系統との関連
- 師匠の得意分野
- 直近敗戦の原因

`[Sprint 1暫定]` スコアは14仕様の`statTargetWeights`（normalized BasisPoints）を正とする。

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

既定weights:

```text
remainingCapacity = 10000
growthPotential = 10000
relatedAptitude = 5000
teacherRecommendation = 10000
```

これにより旧暫定浮動小数式と一致する。

同値候補が複数の場合だけ、基礎能力の固定順へ正規化してseeded RNGを1回使用する。

### 6.2 未習得技

人物は09仕様の `learningFocusTechniqueId` により、原則1つの重点習得技を持つ。重点技がactive learning focus候補である間は変更しない。習得完了、参照無効、知識源喪失、または09仕様の`blocked_at_cap`へ移行した場合はfocusを解除して再選択する。

候補条件:

- 未習得かつTechniqueDefinitionが有効
- 09仕様の`teacherCanTeach=true`。Sprint 1では独学候補を作成しない
- 前提参照・dataVersionが有効
- 09仕様の導出状態が`blocked_at_cap`ではない
- 導出状態が`acquirable`の場合は追加進捗行動を作らず、同週の習得完了判定候補として扱う（§6.2.1）

`[Sprint 1暫定]`:

- `learningProgressRequired` は09仕様どおり1以上を必須とし、0以下は候補採点前に拒否する。ゼロ除算を補正値で隠さない。
- 入力時は`learningProgressTenths`を`0..learningProgressRequired * 10`でvalidationし、範囲外を拒否する。不正入力をclampして成功させない。
- 週間進捗の正常適用後だけ、`learningProgressRequired * 10`を上限として`min`する（09仕様）。

整数`LearningTargetScoreHundredths`の入力:

```text
domainAptitude: integer 0..100
requiredStatsFactorBasisPoints: integer 7000..12000
learningProgressTenths: integer
learningProgressRequired: integer 1..10000
teacherCanTeach: boolean
styleMatch: integer 0..100
```

- `requiredStatsFactorBasisPoints`は09仕様の`requiredStatsFactor`をnormalized BasisPoints化した値（範囲7000..12000）
- `learningTargetWeights`は14仕様どおり合計100の整数weight（既定: aptitude=25、requiredStats=15、currentProgress=25、teacherAvailability=20、styleMatch=10、tierAccessibility=5）

```text
progressCapTenths
= learningProgressRequired * 10
```

```text
0 <= learningProgressTenths
learningProgressTenths <= progressCapTenths
```

範囲外をclampして成功させない。

```text
aptitudeContributionHundredths
= domainAptitude
  * learningTargetWeights.aptitude

requiredStatsContributionHundredths
= floor(
    requiredStatsFactorBasisPoints
    * learningTargetWeights.requiredStats
    * 100
    / 12000
  )

progressContributionHundredths
= floor(
    learningProgressTenths
    * learningTargetWeights.currentProgress
    * 100
    / progressCapTenths
  )

teacherContributionHundredths
= teacherCanTeach
  ? learningTargetWeights.teacherAvailability * 100
  : 0

styleContributionHundredths
= styleMatch
  * learningTargetWeights.styleMatch

tierAccessibilityBasisPoints
= clamp(
    0,
    10000,
    mathematicalFloor(
      (500 - learningProgressRequired)
      * 10000
      / 500
    )
  )

tierContributionHundredths
= floor(
    tierAccessibilityBasisPoints
    * learningTargetWeights.tierAccessibility
    / 100
  )

LearningTargetScoreHundredths
= aptitudeContributionHundredths
+ requiredStatsContributionHundredths
+ progressContributionHundredths
+ teacherContributionHundredths
+ styleContributionHundredths
+ tierContributionHundredths
```

- 各寄与を名前付き最終値としてfloorしてから合計する
- すべてsafe integer。`Math.round`、epsilon、浮動小数score保存は禁止
- `styleMatch`は既存の戦い方データを0..100へ正規化した入力。存在しない場合は50
- `teacherCanTeach`は09仕様の式を`weekStartWorldSnapshot`へ適用して決め、推測しない
- 進捗計算用の`TechniqueLearningContext`も同じweekStartWorldSnapshotから候補技・学習者・師匠の組ごとに固定し、同週のdraft値を参照しない
- 必要進捗未満なら、条件未達でも師匠が教授可能な技を候補にできる。必要進捗上限へ到達して条件不足となった時点で`blocked_at_cap`としてactive候補から除外する
- `blocked_at_cap`のfocusを解除する際、未達前提技が複数ある場合はTechniqueId昇順へ正規化して通常の`LearningTargetScoreHundredths`で選ぶ
- 必要能力不足だけの場合は、関連する不足能力へ`teacherRecommendation`またはPlannerの不足能力入力を反映し、同じblocked技を再選択しない
- 必要適性不足だけの場合はSprint 1中の再選択候補から除外し、適性成長を推測しない
- 最高点同値だけTechniqueId順へ正規化してRNGを1回使用する

golden例（既定weights）:

```text
domainAptitude=80
requiredStatsFactorBasisPoints=10000
learningProgressTenths=900
progressCapTenths=1800
teacherCanTeach=true
styleMatch=50
learningProgressRequired=180

aptitudeContributionHundredths=2000
requiredStatsContributionHundredths=1250
progressContributionHundredths=1250
teacherContributionHundredths=2000
styleContributionHundredths=500
tierContributionHundredths=320
LearningTargetScoreHundredths=7320
```

### 6.2.1 `acquirable`技の週間処理

`LearningTargetDerivedStatus=acquirable`の技は、追加進捗行動を作らず同週の習得完了判定候補として扱い、`learn_technique`の有効Planner対象として残す。

選択された場合:

```text
WeeklyAction = learn_technique
```

- 行動同点解消RNGは通常規則
- 対象同点解消RNGは通常規則
- 効果RNGは0回
- `learningProgressTenths`は変更しない
- `technique.learning_progressed`は生成しない
- `acquiredAbsoluteWeek`を現在週へ設定
- tier別初期masteryを設定（09仕様`initialMasteryByTier`）
- `learningFocusTechniqueId = null`
- `technique.acquired`を生成
- `learn_technique`の週間疲労deltaを適用
- `training.condition_updated`を生成
- `actionCounts.learn_technique`を1加算
- `processedPersonCount`を1加算
- `totalLearningProgressGainTenths`は+0
- 初期mastery deltaを`totalMasteryGainHundredths`へ加算

人物内イベント順:

```text
training.action_selected
technique.acquired
training.condition_updated
```

### 6.3 習得済み技

候補は習得済みかつ有効なTechniqueDefinitionだけとする。

```text
recentPracticeNeed
= lastPracticedAbsoluteWeekがnullなら100
  それ以外は clamp(
    0,
    100,
    floor((currentAbsoluteWeek - lastPracticedAbsoluteWeek) * 100 / 12)
  )
```

整数`PracticeTargetScoreHundredths`の入力:

```text
masteryHundredths: integer 0..10000
recentPracticeNeed: integer 0..100
teacherPriority: integer 0..100
styleMatch: integer 0..100
```

- `practiceTargetWeights`は14仕様どおり合計100の整数weight（既定: masteryNeed=50、recentPracticeNeed=20、teacherPriority=15、styleMatch=15）

```text
masteryNeedContributionHundredths
= floor(
    (10000 - masteryHundredths)
    * practiceTargetWeights.masteryNeed
    / 100
  )

recentPracticeContributionHundredths
= recentPracticeNeed
  * practiceTargetWeights.recentPracticeNeed

teacherPriorityContributionHundredths
= teacherPriority
  * practiceTargetWeights.teacherPriority

practiceStyleContributionHundredths
= styleMatch
  * practiceTargetWeights.styleMatch

PracticeTargetScoreHundredths
= masteryNeedContributionHundredths
+ recentPracticeContributionHundredths
+ teacherPriorityContributionHundredths
+ practiceStyleContributionHundredths
```

- 各寄与を名前付き最終値としてfloorしてから合計する（masteryNeed以外は整数積のため追加floor不要）
- すべてsafe integer。`Math.round`、epsilon、浮動小数score保存は禁止
- `teacherPriority`は実在する師匠入力を0..100へ正規化し、師匠なしは0
- `styleMatch`は6.2と同じ入力。存在しない場合は50
- currentAbsoluteWeekより未来のlastPracticedAbsoluteWeekは継続不能エラー
- 最高点同値だけTechniqueId順へ正規化してRNGを1回使用する

golden例（既定weights）:

```text
masteryHundredths=4000
recentPracticeNeed=50
teacherPriority=20
styleMatch=50

masteryNeedContributionHundredths=3000
recentPracticeContributionHundredths=1000
teacherPriorityContributionHundredths=300
practiceStyleContributionHundredths=750
PracticeTargetScoreHundredths=5050
```

## 7. 週次処理順

1. 対象人物をPersonId昇順で確定
2. 人物状態・参加状態・年齢を検証
3. 強制休養を判定
4. WeeklyAction候補を作成
5. 行動スコアを計算
6. WeeklyActionを決定
7. 対象能力または技を決定
8. 未保持技が習得focusへ確定した場合は09仕様の実`PersonTechniqueState`を`nextWorldDraft`へ原子的に作成
9. 08または09の主効果を計算
10. `train_stat`の場合は09仕様の関連能力通常修行熟練度を最大1技へ計算
11. 疲労・負傷・調子・`currentMental`を更新
12. 人物内不変条件を検証
13. EventEnvelopeへ包む前のイベント候補を作成
14. 次人物へ進む
15. 全人物成功後にイベント候補をPersonId処理順・責務別固定順で確定
16. ProcessorRuntimeStateを更新
17. 新WorldState、次RNG状態、順序付きイベント候補を一括返却

週間Processorは`eventId`、`simulationId`、`sequence`を発行しない。WorldEngineの共通Event Stream append層が、同一週の全Processorから受け取った順序付き候補を世界処理順へ統合し、EventEnvelope 0.2.0、EventId、グローバルsequenceを付与する。

WorldEngineの週トランザクションはWorldState、World RNG、ProcessorRuntimeState、EventId生成器、Event sequenceに加え、試合作成を含む週では`MatchIdGeneratorState`も開始時にsnapshot化する。後続失敗時は全状態を同時にrollbackし、MatchIdだけを消費済みにしない。

## 8. RNG消費順

人物ごとに次の論理順序を固定する。不要なスロットは消費しない。

1. 行動種別の最高スコアが複数の場合だけ、同点解消RNGを1回
2. 対象能力・対象技の最高スコアが複数の場合だけ、同点解消RNGを1回
3. 実行行動に対応する主効果RNGを1回（例外あり）
   - `train_stat`: 08仕様の能力成長RNG。関連能力通常修行熟練度は同じ結果へ決定的に付随し、追加RNGなし
   - `learn_technique`（`progressing`）: 09仕様の習得進捗RNG
   - `learn_technique`（`acquirable`）: 効果RNGは0回（§6.2.1）
   - `practice_technique`: 09仕様の専用反復熟練度RNG
4. 週末一時状態変動 `[Sprint 1暫定予約]` はSprint 1では0回

規則:

- 候補ごとにRNGを加算してスコアを揺らさない
- `inactive` 人物はRNGを消費しない
- 強制休養と通常の `rest` は行動選択・対象選択・効果係数RNGを消費しない
- `train_stat`、`progressing`の`learn_technique`、`practice_technique`が確定した後は、最終効果が0でも効果係数RNGを1回消費する
- `acquirable`の`learn_technique`は効果係数RNGを消費しない
- 候補配列はIDまたは固定enum順へ正規化する
- 各分岐の消費回数をRuntimeState再開試験で固定する
- 効果RNG係数の生成契約（`drawInclusiveBasisPoints`）は08／09／14仕様を正本とする

## 9. ProcessorRuntimeState

```text
TrainingProcessorRuntimeState
- schemaVersion: "0.1.0"
- lastProcessedAbsoluteWeek: integer >= 0 | null
- processedPersonCount: safe integer >= 0
- actionCounts:
    train_stat: safe integer >= 0
    learn_technique: safe integer >= 0
    practice_technique: safe integer >= 0
    rest: safe integer >= 0
- totalStatGainMilliPoints: safe integer >= 0
- totalLearningProgressGainTenths: safe integer >= 0
- totalMasteryGainHundredths: safe integer >= 0
- forcedRestCount: safe integer >= 0
```

初期値:

- `lastProcessedAbsoluteWeek = null`
- 全count／total = 0

規則:

- canonical順は上記の記載順
- 次のカウンタ／合計はProcessor開始以降の累積値であり、週ごとに上書きしない

```text
actionCounts
processedPersonCount
totalStatGainMilliPoints
totalLearningProgressGainTenths
totalMasteryGainHundredths
forcedRestCount
```

- 週成功時: `nextValue = previousValue + currentWeekValue`
- `processedPersonCount = actionCounts`の4項目（`train_stat`／`learn_technique`／`practice_technique`／`rest`）の累積合計
- `forcedRestCount`は累積`rest`件数のうち`forced=true`だった件数
- `inactive`は`actionCounts`へ含めない
- `deceased`／`waiting`／`stopped`は`processedPersonCount`にも加算しない
- 習得進捗はtenths、熟練度はhundredthsで集計する
- `totalMasteryGainHundredths`には次を含む: 習得時の初期mastery、`practice_technique`による増分、`train_stat`付随熟練度増分。戦闘によるmastery増分は含めない
- 人物ごとの状態を重複保存しない
- 再開に必要な最小情報だけを持つ
- 週番号逆行を許さない
- 同一週の二重処理を拒否する

## 10. 原子的更新

- 入力WorldState、人物配列、RNG状態を変更しない
- 全人物の処理と検証が成功した場合だけ更新を確定する
- 途中失敗時は人物更新、イベント、RNG消費を一切commitしない
- ProcessorRuntimeStateも成功時だけ更新する

## 11. イベント

10は行動選択を表す次のイベントを1人物・1処理週につき最大1件生成する。

### `training.action_selected`

- personId
- action
- targetStat
- targetTechniqueId
- candidateScores
- forced
- `forcedReason: WeeklyForcedRestReason | null`
- `fallbackReasons: WeeklyRestFallbackReason[]`

実際の効果は責務別イベントとして生成し、同じ更新を汎用イベントで二重記録しない。

- 能力成長・一時状態・休養: 08仕様の `training.*`
- 技習得・熟練度: 09仕様の `technique.*`

### 11.1 人物内イベント責務順（行動別fixture）

全イベントtypeを1本の配列へ並べて分岐順を推測しない。同一人物のイベント候補は次の行動別fixtureとする。同一責務内で複数`TechniqueId`があり得る場合は`TechniqueId`昇順。

```text
train_stat:
  training.action_selected
  training.stat_growth_applied
  technique.mastery_increased（付随熟練度がある場合のみ）
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
  イベント0件
```

delta=0および生成条件:

- `training.action_selected`はactive人物に必須
- effect eventは責務側仕様（08／09）で必須とされた場合だけ生成する
- 同じ状態deltaを複数eventへ重複記録しない
- `inactive`人物は0件（行動選択イベントも生成しない）
- `acquirable`では`technique.learning_progressed`を生成しない（§6.2.1）

週間Processorが返すのはEventEnvelope候補であり、`eventId`、`simulationId`、`sequence`を持たない。共通append層がEventEnvelope 0.2.0へ包み、`sourceProcessor="weekly-training"`と`entities.personIds`（候補personId 1件）を設定する。

## 12. エラー処理

### 継続可能

- 習得候補なし（`no_learning_candidate`）
- 熟練候補なし（`no_practice_candidate`）
- 成長余地なし（`no_trainable_stat`）

この場合はrestへ置換し、`training.action_selected.fallbackReasons`へ§3.2の規則で理由を残す。強制休養や自由意志のrestでは空配列とする。

### 継続不能

- 存在しないPersonId／TechniqueId
- 数値範囲外
- 同一週二重処理
- RuntimeState週番号逆行
- RNG状態欠落
- schemaVersion不一致
- 途中検証違反

継続不能時は週全体をcommitしない。

## 13. 不変条件

- 1人物につき1週間1行動
- 0〜7歳は正式訓練なし
- deceased、waiting、stoppedは人物状態・RNG・RuntimeState件数・イベントのすべてで非更新
- 強制休養対象は訓練・技練習を行わない
- 能力・技状態・一時状態が各仕様の範囲内
- 返却イベント候補の人物順・責務別順が決定的で、共通append後のEventEnvelope sequenceが世界全体で連続
- RuntimeStateの週番号単調増加
- RNG終端状態を保存
- 入力オブジェクト不変
- same seed完全一致

## 14. 必須テスト

- 全careerStatus／participationStatus
- 強制休養
- 候補なしrest置換
- 同点seeded選択
- PersonId処理順
- RNG消費順と各分岐の正確な消費回数
- 候補数1件・同点なしで不要RNGを消費しないこと
- WeeklyPlannerContext全要因と欠落要因0
- 能力訓練と関連技1件の通常修行熟練度
- LearningTargetScoreHundredths全項目・golden 7320・重点技維持・同点seed
- PracticeTargetScoreHundredthsの12週境界・golden 5050・未来週拒否・同点seed
- learningProgressTenths入力範囲外拒否（clampして成功させない）
- learning focusのblocked_at_cap解除、未達前提技への切替、`acquirable`の効果RNG0・初期mastery加算
- 技習得
- 技熟練
- 休養
- 二重処理拒否
- 途中エラーの全体rollback
- RuntimeState再開一致・週跨ぎ累積加算
- 行動別イベント順fixture
- 週間ProcessorがeventId／simulationId／sequenceを発行しないこと
- WorldEngine共通append後の全Processor横断sequence連続
- weekStartWorldSnapshotだけを他人物参照へ使用し、同週の先行draftを後続人物が参照しない
- Sprint1PersonState欠落・未知版を週処理前に拒否し、処理中に補完しない
- 週失敗時にMatchIdGeneratorStateを含む全トランザクション状態がrollback
- same seed一致、different seed差分

## 15. 後続Sprintへ送る事項

- 大会日程を含む行動評価
- 模擬戦・公式戦と週間行動の接続。Sprint 1の週間疲労設定にはmockBattleキーを置かない
- 師匠変更
- 恋愛・関係変化
- 引退判断
- 指導行動

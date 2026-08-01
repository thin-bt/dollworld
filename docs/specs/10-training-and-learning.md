# 10 週間行動・訓練・習得処理仕様

- 仕様版: `S1-SPEC-0.1.10-draft`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 週次行動選択、能力訓練、技習得、休養、処理順
- 非対象: 大会日程、師匠選択、恋愛、結婚、出産

## 1. 目的

人物が1週間ごとに自律的に行う行動を決定し、08・09仕様に従って能力、技、一時状態を決定的かつ原子的に更新する。

正本ではユーザーが訓練等を直接指示せず、人物の性格・能力・関係性に基づく自律判断を観察する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

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

次は原則として強制休養とする。

- 重傷
- 疲労81以上
- 続行不能状態

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

固定成功値ではなく、型付き設定によるスコア方式を使用する。

```text
ContextScore
= personality * weeklyPlanner.contextWeights.personality
+ developmentNeed * weeklyPlanner.contextWeights.developmentNeed
+ recentResult * weeklyPlanner.contextWeights.recentResult
+ teacherAdvice * weeklyPlanner.contextWeights.teacherAdvice
+ schedule * weeklyPlanner.contextWeights.schedule

TrainingActionScore(action)
= baseScore(action)
+ ContextScore(action)
- baseFatiguePenalty * burdenPenaltyMultipliersByAction[action].fatigue
- baseInjuryPenalty * burdenPenaltyMultipliersByAction[action].injury
- baseMentalExhaustionPenalty * burdenPenaltyMultipliersByAction[action].mental

RestActionScore
= baseScore(rest)
+ ContextScore(rest)
+ fatigueRecoveryNeedBonus
+ injuryRecoveryNeedBonus
+ mentalRecoveryNeedBonus
```

- `TrainingActionScore` は `train_stat`、`learn_technique`、`practice_technique` へ適用する
- `rest` へ訓練行動と同じ減点を適用しない。疲労・負傷・精神消耗が高いほど、14仕様の回復必要度bonusにより休養を選びやすくする
- base penalty、action別倍率、rest bonusは14仕様の固定構造を使用する

```text
fatigueRecoveryNeedBonus
= min(
    weeklyPlanner.restNeedBonuses.fatigueMaximum,
    floor(fatigue / 5) * weeklyPlanner.restNeedBonuses.fatiguePerFivePoints
  )

injuryRecoveryNeedBonus
= min(
    weeklyPlanner.restNeedBonuses.injuryMaximum,
    floor(injury / 5) * weeklyPlanner.restNeedBonuses.injuryPerFivePoints
  )

mentalRecoveryNeedBonus
= floor(
    (1 - currentMental / maxMental)
    * weeklyPlanner.restNeedBonuses.mentalExhaustionMaximum
  )
```

- `maxMental<=0`は人物状態不正としてPlannerを失敗させ、0除算を補正値で隠さない
- Planner scoreは `scoreHundredths` の整数固定小数点で比較し、表示用小数を状態へ保存しない

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

`[Sprint 1暫定]` スコア:

```text
StatTargetScore
= (100 - currentValue)
+ growthPotential
+ relatedAptitude * 0.5
+ teacherRecommendation
```

同値候補が複数の場合だけ、基礎能力の固定順へ正規化してseeded RNGを1回使用する。

### 6.2 未習得技

人物は09仕様の `learningFocusTechniqueId` により、原則1つの重点習得技を持つ。重点技がactive learning focus候補である間は変更しない。習得完了、参照無効、知識源喪失、または09仕様の`blocked_at_cap`へ移行した場合はfocusを解除して再選択する。

候補条件:

- 未習得かつTechniqueDefinitionが有効
- 09仕様の`teacherCanTeach=true`。Sprint 1では独学候補を作成しない
- 前提参照・dataVersionが有効
- 09仕様の導出状態が`blocked_at_cap`ではない
- 導出状態が`acquirable`の場合は追加進捗行動を作らず、同週の習得完了判定候補として扱う

`[Sprint 1暫定]`:

- `learningProgressRequired` は09仕様どおり1以上を必須とし、0以下は候補採点前に拒否する。ゼロ除算を補正値で隠さない。
- `learningProgressTenths` は0..`learningProgressRequired * 10`へclamp済みであることを検証する。

```text
progressRatio
= clamp(0, 1, learningProgressTenths / (learningProgressRequired * 10))

tierAccessibility
= clamp(0, 1, 1 - learningProgressRequired / 500)

LearningTargetScore
= domainAptitude / 100 * weeklyPlanner.learningTargetWeights.aptitude
+ requiredStatsFactor / 1.20 * weeklyPlanner.learningTargetWeights.requiredStats
+ progressRatio * weeklyPlanner.learningTargetWeights.currentProgress
+ (teacherCanTeach ? weeklyPlanner.learningTargetWeights.teacherAvailability : 0)
+ styleMatch / 100 * weeklyPlanner.learningTargetWeights.styleMatch
+ tierAccessibility * weeklyPlanner.learningTargetWeights.tierAccessibility
```

- `styleMatch`は既存の戦い方データを0..100へ正規化した入力。存在しない場合は50
- `teacherCanTeach`は09仕様の式を`weekStartWorldSnapshot`へ適用して決め、推測しない
- 進捗計算用の`TechniqueLearningContext`も同じweekStartWorldSnapshotから候補技・学習者・師匠の組ごとに固定し、同週のdraft値を参照しない
- 必要進捗未満なら、条件未達でも師匠が教授可能な技を候補にできる。必要進捗上限へ到達して条件不足となった時点で`blocked_at_cap`としてactive候補から除外する
- `blocked_at_cap`のfocusを解除する際、未達前提技が複数ある場合はTechniqueId昇順へ正規化して通常のLearningTargetScoreで選ぶ
- 必要能力不足だけの場合は、関連する不足能力へ`teacherRecommendation`またはPlannerの不足能力入力を反映し、同じblocked技を再選択しない
- 必要適性不足だけの場合はSprint 1中の再選択候補から除外し、適性成長を推測しない
- 全条件が満たされた上限到達技は追加RNGを消費せず習得完了する
- 最高点同値だけTechniqueId順へ正規化してRNGを1回使用する

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

PracticeTargetScore
= (1 - mastery / 100) * weeklyPlanner.practiceTargetWeights.masteryNeed
+ recentPracticeNeed / 100 * weeklyPlanner.practiceTargetWeights.recentPracticeNeed
+ teacherPriority / 100 * weeklyPlanner.practiceTargetWeights.teacherPriority
+ styleMatch / 100 * weeklyPlanner.practiceTargetWeights.styleMatch
```

- `teacherPriority`は実在する師匠入力を0..100へ正規化し、師匠なしは0
- `styleMatch`は6.2と同じ入力。存在しない場合は50
- currentAbsoluteWeekより未来のlastPracticedAbsoluteWeekは継続不能エラー
- 最高点同値だけTechniqueId順へ正規化してRNGを1回使用する

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
3. 実行行動に対応する主効果RNGを1回
   - `train_stat`: 08仕様の能力成長RNG。関連能力通常修行熟練度は同じ結果へ決定的に付随し、追加RNGなし
   - `learn_technique`: 09仕様の習得進捗RNG
   - `practice_technique`: 09仕様の専用反復熟練度RNG
4. 週末一時状態変動 `[Sprint 1暫定予約]` はSprint 1では0回

規則:

- 候補ごとにRNGを加算してスコアを揺らさない
- `inactive` 人物はRNGを消費しない
- 強制休養と通常の `rest` は行動選択・対象選択・効果係数RNGを消費しない
- 訓練・習得・熟練行動が確定した後は、最終効果が0でも効果係数RNGを1回消費する
- 候補配列はIDまたは固定enum順へ正規化する
- 各分岐の消費回数をRuntimeState再開試験で固定する

## 9. ProcessorRuntimeState

```text
TrainingProcessorRuntimeState
- schemaVersion
- lastProcessedAbsoluteWeek
- processedPersonCount
- actionCounts
- totalStatGainMilliPoints
- totalLearningProgressGainTenths
- totalMasteryGainHundredths
- forcedRestCount
```

- 習得進捗はtenths、熟練度はhundredthsで集計する
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
- forcedReason

実際の効果は責務別イベントとして生成し、同じ更新を汎用イベントで二重記録しない。

- 能力成長・一時状態・休養: 08仕様の `training.*`
- 技習得・熟練度: 09仕様の `technique.*`

`inactive` 人物は処理対象外のため行動選択イベントも生成しない。週間Processorが返すのはEventEnvelope候補であり、`eventId`、`simulationId`、`sequence`を持たない。共通append層がEventEnvelope 0.2.0へ包み、`entities.personIds`へ対象人物を設定する。

## 12. エラー処理

### 継続可能

- 習得候補なし
- 熟練候補なし
- 成長余地なし

この場合はrestへ置換し、理由をイベントへ残す。

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
- LearningTargetScore全項目・重点技維持・同点seed
- PracticeTargetScoreの12週境界・未来週拒否・同点seed
- learning focusのblocked_at_cap解除、未達前提技への切替、条件充足後のRNGなし習得完了
- 技習得
- 技熟練
- 休養
- 二重処理拒否
- 途中エラーの全体rollback
- RuntimeState再開一致
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

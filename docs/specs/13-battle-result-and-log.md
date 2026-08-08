# 13 戦闘終了・判定・ログ仕様

- 仕様版: `S1-SPEC-0.1.19`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 戦闘終了、判定勝ち、BattleResult、疲労・負傷効果、概要・詳細ログ
- 非対象: 大会順位、昇格、賞金、長期ログ削除、観戦UI

## 1. 目的

BattleStateを正本の終了条件と判定基準で確定し、勝者・敗者・終了理由・人物への後処理効果・再現可能なログを生成する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

最終の参加者battle-local状態を検証するcanonical baselineは、戦闘開始時の`BattleParticipantSnapshot.sourceSnapshot`（11仕様）と`BattleDetailedLog`の組み合わせとする。具体的なreplay validatorの実装はS01-006の受入範囲であり、本clarificationでは未実装ログフィールドを新設しない。

## 2. 終了条件

次を各行動後とターン終了時に確認する。

1. 戦闘不能
2. 降参
3. 続行不能
4. 最大20ターン到達
5. 解決不能エラー

```text
BattleEndReason =
  knockout
  | surrender
  | unable_to_continue
  | judge_decision
  | resolution_error
```

公式戦は原則として勝者を必ず決め、通常の引き分けを設けない。

## 3. 戦闘不能

- currentDurability=0の人物を敗者とする
- 先手行動で後手が戦闘不能となった場合、後手の未実行行動を中止
- Sprint 1では同時発動・被弾反撃を実行しないため、通常解決で双方が同時に0になる状態を作らない。予約actionTraitsの実装後に同時戦闘不能規則を追加する。

## 4. 最大ターン判定

- maxTurnsは20
- 20ターン終了時に判定
- 判定は100点を基本とする

| 評価区分 | 最大点 |
|---|---:|
| 相手の最大耐久に対する有効ダメージ割合 | 50 |
| 有効打・技成功回数 | 15 |
| 技の難度・重要度・大技成功 | 15 |
| 間合いと攻勢の主導権 | 10 |
| 防御・回避・反撃の成功 | 10 |
| 消極行動・無効行動 | 0〜20点減点 |

### 4.1 配点計算 `[Sprint 1暫定具体化]`

```text
damageScore
= min(50, floor(damageDealt / opponentMaxDurability * 50))

hitScore
= min(15, successfulHits)

techniqueScore
= min(15, sum(successfulTechniqueImportancePoints))

initiativeScore
= min(10, max(0, floor(advantageTurnCount * 10 / max(1, turnsExecuted))))

defenseScore
= min(10, successfulDefenses + successfulEvasions + successfulCounters * 2)

passivityPenalty
= min(20, passiveActionCount * 2 + invalidActionCount * 2)
```

`successfulTechniqueImportancePoints` は成功した非基本技ごとに次を加算する `[Sprint 1暫定]`。

| learningTier | 点 |
|---|---:|
| basic | 1 |
| standard | 2 |
| advanced | 3 |
| secret | 5 |

`initiativeScore`は中間浮動小数を保存せず、`advantageTurnCount * 10 / max(1, turnsExecuted)`を最後に`floor`する。各ターン終了時に優勢側を1人だけ決め、同値ターンはどちらにも加算しない。`invalidActionCount` は12仕様の不正行動置換回数と一致させる。予約actionTraitsを実行しないSprint 1では `successfulCounters=0` とする。各係数は `battle.judgement` 設定で管理する。

### 4.2 判定得点構造

```text
JudgeScoreBreakdown
- damageScore
- hitScore
- techniqueScore
- initiativeScore
- defenseScore
- passivityPenalty
- totalScore

JudgeScoreByParticipant
- participantA
- participantB
```

```text
totalScore
= clamp(
    battle.judgement.totalMinimum,
    battle.judgement.totalMaximum,
    damageScore
    + hitScore
    + techniqueScore
    + initiativeScore
    + defenseScore
    - passivityPenalty
  )
```

- `judgeScore`は判定計算を実行した場合に必須とする。具体的には`endReason=judge_decision`、または`endReason=unable_to_continue`かつ最終状態で双方`unableToContinue=true`の場合である
- 上記以外は`judgeScore=null`とする
- 同点処理はまず`totalScore`を比較し、同点の場合だけ5章の比較へ進む
- 各内訳は詳細ログと最終stateから再計算できなければならない

## 5. 同点処理

`totalScore`が同点の場合だけ、次を順番に比較する。先に差が付いた段階で勝者を確定し、以降の比較とRNGを行わない。

### 5.1 有効ダメージ割合

§4 `damageScore`で用いる`damageDealt`と同一の実ダメージaggregateを使う。各sideの相手最大耐久は`opponentMaxDurability`（相手participantの`maxDurability`）とする。

```text
A.opponentMaxDurability = B.maxDurability
B.opponentMaxDurability = A.maxDurability
```

勝敗比較ではfloor済み比率を使わない。次の比の大小を精度損失なく比較するため、BigInt交差積を用いる（本clarificationで固定する比較契約）。

```text
left  = A.damageDealt * B.maxDurability
right = B.damageDealt * A.maxDurability
```

- `left > right` → participantA勝利
- `left < right` → participantB勝利
- `left === right` → 次へ

### 5.2 攻撃成功回数

`successfulHits`を比較する。大きい方が勝ち。同値なら次へ。

### 5.3 残存耐久割合

最終`currentDurability / maxDurability`を比較する。表示用basis pointsへfloorした値は使わない。BigInt交差積で比較する。

```text
left  = A.currentDurability * B.maxDurability
right = B.currentDurability * A.maxDurability
```

- `left > right` → participantA勝利
- `left < right` → participantB勝利
- `left === right` → 次へ

### 5.4 残存精神力

最終BattleStateの`currentMental`を直接比較する。大きい方が勝ち。`maxMental`割合へ正規化しない。同値なら次へ。

### 5.5 試合内消耗の少なさ

最終BattleStateの`inBattleConsumption`を直接比較する。**小さい方が勝ち**。割合化・正規化しない。同値ならseeded RNGへ。

### 5.6 最終seeded RNG

1〜5がすべて同値の場合だけ使用する。

terminal BattleStateの正規battle RNG stateから既存`SeededRng`を復元し、次を**正確に1回だけ**呼ぶ。

```text
roll = nextInt(0, 2)
```

既存07仕様のRNG契約どおり、`min` inclusive・`max` exclusiveとする。

- `0` → participantA勝利
- `1` → participantB勝利

この1回以外のRNGを判定tie-breakのために消費しない。1〜5で決着した場合の消費回数は0とする。

RNGを使用した場合:

- `BattleJudgeSummary.seededRngRoll`へ`0`または`1`を保存する
- `finalRngState`はこの1回消費後のstateとする
- validatorはtie-break前のrngStateから同じ1回を再生し、winnerと`finalRngState`を検証する

finalization時に`Math.random()`、新seed、PersonIdを勝敗決定に使用しない。`resolution_error`ではjudge tie-break RNGを追加消費しない。

### 5.7 禁止するtie-break

次を勝敗tie-breakへ使用しない。

- PersonId順
- ActionSourceIdentity順
- object key順
- 配列順
- 名前順
- canonical文字列順

## 6. BattleResult

```text
BattleResult
- schemaVersion
- matchId
- simulationId
- worldDate
- battleKind
- participantAId
- participantBId
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- winnerPersonId: PersonId | null
- loserPersonId: PersonId | null
- resultKind
- endReason
- turnsExecuted
- battleRulesRefHash
- runRuleSnapshotHash
- battleInputHash
- sprint1ConfigVersion
- sprint1ConfigHash
- techniqueCatalogDataVersion
- techniqueCatalogHash
- postProcessContext: BattlePostProcessContext
- postProcessContextHash: string
- finalState: BattleFinalSnapshot
- judgeScore: JudgeScoreByParticipant | null
- summaryLog
- summaryLogHash: string
- detailedLog
- developmentEffects
- finalRngState
- finalStateHash
- validation
```

```text
BattleFinalSnapshot = BattleStateからdetailedLogを除いた最終状態
BattleResultKind = completed | failed
```

- `BattleResult.schemaVersion` のSprint 1初期値は `0.5.0` とする。
- BattleResultはRunRuleSnapshot全文を複製せず、`runRuleSnapshotHash`とidentityだけを保持する。

## 7. 結果生成入力契約

```text
FinalizeBattleResultInput
- terminalBattleState
- runRuleSnapshot
- postProcessContext: BattlePostProcessContext
```

- 戦闘開始後に生成するcompleted／resolution_errorの両結果でrunRuleSnapshotとpostProcessContextを必須とする
- runRuleSnapshotはterminalBattleState.runRuleSnapshotHash、設定identity、カタログidentityと一致必須で、可変な現在設定を再読込しない
- postProcessContextのparticipantId・同週完了試合数を検証し、年齢はBattleParticipantSnapshotから取得する
- postProcessContextをcanonical JSON化して`postProcessContextHash`を算出し、BattleResultへその全文とhashを保存する
- `resultKind=failed`／`endReason=resolution_error`ではterminalBattleState.status=failedかつfailure必須とし、contextを保存するがdevelopmentEffectsには使用せず、効果配列を空にする
- `runBattleToCompletion`は開始時に受け取ったcontextをそのままここへ渡し、終了時に再取得しない
- terminalBattleState.status=completedではterminalReasonを必須とし、`max_turns_reached`をBattleResultの`endReason=judge_decision`へ変換する
- terminalReasonがknockout／surrender／unable_to_continueの場合は同名のBattleEndReasonへ変換する

## 8. developmentEffects

戦闘中に元人物を変更せず、終了後に適用候補を返す。

```text
BattleDevelopmentEffects
- participantA
- participantB
```

```text
BattlePostProcessContext
- participantA:
    personId
    matchesCompletedThisWorldWeekBeforeBattle
- participantB:
    personId
    matchesCompletedThisWorldWeekBeforeBattle
```

- 年齢はBattleParticipantSnapshot.ageAtBattleを使用し、postProcessContextへ重複入力しない
- personIdは各sideのBattleParticipantSnapshot.personIdと一致必須
- `matchesCompletedThisWorldWeekBeforeBattle=0`をfirstMatch、1をsecondMatch、2以上をthirdOrLaterとして設定表へ対応させる
- 戦闘開始前に必須検証し、completedとresolution_errorの両結果へ保存する。resolution_errorでは参照内容を人物効果へ適用せずdevelopmentEffectsを空にする
- `matchesCompletedThisWorldWeekBeforeBattle`の負値、contextのpersonId不一致、またはBattleParticipantSnapshot.ageAtBattleとworldDate・birthYearの不整合はresult生成失敗
- damageReceived、重大負傷有無、inBattleConsumptionはBattleState／detailedLogから導出し、context入力で上書きしない

各人物:

- persistentFatigueDelta
- injuryDelta
- conditionRequestedDelta
- conditionAppliedDelta
- conditionAfter
- confidenceRequestedDelta
- confidenceAppliedDelta
- confidenceAfter
- currentMentalAfter
- techniqueStateDeltas
- battleExperienceSummary: BattleExperienceSummary

### 8.1 継続疲労

正本どおり、0..100へclamp済みの試合内消耗の25％を継続疲労へ加算する。

```text
persistentFatigueDelta
= ceil(inBattleConsumption * 0.25)
+ damageAdditionalFatigue
+ majorInjuryAdditionalFatigue
+ consecutiveMatchAdditionalFatigue
+ ageAdditionalFatigue
```

追加疲労の具体値は `[Sprint 1暫定]` 設定入力とし、欠落時に0を補わない。総被ダメージ割合は `damageReceived / maxDurability` を戦闘終了時に1回だけ算出し、単発最大ダメージ割合を使用しない。連戦区分と年齢は`BattlePostProcessContext`から取得する。人物へ適用する際は既存疲労との合計を0..100へclampする。

12仕様の `inBattleConsumption` は正本の行動別基礎消耗だけを表し、ダメージは `damageAdditionalFatigue` で戦闘終了時に1回だけ加算する。精神消費量を別加算しない。`majorInjuryAdditionalFatigue` は戦闘中に重大負傷が1回以上成立した場合に1回だけ加算し、重大負傷件数倍にしない。 `battle.postEffects.damageAdditionalFatigueRules`と`majorInjuryAdditionalFatigue`も同じ集計単位を前提とする。

### 8.2 技熟練度

戦闘使用による熟練度上昇は09仕様を正とする。基本上昇量はhardcodeせず`techniqueLearning.masteryGainHundredths`を使う。

```text
official / activation success → officialSuccess
official / activation failure → officialFailure
mock     / activation success → mockSuccess
mock     / activation failure → mockFailure
```

現行default（balance不変）: officialSuccess=20、officialFailure=10、mockSuccess=10、mockFailure=5。浮動小数点で保存しない。

- `basic_attack`は熟練度上昇対象外
- 命中／damage／injuryの有無は「技使用成功」の判定に使わない
- S01-006契約どおり、activation failureは`attempted+1`／`successful+0`、activation successは`attempted+1`／`successful+1`

#### 現在値係数

「80以降だけ係数を掛ける」ではない。全熟練度帯で`techniqueLearning.masteryCurrentValueFactors`を使う（09§9）。80以降は特に大きく鈍化する、という説明である。

#### 適用順

各人物・各TechniqueIdについて、DetailedLogの`actionSequence`昇順でその技の各attemptを1件ずつ処理する。`workingMastery`を戦闘開始時`PersonTechniqueState.masteryHundredths`で初期化する。

各attemptごとに:

1. `workingMastery`で`selectMasteryCurrentValueFactor`相当の現在値係数を選択する
2. activation success/failureと`battleKind`から`baseGainHundredths`を選ぶ
3. 既存`multiplyBasisPointsFloor`と同じ規則で`appliedGain = floor(baseGainHundredths * masteryCurrentValueFactor / 10000)`を計算する
4. `workingMastery = min(10000, workingMastery + appliedGain)`
5. 次のattemptは更新後`workingMastery`で係数を選ぶ

同一戦闘中に熟練度帯を跨いだ場合、次の使用から新しい現在値係数になる。全attempt処理後:

```text
masteryHundredthsDelta = workingMastery - sourceMasteryHundredths
```

成功回数と失敗回数をまとめて一括`floor`してはならない。attemptごとにfloorする。

#### 使用回数との整合

```text
attemptedUseCountDelta = finalBattleAttemptedUseCount - sourceAttemptedUseCount
successfulUseCountDelta = finalBattleSuccessfulUseCount - sourceSuccessfulUseCount
```

DetailedLogから再集計したattempt/success件数と上記battle-local deltaが一致しなければresult生成失敗。masteryのattempt列も同じDetailedLogを材料とする。

`techniqueStateDeltas` は技ごとに次を持つ。

- techniqueId
- masteryHundredthsDelta
- attemptedUseCountDelta
- successfulUseCountDelta

09仕様の使用回数と熟練度を同じ原子的適用で更新する。

### 8.3 現在精神力

人物の `currentMentalAfter` は最終BattleStateのcurrentMentalとする。戦闘終了後に自動全回復せず、08・10仕様の週次休養で回復する。resolution_errorでは適用しない。

### 8.4 負傷

12仕様で発生した負傷結果を集約する。

- 攻撃解決時にtarget.guarding=trueで防御が成立していた場合の負傷率半減を再計算検証する。`successfulDefenses`集計値の有無を負傷倍率条件に使わない
- 重大負傷は成立した負傷の20％
- `injuryDelta = finalBattleInjury - sourceBattleInjury` とし、0..100へclamp済みの差だけを返す
- 初期負傷度をdevelopmentEffectsで再加算しない
- 部分的な負傷効果をエラー時に適用しない

### 8.5 調子・自信 `[Sprint 1暫定]`

`conditionRequestedDelta`、`confidenceRequestedDelta` は `battle.postEffects.resultModifiersByBattleKindAndEndReason` の必須設定からbattleKind・勝敗・終了理由別に取得する。未指定値を0で補完せず、設定欠落はresult生成失敗とする。

```text
conditionAfter = clamp(-20, 20, sourceCondition + conditionRequestedDelta)
conditionAppliedDelta = conditionAfter - sourceCondition
confidenceAfter = clamp(-20, 20, sourceConfidence + confidenceRequestedDelta)
confidenceAppliedDelta = confidenceAfter - sourceConfidence
```

- requestedは設定上要求された値、appliedはclamp後に実際に人物へ適用される差分
- developmentEffectsを適用する側はrequestedではなくappliedを使用する

適用順:

1. winnerへbattleKind別のWin、loserへbattleKind別のLossを1回適用
2. `endReason=surrender`では、降参したloserだけへ`surrenderAdditional`を1回追加
3. `endReason=knockout`では、戦闘不能となったloserだけへ`knockoutAdditional`を1回追加
4. `unable_to_continue`と`judge_decision`は追加補正なし
5. `resolution_error`では両者とも適用なし

両参加者へ同じendReason追加値を一律適用しない。最終値は-20..20へclampする。

### 8.6 battleExperienceSummary

`battleExperienceSummary`は独立したbattle XPや能力値成長を表さない。Sprint 1では戦闘後処理を監査・人物履歴へ変換するための決定的な戦闘経験サマリーとする。

```text
BattleExperienceSummary
- outcome: win | loss
- endReason
- turnsExecuted
- damageDealt
- damageReceived
- successfulHits
- successfulDefenses
- successfulEvasions
- successfulCounters
- attemptedTechniqueUseCount
- successfulTechniqueUseCount
```

各値はBattleState／DetailedLog／battle-local technique count差分から導出する。

- `attemptedTechniqueUseCount`: 全非basic techniqueの`attemptedUseCount` battle-local delta合計
- `successfulTechniqueUseCount`: 全非basic techniqueの`successfulUseCount` battle-local delta合計
- `basic_attack`は両方へ含めない

`battleExperienceSummary`自体によって能力値／aptitude／learningProgress／fatigue／condition／confidence等を追加変更しない。それらは既存の個別`developmentEffects`だけを正とする。`resolution_error`では`developmentEffects`自体が空なので`battleExperienceSummary`も生成・適用しない。

## 9. 概要ログ

構造化データとして保持する。

```text
BattleSummaryLog
- matchId
- battleKind
- participantAId
- participantBId
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- winnerPersonId: PersonId | null
- loserPersonId: PersonId | null
- endReason
- turnsExecuted
- phaseSummaries: BattlePhaseSummary[]
- keyMoments: BattleKeyMoment[]
- finalDurabilityRatios: BattleSideRatioSummary
- finalMentalValues: BattleSideValueSummary
- judgeSummary: BattleJudgeSummary | null
- injurySummary: BattleInjurySummary
```

- 完成文章ではなく、後から文章生成できる構造を優先
- 現実日時を含めない
- 世界ニュース・人物年表へ変換可能にする
- `summaryLog`はfinalState、judgeScore、detailedLog、developmentEffectsから決定的に再構築できる内容だけを持つ
- `summaryLogHash = SHA-256(canonicalJson(summaryLog))`をBattleResultへ保存する
- validatorはsummaryLogを元データから再計算し、全文一致とsummaryLogHash一致を両方検証する
- 配列順: `phaseSummaries`はopening→middle→closing、`keyMoments`は`actionSequence`昇順
- 同じ入力・同じterminal RNG stateならsummaryLog全文・judge結果・mastery delta・finalRngStateが完全一致する
- 判定比較用ratioの勝敗判定にはfloor値を使わない。表示／summary用ratioだけbasis pointsへfloorする

### 9.1 BattlePhaseSummary

```text
BattlePhaseSummary
- phase: opening | middle | closing
- startTurn
- endTurn
- participantADamageDealt
- participantBDamageDealt
- participantASuccessfulHits
- participantBSuccessfulHits
```

phaseは実行済みturnを最大3区分へ決定的に分割する。`turnsExecuted = T`（T>0）とし、各`turnNumber` n のphaseIndexは:

```text
phaseIndex = min(2, floor((n - 1) * 3 / T))
```

- 0 = opening
- 1 = middle
- 2 = closing

該当turnが0件のphaseは配列へ出さない。

例: T=1→openingのみ、T=2→opening+middle、T=3→opening+middle+closing。

各damage/hit値は、そのphaseに属するBattleActionLogから集計する。`resolution_error`等で`turnsExecuted=0`なら`phaseSummaries = []`。

### 9.2 BattleKeyMoment

```text
BattleKeyMoment
- actionSequence
- turnNumber
- actorPersonId
- targetPersonId: PersonId | null
- resolvedActionKind
- damage: number | null
- injuryResult: none | minor | major | null
```

keyMomentsへ含めるActionLogは次のいずれかを満たすものに限る。

1. `damage != null` かつ `damage > 0`
2. `injuryResult = minor` または `major`
3. `resolvedAction.kind = surrender`

同じActionLogは1件だけ出す。並び順は`actionSequence`昇順。文章生成・主観的選別・重要度スコアリングは行わない。`judge_decision`のみを理由にsynthetic keyMomentを追加しない。

### 9.3 finalDurabilityRatios

```text
BattleSideRatioSummary
- participantA
- participantB
```

単位はbasis points 0..10000。各side:

```text
floor(currentDurability * 10000 / maxDurability)
```

中間浮動小数点を作らず整数演算を使う。

### 9.4 finalMentalValues

```text
BattleSideValueSummary
- participantA
- participantB
```

値は最終BattleStateの各participant.`currentMental`。戦闘終了時回復は行わない。

### 9.5 BattleJudgeSummary

```text
BattleJudgeSummary
- participantA: JudgeScoreBreakdown
- participantB: JudgeScoreBreakdown
- decisiveCriterion:
    total_score
  | effective_damage_ratio
  | successful_hits
  | remaining_durability_ratio
  | remaining_mental
  | lower_in_battle_consumption
  | seeded_rng
- seededRngRoll: 0 | 1 | null
```

judge計算を行わない結果では`judgeSummary = null`。judge計算を行った場合:

- participantA/Bは`BattleResult.judgeScore`と全文一致
- `decisiveCriterion`は実際に勝敗を初めて分けた比較段階
- RNGまで到達しなければ`seededRngRoll=null`
- RNGで決めた場合だけ`0`または`1`

### 9.6 BattleInjurySummary

```text
BattleInjuryParticipantSummary
- sourceInjury
- finalInjury
- injuryDelta
- minorInjuryCount
- majorInjuryCount

BattleInjurySummary
- participantA: BattleInjuryParticipantSummary
- participantB: BattleInjuryParticipantSummary
```

`injuryDelta = finalInjury - sourceInjury`。`minorInjuryCount`／`majorInjuryCount`はDetailedLogの実成立`injuryResult`をtarget participantごとに数える。初期負傷を再加算しない。

## 10. 詳細ログ

12仕様のBattleDetailedLogを保持する。

- `turnOrderLogs`はturnNumber 1から連続し、各ターン正確に1件
- `actionLogs.actionSequence`は0から連続
- 同一ターン内のActionLogは実解決順
- TurnOrderLogの`rngStateAfterOrder`と先手ActionLogの`rngStateBefore`が一致
- requestedActionとresolvedActionを両方保持
- 行動順、approach／retreat、rangeShiftBlock、injury、majorInjuryの全RNG使用箇所を追跡可能
- 耐久・精神・間合い・疲労・負傷・優勢度推移を再計算可能
- canonical JSON化可能
- `movementChance`／`movementRoll`は12仕様§13に従う（approach／retreat比較判定時は双方non-null、それ以外は双方null。`movementChance`はfloor整数パーセント0..100。算出のRNG消費は0）

## 11. 監査・scripted replay bundle

BattleResult単体はscripted action本文を複製しない。scripted actionsを使用した単体試験・監査replayを永続化する場合は、次の決定的入力データを自己完結させたbundleを別の呼出側成果物として生成する。標準WorldEngineの固定7ファイルへ8ファイル目を追加しない。

```text
BattleReplayBundle
- schemaVersion: "0.1.0"
- simulationIdentity
- runRuleSnapshot
- battleResult
- participantAActionSource:
    - identity: BattleActionSourceIdentity
    - canonicalActionScript: string | null
- participantBActionSource:
    - identity: BattleActionSourceIdentity
    - canonicalActionScript: string | null
- replayBundleHash
```

- `kind=scripted_actions`ではcanonicalActionScriptを必須とし、そのSHA-256がidentity.actionScriptHashと一致必須。
- `kind=default_strategy`ではcanonicalActionScript=nullとし、strategyVersionとstrategyConfigHashで再生する。replay runtimeに同一strategyVersionの登録実装がない場合は拒否し、最新実装へ暗黙置換しない。
- bundle内simulationIdentity、runRuleSnapshot、BattleResultのsimulationId・各hashは相互一致必須。
- `replayBundleHash`は自身を除く上記全項目のcanonical JSON SHA-256とする。
- script本文を外部パス、URL、メモリアドレスだけで参照しない。
- replay時はbundle外の現在設定・現在技カタログ・現実時刻を参照しない。

## 12. グローバルイベント

Sprint 1でWorld Event Streamへ出すのは次の2件のみ。

- `battle.started`
- `battle.finished`

全ターンをevents.jsonlへ出さない。

### `battle.finished`

EventEnvelope:

- `schemaVersion`: `0.2.0`

- `entities.personIds`: participantAId、participantBId
- `entities.matchIds`: matchId
- `sourceProcessor`: `battle-simulation`

payload:

- matchId
- battleKind
- participantAId
- participantBId
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- winnerPersonId: PersonId | null
- loserPersonId: PersonId | null
- resultKind
- endReason
- turnsExecuted
- battleSeed
- battleInputHash
- battleRulesRefHash
- runRuleSnapshotHash
- sprint1ConfigVersion
- sprint1ConfigHash
- techniqueCatalogDataVersion
- techniqueCatalogHash
- postProcessContextHash
- finalStateHash
- summary

`resolution_error`でも、戦闘開始後に失敗結果が確定した場合は`battle.finished`を1件出力する。

- `resultKind=failed`
- `endReason=resolution_error`
- winnerPersonId／loserPersonIdはnull
- `summary`へ固定errorCode、対象ID、理由、severity、canContinueを保存する
- 戦闘開始前の入力検証失敗では`battle.started`も`battle.finished`も出力しない

## 13. ログ保持

Sprint 1では削除処理を実装しない。

将来方針:

- 詳細戦闘ログ: 直近の設定周期
- 重要大会: 長期保持
- 概要ログ: 統計・人物戦績用に長期保持

Sprint 1の結果builderはBattleResultを未commitの決定的結果として返す。標準WorldEngineでは12仕様のRunBattleCommitPlanへ組み込み、両生成状態・人物効果・イベント候補と不可分にcommitされるまで確定済み結果として扱わない。

## 14. finalStateHash

次の決定的部分をcanonical JSON化しSHA-256を算出する。

- matchId
- battleKind
- finalState（BattleFinalSnapshot）
- winner／loser
- battleRulesRefHash
- runRuleSnapshotHash
- battleInputHash
- sprint1ConfigVersion／sprint1ConfigHash
- techniqueCatalogDataVersion／techniqueCatalogHash
- postProcessContext／postProcessContextHash
- resultKind
- judgeScore
- summaryLog／summaryLogHash
- detailedLog（1回だけ）
- developmentEffects
- finalRngState

除外:

- 現実日時
- OS、Node、パス
- 処理時間、メモリ
- オブジェクト挿入順

## 15. validation

```text
BattleResultValidation
- overallPassed
- violations
```

各violation:

```text
- code
- severity
- targetIds
- reason
- canContinue
```

検証項目:

- battleRulesRefHashの自己参照を除いた入力からの再計算一致
- participantA／BActionSourceIdentityがfinalState、battleInputHash、実行source identityと一致
- runRuleSnapshotHashと入力RunRuleSnapshot全文の再計算一致
- battleInputHashの再計算一致
- sprint1ConfigVersion／sprint1ConfigHashが最終BattleStateのBattleRulesSnapshotRefおよびRunRuleSnapshotと一致
- techniqueCatalogDataVersion／techniqueCatalogHashが最終BattleStateのBattleRulesSnapshotRefおよびRunRuleSnapshotと一致
- postProcessContextのparticipant personIdがsideA／sideBと一致し、postProcessContextHashの再計算値が一致
- winner／loser整合
- endReasonと最終状態整合
- turnsExecuted整合
- judgeScoreの内訳・initiativeScoreのfloor・total clamp・再計算一致
- judge_decisionではwinner／loserがjudgeScore比較・同点規則と一致
- 双方unable_to_continueではjudgeScore必須で、winner／loserが同じ判定比較・同点規則と一致
- 判定を使用しない終了理由ではjudgeScore=null
- 同点比較順一致
- damage集計一致
- hit集計一致
- defense／evasion／counter集計一致
- techniqueUse集計とtechniqueStateDeltas一致
- currentMentalAfterと最終状態一致
- injury集計一致
- turnOrderLogsがturnNumberごとに1件かつ連続
- actionLogsのactionSequence連続
- TurnOrderLogとActionLogのRNG境界一致
- actionOrder／tieBreak／activation／hit／damage／movement／rangeShiftBlock／injury／majorInjuryの各判定について、実行時roll必須・未実行時nullが一致
- `movementChance`／`movementRoll`は12仕様§13に従い、approach／retreat比較判定時は双方non-null、それ以外は双方null。`movementChance`はfloor整数パーセント0..100で、算出自体のRNG消費は0
- RNG消費順とRNG終端状態一致
- requested／applied condition・confidence deltaとclamp後値の再計算一致
- resolution_errorではterminalBattleState.status=failed、failure必須、developmentEffectsが空で、開始時postProcessContextとhashを保持
- failed stateは最後のcommit済み戦闘状態・ログ・rngStateを維持し、failure情報以外の差分を持たない
- summaryLogの元データからの再構築一致とsummaryLogHash一致
- finalStateHash一致

## 16. 続行不能と失敗

### unable_to_continue

- 12仕様で`currentDurability>0`かつ戦闘内負傷度が`battle.injury.unableToContinueThreshold`へ到達した場合に成立する
- currentDurability=0の場合はknockoutを優先する
- 片側だけ続行不能: 反対側を勝者とし、`resultKind=completed`
- 両側が同じ解決点で続行不能: endReasonは`unable_to_continue`を維持し、4〜5章の判定で勝者を決め、judgeScoreを必須で保存する
- Sprint 1の通常逐次解決では同時成立を新規生成しないが、入力済み最終状態のvalidationと将来の同時解決に備えて規則を固定する
- 続行不能は競技上の終了であり、技術的失敗として扱わない

### resolution_error

- winnerPersonId=null
- loserPersonId=null
- resultKind=failed
- developmentEffectsは空
- validation.overallPassed=false
- 原因・対象ID・severity・canContinueを保持
- 部分的な人物効果を適用しない
- `startBattleTransaction`成功後のシミュレーション上の解決失敗であり、かつ正常な必須dependencyのもとで正規failed BattleResultと`RunBattleCommitPlan`を完全構築できる場合に限る
- Sha256Provider throw／failure／不正digest、またはmark／finalize／commitPlan構築不能な内部不変条件違反は`resolution_error`ではない（12仕様 23.2.4 のexecution abort）

### post-start execution abort（非BattleResult）

- BattleResultの`resultKind`／`endReason`を拡張しない
- `RunBattleToCompletionResult`の第4kindを追加しない
- 12仕様の`BattleExecutionAbortError`としてthrowする
- abort時はBattleResult／`battle.finished`／`RunBattleCommitPlan`を生成・返却・commitしない
- abort時にdevelopmentEffectsの部分適用を行わない

## 17. 決定性

同一入力・同一battleSeedで次が全文一致する。

- BattleResult
- summaryLog
- detailedLog
- developmentEffects
- finalStateHash
- RNG終端状態

除外対象は現実性能情報のみ。

## 18. 必須テスト

- knockout
- surrender
- unable_to_continue閾値とknockout優先、双方続行不能時のjudgeScore必須
- 20ターン判定とterminalReason=max_turns_reachedからjudge_decisionへの変換
- 6評価区分の点数と0..100 total clamp
- 同点比較1〜5（交差積／currentMental直接比較／inBattleConsumption小さい方が勝ち）
- 最終seeded RNG決着が`nextInt(0, 2)`を正確に1回だけ消費し、0→A／1→Bであること
- PersonId順・名前順・canonical順を使わないこと
- BattleSummaryLog下位構造（phase分割T=0/1/2/3/20、keyMoments採用条件、ratio floor、judgeSummary）
- battleExperienceSummary（win/loss・集計・basic_attack除外・resolution_error非生成）
- 戦闘masteryのattemptごとfloor・全帯現在値係数・band跨ぎ・activation success+missもsuccess gain
- inBattleConsumption 0..100境界
- 継続疲労25％とダメージ疲労の非二重加算
- 現在精神力の持越し
- 負傷・重大負傷集約
- official／mock別のhundredths固定小数点熟練度
- basic_attackが熟練度対象外
- winner／loser整合
- failed stateのfailure必須、最後のcommit済みstate維持、failed resultと効果非適用
- technique使用回数delta
- BattlePostProcessContextの連戦区分・年齢境界・personId不一致・負値・開始前拒否
- postProcessContextHashの再計算一致とresolution_error時の原文保持
- condition／confidenceのwinner／loser／endReason別requested／applied delta、clamp境界、設定欠落の失敗
- battle.finishedのsourceProcessor=`battle-simulation`、entities.matchIds、正常終了／resolution_error／開始前失敗の件数境界
- summaryLogの元データ再構築、summaryLogHash改ざん検出
- detailed logから行動順RNG、耐久・精神・間合い・負傷・消耗を再生
- BattleTurnOrderLog／movement／rangeShiftBlock／injury／majorInjuryの各RNG roll完全性
- battleRulesRefHash／runRuleSnapshotHash／battleInputHash／config identity／technique catalog identityの一致
- finalStateHash
- same seed全文一致
- different seed差分
- completed後の変更拒否
- validation違反検出

## 19. 後続Sprintへ送る事項

- 予約actionTraitsと同時戦闘不能
- 大会種別ごとの戦績反映
- ランク・昇格
- 賞金・観客評価
- 詳細ログ保持周期
- 重要大会の永久保存条件
- 人物関係・ライバル変化

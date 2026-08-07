# 13 戦闘終了・判定・ログ仕様

- 仕様版: `S1-SPEC-0.1.14`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 戦闘終了、判定勝ち、BattleResult、疲労・負傷効果、概要・詳細ログ
- 非対象: 大会順位、昇格、賞金、長期ログ削除、観戦UI

## 1. 目的

BattleStateを正本の終了条件と判定基準で確定し、勝者・敗者・終了理由・人物への後処理効果・再現可能なログを生成する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

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

得点同点時は次の順に比較する。

1. 有効ダメージ割合
2. 攻撃成功回数
3. 残存耐久割合
4. 残存精神力
5. 試合内消耗の少なさ
6. seeded RNG

PersonId順で勝者を決めない。

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
- battleExperienceSummary

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

正本の値を09仕様の固定小数点へ変換して使用する。

- 公式戦で使用成功: `masteryHundredths +20`（表示+0.2）
- 公式戦で使用失敗: `masteryHundredths +10`（表示+0.1）
- 80以降は09仕様の現在値係数を掛ける
- `basic_attack` は熟練度上昇対象外

`battleKind=mock` の上昇量は `[Sprint 1暫定]` とし、公式戦の50％を設定値とする。模擬戦50％では成功+10（表示+0.10）、失敗+5（表示+0.05）とし、浮動小数点で保存しない。

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
- phaseSummaries
- keyMoments
- finalDurabilityRatios
- finalMentalValues
- judgeSummary
- injurySummary
```

- 完成文章ではなく、後から文章生成できる構造を優先
- 現実日時を含めない
- 世界ニュース・人物年表へ変換可能にする
- `summaryLog`はfinalState、judgeScore、detailedLog、developmentEffectsから決定的に再構築できる内容だけを持つ
- `summaryLogHash = SHA-256(canonicalJson(summaryLog))`をBattleResultへ保存する
- validatorはsummaryLogを元データから再計算し、全文一致とsummaryLogHash一致を両方検証する

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
- 同点比較1〜5
- 最終seeded RNG決着がResolverのfinalRngStateを正確に1回進めること
- PersonId順を使わないこと
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

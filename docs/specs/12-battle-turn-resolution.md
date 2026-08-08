# 12 戦闘ターン解決仕様

- 仕様版: `S1-SPEC-0.1.19`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 行動入力、使用条件、優先度、行動順、命中、ダメージ、間合い、一時状態、ターンログ
- 非対象: 大会組合せ、ランク、複雑な状態異常、演出文章

## 1. 目的

BattleStateと双方の行動から、正本の処理順に従って1ターンを純粋かつ決定的に解決する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

戦闘終了時点の参加者battle-local状態を検証するcanonical baselineは、戦闘開始時の`BattleParticipantSnapshot.sourceSnapshot`（11仕様）と`BattleDetailedLog`の組み合わせとする。具体的なreplay validatorの実装はS01-006の受入範囲であり、本clarificationでは未実装ログフィールドを新設しない。

## 2. 開始・Resolver入力契約

```text
BeginBattleInput
- readyBattleState

BeginBattleResult
- kind: success | failure
- battleState: BattleState | null
- eventCandidate: battle.started candidate | null
- validation
```

- `beginBattle`はready状態を検証し、成功時だけstatus=in_progressへ変更した新BattleStateと`battle.started`候補を返す
- 本文の「battle-local確定」は、純粋な戦闘計算内で直前のsuccess結果を次入力として採用したことを表し、WorldStateへの永続commitを意味しない。WorldEngineへの唯一の永続commit境界は23.2節の`commitRunBattlePlan`とする
- RNG、turnNumber、actionSequence、人物状態、詳細ログを変更しない
- 失敗時は入力stateを変更せず、eventCandidate=nullとする

```text
PrepareBattleTurnInput
- battleState

PreparedBattleTurn
- baseBattleStateHash
- turnNumber
- stateView
- rngStateBeforeOrder

PrepareBattleTurnResult =
  | { kind: success, preparedTurn, validation }
  | { kind: failure, failure: BattleFailureInfo, validation }
```

- `prepareBattleTurn` はstatus=in_progressのbattle-local確定BattleStateだけを受理する
- `turnNumber = battleState.turnNumber + 1` を確定し、1..maxTurnsの範囲を検証する
- `stateView` は入力BattleStateの決定的cloneで、`turnNumber=preparedTurn.turnNumber`、双方の `guarding=false`、`evading=false` としたStrategy参照専用view
- RNG、actionSequence、詳細ログ、耐久、精神、間合い、集計値を変更しない
- preparedTurnはcommit対象ではなく、StrategyまたはResolver失敗時は破棄する
- Resolverのターン開始状態はpreparedTurn.stateViewとし、入力BattleStateに残る前ターンのguarding／evadingを参照しない
- Strategy、Resolver、TurnOrderLog、ActionLogはすべてpreparedTurn.turnNumberを使用する

```text
BattleActionsSource =
  | DefaultBattleStrategySource(identity: BattleActionSourceIdentity(default_strategy))
  | ScriptedActionSource(identity: BattleActionSourceIdentity(scripted_actions), canonicalScript)

ResolveBattleTurnInput
- battleState
- preparedTurn
- runRuleSnapshot
- participantAActionsSource: BattleActionsSource
- participantBActionsSource: BattleActionsSource

ResolveBattleTurnResult =
  | { kind: success, battleState, eventCandidates, validation }
  | { kind: failure, failure: BattleFailureInfo, validation }
```

- ResolveBattleTurnInputはstatus=in_progressだけを受理し、readyは`beginBattle`未実行として拒否する
- preparedTurn.baseBattleStateHashは入力BattleStateのcanonical hashと一致必須
- 技定義、基本攻撃プロファイル、Sprint 1設定は入力RunRuleSnapshotから取得する
- `battleState.battleRulesSnapshotRef.runRuleSnapshotHash`と入力RunRuleSnapshotの再計算hashを照合する
- 外部の可変TechniqueCatalogやSprint1Configをターンごとに再読込しない。同一runの不変RunRuleSnapshotだけを参照する
- `battleRulesRefHash`不一致、設定・カタログidentity不一致、関連技不足は継続不能エラーとし、状態・ログ・RNGをcommitしない
- 行動sourceはDefaultBattleStrategySourceまたはcanonical ScriptedActionSourceのいずれかとし、任意callback、外部I/O、現実時刻、共有可変状態を参照するsourceを禁止する
- participantAActionsSource／participantBActionsSourceは、BattleStateへ固定した各`BattleActionSourceIdentity`を再計算して完全一致させる。不一致は状態・ログ・RNG非commitのfailureとする
- DefaultBattleStrategyは`strategyId=default-battle-strategy`、`strategyVersion=RunRuleSnapshot.defaultBattleStrategyVersion`、`strategyConfigHash=RunRuleSnapshot.sprint1ConfigHash`を申告する。scripted actionsはcanonical action script全文hashを申告する
- failure結果では次BattleState・ActionLog・TurnOrderLog・イベント候補を返さず、入力state・入力rngStateをそのまま維持する

### 2.1 ScriptedActionSourceとbattle-action-script-0.1.0

`ScriptedActionSource`は次の2 fieldだけを持つ。

```text
ScriptedActionSource
- identity: BattleActionSourceIdentity(scripted_actions)
- canonicalScript: string
```

`canonicalScript`はvalidated `BattleActionScript`を`toCanonicalJson`したUTF-8 JSON文字列そのものとする。

#### BattleActionScript構造

```text
BattleActionScript
- scriptFormatVersion
- turns
```

```text
BattleActionScriptTurn
- turnNumber
- sideA
- sideB
```

完全形の例:

```json
{
  "scriptFormatVersion": "battle-action-script-0.1.0",
  "turns": [
    {
      "turnNumber": 1,
      "sideA": { "kind": "basic_defense" },
      "sideB": { "kind": "basic_defense" }
    }
  ]
}
```

- root exact 2 keys: `scriptFormatVersion`／`turns`
- 各turn exact 3 keys: `turnNumber`／`sideA`／`sideB`
- 各`sideA`／`sideB`は3.1節のBattleAction canonical object
- `scriptFormatVersion`は`"battle-action-script-0.1.0"`へ固定

#### turns規則

特定の戦闘へscriptをbindする際、`expectedMaxTurns = RunRuleSnapshot.sprint1Config.battle.maxTurns`とする。Sprint 1現行は20。

必須:

```text
turns.length = expectedMaxTurns
turnNumber = 1, 2, 3, ... expectedMaxTurns（完全連番）
```

禁止: 0開始、欠番、重複、順序違い、maxTurns未満／超過、sparse array、array extra property。

有効にbind済みのscriptでは「script枯渇」は発生しない。戦闘が途中終了した場合、未使用の後続turn entryは無視する。再hashや切り詰めはしない。

#### turn／sideからの行動取得

prepared turn番号を`t`とする。

```text
entry = script.turns[t - 1]
```

必ず`entry.turnNumber = t`を確認する。`actorSide`が`sideA`なら`entry.sideA`、`sideB`なら`entry.sideB`をrequestedActionとして返す。別turnを検索してfallbackしない。該当turnまたはside branchが存在しない場合は未commit failureとし、`basic_defense`／`no_action`／DefaultBattleStrategy／前後turnへfallbackしない。有効bind済みscriptではこのfailureは発生しないことが不変条件。

#### canonicalScript検証

runtimeでは次を必須とする。

1. `canonicalScript`が非空stringか確認
2. `JSON.parse`をtry/catch
3. parsed valueを`BattleActionScript`としてdescriptor-independentに検証
4. `toCanonicalJson(validated script)`で再canonical化
5. 再canonical文字列が入力`canonicalScript`と完全一致することを必須確認

一致しない場合は拒否する（空白差、改行、非canonical key順、duplicate JSON key、余分／欠落field、不正actionを含む）。

#### actionScriptHash

```text
actionScriptHash = SHA-256(UTF-8 bytes of canonicalScript)
```

JSON objectをもう一度別形式でhashしない。小文字16進64文字。実行時は次の三者一致を必須とする。

```text
source.identity.actionScriptHash
= BattleState上の該当participant ActionSourceIdentity.actionScriptHash
= computeHash(canonicalScript)
```

`scriptFormatVersion`も三者一致。

#### 両side scripted binding

`battle-action-script-0.1.0`は両sideを含む1試合全体のscriptである。`ResolveBattleTurn`でscripted modeを使う場合、両participantのaction source kindが`scripted_actions`であり、かつ次が一致必須とする。

```text
A.actionScriptHash = B.actionScriptHash
A.scriptFormatVersion = B.scriptFormatVersion
A.canonicalScript = B.canonicalScript
```

片側`default_strategy`・片側`scripted_actions`の混在は未commit failure。両側`default_strategy`は従来どおり正常。S01-005でmixed identityのBattleState作成自体を拒否する必要はない。実行時未commit turn failureでもよい。

#### 固定script canonical fixture

Sprint 1 `maxTurns=20`のfixtureとして、全turnで双方`basic_defense`を選ぶscriptを固定する。既存`canonical-json-v1`によるUTF-8 byte lengthは`1733`、SHA-256は次へ固定する。

```text
67abb9d717f4ae6a21650d16e9b7da3e166fdfc1d89616f6342e258595e7cf6f
```

実装から期待hashを自己生成してassertしない。実測が一致しない場合は作業を停止し報告する。

## 3. 行動

```text
BattleAction =
  use_technique
  | basic_attack(profile: unarmed | sword | magic)
  | basic_defense
  | evade(direction: hold | approach_one | retreat_one)
  | approach
  | retreat
  | focus_mind
  | surrender

ResolvedBattleAction = BattleAction | no_action
```

正本にある「精神を整える」「降参する」を正式行動として含める。

script、hash、ログ、fixtureで同じcanonical object形式を使う。未知key拒否、欠落key拒否、null補完禁止、別variantのfield混入禁止。getter等を実行しない。`no_action`は`ResolvedBattleAction`専用であり、requested `BattleAction`およびscript本文へ記載できない。

### 3.1 BattleAction canonical object

#### use_technique

```json
{
  "kind": "use_technique",
  "techniqueId": "..."
}
```

exact 2 keys。

#### basic_attack

```json
{
  "kind": "basic_attack",
  "profile": "unarmed"
}
```

`profile`は`unarmed | sword | magic`。exact 2 keys。

#### basic_defense

```json
{
  "kind": "basic_defense"
}
```

#### evade

```json
{
  "kind": "evade",
  "direction": "hold"
}
```

`direction`は`hold | approach_one | retreat_one`。

#### approach

```json
{
  "kind": "approach"
}
```

#### retreat

```json
{
  "kind": "retreat"
}
```

#### focus_mind

```json
{
  "kind": "focus_mind"
}
```

#### surrender

```json
{
  "kind": "surrender"
}
```

## 4. 優先度

```text
Priority = 2 | 1 | 0 | -1
```

基本行動の優先度:

| 行動 | priority |
|---|---:|
| basic_attack | 0 |
| basic_defense | 0 |
| evade | +2 `[Sprint 1暫定]` |
| approach | 0 |
| retreat | 0 |
| focus_mind | 0 |
| surrender | +2 |

技はTechniqueDefinitionのpriorityを使う。

## 5. 同優先度の行動順

```text
conditionFatigueInjuryModifier
= condition * 0.25
- fatigue * 0.10
- injury * 0.15

consumptionPerformanceFactor
= 18.2節の消耗帯係数

ActionOrderScore
= speed * consumptionPerformanceFactor
+ actionSpeedModifier(-20..20)
+ conditionFatigueInjuryModifier
+ seededRandom(-5..5)
```

- 高い側から処理
- 同priorityでは各人物のActionOrderScore用RNGを固定1回ずつ消費する
- 乱数適用後も完全同値の場合だけ追加のseeded RNGを1回使用する
- PersonId順を最終決着に使わない
- priorityが異なる場合は速度差に関係なく高priorityを先に処理する

## 6. 1ターンの処理順

1. status=in_progressのbattle-local確定BattleStateを検証
2. `prepareBattleTurn`で次turnNumberと、guarding／evadingをfalseにしたstateViewを確定
3. prepared stateViewを双方のStrategyへ渡し、要求行動を取得・検証
4. 使用不可行動を決定的な代替行動へ置換
5. priorityを比較し、同priorityならActionOrderScoreで行動順を決定し、BattleTurnOrderLogを確定
6. 先手行動を解決
7. 戦闘不能・降参・続行不能を確認し、後手が行動不能なら後手行動を中止
8. 中止された後手行動も `resolvedAction=no_action`、`replacementReason=opponent_ended_battle` のログを1件残す。効果・RNG消費・消耗は0
9. 継続時のみ後手行動を解決
10. ターン終了時にfocus_mindの保留回復、優勢度、消極行動、戦闘内消耗を確定
11. 戦闘終了条件を確認し、成立時は同じResolver success結果内で`status=completed`と`terminalReason`を確定
12. 第20ターン終了時に直接終了条件がない場合、`terminalReason=max_turns_reached`としてcompletedへ遷移し、21ターン目を作らない
13. turnNumber、TurnOrderLog、ActionLogを含むターン詳細ログを確定
14. BattleState不変条件を検証
15. 成功時だけpreparedTurnの変更を新しいbattle-local確定BattleStateとして採用し、次RNG状態、イベント候補を返す

Sprint 1では09仕様の予約actionTraitsを実行しない。`simultaneous`、`counterOnHit`、`interception`、`interrupt`、`defenseBreak` のいずれかがtrueの技データは入力検証で拒否する。`rangeShiftAfterUse` は予約traitではなく通常の技属性として処理する。

入力stateを変更しない。ターン解決が検証エラーで失敗した場合、状態遷移、イベント候補、RNG消費をbattle-local確定結果へ採用しない。

終了時の状態遷移は次へ固定する。

| 条件 | terminalReason | 状態 |
|---|---|---|
| currentDurability=0 | knockout | completed |
| surrender成立 | surrender | completed |
| currentDurability>0で続行不能成立 | unable_to_continue | completed |
| 第20ターン終了かつ上記なし | max_turns_reached | completed |

- 同じ解決点で複数条件が成立する場合は`knockout > surrender > unable_to_continue > max_turns_reached`の順。
- completed遷移、terminalReason、ログ、rngStateは同じ純粋Resolver success結果へ不可分に含める。
- completed状態へ遷移したターンの後手中止ログを含め、当該ターンのログを失わない。
- `prepareBattleTurn`は`turnNumber >= maxTurns`またはstatus!=in_progressを受理しない。

## 7. 不正行動の置換

正式な完全enumは次だけとする。これ以外の文字列をSprint 1で使用しない。

```text
BattleActionReplacementReason =
  unknown_technique
  | unlearned_technique
  | requirements_not_met
  | insufficient_mental
  | unusable_range
  | unable_to_act
  | opponent_ended_battle
```

| 理由 | 置換 | replacementReason |
|---|---|---|
| 完全カタログに存在しないTechniqueId | basic_defense | `unknown_technique` |
| 完全カタログには存在するが人物が未習得 | basic_defense | `unlearned_technique` |
| requiredAptitude不足、requiredStats不足、prerequisiteTechniqueIds未充足、prerequisiteTechniqueMastery不足、その他TechniqueDefinitionの使用条件不足 | basic_defense | `requirements_not_met` |
| `effectiveMentalCost`に対する精神不足 | basic_defense | `insufficient_mental` |
| 現在rangeがusableRanges外 | 最寄りの使用可能間合いへapproachまたはretreat | `unusable_range` |
| 現在rangeがusableRanges外で、必要方向へこれ以上移動できず代替移動不能 | basic_defense | `unusable_range` |
| `actor.canAct=false` | no_action | `unable_to_act` |
| 先手によって戦闘が終了し後手を中止 | no_action | `opponent_ended_battle` |

- requestedActionとresolvedActionを両方ログへ残す
- 置換時は上記固定enumの`replacementReason`を必須とする
- requestedActionとresolvedActionが同一で置換がない場合、`replacementReason = null`を必須とする。空文字は禁止
- TechniqueIdの存在判定と定義参照は入力RunRuleSnapshotの完全カタログ、習得判定は人物snapshotのtechniquesを使用する
- surrenderは有効入力なら置換しない
- 使用不可間合いの移動方向は、現在間合いとの差が最小の `usableRanges` を選ぶ。差が同じ場合は `preferredRanges`、さらに同じなら `contact < close < middle < long` の固定順で決める
- 同一actionについて複数理由が同時成立しても`replacementReason`は1件だけ

判定優先順位（行動可能なactorについて）:

```text
1 unknown_technique
2 unlearned_technique
3 requirements_not_met
4 insufficient_mental
5 unusable_range
```

ただし`actor.canAct=false`の場合はTechnique等を参照せず即`unable_to_act`とする。したがって実処理上の最優先は`unable_to_act`であり、その後に上記1〜5を評価する。`opponent_ended_battle`は行動前validationではなく先手解決後だけ使用する。

### 7.1 invalidActionCountDelta

次の6理由はrequested actionの置換なので`invalidActionCountDelta = 1`とする。

```text
unknown_technique
unlearned_technique
requirements_not_met
insufficient_mental
unusable_range
unable_to_act
```

`opponent_ended_battle`はrequested action自体の不正ではなくResolver内部中止なので`invalidActionCountDelta = 0`とする。

## 8. 発動安定性 `[Sprint 1暫定]`

`use_technique` は精神消費後、命中判定前に発動判定を行う。基本行動と3系統基本攻撃は発動判定を行わない。

```text
ActivationChancePercent
= 95
- activationDifficulty * 0.50
+ (spirit - 50) * 0.25
+ (mastery - 50) * 0.20
+ (domainAptitude - 50) * 0.10
- fatigue * 0.10
- injury * 0.10
- inBattleConsumption * 0.10
+ nextActivationModifier
```

- 式をbasis pointsで計算後、`floor`して整数％へ変換し、`5..100`へclampする
- `integerRandom(1,100) <= ActivationChancePercent` で発動成功
- 発動判定は技試行ごとに1回RNGを消費する
- 技を実行開始した時点で16節の`effectiveMentalCost`を先に消費し、その後に発動判定を行う
- 不発時もeffectiveMentalCost、attemptedUseCount、戦闘内消耗を適用する
- 不発時は命中、ダメージ、負傷、使用後間合い変化へ進まず、対応RNGも消費しない
- `nextActivationModifier` は判定後に0へ戻す
- 暴発、自傷、対象変更はSprint 1では実装しない

### 8.1 attemptedUseCount／successfulUseCount（戦闘内）

戦闘内`use_technique`について、battle-localな`PersonTechniqueState`の使用回数を次へ固定する。

`attemptedUseCount += 1`のタイミング:

```text
requested／置換処理完了
↓
resolvedAction = use_technique
↓
使用条件・range・effectiveMentalCost充足済み
↓
技実行を開始する
↓
attemptedUseCount += 1
↓
effectiveMentalCost消費
↓
activation判定
```

したがって次では増えない: `unknown_technique`／`unlearned_technique`／`requirements_not_met`／`insufficient_mental`／`unusable_range`による置換／`unable_to_act`／`opponent_ended_battle`／`basic_attack`／その他基本行動。発動失敗でも`attemptedUseCount += 1`を維持する。safe integer overflowは継続不能failure。

Sprint 1での「技の使用成功」:

```text
successful use = use_techniqueのactivation判定に成功し、命中判定へ進んだこと
```

したがって`activationSucceeded = true`のとき`successfulUseCount += 1`。命中結果は問わない。

| 結果 | attempted | successful |
|---|---:|---:|
| activation failure | +1 | +0 |
| activation success + miss | +1 | +1 |
| activation success + hit + damage | +1 | +1 |

damage値、負傷発生、rangeShift成功は`successfulUseCount`へ影響しない。命中成功は`BattleActionLog.hit`／`successfulHits`で別に保持する。`basic_attack`は`PersonTechniqueState`を持たないため両countへ加算しない。

S01-006はBattleState participantのtechniques内countだけをbattle-localに更新し、persistent Personを変更しない。戦闘開始snapshotとの差分反映はS01-007。S01-006では`masteryHundredths`／`lastPracticedAbsoluteWeek`／`acquiredAbsoluteWeek`／`learningProgressTenths`を戦闘使用回数だけを理由に変更しない。

常に`0 <= successfulUseCount`、`0 <= attemptedUseCount`、`successfulUseCount <= attemptedUseCount`を要求する。既存snapshotで`successfulUseCount > attemptedUseCount`なら継続不能validation failure。safe integer必須。

## 9. 命中率

正本の式を使用する。

```text
effectiveAttackerSkill
= attackerSkill * attackerConsumptionPerformanceFactor

effectiveDefenderSpeed
= defenderSpeed * defenderConsumptionPerformanceFactor

FinalHitChancePercent
= techniqueBaseAccuracy
+ (effectiveAttackerSkill - effectiveDefenderSpeed) * 0.35
+ (mastery - 50) * 0.20
+ (domainAptitude - 50) * 0.10
+ rangeModifier
+ stateModifier
- evasionModifier
```

式をbasis pointsで計算後、`floor`して整数％へ変換し、`5..95`へclampする。

| 項目 | 値 |
|---|---:|
| 通常攻撃基本命中率 | 75 |
| 一般技基本命中率 | 55..85 |
| 得意間合い | +10 |
| 使用可能だが不得意 | -15 |
| 使用不可間合い | 使用不可 |
| 回避優先中 | -30 |
| 下限・上限 | 5／95 |

`[Sprint 1暫定]` 状態補正:

```text
stateModifier
= condition * 0.25
- fatigue * 0.10
- injury * 0.15
+ nextHitModifier
```

- `basic_attack` の有効熟練度は50とする
- focus_mindで得た`nextHitModifier`と`nextActivationModifier`は「次の攻撃試行」へ紐付く。`use_technique`では両方、`basic_attack`ではnextHitModifierを使用しnextActivationModifierは未使用のまま破棄する。不発した`use_technique`でもその攻撃試行で両方を消費する。行動順へは加算しない。移動・防御・回避・focus_mind・surrenderでは消費しない
- 攻撃試行ごとに1回RNGを消費
- `integerRandom(1,100) <= FinalHitChancePercent` で命中
- miss時も試行回数へ加算

## 10. 技威力とダメージ

正本の考え方どおり、技のprimaryStatsから攻撃側能力を算出し、固定攻撃力を人物へ恒久保存しない。

### 10.1 参照能力値

```text
PrimaryStatValue
= primaryStatsの表面能力値の平均
```

系統別の代表値:

- unarmed: strengthを中心に、技ごとにstamina／speed／skillを参照
- sword: skillとstrengthを中心にspeedを参照
- magic: magicを中心にspirit／skillを参照

`domainAptitude`は`TechniqueCategory`／`BasicAttackProfile`と同じ`unarmed | sword | magic`キーで取得する。`martial`や暗黙対応は使用しない。

### 10.2 ダメージ式 `[Sprint 1暫定]`

正本に命中式と威力帯はあるが最終ダメージ式の完全な係数は固定されていないため、次を暫定設定とする。

```text
AttackValue
= PrimaryStatValue
× (0.70 + domainAptitude / 250)
× (0.80 + mastery / 500)

defenderConditionModifier
= defenderCondition * 0.10
- defenderFatigue * 0.05
- defenderInjury * 0.10

DefenseValue
= defenderStamina * 0.45
+ defenderSkill * 0.20
+ defenderConditionModifier

RawDamage
= techniquePower * 0.35
+ AttackValue * 0.25
- DefenseValue * 0.20

Damage
= max(1, floor(RawDamage * seededRandom(0.90..1.10)))
```

- 命中時のみダメージ乱数を1回消費
- miss時はダメージ乱数を消費しない
- 係数は `battle.damageFormula` へ設定化する
- 長期試験後にバランス調整しても処理順・RNG消費順は変えない

### 10.3 技使用後の間合い変化

命中・ダメージ・負傷判定を終えた後、成功した技の `rangeShiftAfterUse` を処理する。

処理順（既存契約。変更しない）:

```text
hit
↓
damage
↓
injury
↓
major injury if required
↓
rangeShiftAfterUse
↓
guard rangeShift block if required
```

- `none`: 変化なし
- `approach_one`: contact方向へ1段階
- `retreat_one`: long方向へ1段階
- 端を超える場合はそのまま
- miss、不発、使用不可置換、no_actionでは変化しない
- 対象がguardingの場合は11節の間合い崩し阻止判定を行う
- ActionLogのrangeBefore／rangeAfterで再生可能にする

## 11. 防御

- basic_defenseは精神消費0
- 被ダメージ、負傷発生率、間合いを崩される確率を軽減
- 防御崩しは予約actionTraitsのためSprint 1では実行せず、通常軽減率を一律適用する
- `basic_defense` が先に解決された場合、そのターンの後続攻撃へguardingを適用する。攻撃後に解決された場合、すでに受けた攻撃へ遡及しない
- 防御自体は判定で直接減点しない
- 攻撃へ転じない連続防御は消極行動へ加算

`[Sprint 1暫定]` 技区分別のダメージ係数:

| 攻撃区分 | guardedDamageFactor | 間合い変化阻止率 |
|---|---:|---:|
| basic_attack／small | 0.55 | 70％ |
| medium | 0.60 | 60％ |
| large | 0.70 | 45％ |
| ultimate | 0.80 | 30％ |

```text
guardedDamage = max(1, floor(normalDamage * guardedDamageFactor))
```

- 防御中に命中技のrangeShiftAfterUseがnone以外なら、間合い変化阻止判定RNGを1回消費する
- `integerRandom(1,100) <= blockChance` なら間合い変化を無効化する
- damage軽減が実際に1以上、または間合い変化を阻止した場合にsuccessfulDefensesを1加算する。ただし同じ攻撃で最大1回
- `defenseBreak=true`はSprint 1で拒否するため、上表をさらに無効化しない

## 12. 回避

- `evade` が先に解決された場合、そのターンの後続攻撃へevadingを適用する。攻撃後に解決された場合、すでに受けた攻撃へ遡及しない
- 回避優先中の相手攻撃へ-30ポイント
- 成否には速度、技量、調子、疲労、負傷を用いる
- `evade(direction)` は `hold | approach_one | retreat_one` のいずれかを要求する
- 同じhitRollについて、回避補正がなければ命中し、補正後はmissとなった場合だけ回避成功とする
- 回避成功時、指定directionがapproach_oneまたはretreat_oneなら共有間合いを1段階変更する。端ではclampし、追加RNGは消費しない
- 攻撃を受けなかった場合、または元からmissだった場合は間合いを変更しない
- 回避成功回数を判定得点へ記録
- 回避のみを連続した場合は消極行動へ加算できる

## 13. 接近・離脱

### approach

- long→middle→close→contactの順に1段階接近
- 接近側: 速度、技量、接近適性
- 防御側: 速度、距離維持能力、迎撃行動
- 被弾しても接近成功する結果を許容

### retreat

- contact→close→middle→longの順に1段階離脱
- 離脱側: 速度、技量、離脱適性
- 相手側: 速度、追撃、接近行動
- 特性による2段階移動は後続拡張

`[Sprint 1暫定]` 成功式:

```text
MoverBaseScore
= moverSpeed * moverConsumptionPerformanceFactor * 0.50
+ moverSkill * moverConsumptionPerformanceFactor * 0.30
+ moverStateModifier
+ battle.movement.actionBonus

OpponentBaseScore
= opponentSpeed * opponentConsumptionPerformanceFactor * 0.50
+ opponentSkill * opponentConsumptionPerformanceFactor * 0.30
+ opponentStateModifier
+ opponentPreferredRangeControlBonus
+ opposingMovementBonus
+ guardingRangeControlBonus

moveRoll = integerRandom(battle.movement.randomMinimum, battle.movement.randomMaximum)
movementRoll = moveRoll
moveSucceeded = MoverBaseScore + movementRoll >= OpponentBaseScore
```

ActionLog用の事前成功確率 `movementChance`（RNG消費0）:

```text
requiredMoveRoll
= OpponentBaseScore - MoverBaseScore

possibleRollCount
= battle.movement.randomMaximum
- battle.movement.randomMinimum
+ 1

successfulRollCount
= inclusive integer range
  [battle.movement.randomMinimum, battle.movement.randomMaximum]
  のうち、
  MoverBaseScore + roll >= OpponentBaseScore
  を満たす整数rollの個数

movementChance
= floor(successfulRollCount * 100 / possibleRollCount)
```

- `movementChance`はsafe integer `0..100`
- approach／retreatの比較判定を実行した場合、`movementChance`と`movementRoll`は双方non-null
- 比較判定を実行しない場合、双方null（片方だけnon-nullは禁止）
- `movementChance`算出はRNGを消費しない。判定用`movementRoll`は従来どおり1回消費する
- 既定の`randomMinimum=-10`／`randomMaximum=10`におけるgolden cases:
  - 常時成功（`requiredMoveRoll <= randomMinimum`）→ `movementChance=100`
  - 必要roll 0 → successful=`0..10`（11／21）→ `floor(1100/21)=52`
  - 必要roll 10 → successful=`10`（1／21）→ `4`
  - 不可能（`requiredMoveRoll > randomMaximum`）→ `0`
- 境界は`battle.movement.randomMinimum`／`randomMaximum`から計算する。`-10`／`10`をproduction literalとして固定しない

```text
moverStateModifier
= mover.condition * battle.actionOrder.conditionPerPoint
- mover.fatigue * battle.actionOrder.fatiguePenaltyPerPoint
- mover.injury * battle.actionOrder.injuryPenaltyPerPoint

opponentStateModifier
= opponent.condition * battle.actionOrder.conditionPerPoint
- opponent.fatigue * battle.actionOrder.fatiguePenaltyPerPoint
- opponent.injury * battle.actionOrder.injuryPenaltyPerPoint
```

- `battle.movement.actionBonus=5`
- 相手の当該ターンresolvedActionが攻撃で、その攻撃のpreferredRangesに現在間合いが含まれる場合だけ `opponentPreferredRangeControlBonus=5`
- approachに対する相手resolvedAction=retreat、retreatに対する相手resolvedAction=approachは `opposingMovementBonus=10`
- 不正行動のrequestedActionを移動抵抗の根拠に使用しない
- 相手が先にbasic_defenseを成立させた場合 `guardingRangeControlBonus=5`
- 該当しない補正は0。技データから未定義の移動補正を読み取らない
- 未定義のmovementAptitudeを新設しない
- 移動判定1回につき、比較用RNGを1回だけ消費する
- 移動専用の状態補正configキーを新設しない。`moverStateModifier`／`opponentStateModifier`は`battle.actionOrder.conditionPerPoint`／`fatiguePenaltyPerPoint`／`injuryPenaltyPerPoint`を共用する
- `moverStateModifier`／`opponentStateModifier`へ`consumptionPerformanceFactor`を掛けない（speed／skill側のperformanceFactorとは別）
- `nextHitModifier`／`nextActivationModifier`は移動に影響せず、移動では消費しない
- 移動は当該移動actionが解決される時点の最新battle-local `condition`／`fatigue`／`injury`を使う。ターン開始スナップショットではない。先手行動などでinjuryが上昇した場合、後続の移動は更新後のinjuryを使う
- 対比: `ActionOrderScore`の`conditionFatigueInjuryModifier`はターン開始時点の値で確定し、先手行動後に再計算しない（§5／§18）
- 状態補正golden cases（condition／fatigue／injury → stateModifier。係数は`conditionPerPoint=0.25`／`fatiguePenaltyPerPoint=0.10`／`injuryPenaltyPerPoint=0.15`）:
  - `0 / 0 / 0` → `0`
  - `20 / 0 / 0` → `+5`
  - `-20 / 100 / 100` → `-30`
  - moverとopponentは独立に計算する
- 本節の明文化はRNG消費順・回数を変えない

## 14. 精神を整える

- 精神力を回復
- 次行動の命中・発動安定性へ小補正
- 大きな攻撃を受けると中断
- 1以上20％未満の被ダメージ時は回復量減少。防御成功そのものでは減少させず、防御後の実被ダメージ量で判定する

`[Sprint 1暫定]`:

```text
baseRecovery = max(1, floor(maxMental * 0.10))
```

focus_mind解決時には即時回復せず、ターン終了まで回復候補を保留する。

- そのターンに最大耐久の20％以上のダメージを受けた: 回復0、補正0
- 1以上20％未満のダメージを受けた: `floor(baseRecovery * 0.50)`、次Hit補正+1、次Activation補正+1
- ダメージ0: baseRecovery、次Hit補正+3、次Activation補正+3

現在精神力の上限を超えない。保留回復と最終回復量をActionLogへ残す。

## 15. ターン終了集計 `[Sprint 1暫定]`

### 15.1 防御・回避成功

- `successfulDefenses`: 同じ攻撃について、basic_defenseが実際の被ダメージを1以上軽減した、または技使用後の間合い変化を阻止した場合に最大1加算
- `successfulEvasions`: 同じhitRollについて、回避補正なしなら命中し、-30適用後はmissとなった場合に1加算
- 攻撃を受けなかった防御・回避は成功数へ加算しない
- Sprint 1では反撃を実行しないため `successfulCounters=0`

### 15.2 消極行動

次のresolvedActionで、その人物が当該ターンにダメージを与えなかった場合、`passiveActionCount` を1加算する。

- basic_defense
- evade
- retreat
- focus_mind
- no_action。ただし`replacementReason=opponent_ended_battle`は除外

`approach` と合法な攻撃失敗は消極行動へ数えない。不正置換は別途 `invalidActionCount` に記録する。相手が戦闘を終了させたため中止された行動を消極行動として減点しない。

### 15.3 優勢ターン

各ターン終了時、次の順に比較し、優勢側1人の `advantageTurnCount` を1加算する。

1. 当該ターンの与ダメージ
2. 当該ターンの攻撃成功回数
3. 当該ターンに解決した自分の攻撃が、その攻撃自身のpreferredRangesから実行されたか

- 攻撃を実行していない人物は3番目の比較を満たさない
- 双方ともpreferredRangesから攻撃した、または双方とも満たさない場合は同値

全項目同値ならどちらにも加算しない。RNGやPersonId順で優勢側を作らない。最後のActionLogに `advantageTurnAwardedTo` を記録する。

## 16. 精神消費

- 技を実行開始した時点でmentalCostを消費
- 命中・失敗に関係なく返却しない
- 基本攻撃・基本防御は0
- 精神不足なら実行不可
- 熟練度による消費効率は正本の意図を維持する

`[Sprint 1暫定]` 消費軽減:

```text
effectiveMentalCost
= max(
    0,
    floor(
      mentalCost
      * (
          1
          - mastery / 100
            * battle.mentalCost.maximumMasteryReductionRatio
        )
    )
  )
```

Sprint 1暫定既定値`maximumMasteryReductionRatio=0.10`のため、熟練度100で最大10％軽減する。`basic_attack`、`basic_defense`は精神消費0。計算は表示熟練度（`masteryHundredths / 100`）を使用する。

## 17. 負傷判定

単発ダメージ割合から正本の基礎負傷率を使う。

| 単発ダメージ／最大耐久 | 基礎負傷率 |
|---|---:|
| 10％未満 | 0％ |
| 10〜19％ | 2％ |
| 20〜29％ | 6％ |
| 30〜39％ | 12％ |
| 40％以上 | 25％ |

基礎負傷率へ次の順序で補正する。

```text
additiveInjuryChance
= baseChance
+ fatigue * 0.10
+ existingInjury * 0.10
- stamina * 0.08
+ (injuryProneness - 50) * 0.10
+ technique.injuryModifier

multiplicativeFactor
= (guarding ? guardedChanceFactor : 1.00)
× (inBattleConsumption >= 85 ? highBandInjuryMultiplier : 1.00)

FinalInjuryChancePercent
= floor(clamp(0, 95, additiveInjuryChance * multiplicativeFactor))
```

- `injuryProneness`は11仕様の0..100、50中立のsnapshot値
- 防御係数は加算補正後に掛ける
- 高消耗倍率は防御係数と同じ乗算段階で掛ける
- FinalInjuryChancePercentが0の場合は負傷RNGを消費しない
- 最終負傷判定成立時、重大負傷は20％
- 負傷判定は命中・ダメージ確定後に行う

```text
InjuryResult = none | minor | major
```

`[Sprint 1暫定]` 成立した通常負傷は負傷度+10、重大負傷は+30とし、`battle.injury`設定で管理する。BattleState内では戦闘内コピーの負傷度を更新し、人物への永続適用は13仕様のdevelopmentEffectsで一括する。

```text
updatedBattleInjury
= clamp(0, 100, injuryBefore + injuryDelta)

unableToContinue
= currentDurability > 0
  and updatedBattleInjury >= battle.injury.unableToContinueThreshold
```

- `unableToContinueThreshold` のSprint 1暫定既定値は100
- `currentDurability=0`の場合はknockoutを優先し、unable_to_continueへ置き換えない
- unableToContinue成立時は`canAct=false`とし、同じ解決点より後の行動を中止する
- 既存負傷度からの増加分だけを13仕様の`injuryDelta`へ渡し、初期負傷度を再加算しない


## 18. 戦闘内消耗

### 18.1 行動別基礎消耗

正本の暫定値を使用する。

| 行動 | 加算 |
|---|---:|
| 基本攻撃 | +2 |
| consumptionClass=small | +3 |
| consumptionClass=medium | +5 |
| consumptionClass=large | +8 |
| consumptionClass=ultimate | +12 |
| approach／retreat | +3 |
| basic_defense | +1 |
| evade | +4 |
| focus_mind | +1 |
| surrender／no_action | +0 |
| priorityが+1または+2の行動 | 上記へ追加+2 |

```text
inBattleConsumptionAfter
= clamp(0, 100, inBattleConsumptionBefore + baseConsumption + priorityAdditionalConsumption)
```

- `learningTier`から消耗量を推測せず、09仕様の`consumptionClass`を使用する
- 精神消費量から別の消耗値を追加しない
- 被ダメージは13仕様の `damageAdditionalFatigue` で別途扱い、inBattleConsumptionへ二重加算しない
- 100到達後も行動は可能だが、それ以上増加させない
- 双方のActionOrderScoreはターン開始時点の消耗値で確定し、先手行動後に再計算しない
- 消耗は各resolvedActionの効果解決後、そのActionLog確定前に加算する。後続行動の命中・移動・防御側性能には、その時点の最新消耗値を使用する
- surrenderとno_actionはpriorityに関係なく追加消耗0。`highPriorityAdditional`は実行された攻撃・防御・回避・移動・focus_mindだけへ適用する
- 各行動の前後値と実際に適用されたdeltaをActionLogへ残す
- 永続疲労へ変換するのは13仕様だけで行い、ターン中に人物のpersistent fatigueを変更しない

### 18.2 消耗帯の戦闘補正

| inBattleConsumption | performanceFactor | 追加効果 |
|---:|---:|---|
| 0..29 | 1.00 | なし |
| 30..49 | 0.95 | 行動順・命中・移動を5％低下 |
| 50..69 | 0.90 | 同10％低下 |
| 70..84 | 0.80 | 同20％低下 |
| 85..100 | 0.70 | 同30％低下、負傷・降参が起きやすい |

- 行動順ではspeedへperformanceFactorを掛ける
- 命中ではattackerSkillとdefenderSpeedへ各自のperformanceFactorを掛ける
- 移動ではspeedとskill（moverSkill／opponentSkill）へperformanceFactorを掛ける
- 85..100では最終負傷率へ `battle.consumption.highBandInjuryMultiplier` を掛ける `[Sprint 1暫定既定値1.25]`
- 85..100では19節の自動降参スコアへ `battle.strategy.highConsumptionSurrenderBonus` を加算する
- 補正帯は正本値として固定し、性能調整を理由に境界を変更しない

## 19. 降参

- 明示的な`surrender`は選択時点で敗北
- 自動戦闘では降参候補を正式に採点し、通常戦闘でも発生可能にする
- 降参判定は勝敗状況、残存耐久、現在精神力、負傷、試合内消耗、自信を用いる

`[Sprint 1暫定]`:

```text
SurrenderScore
= (1 - durabilityRatio) * durabilityWeight
+ (1 - mentalRatio) * mentalWeight
+ injury / 100 * injuryWeight
+ inBattleConsumption / 100 * consumptionWeight
+ opponentDurabilityLead * opponentLeadWeight
- confidenceNormalized * confidenceWeight
+ highConsumptionBonus
+ predictedMajorInjuryChance * majorInjuryRiskWeight / 100
+ personalitySurrenderModifier

includeSurrenderCandidate
= SurrenderScore >= battle.strategy.surrenderCandidateThreshold

surrenderActionScore
= battle.strategy.surrenderActionBaseScore + SurrenderScore
```

- `confidenceNormalized = (confidence + 20) / 40`
- `personalitySurrenderModifier = (caution - 50) * 0.10 - (perseverance - 50) * 0.20 - (riskTolerance - 50) * 0.10`
- aggressionは降参スコアへ直接加算せず、攻撃候補のStrategy scoreへ使用する
- `opponentDurabilityLead = max(0, opponentDurabilityRatio - durabilityRatio)`
- 重大負傷危険または続行不能条件では閾値を超えるよう設定する
- 降参候補を含めた後も他行動と同じStrategyActionScoreで比較し、常に降参させる固定分岐にはしない
- 閾値・係数は14設定仕様で固定する

## 20. 詳細ログ

ターン単位の行動順RNGと、各行動の効果RNGを別ログへ分離する。

```text
BattleDetailedLog
- turnOrderLogs: BattleTurnOrderLog[]
- actionLogs: BattleActionLog[]
```

```text
BattleTurnOrderLog
- turnNumber
- sideAPriority
- sideBPriority
- sideAActionOrderScore
- sideBActionOrderScore
- rngStateBeforeOrder
- sideAOrderRoll
- sideBOrderRoll
- tieBreakRoll
- resolvedFirstSide
- rngStateAfterOrder
```

- priorityが異なる場合、両orderRollとtieBreakRollはnullで、rngStateBeforeOrderとrngStateAfterOrderは一致する
- 同priorityではsideA、sideBの固定順でorderRollを各1回消費する
- 乱数適用後も完全同値の場合だけtieBreakRollを1回消費する
- TurnOrderLogは各turnNumberにつき正確に1件
- 先手ActionLogの`rngStateBefore`はTurnOrderLog.rngStateAfterOrderと一致する

```text
BattleActionLog
- actionSequence
- turnNumber
- actorSide
- actorPersonId
- strategySeed
- strategyCandidateScores
- strategyTieBreakUsed
- requestedAction
- resolvedAction
- replacementReason
- priority
- actionOrderScore
- rangeBefore
- rangeAfter
- rangeShiftApplied
- rangeShiftBlockChance
- rangeShiftBlockRoll
- movementChance
- movementRoll
- evadeDirection
- actorDurabilityBefore
- actorDurabilityAfter
- actorMentalBefore
- actorMentalAfter
- targetDurabilityBefore
- targetDurabilityAfter
- targetMentalBefore
- targetMentalAfter
- guardingBefore
- guardingAfter
- evadingBefore
- evadingAfter
- activationChance
- activationRoll
- activationSucceeded
- activationFailureReason
- hitChance
- hitRoll
- hit
- damageVariance
- damage
- focusBaseRecovery
- focusAppliedRecovery
- injuryChance
- injuryRoll
- majorInjuryChance
- majorInjuryRoll
- injuryResult
- inBattleConsumptionBefore
- inBattleConsumptionDelta
- inBattleConsumptionAfter
- passiveActionCountDelta
- invalidActionCountDelta
- advantageTurnAwardedTo
- nextHitModifierBefore
- nextHitModifierAfter
- nextActivationModifierBefore
- nextActivationModifierAfter
- surrenderedAfter
- unableToContinueAfter
- canActAfter
- rngStateBefore
- rngStateAfter
```

未使用値はnullとし、キーを不規則に省略しない。

- ActionLogには行動順rollを重複保存せず、ActionOrderScoreだけを参照用に保持する
- 実解決順で先頭のActionLogの`rngStateBefore`はTurnOrderLog.rngStateAfterOrderと一致する
- 先頭ActionLogの`rngStateAfter`は先手行動効果をすべて消費した後の状態
- 後手ActionLogの`rngStateBefore`は先頭ActionLogの`rngStateAfter`と一致し、`rngStateAfter`は後手行動後の状態
- unableToContinue成立時は成立させた攻撃側ログのtarget差分と、中止された側のno_actionログから再生可能にする
- `movementChance`／`movementRoll` はapproach・retreatの比較判定を実行した場合だけ双方non-nullの値を持つ（片方だけnon-nullは禁止）
- `movementChance`は`MoverBaseScore`／`OpponentBaseScore`と`battle.movement.randomMinimum`／`randomMaximum`から算出するfloor整数パーセント（0..100）。算出自体はRNGを消費しない
- 比較判定実行時に`movementChance=null`は禁止
- `majorInjuryChance`／`majorInjuryRoll` は通常負傷が成立し、重大負傷判定を実行した場合だけ値を持つ
- TurnOrderLog、rangeShift阻止、移動、通常負傷、重大負傷の各rollから、詳細ログだけでRNG消費順と状態遷移を再生できなければならない

## 21. RNG消費規則

- 同priorityのActionOrderScore乱数: 各人物1回
- ActionOrderScore完全同値: 追加1回
- use_technique発動安定性: 1回
- 発動成功した攻撃の命中: 1回
- 命中時ダメージ変動: 1回
- 負傷率が0より大きい場合の負傷判定: 1回
- 負傷成立時の重大負傷判定: 1回
- 防御中の技使用後間合い変化阻止: 条件成立時1回
- 接近・離脱: 1回
- basic_defense、focus_mind、surrender: 行動効果自体は原則0回
- 先手で終了した場合、未実行後手用RNGは消費しない

## 22. 不変条件

- battleRulesRefHash、runRuleSnapshotHash、battleInputHashは戦闘中不変

- BattleDetailedLog.turnOrderLogsはturnNumberごとに1件、actionLogsはactionSequence連続
- battle-local確定BattleStateのturnNumberは0から開始し、battle-localで成功したターンごとに正確に1増加
- Strategy、TurnOrderLog、ActionLog、battle-local確定後BattleStateは同じpreparedTurn.turnNumberを使用
- currentDurabilityは0..maxDurability
- currentMentalは0..maxMental
- inBattleConsumptionは0..100
- injuryは0..100
- unableToContinue=trueならcanAct=false
- currentDurability=0の終了理由はunable_to_continueではなくknockout
- rangeは4段階
- 使用不可技を実行しない
- ready／completed／failed状態をresolveBattleTurnへ渡さない
- completedではterminalReason必須、ready／in_progress／failedではterminalReason=null
- completed／failed後にターン解決しない
- ログとstate差分が一致
- 入力state不変
- same seed完全一致

## 23. 自動戦闘オーケストレーション

ユーザーが戦闘行動を直接指定しない本企画の前提に合わせ、Resolverとは分離した `BattleStrategy` を注入する。

```text
BattleStrategyInput
- preparedTurn
- actorSide
- legalActions
- strategyConfig
- battleDecisionProfile

BattleStrategyResult
- requestedAction: BattleAction | no_action
- candidateScores
- tieBreakUsed
- strategySeed
```

### 23.1 DefaultBattleStrategy `[Sprint 1暫定]`

1. `canAct=false` なら候補採点をせず `no_action`
2. 現在間合いで合法な技と3系統の合法な `basic_attack(profile)` を列挙
3. `basic_defense`を常に候補へ追加
4. `evade(hold)`を常に追加し、端を超えない`evade(approach_one)`／`evade(retreat_one)`も追加
5. 共有間合いを実際に1段階変更できる`approach`／`retreat`を候補へ追加
6. `currentMental < maxMental`の場合だけ`focus_mind`を追加
7. 19節のSurrenderScoreが閾値以上なら`surrender`を候補へ追加
8. 全候補を耐久割合、精神割合、期待発動、期待命中、期待ダメージ、間合い主導権、自己負傷危険、消耗、BattleDecisionProfileで決定的に採点
9. 最高点の行動を選ぶ

- 3系統基本攻撃があるため、正常なBattleStateで「攻撃候補がない」ことを移動選択の条件にしない
- 防御・回避・移動・focus_mindは攻撃候補の有無に関係なく、上記条件で同じ候補集合へ入れる
- surrenderだけは一般StrategyActionScoreを使わず、19節の`surrenderActionScore`を候補点とする
- 候補集合が空になる場合は入力不変条件違反であり、固定的なbasic_defense成功値へ隠さない

```text
StrategyActionScore
= expectedDamageScore
+ rangeControlScore
+ defenseNeedScore
+ mentalRecoveryNeedScore
- mentalCostPenalty
- injuryRiskPenalty
+ personalityActionModifier
```


暫定算出式:

```text
expectedActionSuccessChance
= use_techniqueなら expectedActivationChance / 100 × expectedHitChance
  basic_attackなら expectedHitChance

expectedDamageScore
= expectedActionSuccessChance / 100
× estimatedDamage
× expectedDamageWeight

rangeControlScore
= 攻撃候補では、その攻撃の予測実行間合いがpreferredRangesなら rangeControlWeight
  usableRangesだがpreferredでなければ rangeControlWeight * 0.5
  それ以外は0

非攻撃候補では、候補実行後の予測間合いで合法となる攻撃候補を評価し、
expectedDamageScoreが最大の攻撃1件をreferenceOffenseとする。
同点時はbasic attack profile固定順、次にTechniqueId順で決めRNGを使わない。
referenceOffenseのpreferred／usable判定を上記と同じ式へ使用し、
合法攻撃がなければ0

defenseNeedScore
= basic_defense／evade候補のみ
  (1 - durabilityRatio) * defenseNeedWeight

mentalRecoveryNeedScore
= focus_mind候補のみ
  (1 - mentalRatio) * mentalRecoveryNeedWeight

mentalCostPenalty
= mentalCost / max(1, maxMental) * mentalCostPenaltyWeight

injuryRiskPenalty
= predictedSelfInjuryChance / 100 * injuryRiskPenaltyWeight
```

- 非該当項は0とする。非攻撃候補のexpectedDamageScoreとmentalCostPenalty、攻撃候補のdefenseNeedScoreとmentalRecoveryNeedScoreは0
- StrategyActionScoreはbasis points整数へ正規化してから比較し、小数の二進表現差を同点判定へ使用しない

`predictedSelfInjuryChance` は候補行動によって自分が次に受け得る負傷危険を表す。次の固定手順で算出する。

1. 相手の現在合法な `use_technique` と3系統 `basic_attack` をTechniqueId／profile固定順で列挙する
2. 各相手攻撃について、候補行動後の自分のguarding／evading状態と予測間合いを使用する
3. ダメージ乱数は期待値1.00、発動・命中は8〜9節のRNGなし期待確率を使用する
4. 17節の最終負傷率へ `expectedActivationRate × expectedHitRate` を掛ける
5. 全相手攻撃候補の最大値を `predictedSelfInjuryChance` とする。合法攻撃がなければ0

```text
predictedMajorInjuryChance
= predictedSelfInjuryChance
× battle.injury.majorChanceWhenInjured
```

- `basic_defense`候補ではguardingを適用した負傷率を使用する
- `evade(direction)`候補では回避補正後の期待命中率と予測間合いを使用する
- 攻撃、移動、focus_mind候補では防御・回避補正を適用しない
- 相手の実際のStrategy選択結果を先読みせず、最大値集約で固定する
- `predictedMajorInjuryChance`は19節の降参スコアにも同じ値を使用する

性格補正:

- 攻撃候補: `(aggression - 50) * 0.20 + (riskTolerance - 50) * 0.10`
- basic_defense／evade: `(caution - 50) * 0.20 - (riskTolerance - 50) * 0.05`
- focus_mind: `(caution - 50) * 0.10`
- approach／retreat: 目標間合いへ近づく場合 `(aggression - caution) * 0.05`
- surrender: 19節のpersonalitySurrenderModifierを使用し、重複加算しない

expectedActivationChance、expectedHitChance、estimatedDamage、predictedSelfInjuryChanceはResolverと同じ式をRNGなしの期待値として計算する。`estimatedDamage`のダメージ変動係数は中立値1.00とし、Strategy独自の近似式を作らない。evadeはhold／approach_one／retreat_oneを別候補としてcanonical順に列挙し、各directionの予測間合いからrangeControlScoreを算出する。

- 各係数は `battle.strategy` の型付き設定
- 候補順はaction enum、TechniqueId順でcanonical化
- 同点時だけ共通RNG仕様の2引数APIを使い、`deriveSeed(battleSeed, label)` から独立した戦略用RNGを1回使用する
- labelは `battle/strategy/turn-0001/side-a` 形式とし、turnはpreparedTurn.turnNumberを4桁ゼロ埋め、sideは`side-a`／`side-b`に固定する
- 戦略用RNGはResolverの `rngState` とWorld RNGを進めない
- strategySeed、候補点、選択結果をターン入力または詳細ログへ残す
- 自動降参は19節の候補判定と同じ設定を用い、未実施として後続へ送らない

### 23.2 runBattleToCompletion

```text
RunBattleToCompletionInput
- expectedWorldStateHash
- startBattleInput（両BattleActionSourceIdentity、World RNG状態、MatchIdGeneratorStateを含む）
- participantAActionsSource
- participantBActionsSource
- postProcessContext
```

- `postProcessContext` は13仕様の結果生成に必要な決定性入力であり、正常なrun開始時に必須として固定する。標準WorldEngineでは現在の週トランザクションから内部生成し、外部値をそのまま信用しない
- participantIdと同週完了試合数、両ActionsSource identityをBattleState生成前に検証し、年齢はStartBattleInput.createBattleRequestから生成するBattleParticipantSnapshot.ageAtBattleで検証する。標準WorldEngineではexpectedWorldStateHashを算出した同じWorldStateから両人物入力を4.5節adapterで再構築し、sourceSnapshotHashを固定する。失敗時はBattleState・イベント・BattleResultを生成せず、World RNG・MatchIdGeneratorStateも消費しない
- turn resolverへはBattleStateだけを渡し、postProcessContextは終了結果生成まで変更しない
- `postProcessContext` はcompleted／resolution_errorのどちらでもBattleResultへ保存し、result source hashの対象に含める。戦闘開始前入力検証失敗ではBattleResult自体を生成しない

1. 11仕様の`startBattleTransaction`を1回実行し、in_progress BattleState、StartBattleRuntimeTransition、`battle.started`候補を未commitのsuccess計画として固定する
2. pre-start failureでは両生成状態をcommitせず終了する
3. 各ターンで`prepareBattleTurn`を1回実行し、次turnNumberと正規化stateViewを固定する
4. preparedTurnをsideA、sideBのStrategyへ渡し、結果を独立に取得する
5. battle-local確定BattleState、preparedTurn、同じRunRuleSnapshot、双方の行動を`resolveBattleTurn`へ渡す
6. successなら返却stateを次入力とし、status=in_progressの間だけ繰り返す
7. prepare、StrategyまたはResolverが開始後にfailureを返した場合、最後にbattle-local確定したBattleStateを複製し、status=failed、terminalReason=null、failure=BattleFailureInfoとする。他の状態、詳細ログ、turnNumber、actionSequence、rngStateは変更しない
8. Resolverが第20ターンをbattle-local確定した時点で`status=completed`、`terminalReason=max_turns_reached`となるため、オーケストレータ側で別の21回目判定を行わない
9. completedまたはfailed状態から13仕様のBattleResultを1回だけ生成する

```text
RunBattleCommitPlan
- schemaVersion: "0.2.0"
- simulationId
- runRuleSnapshotHash
- expectedWorldStateHash
- expectedParticipantASourceSnapshotHash
- expectedParticipantBSourceSnapshotHash
- startRuntimeTransition: StartBattleRuntimeTransition
- battleResult: BattleResult
- eventCandidates: [battle.started, battle.finished]
- structuralValidation: RunBattleCommitPlanStructuralValidation
- commitPlanHash

RunBattleCommitPlanStructuralValidation
- overallPassed
- violations

RunBattleCommitPlanHashInput
- schemaVersion
- simulationId
- runRuleSnapshotHash
- expectedWorldStateHash
- expectedParticipantASourceSnapshotHash
- expectedParticipantBSourceSnapshotHash
- startRuntimeTransition
- battleResult
- eventCandidates
- structuralValidation

RunBattleToCompletionResult =
  | { kind: completed, commitPlan: RunBattleCommitPlan }
  | { kind: resolution_error, commitPlan: RunBattleCommitPlan }
  | { kind: pre_start_failure, commitPlan: null, validation }
```

- `RunBattleToCompletionResult`のpublic discriminantは上記3種類だけとする。第4 kindを追加しない。
- `runBattleToCompletion`は「すべての実行障害を`RunBattleToCompletionResult`へ変換する関数」ではない。必須dependencyまたは内部不変条件が壊れ、正しい`RunBattleCommitPlan`を構築できない場合は、result型の外側へexecution abortとしてthrowする。

#### 23.2.1 結果分類表

| # | 条件 | 結果 |
|---|---|---|
| 1 | start前 semantic／input failure | `pre_start_failure` |
| 2 | start前 dependency／hash failure | `pre_start_failure` |
| 3 | start後 battle semantic／resolution failure かつ failed plan完全構築可能 | `resolution_error` |
| 4 | start後 dependency／hash failure | throw `BattleExecutionAbortError`（`failureKind=dependency_failure`） |
| 5 | start後 production invariant violation | throw `BattleExecutionAbortError`（`failureKind=internal_invariant_violation`） |
| 6 | normal completion | `completed` |

#### 23.2.2 pre_start_failure

`startBattleTransaction`が成功する前のfailure。

含む:

- 入力validation failure
- battle start eligibility failure
- start計画生成failure
- start成功前のSha256Provider failure
- start成功前のhash validation failure

結果:

- `kind = pre_start_failure`
- commitPlanなし
- `battle.started`候補なし
- `battle.finished`候補なし
- Worldへ適用するtransitionなし

#### 23.2.3 resolution_error

`startBattleTransaction`成功後に発生した「シミュレーション上の解決失敗」であり、かつ正常な必須dependencyのもとで正規failed BattleResultと`RunBattleCommitPlan`を完全構築できる場合だけ使用する。

例:

- `prepareBattleTurn`の正規semantic failure
- strategy／action request failure
- `resolveBattleTurn`の正規resolution failure
- その他、本仕様で`BattleFailureInfo`として定義済みの戦闘処理failure

結果:

- `kind = resolution_error`
- `resultKind = failed`
- `endReason = resolution_error`
- `winnerPersonId = null`／`loserPersonId = null`
- `developmentEffects = []`
- `finalState.status = failed`かつ`failure`必須
- 最後のbattle-local commit済みstate／log／rngを維持
- `startRuntimeTransition`保持
- `eventCandidates = [battle.started, battle.finished]`
- 正規`commitPlanHash`あり

「failed BattleResultを完全に作れるfailure」だけが`resolution_error`である。

#### 23.2.4 post-start execution abort

`startBattleTransaction`が成功した後に、正規BattleResult／event candidates／commitPlanを信頼できる形で構築不能になった場合。これはBattleResultではない。`RunBattleToCompletionResult`の第4kindにも追加しない。throwによるexecution abortとする。

正規公開型: `BattleExecutionAbortError`

最低限保持:

- `failureKind`: `dependency_failure`｜`internal_invariant_violation`
- `stage`: `prepare_turn`｜`resolve_turn`｜`mark_failed_state`｜`finalize_battle_result`｜`build_commit_plan`
- `issues`: `readonly ValidationIssue[]`
- Error messageは診断用。simulation canonical dataやhash材料には含めない。現実日時、OS path、stack trace等をsimulation結果へ保存しない。

**dependency_failure**（プログラムロジックではなく必須dependencyが契約どおり動作しなかった場合）:

- Sha256Providerがthrowする
- Sha256Providerがfailureを返す
- Sha256Providerが不正digestを返す
- hash計算結果がprovider契約を満たさない

start成功後なら`throw BattleExecutionAbortError { failureKind: "dependency_failure", stage, issues }`とする。

重要: prepare／resolve中に発生したhash provider failureも`resolution_error`へ変換しない。「prepareが失敗した」という表面だけで分類しない。failure原因がdependency failureならexecution abort。

**internal_invariant_violation**（正常providerかつ同一pipelineが生成したvalidated materialであるにもかかわらず mark／finalize／buildCommitPlan structural validation等が拒否した場合）:

- 通常のユーザー入力failureではない
- production codeの不変条件違反
- 結果型へ偽装しない
- `throw BattleExecutionAbortError { failureKind: "internal_invariant_violation", stage, issues }`

#### 23.2.5 原子性・fallback禁止・昇格

execution abort時は`runBattleToCompletion`から`RunBattleCommitPlan`を返さない。返さない／commitしない:

- `StartBattleRuntimeTransition`
- `battle.started`／`battle.finished`
- BattleResult／developmentEffects／World effect candidates
- World RNG update／participant source update

`startBattleTransaction`がbattle-localで成功していても、S01-007時点ではWorldへcommitされていない。execution abort時は`startRuntimeTransition`を破棄する。Worldから見れば「このbattle transactionはcommitされなかった」状態にする。`battle.started`だけを単独commitしてはいけない。`battle.finished`だけを生成してはいけない。

execution abortまでにbattle-local RNGが内部で進んでいても、そのstateをWorldへcommitしない。World側RNGについても`RunBattleCommitPlan`が存在しないため`startRuntimeTransition`を適用しない。S01-008ではexecution abort時にWorld RNG／participant source／eventsを変更しない。execution abort用に新しいRNGを消費しない。

dependency failure発生後のfallbackは禁止する（別provider／hash省略／仮hash／空BattleResult／validationをfalseにしてcommitする等）。壊れたdependencyを使って`resolution_error`を無理に合成しない。

domain failureの後にplan生成中dependency failureが起きた場合（例: resolverが正規`BattleFailureInfo`を返した後、failed state作成中にSha256Providerがfailure）は、最終結果を`resolution_error`にせずexecution abort（`dependency_failure`）へ昇格する。途中まで作ったfailed state／result／event候補は破棄する。

#### 23.2.6 S01-008への契約

S01-008のWorldEngine commit層は、`runBattleToCompletion`が`completed`／`resolution_error`を返した場合だけ`RunBattleCommitPlan`をcommit可能とする。

- `pre_start_failure`: commitなし
- `BattleExecutionAbortError`: commitなし。catchした場合も`startRuntimeTransition`／started／finished／developmentEffectsをcommitせず、World RNGを進めず、participant source snapshotを変更しない
- Sprint 1 battle EventEnvelopeへ新しいイベントは追加しない

- `structuralValidation`はbusiness／構造整合だけを検証し、`commitPlanHash`の存在・値・一致を検証対象に含めてはならない。
- plan生成順序を次へ固定する。
  1. BattleResult、StartBattleRuntimeTransition、イベント候補、期待hash群を確定する
  2. それらへbusiness／構造検証を実行し、`structuralValidation`を確定する
  3. `commitPlanHash`を除く上記フィールドから`RunBattleCommitPlanHashInput`を構築する
  4. `commitPlanHash = SHA-256(canonicalJson(RunBattleCommitPlanHashInput))`を計算する
- `RunBattleCommitPlanHashInput`へ`commitPlanHash`自身を含めない。`structuralValidation`にも`commitPlanHash`検証結果を含めないため、hash循環は発生しない。
- commit時は、まず`structuralValidation`を現在状態に対して再実行し、その後に現在のplanから`RunBattleCommitPlanHashInput`を再構築してhashを再計算し、保存済み`commitPlanHash`と比較する。この2工程を混同しない。
- completed／resolution_errorのplanはstartBattleTransactionのruntime transitionを変更せず保持し、戦闘内部ではWorld RNG／MatchIdGeneratorStateを進めない。
- pre_start_failureでは開始計画全体を破棄し、commitPlan=nullとする。入力WorldState、World RNG、MatchIdGeneratorStateは未変更のまま維持する。未commitのMatchId予約は破棄され、再試行では同じMatchId（同じcommitted `nextSequence`）を再発行する。
- `structuralValidation.overallPassed=true`のplanだけを返却・commit可能とする。completedではBattleResult.validation.overallPassed=trueを必須とする。resolution_errorではBattleResult.validation.overallPassed=falseを正規状態として許可するが、failed state、failure情報、空developmentEffects、started／finished候補の相互整合をstructuralValidationで検証する。
- `commitRunBattlePlan`は同じWorldEngine週トランザクション内で、structuralValidation、現在runのsimulationIdとRunRuleSnapshot hash、現在WorldState hash、World RNG hash、MatchIdGeneratorState hash、再計算したcommitPlanHashを検証する。さらに現在WorldStateから両人物を同じadapterで再構築し、sourceSnapshotHashがplanのexpectedParticipantA／BSourceSnapshotHashと一致すること、transaction-localの同週確定試合数がpostProcessContextと一致することを確認してから、次を不可分に実行する。
  1. World RNGとMatchIdGeneratorStateをStartBattleRuntimeTransitionのnext stateへ置換
  2. BattleResult.developmentEffectsを対象人物へ適用し、人物不変条件を検証
  3. `battle.started`／`battle.finished`候補を共通Event Stream append候補へ順番どおり追加
  4. BattleResultを同週の確定済み戦闘結果として登録
- 上記のどれかが失敗した場合、WorldState、両生成状態、人物効果、イベント候補、戦闘結果登録をすべてrollbackする。
- `startRuntimeTransition`単体、BattleResult単体、人物効果単体、イベント候補単体のcommit APIを公開しない。
- `eventCandidates`はEventId／simulationId／sequence未割当であり、同週の全Processor成功後に共通append層がEventEnvelope 0.2.0へ包む。
- 正常終了とbeginBattle成功後のresolution_errorはいずれもstarted／finishedの2候補を持ち、pre_start_failureは候補を持たない。
- 開始後failureから作るfailed state transitionはResolver RNGを消費せず、ActionLogを追加しない
- resolveBattleTurnの呼出しは最大20回とし、第20ターンbattle-local確定後のcompleted状態へ21回目を要求しない
- 標準WorldEngine runでは両ActionsSourceをDefaultBattleStrategyへ固定し、scripted actionsは単体試験・replayだけで許可する
- strategy、resolver、result builderの入力を変更しない
- 同一入力・同一seedで全文一致する
- 戦略差し替えでResolverの仕様を変更しない

## 24. 必須テスト

- prepareBattleTurnがturnNumberを0→1へ確定し、Strategy／Resolver／ログ／battle-local確定stateで同じ番号を使用
- prepareBattleTurnがguarding／evadingをStrategy実行前にfalseへ正規化し、入力BattleStateを変更しない
- prepare／Strategy／Resolver失敗時にturnNumber・RNG・詳細ログをcommitしない
- 同priority時のBattleTurnOrderLogからsideA／sideB roll、tie-break、RNG境界を完全再生
- priority差がある場合のTurnOrderLogはroll=nullかつRNG非消費
- priority +2/+1/0/-1
- 同priority速度差
- 完全同値seeded tie-break
- 4間合いの使用条件
- 未知TechniqueIdと既知未習得TechniqueIdの別replacementReason
- BattleRulesSnapshotRefと同一RunRuleSnapshotの組合せだけでResolverが自己完結し、可変外部設定を参照しないこと
- DefaultBattleStrategyとscripted actionsのidentity検証、identity差替え拒否、battleInputHash差分
- 任意callback／外部I/O／共有可変状態を持つActionsSource拒否
- 標準WorldEngine runでscripted actions拒否、単体試験／replayでのみ許可
- 得意／不得意間合い補正
- 発動率・命中率・負傷率のfloorとclamp境界
- 命中率5／95 clamp
- use_technique発動成功／不発と不発後RNG非消費
- focus_mind補正が行動順へ入らず、命中・発動へだけ1回適用
- basic_attack命中率75
- damage formula境界
- 技区分別防御軽減と間合い変化阻止率
- 回避-30とhold／approach_one／retreat_oneの成功時移動
- 接近・離脱成功／失敗とrequestedAction非参照
- 消極行動でopponent_ended_battleを除外
- 優勢ターンのpreferred attack判定
- focus_mindの無被弾／小被弾／大被弾
- 精神不足置換
- 負傷率全境界と疲労・既存負傷・体力・負傷傾向・技補正の式
- 負傷度100到達によるunable_to_continueとknockout優先
- StrategyのpredictedSelfInjuryChance最大値集約と重大負傷予測
- 先手KOで後手no_actionログ・RNG非消費
- startBattleTransactionの未commit success／failure、StartBattleRuntimeTransitionのexpected hash・transitionHash検証
- 内部beginBattleのready→in_progress、状態不変、RNG非消費、二重開始拒否
- battle.startedがbeginBattleで1回だけ生成され、sourceProcessor=`battle-simulation`、entities.matchIdsに対象MatchIdを持つこと
- consumptionClass別基礎消耗とlearningTier非依存
- 行動別基礎消耗と0..100 clamp
- 消耗帯0..29／30..49／50..69／70..84／85..100の行動順・命中・移動補正
- 高消耗時の負傷倍率
- rangeShiftAfterUseの成功時1段階移動とrangeShiftAppliedログ
- inBattleConsumptionとログ再計算
- RNG消費数とBattleTurnOrderLog／movementRoll／rangeShiftBlockRoll／injuryRoll／majorInjuryRollログ
- 未実行判定のrollがnullで、実行した判定のrollだけが必須となること
- deriveSeedの固定2引数label
- DefaultBattleStrategyの完全候補集合、referenceOffense、非該当score=0、basis points同点、性格差、3系統基本攻撃、自動降参、同点seed
- StartBattleResult success／failure、RunBattleToCompletionResult 3分岐、pre_start_failure validation、RunBattleCommitPlanの型境界
- runBattleToCompletion開始前のCreate／begin／postProcessContext不正でcommitPlanを生成せず、BattleState・イベント・BattleResult・World RNG・MatchIdGeneratorStateをcommitしない
- commitRunBattlePlanがsimulationId、runRuleSnapshotHash、expectedWorldStateHash、両人物sourceSnapshotHash、同週試合数、両runtime state hash、structuralValidationと再計算commitPlanHashを検証し、両生成状態・人物効果・started／finished候補・BattleResultを不可分にcommitする
- commitRunBattlePlanのstructuralValidation失敗、人物snapshot差替え、同週試合数差異、人物不変条件違反、イベント候補不正、古いworld hash、二重適用で全項目rollbackする
- completed planではBattleResult.validation=true、resolution_error planではBattleResult.validation=falseかつstructuralValidation=trueとなる型境界
- runtime transition、BattleResult、developmentEffects、イベント候補の個別commit APIが存在しないこと
- runBattleToCompletionの20ターン上限
- 開始後Strategy／Resolver failureで最後のbattle-local確定stateからfailed stateを作り、battle-local確定状態・ログ・RNGを追加変更しないこと
- resolution_errorでも開始時postProcessContextを変更せず結果へ保存すること
- strategy RNGがResolver／World RNGを進めないこと
- 入力不変
- start前provider／hash failureは`pre_start_failure`（plan／candidatesなし）
- start直後／prepare／resolve中のprovider failureは`BattleExecutionAbortError(dependency_failure)`であり`resolution_error`ではない
- domain resolution failure後のmark／finalize中provider failureは`dependency_failure` abortへ昇格し、`resolution_error` planを返さない
- commitPlanHash計算時provider failureは`dependency_failure` abort
- providerがthrowせず不正digestを返す場合も`dependency_failure` abort
- healthy provider＋正規domain resolution failureは`resolution_error`
- healthy provider＋normal completionは`completed`
- execution abortは入力RuntimeState／participant source等をmutationせず、追加RNGを消費しない
- execution abort時は`RunBattleCommitPlan`を返さず、startRuntimeTransition／started／finishedをcommitしない

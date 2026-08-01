# 09 技データ・習得仕様

- 仕様版: `S1-SPEC-0.1.11`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 技定義、技分類、習得進捗、熟練度、使用条件
- 非対象: 師匠が教える技の自律判断、独自技生成、派生、失伝

## 1. 目的

格闘・剣技・魔法の技を正本の共通形式で定義し、週次習得と1対1戦闘で決定的に利用できるようにする。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

正本参照見出し:

- 技術体系
- 技の使用条件と能力参照
- 技の習得進捗
- 師匠が教える技の決定
- 独自技・派生技・研究
- 間合いと行動
- 戦闘数値の暫定設定

## 2. 技系統

```text
TechniqueCategory = unarmed | sword | magic
```

- `unarmed`: 筋力・速度・体力を生かす。接近戦と連続技に強い
- `sword`: 技量・筋力・速度を生かす。間合い・精度・反撃を重視
- `magic`: 魔力が威力、精神が回数・制御・安定性へ影響

`TechniqueCategory`は08仕様の`DomainAptitude`、Sprint 0公開型`AptitudeKey`、流派主系統、`BasicAttackProfile`と同一キーとする。`martial`は使用せず、別名対応表も設けない。系統適性の取得は`category`キーそのもので行い、暗黙変換を禁止する。

Sprint 1では複合系統技を実装しない。ただし `sourceTechniqueIds` を保持できる構造は維持する。

## 3. 間合い

```text
BattleRange = contact | close | middle | long
```

| 値 | 意味 |
|---|---|
| contact | 密着 |
| close | 近距離 |
| middle | 中距離 |
| long | 遠距離 |

技は次を持つ。

- `usableRanges`: 使用可能間合い。1件以上
- `preferredRanges`: 得意間合い。`usableRanges` の部分集合

## 4. 技定義

```text
TechniqueDefinition
- techniqueId
- schemaVersion
- dataVersion
- name
- category
- primaryStats
- requiredAptitude
- requiredStats
- prerequisiteTechniqueMastery
- mentalCost
- difficulty
- learningTier
- consumptionClass
- learningProgressRequired
- learningProgressOverrideReason
- teachingProficiencyRequired
- secrecy
- power
- accuracy
- activationDifficulty
- prerequisiteTechniqueIds
- originPersonId
- sourceTechniqueIds
- tags
- usableRanges
- preferredRanges
- rangeShiftAfterUse
- priority
- speedModifier
- injuryModifier
- actionTraits
```

`usableRanges` 以下は、正本の戦闘処理を実装するためのSprint 1拡張である。

- `TechniqueDefinition.schemaVersion` のSprint 1初期値は `0.1.0` とする。
- 正式な初期技カタログの `TechniqueCatalogIdentity.dataVersion` は `techniques-0.1.0` とする。
- 同じschemaVersion／dataVersionで構造または内容を変更しない。変更時は必ず版を上げる。

### 4.1 技カタログ識別

技一覧は次の2値で識別する。

```text
TechniqueCatalogIdentity
- dataVersion
- catalogHash
```

- `catalogHash` は、同一 `dataVersion` に属する全 `TechniqueDefinition` を `TechniqueId` 昇順へ並べ、canonical JSON化してSHA-256を算出する
- 同じ `dataVersion` で内容差異があるカタログは拒否する
- 完全な技カタログは11仕様の `RunRuleSnapshot` へrun単位で1回だけ保存する
- 各戦闘は `BattleRulesSnapshotRef` からrun単位snapshotの `dataVersion` と `catalogHash` を参照し、試合ごとに完全カタログを複製しない
- 基本攻撃プロファイルはSprint 1設定側のhashへ含め、TechniqueCatalogへ混在させない

#### 4.1.1 canonical配列順

TechniqueDefinition内の配列は、意味的に集合として扱うものをhash計算前に次の固定順へ正規化する。入力順を意味として扱わない。

- `primaryStats`: `stamina < strength < skill < speed < spirit < magic`
- `usableRanges`／`preferredRanges`: `contact < close < middle < long`
- `prerequisiteTechniqueIds`／`sourceTechniqueIds`: TechniqueId昇順
- `prerequisiteTechniqueMastery`: `techniqueId`昇順
- `tags`: Unicode code point昇順。重複禁止

順序に意味を持たせる新規配列を追加する場合は、集合配列と混同せず仕様上明示する。canonical JSON化はこの正規化後の配列を使用する。

### 4.2 consumptionClass

```text
TechniqueConsumptionClass = small | medium | large | ultimate
```

これは技の習得難度 `learningTier` とは別概念である。小技・中技・大技・奥義の戦闘内消耗を表し、12仕様の加算値へ接続する。

- small: +3
- medium: +5
- large: +8
- ultimate: +12

`learningTier=basic` だから必ずsmall、`learningTier=secret` だから必ずultimateとは限らない。技データで明示し、実装側で推測しない。

### 4.3 priority

```text
Priority = 2 | 1 | 0 | -1
```

- `+2`: 緊急回避、強い割込み、限定的な迎撃奥義
- `+1`: 先制技、迎撃技、素早い割込み
- `0`: 通常攻撃、一般技
- `-1`: 大技、長い詠唱、溜め技

### 4.4 actionTraits `[Sprint 1暫定構造]`

```text
ActionTraits
- simultaneous
- counterOnHit
- interception
- interrupt
- defenseBreak
```

5項目は後続拡張用の予約フィールドとし、Sprint 1の技データでは必ず `false` とする。優先技・迎撃技は `priority` と通常の行動順だけで表現し、同時発動、被弾反撃、割込み連鎖、防御崩しを先行実装しない。

### 4.5 必要能力・前提熟練度

旧draftの単一数値 `requiredProficiency` は、何の熟練度と比較するか一意でなかったため使用しない。

```text
RequiredStats = Partial<Record<BaseStat, 0..100>>

TechniqueMasteryRequirement
- techniqueId
- requiredMastery: 0..100
```

- `requiredStats` は未指定能力を0として扱わず、「条件なし」とする
- `prerequisiteTechniqueMastery` はTechniqueIdごとの必要熟練度を明示する
- `prerequisiteTechniqueMastery[].techniqueId` は `prerequisiteTechniqueIds` の部分集合とする
- 必要能力充足係数は `requiredStats` の各条件に対する充足率から決定的に算出する
- 前提技の単なる習得条件と、前提技熟練度条件を混同しない

`[Sprint 1暫定]` 必要能力充足係数:

```text
requiredStatRatio(stat)
= requiredValue == 0
  ? 1
  : clamp(0, 1.4, currentValue / requiredValue)

averageRequiredStatRatio
= requiredStatsが空なら未計算
  それ以外は各requiredStatRatioの算術平均

requiredStatsFactor
= requiredStatsが空なら1.00
  averageRequiredStatRatio <= 1.00 なら
    0.70 + averageRequiredStatRatio * 0.30
  1.00を超えるなら
    min(1.20, 1.00 + (averageRequiredStatRatio - 1.00) * 0.50)
```

- 条件未達でも進捗自体は可能だが、習得完了はしない
- 条件なしは1.00
- 条件をちょうど満たす場合は1.00
- 条件超過で最大1.20まで上昇する

### 4.6 使用後の間合い変化

```text
RangeShiftAfterUse = none | approach_one | retreat_one
```

- 正本の「技使用後の間合い変化」をSprint 1から扱う
- 成功した技だけに適用する
- ダメージ・負傷判定後、行動終了前に1段階だけ適用する
- `contact` より接近、`long` より離脱はせず端でclampする
- 相手を強制移動させる技、2段階移動、位置交換は後続へ送る

## 5. 数値範囲

正本と同じ0..100系を使用する。

| 項目 | 範囲・条件 |
|---|---|
| requiredAptitude | 0..100 |
| difficulty | 0..100 |
| teachingProficiencyRequired | 0..100 |
| secrecy | 0..100 |
| power | 0..100 |
| accuracy | 0..100 |
| mentalCost | 0以上、最大精神力を超える値もデータ上は許容するが通常使用不可 |
| speedModifier | -20..20 |
| injuryModifier | -20..20 `[Sprint 1暫定]` |
| activationDifficulty | 0..100。0はほぼ不発なし、100は高難度 |

- requiredAptitude、requiredStats各値、difficulty、teachingProficiencyRequired、secrecy、power、accuracy、activationDifficulty、mentalCost、learningProgressRequiredは整数
- `difficulty`は技自体の一般的な習得難度メタデータ、`learningProgressRequired`は実際の必要進捗、`activationDifficulty`は戦闘中の発動難度であり、相互に自動換算しない
- Sprint 1ではdifficultyを週間習得式へ追加乗算せず、learningTier／learningProgressRequiredとの二重計上を避ける
- `teachingProficiencyRequired`はSprint 1の暫定教授可否へ使用する。`secrecy`はSprint 3まで範囲・永続性だけを検証し、Sprint 1の教授可否・戦闘式へ流用しない

- 通常攻撃の基本命中率は75
- 一般技の基本命中率は55..85
- 基本攻撃・基本防御の精神消費は0
- 高度な格闘・剣技・魔法は精神を消費する
- 魔法は平均的に精神消費が大きい

### 5.1 技威力 `[正本暫定値を設定化]`

| 区分 | power |
|---|---:|
| 基本攻撃 | 20 |
| 小技 | 20..35 |
| 標準技 | 36..55 |
| 上級技 | 56..75 |
| 奥義・秘伝 | 76..100 |

この区分値は `techniqueBalance.powerBands` として設定化し、ロジックへ直書きしない。

## 6. 人物側の技状態

```text
PersonTechniqueState
- techniqueId
- learningProgressTenths
- masteryHundredths
- successfulUseCount
- attemptedUseCount
- lastPracticedAbsoluteWeek
- acquiredAbsoluteWeek
```

| 項目 | 条件 |
|---|---|
| learningProgressTenths | 0..`learningProgressRequired * 10`の整数。表示値の10倍で保持 |
| masteryHundredths | 0..10000の整数。表示熟練度の100倍で保持 |
| successfulUseCount | 0以上の整数 |
| attemptedUseCount | 0以上の整数 |
| acquiredAbsoluteWeek | 未習得はnull、習得時に1回だけ設定 |

人物が保持する`PersonTechniqueState[]`はTechniqueId昇順へ正規化し、TechniqueId重複を禁止する。

### 6.1 未保持技の疎状態契約

人物は全TechniqueCatalog分のゼロ状態を事前作成せず、`PersonTechniqueState[]`を疎配列として保持する。新規runのSprint 0初期世界生成直後に実行する08仕様の初期化adapter、および新規出生人物では空配列から開始する。legacy final-worldや途中worldの継続migrationには使用しない。

- 状態を保持していない未習得技は、Plannerの候補評価中だけ`learningProgressTenths=0`、`masteryHundredths=0`、各count=0、各week=nullの仮想状態として扱う。
- 仮想状態をWorldStateまたはhash対象へ暗黙保存しない。
- 未保持技が`learningFocusTechniqueId`として確定した同じ人物更新トランザクション内で、実`PersonTechniqueState`を1件だけ作成する。
- 新規状態の初期値は`learningProgressTenths=0`、`masteryHundredths=0`、`successfulUseCount=0`、`attemptedUseCount=0`、`lastPracticedAbsoluteWeek=null`、`acquiredAbsoluteWeek=null`とする。
- 挿入後に配列をTechniqueId昇順へ再正規化し、同じTechniqueIdの既存状態があれば新規作成せず継続不能エラーとする。
- focus選択、状態作成、当週進捗加算、人物内不変条件検証は原子的にcommitする。週全体失敗時は状態作成もrollbackする。

人物は原則として同時に1つの未習得技を重点習得する。重点対象は人物側に次の1項目として保持し、各技状態へ重複保存しない。

```text
learningFocusTechniqueId: TechniqueId | null
```

`learningProgressRequired` と表中の必要進捗は表示単位であり、1..10000の整数とする。保存時の到達判定は `learningProgressTenths >= learningProgressRequired * 10` とする。

週間加算後の進捗は必ず次で上限固定する。条件未達で習得保留中でも上限を超えて蓄積しない。

```text
learningProgressTenthsAfter
= min(
    learningProgressTenthsBefore + weeklyProgressTenths,
    learningProgressRequired * 10
  )
```

## 7. 習得段階

| learningTier | 必要進捗 | 習得直後熟練度 |
|---|---:|---:|
| basic | 100 | 20 |
| standard | 180 | 15 |
| advanced | 320 | 10 |
| secret | 500 | 5 |

`learningProgressRequired` は原則として段階値と一致させる。個別技で変更する場合は `learningProgressOverrideReason` に空でない理由を必須で保持する。一致する場合はnullとする。

必要進捗へ到達しても次を満たさなければ習得完了しない。

- 必要適性
- 必要能力
- 前提技
- その他TechniqueDefinitionに明記された条件

進捗は条件待ちのまま上限値で保持する。この状態を保存フィールドではなく次の導出状態として扱う。

```text
LearningTargetDerivedStatus = progressing | acquirable | blocked_at_cap
```

- `progressing`: 必要進捗未満
- `acquirable`: 必要進捗到達済みかつ全習得条件を満たす
- `blocked_at_cap`: 必要進捗到達済みだが1件以上の習得条件を満たさない
- `blocked_at_cap`の技は10仕様のactive learning focus候補から除外する。
- 未達前提技が存在する場合、Plannerは有効な未達前提技を別のfocus候補として評価できる。
- 必要能力だけが不足する場合、Plannerは当該技を再度`learn_technique`へ選ばず、能力訓練または休養を選ぶ。
- Sprint 1で変化しない必要適性が不足する場合、その人物にとって当該技は`blocked_at_cap`かつ再選択不能とし、適性を成長可能と推測しない。後続仕様で適性変化が導入された場合だけ再評価できる。
- 人物状態が変化して全条件を満たした時点で、上限保持済みの技は再び候補となり、追加進捗RNGを消費せず習得完了判定を行う。

## 8. 週間習得進捗

```text
週間習得進捗
= 基礎10
× 系統適性係数
× 必要能力充足係数
× 学習特性係数
× 師匠伝達係数
× 師弟相性係数
× 門下人数係数
× 疲労・負傷係数
× seeded RNG係数
```

| 係数 | 範囲 |
|---|---:|
| 系統適性 | 0.60..1.40 |
| 必要能力充足 | 0.70..1.20 |
| 学習特性 | 0.70..1.30 |
| 師匠伝達 | 0.70..1.30 |
| 師弟相性 | 0.80..1.20 |
| 独学 `[Sprint 2以降予約]` | 0.40 |
| RNG | 0.90..1.10 |

- 門下人数係数、疲労係数、負傷係数は08仕様を使用する
- Sprint 1では独学の知識源生成を実装しないため、独学候補を作成しない。独学係数0.40は後続Sprint予約値であり、Sprint 1の計算へ使用しない。

```text
TechniqueLearningContext
- learningTrait: 0..100
- teachingAbility: 0..100
- compatibility: 0..100
```

- 3値は10仕様の`weekStartWorldSnapshot`から候補技・学習者・師匠の組ごとに決定的に構築する。
- upstreamに検証済み正規化値がある場合だけ使用し、対応する情報が存在しない値は中立50とする。
- PersonId、TechniqueId、表示名、配列順、乱数から値を推測しない。
- 同じ入力フィールドからの正規化規則を変更する場合はSprint 1ミニ仕様版を上げる。
- 実際に使用した3値と各変換後係数を`factorBreakdown`へ保存する。
- 習得練習1回につきRNGを1回消費する
- 進捗は浮動小数点で保存せず、`learningProgressTenths` の整数固定小数点で小数第1位まで保持する `[Sprint 1暫定]`
- 毎週の加算後に `learningProgressRequired * 10` へclampし、条件待ち期間の無制限増加を禁止する

### 8.1 Sprint 1教授可否

```text
teacherCanTeach
= activeMentorshipExists
  && masterTechniqueState.acquiredAbsoluteWeek != null
  && masterTechniqueState.masteryHundredths
     >= TechniqueDefinition.teachingProficiencyRequired * 100
```

- 師匠と弟子の有効な師弟関係は週開始World snapshotから取得する。師匠は`lifeStatus=living`かつ`participationStatus=active`を必須とし、careerStatusは有効な師弟関係が許す`active_competitor`または`retired`を認める。
- 師匠側TechniqueStateのTechniqueIdは、弟子の候補判定に使用する同一RunRuleSnapshot内のTechniqueDefinitionを参照する。PersonTechniqueState自体へdataVersionを重複保存せず、RunRuleSnapshotのTechniqueCatalog dataVersionで一意に固定する。
- `teachingProficiencyRequired=0`でも師匠自身の習得済み状態を必須とし、未習得技を教授できない。
- 師匠の状態が欠落、不正、未習得、熟練度不足の場合は`teacherCanTeach=false`とし、値を推測しない。
- Sprint 1の未習得技候補は`teacherCanTeach=true`だけを許可する。独学は候補に含めない。
- Sprint 1の教授可否は師匠の週間行動を消費しない静的な mentorship availability として扱う。師匠が明示的に`teach`行動を選ぶ仕組み、指導人数配分、教授拒否はSprint 3で追加する。

## 9. 熟練度

正本の暫定値を使用する。

| 行動 | 熟練度上昇 |
|---|---:|
| 専用反復 | 1.5／週 |
| 関連能力の通常修行 | 0.5／週 |
| 公式戦で使用成功 | 0.2 |
| 公式戦で使用失敗 | 0.1 |

- 熟練度の表示範囲は0..100。保存値は `masteryHundredths=0..10000` の整数とする
- 0.01は`masteryHundredths`の1、0.1は10、0.2は20、1.5は150として加算する
- 現在値係数を掛ける
- 80以降は大きく鈍化させる

`[Sprint 1暫定]` 熟練度現在値係数:

| mastery | 係数 |
|---|---:|
| 0..39 | 1.00 |
| 40..59 | 0.80 |
| 60..79 | 0.55 |
| 80..89 | 0.25 |
| 90..100 | 0.10 |

設定キー `techniqueLearning.masteryCurrentValueFactors` で管理する。

### 9.1 専用反復のRNG係数

`practice_technique` の専用反復だけ、10仕様で予約された効果係数RNGを使用する。

```text
DedicatedPracticeGainHundredths
= floor(
    techniqueLearning.masteryGainHundredths.dedicatedPractice
    * masteryCurrentValueFactor
    * masteryPracticeRngFactor
  )
```

- `masteryPracticeRngFactor` は `techniqueLearning.masteryPracticeRngFactorRange=0.90..1.10` から1回取得する
- 専用反復が確定した後は、熟練度100到達等で実増分が0でもRNGを1回消費する
- 関連能力の通常修行、公式戦、模擬戦の熟練度上昇には追加RNGを使用しない
- 進捗・熟練度更新は整数固定小数点でfloorし、浮動小数点値を保存しない

### 9.2 関連能力の通常修行

`train_stat` が選ばれた場合、習得済み技のうち `primaryStats` に対象能力を含む技だけを候補とする。

- 候補が0件なら通常修行熟練度は発生しない
- 候補が1件以上なら、表示熟練度が最も低い技を1件だけ選ぶ
- 同値の場合はTechniqueId昇順で決め、RNGを使用しない
- 選ばれた技へ `masteryHundredths +50`（表示+0.5）を適用し、現在値係数を掛ける
- 能力成長と熟練度更新は10仕様の同じ人物更新トランザクションでcommitする


## 10. 発動安定性用データ

- `activationDifficulty` は技を正しく発動できる難しさを表し、習得難度 `difficulty` とは別に保持する
- 基本攻撃、基本防御、移動、回避、精神を整える、降参は発動判定を行わない
- `use_technique` は精神消費後、命中判定前に12仕様の発動安定性判定を行う
- 不発時は命中・ダメージ・負傷・使用後間合い変化を行わないが、試行回数、精神消費、戦闘内消耗は記録する
- 暴発・対象誤認・自傷はSprint 1では実装せず、後続仕様へ送る

## 11. 基本行動

技を未習得でも戦闘可能とする。

- `basic_attack(profile)`
- `basic_defense`
- `approach`
- `retreat`
- `evade`
- `focus_mind`
- `surrender`

### 11.1 基本攻撃プロファイル

```text
BasicAttackProfile = unarmed | sword | magic
```

正本の「各系統が精神切れでも使用できる無消費攻撃」を満たすため、3系統の組込みプロファイルを持つ。

| profile | primaryStats | usableRanges | preferredRanges | power | accuracy | mentalCost |
|---|---|---|---|---:|---:|---:|
| unarmed | strength, skill | contact, close | contact, close | 20 | 75 | 0 |
| sword | skill, strength | close, middle | close | 20 | 75 | 0 |
| magic | magic, spirit | middle, long | long | 20 | 75 | 0 |

共通:

- requiredAptitude=0
- difficulty=0
- priority=0
- speedModifier=0
- rangeShiftAfterUse=none
- injuryModifier=0
- activationDifficultyは持たず、発動判定対象外
- 人物の習得技状態を持たない
- 有効熟練度50を使用する
- 熟練度・使用回数の成長対象外
- 基本防御も精神消費0

Sprint 1では装備システムを扱わないため、3プロファイルは戦闘参加条件を満たす人物が選択可能とする。DefaultBattleStrategyは期待値を比較して1つを選び、人物の最高手段を固定的にunarmedへ寄せない。

## 12. 使用可能条件

技は次をすべて満たす場合のみ選択可能。

- 習得済み
- 必要適性を満たす
- `requiredStats` の全条件を満たす
- `prerequisiteTechniqueIds` をすべて習得済み
- `prerequisiteTechniqueMastery` の全条件を満たす
- 現在間合いが `usableRanges` に含まれる
- 現在精神力が12仕様で算出した `effectiveMentalCost` 以上
- 疲労・負傷により続行不能でない
- TechniqueDefinitionが有効なdataVersionに属する

不正選択は隠さず詳細ログへ記録し、決定的に `basic_defense` へ置換する。降参条件を満たす明示入力は置換しない。

## 13. 技データ不変条件

- TechniqueDefinitionのTechniqueId一意
- 人物ごとのPersonTechniqueState TechniqueId一意・TechniqueId昇順
- name空文字不可
- categoryは3系統のみ
- primaryStatsは1件以上、重複なし。canonical順は`stamina < strength < skill < speed < spirit < magic`
- usableRangesは1件以上、重複なし。canonical順は`contact < close < middle < long`
- preferredRangesはusableRangesの部分集合で、usableRangesと同じ間合い順へ正規化
- rangeShiftAfterUseは3値のいずれか
- requiredStatsのキー重複なし、値は0..100
- prerequisiteTechniqueMasteryのTechniqueId重複なし
- prerequisiteTechniqueMasteryはprerequisiteTechniqueIdsの部分集合
- prerequisiteTechniqueIdsに自己参照なし
- 前提技参照に循環なし
- sourceTechniqueIdsに自己参照なし
- 派生元参照に循環なし
- prerequisiteTechniqueIdsとsourceTechniqueIdsの全参照TechniqueIdが存在
- consumptionClassは4値のいずれか
- learningProgressRequiredは1..10000の整数
- learningProgressTenthsは0..learningProgressRequired*10
- 未保持技の仮想0状態、focus確定時の原子的状態作成、TechniqueId昇順挿入
- learningTierと標準必要進捗が異なる場合はlearningProgressOverrideReasonが必須。一致する場合はnull
- activationDifficultyは0..100
- 整数指定項目へ小数を許可しない
- difficultyを学習進捗へ追加適用しない
- teachingProficiencyRequiredをSprint 1教授可否だけへ使用し、secrecyをSprint 1計算へ使用しない
- 同じdataVersionで同じTechniqueIdの内容は不変
- prerequisiteTechniqueIds／sourceTechniqueIdsはTechniqueId昇順、prerequisiteTechniqueMasteryはtechniqueId昇順、tagsはUnicode code point昇順でcanonical化する

## 14. イベント

- `technique.learning_progressed`
- `technique.acquired`
- `technique.mastery_increased`

最低限含める。

- personId
- techniqueId
- before
- after
- delta
- unit（習得進捗は`tenths`、熟練度は`hundredths`）
- absoluteWeek
- reason
- factorBreakdown

## 15. 必須テスト

- 4間合い
- 各learningTierの進捗と初期熟練度
- 条件待ちで進捗保持
- Sprint 1で独学候補0件、予約係数0.40は未使用
- 師匠ありの係数境界
- 熟練度80以降の鈍化
- unarmed／sword／magicの3基本攻撃が精神消費0で使用可能
- basic_attack(profile)が熟練度状態を持たないこと
- requiredStatsFactorの空条件・未達・ちょうど達成・超過境界
- prerequisiteTechniqueMasteryの境界
- learningTierとconsumptionClassを独立して扱うこと
- learningProgressOverrideReasonの必須／null境界
- activationDifficultyの0／100境界
- rangeShiftAfterUseのnone／approach_one／retreat_one
- 不足精神・不正間合い・未習得技の拒否
- 前提技循環検出
- 派生元循環検出
- 習得進捗tenths・熟練度hundredthsの加算と上限
- 未保持技の仮想0評価、focus確定時の原子的状態作成、TechniqueId昇順挿入
- teacherCanTeachの有効師弟関係・師匠習得済み・熟練閾値境界
- same seed一致

## 16. 後続Sprintへ送る事項

- 正式な技一覧・名称
- 師匠が教える技の自律判断
- 独自技研究・派生技生成
- 技の失伝
- 複合系統技
- 2段階以上の移動、相手強制移動、位置交換
- 流派固有技の公開範囲

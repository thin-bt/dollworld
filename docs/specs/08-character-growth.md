# 08 人物能力・成長仕様

- 仕様版: `S1-SPEC-0.1.20`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 人物能力、遺伝値、適性、週間成長、一時状態
- 非対象: 出生時の遺伝生成、師匠選択、独自技、恒久的な加齢衰退、引退判断

## 1. 目的

Sprint 0で定義済みの人物能力型を変更せず、週次成長と戦闘へ接続する。

本書は `docs/SPEC.md` の以下を実装用に抜粋・構造化したものである。

- 能力・素質・成長設計
- 能力値の数値仕様（仮）
- 表面能力と潜在遺伝値
- 各基礎能力の具体的な影響
- 能力の成長・全盛期・衰え
- 週間修行の成長計算（暫定）

正本と本書が矛盾する場合は実装を止め、本書を修正する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とし、実装側で別構造を作らない。

## 2. 既存型を維持する項目

### 2.1 基礎能力

```text
BaseStat =
  stamina
  | strength
  | skill
  | speed
  | spirit
  | magic
```

`BaseStat`はSprint 0公開型`AbilityKey`と同一とする。`vitality`や`technique`を基礎能力キーとして使用しない。

### 2.2 系統適性

```text
DomainAptitude =
  unarmed
  | sword
  | magic
```

`DomainAptitude`はSprint 0公開型`AptitudeKey`、および09仕様の`TechniqueCategory`／`BasicAttackProfile`、流派主系統と同一キーとする。`martial`は使用せず、暗黙の別名対応も設けない。

### 2.3 能力値の3層

各基礎能力と各系統適性は、Sprint 0で定義済みの次の構造を使用する。

- 表面能力値
- 顕在遺伝値
- 潜在遺伝値

潜在遺伝値を本人の現在能力へ直接加算しない。

## 3. 数値範囲

| 項目 | 範囲 | 備考 |
|---|---:|---|
| 表面能力値 | 0..100 | 画面表示は整数 |
| 顕在遺伝値 | 0..100 | 原則非公開 |
| 潜在遺伝値 | 0..100 | 原則非公開 |
| 系統適性 | 0..100 | 習得速度と実戦発揮率へ使用 |
| 成長素質 | 0..100 | 50を標準とする |
| 疲労 | 0..100 | 高いほど不利 |
| 負傷度 | 0..100 | 高いほど不利 |
| 調子 | -20..20 | 短期的な好不調 |
| 自信 | -20..20 | 心理状態 |
| 現在精神力 | 0..最大精神力 | 戦闘で消費し、休養・週進行で回復する一時状態 |

### 3.1 内部端数

正本どおり、表示値と内部成長値を分ける。

Sprint 1では、既存の表面能力値を整数のまま維持し、人物別・能力別に次を追加する。

```text
StatGrowthRemainder
- stat
- milliPoints: 0..999
```

- `1000 milliPoints = 表面能力値1`
- 週次成長はmilliPointsで計算する
- 1000以上になった分だけ表面能力値へ加算する
- 残りを次週へ持ち越す
- 既存 `StatValueTriple` の意味を変更しない

この固定小数点1000倍は `[Sprint 1暫定]` であり、型付き設定またはバージョン固定定数として管理する。

## 4. 年齢と成長

### 4.1 公式な修行開始年齢

- 0〜7歳: 正式な入門・修行を行わない
- 8歳以上: 修行可能
- 16歳: 正式デビュー
- 41歳: 現役として参加できる最終年齢
- 42歳到達時: 年初処理で強制的に`retired`へ遷移

### 4.2 年齢係数

成長型は `early | normal | late` の3種とし、Sprint 1では年齢帯境界を移動させず、各帯の係数を型付き設定で固定する。

| 年齢 | early | normal | late |
|---|---:|---:|---:|
| 0〜7 | 0.00 | 0.00 | 0.00 |
| 8〜11 | 0.90 | 0.80 | 0.70 |
| 12〜15 | 1.10 | 1.00 | 0.90 |
| 16〜20 | 1.15 | 1.15 | 1.05 |
| 21〜27 | 0.90 | 1.00 | 1.10 |
| 28〜34 | 0.65 | 0.75 | 0.85 |
| 35〜41 | 0.35 | 0.45 | 0.55 |
| 42以上 | 0.00 | 0.00 | 0.00 |

- `normal` は正本の基準係数と一致する
- `early` と `late` は `[Sprint 1暫定]` であり、ピークの早遅だけを表し、成長上限や寿命を変更しない
- 標準World処理では41歳の世界年を現役最終年として扱い、42歳到達時の4月第1週年初処理で強制的に`retired`へ遷移する。42歳以上は週間Plannerの正式訓練・公式戦対象外とし、成長係数は0とする
- Sprint 1では恒久的な加齢低下を実装しない

## 5. 週間能力成長

```text
週間能力成長
= 修行別基礎成長
× 成長素質係数
× 年齢係数
× 現在値係数
× 師匠係数
× 門下人数係数
× 疲労係数
× 負傷係数
× 意欲・調子係数
× seeded RNG係数
```

### 5.1 正本で固定済みの係数

| 係数 | 値 |
|---|---|
| 成長素質 | 0.65..1.35。50を1.00。整数式は§5.1.1 |
| 現在値0〜39 | 1.15 |
| 現在値40〜59 | 1.00 |
| 現在値60〜74 | 0.75 |
| 現在値75〜89 | 0.45 |
| 現在値90以上 | 0.20 |
| 正式師匠なし・資格なし親 | 0.75 |
| 平均的師匠 | 1.00 |
| 良師 | 1.10 |
| 名指導者 | 1.20 |
| 時代屈指 | 1.30 |
| 門下1〜3人 | 1.00 |
| 門下4〜6人 | 0.92 |
| 門下7〜10人 | 0.82 |
| 門下11〜20人 | 0.70 |
| 門下21〜40人 | 0.55 |
| 門下41人以上 | 0.40 |
| 疲労0〜20 | 1.00 |
| 疲労21〜40 | 0.90 |
| 疲労41〜60 | 0.70 |
| 疲労61〜80 | 0.40 |
| 疲労81以上 | 0.15 |
| 負傷なし | 1.00 |
| 軽傷 | 0.85 |
| 中傷 | 0.55 |
| 重傷 | 0.20 |
| 意欲・調子 | 0.80..1.15 |
| RNG | 0.90..1.10 |

#### 5.1.1 成長素質係数（BasisPoints）

```text
growthPotentialFactorBasisPoints
= potentialMinimumFactorBasisPoints
  + floor(
      growthPotential
      * (
          potentialMaximumFactorBasisPoints
          - potentialMinimumFactorBasisPoints
        )
      / 100
    )
```

境界:

| growthPotential | growthPotentialFactorBasisPoints |
|---:|---:|
| 0 | 6500 |
| 50 | 10000 |
| 100 | 13500 |

- `growthPotential`はinteger `0..100`
- 範囲外・小数は拒否する
- `potentialMinimumFactorBasisPoints`／`potentialMaximumFactorBasisPoints`は14仕様`growth.potentialMinimumFactor`／`potentialMaximumFactor`をnormalizedした値（既定6500／13500）

### 5.2 修行別基礎成長 `[Sprint 1暫定]`

能力訓練1回の対象能力に対する基礎成長を `500 milliPoints` とする。

- 1回で表面値0.5相当
- 複数BasisPoints係数は§5.3の`multiplyBasisPointsFloor`で最終1回だけfloorする。factorごとのsequential floorは禁止
- 0未満にしない
- 100到達後は加算しない
- 値は `growth.baseMilliPointsPerTraining` として設定化する

関連能力へ副次成長を与える場合は別タスクとし、Sprint 1初期実装では対象能力1つだけを更新する。

### 5.3 複数BasisPoints係数の積（共通数学契約）

能力成長・技習得進捗・熟練度増分で共有する。09／14も同じ契約を参照する。

```text
multiplyBasisPointsFloor(baseInteger, factors)
= floor(
    baseInteger
    * product(factors)
    / 10000 ^ factors.length
  )
```

- `baseInteger`はsafe integer 0以上
- 全factorはsafe integer 0以上のBasisPoints
- 全factorを掛けた正確な有理数へ最後に1回だけfloorする
- factorごとのsequential floorは禁止
- Numberのunsafe integerへ到達する単純乗算は禁止
- 内部BigIntまたは同値の正確な整数演算を使用可能
- BigIntをJSON、canonical値、public保存値へ出力しない
- 最終結果がsafe integerを超える場合はfailure

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

各factorはnormalized BasisPoints（例: 1.00 → 10000）。

固定テスト:

```text
base=500
factors=[6500, 9000, 11500]

final-floor result = 336
sequential-floor result = 335

正式結果は336
```

### 5.4 効果RNG係数の生成（共通契約）

能力成長のRNG係数は、normalized BasisPointsの整数範囲から一様に取得する。

```text
drawInclusiveBasisPoints(rng, minimumBp, maximumBp)
= rng.nextInt(minimumBp, maximumBp + 1)
```

Sprint 1既定（`growth.rngMinimumFactor`／`rngMaximumFactor`をnormalized）:

```text
minimumBp = 9000
maximumBp = 11000
```

したがって9000〜11000の2001整数値を両端含みで取得する。

禁止:

- `nextFloat`による補間
- 11000へ到達しない半開区間
- 90〜110の整数％だけを取得して100倍する方式
- `Math.round`
- modulo

「RNGを1回消費する」は、公開RNG APIの`nextInt`を1回呼ぶことを意味する。`nextInt`内部のrejection samplingによる`nextUint32`消費数はRNG状態の正式結果として扱い、固定1回のuint32消費とは定義しない。

技習得進捗・専用反復熟練度のRNG係数も同じ契約を使う（09仕様）。

## 6. 一時状態

### 6.1 疲労・負傷・調子・自信・現在精神力

正本の範囲を維持し、人物基本能力・遺伝値とは分離する。

最大精神力は戦闘開始時に `50 + spirit` で導出し、人物はその範囲内の `currentMental` を一時状態として保持する。戦闘開始のたびに自動で全回復させない。休養・週進行での回復量は型付き設定から受け取る。


### 6.2 Sprint 1人物状態の初期化adapter・resume

Sprint 1で永続化する人物追加状態を次へ固定する。物理的なTypeScript配置は既存Person公開型との統合監査で決めるが、保存JSON上の論理構造と初期値は変更しない。

```text
Sprint1PersonState
- sprint1StateSchemaVersion: "0.1.0"
- currentMental: integer 0..(50 + spirit)
- techniqueStates: PersonTechniqueState[]
- learningFocusTechniqueId: TechniqueId | null
```

新規Sprint 1 runで通常のSprint 0初期世界生成結果へ初めてSprint 1状態を付与する時、および新規出生人物では次を使用する。

```text
currentMental = 50 + spirit
techniqueStates = []
learningFocusTechniqueId = null
```

- 初期化はRNGを消費せず、EventEnvelopeを生成しない。
- `techniqueStates`は09仕様の疎配列とし、全TechniqueCatalog分のゼロ状態を作成しない。
- `attachSprint1PersonStateToInitialWorld`は新規runの通常初期世界生成直後・最初の週処理前に1回だけ実行する。archived final-worldや途中checkpointを新run入力へ変換する用途には使用しない。
- 初期化adapter実行時に能力値、spirit、PersonId、lifeStatus等の必須値が不正または欠落している場合は失敗し、0や中立値で補完しない。
- deceased／waiting／stoppedにも保存構造は付与するが、10仕様どおり週次更新しない。
- 既存のSprint 1状態がある人物へ再初期化を行わない。runtime resumeは同じsimulationIdに属するcheckpoint値を完全復元し、schemaVersion不一致は専用migrationなしに読まない。Sprint 1のfinal-worldまたは途中worldを別の新規runの初期入力として継続利用する機能は本Sprintの対象外とし、暗黙変換・暗黙再採番を拒否する。
- `sprint1StateSchemaVersion`、`currentMental`、`techniqueStates`、`learningFocusTechniqueId`はinitial-world／final-worldのcanonical JSONとworld hash対象へ含める。

### 6.3 負傷度から負傷段階への変換 `[Sprint 1暫定]`

08・09・10で使用する負傷係数は数値の負傷度から一意に導出する。

| 負傷度 | 負傷段階 | 成長係数 |
|---:|---|---:|
| 0 | none | 1.00 |
| 1..24 | light | 0.85 |
| 25..59 | medium | 0.55 |
| 60..100 | severe | 0.20 |

境界は `temporaryCondition.injuryBands` として設定化する。段階を別の永続値として重複保存せず、負傷度から導出する。

### 6.4 週次増減 `[Sprint 1暫定]`

| 行動 | 疲労変化 | 調子変化 |
|---|---:|---:|
| 能力訓練 | +8 | 0 |
| 技習得練習 | +7 | 0 |
| 技熟練練習 | +6 | 0 |
| 休養 | -18 | +2（上限20） |
| inactive | 0 | 0 |

- `inactive` は `deceased`、`waiting`、`stopped` を含み、疲労・負傷・調子・自信・現在精神力を一切更新しない
- 重傷時は原則休養（10仕様の`WeeklyForcedRestReason.severe_injury`）
- 疲労81以上は強制休養候補（10仕様の`WeeklyForcedRestReason.fatigue_threshold`。閾値は`temporaryCondition.forcedRestFatigueThreshold`）
- `battle.injury.unableToContinueThreshold`は戦闘中の続行不能判定専用であり、週間強制休養へ使用しない
- 週次増減は設定化する
- 自信は戦闘結果・大会結果で更新し、通常訓練では変更しない
- 休養時の現在精神力回復量は `temporaryCondition.restMentalRecovery=20` とする `[Sprint 1暫定]`
- 休養時の負傷回復量は `temporaryCondition.restInjuryRecovery=5` とする `[Sprint 1暫定]`
- 詳細な治癒期間、部位別負傷、治療行動は後続タスクへ分離する

## 7. 戦闘開始時の能力スナップショット

戦闘開始時に表面能力値と一時状態から決定的なスナップショットを作る。

- 戦闘中に人物の恒久能力値を直接変更しない
- 戦闘途中で人物レコードを再参照しない
- 疲労、負傷、調子による開始時補正を適用する
- 補正式は11仕様の型付き設定を使用する

## 8. RNGと処理順

- `Math.random()`は禁止
- 人物処理順は `PersonId` 昇順
- 同一人物内の能力候補順は基礎能力の固定順
- RNG係数は訓練適用1件につき1回（§5.4の`drawInclusiveBasisPoints`）
- 分岐で成長量が0となる場合も、対象訓練が確定済みならRNGを1回消費する
- 同一入力・同一RNG状態で完全一致する

## 9. 入力・出力

### 入力

```text
GrowthInput
- person
- targetStat
- worldDate
- growthPotential
- ageProfile
- teacherContext
- discipleCount
- motivationFactor
- rngState
- growthConfig
```

`trainingBaseMilliPoints` は入力へ重複保持しない。基礎成長値は常に `growthConfig.baseMilliPointsPerTraining` を参照する。同じ意味の値を人物別入力や呼出引数から上書きする実装は禁止する。

`motivationFactor`（意欲・調子係数）:

- 必須入力
- normalized BasisPointsで`8000..11500`
- 人物の`condition`／`confidence`からS01-004内部で導出しない
- 欠落時に`10000`を補完しない
- 導出adapterは別仕様が追加されるまでS01-004対象外

### 出力

```text
GrowthResult
- updatedPerson
- updatedRemainder
- appliedMilliPoints
- surfacedPointGain
- factorBreakdown
- nextRngState
- events
- validation
```

## 10. イベント

08は能力成長と一時状態変化の効果イベントだけを定義する。週間行動選択イベントは10仕様の責務とし、重複生成しない。

- `training.stat_growth_applied`
- `training.condition_updated`
- `training.forced_rest_applied`
- `training.rest_applied`

責務:

- `training.forced_rest_applied`: 強制理由だけを記録し、状態deltaを重複保持しない
- `training.rest_applied`: 休養による疲労・調子・現在精神力・負傷回復の実deltaを記録
- `training.condition_updated`: 休養以外の週次一時状態変化だけを記録

イベント共通項目:

- personId
- worldDate
- event reason
- RNG消費位置を追跡できる情報。RNGを使用しないイベントはnull

イベント別payload:

- `training.stat_growth_applied`: targetStat、before、after、remainderBefore、remainderAfter、appliedMilliPoints、factorBreakdown
- `training.condition_updated`: fatigue／injury／condition／confidence／currentMentalの各before・after・delta
- `training.forced_rest_applied`: forcedReasonのみ。型は10仕様の`WeeklyForcedRestReason`。状態deltaは含めない
- `training.rest_applied`: fatigue／injury／condition／currentMentalの各before・after・delta

休養イベントへtargetStatや成長端数を必須化しない。未使用キーをnullで大量に埋めず、event typeごとに固定payload schemaを持つ。

## 11. 不変条件

- 公開能力値、顕在遺伝値、潜在遺伝値、適性は0..100
- 疲労、負傷度は0..100
- 調子、自信は-20..20
- `milliPoints` は0..999
- `currentMental` は0..`50 + spirit`
- `sprint1StateSchemaVersion`は`0.1.0`
- `techniqueStates`はTechniqueId昇順・重複なし
- legacy personの暗黙初期化禁止
- 潜在遺伝値を本人の成長へ直接加算しない
- 成長処理で表面能力値を低下させない
- 表面能力値は100を超えない
- 0〜7歳は正式訓練対象外
- `deceased`、`waiting`、`stopped` は週次更新そのものの対象外
- 入力オブジェクトを変更しない
- 同一seed・同一入力で完全一致する

## 12. 必須テスト

- 正本の年齢係数全境界
- 現在値係数全境界
- 師匠係数全段階
- 門下人数係数全境界
- 疲労係数全境界
- 負傷係数全段階
- RNG係数0.90／1.10境界（`drawInclusiveBasisPoints`で9000／11000両端）
- `multiplyBasisPointsFloor`固定テスト（final-floor 336、sequential 335は正式結果にしない）
- 端数持越し
- 表面値100で成長停止
- 0〜7歳の正式訓練除外
- 41歳は現役参加可能、42歳到達時にretiredへ遷移し、42歳以上は正式訓練・公式戦対象外
- 新規runの初回付与／新規出生人物のSprint1PersonState初期値一致
- 初期world adapterがRNG・イベントを消費せず、入力worldを変更しない
- 同じsimulationIdのruntime resumeでcurrentMental・技状態を再初期化しない
- 既存Sprint 1状態への二重初期化拒否
- deceased、waiting、stoppedの完全非更新
- 入力不変
- same seed一致、different seed差分

## 13. 後続Sprintへ送る事項

- 出生時の遺伝生成
- 恒久的な能力衰退
- 詳細な負傷回復
- 師匠の指導能力算出
- 複数能力を同時に伸ばす修行メニュー

# 02 初期設定スキーマ・検証ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`
- 設定スキーマバージョン：`0.2.3`

## 1. 目的

`config/initial-world.config.json`のキー、型、範囲、整合条件を固定し、暫定値をロジックへ直書きしない。

## 2. ルート構造

```text
schemaVersion
profileId
purpose
world
population
history
relationships
families
lineages
abilities
nameData
simulation
validationTargets
performanceTargets
```

設定にない既定値をコード側で補わない。不正時は生成を開始しない。未知キーもエラーとする。

## 3. 固定世界設定

`world`：

- `startYear=1`
- `startMonth=4`
- `startWeekOfMonth=1`
- `weeksPerMonth=4`
- `monthsPerYear=12`
- `birthMonth=4`
- `birthWeekOfMonth=1`

人物別出生週は存在しない。固定値変更はゲーム仕様変更。

## 4. 人口

- `totalLiving`：1以上
- `initialUserFounderCount`：0以上、totalLiving以下
- `sexRatioMale`：0〜1
- `ageBands`：重複しない整数年齢帯
- `activeRankDistribution`：F〜Sの非負整数

基準年齢帯：0〜7、8〜15、16〜41、42〜70。

- 年齢帯件数合計 = totalLiving
- activeRankDistribution合計 = 16〜41歳人数
- 16歳未満、42歳以上には`currentRank`を付けない
- 各年齢帯ごとに男性人数を`floor(ageBand.count * sexRatioMale)`、女性人数を残数とする。全帯合計も同規則の結果と一致させる

## 5. 初期履歴

`history`：

- `initialDeceasedAncestors`：0以上
- `minimumGenerationDepth`：1以上
- `maximumGenerationDepth`：minimum以上、基準3
- `earliestHistoricalYear`：0以下。死亡済み祖先の`birthYear`下限
- `minimumAgeAtDeath`：18以上
- `maximumAgeAtDeath`：minimum以上、基準90
- `createExistingRelationships`：基準true
- `createPastTournamentHistory`：基準false

死亡済み祖先は存命人口に含めない。

## 6. 関係

`relationships`の割合は目標値であり、整合性制約による丸めを許容する。目標と実績を出力する。

- `knownParentCoverage`：0〜1。存命人物のうち、少なくとも1名の生物学的親が既知である人物割合
- `twoKnownParentsCoverageAmongCovered`：0〜1。親既知対象のうち、2名とも既知にする人物割合
- `retiredSpouseCoverage`：0〜1。存命引退者のうち、現在配偶者を持つ人物割合
- `formalMasterCoverageAge8To41`：0〜1。存命・活動中・8〜41歳のうち、正式師匠を持つ人物割合
- `minimumParentAgeAtChildbirth`：18以上
- `maximumBiologicalParents=2`

正式師匠は存命・引退済み・資格あり。割合から人数を作る際は小数点以下を切り捨てる。ただし配偶者対象人数は切り捨て後さらに直近の小さい偶数へ丸め、ID順に決定的にペア化する。

## 7. 家系・流派の実現可能性

- `families`の人数は初期スナップショットに所属する存命・死亡済み人物の合計。
- `initialFamilyCount * minimumMembersPerFamily <= totalLiving + initialDeceasedAncestors`。
- `totalLiving + initialDeceasedAncestors <= initialFamilyCount * maximumMembersPerFamily`。
- 家名候補数は`initialFamilyCount`以上。
- `initialLineageCount <= initialFamilyCount`。初期流派は異なる創始家系を使う。
- `initialQualifiedMasters`は存命引退者数以下。
- 存命引退者へ現役ランク比率を最大剰余法で按分したとき、C以上の履歴枠数が`initialQualifiedMasters`以上である。基準設定では履歴ランクがF57、E45、D33、C25、B12、A6、S2となり、C以上45人を全員資格者にできる。
- 最大剰余法は浮動小数ではなく、各キーについて`base=floor(weight*targetCount/weightSum)`、`remainder=(weight*targetCount)%weightSum`を整数演算で求める。余剰枠はremainder降順、同値時は固定キー順で配る。
- 初期主系統重みは`unarmed`、`sword`、`magic`だけを持ち、合計は許容誤差内で1。

## 8. 能力

- `minimum=0`、`maximum=100`
- `initialSurfaceValueRange`
- `initialGeneticValueRange`
- `initialAptitudeRange`
- `initialAptitudeGeneticValueRange`

すべて0〜100内。Sprint 0では00ミニ仕様の固定キーについて生成・範囲検証のみ。

## 9. 名前データ

`nameData`：

- `manifestPath`
- `requiredVersion`
- `neutralGivenNameProbability`：0〜1
- `familyNameSelection=without_replacement`
- `avoidDuplicateLivingFullNameWithinFamily=true`
- `displayFormat={givenName}・{familyName}`

manifest不整合時は生成中止。

## 10. シミュレーション・検証・性能

`simulation`：

- `defaultSeed`：0〜4294967295の整数
- `rngAlgorithm=xoshiro128ss-v1`
- `defaultYears`：1以上の整数
- `benchmarkYears`：1以上の整数配列、重複なし
- `emitWeeklyEvents`：boolean。falseの場合も意味のあるイベントは出力するが、空週イベントは作らない

`validationTargets`：人口差、壊れた参照、同シード一致、異シード差異。

`performanceTargets`：600人・100年30秒、2,000人・100年120秒を警告基準、5,000人は計測のみ。性能超過はSprint 0の機能失敗にしない。

## 11. 設定ハッシュ

- 正規化JSONからSHA-256を生成。
- オブジェクトキーをUnicodeコードポイント順で再帰的に並べ、配列順は保持し、余分な空白なしのUTF-8 JSONへ変換してSHA-256を計算する。
- 数値はJSONの有限数だけを許可し、`-0`は`0`へ正規化する。
- `schemaVersion`、`profileId`、`configHash`を出力へ保存。

## 12. Sprint 1 SimulationIdentity

Sprint 1以降に開始する新規runでは、設定ハッシュ・seed・仕様版に加え、Sprint 1の決定的ルール入力を含む`SimulationIdentity`から`simulationId`を生成する。Sprint 1仕様版は`S1-SPEC-0.1.14`。旧`S1-SPEC-0.1.13`を新規runの現行Sprint 1 identityとして受理しない。Sprint 0で生成済みの旧`simulationId`を再計算して置換しない。

```text
SimulationIdentity
- schemaVersion: "0.3.0"
- seed
- initialWorldConfigHash
- sprint1ConfigHash
- techniqueCatalogHash
- battleProfileAdapterVersion
- matchIdGeneratorVersion
- initialMatchIdGeneratorStateHash
- defaultBattleStrategyVersion
- specVersions:
    - { specSetId: "main", version: "SPEC-0.1.2" }
    - { specSetId: "sprint0", version: "S0-SPEC-0.1.5" }
    - { specSetId: "sprint1", version: "S1-SPEC-0.1.14" }
- rngAlgorithmVersion
- canonicalJsonVersion
- hashAlgorithm: "SHA-256"
```

- `specVersions`は`specSetId`昇順へcanonical正規化する。
- `seed`はrunへ渡された決定的seedそのものを使用し、派生seedやexecutionIdを使用しない。
- `initialWorldConfigHash`、`sprint1ConfigHash`、`techniqueCatalogHash`は各完全内容のcanonical JSON SHA-256と一致必須。
- `battleProfileAdapterVersion`は11仕様の人物正規化adapter版と一致必須。
- `matchIdGeneratorVersion`は00ミニ仕様の決定的MatchId生成器版（Sprint 1初期値`match-id-generator-0.1.0`）と一致必須。
- `initialMatchIdGeneratorStateHash`はfresh runのseed・generatorVersion・固定namespace `"match"`から生成した初期`MatchIdGeneratorState`（schemaVersion `0.1.0`、`nextSequence=1`）のcanonical JSON SHA-256と一致必須。任意の現在nextSequenceや途中stateを初期値として注入しない。任意状態から開始するresume runは保存済みruntime checkpointを使用し、新しいSimulationIdentityを作り直さない。
- `defaultBattleStrategyVersion`は12仕様の標準Strategy実装版と一致必須。標準runでscripted actionsを使用しない。
- `rngAlgorithmVersion`は07仕様の実装版文字列と一致必須。
- `canonicalJsonVersion`は実際にhash算出へ使用するcanonical JSON実装版と一致必須。
- `hashAlgorithm`はSprint 1では`SHA-256`へ固定し、別名や暗黙既定値を許可しない。
- 現実時刻、executionId、Git commit、OS、Node、パス、処理時間、メモリは含めない。
- MatchId文字列そのもの、現在の`nextSequence`、途中のgenerator state hashをSimulationIdentity材料へ含めない。
- seedが異なれば初期MatchIdGeneratorState本文・`initialMatchIdGeneratorStateHash`・SimulationIdentity hash・simulationIdが差分する。同じseedと各identity入力ならこれらは一致する。
- 異なるrunでは同じMatchId文字列（例: `match_000000000001`）を許可する。seedはMatchId文字列へ混ぜない。

生成順序:

```text
simulationIdentityHash
= SHA-256(canonicalJson(SimulationIdentity))

simulationId
= existingSimulationIdFactory(simulationIdentityHash)
```

1. 初期世界設定、Sprint1Config、TechniqueCatalogを検証する。
2. seed、matchIdGeneratorVersion、固定namespaceからfresh run用の初期MatchIdGeneratorStateを生成し、`initialMatchIdGeneratorStateHash`を算出する。
3. 各設定・カタログhashを算出する。
4. `SimulationIdentity`をcanonical化して`simulationIdentityHash`を算出する。
5. 既存のSimulationId branded constructor／factoryへhashを渡し、`simulationId`を生成する。
6. `simulationId`生成後に11仕様のRunRuleSnapshotを構築する。
7. 最後に`runRuleSnapshotHash`を算出する。

`runRuleSnapshotHash`をsimulationId生成入力へ含めない。RunRuleSnapshotはsimulationIdを含むため、含めると循環依存になる。

保存と検証:

- `run-metadata.json`へ`simulationIdentity`全文と`simulationIdentityHash`を1件保存する。
- `initial-world.json.runRuleSnapshot.simulationIdentityHash`とrun-metadataの値を一致させる。
- EventEnvelope、BattleState、BattleResultの`simulationId`は同じ値を使用する。
- 同じSimulationIdentityでsimulationIdが全文一致することを必須とする。
- いずれかの決定的入力が異なる場合、simulationIdも異なることを必須とする。
- 同じversion文字列でcanonical内容またはhashが異なる入力を拒否する。

旧run互換:

- 旧runは保存済みsimulationIdをそのまま読み、legacy identityとして扱う。
- Sprint 1の新規writerは必ず本規定を使用する。
- legacy runへSprint 1イベントや戦闘結果を追記しない。
- legacy final-worldまたは途中worldからSprint 1継続runを生成するmigrationは本Sprintの対象外とする。将来実装する場合も新しいSimulationIdentityとsimulationIdを必要とし、旧runを変更してはならない。

必須テスト:

- 同一identityでsimulationId一致
- seed、各hash、各spec version、battle profile adapter version、MatchId generator version、初期MatchId generator state hash、DefaultBattleStrategy version、RNG version、canonical JSON versionのどれか1つが異なるとsimulationId差分
- executionId、現実時刻、処理時間の差はsimulationIdへ影響しない
- runRuleSnapshotHashをidentityへ含めないこと
- run-metadata、initial-world、EventEnvelope、BattleState、BattleResultのsimulationId一致
- legacy runを暗黙変換しないこと

## 13. エラー方針

- 可能な範囲で複数エラーをまとめる。
- JSONパス、実値、期待条件を含める。
- 自動補正しない。
- 目標割合の丸めだけは警告・実績出力。

## 14. 受入テスト

1. 基準設定を読み込める。
2. 未知キーを拒否。
3. 年齢帯合計不一致を拒否。
4. 16〜41歳人数とランク合計不一致を拒否。
5. 年齢帯重複を拒否。
6. 確率範囲外を拒否。
7. F〜S以外を拒否。
8. 系統重み不一致を拒否。
9. 負の祖先数を拒否。
10. 親最低年齢18未満を拒否。
11. 死亡年齢範囲の逆転・18歳未満を拒否。
12. 家系・流派・師匠数、およびC以上の履歴枠数が不足する設定を拒否。
13. 名前manifest不整合を拒否。
14. キー順だけ異なる設定から同一ハッシュ。
15. `birthWeekOfMonth`が1以外なら拒否。
16. `twoKnownParentsCoverageAmongCovered`が範囲外なら拒否。
17. seed範囲外・非整数・RNG名不一致を拒否。
18. 家名候補と個人名候補に同一文字列があれば拒否。

## 15. 対象外

MySQLテーブル、ORM、正式バランス、管理画面、自動チューニング。
Sprint 1設定本体・技カタログの詳細キーは`docs/specs/14-sprint1-config-schema.md`を参照する。

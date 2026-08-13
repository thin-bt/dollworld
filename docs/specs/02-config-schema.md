# 02 初期設定スキーマ・検証ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.6`
- 設定スキーマバージョン：`0.3.0`

## 1. 目的

`config/initial-world.config.json`のキー、型、範囲、整合条件を固定し、暫定値をロジックへ直書きしない。

## 2. ルート構造

```text
schemaVersion
profileId
purpose
worldCalendar
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

## 3. 世界暦設定（新規run）

`InitialWorldConfig.schemaVersion = "0.3.0"`。新規runの暦入力はルート `worldCalendar` のみ（strict）。

```text
worldCalendar:
  monthsPerWorldYear: 12
  weeksPerMonth: 4
  worldYearStartMonth: 1
  worldYearStartWeek: 1
```

- `monthsPerWorldYear=12`、`weeksPerMonth=4`、`worldYearStartWeek=1` は整数固定値。
- `worldYearStartMonth` は 1..12 の整数。省略・null・数値文字列・非整数・未知fieldは拒否。
- 新規既定値は `worldYearStartMonth=1`。設定ファイルへ明示保存し、コード側の暗黙既定で補完しない。
- 初期世界年は常に1。`startYear` を新規schemaの設定入力として再導入しない。
- 次の legacy／重複 field を新規schemaから拒否する: `startYear`、`startMonth`、`startWeekOfMonth`、`monthsPerYear`、`birthMonth`、`birthWeekOfMonth`、`birthWeekOfApril`、`yearEndMonth`。
- 出生月・加齢月・年末月・April互換profileを別fieldとして追加しない。
- 人物別出生週は存在しない。run開始後の `worldCalendar` 変更は不可。
- legacy旧schema成果物は明示的に分離したlegacy pathでのみ読取可（存在する場合）。新規run identityへ静かにrewriteしない。

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

`performanceTargets`：600人・100年30秒、2,000人・100年120秒を警告基準、5,000人は計測のみ。性能超過はSprint 0の機能失敗にしない。本節の数値は**Sprint 0**契約である。S01-009 Sprint 1 population performance（存命人口 target×1年baseline）へ同じthresholdを適用しない。

## 11. 設定ハッシュ

- 正規化JSONからSHA-256を生成。
- オブジェクトキーをUnicodeコードポイント順で再帰的に並べ、配列順は保持し、余分な空白なしのUTF-8 JSONへ変換してSHA-256を計算する。
- 数値はJSONの有限数だけを許可し、`-0`は`0`へ正規化する。
- `schemaVersion`、`profileId`、`configHash`を出力へ保存。

## 12. Sprint 1 SimulationIdentity

Sprint 1以降に開始する新規runでは、設定ハッシュ・seed・仕様版に加え、Sprint 1の決定的ルール入力を含む`SimulationIdentity`から`simulationId`を生成する。Sprint 1仕様版は`S1-SPEC-0.1.21`。新規runの現行Sprint 1 identityとして旧`S1-SPEC-0.1.20`／`0.1.19`および`SimulationIdentity` schemaVersion `0.4.0`／`0.3.0`を受理しない。Sprint 0で生成済みの旧`simulationId`を再計算して置換しない（保存済み／archived Sprint 0 runのmigrationではない。後述の fresh Sprint 1 initialization promotion は、まだ固定7へ保存されておらず WorldEngine へ commit されていない transaction-local provisional だけを対象とする）。

```text
SimulationIdentity
- schemaVersion: "0.5.0"
- seed
- initialWorldConfigHash
- sprint1ConfigHash
- techniqueCatalogHash
- initialWeeklyTrainingSidecarHash
- worldCalendarConfigHash
- yearStartProcessorManifestHash
- battleProfileAdapterVersion
- matchIdGeneratorVersion
- initialMatchIdGeneratorStateHash
- defaultBattleStrategyVersion
- specVersions:
    - { specSetId: "main", version: "SPEC-0.1.3" }
    - { specSetId: "sprint0", version: "S0-SPEC-0.1.6" }
    - { specSetId: "sprint1", version: "S1-SPEC-0.1.21" }
- rngAlgorithmVersion
- canonicalJsonVersion
- hashAlgorithm: "SHA-256"
```

- `specVersions`は`specSetId`昇順へcanonical正規化する。
- `seed`はrunへ渡された決定的seedそのものを使用し、派生seedやexecutionIdを使用しない。
- `initialWorldConfigHash`、`sprint1ConfigHash`、`techniqueCatalogHash`、`initialWeeklyTrainingSidecarHash`は各完全内容のcanonical JSON SHA-256と一致必須。
- `initialWeeklyTrainingSidecarHash = SHA-256(canonicalJson(validated InitialWeeklyTrainingSidecarSnapshot))`（10仕様）。sidecar内容が変わればsimulationIdentityHashおよびsimulationIdも変わることを必須とする。
- `worldCalendarConfigHash = SHA-256(canonicalJson(validated worldCalendar))`。`yearStartProcessorManifestHash = SHA-256(canonicalJson(validated ActiveYearStartProcessorManifest))`。両方必須。legacy `SimulationIdentity` 0.4.0のfield setは変更しない。
- `battleProfileAdapterVersion`は11仕様の人物正規化adapter版と一致必須。
- `matchIdGeneratorVersion`は00ミニ仕様の決定的MatchId生成器版（Sprint 1初期値`match-id-generator-0.1.0`）と一致必須。
- `initialMatchIdGeneratorStateHash`はfresh runのseed・generatorVersion・固定namespace `"match"`から生成した初期`MatchIdGeneratorState`（schemaVersion `0.1.0`、`nextSequence=1`）のcanonical JSON SHA-256と一致必須。任意の現在nextSequenceや途中stateを初期値として注入しない。任意状態から開始するresume runは保存済みruntime checkpointを使用し、新しいSimulationIdentityを作り直さない。
- `defaultBattleStrategyVersion`は12仕様の標準Strategy実装版と一致必須。標準runでscripted actionsを使用しない。
- `rngAlgorithmVersion`は07仕様の実装版文字列と一致必須。
- `canonicalJsonVersion`は実際にhash算出へ使用するcanonical JSON実装版と一致必須。
- `hashAlgorithm`はSprint 1では`SHA-256`へ固定し、別名や暗黙既定値を許可しない。
- 現実時刻、executionId、Git commit、OS、Node、パス、処理時間、メモリは含めない。CLIの入力path／mtimeもidentity材料にしない。
- MatchId文字列そのもの、現在の`nextSequence`、途中のgenerator state hashをSimulationIdentity材料へ含めない。
- seedが異なれば初期MatchIdGeneratorState本文・`initialMatchIdGeneratorStateHash`・SimulationIdentity hash・simulationIdが差分する。同じseedと各identity入力ならこれらは一致する。
- 異なるrunでは同じMatchId文字列（例: `match_000000000001`）を許可する。seedはMatchId文字列へ混ぜない。
- RunRuleSnapshotへ`initialWeeklyTrainingSidecarHash`やsidecar全文を直接追加しない。sidecarは`simulationIdentityHash`経由でbindする。

生成順序（hash／id）:

```text
simulationIdentityHash
= SHA-256(canonicalJson(SimulationIdentity))

simulationId
= existingSimulationIdFactory(simulationIdentityHash)
```

`runRuleSnapshotHash`をsimulationId生成入力へ含めない。RunRuleSnapshotはsimulationIdを含むため、含めると循環依存になる。

### Sprint 1 new-run 初期化順（promotion／runtime込み・21ステップ）

1. `--config`を既存InitialWorldConfig loader／validatorで読む
2. `--sprint1-input`を`Sprint1CliInput` validatorで読む
3. Sprint1Configを既存validatorで検証する
4. TechniqueCatalogを既存validator／hashで検証する
5. `InitialWeeklyTrainingSidecarSnapshot`を検証する
6. `generateInitialWorld`で provisional fresh initial World ＋ initialEvents を生成する（この時点の`simulationId`はSprint 0方式の provisional simulationId）
7. S01-002正規adapterで`Sprint1PersonState`を付与する（この段階ではsimulationId／initial event identityを勝手に変更しない）
8. World Person集合とsidecar PersonId集合のexact 1:1を確認する（欠落・余剰・重複・malformedは拒否。neutral補完禁止）
9. fresh `MatchIdGeneratorState`を生成し、`initialMatchIdGeneratorStateHash`を算出する
10. `initialWorldConfigHash`／`sprint1ConfigHash`／`techniqueCatalogHash`／`initialWeeklyTrainingSidecarHash`／その他SimulationIdentity入力を確定する
11. `SimulationIdentity` 0.5.0を生成する（`worldCalendarConfigHash`／`yearStartProcessorManifestHash`含む）
12. `simulationIdentityHash`を生成する
13. final Sprint 1 `simulationId`を生成する
14. **fresh Sprint 1 initialization promotion**（後述）: initial Worldの`simulationId`をfinalへbindし、initialEventsをEventEnvelope 0.2.0へpromotionする
15. RunRuleSnapshotを生成し、`runRuleSnapshotHash`を算出する
16. initial battle World RNG生成（label `battle/world-rng`）→ `worldRngState`
17. processor runtime生成。CAL-JAN新規runの`processorSpecificStates`は次のexact 2件・この順: `{ processorId: "weekly-training", specificState: TrainingProcessorRuntimeState }`、`{ processorId: "world-year-start", specificState: WorldYearStartRuntimeState }`。weekly-training RNG labelは`processor/weekly-training`のまま。`world-year-start`は`processorOrder`／`rngStates`／normal-week adapter／legacy WorldProcessorへ追加しない
18. `EventAllocationState`生成（`nextSequence = promotedInitialEvents.length`）
19. `BattleResultWeekState`生成（`absoluteWeek = promotedWorld.worldDate.absoluteWeek`、`results = []`）
20. `Sprint1RunRuntimeState`生成（全runtime componentを1 rootへ束ねる）＋同時にimmutable `Sprint1RunContext`を1回作成し、論理`Sprint1RunSession{context,runtimeState}`とする
21. `weekly-training`をSprint1 transactional processor adapter pipelineへ登録（既存`RunWorldOneWeekInput.processors`へ二重登録しない）

この完了前にfixed7 writerを開始しない。promotion前のprovisional snapshot／eventsを固定7へ保存してはいけない。いずれのvalidation failureでもrun開始前failureとし、一部補完して開始しない。S1-SPEC-0.1.21 clarification実施時点では配線本体（S01-008）は未実施で、ここでは正本契約のみを確定した。currentではS01-008がimplemented / accepted（commit `7c47847`）であり、本節のpromotion契約はproductionへ配線済み。

### fresh Sprint 1 initialization promotion

既存`generateInitialWorld`はSprint 0方式で計算したprovisional `simulationId`を持つfresh snapshotとinitialEventsを返す。Sprint 1 new runではSimulationIdentity 0.5.0から最終`simulationId`を生成するため、transaction-local fresh resultを最終identityへ昇格させる境界を次に固定する。

これは **fresh Sprint 1 initialization promotion** であり、保存済み／archived Sprint 0 runのmigrationではない。

対象:

- 直接`generateInitialWorld`から得た、まだ固定7へ保存されておらず、まだWorldEngine runtimeへcommitされていないfresh initial generation resultのみ
- archive済みrun、既存Sprint 0 run、保存済み`events.jsonl`には適用禁止

precondition（不一致・tamperならrun開始失敗）:

- fresh initial WorldDateである
- snapshot.simulationIdは`generateInitialWorld`が生成したprovisional simulationId
- initialEvents全件も同じprovisional simulationId
- initial event sequenceが既存generator契約どおり連続（03どおり0始まりの途切れない連番。実装は`buildInitialEvents`）
- initialEventsが`generateInitialWorld`から直接得たordered stream
- Sprint1PersonState attach後もsimulationId／initial event identityを勝手に変更していない

promoted World（cloneしたfresh initial Worldについて）:

- `simulationId`だけを最終Sprint 1 simulationIdへ置換する
- 以下はそのまま保持: `configHash`、seed由来World内容、`worldDate`、persons、families、lineages、relationships、generationSummary、その他initial generation content
- 人物や世界を再生成しない。promotionによるRNG消費は0

promoted initial events:

- 各件をSprint 1 new-run EventEnvelope 0.2.0へ変換する
- 全件 `schemaVersion = "0.2.0"`、`simulationId = final Sprint 1 simulationId`
- 既存initial eventから変更しない: `sequence`、`eventId`、`worldDate`、`eventType`、`origin`、`sourceProcessor`、person／family／lineage等の既存entity reference、`payload`、event ordering
- EventEnvelope 0.2.0で新設された`entities.matchIds`はinitial eventでは必ず`[]`
- initial eventを再生成しない／再sequenceしない／eventIdを再割当しない／payloadを書き換えない
- `origin`／`sourceProcessor`を`weekly-training`等へ変更しない。initialization eventは既存initialization producer（`initial-world-generation`）を維持する

failure atomicity（promotion validation failure時）:

- fixed7出力0
- Sprint1 runtime生成0
- WorldEngine commit 0
- event append 0
- でrun開始失敗

### Sprint1RunRuntimeState / Sprint1RunContext / Sprint1RunSession（最終論理shape）

mutable runtime root（オブジェクト自体はcheckpoint非永続。sidecar投影は後述）:

```text
Sprint1RunRuntimeState
- worldState: WorldEngineState
- worldRngState: SeededRngState
- matchIdGeneratorState: MatchIdGeneratorState
- weeklyTrainingSidecars: WeeklyTrainingSidecarState
- processorRuntimeStates: 既存WorldEngine ProcessorRuntimeState collection
- eventStream: promoted／committed EventEnvelope[]（最終出力先は既存events.jsonl）
- eventAllocationState: EventAllocationState 0.1.0
- battleResults: BattleResult[]（run全体のcommit順canonical store。final-worldへ投影）
- battleResultWeekState: BattleResultWeekState 0.1.0（同週count専用registry）
```

immutable run固定正本（fresh initialization時に1回だけ作成。week／battleで変更しない）:

```text
Sprint1RunContext
- sprint1Config
- techniqueCatalog
- initialWeeklyTrainingSidecarSnapshot
- simulationIdentity
- simulationIdentityHash
- simulationId
- runRuleSnapshot
- runRuleSnapshotHash
```

- context validationは上記fieldのみ。外部`initialMatchIdGeneratorState`依存は持たない。`SimulationIdentity.seed`からfresh初期`MatchIdGeneratorState`を再構築し、`initialMatchIdGeneratorStateHash`と照合する。

production run/session facadeの論理owner:

```text
Sprint1RunSession
- context: Sprint1RunContext
- runtimeState: Sprint1RunRuntimeState
```

- rollback対象は`runtimeState`のみ。`context`は常に不変
- Sha256Provider／filesystem path／logger／current time／performance／mutable RNG objectはcontext canonical fieldに入れない（dependency）
- `Sprint1RunContext`専用の固定8ファイル目は禁止。既存fixed7へ現行契約どおりmaterialize／投影する（identity→run-metadata、RunRuleSnapshot→initial-world.runRuleSnapshot、`initialWeeklyTrainingSidecarSnapshot`→initial-worldトップレベル、config／catalog hash→既存identity／snapshot参照）。全文を新fileへ複製しない
- **runtime checkpoint vs projection**: `Sprint1RunRuntimeState`オブジェクト自体はcheckpointとして固定7へ永続化しない。canonical game stateである`weeklyTrainingSidecars`およびrun全体`battleResults`は`final-world.json`トップレベルへ投影する。`eventAllocationState`／`battleResultWeekState`／`worldRngState`／`matchIdGeneratorState`／`processorRuntimeStates`はruntime-onlyのまま。固定7は exactly 7 files（`sidecar.json`／`battle-results.json`禁止）
- initialization owner: `initialWeeklyTrainingSidecarSnapshot`の正本ownerは`Sprint1RunContext`。`initial-world.json`へ投影する値はcontextから取り、runtime current sidecarをinitialへ書き戻さない。`weeklyTrainingSidecars`のcurrent正本ownerは`Sprint1RunRuntimeState`であり、`final-world.json`投影もruntime currentから取る。`battleResults`の正本ownerも`Sprint1RunRuntimeState`であり、`final-world.battleResults`へ全文投影する（`detailedLog`含む。縮小DTO禁止）
- `WeeklyTrainingSidecarState`は`InitialWeeklyTrainingSidecarSnapshot` 0.1.0と同じentry shape／ordering／validation。意味分離: Initial＝run identity入力の固定初期値（context所有）、WeeklyTrainingSidecarState＝run中に変化するcurrent runtime。fresh時`current = validated deep clone(initial)`（参照非共有）。`initialWeeklyTrainingSidecarHash`は初期snapshotだけのhashであり、current変更で再計算しない
- 必須invariant: `battleResultWeekState.absoluteWeek === worldState.worldDate.absoluteWeek`（battle run／commitRunBattlePlan／weekly stepの前に毎回確認。不一致はreject／root変更0）
- 必須invariant: `battleResultWeekState.results`は`battleResults`のcurrent-week committed suffixと順序込みcanonical一致（N=week.results.length。N===0ならempty可。N>0なら`battleResults.slice(length-N)`と一致。一方だけappend禁止。battle facade／commit／weekly step前に確認）

```text
EventAllocationState 0.1.0
- schemaVersion: "0.1.0"
- nextSequence: non-negative safe integer

BattleResultWeekState 0.1.0
- schemaVersion: "0.1.0"
- absoluteWeek: non-negative safe integer
- results: BattleResult[]（同週commit順。run全体storeのcurrent-week suffix）
```

- fresh `battleResults = []`。`commitRunBattlePlan`成功時はcompletedおよび`resolution_error`のfailed BattleResultを`battleResults`と`battleResultWeekState.results`へ同一outer transactionでappend。`pre_start_failure`／post-start execution abort／commit failureはどちらにもappendしない。同じmatchIdの二重登録はreject（`battleResults`含むroot変更0）
- `matchesCompletedThisWorldWeekBeforeBattle`のcount sourceは`battleResultWeekState.results`のみ（`battleResults.length`を使わない）。completedだけcount。`resolution_error`は両storeへ登録するがcount+0
- Sprint 1ではBattleResult削除／retention適用を実装しない。全commit済みBattleResultを`final-world.battleResults`へ保存する。events.jsonlへturn／action詳細ログを複製しない（`battle.started`／`battle.finished`のみ）

重複禁止: `TrainingProcessorRuntimeState`直下保存なし／weekly RNG直下保存なし／EventId専用generatorなし／BattleResult別固定7 fileなし（`battle-results.json`禁止）。

### Sprint1 transactional processor adapter pipeline（legacy WorldProcessorとの境界）

既存production `WorldProcessor` exact型（変更禁止）:

```text
WorldProcessor = {
  processorId,
  process({ state: WorldEngineState, rng: SeededRng }): WorldEngineState
}
```

S01-004 `processWeeklyTrainingWeek`は別契約（absoluteWeek／personRecords／config／catalog／runtimeState／rngState → personRecords／runtimeState／rngState／eventCandidates）。weekly-trainingを既存`WorldProcessor.process`へ無理に押し込み、sidecar／config／catalogをclosure／global captureしたり、event candidateを副作用appendしたり、specific runtimeを外部mutable変数更新する方式は禁止。

本仕様でいう production processor配列 = `[weekly-training]` は、**Sprint1 transactional processor adapter pipeline** の配列を意味する。`WEEKLY_TRAINING_PROCESSOR_ID`はadapter ID／`EventEnvelope.sourceProcessor`であり、legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`への登録対象ではない。二重実行禁止。

Sprint1WeeklyTrainingAdapterInput（最低限）:

- absoluteWeek／worldState／weeklyTrainingSidecars／sprint1Config／techniqueCatalog／processorRuntimeStates

Sprint1WeeklyTrainingAdapterOutput（最低限）:

- worldState／weeklyTrainingSidecars／processorRuntimeStates／eventCandidates（まだEventEnvelope未確定のcandidate列）

adapterはrootを直接変更せず、validated clone／transaction draftから結果を返す。手順の要約: weekly RNG entry exact 1／specificState exact 1 → `validateTrainingProcessorRuntimeState` → Person+sidecarからWeeklyTrainingPersonRecord構築 → `processWeeklyTrainingWeek` 1回 → personをWorldへ／person以外をsidecarへ／runtimeState・rngStateをweekly entryへ／eventCandidatesを返す。missing／duplicateはreject。fresh以外で欠落を`createInitialTrainingProcessorRuntimeState()`へ勝手補完禁止。

### S01-008 production weekly transaction最終順

1. current Sprint1RunSession → runtime全体clone draft
2. runtime／context cross validation
3. `battleResultWeekState.absoluteWeek == worldDate.absoluteWeek`確認および`battleResults`／week suffix invariant確認
4. Sprint1 transactional processor adapter pipeline `[weekly-training]`
5. S01-004 candidatesをtransaction-local保持
6. 既存WorldEngine calendar／year-start／aging weekly処理（weekly-trainingをlegacy processorsへ二重登録しない。S01-008で他の新規WorldProcessorを発明しない）
7. 既存WorldEngine eventsをtransaction-local取得
8. current week S01-004 candidatesをcandidate順でEventEnvelope 0.2.0化 → その後に既存WorldEngine eventsを既存順で続ける
9. 全eventを同一global nextSequenceから連続allocation（成功まではsequence／eventIdを永続commitしない）
10. 全World／person／sidecar／runtime／event validation
11. worldDateが次週へ進んだなら`battleResultWeekState`をnew week／`results=[]`へreset（同じouter commit）。**`battleResults`は変更しない**（過去BattleResultを週resetで削除しない）。worldDateだけ進んでregistryが旧週のまま／registryだけ先行resetは禁止。weekly failure時は`battleResults`／`battleResultWeekState`とも旧値維持
12. 全部成功時だけSprint1RunRuntimeStateを1回置換。failure時は旧root完全維持

public `runSprint1WeeklyStep` および battle／create／fixed7 の untrusted 境界は上記どおり full session validation を維持する。`runSprint1Years` の multi-week production loop のみ validated-session trust boundary を使える: 開始時 full session validation 1回、各週は変更 state／appended event suffix の transition-local validation、終了時 full session validation 1回。unchanged validated historical event prefix および pure weekly で不変の global `battleResults` を毎週 full rescan する必要はない（validation semantics の緩和ではない）。optional week observer は trusted draft session を公開せず、frozen narrow observation（worldDate／eventCountCumulative／当該週 appendedEvents）のみを渡す。

最終成功時のglobal Event Stream順:

1. 既にcommitted済みeventStream
2. current week weekly-training candidates（S01-004 candidate順）
3. 同じ週transactionで既存WorldEngineが生成するcalendar／year-start／aging等（既存WorldEngine順）

### battle participant／developmentEffectsの物理World適用先

- `PersonTemporaryCondition`（fatigue／injury／condition／confidence）のcurrent正本は`weeklyTrainingSidecars[].temporaryCondition`。Personへこれらを新fieldとして追加しない
- BattleParticipantSource構築: Person本体（identity／status／age／abilities／aptitudes／sprint1State等）＋sidecarのtemporaryCondition。missing sidecarはreject。neutral補完禁止。sourceSnapshotHashはこのcombined canonicalを正本とする
- completed BattleResultのみ人物効果適用。fatigue／injuryはsidecarへ（injuryはsource+injuryDeltaのclamp。BattleResultのinjuryDeltaを絶対値へ変えない）。condition／confidenceはauthoritative `conditionAfter`／`confidenceAfter`をnext sidecar値とし、`conditionRequestedDelta`／`confidenceRequestedDelta`を直接加算しない。currentMental／techniqueStateDeltasは`Person.sprint1State`へ。`battleExperienceSummary`はBattleResult内部情報として保持するだけで、PersonへbattleExperience等の新fieldを推測追加しない
- resolution_error／pre_start_failure／abort／commit failure: Person変更0／current sidecar変更0

- 現行WorldEngineは`WorldEngineRunResult.nextSequence`／入力`startSequence`として裸の非負safe整数を扱う。named Event allocation型はrepositoryに無かったため`eventAllocationState`を新規定義した（`packages/simulation-core/src/sprint1/event-allocation-state.ts`）
- EventId用の独立mutable generator stateは作らない。eventIdは既存EventEnvelope契約どおりsequenceから純粋決定する
- `processorRuntimeStates`は既存`ProcessorRuntimeState`（`processorOrder`／`rngStates`／optional `processorSpecificStates`）。Sprint 0／legacy互換は`processorSpecificStates`省略可またはweekly-trainingのみ。CAL-JAN新規runは`processorSpecificStates`へexact 2件（`weekly-training`→`world-year-start`順）を必須とし、欠落・重複・余分・未知entryを拒否する。restoreは欠落entryを捏造しない。`world-year-start`は通常週間adapterではない。`specificState`はplain JSONのみ許可し、validate／clone／export／restoreはdescriptor-safe deep clone（nested alias禁止。getter実行禁止）。年開始runtimeは`processorSpecificStates`へ1回だけ格納し、WorldState／event stream／UI／第2hashへ複製しない
- fresh battle World RNG: `createSeededRng(deriveSeed(runSeed, "battle/world-rng")).exportState()`。`generateInitialWorld`内部RNG位置を流用しない。fresh生成のRNG drawは0。最初の`startBattleTransaction`成功時だけS01-005どおり`nextUint32()`を1回消費
- fresh weekly-training RNG: `createSeededRng(deriveSeed(runSeed, "processor/weekly-training")).exportState()`。WorldEngine `createInitialRuntime`の`world-engine/processor/${id}` labelとは別。Sprint1 fresh initはこの固定labelを使う
- fresh `battleResultWeekState`: `{ schemaVersion:"0.1.0", absoluteWeek: promotedWorld.worldDate.absoluteWeek, results: [] }`
- fresh `battleResults`: `[]`
- fresh initialization promotion後: `eventStream = promoted initialEvents`、`eventAllocationState.nextSequence = promotedInitialEvents.length`
- week／battle commitでは全runtime componentを同一transaction draftへ含め、成功時だけroot置換。failure時はroot全体unchanged（RNG／sequence／registryだけ先行commit禁止）
- `battle.started`／`battle.finished`も同じglobal `eventAllocationState`から連続割当
- `eventStream`は最終的に既存`events.jsonl`へ出力。`eventAllocationState`／`battleResultWeekState`／`worldRngState`／`matchIdGeneratorState`／`processorRuntimeStates`はS01-008ではruntime-only（`Sprint1RunRuntimeState`全体をcheckpointとして固定7へ保存しない）。一方`weeklyTrainingSidecars`および`battleResults`（BattleResult全文／`detailedLog`含む）はcanonicalとして`final-world.json`へ投影し、`initialWeeklyTrainingSidecarSnapshot`は`initial-world.json`へ投影する。固定7件数は不変（8ファイル目禁止。`battle-results.json`禁止）

保存と検証:

- `run-metadata.json`へ`simulationIdentity`全文と`simulationIdentityHash`を1件保存する（Sprint 1新規runの文書schemaVersionは`0.5.0`。05ミニ仕様）。
- `initial-world.json`文書schemaVersionは`0.5.0`（トップレベル`initialWeeklyTrainingSidecarSnapshot`＋既存`runRuleSnapshot` 0.5.0）。`runRuleSnapshot.simulationIdentityHash`とrun-metadataの値を一致させる。`RunRuleSnapshot` 0.5.0は`worldCalendar`／`yearStartProcessorManifest`／各hashを必須で含む。
- `final-world.json`文書schemaVersionは`0.3.0`（トップレベル`weeklyTrainingSidecars`＋`battleResults`＋既存Sprint1PersonState）。schemaVersionは0.4.0へbumpしない。
- EventEnvelope、BattleState、BattleResultの`simulationId`は同じ最終Sprint 1値を使用する（promotion後）。
- 同じSimulationIdentityでsimulationIdが全文一致することを必須とする。
- いずれかの決定的入力が異なる場合、simulationIdも異なることを必須とする。
- 同じversion文字列でcanonical内容またはhashが異なる入力を拒否する。
- `validateRunRuleSnapshotAgainstIdentity`はSimulationIdentity 0.5.0を正として検証する。

旧run互換:

- 旧runは保存済みsimulationIdをそのまま読み、legacy identityとして扱う。
- Sprint 1の新規writerは必ず本規定（SimulationIdentity／RunRuleSnapshot 0.5.0、run-metadata／initial-world 0.5.0）を使用する。
- legacy runへSprint 1イベントや戦闘結果を追記しない。
- `SimulationIdentity` schemaVersion `0.4.0`はS01-008時点のSprint 1 identityであり、T01で0.5.0へ更新する。legacy `0.4.0`のfield setは不変のまま維持し、新fieldを後付けしない。`SimulationIdentity` schemaVersion `0.3.0`はS01-001〜S07間のSprint 1 foundation schemaであり、S01-008 production fixed7 writer完成前に0.4.0へ更新された。repositoryに0.3.0専用のpublic legacy reader moduleは存在しない。clarifierのためだけに新しい0.3.0 legacy readerを新設しない。current new-run `validateSimulationIdentity`は0.5.0のみ受理し、0.4.0／0.3.0はcurrent new-run identityとしてrejectする。
- 維持必須の実在legacyはSprint 0側: fixed7 document reader、EventEnvelope 0.1.0 reader、Sprint 0 `createSimulationId`、保存済みSprint 0 simulationId。
- legacy final-worldまたは途中worldからSprint 1継続runを生成するmigrationは本Sprintの対象外とする。将来実装する場合も新しいSimulationIdentityとsimulationIdを必要とし、旧runを変更してはならない。

必須テスト:

- 同一identityでsimulationId一致
- seed、各hash（sidecar hash含む）、各spec version、battle profile adapter version、MatchId generator version、初期MatchId generator state hash、DefaultBattleStrategy version、RNG version、canonical JSON versionのどれか1つが異なるとsimulationId差分
- executionId、現実時刻、処理時間、CLI pathの差はsimulationIdへ影響しない
- runRuleSnapshotHashをidentityへ含めないこと
- run-metadata、initial-world、EventEnvelope、BattleState、BattleResultのsimulationId一致
- legacy runを暗黙変換しないこと
- 新規Sprint 1 identityとしてschemaVersion `0.3.0`を拒否すること

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
15. 新規schemaでlegacy `birthWeekOfMonth`／`startMonth`等を拒否。`worldYearStartMonth`が1..12外・非整数・nullなら拒否。
16. `twoKnownParentsCoverageAmongCovered`が範囲外なら拒否。
17. seed範囲外・非整数・RNG名不一致を拒否。
18. 家名候補と個人名候補に同一文字列があれば拒否。

## 15. 対象外

MySQLテーブル、ORM、正式バランス、管理画面、自動チューニング。
Sprint 1設定本体・技カタログの詳細キーは`docs/specs/14-sprint1-config-schema.md`を参照する。

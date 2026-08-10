# 05 長期実行・統計・出力ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`

## 1. 目的

同一条件の結果を人間とAIが比較できるよう、実行情報、初期・最終世界、年次統計、イベント、検証、性能を固定形式で出力する。

## 2. 固定出力

```text
output/<run-id>/
├─ run-metadata.json
├─ initial-world.json
├─ final-world.json
├─ yearly-statistics.csv
├─ events.jsonl
├─ validation-report.json
└─ performance.json
```

追加・改名・省略は仕様変更なしに行わない。

- JSONとJSONLの決定的部分は02ミニ仕様のcanonical JSONを使用し、UTF-8・LF・末尾改行ありで出力する。
- CSVはこの仕様に記載した列順、UTF-8、LF、末尾改行ありとする。整数を指数表記にせず、欠損を空文字・0で偽装しない。
- `run-metadata.json`と`performance.json`の現実時刻・環境・性能値は決定性比較から除外するが、キー構造は固定する。

## 3. RunId・simulationId

- RunId：実行ごとに異なってよい非決定的識別子。形式は`run_YYYYMMDDTHHMMSSmmmZ_<4桁連番>`とし、UTC・ASCIIだけを使用する。同一ミリ秒内はプロセス内連番で衝突を避ける。
- simulationId：Sprint 0は00ミニ仕様の固定文字列・順序から決定的に生成。Sprint 1以降の新規runは02ミニ仕様のSimulationIdentityから生成。
- 決定性比較ではrun-id、現実時刻、性能値、パスを除外。

## 4. `run-metadata.json`

Sprint 0の必須内容:

- runId、simulationId
- SPEC、ミニ仕様、技術決定、設定、名前データの各バージョン
- configHash、nameDataHash、seed、RNGアルゴリズム版、実行年数・週数
- コミットID（取得可能時）
- 現実の開始・終了時刻
- 正常／異常終了
- 7ファイルの一覧

Sprint 1以降の新規runでは文書`schemaVersion`を`0.4.0`とし、次を追加する（nested `SimulationIdentity` wire shapeが0.4.0へ変わったためbump）。

```text
- schemaVersion: "0.4.0"
- simulationIdentity: SimulationIdentity  // schemaVersion "0.4.0"
- simulationIdentityHash: string
- eventEnvelopeSchemaVersion: "0.2.0"
```

- `simulationIdentity`は02ミニ仕様の`SimulationIdentity` 0.4.0全文（`initialWeeklyTrainingSidecarHash`を含む）。
- `simulationIdentityHash`は全文から再計算一致必須。
- `simulationId`は02ミニ仕様に従ってidentity hashから生成する。
- executionId、現実時刻、性能情報、CLI path／mtimeはidentityへ含めない。
- `Sprint1RunRuntimeState`オブジェクト自体はrun-metadataへ永続化しない（runtime checkpoint禁止）。`eventStream`の最終出力先は既存`events.jsonl`のみ。`eventAllocationState`／`battleResultWeekState`／`worldRngState`／`matchIdGeneratorState`／`processorRuntimeStates`はruntime-only。sidecarおよび`battleResults`投影は`initial-world`／`final-world`側（後述）。
- 05の「旧版reader維持」は、実在するSprint 0 fixed7 document readerおよびEventEnvelope 0.1.0 reader等を指す。repositoryに存在しない`SimulationIdentity` 0.3.0専用legacy readerを新設・維持対象として扱わない（02仕様）。

## 5. `initial-world.json`

初期世界スナップショット全文とgenerationSummaryを保持する。世界1年4月第1週、年初処理反映済み。再読込・不変条件検証可能であること。

Sprint 1以降の新規runでは文書`schemaVersion`を`0.4.0`とし、トップレベルへ完全な`runRuleSnapshot`と`initialWeeklyTrainingSidecarSnapshot`を保存する。

```text
- schemaVersion: "0.4.0"
- runRuleSnapshot: RunRuleSnapshot
- initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot  // schemaVersion "0.1.0"
- persons[*].sprint1StateSchemaVersion: "0.1.0"
- persons[*].currentMental
- persons[*].techniqueStates
- persons[*].learningFocusTechniqueId
```

- `initialWeeklyTrainingSidecarSnapshot`は`Sprint1RunContext`からの投影。runtime current sidecarをinitialへ書き戻さない。
- `runRuleSnapshot.simulationId`はinitial worldおよびrun-metadataのsimulationIdと一致必須。
- `runRuleSnapshot.simulationIdentityHash`はrun-metadataの値と一致必須。
- `runRuleSnapshot.battleProfileAdapterVersion`、`matchIdGeneratorVersion`、`initialMatchIdGeneratorStateHash`、`defaultBattleStrategyVersion`はSimulationIdentityの値と一致必須。
- `runRuleSnapshotHash`を再計算して検証する。
- 各BattleState／BattleResultは完全設定・完全技カタログを複製せず、hashと軽量な`BattleRulesSnapshotRef`だけを保持する。
- replayまたは詳細戦闘ログの再読込時は、同じrunの`initial-world.json.runRuleSnapshot`を参照する。
- run内に戦闘が0件でもRunRuleSnapshotを保存する。
- 同一SimulationIdentityではRunRuleSnapshot全文とhashが一致する。
- `run-rule-snapshot.json`／`sidecar.json`等の8ファイル目を追加しない。

## 6. `final-world.json`

- 最終世界日時
- 全人物（存命・死亡済み）
- 家系、流派、関係
- 最終イベントsequence
- configHash、seed、simulationId
- 参照整合性結果

100年実行時は4,800週後、世界101年4月第1週。

Sprint 1以降の新規runでは文書`schemaVersion`を`0.3.0`とし、各人物のSprint1PersonStateに加え、トップレベルへ`weeklyTrainingSidecars`および`battleResults`を投影する。

```text
- schemaVersion: "0.3.0"
- weeklyTrainingSidecars: WeeklyTrainingSidecarState  // PersonTemporaryCondition current正本を含む
- battleResults: BattleResult[]  // run全体commit順。detailedLog含む全文。縮小DTO禁止
- persons[*].sprint1StateSchemaVersion: "0.1.0"
- persons[*].currentMental
- persons[*].techniqueStates
- persons[*].learningFocusTechniqueId
```

- nested複製や同義フィールドを禁止する。
- `weeklyTrainingSidecars`は`Sprint1RunRuntimeState.weeklyTrainingSidecars`からの投影。`battleResults`は`Sprint1RunRuntimeState.battleResults`からの投影。`Sprint1RunRuntimeState`オブジェクト全体のcheckpointではない。
- `currentMental`、`techniqueStates`、`learningFocusTechniqueId`、`weeklyTrainingSidecars`全文、`battleResults`全文（`detailedLog`／`summaryLog`／hashes／RNG final state／`developmentEffects`含む）をfinal world hashと同seed比較対象へ含める。
- `battleResults` validation: dense array／commit順／duplicate matchIdなし／各`validateBattleResult` success／同一`simulationId`／同一`runRuleSnapshotHash`。正本は`initial-world.runRuleSnapshot`（各BattleResultへRunRuleSnapshot全文を複製しない）。
- Sprint 1ではBattleResult retention削除を実装しない。`resolution_error`も保存。`pre_start_failure`／abortは保存なし。events.jsonlへturn詳細を複製しない。`battle-results.json`禁止。
- `techniqueStates`はTechniqueId昇順・重複なし。
- Sprint 0のlegacy final-world 0.1.0およびSprint 1旧`0.2.0`へ新フィールドを暗黙追記しない。
- archived legacy run自体は書き換えずread-onlyとする。Sprint 0 final-worldや途中worldをSprint 1の継続run入力へ変換する機能は本Sprintの対象外とし、暗黙migrationしない。
- 未知schemaVersionは拒否し、0.1.0／0.2.0 readerと0.3.0 validatorを分離する。

## 7. 文書schemaVersionと互換

| 文書 | 新規runのschemaVersion | 追加内容 |
|---|---|---|
| `run-metadata.json` | `0.4.0` | SimulationIdentity 0.4.0（`initialWeeklyTrainingSidecarHash`含む）、identity hash、EventEnvelope版 |
| `initial-world.json` | `0.4.0` | RunRuleSnapshot 0.4.0、Sprint1PersonState初期値、トップレベル`initialWeeklyTrainingSidecarSnapshot` 0.1.0 |
| `final-world.json` | `0.3.0` | Sprint1PersonState、技習得・熟練・現在精神力、トップレベル`weeklyTrainingSidecars`＋`battleResults` |
| `InitialWeeklyTrainingSidecarSnapshot` | `0.1.0` | 週間訓練sidecar外部入力（initial-world投影・context所有） |
| `EventAllocationState` | `0.1.0` | runtime-only（固定7非永続） |
| `BattleResultWeekState` | `0.1.0` | runtime-only同週count registry（固定7非永続。run全体は`battleResults`） |
| `EventEnvelope` | `0.2.0` | Sprint 1 new-run events.jsonl |
| `RunRuleSnapshot` | `0.4.0` | adapter／MatchId generator／DefaultBattleStrategy版 |

Sprint 1新規runでの文書schema bump方針（S1-SPEC-0.1.20）:

- **bumpした**: `SimulationIdentity` `0.3.0`→`0.4.0`、`run-metadata.json` Sprint1 new-run `0.3.0`→`0.4.0`、`initial-world.json` `0.3.0`→`0.4.0`、`final-world.json` `0.2.0`→`0.3.0`（`weeklyTrainingSidecars`＋`battleResults`を同一0.3.0最終shapeとして確定。0.4.0へ追加bumpしない）
- **bumpしない**: `RunRuleSnapshot` `0.4.0`（既定）、`EventEnvelope` `0.2.0`、`InitialWeeklyTrainingSidecarSnapshot` `0.1.0`、`EventAllocationState` `0.1.0`、`BattleResultWeekState` `0.1.0`、`BattleResult` `0.5.0`
- fixed7は exactly 7 files（`sidecar.json`／`battle-results.json`禁止）
- JSON wire shapeが変わる文書だけ版上げする。hash値だけが変わる／shape不変なら版上げしない。legacy readerは維持する。

- 既存Sprint 0の`0.1.0` readerは維持する。
- `0.1.0`文書へ新フィールドを暗黙追加して書き戻さない。
- 旧版から新しい文書版へ変換する場合は明示migrationを使用し、旧ファイルを変更しない。SimulationIdentityとRunRuleSnapshotを再構築できる全決定的入力が残っていない旧runはmigration不可とし、read-only legacyのまま扱う。
- 未知schemaVersionは拒否する。
- schemaVersion別validatorを分離し、各旧版と新版本の必須キーを混在させない。

Sprint 1以降に開始したrunでは、`events.jsonl`の全行が`run-metadata.eventEnvelopeSchemaVersion`と一致する。新規runでは値を`0.2.0`へ固定する。1つのevents.jsonlへ`0.1.0`と`0.2.0`を混在させない。過去runの読込は0.1.0を許可するが、新規イベントを追記しない。

## 8. `yearly-statistics.csv`

UTF-8、ヘッダーあり。各世界年の3月第4週終了後に1行。100年実行で100行（ヘッダー除く）。

必須列：

- worldYear、absoluteWeek
- livingCount、deceasedRecordCount
- age0To7、age8To15、age16To17、age18To41、age42Plus
- childCount、traineeCount、activeCompetitorCount、retiredCount、waitingCount、stoppedCount
- rankNone、rankF〜rankS

ランク列は存命人物全体を排他的に集計する。現役かつcurrentRankありはrankF〜rankS、未デビュー・currentRank未付与・引退者はrankNoneとし、合計はlivingCountに一致する。highestRankはこの列へ使用しない。
- familyCount、lineageCount
- parentChildRelationshipCount、marriageCount、masterDiscipleRelationshipCount
- qualifiedMasterCount、mastersWithDisciplesCount、averageDiscipleCount、maximumDiscipleCount
- eventCountThisYear、eventCountCumulative
- brokenReferenceCount、invariantViolationCount

未実装の出生・死亡・大会等は0に偽装せず、Sprint 0のCSV列へ入れない。

## 9. `events.jsonl`

03-event-envelope準拠、sequence順、UTF-8、1行1件。何も起きない週は出力不要。

## 10. `validation-report.json`

- 検証名、合否、違反件数
- 対象ID、理由、重大度
- 継続可否
- 壊れた参照・循環・年齢・状態・同一シード比較結果

参照不整合と再現性違反は失敗。

Sprint 1新規runのsame-seed／validation-report比較では、`initialWeeklyTrainingSidecarSnapshot`全文、`final-world.weeklyTrainingSidecars`全文、および`final-world.battleResults`全文を含める（hashだけに省略しない）。validation-reportへ`battleResults` validation項目をSprint1新規run検証へ追加する。

## 11. `performance.json`

- 実行環境のNode・OS・CPU情報（取得可能範囲）
- 総処理時間
- 1年・1週あたり平均
- 最大メモリ
- 人物数、週数、イベント数、出力容量
- 性能警告基準との比較

性能基準超過は警告であり、機能不整合がなければSprint 0失敗にはしない。

## 12. 決定性比較

同一設定・シード・仕様版・名前版・RNG版・実装コミットで以下が一致：initial-worldの決定的項目、events全行、yearly-statistics全行、final-worldの決定的項目、simulationId。

Sprint 1以降の新規runでは、固定7ファイルのrename前検証へ次を追加する。

- run-metadata／initial-world／final-worldの文書schemaVersion
- SimulationIdentity全文（adapter／MatchId generator版・initialMatchIdGeneratorStateHashを含む）、identity hash、simulationIdの再計算一致
- `initial-world.json.runRuleSnapshot`のschemaVersion、simulationIdentityHash、config identity、catalog identity、hash
- `initial-world.json.initialWeeklyTrainingSidecarSnapshot`全文（same-seed比較対象）
- `run-metadata.eventEnvelopeSchemaVersion`とevents.jsonl全行の一致
- RunRuleSnapshotが1件だけで、BattleState／BattleResultへ完全設定・完全カタログが重複保存されていないこと
- final-worldの全人物Sprint1PersonStateと`weeklyTrainingSidecars`全文と`battleResults`全文、world hash再計算一致

SimulationIdentityとRunRuleSnapshotは決定的入力なので同seed比較対象に含める。現実日時、executionId、処理時間、メモリ等の非決定的値は従来どおり除外する。

除外：run-id、現実日時、処理時間、メモリ、パス、環境情報。

## 13. 受入テスト

1. 7ファイルを生成。
2. 100年でCSV100行。
3. initial／finalを再読込し検証可能。
4. 同条件2実行の決定的出力一致。
5. 異なるシードで初期または最終世界が異なる。
6. 壊れた参照を対象ID付きで出力。
7. 300年でもファイル破損なし。
8. final日時が指定年数と一致。
9. イベントsequenceが連続・重複なし。

Sprint 1追加:

- 固定7ファイルの件数・名称がSprint 1導入前後で不変
- run-metadata.json 0.4.0の必須フィールド（SimulationIdentity 0.4.0）
- initial-world.json 0.4.0の必須フィールド（`initialWeeklyTrainingSidecarSnapshot`含む）
- final-world.json 0.3.0の必須フィールドと人物状態検証（`weeklyTrainingSidecars`＋`battleResults`含む）
- 旧版reader互換、run-metadata／initial-worldの全決定的入力がある場合だけの明示文書migration、入力不足時とlegacy final-worldのread-only維持
- 未知文書schemaVersion拒否
- simulationIdentityHashとsimulationId再計算一致（sidecar hash差分を含む）
- initial-world.jsonへRunRuleSnapshotを正確に1件保存し、`initialWeeklyTrainingSidecarSnapshot`全文を投影
- RunRuleSnapshot hash再計算一致
- 戦闘0件runでもsnapshotあり
- 複数戦闘で完全設定・完全技カタログを試合ごとに複製しない
- run-metadataのeventEnvelopeSchemaVersionと全EventEnvelope行が一致
- 0.1.0／0.2.0混在runをrename前検証で拒否
- 同一条件でSimulationIdentityとRunRuleSnapshot全文一致
- final-worldのsprint1StateSchemaVersion／currentMental／techniqueStates／learningFocusTechniqueId／weeklyTrainingSidecars／battleResultsがsame seedで全文一致
- validation-report／same-seed比較がsidecar全文およびbattleResults全文を含むこと
- legacy final-worldへSprint 1フィールドを暗黙追記しない

## 14. 対象外

グラフ、Webダッシュボード、MySQL保存、ゲーム性の自動断定、NPC上限確定、戦闘ログ容量実測。

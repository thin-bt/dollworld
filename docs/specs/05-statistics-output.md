# 05 長期実行・統計・出力ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.4`

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
- simulationId：00ミニ仕様の固定文字列・順序から決定的に生成。
- 決定性比較ではrun-id、現実時刻、性能値、パスを除外。

## 4. `run-metadata.json`

- runId、simulationId
- SPEC、ミニ仕様、技術決定、設定、名前データの各バージョン
- configHash、nameDataHash、seed、RNGアルゴリズム版、実行年数・週数
- コミットID（取得可能時）
- 現実の開始・終了時刻
- 正常／異常終了
- 7ファイルの一覧

## 5. `initial-world.json`

初期世界スナップショット全文とgenerationSummaryを保持する。世界1年4月第1週、年初処理反映済み。再読込・不変条件検証可能であること。

## 6. `final-world.json`

- 最終世界日時
- 全人物（存命・死亡済み）
- 家系、流派、関係
- 最終イベントsequence
- configHash、seed、simulationId
- 参照整合性結果

100年実行時は4,800週後、世界101年4月第1週。

## 7. `yearly-statistics.csv`

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

## 8. `events.jsonl`

03-event-envelope準拠、sequence順、UTF-8、1行1件。何も起きない週は出力不要。

## 9. `validation-report.json`

- 検証名、合否、違反件数
- 対象ID、理由、重大度
- 継続可否
- 壊れた参照・循環・年齢・状態・同一シード比較結果

参照不整合と再現性違反は失敗。

## 10. `performance.json`

- 実行環境のNode・OS・CPU情報（取得可能範囲）
- 総処理時間
- 1年・1週あたり平均
- 最大メモリ
- 人物数、週数、イベント数、出力容量
- 性能警告基準との比較

性能基準超過は警告であり、機能不整合がなければSprint 0失敗にはしない。

## 11. 決定性比較

同一設定・シード・仕様版・名前版・RNG版・実装コミットで以下が一致：initial-worldの決定的項目、events全行、yearly-statistics全行、final-worldの決定的項目、simulationId。

除外：run-id、現実日時、処理時間、メモリ、パス、環境情報。

## 12. 受入テスト

1. 7ファイルを生成。
2. 100年でCSV100行。
3. initial／finalを再読込し検証可能。
4. 同条件2実行の決定的出力一致。
5. 異なるシードで初期または最終世界が異なる。
6. 壊れた参照を対象ID付きで出力。
7. 300年でもファイル破損なし。
8. final日時が指定年数と一致。
9. イベントsequenceが連続・重複なし。

## 13. 対象外

グラフ、Webダッシュボード、MySQL保存、ゲーム性の自動断定、NPC上限確定、戦闘ログ容量実測。

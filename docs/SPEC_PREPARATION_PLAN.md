# 実装前仕様の準備計画

## Sprint 0

| ミニ仕様 | 状態 |
|---|---|
| 00 ドメイン用語・共通型 | 作成・監査済み |
| 01 世界暦・一斉加齢 | 作成・監査済み |
| 02 設定スキーマ | 作成・監査済み |
| 03 イベント共通形式 | 作成・監査済み |
| 04 初期世界生成 | 作成・監査済み |
| 05 統計・固定出力 | 作成・監査済み |
| 06 名前データ | 作成・監査済み |
| 07 Seeded RNG | 作成・監査済み |

## Sprint 1

| ミニ仕様 | 状態 |
|---|---|
| 08 人物能力・成長 | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 09 技データ・習得 | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 10 週間行動・訓練・習得処理 | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 11 戦闘開始状態 | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 12 戦闘ターン解決 | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 13 戦闘終了・結果・ログ | 作成・受入監査済み（`S1-SPEC-0.1.20`） |
| 14 Sprint 1共通設定スキーマ | 作成・受入監査済み（`S1-SPEC-0.1.20`） |

### Sprint 1準備状況

| 項目 | 状態 |
|---|---|
| 正本`SPEC-0.1.2` | 確定 |
| ミニ仕様08〜14（`S1-SPEC-0.1.20`） | 仕様定義済み・受入監査済み（S01-008 integration contractsを`S1-SPEC-0.1.20`、post-start execution abortを`S1-SPEC-0.1.19`、BattleResult決定的契約を`S1-SPEC-0.1.18`で明文化。戦闘開始`sourceSnapshot` baselineは`S1-SPEC-0.1.17`、`BattleActionLog.movementChance`は`S1-SPEC-0.1.16`、移動状態補正は`S1-SPEC-0.1.15`、ターン入力契約は`S1-SPEC-0.1.14`、MatchId generator契約は`S1-SPEC-0.1.13`、週間処理契約は`S1-SPEC-0.1.12`で明文化済み） |
| LLM Wiki同期 | 同期済み |
| 実装バックログ | 定義済み（`docs/SPRINT_1_BACKLOG.md`、S01-001〜S01-009） |
| S01-001 ドメイン型・設定基盤 | **実装完了**（master統合済み） |
| S01-002 人物能力・成長状態 | **実装完了**（master統合済み） |
| S01-003 技カタログ・熟練度・習得状態 | **実装完了**（master統合済み） |
| S01-004 週間行動・訓練・技習得 | **implemented / accepted**（週間処理。Sprint1 transactional adapter配線はS01-008でproduction実装済み） |
| S01-005 戦闘開始・BattleState生成 | **implemented / accepted**（MatchId生成器・RunRuleSnapshot・開始トランザクション。World commit配線はS01-008でproduction実装済み） |
| S01-006 戦闘ターン解決 | **implemented / accepted**（productionターンResolver・`movementChance`・ActionLog完全検証。battle commit配線はS01-008でproduction実装済み） |
| S01-007 戦闘終了・結果・ログ | **implemented / accepted**（受入完了commit `a39e476`。World commitはS01-008でproduction実装済み） |
| S01-008 WorldEngine・CLI・出力統合 | **implemented / accepted**（受入完了commit `7c47847`。`createSprint1RunSession`／`runSprint1WeeklyStep`／`runSprint1Years`／`commitRunBattlePlan`／weekly-training adapter／CLI `--sprint1-input`／fixed7 Sprint1 writers） |
| S01-009 Sprint 1総合受入検証 | **pending**／未着手（実装前clarifier確定。`verify:sprint1`／長期・性能・統合シナリオ・completion report契約定義済み） |
| Sprint 1全体 | **未完了**（S01-008 accepted。S01-009 pending／未着手） |

**S01-008**（WorldEngine・CLI・出力統合）はproduction実装・受入完了済み（commit `7c47847`）。S01-001〜S01-008はimplemented／accepted。S01-009は実装前clarifier確定・未着手。Sprint 1全体は未完了。統合契約は `S1-SPEC-0.1.20` で明文化済み（`weekly-training` adapter／`Sprint1RunRuntimeState`＋`eventStream`／`EventAllocationState`／fresh initialization promotion／sidecar identity／`--sprint1-input`／SimulationIdentity 0.4.0／run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0）。post-start execution abort契約は `S1-SPEC-0.1.19`、BattleResult決定的契約は `S1-SPEC-0.1.18`。S01-004〜007の純粋関数に加え、WorldEngine／CLI配線は **S01-008** で実装済み。

Sprint 1実装時は、正本`SPEC-0.1.2`、本表の08〜14、`docs/SPRINT_1_BACKLOG.md`、および00／02／03／05／07へのSprint 1統合記述を参照する。

## Sprint 2前

大会カレンダー、形式、出場資格、組合せ、ランク・オープンクラス、昇格、延期・集約。

## Sprint 3前

師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝。

## Sprint 4前

引退、寿命・死亡、恋愛・結婚、近親判定、出生率、遺伝、父系・母系所属、断絶・再興。

## ミニ仕様完了条件

入力、出力、状態更新、処理順、設定、不変条件、対象外、受入テストが明記されていること。

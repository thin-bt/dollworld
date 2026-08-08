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
| 08 人物能力・成長 | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 09 技データ・習得 | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 10 週間行動・訓練・習得処理 | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 11 戦闘開始状態 | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 12 戦闘ターン解決 | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 13 戦闘終了・結果・ログ | 作成・受入監査済み（`S1-SPEC-0.1.19`） |
| 14 Sprint 1共通設定スキーマ | 作成・受入監査済み（`S1-SPEC-0.1.19`） |

### Sprint 1準備状況

| 項目 | 状態 |
|---|---|
| 正本`SPEC-0.1.2` | 確定 |
| ミニ仕様08〜14（`S1-SPEC-0.1.19`） | 仕様定義済み・受入監査済み（post-start execution abortを`S1-SPEC-0.1.19`、BattleResult決定的契約を`S1-SPEC-0.1.18`で明文化。戦闘開始`sourceSnapshot` baselineは`S1-SPEC-0.1.17`、`BattleActionLog.movementChance`は`S1-SPEC-0.1.16`、移動状態補正は`S1-SPEC-0.1.15`、ターン入力契約は`S1-SPEC-0.1.14`、MatchId generator契約は`S1-SPEC-0.1.13`、週間処理契約は`S1-SPEC-0.1.12`で明文化済み） |
| LLM Wiki同期 | 同期済み |
| 実装バックログ | 定義済み（`docs/SPRINT_1_BACKLOG.md`、S01-001〜S01-009） |
| S01-001 ドメイン型・設定基盤 | **実装完了**（master統合済み） |
| S01-002 人物能力・成長状態 | **実装完了**（master統合済み） |
| S01-003 技カタログ・熟練度・習得状態 | **実装完了**（master統合済み） |
| S01-004 週間行動・訓練・技習得 | **実装完了**（週間Processor。WorldEngine登録はS01-008） |
| S01-005 戦闘開始・BattleState生成 | **実装完了**（MatchId生成器・RunRuleSnapshot・開始トランザクション。WorldEngine登録はS01-008） |
| S01-006 戦闘ターン解決 | **実装完了**（productionターンResolver・`movementChance` production・ActionLog完全検証。BattleResult完成はS01-007、WorldEngine登録はS01-008） |
| Sprint 1全体 | **未完了**（S01-007〜S01-009は未着手） |

次の実装着手タスクは **S01-007**（戦闘終了・結果・ログ・戦闘後効果）。S01-001〜S01-006は実装済み。post-start execution abort契約は `S1-SPEC-0.1.19`、BattleResult決定的契約は `S1-SPEC-0.1.18` で明文化済み。戦闘開始`sourceSnapshot` baselineは `S1-SPEC-0.1.17` で明文化済み。`BattleActionLog.movementChance`は `S1-SPEC-0.1.16` で明文化済みで、production実装はS01-006で完了した。移動状態補正（`moverStateModifier`／`opponentStateModifier`）は `S1-SPEC-0.1.15` で明文化済み。ターン入力契約（`replacementReason`／`battle-action-script-0.1.0`／技使用回数）は `S1-SPEC-0.1.14` で明文化済み。MatchId generator契約は `S1-SPEC-0.1.13` で明文化済みで、production実装はS01-005で完了した。S01-004の週間Processor、S01-005の戦闘開始、S01-006のターンResolverはいずれも純粋関数として実装済みであり、WorldEngineへの登録は **S01-008** で行う。BattleResult完成とWorldEngine接続は未実装。

Sprint 1実装時は、正本`SPEC-0.1.2`、本表の08〜14、`docs/SPRINT_1_BACKLOG.md`、および00／02／03／05／07へのSprint 1統合記述を参照する。

## Sprint 2前

大会カレンダー、形式、出場資格、組合せ、ランク・オープンクラス、昇格、延期・集約。

## Sprint 3前

師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝。

## Sprint 4前

引退、寿命・死亡、恋愛・結婚、近親判定、出生率、遺伝、父系・母系所属、断絶・再興。

## ミニ仕様完了条件

入力、出力、状態更新、処理順、設定、不変条件、対象外、受入テストが明記されていること。

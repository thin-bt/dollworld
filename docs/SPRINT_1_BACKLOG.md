# Sprint 1 バックログ：成長・技・週間処理・戦闘

- バックログバージョン：`S1-BACKLOG-0.1.0`
- 対象ゲーム仕様：`SPEC-0.1.2`
- 対象Sprint 1ミニ仕様：`S1-SPEC-0.1.20`
- `S1-SPEC-0.1.11`初期確定commit：`2800d3b959e575f57660c27b344507dd0e38ddb6`
- `S1-SPEC-0.1.20`統合契約確定commit：`d28d666`
- 実装状態：
  - S01-001〜S01-009 **implemented / accepted**（S01-007受入完了commit `a39e476`。S01-008受入完了commit `7c47847`。S01-009受入完了commit `5616f5f`、2026-08-11 ChatGPT再監査）
  - Sprint 1: **COMPLETE**（S01-001〜S01-009 accepted）。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）
- `S1-SPEC-0.1.20`はS01-008 integration contracts clarification（`weekly-training` adapter ID／production adapter pipeline`[weekly-training]`／`Sprint1RunRuntimeState`＋`eventStream`／`EventAllocationState`／fresh initialization promotion／`InitialWeeklyTrainingSidecarSnapshot`／SimulationIdentity `0.4.0`＋`initialWeeklyTrainingSidecarHash`／CLI `--sprint1-input`／run-metadata `0.4.0`／initial-world `0.4.0`／final-world `0.3.0`）。BattleState schema `0.6.0`。先行clarificationとして`S1-SPEC-0.1.19` post-start abort、`S1-SPEC-0.1.18` BattleResult決定契約、`S1-SPEC-0.1.17` sourceSnapshot baselineがある
- 実装順序の正本: S01-008 accepted → S01-009 accepted → Sprint 1 clean-tree完了検証 → `sprint1-complete`

## 目的

Sprint 1仕様08〜14に基づき、人物能力・成長、技カタログ・熟練度、週間訓練・習得、1対1戦闘の開始・ターン解決・結果／ログ、およびそれらを WorldEngine／CLI／固定7ファイルへ統合する実装を、依存関係が明確なタスクへ分割する。

## 固定完了条件（Sprint 1全体）

次をすべて満たしたとき、Sprint 1実装を完了とする。個別条件の詳細は各タスクの受入条件を正とする。

- S01-001〜S01-009が受入完了している
- 同一seedで決定的結果が一致し、異seedで意図した差分が出る
- Sprint1Config／TechniqueCatalog／SimulationIdentity／canonical JSON／hash契約が正本どおり
- 週間処理・技習得・戦闘開始・ターン解決・BattleResult・ログ・戦闘後効果が正本どおり
- 固定7ファイルを増減せず、Sprint 0既存`simulationId`を再計算して置換しない
- 通常の引き分け（draw）状態を BattleResult に作らない
- `npm run check`が成功する
- 大会日程・試合編成・賞金・昇格・Web・MySQL永続化を実装していない

## タスク一覧

| ID | タスク | 依存 |
|---|---|---|
| S01-001 | Sprint 1ドメイン型・設定基盤 | なし |
| S01-002 | 人物能力・成長状態 | S01-001 |
| S01-003 | 技カタログ・熟練度・習得状態 | S01-001、S01-002 |
| S01-004 | 週間行動・訓練・技習得 | S01-002、S01-003 |
| S01-005 | 戦闘開始・BattleState生成 | S01-001、S01-002、S01-003 |
| S01-006 | 戦闘ターン解決 | S01-005 |
| S01-007 | 戦闘終了・結果・ログ・戦闘後効果 | S01-006 |
| S01-008 | WorldEngine・CLI・出力統合 | S01-004、S01-007 |
| S01-009 | Sprint 1総合受入検証 | S01-008 |

個別条件の正本は本ファイルの各タスク節である。Wikiの `docs/wiki/tasks/S01-xxx.md` は説明・索引であり、正本ではない。

## 実装順と依存関係

```text
S01-001（共有保存型・Sprint1Config）
  ↓
S01-002（Sprint1PersonStateへの保持）
  ↓
S01-003（カタログ・技状態の意味的validation）
  ↓
S01-004

S01-001 + S01-002 + S01-003
       ↓
S01-005
       ↓
S01-006
       ↓
S01-007

S01-004 + S01-007
       ↓
S01-008
       ↓
S01-009
```

### 共有型の所有境界

| 型・責務 | 所有タスク |
|---|---|
| `TechniqueId` | S01-001 |
| `PersonTechniqueState`の保存構造 | S01-001 |
| `Sprint1PersonState`の組立・保持・初期化 | S01-002 |
| `TechniqueCatalog`および`PersonTechniqueState`の意味的validation | S01-003 |

隠れた所有循環はない。

- S01-002はS01-003所有の保存型を必要としない（保存型はS01-001）
- S01-003は`PersonTechniqueState`保存型を再定義しない

### S01-002とS01-003の並行可否

完全並行は行わない。

根拠:

- S01-001で共有保存型（`TechniqueId`／`PersonTechniqueState`保存構造等）を確定する
- S01-002で人物状態（`Sprint1PersonState`）への保持・初期化・構造不変条件を実装する
- S01-003でカタログと技状態の意味的整合を実装する
- S01-003はS01-002の人物一時状態（疲労・負傷等）を使うため、S01-002完了前に受入単位として閉じられない
- 09の習得・熟練度処理は08の疲労・負傷等を使用するため、順序は`S01-001 → S01-002 → S01-003`を維持する
- 型の重複定義、仮型、後続タスクの先行実装は禁止する

許容する部分先行:

- `TechniqueDefinition`／`TechniqueCatalog`の調査・下書きはS01-001完了後に可能
- 受入単位としてのS01-003完了はS01-002完了後とする
### タスク数について

上記9タスクを維持する。分割・統合は行わない。各タスクは1ブランチで実装・検証・監査可能な粒度とする。

## Sprint 1で実装する状態変化（概要）

- 人物能力・適性・潜在・成長・疲労／負傷等の一時状態
- 技カタログ・熟練度・習得状態
- 週間Plannerによる訓練／技習得／技練習／休養
- 1対1戦闘の開始・ターン解決・決着・結果・ログ・戦闘後効果のWorld反映
- Sprint1Config、SimulationIdentity拡張、固定7ファイルへの必要最小統合

## Sprint 1で実装しないもの

大会カレンダー、試合編成、賞金、昇格、師匠選択の新規ロジック拡張（既存師弟関係の利用範囲は10を正とする）、恋愛・結婚・出産・遺伝、新規死亡、Web、MySQL永続化、通常の引き分け（draw）状態、仕様にないprocessor名・モジュール配置の独自確定。

## 既存実装の利用前提（確定済み領域）

次はSprint 0で実装済みであり、Sprint 1はこれを破壊せず拡張する。

- `packages/simulation-core` の公開型（`AbilityKey`／`AptitudeKey`、Person、ID、EventEnvelope等）
- canonical JSON／`Sha256Provider`／設定検証
- seeded RNG（`xoshiro128ss-v1`）
- WorldEngine／processor runtime
- `apps/simulator` のヘッドレスCLIと固定7ファイル出力
- Sprint 0の`simulationId`材料式（既存値の再計算置換は禁止）

---

## S01-001 Sprint 1ドメイン型・設定基盤

### 目的

Sprint 1で必要な公開型、Sprint1Config、validation、canonical化、config hash、SimulationIdentity.specVersions拡張の基盤を用意する。あわせて、後続人物状態が参照する`PersonTechniqueState`の**保存構造**を共有型として確定する。週間処理や戦闘計算、技カタログの意味処理は実装しない。

### 対象仕様

- `docs/specs/00-domain-glossary.md`
- `docs/specs/02-config-schema.md`
- `docs/specs/03-event-envelope.md`
- `docs/specs/05-statistics-output.md`
- `docs/specs/07-seeded-rng.md`（契約参照。RNGアルゴリズム再実装はしない）
- `docs/specs/09-technique-system.md`（人物側技状態の**保存構造**定義のみ。カタログ・習得・熟練度の意味処理はS01-003）
- `docs/specs/14-sprint1-config-schema.md`
- Battle関連の共有IDなど、本タスクが公開する参照型に必要な定義（詳細生成・解決はS01-005以降）

仕様版はすべて`S1-SPEC-0.1.20`。

`PersonTechniqueState`の保存構造の所有は本タスク（S01-001）とする。09全体を本タスクで実装しない。

### 依存タスク

なし。Sprint 0公開型・canonical JSON・hash基盤を利用する。

### 実装対象

- Sprint 1で必要な公開型（Ability／Aptitudeとの既存型共有を維持）
- `TechniqueId`
- `PersonTechniqueState`の保存構造（09仕様どおり。本タスクが所有する）

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

- `learningFocusTechniqueId`が参照する共有型（`TechniqueId | null`）
- `Sprint1PersonState`から参照するために必要な最小共有型
- JSON保存・clone／freezeに必要な構造的契約（保存フィールドの型境界）
- Battle関連ID・状態の骨格型（詳細生成・解決はS01-005以降）
- Sprint1Configの型・読込・明示的validation
- canonical化とconfig hash
- SimulationIdentity.specVersions（main / sprint0 / sprint1）と関連schemaVersion契約
- 公開APIへの必要最小export

### 実装対象外

- TechniqueCatalog
- TechniqueDefinitionの完全validation
- カタログ内TechniqueIdの参照整合
- 習得条件判定
- 熟練度計算
- catalog hash
- 週間更新（訓練・習得計算を含む）
- 戦闘開始・ターン解決・BattleResult生成
- WorldEngine統合・CLI変更・固定7ファイル内容のSprint 1本統合（S01-008）
- 大会・昇格・賞金・Web・MySQL
### 変更を想定する既存領域

- `packages/simulation-core/**`（型・config・canonical／hash・公開export）
- 本タスクで追加するテスト

ファイル名・クラス名は既存構造から確定できるもの（例: `AbilityKey`、`AptitudeKey`、`canonicalize`／`toCanonicalJson`、`Sha256Provider`）のみを前提とし、未存在パスを確定事項として扱わない。

### 新規公開APIの有無

あり。Sprint1ConfigおよびSprint 1共有型・validation／hash契約の公開が必要。具体的な関数名・モジュール分割は実装時に既存export方針へ合わせ、正本にない名前を本バックログで確定しない。

### データ互換性

- Sprint 0既存run／`simulationId`を再計算して置換しない
- Sprint 1新規run向けIdentity／config契約を追加する
- legacy読込契約は02・05・00の記述を正とする

### RNGへの影響

なし（本タスクはRNG消費処理を追加しない）。戦闘RNG・週間RNGの契約型が必要な場合でも消費順実装は後続タスクとする。

### canonical化／hashへの影響

あり。Sprint1Configのcanonical JSONとconfig hashを正本どおり実装する。TechniqueCatalog hashの本実装はS01-003。

### 固定7ファイルへの影響

なし（スキーマ・型・hash契約の準備のみ。出力内容の本統合はS01-008）。

### 必須テスト

- Sprint1Configの正常系・未知キー拒否・境界値
- config canonical化がキー順・空白・改行に左右されないこと
- 注入`Sha256Provider`によるconfig hash材料の一致
- SimulationIdentity.specVersionsの必須値（`SPEC-0.1.2`／`S0-SPEC-0.1.5`／`S1-SPEC-0.1.20`）
- AbilityKey／AptitudeKeyがSprint 0公開型と一致すること（`martial`不使用）
- `PersonTechniqueState`の保存構造が09仕様の全項目を持つこと
- 整数／nullの型境界（各フィールド）
- clone／freeze可能なJSON互換構造であること
- `TechniqueId`が既存ID方針と整合すること
- この段階ではカタログ参照整合や習得計算を行わないこと

### 受入条件

- 14および関連00／02／05の対象受入を満たす
- 09の人物側技状態**保存構造**が共有型として確定している（カタログ・習得・熟練度の意味処理は含まない）
- 週間処理・戦闘計算・TechniqueCatalogを含まない
- `simulation-core`が禁止された実行時依存を新規追加しない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`の完了報告形式。変更ファイル、追加テスト、実行コマンド、仕様との差異、未解決事項、次タスクへの影響。

### 次タスクへの引渡し事項

- Sprint1Config検証済み値とhash契約
- `TechniqueId`および`PersonTechniqueState`保存構造
- Battle関連の共有型
- SimulationIdentity.specVersionsの利用方法
- S01-002が`Sprint1PersonState`へ組み込む保存型境界
- S01-003が意味的validationを接続する入口（保存型の再定義はしない）
---

## S01-002 人物能力・成長状態

### 目的

08に基づく人物能力・適性・潜在・成長、および後続が必要とする疲労・負傷等の人物一時状態を、clone／freeze／validation／canonical順とともに実装する。

### 対象仕様

- `docs/specs/08-character-growth.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/14-sprint1-config-schema.md`（growth／temporaryCondition）

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-001

### 実装対象

- 08の人物能力・aptitude・potential・growth
- 疲労・負傷・調子・自信・currentMental等、後続処理が必要とする人物一時状態
- `Sprint1PersonState`（08）
- `techniqueStates`配列の保持（保存要素型はS01-001で確定した`PersonTechniqueState`を使用する）
- `learningFocusTechniqueId`
- 初期化adapter
- 人物状態全体のclone／freeze
- `techniqueStates`の配列順・TechniqueId重複など、08が要求する人物構造上の不変条件
- world hash／canonical対象への組み込み準備

`techniqueStates`の保存要素型はS01-001で確定した`PersonTechniqueState`を使用する。S01-002は`Sprint1PersonState`への保持・初期化・clone／freeze・配列構造不変条件を担当し、技カタログとの意味的整合と習得・熟練度規則はS01-003へ引き渡す。

### 実装対象外

- `PersonTechniqueState`各値の習得・熟練度上の意味判定
- TechniqueCatalogとの参照整合
- `learningProgressRequired`との上限照合
- 技習得条件
- catalog hash
- 熟練度更新
- 週間Planner本体（S01-004）
- 戦闘開始・ターン解決（S01-005以降）
- 大会・昇格・賞金
- `PersonTechniqueState`保存型の再定義（S01-001所有）
### 変更を想定する既存領域

- `packages/simulation-core/**`（Person／能力関連の既存型と整合する拡張）
- 本タスクで追加するテスト

未存在のファイルパスを確定事項として記載しない。08が「物理的なTypeScript配置は既存Person公開型との統合監査で決める」としている点に従う。

### 新規公開APIの有無

あり。人物成長・一時状態の構築／検証／clone／freezeに必要な公開面。関数名は実装時に既存方針へ合わせる。

### データ互換性

- 新規Sprint 1 runの初期化adapter契約（08）に従う
- archived final-worldの暗黙継続利用・暗黙再採番を行わない
- Sprint 0既存人物必須項目を破壊しない

### RNGへの影響

成長計算のRNG契約が08に含まれる範囲の型・純関数準備は可。週間行動からの実消費統合はS01-004。

### canonical化／hashへの影響

あり。`sprint1StateSchemaVersion`／`currentMental`／`techniqueStates`／`learningFocusTechniqueId`等、08がworld hash対象とする項目をcanonical順へ含める準備を行う。

### 固定7ファイルへの影響

なし（本統合はS01-008）。型と検証が出力スキーマ変更を要する箇所は契約のみ準備する。

### 必須テスト

- 能力・適性キーと数値範囲
- 年齢帯成長係数（42歳以上0を含む）
- 負傷度から負傷段階への導出
- 一時状態および`Sprint1PersonState`のvalidation／clone／freeze
- `techniqueStates`の配列順・TechniqueId重複なし等、08の構造不変条件
- 初期化adapterがRNG非消費・イベント非生成であること
- 不正必須値を中立値で補完しないこと
- カタログ参照整合・習得／熟練度の意味判定を本タスクで行わないこと

### 受入条件

- 08の対象受入を満たす（技カタログ意味処理を除く）
- S01-001の`PersonTechniqueState`保存型を再定義せず使用している
- 週間Planner・戦闘・カタログ意味的validationを含まない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。特に`Sprint1PersonState`境界と、S01-003へ渡す構造受け口。

### 次タスクへの引渡し事項

- 検証済み人物成長・一時状態
- `Sprint1PersonState`の保持・初期化・構造不変条件契約
- S01-003が意味検証を接続する技状態の受け口
- S01-004が更新してよい人物項目の境界

---

## S01-003 技カタログ・熟練度・習得状態

### 目的

09に基づくTechniqueDefinition／TechniqueCatalog、熟練度・effectiveMastery、習得条件、基本攻撃プロファイル参照、および人物技状態の**意味的**validationを実装する。`PersonTechniqueState`の保存型は再定義せず、S01-001の保存型とS01-002の`Sprint1PersonState`を接続する。

### 対象仕様

- `docs/specs/09-technique-system.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/08-character-growth.md`（人物一時状態・`Sprint1PersonState`との接続。保存型の再定義はしない）
- `docs/specs/14-sprint1-config-schema.md`（techniqueLearning／techniqueBalance／basicAttackProfiles）

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-001（`TechniqueId`／`PersonTechniqueState`保存型／Sprint1Config）
- S01-002（`Sprint1PersonState`と疲労・負傷等の人物状態）

S01-003は両者を接続して技状態の意味的validationを閉じる。保存型の再定義は行わない。

### 実装対象

- TechniqueDefinition／TechniqueCatalog／TechniqueCategory
- PersonTechniqueStateの意味的validation（保存型はS01-001を使用）
- カタログ参照整合
- `learningProgressTenths`の技別上限
- `masteryHundredths`およびeffectiveMasteryとして扱う値
- 習得条件
- カタログ／技状態固有のcanonical化とcatalog hash
- 人物状態とカタログのcross-validation
- clone／freeze処理のうち技カタログ・技状態固有部分
- 基本攻撃プロファイル（Sprint1Config側。カタログへ混在させない）

### 実装対象外

- `PersonTechniqueState`保存型の再定義（S01-001所有）
- `Sprint1PersonState`の組立・初期化adapter本体（S01-002）
- 週間行動による習得進捗・練習の適用（S01-004）
- 戦闘での技使用・命中・ダメージ（S01-006）
- WorldEngine統合（S01-008）
- 大会・昇格・賞金

### 変更を想定する既存領域

- `packages/simulation-core/**`
- 本タスクで追加するテスト
- S01-001のSprint1ConfigのうちbasicAttackProfiles／technique系設定との接続

### 新規公開APIの有無

あり。カタログ読込・検証・hash、技状態検証の公開が必要。未存在モジュール名は確定しない。

### データ互換性

- `TechniqueCategory`／`BasicAttackProfile`／`AptitudeKey`を`unarmed | sword | magic`で統一し、`martial`と暗黙対応を設けない
- 基本攻撃はカタログhashへ混ぜずSprint1Config hashへ含める（09・14）

### RNGへの影響

熟練度RNG係数などの契約参照は可。週間／戦闘での実消費はS01-004／S01-006。

### canonical化／hashへの影響

あり。TechniqueCatalogのTechniqueId昇順canonical化とcatalog hash。意味的validation後の技状態整合。配列順・重複なしの人物構造不変条件自体はS01-002、カタログとの意味整合は本タスク。

### 固定7ファイルへの影響

なし（本統合はS01-008）。RunRuleSnapshotへカタログを載せる契約の準備のみ可。

### 必須テスト

- TechniqueDefinition必須項目・範囲・配列正規化
- catalog hashの決定性
- mastery表示と`masteryHundredths`の対応
- 習得条件判定（前提技・必要能力等）
- カタログ参照整合と`learningProgressTenths`技別上限
- 人物状態とカタログのcross-validation
- 疎配列（全カタログゼロ埋め禁止）
- `PersonTechniqueState`保存型を再定義していないこと
- `martial`拒否／`unarmed|sword|magic`一致

### 受入条件

- 09の対象受入を満たす（保存構造の所有はS01-001、人物組立はS01-002）
- 週間適用・戦闘使用を含まない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。カタログidentityと、S01-001保存型／S01-002人物状態への接続結果。

### 次タスクへの引渡し事項

- 検証済みカタログとhash
- 意味的に検証済みの技状態操作境界（保存型はS01-001のまま）
- S01-004／S01-005が参照する技定義・使用条件の入口

---

## S01-004 週間行動・訓練・技習得

### 目的

10に基づく週間Plannerと、train／learnTechnique／practiceTechnique／rest、師匠あり／独学、成長・熟練度進捗、疲労等の週間更新を、決定的RNGのもと純関数として実装し、processor統合に必要な形へ整える。

### 対象仕様

- `docs/specs/10-training-and-learning.md`
- `docs/specs/08-character-growth.md`
- `docs/specs/09-technique-system.md`
- `docs/specs/07-seeded-rng.md`
- `docs/specs/14-sprint1-config-schema.md`（weeklyPlanner／techniqueLearning／growth／temporaryCondition）

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-002
- S01-003

### 実装対象

- 週間Planner
- train／learnTechnique／practiceTechnique／rest
- 師匠あり／独学の判定と進捗
- 成長・熟練度の週間更新
- 疲労等の週間更新
- 決定的RNG消費順
- processorへ載せるために必要な純粋処理（WorldEngine本統合はS01-008）

### 実装対象外

- 大会日程、試合編成、賞金、昇格
- 戦闘開始・ターン解決
- CLI／固定7ファイルの本統合（S01-008）
- 師匠選択の新規ライフサイクル拡張（10の対象外に従う）

### 変更を想定する既存領域

- `packages/simulation-core/**`（processorに載せる純関数を含む）
- 本タスクで追加するテスト

### 新規公開APIの有無

あり。週間処理の純関数入口。processor登録の最終配線はS01-008でも可とするが、本タスクで純関数の受入を完了させる。

### データ互換性

- deceased／waiting／stopped等、10が週次更新しない対象を更新しない
- Sprint 0暦・加齢処理を破壊しない

### RNGへの影響

あり。週間処理のRNG消費順を正本どおり固定する。`Math.random()`禁止。

### canonical化／hashへの影響

間接的。更新後人物状態がcanonical／world hash対象として整合すること。

### 固定7ファイルへの影響

なし（イベント種類の追加準備は可。出力本統合はS01-008）。

### 必須テスト

- Planner候補決定の決定性
- 訓練／習得／練習／休養の数値更新
- 師匠あり／独学の分岐
- RNG消費順の同一seed一致
- 非更新対象人物が変わらないこと
- 不正状態を黙って補完しないこと

### 受入条件

- 10の対象受入を満たす
- 大会・戦闘を含まない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。RNG消費順とS01-008へ渡すprocessor境界。

### 次タスクへの引渡し事項

- 週間純関数の入力／出力契約
- 発生しうるイベント候補の種類
- S01-008がWorldEngineへ登録すべき順序上の前提

---

## S01-005 戦闘開始・BattleState生成

### 目的

11に基づき、戦闘入力、開始前validation、MatchId、戦闘専用RNG、BattleParticipantSnapshot、BattleState、currentMental規則、初期間合い、開始失敗時の非消費保証、元World人物を変更しないsnapshot生成を実装する。

### 対象仕様

- `docs/specs/11-battle-state.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/07-seeded-rng.md`
- `docs/specs/09-technique-system.md`
- `docs/specs/08-character-growth.md`
- `docs/specs/14-sprint1-config-schema.md`（battle）

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-001
- S01-002
- S01-003

### 実装対象

- 戦闘入力と開始前validation
- MatchId（`S1-SPEC-0.1.13` の `match-id-generator-0.1.0` 契約を実装する）
- 戦闘専用RNG（World RNGからのbattleSeed等、11の契約）
- BattleParticipantSnapshot／BattleState
- currentMental規則（範囲外は開始前失敗。clamp補正禁止）
- 初期間合い
- 開始失敗時の非消費保証
- 元World人物を変更しないsnapshot生成

### 実装対象外

- ターン解決（S01-006）
- 最終BattleResult・判定・詳細ログ完成（S01-007）
- WorldEngine本統合（S01-008）
- 大会・昇格・賞金

### 変更を想定する既存領域

- `packages/simulation-core/**`
- 本タスクで追加するテスト

### 新規公開APIの有無

あり。戦闘開始の純関数入口。未存在モジュール名は確定しない。

### データ互換性

- World人物の直接書き換え禁止（snapshot経由）
- 開始失敗時にWorld RNG／MatchId生成器状態を消費したまま残さない（11）

### RNGへの影響

あり。戦闘開始時のseed派生と失敗時ロールバック／非消費を正本どおり。

### canonical化／hashへの影響

BattleState／ルール参照hashなど11・14が求める範囲の準備。最終commit planはS01-007／S01-008と整合。

### 固定7ファイルへの影響

なし（本統合はS01-008）。

### 必須テスト

- 正常開始でBattleStateが生成されること
- currentMental範囲外で開始失敗しclampしないこと
- 開始失敗でRNG／ID生成器が消費されないこと
- snapshotが元人物を変更しないこと
- MatchId／battleSeedの決定性

### 受入条件

- 11の対象受入を満たす
- ターン解決を含まない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。開始失敗時保証とS01-006へ渡すBattleState契約。

### 次タスクへの引渡し事項

- 検証済みBattleState
- 戦闘RNG初期状態
- 参加者snapshotの不変条件

---

## S01-006 戦闘ターン解決

### 目的

12に基づき、行動決定・優先度・間合い移動・技選択／使用可否・命中・ダメージ・精神消費・耐久・消耗補正・ターン更新・決着候補判定・RNG消費順・丸め順を実装し、部分更新を残さない。

### 対象仕様

- `docs/specs/12-battle-turn-resolution.md`
- `docs/specs/11-battle-state.md`
- `docs/specs/09-technique-system.md`
- `docs/specs/07-seeded-rng.md`
- `docs/specs/14-sprint1-config-schema.md`（battle）

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-005

### 実装対象

- 行動決定と優先度
- 間合い移動
- 技選択・使用可否
- 命中・ダメージ・精神消費・耐久値
- 消耗補正
- ターン更新
- 決着候補判定（最終結果確定はS01-007）
- RNG消費順・丸め順
- 部分更新を残さない処理（失敗時に中途状態を確定保存しない）
- `S1-SPEC-0.1.14`の`BattleActionReplacementReason`／`battle-action-script-0.1.0`／技使用回数（`attemptedUseCount`／`successfulUseCount`）契約
- `S1-SPEC-0.1.15`の移動状態補正（`moverStateModifier`／`opponentStateModifier`。`battle.actionOrder`係数共用）契約
- `S1-SPEC-0.1.16`の`BattleActionLog.movementChance`（floor整数パーセント0..100、判定時双方non-null／非movement時双方null、RNG非消費）契約
- `S1-SPEC-0.1.17`の戦闘開始`sourceSnapshot` baseline（常時hash検証・不変／可変分離。最終状態検証baselineはsourceSnapshot＋BattleDetailedLog）

### 実装対象外

- 最終BattleResultの完成、判定配点の確定適用、概要／詳細ログの完成、戦闘後効果のWorld反映（S01-007）
- WorldEngine本統合（S01-008）
- 大会・昇格・賞金
- 通常のdraw状態

### 変更を想定する既存領域

- `packages/simulation-core/**`
- 本タスクで追加するテスト

### 新規公開APIの有無

あり。1ターン（または正本が定める解決単位）の純関数入口。

### データ互換性

- BattleStateのschemaVersion契約（14）に従う
- 能力参照名は`skill`等、正本のAbilityKeyに一致させる

### RNGへの影響

あり。ターン解決の消費順を固定し、同一seed再現を保証する。

### canonical化／hashへの影響

間接的。中間状態を監査用に出す場合は正本の範囲に限る。

### 固定7ファイルへの影響

なし。

### 必須テスト

- 処理順・丸め順の固定
- 命中／ダメージ／精神／耐久の境界
- 使用不可技の扱い
- RNG消費順の同一seed一致
- 部分更新が残らないこと
- 決着候補フラグ／終了理由候補が正本の範囲で出ること

### 受入条件

- 12の対象受入を満たす
- 最終BattleResult／World反映を完成させない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。RNG消費順とS01-007へ渡す終了判定入力。

### 次タスクへの引渡し事項

- ターン解決後BattleState
- 決着候補の観測方法
- 詳細ログ材料となりうる構造（最終ログ整形はS01-007）

---

## S01-007 戦闘終了・結果・ログ・戦闘後効果

### 目的

13に基づき、completed／judge_decision／resolution_error、winner／loser、最大ターン判定、BattleResult、概要ログ、詳細ターンログ、疲労・負傷等の戦闘後効果、Worldへ反映するための結果変換を実装する。通常のdraw状態は作らない。

### 対象仕様

- `docs/specs/13-battle-result-and-log.md`
- `docs/specs/11-battle-state.md`
- `docs/specs/12-battle-turn-resolution.md`
- `docs/specs/03-event-envelope.md`
- `docs/specs/05-statistics-output.md`
- `docs/specs/14-sprint1-config-schema.md`

仕様版は`S1-SPEC-0.1.20`。

### 依存タスク

- S01-006

### 実装対象

- resultKind=completed／failed（resolution_error含む）
- endReason（knockout／surrender／unable_to_continue／judge_decision／resolution_error）
- winnerPersonId／loserPersonId規則（別人物、judge_decisionでも同点規則で勝者決定、resolution_errorでは両方null）
- `runBattleToCompletion`の3 result kindと、start後dependency／invariant failure時の`BattleExecutionAbortError`（第4 kind追加なし、原子的abort）
- 最大ターン判定
- BattleResult
- 概要ログと詳細ターンログ
- 疲労・負傷等の戦闘後効果
- Worldへ反映するための結果変換（実際のcommit配線はS01-008でも可だが、変換契約は本タスクで受入）

### 実装対象外

- 大会順位、昇格、賞金
- 通常のdraw状態
- WorldEngine／CLIの本統合完了（S01-008）
- 詳細戦闘ログ全件の世界イベント複製（SPEC・03・13の禁止に従う）

### 変更を想定する既存領域

- `packages/simulation-core/**`
- 本タスクで追加するテスト

### 新規公開APIの有無

あり。BattleResult生成・ログ・戦闘後効果変換の公開。

### データ互換性

- completedとresolution_errorを混同しない
- EventEnvelope 0.2.0の`battle.started`／`battle.finished`契約はS01-008と分担し、本タスクは結果側の材料を正本どおり用意する

### RNGへの影響

判定計算がRNGを使う範囲は13に従う。消費順を固定する。

### canonical化／hashへの影響

あり。BattleResult／summaryLogHash等、13・14のhash契約。

### 固定7ファイルへの影響

なし（本統合はS01-008）。ログを固定7へ増減して追加ファイル化しない。

### 必須テスト

- completed時のwinner／loser決定と別人物制約
- judge_decisionの同点規則で必ず勝者が決まること
- resolution_errorでwinner／loserが両方null
- draw状態が存在しないこと
- 概要ログと詳細ログの分離
- 戦闘後効果の変換
- 同一seed再現

### 受入条件

- 13の対象受入を満たす
- 大会・昇格・賞金を含まない
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。結果変換契約とS01-008のcommit境界。

### 次タスクへの引渡し事項

- BattleResultとログ
- 戦闘後効果のWorld適用入力
- RunBattleCommitPlan等、13・14が求める原子的commit材料（実装配置はS01-008と分担可）

---

## S01-008 WorldEngine・CLI・出力統合

### 目的

週間処理と戦闘パイプラインをWorldEngine／CLIへ統合し、config読込・validation・SimulationIdentity・固定7ファイル維持・events.jsonl／統計／validation-reportへの必要最小統合を行い、Sprint 0互換を保つ。

### 対象仕様

- `docs/specs/10-training-and-learning.md`
- `docs/specs/11-battle-state.md`
- `docs/specs/12-battle-turn-resolution.md`
- `docs/specs/13-battle-result-and-log.md`
- `docs/specs/02-config-schema.md`
- `docs/specs/03-event-envelope.md`
- `docs/specs/05-statistics-output.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/14-sprint1-config-schema.md`
- `docs/TECHNICAL_DECISIONS.md`（実行構成の固定事項）

仕様版は`S1-SPEC-0.1.20`。S01-008着手前に再発明してはならない確定契約は次のとおり（詳細は正本ミニ仕様）。

- `WEEKLY_TRAINING_PROCESSOR_ID`／週間event `sourceProcessor` = `weekly-training`（Sprint1 transactional processor adapter ID。legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`へは登録しない。二重実行禁止）
- production adapter pipeline = `[weekly-training]`のみ（battleはpipeline外）
- battleの`worldRngState`／`MatchIdGeneratorState`／`processorRuntimeStates`／`battleResults`／`battleResultWeekState`／`eventStream`／`eventAllocationState`／sidecar owner = `Sprint1RunRuntimeState`
- battle World RNG label = `battle/world-rng`；weekly-training RNG label = `processor/weekly-training`
- `TrainingProcessorRuntimeState`は`processorRuntimeStates.processorSpecificStates`（直下重複禁止）。初期値は`createInitialTrainingProcessorRuntimeState()`
- `BattleResultWeekState`：completed＋resolution_error登録／completed-only per-person count／duplicate matchId reject／week advance reset
- fresh Sprint 1 initialization promotion（provisional→final simulationId／initial events EventEnvelope 0.2.0・`matchIds=[]`。保存済みSprint 0 migrationではない）
- missing sidecar default禁止。initial sidecarはCLI `Sprint1CliInput`から取得し、`Sprint1RunContext.initialWeeklyTrainingSidecarSnapshot`が所有
- CLI option = `--sprint1-input`のみ（`Sprint1CliInput` schemaVersion `0.1.0`）
- SimulationIdentity `0.4.0`＋`initialWeeklyTrainingSidecarHash` binding
- `Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。`initialWeeklyTrainingSidecarSnapshot`→initial-world投影、`weeklyTrainingSidecars`＋`battleResults`→final-world投影
- 文書schema: run-metadata `0.4.0`、initial-world `0.4.0`、final-world `0.3.0`（`weeklyTrainingSidecars`＋`battleResults`）。非bump: RunRuleSnapshot `0.4.0`／EventEnvelope `0.2.0`／InitialWeeklyTrainingSidecarSnapshot `0.1.0`／EventAllocationState `0.1.0`／BattleResultWeekState `0.1.0`／BattleResult `0.5.0`。fixed7は exactly 7 files
- `commitRunBattlePlan`配線は本タスクで実施（`completed`／`resolution_error`のみcommit）
- S01-007はimplemented／accepted（commit `a39e476`）。
- 本タスクはproduction実装済み（`createSprint1RunSession`／`runSprint1WeeklyStep`／`runSprint1Years`／`commitRunBattlePlan`／weekly-training adapter／CLI `--sprint1-input`／fixed7 Sprint1 writers）。
- 本タスクは **implemented / accepted**（受入完了commit `7c47847`）。
- 実装順序: S01-008 accepted → S01-009
- fresh new-run初期化は21ステップ（02仕様）

### 依存タスク

- S01-004
- S01-007

### 実装対象

- 週間処理のSprint1 transactional processor adapter統合（`weekly-training`。legacy WorldProcessor配列へは登録しない）
- `Sprint1RunRuntimeState`実装とweek／battle transaction root
- Sprint 1 adapter pipeline順序（production配列は`[weekly-training]`のみ）
- config読込とvalidationの実行経路（`--sprint1-input`／`Sprint1CliInput`）
- `apps/simulator` CLIからの実行
- SimulationIdentity 0.4.0のSprint 1新規run適用
- `commitRunBattlePlan` WorldEngine配線
- 固定7ファイル維持（増減禁止・runtime checkpoint非追加。sidecarはinitial-world／final-worldへ投影）
- events.jsonl／統計／validation-reportへの必要最小統合（run-metadata `0.4.0`／initial-world `0.4.0`／final-world `0.3.0`）
- Sprint 0互換性（既存simulationId非再計算、`--sprint1-input`省略時の従来挙動）

### 実装対象外

- 大会・昇格・賞金
- Web／MySQL
- 固定7以外の新規必須出力ファイル追加
- Sprint 0既存simulationIdの再計算置換
- resume／checkpointのdisk persistence
- S01-009の総合受入シナリオ一式の完成（本タスクで結合は行うが総合ゲートはS01-009）

### 変更を想定する既存領域

- `packages/simulation-core/**`（WorldEngine／processor／Sprint1RunRuntimeState）
- `apps/simulator/**`（CLI・出力）
- 本タスクで追加するテスト
- 必要なら`config/`のSprint 1検証用設定追加（ゲーム仕様そのものの変更ではない）

`package.json`の依存追加は`docs/TECHNICAL_DECISIONS.md`にない実行時依存を独自追加しない。

### 新規公開APIの有無

あり。CLIは`--sprint1-input`のみ追加。正本とTECHNICAL_DECISIONSにない外部APIを増やさない。

### データ互換性

- Sprint 0既存simulationIdを再計算して置換しない
- 固定7ファイルを増減しない
- RunRuleSnapshotは`initial-world.json`へ1件（05）。`initialWeeklyTrainingSidecarSnapshot`もinitial-worldへ投影。`weeklyTrainingSidecars`および`battleResults`はfinal-worldへ投影
- EventEnvelope新規runは0.2.0、既存0.1.0読込契約は維持
- run-metadata Sprint1 new-runは0.4.0。initial-world 0.4.0／final-world 0.3.0

### RNGへの影響

あり。World RNGと戦闘RNG／週間RNGの境界を統合時に壊さない。World RNG／MatchIdGeneratorは`Sprint1RunRuntimeState`が所有する。

### canonical化／hashへの影響

あり。出力文書のschemaVersion／hashを02・05・14どおり（SimulationIdentity 0.4.0／run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0）。

### 固定7ファイルへの影響

維持。内容へSprint 1必要最小情報を統合するが、ファイル集合は変更しない。`Sprint1RunRuntimeState`オブジェクト自体をcheckpointとして追加しない。sidecarおよび`battleResults`投影はinitial-world／final-worldトップレベルへ行う。

### 必須テスト

- CLIから`--sprint1-input`でSprint 1設定実行できること
- `--sprint1-input`省略時のSprint 0挙動維持
- 週間処理が`weekly-training`としてSprint1 adapter pipelineで動くこと（legacy WorldProcessor配列へ登録しない）
- battleがadapter pipeline外で`commitRunBattlePlan`経由であること
- 固定7ファイルが生成され増減しないこと
- Sprint 0回帰（既存シード契約）
- simulationId非再計算
- sidecar hash差分でsimulationId差分
- events／統計／validation-reportの必要最小フィールド（run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0／sidecar全文／battleResults全文）

### 受入条件

- 結合対象仕様の受入を満たす
- 上記確定契約を満たす
- 固定7増減なし、既存simulationId置換なし
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。CLIの実行方法、出力差分、Sprint 0互換確認結果。

### 次タスクへの引渡し事項

- 統合済み実行経路
- S01-009が使う再現シナリオと計測入口
- 既知の性能警告扱い（Sprint 0方針を踏襲）
- DB-011等の将来binding対象は`WEEKLY_TRAINING_PROCESSOR_ID="weekly-training"`

---

## S01-009 Sprint 1総合受入検証

### 目的

Sprint 1全体の再現性・差分・RNG・canonical／hash／identity・週間処理・技習得・戦闘・ログ・固定7・不変条件・長期実行・性能・Sprint 0回帰を総合検証し、Sprint 1完了ゲートとする。

本タスクは**新しいゲーム機能を作るタスクではなく、S01-001〜008で受入済みのproduction契約を実際の長期run・統合シナリオ・固定7出力で横断検証するタスク**である。検証で欠陥を発見した場合だけ、既存仕様へ合わせる最小修正を行う。

### 対象仕様

- `docs/specs/08-character-growth.md`〜`docs/specs/14-sprint1-config-schema.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/02-config-schema.md`
- `docs/specs/03-event-envelope.md`
- `docs/specs/05-statistics-output.md`
- `docs/specs/07-seeded-rng.md`
- Sprint 0回帰に必要な01／04等の既存契約
- S01-008でacceptedとなったproduction経路（commit `7c47847`）

仕様版は`S1-SPEC-0.1.20`。本タスクの検証契約明文化だけでは仕様版を上げない。productionのwire shape／ゲーム計算／RNG契約変更が必要と判明した場合だけ、通常の仕様変更手続を行う。

### 依存タスク

- S01-008 **implemented / accepted**（commit `7c47847`）

### 検証入口と成果物

Sprint 1完了検証の正規入口をルートnpm scriptとして次に固定する。

```text
npm run verify:sprint1
```

実装本体は`apps/simulator`のverification領域へ置く。`packages/simulation-core`へNode固有I/Oや検証CLIを入れない。新しい実行時依存は追加しない。
root `verify:sprint1` scriptの起動方式は既存`verify:sprint0`のbuild／Node entrypoint方式を踏襲する。S01-009のためだけに`tsx`／`ts-node`等の新runner依存を追加しない。Sprint0 verifierのprivate game-specific logicを流用するという意味ではなく、workspace script・build artifact・Node起動の既存パターンを再利用する。

完了レポートの正規配置:

```text
output/sprint1-verification/sprint1-completion-report.json
```

これはsimulation runの固定7ファイルではなく**検証成果物**である。固定7へ8ファイル目を追加する契約ではない。

verificationが所有するrun artifactの作業領域は次を正本とする。

```text
output/sprint1-verification/runs/<run-key>/
```

ここで`<run-key>/`は**accepted `runCli`へ渡すoutputRoot**であり、fixed7直置きdirectoryではない。S01-008 production writerの既存layoutどおり、成功したCLI runの実fixed7 directoryは:

```text
output/sprint1-verification/runs/<run-key>/<runId>/
```

となる。verification都合で`<runId>`階層をflattenしたりwriter layoutを変更しない。

- verification開始時に削除／初期化してよいのは`output/sprint1-verification/runs/`とcompletion report用tempだけ。一般の`output/`配下やユーザーが別用途で生成したrun directoryを掃除しない
- production CLI runは各`run-key`の独立output rootを使用し、same-seed A/Bを同じdirectoryへ上書きしない。verification harnessからaccepted `runCli(argv, { cwd, outputRoot })`の既存programmatic `outputRoot`を使ってよい。各CLI run開始前にその`run-key` outputRootをempty／nonexistentへし、成功後はその下に**exactly 1件のrunId directory**が生成され、そのdirectoryがfixed7 exactly 7を持つことを確認する
- `--output-root`等の新しいpublic CLI argv optionは追加しない。S01-008で確定したsimulation CLI option集合（Sprint1追加は`--sprint1-input`のみ）を変更しない
- `run-key`はverification artifact識別子でありSimulationIdentity／canonical hash材料へ入れない
- fixed7を生成するrunについてcompletion reportは`runKey`相当の識別子と、実際の`runs/<run-key>/<runId>/`を`output/sprint1-verification/`基準で表した相対run directoryを追跡可能に保持する。nested field名は実装詳細でよいが、run keyだけで実fixed7 directoryが不明になるreportにはしない。絶対pathを保存必須項目にしない
- performance worker等、固定7を生成しないdirect verificationはこの`runs/`配下にfixed7を捏造しない

`verify:sprint1`は最低限次をトップレベルsub-gateとして実行し、最終レポートへ集約する。順序はこの列挙を正とする（run再利用規則による同一artifactの再利用は可）。

1. Sprint 1 same-seed／different-seed／boundary-seed検証
2. Sprint 1年数別長期検証
3. weekly＋technique＋battle統合シナリオ
4. Sprint 1人口別性能計測
5. Sprint 1 fixed7／identity／canonical／hash／不変条件検証
6. `npm run check`
7. `npm run wiki:check`（`npm run check`内部で同等処理が走る構成でも、completion report用の独立command resultとして明示実行）
8. `git diff --check HEAD`相当のrepository diff check
9. `npm run verify:sprint0`によるSprint 0総合回帰

#### verifier実行・exit・report原子性

- `verify:sprint1`のexit codeは**0=completion reportを正常生成でき、`overallPassed=true`**、**1=functional failureまたはverification harness failure**とする。performance warningだけなら0を維持する。新しいexit code 2等を追加しない
- 実行開始時に前回のcanonical `sprint1-completion-report.json`を無効化／削除してから検証を開始する。今回runが途中失敗したのに古い`overallPassed=true` reportを残してはならない
- completion reportは全必須gateの集約後に一時fileへ書き、UTF-8／LFでflush後、canonical pathへrenameする。reportはverification成果物でありsimulation fixed7 atomic writerへ混ぜない
- 個別gateがfailureでも安全に継続できる場合は残りgateを実行してissueを集約する。前提欠落で実行不能な必須gateは`blocked` statusと理由を残し、functional failureとして扱う
- functional gate failureやsafe-to-continueなharness failureを集約できた場合は、`overallPassed=false`のfailure reportを**必ず**canonical pathへatomic writeしてからexit 1とする。reportのserialize／write／rename／read-back validation自体が失敗した場合だけcanonical report不在のexit 1を許す。stale canonical reportを成功扱いで残さない
- 必須matrix slotを黙ってskipしない。仕様上明示された`not_performed`はboundary seedの長期性能、year profile単独maxRSS等の既存対象外だけ
- `npm run check`／`npm run wiki:check`／repository diff check／`npm run verify:sprint0`のcommand exit statusをreportへ機械可読に保存する

長時間runを通常`npm test`へ暗黙追加しない。長期・性能は`verify:sprint1`から明示実行する。
`verify:sprint1`の内部sub-gateとして`npm run verify:sprint1`自身を再帰呼出ししない。本節末尾の必須ゲート一覧にある`npm run verify:sprint1`は、S01-009受入時にトップレベル入口そのものを実行するという意味であり、verifier内部commandではない。

### 検証fixtureとseed

通常の機能検証はS01-008でaccepted済みのSprint 1 tiny fixtureを基準にする。

```text
apps/simulator/fixtures/sprint1/tiny-initial-world.config.json
apps/simulator/fixtures/sprint1/sprint1-input.json
```

PersonIdは04仕様の種別別ゼロ埋め連番・生成順であり、同じpopulation shapeならseedだけを変えてもPersonId集合は変えない。したがってsame／different／boundary seedでは同じvalidated Sprint1 input fixtureを使用し、seedごとにsidecarを暗黙補完しない。

検証定数:

```text
baseSeed = 12345
alternateSeed = 54321
boundarySeeds = [0, 4294967295]
sameSeedYears = 100
differentSeedYears = 100
yearProfiles = [10, 50, 100, 300]
performanceYears = 100
performanceSeed = baseSeed  // 12345
```

これらはS01-009 verification内部定数であり、production CLIのdefault seedやゲーム仕様の既定値を変更しない。

### verification run再利用規則

同一条件の100年runをカテゴリごとに無意味に重複実行しない。以下の再利用を許可する。

- same-seed run A（baseSeed=12345／100年）は、単独validationを完了した同一実体を`yearProfiles`の100年profileおよびdifferent-seed比較のbase側として再利用してよい
- same-seed run BはAとは必ずfreshなproduction CLI invocation／独立output directoryで実行し、Aのsession／memory state／outputを再利用しない。OS子processであること自体は必須にしない（population performanceだけは別節どおり独立子process）
- alternateSeed=54321の100年run、10／50／300年profile、boundary seed各run、population performance各runは別実行とする
- 再利用は同じproduction run artifactを複数の検証観点から読むだけとし、結果をコピー・合成して別runのように見せない
- completion reportには各カテゴリが参照したrun key／output directory相対識別子を記録し、再利用関係を追跡可能にする。絶対pathはidentity材料にしない

これによりsame-seedの独立2run要件を維持しつつ、baseSeed 100年を不必要に3〜4回重複実行しない。

### same-seed再現性

`baseSeed=12345`、同一config、同一Sprint1 input、`years=100`でproduction Sprint 1 CLI経路を**fresh invocationとして独立に2回**実行する。verification harnessは既存`runCli`のprogrammatic `outputRoot`を使ってrun artifactを分離してよく、新しいCLI argv optionは追加しない。

両runはそれぞれ単独で次を満たすこと。

- exit success
- fixed7 exactly 7
- `validation-report.overallPassed=true`
- 100年=4,800週
- `yearly-statistics.csv`は100行（header除く）
- final日時は世界101年4月第1週
- EventEnvelope sequence連続
- SimulationIdentity／RunRuleSnapshot／sidecar／BattleResult validation成功

比較は05仕様の決定性除外規則を正とする。S01-008には独立したproduction comparator APIは存在しないため、存在しないhelperの再利用を要求しない。S01-009 verification領域に比較helperを置いてよいが、除外規則は05仕様から導出し、別ルールを発明しない。

比較方法を次に固定する。

- `initial-world.json`／`final-world.json`／`events.jsonl`／`yearly-statistics.csv`／`validation-report.json`は決定的出力としてUTF-8 text完全一致を要求する
- `run-metadata.json`はexisting schemaでparse／validateした後、05仕様で非決定と明記された`runId`／`realStartedAt`／`realEndedAt`の**exact 3 fieldだけ**を比較用cloneから除外し、残りをproduction `toCanonicalJson`でcanonical比較する。追加fieldを都合よく除外しない。`commitId`は同一verification実行中の同じHEADを指すため一致対象とする
- `performance.json`の現実測定値・環境値は決定性一致条件へ含めない。ただしschema／必須key構造／performanceTargets／deterministic countsは各run単独validation対象とする
- path／mtime／verification一時directory名はsimulation documentへidentity材料として混入させない

verification用比較helperは`apps/simulator`内部に限定し、simulation-coreのpublic APIへ昇格させない。

必須一致対象には少なくとも次を含む。

- `simulationId`
- `SimulationIdentity`全文＋hash
- `RunRuleSnapshot`全文＋hash
- initial-world決定的内容＋initial sidecar全文
- events.jsonl全行
- yearly-statistics.csv全行
- final-world決定的内容＋current sidecar全文＋battleResults全文
- validation-reportの決定的部分

### different-seed実体差

同一config／同一Sprint1 input／`differentSeedYears=100`で`baseSeed=12345`と`alternateSeed=54321`を実行する。

合格条件は**識別メタデータだけの差では不足**とする。

必須:

1. `simulationId`が異なる
2. identityの`seed`が異なる
3. 実体世界内容に差がある

実体差は、initial／final worldの次のdomain内容からidentity専用fieldを除いてcanonical比較する。

- persons
- families
- lineages
- relationships
- generationSummary
- finalでは`weeklyTrainingSidecars`も対象

少なくともinitialまたはfinalのdomain内容が異なること。`simulationId`／EventId／hash／seed文字列だけが異なるケースを合格にしない。

### boundary seed

07仕様の境界seed:

```text
0
4294967295
```

を各2回、tiny fixtureで**1年**実行する。

各seedについて:

- 2runの決定的出力一致（same-seed節と同じ05仕様準拠comparatorを使用）
- 各run単独のfixed7／validation／termination成功
- Sprint1 identityのseedが指定値と一致

を必須とする。boundary seedの100年性能計測はSprint 0同様`not_performed`とし、Sprint 1完了条件へ追加しない。

### 年数別長期検証

tiny fixture、baseSeedで次をproduction Sprint 1 CLI実行する。

```text
10年
50年
100年
300年
```

各profileを独立検証する。

必須:

- years × 48週を正確に実行
- final日時 = 世界`years + 1`年4月第1週
- yearly-statistics行数 = years
- fixed7 exactly 7
- validation-report success
- Event sequence連続
- initial／final document再読込・semantic validation成功
- sidecar 1:1維持
- runtime-only checkpoint fieldをfixed7へ保存しない
- ファイル破損なし

300年profileもfunctional gateであり、性能閾値は設定しない。

### weekly＋technique＋battle統合シナリオ

CLIへ自動battle schedulerを追加してはならない。S01-009の統合戦闘は**verification harnessから既存production APIを明示的に呼ぶ**。

使用するproduction API:

- `createSprint1RunSession`
- `runSprint1WeeklyStep`
- `runBattleToCompletion`
- `commitRunBattlePlan`
- Sprint1 fixed7 writer

検証専用fixtureは既存validatorを通る小規模fixtureとし、test dataの具体値は実装詳細である。ただしproduction default／fallbackとして流用しない。

シナリオ順序を次に固定する。

1. baseSeedでfresh Sprint1RunSessionを作成
2. weekly stepを実行し、Person／sidecar／weekly RNG／processor specific state／training eventsがcommitされることを確認
3. pre-battle区間で`sourceProcessor === WEEKLY_TRAINING_PROCESSOR_ID ("weekly-training")`の正規weekly eventだけを対象に、少なくとも1件の`training.action_selected`と、少なくとも1件の技状態更新event（`technique.learning_progressed`／`technique.acquired`／`technique.mastery_increased`のいずれか）を観測する。weekly-training由来eventのactor正本は`EventEnvelope.entities.personIds`であり、S01-008 allocation契約どおり**exactly 1件**でなければならない。その唯一のPersonIdをactorとし、payload等から人物を推測しない。技状態更新eventのactorは、次stepで選ぶofficial battle participant 2名の少なくとも1名でなければならない。weekly step前に該当Personの`Person.sprint1State.techniqueStates`をsnapshotし、step後current World Personとの差で09／10仕様どおり実際に変化したことを確認する。必要なら検証fixtureで既存分岐を決定的に成立させるが、ゲームロジックを変更して発生させない
4. battle kindは`official`に固定する。現在のWorldから`active_competitor`かつ16..41歳の人物を既存11仕様とproduction `isEligibleForBattleKind`で判定し、`personId`昇順の先頭2名を使用する。2名未満、またはstep 3の技状態更新actorをこの2名へ成立させられないfixtureはverification fixture failure。Sprint 2の大会資格を新設しない
5. `BattleParticipantSource`はS01-008 accepted境界のexact shape `{ person, temporaryCondition }`としてcurrent `Person`＋current sidecar `temporaryCondition`から構成し、production `validateBattleParticipantSource`を通す。step 3で技状態が更新されたparticipantについては、source内`person.sprint1State.techniqueStates`がweekly commit後のcurrent World Personとcanonical一致することを明示確認し、古いpre-week Personをbattleへ渡さない。`expectedWorldStateHash`は`computeExpectedWorldStateHash`、same-week completed countは`computeMatchesCompletedThisWorldWeekBeforeBattle`を使う。`BattlePostProcessContext`はそのcountと選択した2名の`personId`からexact public typeどおり組み立て、`validateBattlePostProcessContext`を通す。専用production builderが存在しない入力組立てはverification-private helperでよいが、hash／年齢／count／ゲームルールを再実装しない
6. strategyはproduction `default_strategy`に固定し、`scripted_actions`を使って結果を作らない。両participantのaction source identityはproduction `createDefaultStrategyActionSourceIdentity`でRunRuleSnapshotのstrategyVersion／sprint1ConfigHashへbindし、`DefaultBattleStrategySource`を`validateDefaultBattleStrategySource`で検証する。`CreateBattleRequest`はcurrent sessionの`simulationId`／`worldDate`／selected participant source／両action source identity／`context.runRuleSnapshot`からexact 11仕様shapeで構成し、`battleKind=official`、`initialRange`は省略してproduction `defaultInitialRange`解決を使用する。`StartBattleInput.worldRngState`／`matchIdGeneratorState`はcurrent runtime ownerから渡す。verification側でdefault strategyの採点・action選択を実行／再実装せず、`runBattleToCompletion`内部のproduction `runDefaultBattleStrategy`経路へ委ねる。battle attemptは独立シナリオにつき1回だけとし、completed以外（`pre_start_failure`／`resolution_error`／`BattleExecutionAbortError`等）はparticipant差替えやretryで隠さずfunctional failure
7. `commitRunBattlePlan`を1回だけ実行
8. battle.started→battle.finished、World RNG／MatchId state／人物効果／global battleResults／current-week registryを確認
9. さらにweekly stepを1回成功させ、`battleResultWeekState.results=[]`へresetされてもglobal `battleResults`と`detailedLog`が保持されることを確認
10. fixed7を生成・reloadし、final-worldのBattleResult全文／detailedLog、sidecar、eventsを確認。このシナリオはweekly stepをexactly 2回だけ実行するため、output projectionの`weeksExecuted=2`、`yearsExecuted=0`、`yearEnds=[]`、`yearly-statistics.csv`はheaderのみ（data row 0件）とする。fixed7生成のために追加週／追加年を進めない。出力はS01-008 acceptedの`buildAndWriteSprint1RunOutput`を再利用し、`finalIntegrity`は既存`evaluateReferenceIntegrity(current worldState)`で生成する。verification-privateな別fixed7 writer／別integrity計算を作らない。integrated scenarioもverification-ownedの一意な`run-key`をoutputRootとして使用し、実fixed7は既存writer layoutどおり`output/sprint1-verification/runs/<run-key>/<runId>/`へ置く。flat directoryへ直接7ファイルを書かない
11. 同じシナリオを同seedで独立に2回実行し、決定的結果を比較。比較対象は各checkpointのruntime state canonical hash、BattleResult全文、event stream、week reset後sessionの決定的state、fixed7の05仕様決定的部分とする

詳細turn logをevents.jsonlへ複製しない。

この統合シナリオでは次のruntime checkpointをverification report用にdigest化し、独立2runで比較する。

- fresh session後
- weekly処理後
- battle commit後
- week reset後

各checkpointの比較対象は`Sprint1RunRuntimeState`のdeterministic owner全体とする。最低限、`worldState`、battle `worldRngState`、`matchIdGeneratorState`、`weeklyTrainingSidecars`、`processorRuntimeStates`（weekly-training RNG＋specificStateを含む）、`eventStream`、`eventAllocationState`、global `battleResults`、`battleResultWeekState`を含める。immutable contextは`simulationId`／`simulationIdentityHash`／`runRuleSnapshotHash`を別途一致確認する。

verification-private checkpoint digestを作る場合は、各対象をproduction `toCanonicalJson`でcanonical化し、既存`Sha256Provider`でSHA-256する。別canonicalizer／別hash algorithmを作らない。digest helperのfile名や、全fieldを1hashへまとめるかfield別hashへするかは実装詳細だが、上記ownerの比較省略は禁止する。raw runtime checkpointやdigestをsimulation fixed7へ新規永続化しない。

RNG消費順の**正確な回数／golden**はS01-004〜007のaccepted regression testsを正とし、S01-009で別の乱数アルゴリズムや新goldenを再発明しない。

### identity／canonical／hash総合検証

`verify:sprint1`は既存unit／contract testsに加え、production outputで最低限次を確認する。

- 同一内容を別pathから読んでもsimulationId不変。config／Sprint1 inputをverification-ownedの異なる2pathへbyte-for-byte copyし、同seedでidentityを構築して一致を確認する。path文字列をidentity材料へ入れない
- config／catalog／initial sidecarのcanonical hash再計算一致
- initial sidecar内容のvalidな1値変更で`initialWeeklyTrainingSidecarHash`、SimulationIdentity hash、simulationIdが変わる。変異はPersonId昇順先頭entryの`motivationFactor`だけを使い、`motivationFactor < 11500`なら`+1`、11500なら`-1`とし、既存validatorを通した後にhash比較する。他fieldを同時変更しない
- key順だけの差でcanonical hash不変。object key順だけを変更し、配列順・値・PersonId順を変更しない
- run-metadata／initial-world／final-world／eventsのsimulationId cross bind
- RunRuleSnapshot hashとSimulationIdentity cross bind
- `Math.random`をsimulation production pathへ導入していない。静的scan対象は`packages/simulation-core/src/**/*.ts`と`apps/simulator/src/**/*.ts`のproduction sourceで、`*.test.ts`および`apps/simulator/src/sprint1-verification/**`等のverification-only領域を除外する。検出対象は**実行コードの`Math.random(...)` call expression**であり、comment／string literal／documentation内の文字列一致はfailureにしない。TypeScript ASTまたは同等のtoken-aware解析を使用してよく、生のsubstring grepだけを唯一の判定根拠にしない。production callが1件でもあればfunctional failure

既存validator／hash helper／S01-008 reload verifierを再利用し、verification専用の別canonical実装を作らない。

### fixed7総合検証

固定7を生成する各production CLI runおよび統合シナリオrunについてディスク実体を検査する。population performance workerやidentity-only direct checkなど、固定7生成を目的としないverification内部runへ7ファイル生成を強制しない。

- エントリ総数7
- 全て通常ファイル
- ファイル名集合が`FIXED_OUTPUT_FILE_NAMES`と完全一致
- 余計なdirectory／symlinkなし
- Sprint1文書schemaVersion: run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0／EventEnvelope 0.2.0
- rename前semantic reload検証成功
- final-worldへcurrent sidecar全文＋run全体BattleResult全文
- battle detailをevents.jsonlへ複製しない

same-seed second runも独立にこの検証を行う。

### Sprint 1人口別性能

Sprint 1 population performanceは**baseline measurement**とする。`600`／`2000`／`5000`は**存命人口 target**（`targetLivingPopulation`）であり、`WorldState.persons.length`とのexact一致を要求しない。初期World生成では死亡済み祖先もWorld Personとして残るため、既存Sprint 0 scaled-config規則どおり例えば600 living targetでは`actualLivingPopulation=600`・`totalPersonCount=800`となり得る。`sidecarCount`は既存Sprint1 contractどおりtotal World Person集合とexact 1:1。

Sprint 0 accepted `performanceTargets`（600人100年30秒／2000人100年120秒／5000計測のみ）をSprint 1へ流用しない。Sprint 0自身の`npm run verify:sprint0`契約は不変。Sprint 1 completion reportへのSprint 0 performance warning import契約は維持する。

| targetLivingPopulation | years | seed | 扱い |
|---:|---:|---:|---|
| 600 | 1 | 12345 | required baseline |
| 2000 | 1 | 12345 | required baseline |
| 5000 | 1 | 12345 | required baseline |

全profileのrun seedは`performanceSeed=12345`（`baseSeed`と同じ）へ固定する。population間でseedを変えず、同一profile再実行でも同じseedを使う。実行順は**600→2000→5000**の逐次独立child process。並列禁止。

elapsedSecondsが大きいことだけを理由にfailureまたはwarningへしない。Sprint1独自の`SPRINT1_PERFORMANCE_WARNING`および30秒／120秒thresholdは置かない。将来baseline蓄積後に別途thresholdを確定するまで恣意的な新thresholdを発明しない。5000だけ特別なmeasure-only statusにはしない。3profileともrequired。functional成功=`passed`、functional失敗=`failed`、前提gate failureで未実行=`blocked`。

各profileの合格条件（すべて必須）:

- child process exit 0
- `yearsExecuted=1`（`weeksExecuted=48`）
- `actualLivingPopulation === targetLivingPopulation`
- World Person生成成功
- sidecar exact 1:1（`sidecarCount === totalPersonCount`）
- final `validateSprint1RunSession`成功
- event sequence／allocator invariant成功
- year-end processing成功（既存production annual boundaryまで通過）
- runtime exceptionなし
- OOMなし

測定・記録する最低限field（completion report `performanceProfiles`）:

- `seed`／`years`／`targetLivingPopulation`／`actualLivingPopulation`／`totalPersonCount`／`sidecarCount`
- `elapsedSeconds`／`maxRssKilobytes`／`eventCount`／`exitCode`
- validation overall result／`finalWorldDate`
- `status`／`functionalPassed`／`detail`

実装上の固定事項:

- 各population profileはSprint 0同様、独立子プロセスで計測する
- timer／maxRSS等の測定境界は既存Sprint 0 population performance workerの方式を再利用し、Sprint 1だけ別定義へしない
- Sprint 1 profileではproductionのSprint1RunSession＋weekly／yearly pathを**1年**実行する（長期100年耐久はtiny fixtureのsame-seed／year profilesで別途検証し、population performance短縮で代替しない）
- battle schedulerはないためperformance profileで自動battleを追加しない
- performance profileでは自動battleを発生させないため`battleResults`は空でよい。空であること自体をSprint 1 battle未検証の根拠にはせず、battleは統合シナリオで別途検証する

Sprint 1ではsidecarがWorld Person集合とexact 1:1必須のため、performance harnessだけにverification fixture factoryを置いてよい。手順:

1. Sprint 0 performance profileと同じpopulation config生成規則を再利用する（存命人口 targetに対する死亡済み祖先を含むtotal Person数を正とする）
2. 測定開始前に、`performanceSeed=12345`でそのprofileのgenerated World PersonId集合を得る。測定対象production sessionも同じprofile config／同じseedを使用する
3. S01-008 accepted `apps/simulator/fixtures/sprint1/sprint1-input.json`を既存validatorで読み、その`initialWeeklyTrainingSidecar.entries`のPersonId Unicode昇順先頭entryをverification用canonical templateとする。templateはvalidated deep cloneし、各performance PersonIdについて**`personId`だけを対象PersonIdへ置換**して、その他field（growthProfile／growthPotential／remainders／temporaryCondition／motivationFactor／plannerContext／target contexts／teacherFactorKey／discipleCount）はtemplate値をそのまま保持する。そこから全PersonId分の`InitialWeeklyTrainingSidecarSnapshot`をPersonId昇順に構築する。別のperformance専用balance値を発明しない
4. existing validatorで1:1／schema／rangeを検証する
5. production performance session生成後、実際のinitial World PersonId集合とfactoryが作成したsidecar PersonId集合がexact 1:1であることを再確認する
6. fixture準備のための事前World生成／sidecar構築時間はpopulation runの測定時間へ含めない。ただし測定対象のproduction session自身が行うfresh world生成・21-step初期化・1年weekly／year-end処理は測定時間に含める

このfactoryはverification/test専用。production CLI／simulation-coreから暗黙defaultとして呼ばない。`motivationFactor=10000`等の本番fallbackを復活させない。

### Sprint 0回帰

`verify:sprint1`から正規の:

```text
npm run verify:sprint0
```

を1回実行し、そのcompletion reportを集約する。読込先はaccepted Sprint 0 verifierの正規path:

```text
output/sprint0-verification/sprint0-completion-report.json
```

に固定し、filesystem探索で「最新らしいreport」を選ばない。command成功でもこの正規reportが欠落／invalidならSprint 0 regression／verification harness failureとする。

Sprint 0側:

```text
overallPassed=true
functionalFailureCount=0
```

をSprint 1のfunctional gateとする。

Sprint 0のperformance warningはSprint 1 functional failureへ昇格させない。warningとしてそのまま記録する。
accepted Sprint 0 completion reportのwarning正本fieldは`warningCount`と`performanceWarnings`であり、存在しない`warnings`配列を前提にしない。S01-009側で`performanceWarnings`のwire型を再定義せず、**既存`apps/simulator/src/sprint0-verification/completion-report.ts`のaccepted report型／validator（または同領域の正規reader）を正本として再利用**する。validated reportから得たperformance warning message件数と`warningCount`の一致を必須とし、不一致・source型不正はSprint 0 regression／verification harness failure。validated `performanceWarnings`に含まれる各warning messageをSprint 1 completion report top-level `warnings`へexactly 1件ずつimportし、`VerificationIssue`は`code=SPRINT0_PERFORMANCE_WARNING`、`message=source warning message`、`scope=sprint0Regression/performance`とする。nested `sprint0Regression`にはsource `warningCount`とvalidated `performanceWarnings`全文を保持する。したがってSprint 1 top-level `warningCount`にはSprint 0からimportしたperformance warningを含める（Sprint1独自のtiming threshold warningは置かない）。同じsource warningを二重importしない。

### Sprint1 completion report

`output/sprint1-verification/sprint1-completion-report.json`のschemaVersionは`0.1.0`とする。これはverification reportのschemaでありS1-SPEC文書schemaではない。

必須top-level:

```text
schemaVersion: "0.1.0"
sprint: "sprint1"
specVersion: "S1-SPEC-0.1.20"
generatedAtUtc: string  // ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`)
gitCommit: string
workingTreeDirty: boolean
overallPassed: boolean
functionalFailureCount: non-negative integer
warningCount: non-negative integer
failures: VerificationIssue[]
warnings: VerificationIssue[]
sameSeed: {...}
differentSeed: {...}
boundarySeeds: [...]
yearProfiles: [...]
integratedScenario: {...}
identityAndCanonical: {...}
fixedSeven: {...}
performanceProfiles: [...]
sprint0Regression: {...}
check: {...}
```

verification nested resultで使用する共通statusは次の4値に固定する。

```text
VerificationStatus = passed | failed | not_performed | blocked
```

- `passed`: 必須検証を実行して成功
- `failed`: 実行して不合格。required gateでは`failures`へ最低1件対応issueを追加
- `blocked`: prerequisite failure等でrequired gateを安全に実行できない。`failures`へ最低1件対応issueを追加
- `not_performed`: 仕様上もともと非必須と明記された計測だけ。required gateへ使用禁止

status適用を次に固定する。boundary seedの**必須1年run**、10／50／100／300年のyear profile、存命人口 target 600／2000／5000のperformance profile（各years=1）はいずれもrequired gateなので、正常実行時は`passed`、不合格は`failed`、前提failureで未実行なら`blocked`とする。`not_performed`を使用してよいのはboundary seedの100年長期performance、year profile個別maxRSS等、本文で明示的に非実施としたsub-measurementだけ。

`failures`／`warnings`の各要素は最低限`code`／`message`／`scope`を持つ。`functionalFailureCount = failures.length`、`warningCount = warnings.length`。required nested resultに`failed`／`blocked`が1件でもあるのに対応failure issueがないreportをinvalidとする。

report内matrix順序は固定する。`boundarySeeds`は`0`→`4294967295`、`yearProfiles`は`10`→`50`→`100`→`300`、`performanceProfiles`は`targetLivingPopulation` `600`→`2000`→`5000`。`failures`／`warnings`もverifierの固定gate順・各matrix順で集約し、child process完了順やfilesystem列挙順へ依存させない。

`check`は最低限`npmCheck`／`wikiCheck`／`diffCheck`の各command、exit code、pass-failを保持する。diff gateはS01-009受入中のstaged差分も検査できるよう`git diff --check HEAD`相当を正とし、clean-tree最終runでは当然差分0を確認する。`sprint0Regression`は`npm run verify:sprint0`のexit codeと読み込んだSprint0 completion reportの`overallPassed`／`functionalFailureCount`／`warningCount`／`performanceWarnings`全文を保持する。Sprint0 performance warningは上記どおりtop-level `warnings`へ1件ずつimportする。

```text
overallPassed = functionalFailureCount === 0
```

Sprint 0から引き継いだperformance warning、`workingTreeDirty=true`、およびSprint1 population baselineのelapsedSecondsの大きさだけではfunctional failureにしない。

verification harness自体の例外、必要fixture生成失敗、必須command失敗、必須run missing、report生成失敗はfunctional failure。

`apps/simulator`側にverification report 0.1.0のvalidatorを置き、少なくともrequired top-level、status enum、count整合、`overallPassed`式、seed／years matrixの必須slot、command resultをvalidateする。canonical reportを書いた後は再読込してvalidatorを通し、失敗したreportをexit 0の根拠にしない。simulation-coreへverification report型／validatorを公開しない。

`sameSeed`等のnested report fieldは、上記の必須検証結果・seed／years／pass-fail・必要な差分根拠を機械可読に保持すればよい。verification内部の補助field名・file分割・class名は実装詳細であり、それだけを理由に仕様clarifierを要求しない。既存S00-010 completion reportの命名・構造を再利用できる箇所は再利用する。

completion report自身のSHA-256を同じJSON内の必須fieldとして自己参照保存しない。完了報告で要求するreport SHA-256は、canonical reportをatomic write・read-back validationした**後**のUTF-8 file bytesに対して外部から計算し、handoff／完了報告へ記載する。hash計算後にreport本文を書き換えない。

### S01-009実装時とSprint 1完了tagの区別

S01-009の実装・受入監査中は未commit差分があるため、`workingTreeDirty=true`のcompletion reportでも受入材料としてよい。dirtyだけをfailureにしない。

`gitCommit`はverification開始時に`git rev-parse HEAD`で解決したexact HEADを記録する。official `verify:sprint1`はrepository worktree内で実行する完了ゲートなので、HEADを解決できない場合はharness failureとし、`gitCommit=null`へfallbackしてpassさせない。`workingTreeDirty`はverification開始時のGit tracked／untracked状態（Git ignore対象の`output/`等は通常どおり除外）を記録する。verification途中でHEADを変更してはならず、終了時にHEADが開始時と同一であることを確認する。

S01-009がacceptedとなりcommit後、masterへfast-forwardした後に**clean treeで`npm run verify:sprint1`を再実行**する。最終tag判定ではreportだけでなく、verification終了後の実際の`git status --short`も空であることを確認する。verification成果物がGit ignore対象外でtreeをdirtyにする構成は禁止する。

受入handoffで使用した`_handoff-artifacts/`がuntrackedでworktreeに残っている場合、そのままではclean verification条件を満たさない。最終clean run前にrepository外へ移動または削除し、**tagを通すためだけに`.gitignore`へ新規追加して隠さない**。保存が必要ならrepository外へ退避する。

Sprint 1全体を完了としてtag可能にする最終条件:

- S01-001〜S01-009 accepted
- clean master
- `npm run verify:sprint1` exit success
- completion report `overallPassed=true`
- `functionalFailureCount=0`
- `workingTreeDirty=false`
- verification終了後の`git status --short`が空
- completion report `gitCommit`が現在master HEADと一致

そのclean verificationを確認したcommitへtag:

```text
sprint1-complete
```

を付ける。**`verify:sprint1`自身は`git tag`を作成・移動・削除しない。** verifierは上記条件とcompletion reportを出してtag可否を判定するだけとし、tag作成はS01-009 accepted／commit／master fast-forward／clean verification確認後の明示的Git finalization操作とする。S01-009実装途中／受入前にはtagしない。既存`refs/tags/sprint1-complete`が存在する場合はforce moveしない。同じHEADを既に指すなら再作成不要、別commitを指すならfinalizationを停止して手動確認する。`git tag -f`は禁止。

### 実装対象

- `npm run verify:sprint1`とSprint1 completion report
- 同一seed再現性
- 異seed実体差
- boundary seed
- RNG消費順の総合回帰
- canonical化／config hash／identity
- 週間処理・技習得
- 戦闘開始・ターン解決・戦闘結果・ログ
- fixed7／不変条件
- 10／50／100／300年長期実行
- 600／2000／5000存命人口 target×1年のpopulation baseline計測
- Sprint 0総合回帰

### 実装対象外

- 新機能の追加実装（欠陥修正に限る）
- 大会・昇格・賞金・Web・MySQL
- 自動battle scheduler／match maker
- BattleResult retention deletion
- resume／checkpoint disk persistence
- 仕様08〜14の内容変更や`S1-SPEC-0.1.20`の版上げ
- production向けsidecar default generator
- 新規RNGアルゴリズム
- fixed7の8ファイル目

### 変更を想定する既存領域

- `apps/simulator/src/sprint1-verification/**`等の総合検証領域
- `apps/simulator/src/verify-sprint1-main.ts`等のverification CLI
- root `package.json`の`verify:sprint1` script
- 総合検証用fixture／test
- 欠陥修正に必要な最小コード変更
- docs／WikiのS01-009 current-state

既存production public APIの追加は原則行わない。verificationから必要なproduction入口はS01-008 accepted APIを使用する。

verification内部のhelper名、private file分割、report nested補助field、fixtureの具体的な数値は、上記observable contractを満たす限り実装詳細とする。これらは仕様不足としてSTOPしない。production wire shape／ゲーム計算／RNG消費順／persistent output contractが既存正本から決まらない場合だけSTOP対象とする。

### 新規公開APIの有無

simulation-coreの新規public APIは原則なし。verification内部helperは`apps/simulator`内部に置き、package rootへ公開しない。

### データ互換性

- Sprint 0回帰を壊さない
- Sprint 0既存simulationIdを再計算置換しない
- Sprint 1 fixed7 exactly 7を維持
- legacy document reader契約を変更しない

### RNGへの影響

検証対象。新規RNGアルゴリズム・seed label・消費順は追加変更しない。欠陥が見つかった場合はaccepted仕様との差を報告してから最小修正する。

### canonical化／hashへの影響

検証対象。verification専用canonicalizerを新設せず、production helperを再利用する。

### 固定7ファイルへの影響

検証対象。simulation runの固定7は増減なし。`sprint1-completion-report.json`は`output/sprint1-verification/`配下のverification artifactでありrun fixed7ではない。

### 必須テスト／ゲート

最低限:

- same-seed 100年2run一致
- different-seed実体差
- boundary seed 0／4294967295各2run
- 10／50／100／300年profile
- weekly＋technique＋completed battle＋week reset＋fixed7統合シナリオ
- runtime RNG checkpoint比較＋S01-004〜007 RNG regression
- identity／hash／canonical
- fixed7／不変条件／semantic reload
- Sprint 1人口別性能（存命人口 target 600／2000／5000 × years=1 baseline）
- `npm run verify:sprint0`
- `npm run check`
- `npm run wiki:check`
- `git diff --check HEAD`
- `npm run verify:sprint1`

### 受入条件

- 本バックログの固定完了条件を満たす
- `verify:sprint1` completion reportが`overallPassed=true`／`functionalFailureCount=0`
- Sprint1 population baselineのelapsedSecondsだけではfailure／warningにしない（Sprint0からimportしたperformance warningは従来どおりwarning）
- same-seed second runを含む全機能runを独立検証済み
- integrated scenarioでweekly／technique／battle／BattleResult／week reset／fixed7を一続きに検証済み
- Sprint 0 completion verifierがpass
- 新機能を追加していない
- Sprint 1を「仕様のみ完了」ではなく実装受入完了として確認できる

### 完了報告に必要な情報

`AGENTS.md`形式に加え、次を必須とする。

- same-seed比較結果
- different-seed実体差の比較対象と結果
- boundary seed結果
- 10／50／100／300年結果
- integrated scenarioのevent／BattleResult／RNG checkpoint結果
- identity／canonical／hash結果
- fixed7検証結果
- 600／2000／5000存命人口 target×1年 baseline（living／totalPersons／sidecar／elapsed／RSS／events）
- Sprint 0 regression completion result
- `npm run check`／wiki／diff-check
- Sprint1 completion report path／SHA-256
- functionalFailureCount／warningCount
- 残存リスク

### 次タスクへの引渡し事項

- accepted後のclean-tree `npm run verify:sprint1`結果
- `sprint1-complete` tag対象commit
- Sprint 2前準備（大会等）へ送る未実装領域の確認
- performance warningの申し送り

---

## 参照

- `docs/SPEC.md`
- `docs/SPEC_INDEX.md`
- `docs/SPEC_PREPARATION_PLAN.md`
- `docs/SPRINT_0_BACKLOG.md`（記載粒度の参考。文章・タスクの複製元ではない）
- `docs/specs/08-character-growth.md`〜`14-sprint1-config-schema.md`
- `docs/wiki/sprints/sprint1.md`（説明・索引）

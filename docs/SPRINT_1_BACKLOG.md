# Sprint 1 バックログ：成長・技・週間処理・戦闘

- バックログバージョン：`S1-BACKLOG-0.1.0`
- 対象ゲーム仕様：`SPEC-0.1.2`
- 対象Sprint 1ミニ仕様：`S1-SPEC-0.1.17`
- 仕様確定commit：`2800d3b959e575f57660c27b344507dd0e38ddb6`
- 実装状態：S01-001〜S01-006 **実装済み**、S01-007〜S01-009 **pending**（次の実装着手は S01-007）
- `S1-SPEC-0.1.17`は戦闘開始`sourceSnapshot` baselineの明文化（常時`sourceSnapshotHash`検証・BattleState schema `0.6.0`）。先行clarificationとして`S1-SPEC-0.1.16`の`movementChance`、`S1-SPEC-0.1.15`の移動状態補正契約がある

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

仕様版はすべて`S1-SPEC-0.1.17`。

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
- SimulationIdentity.specVersionsの必須値（`SPEC-0.1.2`／`S0-SPEC-0.1.5`／`S1-SPEC-0.1.17`）
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

仕様版は`S1-SPEC-0.1.17`。

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

仕様版は`S1-SPEC-0.1.17`。

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

仕様版は`S1-SPEC-0.1.17`。

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

仕様版は`S1-SPEC-0.1.17`。

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

仕様版は`S1-SPEC-0.1.17`。

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

仕様版は`S1-SPEC-0.1.17`。

### 依存タスク

- S01-006

### 実装対象

- resultKind=completed／failed（resolution_error含む）
- endReason（knockout／surrender／unable_to_continue／judge_decision／resolution_error）
- winnerPersonId／loserPersonId規則（別人物、judge_decisionでも同点規則で勝者決定、resolution_errorでは両方null）
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

仕様版は`S1-SPEC-0.1.17`。

### 依存タスク

- S01-004
- S01-007

### 実装対象

- 週間処理のWorldEngine統合
- Sprint 1 processor順序
- config読込とvalidationの実行経路
- `apps/simulator` CLIからの実行
- SimulationIdentityのSprint 1新規run適用
- 固定7ファイル維持（増減禁止）
- events.jsonl／統計／validation-reportへの必要最小統合
- Sprint 0互換性（既存simulationId非再計算）

### 実装対象外

- 大会・昇格・賞金
- Web／MySQL
- 固定7以外の新規必須出力ファイル追加
- Sprint 0既存simulationIdの再計算置換
- S01-009の総合受入シナリオ一式の完成（本タスクで結合は行うが総合ゲートはS01-009）

### 変更を想定する既存領域

- `packages/simulation-core/**`（WorldEngine／processor）
- `apps/simulator/**`（CLI・出力）
- 本タスクで追加するテスト
- 必要なら`config/`のSprint 1検証用設定追加（ゲーム仕様そのものの変更ではない）

`package.json`の依存追加は`docs/TECHNICAL_DECISIONS.md`にない実行時依存を独自追加しない。

### 新規公開APIの有無

あり得る。CLIフラグや実行入口の追加は最小限とし、正本とTECHNICAL_DECISIONSにない外部APIを増やさない。

### データ互換性

- Sprint 0既存simulationIdを再計算して置換しない
- 固定7ファイルを増減しない
- RunRuleSnapshotは`initial-world.json`へ1件（05）
- EventEnvelope新規runは0.2.0、既存0.1.0読込契約は維持

### RNGへの影響

あり。World RNGと戦闘RNG／週間RNGの境界を統合時に壊さない。

### canonical化／hashへの影響

あり。出力文書のschemaVersion／hashを02・05・14どおり。

### 固定7ファイルへの影響

維持。内容へSprint 1必要最小情報を統合するが、ファイル集合は変更しない。

### 必須テスト

- CLIからSprint 1設定で実行できること
- 週間処理と戦闘がprocessor順で動くこと
- 固定7ファイルが生成され増減しないこと
- Sprint 0回帰（既存シード契約）
- simulationId非再計算
- events／統計／validation-reportの必要最小フィールド

### 受入条件

- 結合対象仕様の受入を満たす
- 固定7増減なし、既存simulationId置換なし
- `npm run check`が成功する

### 完了報告に必要な情報

`AGENTS.md`形式。CLIの実行方法、出力差分、Sprint 0互換確認結果。

### 次タスクへの引渡し事項

- 統合済み実行経路
- S01-009が使う再現シナリオと計測入口
- 既知の性能警告扱い（Sprint 0方針を踏襲）

---

## S01-009 Sprint 1総合受入検証

### 目的

Sprint 1全体の再現性・差分・RNG・canonical／hash／identity・週間処理・技習得・戦闘・ログ・固定7・不変条件・長期実行・性能・Sprint 0回帰を総合検証し、Sprint 1完了ゲートとする。

### 対象仕様

- `docs/specs/08-character-growth.md`〜`docs/specs/14-sprint1-config-schema.md`
- `docs/specs/00-domain-glossary.md`
- `docs/specs/02-config-schema.md`
- `docs/specs/03-event-envelope.md`
- `docs/specs/05-statistics-output.md`
- `docs/specs/07-seeded-rng.md`
- Sprint 0回帰に必要な01／04等の既存契約

仕様版は`S1-SPEC-0.1.17`。

### 依存タスク

- S01-008

### 実装対象

- 同一seed再現性
- 異seed差分
- RNG消費順
- canonical化／config hash／identity
- 週間処理・技習得
- 戦闘開始・ターン解決・戦闘結果・ログ
- 固定7ファイル
- 不変条件
- 長期実行
- 性能（警告基準。超過 alone で失敗にしない方針はSprint 0踏襲）
- Sprint 0回帰

### 実装対象外

- 新機能の追加実装（欠陥修正に限る）
- 大会・昇格・賞金・Web・MySQL
- 仕様08〜14の内容変更や`S1-SPEC-0.1.17`の版上げ

### 変更を想定する既存領域

- 総合検証コード／テスト（`packages/simulation-core`および`apps/simulator`の検証領域）
- 欠陥修正に必要な最小コード変更

### 新規公開APIの有無

原則なし。検証用入口が必要な場合も本番APIを不用意に増やさない。

### データ互換性

- Sprint 0回帰を壊さない
- 既存simulationId置換なし、固定7増減なしを再確認

### RNGへの影響

検証対象。新規RNGアルゴリズムを追加しない。

### canonical化／hashへの影響

検証対象。

### 固定7ファイルへの影響

検証対象（増減なしを確認）。

### 必須テスト

- 同一seed一致／異seed差分
- 週間・技・戦闘・結果・ログの統合シナリオ
- identity／hash／canonical
- 固定7と不変条件
- 長期実行
- 性能計測（警告）
- Sprint 0回帰
- `npm run check`

### 受入条件

- 本バックログの固定完了条件を満たす
- Sprint 1を「仕様のみ完了」ではなく実装受入完了として確認できる
- ただし本バックログ定義時点では実装未着手であり、本タスク完了まで実装完了と記載しない

### 完了報告に必要な情報

`AGENTS.md`形式。再現比較結果、回帰結果、性能計測、残存リスク。

### 次タスクへの引渡し事項

- Sprint 2前準備（大会等）へ送る未実装領域の確認
- タグ／release判断に必要な検証記録の置き場

---

## 参照

- `docs/SPEC.md`
- `docs/SPEC_INDEX.md`
- `docs/SPEC_PREPARATION_PLAN.md`
- `docs/SPRINT_0_BACKLOG.md`（記載粒度の参考。文章・タスクの複製元ではない）
- `docs/specs/08-character-growth.md`〜`14-sprint1-config-schema.md`
- `docs/wiki/sprints/sprint1.md`（説明・索引）

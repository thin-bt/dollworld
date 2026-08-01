# 11 戦闘開始状態仕様

- 仕様版: `S1-SPEC-0.1.11`
- 状態: 正本準拠修正版／Sprint 1暫定値を明示
- 対象: 1対1戦闘の入力、開始状態、参加者スナップショット、戦闘専用RNG
- 非対象: 大会組合せ、昇格、戦績永続化、観戦画面

## 1. 目的

2人物の決定的なスナップショットから、正本の4段階間合い・耐久・精神・一時状態を持つ戦闘開始状態を生成する。

本書が参照する設定キーの型・範囲・既定値は `14-sprint1-config-schema.md` を正本とする。

## 2. 前提

- 戦闘は非リアルタイムの行動順シミュレーション
- 原則として1ターンに双方1回行動
- 基本能力から固定的な攻撃力等を人物データへ恒久保存しすぎない
- 技ごとの参照能力から戦闘時に必要値を算出する
- 戦闘中は元人物レコードを変更しない

## 3. 識別子

戦闘1件の識別には、`00-domain-glossary.md`で共通ID体系へ追加する `MatchId` を使用する。独自の `BattleId` は追加しない。

- `MatchId` は意味を埋め込まない不透明なbranded IDとする
- `simulationId`、世界週、配列位置、表示名を文字列へ直接埋め込まない
- 注入された決定的ID生成器から発行する
- 同じ入力・同じseed・同じ発行順で同じIDになる
- 大会との関連はSprint 2で `TournamentId` と `MatchId` の参照として表す

詳細ログを永続化する段階では既存予定の `BattleLogId` を別途使用し、`MatchId` と混同しない。

## 4. 入力

```text
StartBattleInput
- createBattleRequest
- worldRngState
- matchIdGeneratorState

CreateBattleRequest
- simulationId
- worldDate
- battleKind
- participantA
- participantB
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- runRuleSnapshot
- initialRange?
```

### 4.1 戦闘種別

```text
BattleKind = official | mock
```

- `official`: 公式戦。参加者は `active_competitor`。詳細な大会資格はSprint 2で判定する
- `mock`: 模擬戦。`trainee` または `active_competitor` を許可する
- `battleKind` はBattleState、BattleResult、ログ、後処理効果へ引き継ぐ

### 4.2 BattleActionSourceIdentity

戦闘結果を変え得る行動供給源を開始入力の一部として固定する。

```text
BattleActionSourceIdentity =
  | {
      schemaVersion: "0.1.0",
      kind: default_strategy,
      strategyId: "default-battle-strategy",
      strategyVersion: string,
      strategyConfigHash: string,
      scriptFormatVersion: null,
      actionScriptHash: null
    }
  | {
      schemaVersion: "0.1.0",
      kind: scripted_actions,
      strategyId: null,
      strategyVersion: null,
      strategyConfigHash: null,
      scriptFormatVersion: "battle-action-script-0.1.0",
      actionScriptHash: string
    }
```

- DefaultBattleStrategyの`strategyVersion`は実装版を固定し、同じ版で採点式・候補列挙・tie-break規則を変更しない。
- DefaultBattleStrategyの`strategyConfigHash`は`RunRuleSnapshot.sprint1ConfigHash`と完全一致させる。Strategyは期待発動・命中・ダメージ・負傷・間合い・降参の各式を参照するため、設定の部分hashを独自に作らない。
- scripted actionsは`scriptFormatVersion=battle-action-script-0.1.0`へ固定し、全ターン・両分岐を含むcanonical action script全文から`actionScriptHash`を算出する。hashは小文字16進64文字のSHA-256とし、空scriptまたは未定義分岐を拒否する。
- 実行時ActionsSourceが申告identityと一致しない場合、戦闘開始前失敗または未commitターン失敗として拒否する。
- 標準WorldEngine runでは両sideとも`default_strategy`だけを使用し、`strategyVersion`はRunRuleSnapshot.defaultBattleStrategyVersion、`strategyConfigHash`はRunRuleSnapshot.sprint1ConfigHashと一致必須とする。participantA／B入力は同じ週トランザクションの現在WorldStateからPersonIdで取得し、4.5節adapterで内部生成する。外部から完成済み人物snapshotを差し込まない。
- `scripted_actions`は単体戦闘テスト、fixture replay、監査用APIだけで許可し、標準WorldEngineの公式・模擬戦生成へ混入させない。script interpreterはcanonical script以外の外部状態・現実時刻・乱数を参照しない。
- 関数参照名、メモリアドレス、オブジェクト挿入順をidentityへ使用しない。

### 4.3 入力人物条件

- 同一人物同士でない
- PersonIdが存在し一意
- 存命
- participationStatusがactive
- `battleKind`に対応するcareerStatusと年齢
  - official: `active_competitor`かつ16..41歳
  - mock: `trainee`かつ8..15歳、または`active_competitor`かつ16..41歳
- 能力・適性・一時状態が有効
- sprint1StateSchemaVersion=`0.1.0`で、currentMental・techniqueStates・learningFocusTechniqueIdが08／09仕様に適合
- 負傷度が `battle.injury.unableToContinueThreshold` 未満。閾値以上の人物は戦闘開始前から続行不能として入力拒否する
- 技参照がすべて存在

人物入力には08仕様の `currentMental` に加えて、既存の性格・成長特性から正規化した `BattleDecisionProfile` と `injuryProneness` を必須で含める。Sprint 1の単体戦闘テストではtrainee同士の模擬戦を許可できる。公式戦の詳細資格はSprint 2で判定する。


### 4.4 BattleDecisionProfile `[Sprint 1暫定]`

永続Person型へ新しい性格体系を重複追加せず、既存の性格データから戦闘用の正規化値を導出して入力する。

```text
BattleDecisionProfile
- aggression: 0..100
- caution: 0..100
- riskTolerance: 0..100
- perseverance: 0..100
```

- 50を中立とする
- 同一Person・同一性格データ・同一設定では常に同じ値を導出する
- 戦闘中に再導出せずsnapshotへ固定する
- `injuryProneness: 0..100` も既存の身体・成長特性から導出し、50を中立とする
- Sprint 0に対応する正式プロパティがない場合は4.5節の中立fallbackを使用し、無断でPersonへ任意フィールドを追加しない

### 4.5 Sprint 0人物adapter契約 `[Sprint 1暫定]`

World人物から戦闘入力へ変換するadapterを`battle-profile-adapter-0.1.0`として版管理する。

- upstreamが検証済みの0..100正規化値を持つ場合だけ、その明示値を使用する。
- 対応する既存性格・負傷傾向フィールドが存在しない、またはSprint 0公開型との正式mappingが未確定の場合、aggression／caution／riskTolerance／perseverance／injuryPronenessをすべて中立値50とする。
- 名前、PersonId、能力値、適性、配列順、乱数から性格値を推測しない。
- adapterVersionと入力元フィールドmappingを変更する場合は版を上げ、SimulationIdentityとRunRuleSnapshotへ保存する。
- 同じ人物snapshot・adapterVersion・設定では常に同じ正規化値を返す。

## 5. 初期リソース

正本の暫定値を使用する。

```text
baseMaxDurability = 100 + stamina
baseMaxMental = 50 + spirit
```

### 5.1 開始値

正本の `baseMaxDurability = 100 + stamina` を維持し、疲労・負傷・調子による開始時補正は `currentDurability` へ適用する。基礎最大値そのものは変更しない。

```text
maxDurability = baseMaxDurability
maxMental = baseMaxMental

startDurabilityPercent
= clamp(
    battle.startDurability.minimumPercent,
    100,
    100
    + condition * battle.startDurability.conditionPercentPerPoint
    - fatigue * battle.startDurability.fatiguePercentPerPoint
    - injury * battle.startDurability.injuryPercentPerPoint
  )

currentDurability
= max(1, floor(maxDurability * startDurabilityPercent / 100))
```

`currentMental`の開始規則:

- `maxMental = 50 + spirit`
- 入力人物の`currentMental`が整数かつ`0..maxMental`であることを開始前に検証する
- 範囲外、非整数、欠落は`StartBattleResult` failureとし、World RNGとMatchIdGeneratorStateを消費しない
- 正常値は変更せず`BattleParticipantSnapshot.currentMental`へコピーする
- clampによる不正入力の補正は禁止する

Sprint 1暫定既定値:

- conditionPercentPerPoint: 0.50
- fatiguePercentPerPoint: 0.25
- injuryPercentPerPoint: 0.50
- minimumPercent: 10

これにより好調は開始耐久を最大100％まで回復方向へ補正し、不調・既存疲労・負傷は開始耐久を減らす。12仕様では同じ値を行動順・命中・移動にも状態補正として使用するため、設定監査で二重適用を明示し、開始耐久補正を隠さない。戦闘開始ごとに現在精神力を全回復させない。

## 6. 間合い

```text
BattleRange = contact | close | middle | long
```

```text
RangeIndex
contact = 0
close = 1
middle = 2
long = 3
```

- 全体で1つの共有間合いを持つ
- 通常の接近・離脱は1段階
- 初期間合いは呼出側入力とする
- 入力なしの場合の標準値を `middle` とする `[Sprint 1暫定]`

## 7. BattleParticipantSnapshot

```text
BattleParticipantSnapshot
- side
- personId
- lifeStatus
- participationStatus
- careerStatus
- birthYear
- ageAtBattle
- sourceSnapshotHash
- sprint1StateSchemaVersion
- stats
- aptitudes
- techniques
- fatigue
- injury
- condition
- confidence
- battleDecisionProfile
- injuryProneness
- baseMaxDurability
- startDurabilityPercent
- maxDurability
- currentDurability
- maxMental
- currentMental
- guarding
- evading
- canAct
- surrendered
- unableToContinue
- nextHitModifier
- nextActivationModifier
- damageDealt
- damageReceived
- successfulHits
- attemptedHits
- successfulDefenses
- successfulEvasions
- successfulCounters
- passiveActionCount
- invalidActionCount
- advantageTurnCount
- inBattleConsumption
```

初期値:

- sprint1StateSchemaVersion = 入力人物の`0.1.0`
- baseMaxDurability = 100 + stamina
- maxDurability = baseMaxDurability
- startDurabilityPercent = 5.1節の式
- currentDurability = 開始補正後の1..maxDurability
- currentMental = 検証済み入力人物のcurrentMentalを変更せずコピーする。0..maxMental外はclampせず開始前失敗とする
- guarding = false
- evading = false
- canAct = true
- surrendered = false
- unableToContinue = false
- `injury` は入力人物の永続負傷度を初期値とする戦闘内コピーであり、12仕様の負傷成立時だけ新BattleState側で増加する。元人物は変更しない
- 集計値 = 0

## 8. run単位ルールsnapshotと戦闘参照

完全なSprint 1設定と技カタログを試合ごとに複製せず、simulation run単位で1回だけ不変snapshotとして保持する。

```text
RunRuleSnapshot
- schemaVersion
- simulationId
- simulationIdentityHash
- battleProfileAdapterVersion
- matchIdGeneratorVersion
- initialMatchIdGeneratorStateHash
- defaultBattleStrategyVersion
- sprint1ConfigVersion
- sprint1ConfigHash
- sprint1Config
- techniqueCatalogDataVersion
- techniqueCatalogHash
- techniqueDefinitions
- runRuleSnapshotHash
```

- `RunRuleSnapshot.schemaVersion` の初期値は `0.4.0`
- `initialMatchIdGeneratorStateHash`はSimulationIdentityの値と一致必須
- `techniqueDefinitions` は完全カタログをTechniqueId昇順へ正規化した配列
- 完全なSprint1Configと完全技カタログはこのrun単位snapshotにだけ保存する
- `runRuleSnapshotHash` はschemaVersion、simulationId、simulationIdentityHash、battleProfileAdapterVersion、matchIdGeneratorVersion、initialMatchIdGeneratorStateHash、defaultBattleStrategyVersion、完全設定、設定identity、完全カタログ、カタログidentityをcanonical JSON化したSHA-256
- `simulationIdentityHash` は02ミニ仕様のSimulationIdentityおよび05ミニ仕様のrun-metadata値と一致し、simulationIdの再計算検証に使用する
- 同じsimulationIdのrun中にsnapshotを差し替えない
- 固定7ファイル出力では05ミニ仕様どおり`initial-world.json.runRuleSnapshot`へ1件だけ保存し、各戦闘はhash参照する
- 8ファイル目を追加せず、run-metadataへEventEnvelope schemaVersionを1値だけ記録する

各戦闘には軽量な参照情報だけを保存する。

```text
BattleRulesSnapshotRef
- schemaVersion: "0.1.0"
- runRuleSnapshotHash
- sprint1ConfigVersion
- sprint1ConfigHash
- techniqueCatalogDataVersion
- techniqueCatalogHash
- relevantTechniqueIds
- battleRulesRefHash
```

```text
BattleRulesRefHashInput
- schemaVersion
- runRuleSnapshotHash
- sprint1ConfigVersion
- sprint1ConfigHash
- techniqueCatalogDataVersion
- techniqueCatalogHash
- relevantTechniqueIds
```

- `relevantTechniqueIds` は両参加者が習得済みとして参照するTechniqueIdの和集合を昇順へ正規化する
- `battleRulesRefHash = SHA-256(canonicalJson(BattleRulesRefHashInput))` とし、`battleRulesRefHash`自身をhash入力へ含めない
- BattleRulesSnapshotRefからhash入力を再構築し、余分なキー・欠落キー・自己参照を拒否する
- 内部createBattleStateは入力RunRuleSnapshotのhashと内容を検証し、参照情報をBattleStateへ保存する
- Resolverは `BattleRulesSnapshotRef` だけでルール本文を推測せず、12仕様の入力として同じ `RunRuleSnapshot` を受け取る
- Resolverは `runRuleSnapshotHash`、設定identity、カタログidentityを照合し、異なるsnapshotを拒否する
- 未知技と既知だが未習得の技の区別はRunRuleSnapshotの完全カタログを使用する
- 詳細ログ単体での可搬性が必要なexportでは、BattleStateを変更せず、02仕様のSimulationIdentity全文と参照先RunRuleSnapshotをbundleへ各1回同梱する

## 9. BattleState

```text
BattleState
- schemaVersion
- matchId
- simulationId
- battleKind
- worldDate
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- sprint1ConfigVersion
- battleRulesSnapshotRef
- battleRulesRefHash
- runRuleSnapshotHash
- battleInputHash
- battleSeed
- rngState
- maxTurns
- turnNumber
- initialRange
- range
- participantA
- participantB
- status
- terminalReason: BattleTerminalReason | null
- failure: BattleFailureInfo | null
- actionSequence
- detailedLog: BattleDetailedLog
```

```text
BattleStatus = ready | in_progress | completed | failed
BattleTerminalReason = knockout | surrender | unable_to_continue | max_turns_reached

BattleFailureInfo
- code
- severity
- targetIds
- reason
- canContinue
```

- `BattleState.schemaVersion` のSprint 1初期値は `0.5.0`
- 作成直後はready、terminalReason=null、failure=null
- initialRangeは入力値またはdefaultInitialRangeを解決した固定値で、戦闘中に変更しない
- 12仕様の`beginBattle`成功時にin_progressへ遷移する
- ready／in_progressではterminalReason=null、failure=null
- completedではterminalReason必須かつfailure=null、failedではterminalReason=nullかつfailure必須とする
- 最大ターンは20
- turnNumberは第1ターン開始前を0とする

## 10. 戦闘開始トランザクションと専用RNG

Sprint 1の標準WorldEngineが外部公開する戦闘実行APIは12仕様の`runBattleToCompletion`だけとする。`startBattleTransaction`は戦闘モジュール内の純粋な開始計画生成APIであり、`createBattleState`と`beginBattle`も純粋な内部stageとする。これらの返却値を単独でWorldState、生成器状態、イベントStreamへcommitしない。

```text
StartBattleResult =
  | {
      kind: success,
      battleState: BattleState(status=in_progress),
      runtimeTransition: StartBattleRuntimeTransition,
      battleStartedEventCandidate,
      validation
    }
  | {
      kind: failure,
      battleState: null,
      runtimeTransition: null,
      battleStartedEventCandidate: null,
      validation
    }
```

処理順を固定する。

```text
StartBattleRuntimeTransition
- schemaVersion: "0.1.0"
- expectedWorldRngStateHash
- expectedMatchIdGeneratorStateHash
- nextWorldRngState
- nextMatchIdGeneratorState
- transitionHash

InternalCreateBattleStateInput
- createBattleRequest
- reservedMatchId
- battleSeed
```

- `transitionHash`は自身を除く全項目のcanonical JSON SHA-256とする。
- `validateStartBattleRuntimeTransition`は現在の両状態hashとexpected値、transitionHashを検証する純粋関数とする。
- runtime transitionだけを適用する公開APIを設けない。実際の置換は12仕様の`commitRunBattlePlan`内部で、BattleResult、人物効果、イベント候補と同じWorldEngine transactionに含める。
- 適用済み状態へ同じtransitionを含むcommit planを再適用するとexpected hashが一致しないため拒否する。

内部`createBattleState`はWorld RNGやMatchIdGeneratorStateを受け取らず、これらを進めない。


1. CreateBattleRequest、World RNG状態、MatchIdGeneratorState、RunRuleSnapshotを検証する。
2. 入力MatchIdGeneratorStateのcloneからMatchIdを1件予約する。
3. 全入力成功後だけWorld RNGから固定1回のuint32を取得し`battleSeed`とする。予約MatchIdとbattleSeedを`InternalCreateBattleStateInput`へ渡し、内部`createBattleState`を実行する。
4. ready BattleStateへ内部`beginBattle`を実行し、in_progress状態とEventId／sequence未割当の`battle.started`候補を生成する。
5. 2〜4のすべてが成功した場合だけ、進行後World RNG状態と進行後MatchIdGeneratorStateを1つの`StartBattleRuntimeTransition`へ封入して返す。この時点では未commitであり、12仕様の戦闘全体commit planへだけ引き渡す。
6. いずれかが失敗した場合はBattleStateとイベント候補を返さず、両状態を入力と完全一致させる。

- 戦闘内部RNGはbattleSeedから初期化し、戦闘内部のRNG消費をWorld RNGへ戻さない。
- success後のWorld RNGはbattleSeed取得1回分だけ進む。
- `battle.started`へbattleSeedを残す。
- 呼出側がWorld RNGだけ、MatchIdGeneratorStateだけ、開始BattleStateだけ、または`battle.started`候補だけをcommitすることを禁止する。
- `createBattleState`、`beginBattle`、`startBattleTransaction`をテストで個別利用する場合も純粋関数としてのみ扱い、返却途中状態を永続化しない。
- 標準WorldEngineは12仕様の`runBattleToCompletion`と`commitRunBattlePlan`を使用する。

## 11. 未commit開始計画の不変条件

- successではBattleState.status=`in_progress`、MatchId、battleSeed、`battle.started`候補がすべて存在する。
- failureではBattleState=null、イベント候補=null、runtimeTransition=nullとし、呼出側が保持するWorld RNGとMatchIdGeneratorStateを変更しない。
- BattleStateの`rngState`はbattleSeed由来の戦闘専用状態であり、runtimeTransition.nextWorldRngStateと混同しない。
- success結果は未commit計画である。12仕様の`RunBattleCommitPlan`へ含めずに保存しない。runtime state、開始BattleState、開始イベント候補の部分保存、expected hash不一致、transitionHash不一致、二重適用を拒否する。

## 12. sourceSnapshotHash

以下の決定的部分をcanonical JSON化してSHA-256を算出する。

- personId
- lifeStatus
- participationStatus
- careerStatus
- birthYear
- ageAtBattle
- stats
- aptitudes
- technique states（TechniqueId昇順）
- fatigue
- injury
- condition
- confidence
- battleDecisionProfile
- injuryProneness
- sprint1StateSchemaVersion
- currentMental

除外:

- 表示名
- 現実日時
- OS、Node、パス
- オブジェクト挿入順

## 13. battleInputHash

次の決定的部分をcanonical JSON化してSHA-256を算出する。

- matchId
- simulationId
- worldDate
- battleKind
- initialRange
- participantA.sourceSnapshotHash
- participantB.sourceSnapshotHash
- battleRulesRefHash
- runRuleSnapshotHash
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- battleSeed

人物snapshotとrun単位ルールsnapshot参照を別hashとして保持したうえで、戦闘1件全体の開始入力をbattleInputHashへ束ねる。

## 14. 入力検証

継続不能:

- 同一PersonId
- 不明PersonId／TechniqueId
- deceased／waiting／stopped
- ageAtBattleがworldDate・birthYearと不整合、または戦闘種別の年齢条件外
- 数値範囲外
- currentMentalが整数でない、または0..maxMental（50+spirit）の範囲外
- 負傷度がunableToContinueThreshold以上
- 重複TechniqueId
- 不正間合い
- battleKind不正
- simulationIdが02ミニ仕様のSimulationIdentityから再計算した値と不一致
- simulationIdentityHash欠落またはrun-metadata値と不一致
- RunRuleSnapshot、Sprint1ConfigまたはconfigVersion欠落
- RunRuleSnapshotのtechniqueCatalogIdentity欠落、catalogHash不一致、またはrunRuleSnapshotHash不一致
- RunRuleSnapshot.techniqueDefinitionsが完全カタログではない、TechniqueId重複、canonical順違反、またはcatalogHash再計算不能
- 関連TechniqueDefinitionのdataVersion混在
- sprint1ConfigHashと完全設定内容の不一致
- RNG状態欠落
- schemaVersion不一致
- BattleActionSourceIdentity不正、または実行ActionsSourceとidentity不一致

失敗時はBattleStateを部分生成せず、対象ID・理由・severity・canContinueを返す。

## 15. イベント

BattleStateの作成直後は `ready` であり、まだ戦闘は開始していない。`battle.started` は12仕様の`beginBattle`で `ready` から `in_progress` へ遷移した時点に1回だけ候補生成する。

### `battle.started`

EventEnvelope:

- `schemaVersion`: `0.2.0`

- `entities.personIds`: participantAId、participantBId
- `entities.matchIds`: matchId
- `sourceProcessor`: `battle-simulation`

payload:

- matchId
- battleKind
- participantAId
- participantBId
- worldDate
- initialRange
- battleSeed
- participantSnapshotHashes: { sideA: string, sideB: string }
- participantAActionSourceIdentity
- participantBActionSourceIdentity
- battleRulesRefHash
- runRuleSnapshotHash
- sprint1ConfigVersion
- sprint1ConfigHash
- battleInputHash
- techniqueCatalogDataVersion
- techniqueCatalogHash
- maxTurns

BattleState生成だけではイベントを出さない。全ターン詳細はグローバルevents.jsonlへ出さず、BattleResultへ保持する。

## 16. 不変条件

- participantAId != participantBId
- matchIdは有効な不透明`MatchId`
- battleKindはofficialまたはmock
- rangeは4段階のいずれか
- maxTurns=20
- sprint1ConfigVersionは入力RunRuleSnapshot.sprint1Config.configVersionと一致
- battleRulesRefHashはBattleRulesSnapshotRefの再計算値と一致
- runRuleSnapshotHashは入力RunRuleSnapshotの再計算値と一致
- battleInputHashは開始入力と両ActionSourceIdentityを含む再計算値と一致
- participantA／BActionSourceIdentityは戦闘中不変で、実行ActionsSourceの再計算identityと一致
- sprint1ConfigHashはRunRuleSnapshot内Sprint1Configの再計算値と一致
- techniqueCatalogHashとdataVersionは入力TechniqueCatalogIdentityと一致
- RunRuleSnapshot.techniqueDefinitionsは完全カタログのTechniqueId昇順配列と一致し、重複・欠落・追加がない
- BattleRulesSnapshotRef.relevantTechniqueIdsは両参加者が参照する習得済みTechniqueIdの和集合と一致する
- participant snapshotのlifeStatus／participationStatus／careerStatus／birthYear／ageAtBattleは開始入力と一致し戦闘中不変
- ageAtBattleは正本の4月第1週一斉加齢規則に従い、worldDateとbirthYearから再計算した値と一致
- initialRangeは4段階のいずれかで戦闘中不変
- currentDurabilityは0..maxDurability
- currentMentalは0..maxMental
- inBattleConsumptionは0..100
- unableToContinue=trueならcanAct=false
- 作成直後のunableToContinueはfalse
- battleSeedはuint32
- battleDecisionProfileとinjuryPronenessは0..100
- 成功時nextWorldRngStateは入力worldRngStateから正確に1回進んだ状態
- actionSequenceは0から開始
- ready状態のBattleDetailedLogはturnOrderLogs／actionLogsとも空
- ready状態ではfailure=null
- ready／in_progressではterminalReason=null、completedではterminalReason必須、failedではterminalReason=null
- in_progress／completedではfailure=null、failedではfailure必須
- 入力人物を変更しない
- 入力検証失敗時はWorld RNGを消費せず、BattleStateもイベントも生成しない
- 同一入力・同一World RNGでBattleState全文一致

## 17. 必須テスト

- 4間合い全値
- 標準初期間合いmiddle
- baseMaxDurability=maxDurability=100+stamina
- maxMental=50+spirit
- condition／fatigue／injuryによる開始currentDurability補正
- unableToContinueThreshold以上の入力人物拒否
- startDurabilityPercentの下限・上限
- currentMentalの持越しと範囲外開始前失敗（clamp禁止）
- injuryの戦闘内コピーと元人物非変更
- unableToContinue初期値false
- 開始補正でmaxDurability自体を変更しないこと
- official／mockのcareerStatus・年齢境界（8／15／16／41／42歳。42歳到達時はretired）
- ready／in_progress／completed／failedとfailure nullability
- 同一人物拒否
- deceased／waiting／stopped拒否
- 不明技拒否
- StartBattleResultのsuccess／failure union
- 成功時だけbattleSeed用にWorld RNGを1回進め、両next stateを1つの未commit StartBattleRuntimeTransitionとして返す
- 入力失敗時のWorld RNG・MatchIdGeneratorState非消費
- birthYear／ageAtBattle／sprint1StateSchemaVersionを含むsourceSnapshotHash
- ageAtBattleとworldDate・birthYearの境界（4月第1週を含む）
- RunRuleSnapshotのsimulationIdentityHash、config／catalog全文、identity、runRuleSnapshotHashの再計算一致
- BattleRulesSnapshotRefのself-excluding hash入力、relevantTechniqueIds／battleRulesRefHashの再計算一致
- DefaultBattleStrategy／scripted actions identity差分でbattleInputHashが変化
- pre-start failure／週rollbackでWorld RNGとMatchIdGeneratorStateが進まない
- transitionHash・expected state hash検証、片方だけcommit・古い状態へのapply・二重apply拒否
- 内部createBattleState／beginBattle中間結果の永続化禁止
- RunRuleSnapshotの完全カタログに存在するが未習得のTechniqueIdと、完全カタログにも存在しないTechniqueIdを区別できること
- battleInputHashの再計算一致
- participantSnapshotHashesがsideA／sideBへ正しく対応すること
- 入力不変
- same seedでbattleSeed、開始状態、StartBattleRuntimeTransition、BattleRulesSnapshotRef、各hash全文一致

## 18. 後続Sprintへ送る事項

- 大会種別による初期間合い
- 公式戦参加資格
- 特殊ルールによる最大ターン変更
- 観客・会場・地形

# 03 構造化イベント共通形式ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`

## 1. 目的

世界ニュース、人物年表、家系史、師系史の元になる構造化イベント形式を固定する。

## 2. 共通型

```ts
interface EventEnvelope<TPayload extends object = Record<string, unknown>> {
  schemaVersion: string;
  eventId: EventId;
  simulationId: SimulationId;
  sequence: number;
  eventType: string;
  importance: "minor" | "normal" | "major" | "historic";
  worldDate: WorldDate;
  origin: "initialization" | "simulation" | "validation";
  sourceProcessor: string;
  entities: {
    personIds: PersonId[];
    familyIds: FamilyId[];
    lineageIds: LineageId[];
    relationshipIds: RelationshipId[];
    tournamentIds?: TournamentId[];
    matchIds?: MatchId[];
  };
  payload: TPayload;
}
```

`TournamentId`と`MatchId`は00ミニ仕様で型だけを先行定義する。Sprint 0では`tournamentIds`と`matchIds`を生成せず、任意項目ごと省略する。

未使用の必須配列は空配列、未導入の任意項目は省略する。空文字・nullを混在させない。

Sprint 1以降の新規出力ではEventEnvelopeの`schemaVersion`を`0.2.0`へ固定し、`entities.matchIds`を必須キーとする（試合に関係しないイベントでは空配列）。`0.1.0`のまま必須キーを追加しない。詳細は「Sprint 1 EventEnvelope」節を参照する。

## 3. IDと順序

- simulationId：Sprint 0は00ミニ仕様の固定材料・順序で決定。Sprint 1以降の新規runは02ミニ仕様のSimulationIdentityから決定。
- sequence：0始まりの途切れない整数連番。
- eventId：`event_${String(sequence + 1).padStart(9, "0")}`。sequence 0は`event_000000001`。
- runId、現実時刻、処理時間はイベントへ含めない。
- 同一設定・シード・仕様版でイベント列・IDが一致する。

## 4. 日時・初期履歴

- worldDateはyear、month、weekOfMonth、absoluteWeek。
- 初期履歴は世界1年4月第1週に`origin=initialization`として登録。
- 初期状態は年初処理反映済みのため、世界1年の`world.year_started`は生成しない。
- 死亡済み祖先の過去の出生・死亡を再演しない。
- 過去年は人物レコードとpayloadの実績要約で保持。
- 出生イベントpayloadへ`birthWeekOfApril`、`birthMonth`、`birthWeek`または同義フィールドを出力しない。出生時点はEventEnvelope本体の`worldDate`で表す。新規の出生イベントは4月第1週にだけ生成する。

## 5. Sprint 0イベント

| eventType | 用途 |
|---|---|
| `world.started` | 初期世界開始 |
| `world.year_stats_finalized` | 完了した世界年の3月第4週終了時の年次統計確定 |
| `world.year_started` | 世界2年以降の4月第1週 |
| `family.initialized` | 初期家系登録 |
| `lineage.initialized` | 初期流派登録 |
| `person.initialized` | 初期人物・死亡済み祖先登録 |
| `relationship.initialized` | 初期関係登録 |
| `person.aged` | 4月第1週の年初一斉加齢 |
| `person.career_status_changed` | 年齢段階変更 |
| `person.debuted` | 16歳到達時の正式デビューと初期ランク付与 |
| `person.force_retired` | 42歳到達 |
| `simulation.completed` | 実行完了 |
| `validation.failed` | 不変条件違反 |

`person.debuted`のpayload最低項目：

- `previousCareerStatus`：デビュー直前の`child`または`trainee`
- `nextCareerStatus`：常に`active_competitor`
- `rank`：付与した共通ランク定義の最低ランク
- `previousRank`は未デビューのため持たせない

### `world.year_stats_finalized`

S00-004の`kind: "year_stats_finalized"`遷移を`eventType: "world.year_stats_finalized"`へ変換する。

payload：

```ts
{ worldYear: number }
```

- `entities`の必須配列はすべて空配列。
- `worldDate`は完了した世界年の3月第4週。
- `worldYear`がYのとき：`year=Y`、`month=3`、`weekOfMonth=4`、`absoluteWeek=Y*48-1`。
- 年境界では遷移順を維持し、`world.year_stats_finalized` → `world.year_started` → 人物イベントの順とする。

## 6. payload

- 固有の入力、結果、理由、前後状態を持つ。
- 完成した表示文章を正本として保存しない。
- 未実装項目を0や空文字で埋めない。
- Date、関数、BigIntなどJSON非対応値を入れない。

Sprint 0例（`schemaVersion=0.1.0`、matchIds省略）:

```json
{
  "schemaVersion": "0.1.0",
  "eventId": "event_000000043",
  "simulationId": "simulation_a1b2c3d4e5f60718",
  "sequence": 42,
  "eventType": "person.debuted",
  "importance": "normal",
  "worldDate": { "year": 3, "month": 4, "weekOfMonth": 1, "absoluteWeek": 96 },
  "origin": "simulation",
  "sourceProcessor": "age-progression",
  "entities": {
    "personIds": ["person_000123"],
    "familyIds": ["family_000021"],
    "lineageIds": [],
    "relationshipIds": []
  },
  "payload": {
    "previousCareerStatus": "trainee",
    "nextCareerStatus": "active_competitor",
    "rank": "F"
  }
}
```

Sprint 1の`person.aged`例（`schemaVersion=0.2.0`）:

```json
{
  "schemaVersion": "0.2.0",
  "eventId": "evt_...",
  "simulationId": "sim_...",
  "sequence": 42,
  "eventType": "person.aged",
  "importance": "minor",
  "worldDate": {
    "year": 3,
    "month": 4,
    "weekOfMonth": 1,
    "absoluteWeek": 96
  },
  "origin": "simulation",
  "sourceProcessor": "age-progression",
  "entities": {
    "personIds": ["person_..."],
    "familyIds": ["family_..."],
    "lineageIds": [],
    "relationshipIds": [],
    "matchIds": []
  },
  "payload": {
    "previousAge": 15,
    "newAge": 16,
    "debutEligibilityActivated": true
  }
}
```

## 7. Sprint 1 EventEnvelope

### schemaVersionとmatchIds

- Sprint 1以降のwriterは`schemaVersion=0.2.0`を出力する。
- 新規simulation runの`events.jsonl`は単一schemaVersionだけを使用する。Sprint 1以降に開始したrunでは、戦闘以外を含む全EventEnvelopeを`0.2.0`とする。
- `0.1.0`と`0.2.0`を同一runのEvent Streamへ混在させない。過去`0.1.0`出力の`0.2.0`変換は読込・監査・export用の派生成果物に限定し、変換後Streamへ新規イベントを追記したり、Sprint 1継続runとして扱ったりしない。
- reader／validatorは既存の`0.1.0`と新規`0.2.0`を明示的に識別する。
- `0.1.0`ではmatchIdsが存在しない既存出力をそのまま読めるが、新規イベントを書き戻す際に暗黙変換しない。
- `0.1.0`から`0.2.0`へ変換する場合は、専用migrationで`matchIds: []`を追加し、変換前後のschemaVersionを記録する。
- 異なるschemaVersionのイベントを同一決定性比較で等価扱いしない。
- run-metadata.jsonへEventEnvelope schemaVersionを1値だけ記録し、全行と一致させる（05ミニ仕様）。

`schemaVersion=0.2.0`の`entities`では次を必須とする。

```text
matchIds: MatchId[]
```

- 試合に関係しないイベントでは空配列を使用する。
- 重複を許さず、複数件の場合はMatchIdのcanonical昇順へ正規化する。
- schema外の`battleIds`等を追加しない。
- EventEnvelope validator、canonical JSON、再読込検証、参照整合検証の対象に含める。

### Sprint 1戦闘イベント

| eventType | 用途 |
|---|---|
| `battle.started` | 検証済みBattleStateがreadyからin_progressへ遷移した |
| `battle.finished` | 開始済み戦闘のcompletedまたはresolution_error結果が確定した |

共通規則:

- `schemaVersion=0.2.0`
- `origin=simulation`
- `sourceProcessor=battle-simulation`
- `entities.personIds`はsideA、sideBのPersonIdをcanonical順ではなく役割を失わないpayloadと併用し、EntityRefs配列自体は共通規則のcanonical昇順へ正規化する。
- `entities.matchIds`は対象MatchIdを1件保持する。
- `battle.started`は1試合につき最大1件、`battle.finished`は開始済み試合につき最大1件。
- 正常終了時の候補順は`battle.started`、`battle.finished`。開始後のresolution_errorでも同じ順とする。開始前検証失敗では両方とも生成しない。
- 戦闘機能はEventEnvelope候補を返し、グローバルEvent Streamへappendする層が既存のEventId生成器と次sequenceを使って包む。戦闘専用の独立sequenceを発行しない。
- 週間訓練を含む各Processorも同じ候補契約を使用し、個別Processorは`eventId`、`simulationId`、`sequence`を発行しない。
- WorldEngineは世界週の固定Processor順と各Processor内の固定候補順を連結した後、1シミュレーション共通の0始まりsequenceを割り当てる。
- 同一世界週の全Processor、世界不変条件、出力候補検証が成功するまで候補をbufferし、後続Processor失敗時はEventId／sequenceを発行せず週全体をrollbackする。
- payloadの完全構造は11仕様の`battle.started`、13仕様の`battle.finished`を参照する。

必須テスト追加:

- `0.1.0`既存イベントをmatchIdsなしで再読込できる。
- 新規runで全イベントが`0.2.0`に統一され、同一events.jsonl内の0.1.0／0.2.0混在を拒否する。
- run側に記録したEventEnvelope schemaVersionと全イベント行が一致する。
- `0.2.0`ではmatchIds欠落を拒否し、非戦闘イベントの空配列を受理する。
- `0.2.0`のmatchIds重複・不正MatchId・canonical順違反を拒否する。
- migrationは`0.1.0`へmatchIds空配列を追加して`0.2.0`を生成し、元イベントを変更しない。
- `battle.started`／`battle.finished`は対象MatchIdを1件保持する。
- 既存EventId／sequence割当層で全Processor横断のsequenceが連続し、戦闘・週間訓練とも独立sequenceを作らない。
- 後続Processorまたは週末不変条件失敗時に候補、EventId、sequence、WorldState、RNGが全rollbackされる。

## 8. JSONL

- UTF-8、1行1イベント、末尾改行。
- 決定性比較用に02ミニ仕様と同じ正規化JSONを使用する。
- sequence順で出力。

## 9. 受入テスト

1. 最小イベントの生成・JSON往復。
2. 複数種別ID参照を保持。
3. sequence 0から`event_000000001`を生成。
4. 同一入力から同一JSONL。
5. sequenceの欠番・重複を検出。
6. 存在しない関連IDを検出。
7. 現実時刻が変わっても決定的列は不変。
8. 加齢イベントは4月第1週だけ。
9. 初期イベントに`world.year_started`を含めない。

## 10. 対象外

公開文章生成、多言語、MySQL、詳細戦闘ログ、保持期限、リアルタイム配信。
詳細戦闘ログ本体は`MatchId`／`BattleLogId`で関連付け、世界イベントへターン全件を複製しない。

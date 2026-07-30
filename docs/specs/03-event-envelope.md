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

## 3. IDと順序

- simulationId：00ミニ仕様の固定材料・順序で決定。
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
| `person.aged` | 4月第1週の一斉加齢 |
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

例：

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

## 7. JSONL

- UTF-8、1行1イベント、末尾改行。
- 決定性比較用に02ミニ仕様と同じ正規化JSONを使用する。
- sequence順で出力。

## 8. 受入テスト

1. 最小イベントの生成・JSON往復。
2. 複数種別ID参照を保持。
3. sequence 0から`event_000000001`を生成。
4. 同一入力から同一JSONL。
5. sequenceの欠番・重複を検出。
6. 存在しない関連IDを検出。
7. 現実時刻が変わっても決定的列は不変。
8. 加齢イベントは4月第1週だけ。
9. 初期イベントに`world.year_started`を含めない。

## 9. 対象外

公開文章生成、多言語、MySQL、詳細戦闘ログ、保持期限、リアルタイム配信。

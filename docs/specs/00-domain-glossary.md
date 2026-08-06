# 00 ドメイン用語・共通型ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`

## 1. 目的

Sprint 0で使用する用語、識別子、人物状態、能力キー、家系、流派、関係の最小定義を固定する。正本は`docs/SPEC.md`。

## 2. 共通用語

| 用語 | 定義 |
|---|---|
| 世界 | 全人物、家系、流派、関係、イベント、現在日時を含む共有シミュレーション単位 |
| 人物 | 存命・死亡を問わず血統・師系・競技履歴を持つ個体 |
| 初期NPC | 世界1年4月第1週の開始時点から存在するNPC |
| ユーザー始祖 | ユーザーが世界へ投入する家系の起点。年途中の申請は次年度4月第1週から参加 |
| 家系 | 人物の所属家と歴史。生物学的父母とは別に所属家系を持つ |
| 血統 | 父母から子へ続く生物学的系譜 |
| 流派 | 技・型・術・修行方法・戦い方を共有する体系 |
| 師系 | 師匠から門下へ続く技術上の系譜 |
| 世界年 | 4月第1週から翌年3月第4週までの48週間 |
| 通算世界週 | 世界1年4月第1週を0とする週番号 |
| 出生時期 | 全人物を4月第1週生まれとして扱う。人物別の誕生月・誕生週・誕生日は保持しない |
| ランク | F〜Sの到達階級。降格しない |
| オープンクラス | A・Sが共通で出場する通常大会クラス |
| 初期履歴 | 世界開始前に成立済みとして生成する人物・関係・実績要約 |
| 試合 | 2人物間で開始から終了まで一意に識別される1件の戦闘 |
| MatchId | 試合1件を識別する意味非依存の不透明なbranded ID |

人物ごとの誕生月・誕生週・誕生日という用語・データは使用しない。全人物は4月第1週生まれ。

## 3. 識別子

Sprint 0必須型：`WorldId`、`PersonId`、`FamilyId`、`LineageId`、`RelationshipId`、`EventId`、`SimulationId`、`RunId`。

イベント共通型の将来互換用に、Sprint 0ではエンティティを生成しない型専用予約IDとして`TournamentId`、`MatchId`も定義する。Sprint 1以降は`MatchId`を試合識別子として発行・参照する（後述）。

後続追加：`TechniqueId`、`BattleLogId`、`UserId`。

### ID規則

- 初期世界のエンティティIDは種別ごとの決定的ゼロ埋め連番。
- 例：`person_000001`、`family_000001`、`lineage_000001`、`relationship_000001`。
- 生成順を固定し、同一設定・シード・仕様版で同じIDを得る。
- 表示名、配列の偶然の並び、ランダムUUID、`Math.random()`をID生成に使わない。
- IDは名称・所属・状態が変わっても変更しない。
- 死亡者も削除せず同じIDで保持する。
- 1シミュレーション内の世界IDは`world_000001`で固定する。
- `RunId`は実行ディレクトリ識別用の非決定的IDであり、決定性比較から除外する。

### ハッシュとsimulationId

- `configHash`は02ミニ仕様の正規化JSONから生成する。
- `nameDataHash`は06ミニ仕様に従い、検証済みmanifestの正規化JSONから生成する。
- Sprint 0の`simulationId`の材料は次の順で固定する。

```text
SPEC-0.1.1|S0-SPEC-0.1.5|<configHash>|<seedの10進整数>|<nameDataHash>|xoshiro128ss-v1
```

このUTF-8文字列のSHA-256を小文字16進数化し、先頭16桁から`simulation_<16hex>`を生成する。区切り、順序、大小文字を変更しない。Sprint 0で生成済みの旧`simulationId`を再計算して置換しない。

Sprint 1以降に開始する新規runの`simulationId`は、02ミニ仕様の`SimulationIdentity`（schemaVersion `0.3.0`）から生成する。正本仕様版は`SPEC-0.1.2`、Sprint 1仕様版は`S1-SPEC-0.1.12`をidentityへ含める。詳細は`docs/specs/02-config-schema.md`および`docs/specs/14-sprint1-config-schema.md`を参照する。

### MatchId（Sprint 1）

- 戦闘1件の識別には`MatchId`を使用し、同義の`BattleId`を新設しない。
- `MatchId`へ世界年、人物ID、配列位置、表示名などの意味を埋め込まない。
- `MatchId`の一意性スコープは1つの`simulationId`内とする。異なるrun間で同じMatchId文字列が現れることを許容し、全体識別には`(simulationId, matchId)`を使用する。
- 注入された決定的ID生成器から発行し、同一入力・同一seed・同一発行順で一致させる。
- `MatchIdGeneratorState`は既存の決定的ID生成器が提供するclone可能・snapshot／restore可能な不透明状態とし、ゲーム側が内部カウンタや乱数列を再解釈しない。
- fresh runの初期状態は`createInitialMatchIdGeneratorState({ seed, generatorVersion, namespace: "match" })`から必ず生成し、同じ入力で同じcanonical snapshotを返す。任意の外部カウンタ値や前runの状態を初期値として注入しない。
- 初期状態をcanonical JSON化したSHA-256を`initialMatchIdGeneratorStateHash`としてSimulationIdentityとRunRuleSnapshotへ保存する。
- `MatchIdGeneratorState`はWorldState、World RNG、EventId生成器、Event sequenceと同じWorldEngineトランザクションへ含める。
- 中断・再開を許す実行では既存の`WorldEngineRuntimeState`または同等checkpointへMatchIdGeneratorStateを保存し、再開時に完全復元する。保存先を追加ファイルとして増やさず、既存runtime state契約へ統合する。
- 同一週の後続Processor、世界不変条件、イベント候補検証のいずれかが失敗した場合、`MatchIdGeneratorState`も週開始値へrollbackする。
- 標準WorldEngineが公開する戦闘実行APIは12仕様の`runBattleToCompletion`とし、11仕様の`startBattleTransaction`、`createBattleState`、`beginBattle`は未commitの純粋stageとして扱う。MatchId予約、battleSeed用World RNG消費、人物効果、開始・終了イベント候補、BattleResultは12仕様の`RunBattleCommitPlan`だけで不可分にcommitし、中間結果を個別commitしてはならない。
- pre-start failureではWorld RNGとMatchIdGeneratorStateの両方を入力値のまま返し、同じMatchIdを再試行可能とする。
- `matchIdGeneratorVersion`をSimulationIdentityとRunRuleSnapshotへ保存し、同じ版文字列で発行規則を変更しない。
- 大会との関連はSprint 2で`TournamentId`から`MatchId`を参照する。
- 詳細ログを別エンティティとして永続化する将来段階では`BattleLogId`を使用できるが、`MatchId`と混同しない。

## 4. 人物の基本型

### 性別

Sprint 0の`sex`は`male | female`。人数は02ミニ仕様の丸め規則で決定する。後続の表現拡張は別仕様変更とする。

### 生存状態と参加状態

- `lifeStatus`：`living | deceased`
- 存命人物だけが`participationStatus`を持つ：`waiting | active | stopped`
- 死亡済み人物は`participationStatus`と`currentAge`を持たず、`deathYear`と`ageAtDeath`を持つ。
- 存命人物は`deathYear`と`ageAtDeath`を持たない。
- JSONへ未該当項目を`null`で埋めず、判別可能なunionとして扱う。

### `careerStatus`

| 値 | 条件 |
|---|---|
| `child` | 0〜7歳 |
| `trainee` | 8〜15歳 |
| `active_competitor` | 16〜41歳かつ未引退 |
| `retired` | 引退済み。42歳以上の存命人物は必ず該当 |

死亡済み人物の`careerStatus`は死亡時点の最終状態を保持する。

Sprint 0では18〜41歳の自律引退は実装せず、42歳到達時の強制引退だけ行う。

### 導出資格

- `canEnterLineage`：8〜41歳、存命、活動中、未引退
- `canDebut`：16〜41歳、存命、活動中、childまたはtrainee
- `canVoluntarilyRetire`：18〜41歳、存命、活動中、現役
- `mustRetire`：42歳以上、存命、現役
- 死亡済み人物の導出資格はすべて`false`

### 16歳正式デビュー

- 16歳到達時に正式デビューし、`careerStatus`を`active_competitor`へ変更する。
- デビュー時に共通ランク定義の最低ランク（現在の体系ではF）を`currentRank`と`highestRank`へ付与する。
- デビュー時期を人物AIが遅らせることはない。

## 5. 出生情報

- 全人物は4月第1週生まれとして扱う。
- 人物別の誕生月・誕生週・誕生日は保存しない。
- 永続的な出生情報として`birthYear`を保持する。
- 存命人物は`birthYear`と`currentAge`を持つ。
- 活動世界内の年齢は`currentWorldYear - birthYear`で算出し、保存値がある場合も同じ式と一致させる。
- 世界年の4月第1週に、その世界年より前に出生した`lifeStatus=living`かつ`participationStatus=active`の人物を一斉に1歳加齢する。
- `waiting`、`stopped`、`deceased`、および同じ年初処理で出生した年齢0歳の人物は加齢しない。
- 同一世界年に複数回加齢してはならない。
- 初期世界は世界1年4月第1週の年初処理後スナップショットとする。
- 初期年齢を`A`とした場合、`birthYear = 1 - A`とする。
- `birthWeekOfApril`、`birthMonth`、`birthWeek`または同義フィールドを人物へ追加しない。
- 死亡済み人物は`birthYear < deathYear <= 0`を基本とし、`ageAtDeath = deathYear - birthYear`。

## 6. 能力・適性の固定キー

基礎能力6項目：

| キー | 表示名 |
|---|---|
| `stamina` | 体力 |
| `strength` | 筋力 |
| `skill` | 技量 |
| `speed` | 速度 |
| `spirit` | 精神 |
| `magic` | 魔力 |

適性3項目：

| キー | 表示名 |
|---|---|
| `unarmed` | 格闘適性 |
| `sword` | 剣技適性 |
| `magic` | 魔法適性 |

各項目は`surfaceValue`、`expressedGeneticValue`、`latentGeneticValue`を持つ。Sprint 0では生成・範囲検証だけを行い、成長・遺伝計算は行わない。

Sprint 1以降の`TechniqueCategory`、`BasicAttackProfile`、流派主系統（`mixed`を除く）も上記適性キーと同一とする。`martial`や基礎能力としての`vitality`／`technique`は使用しない。

## 7. ランクと参加クラス

- ランク：`F | E | D | C | B | A | S`
- 一度到達したランクは降格しない。
- `currentRank`は現役競技者だけが持ち、未デビュー者・引退者は持たない。
- 引退時は直前の`currentRank`を`retirementRank`へ保存し、`currentRank`を外す。
- `highestRank`は生涯履歴として引退後・死亡後も保持する。
- 16歳未満はランクなし。16歳到達時の正式デビューで最低ランクを付与する。
- A・Sは共通の`open`クラス。
- 最高位は通常ランクではなく称号。
- Sprint 0では初期履歴として保持するだけで大会・昇格を処理しない。

## 8. 家系・親子

`Family`最低項目：ID、家名、状態`active | at_risk | extinct | revived`、家系基準出生率、初期履歴フラグ。

親子関係：

- 種別は`parent_child`。
- `parentId`から`childId`への有向関係として1親につき1件保持する。
- 親子関係は`parentRole: father | mother`を持ち、parentのsexと一致させる。
- 生物学的親は最大2名で、father・motherは各最大1名。
- 父母IDと所属家系を別管理。
- 婚内子・婚外子で同じ血統参照を使う。
- Sprint 0では所属判定を再計算しない。

## 9. 流派・師弟

`Lineage`最低項目：ID、流派名、主系統`unarmed | sword | magic | mixed`、創始者ID、創始家系ID、状態`active | extinct | revived`。

初期24流派の主系統は`unarmed | sword | magic`だけを使用し、`mixed`は後続用予約値とする。

正式師弟関係：

- 種別は`master_disciple`。
- `masterId`から`discipleId`への有向関係として保持する。
- 師匠は存命・引退済み・師匠資格あり。
- 門下生は存命・活動中・8〜41歳。
- 同時点の正式師匠は原則1名。
- 親子かつ師弟を許可。
- Sprint 0では既存関係を生成するだけ。

## 10. 婚姻

- 種別は`marriage`。
- 1組につき1関係レコードを持ち、`personAId < personBId`のID順で正規化する。逆向きの重複レコードを作らない。
- 初期世界に既存婚姻を生成する。
- 現在配偶者は最大1名。
- 存命夫婦は双方引退済み。
- 親子・祖父母孫・兄弟姉妹・おじおば甥姪は禁止。
- 従兄妹は許可。
- Sprint 0では新規結婚・離婚・死別・再婚を処理しない。

## 11. 初期履歴

- 存命600人に加え死亡済み祖先200人を生成する。
- 祖先は最大3世代前まで。
- 過去大会・過去対戦・詳細戦闘ログは生成しない。
- ランク・名声・師匠資格は実績要約として保持する。
- 死亡済み人物は週次処理対象外。

## 12. 不変条件

- 人物・家系・流派・関係の参照先が存在する。
- 自分自身を親・配偶者・師匠・門下生にしない。
- 親子・師弟グラフに循環がない。
- 親は子より18歳以上年長。
- 配偶者は1人最大1名。
- 正式師匠は引退済みかつ資格あり。
- 16歳未満は`currentRank`なし。
- 引退者は`currentRank`なし。
- 42歳以上の存命人物は引退済み。
- 同一設定・シード・仕様版で同じID・名称・関係を得る。

## 13. Sprint 0対象外

能力成長、技習得、戦闘、大会、昇格、自律引退、新規師弟、新規恋愛・結婚、出産・遺伝、寿命・死亡、家系断絶・再興判定。

# 04 初期世界生成ミニ仕様

- ミニ仕様バージョン：`S0-SPEC-0.1.5`

## 1. 目的

設定とシードから、存命人物、死亡済み祖先、家系、流派、既存の親子・婚姻・師弟関係を持つ初期世界を決定的に生成する。

## 2. 入出力

```ts
interface InitialWorldGenerationInput {
  config: InitialWorldConfig;
  configHash: string;
  seed: number;
  nameData: ValidatedNameData;
  nameDataHash: string;
  rngFactory: SeededRngFactory;
  sha256Provider: Sha256Provider;
}

interface InitialWorldSnapshot {
  schemaVersion: string;
  simulationSpecVersion: string;
  nameDataVersion: string;
  simulationId: SimulationId;
  worldId: WorldId;
  worldDate: WorldDate;
  configProfileId: string;
  configHash: string;
  seed: number;
  rngAlgorithm: "xoshiro128ss-v1";
  persons: Person[];
  families: Family[];
  lineages: Lineage[];
  relationships: Relationship[];
  generationSummary: InitialGenerationSummary;
}
```

RNGは07ミニ仕様の`xoshiro128ss-v1`を注入し、`Math.random()`は禁止。

## 3. 基準設定

- 存命600人
- 死亡済み祖先200人
- 家系100
- 流派24
- 師匠資格者45
- 年齢：0〜7歳80、8〜15歳120、16〜41歳220、42〜70歳180
- 現役ランク：F70、E55、D40、C30、B15、A8、S2
- 祖先は最大3世代前、死亡年齢18〜90歳
- 既存親子・婚姻・師弟あり
- 過去大会・対戦・戦闘ログなし

## 4. 乱数サブストリームと固定選択規則

初期世界生成は07ミニ仕様の`deriveSeed`を使い、少なくとも次の固定labelへ処理を分離する。

```text
initial-world/persons/deceased
initial-world/persons/living/age-0-7
initial-world/persons/living/age-8-15
initial-world/persons/living/age-16-41
initial-world/persons/living/age-42-70
initial-world/families
initial-world/names/family
initial-world/names/person
initial-world/lineages
initial-world/ranks/active
initial-world/ranks/retired
initial-world/relationships/parent
initial-world/relationships/marriage
initial-world/relationships/master
initial-world/abilities
```

- 候補集合はID昇順で作ってから、対象サブストリームで1回だけ非破壊shuffleする。
- 条件を満たす最初の候補から決定的に採用し、無制限の再抽選を行わない。
- 候補不足時は無効なデータで補わず、設定検証エラーまたは生成エラーとする。目標割合だけは仕様で許可された範囲で警告・実績値へ落とせる。
- 件数配分で端数が出る場合は最大剰余法を使う。`base=floor(weight*targetCount/weightSum)`と`remainder=(weight*targetCount)%weightSum`を整数演算で求め、余剰枠はremainder降順、同値時は仕様に記載したキー順で配る。浮動小数の丸め差を順位決定に使わない。

## 5. 決定的生成順序

1. 設定・名前manifestを検証し、02・06ミニ仕様の正規化規則と注入された`Sha256Provider`でconfigHashとnameDataHashを検証する。00ミニ仕様の材料順でsimulationIdを作る。
2. worldIdを`world_000001`として、世界1年4月第1週を設定する。
3. 人物IDは死亡済み祖先200人、存命600人の順に予約する。基準設定では`person_000001`〜`person_000200`が死亡済み、`person_000201`〜`person_000800`が存命となる。
4. 死亡済み祖先を生成する。sexは総数に対して`floor(count × sexRatioMale)`をmale、残りをfemaleとし、候補列をshuffleする。`ageAtDeath`は設定範囲の整数、`deathYear`は0以下、`birthYear >= earliestHistoricalYear`、`ageAtDeath=deathYear-birthYear`を満たす。
5. 存命人物を年齢帯順に生成する。各帯でmale件数を先に作り残りをfemaleとし、sex候補列を帯専用サブストリームでshuffleする。年齢は各人物ごとに`nextInt(minAge,maxAge+1)`で決め、`birthYear=1-currentAge`とする。
6. ID順に100家を生成し、家名候補を専用サブストリームでshuffleしてfamilyId順へ重複なしで割り当てる。
7. 存命人物IDをshuffleし、先頭100人をfamilyId順へ1人ずつ割り当てる。残る存命人物、死亡済み人物の順に、上限未到達のfamilyId候補を毎回ID順で作り、専用サブストリームで選ぶ。全家系人数を設定の最小・最大内にする。
8. 家系所属確定後、06ミニ仕様に従って全人物へ個人名・家名・表示名を割り当てる。
9. 24流派の空レコードをlineageId順で作る。創始者候補（存命引退者または死亡済み祖先）が1名以上いる家系だけをfamilyId順で候補化し、shuffle後の先頭24家を創始家系にする。各家系内の創始者候補もID順候補から決定的に選ぶ。主系統件数は設定重みを最大剰余法で24件へ按分し、キー順`unarmed`、`sword`、`magic`で並べた後shuffleしてlineageId順へ割り当てる。
10. 親子関係を生成する。対象件数は`relationships`設定と第7節の割合規則で算出し、両親既知対象を先に確定する。親候補はparentRoleとsexが一致し、子より18歳以上年長で、死亡済みなら`deathYear >= child.birthYear`を満たす人物だけとする。年齢が必ず上方向へ進むため循環を作らない。
11. 存命引退者間の既存婚姻を生成する。禁止近親を除いた`personAId < personBId`の全候補組を作り、shuffle後に未使用人物同士を設定から算出した組数だけ貪欲に採用する。基準設定は40組。
12. 16〜41歳のpersonId列をshuffleし、ランクキー順`F,E,D,C,B,A,S`の設定件数を順に割り当てる。`currentRank=highestRank`とする。
13. 存命引退者の履歴ランク件数は、`activeRankDistribution`の比率を引退者数へ最大剰余法で按分する。引退者IDをshuffleし、`F,E,D,C,B,A,S`順に`retirementRank=highestRank`を割り当てる。C以上の候補をID順で候補化してshuffleし、先頭`initialQualifiedMasters`人を師匠資格者とする。基準設定の履歴ランク件数はF57、E45、D33、C25、B12、A6、S2で、C以上が45人となる。
14. 師匠資格者をshuffleし、lineageId順へ巡回割当して所属流派を決める。8〜41歳の正式師匠対象人数を算出し、対象弟子IDをshuffleする。各弟子には同一人物でない資格者候補から1名を決定的に割り当て、弟子のlineageIdを師匠の流派へ合わせる。
15. 基礎能力キー順`stamina,strength,skill,speed,spirit,magic`、適性キー順`unarmed,sword,magic`、値順`surfaceValue,expressedGeneticValue,latentGeneticValue`で、設定範囲の整数を`nextInt(min,max+1)`から生成する。
16. 全不変条件を検証する。
17. 初期イベントとサマリーを返す。

IDは種別ごとのゼロ埋め連番で、上記のエンティティ生成順と関係種別順を変更しない。

## 6. 人物

存命人物の最低項目：

- personId
- givenName、familyName、displayName、nameDataVersion
- sex
- lifeStatus=living
- participationStatus=active
- careerStatus
- birthYear
- currentAge（検証可能なキャッシュ）
- familyId
- lineageId（なし可）
- currentRank（現役かつ初期ランクありの場合のみ）
- highestRank
- retirementRank（引退者で履歴がある場合のみ）
- qualifiedMaster
- 表面能力、顕在遺伝値、潜在遺伝値
- 3系統適性の表面・顕在・潜在値

年齢状態：0〜7 child、8〜15 trainee、16〜41 active_competitor、42〜70 retired。

死亡済み祖先：lifeStatus=deceased、週次対象外、`participationStatus`と`currentAge`を持たず、`birthYear < deathYear <= 0`、`ageAtDeath=deathYear-birthYear`を基本とする。一部を創始者・過去師匠・上位実績者にでき、死亡時点のcareerStatusと最高実績を保持する。

人物別誕生週フィールドは作らない。

## 7. 親子・婚姻

- `knownParentCoverage`は少なくとも1名の親が既知の存命人物数に適用する。対象人数は切り捨て。父・母は各最大1名で、親のsexとparentRoleを一致させる。
- その対象のうち`twoKnownParentsCoverageAmongCovered`分を2親既知とし、残りを1親既知とする。対象人数は切り捨て。整合条件で不足する場合は警告と実績を出し、無効な親を作らない。
- `retiredSpouseCoverage`は存命引退者人数へ適用し、切り捨て後に直近の小さい偶数へ丸める。基準値では80人・40組。

- 親は最大2名、子より18歳以上年長。
- 親は存命または死亡済み。
- 自己参照・循環禁止。
- 家系所属は初期履歴として確定済み。
- 夫婦は双方存命・引退済み、1人1配偶者、対称。
- 禁止近親を除外。従兄妹は許可。

## 8. 流派・師弟

- 24流派、初期主系統は設定重みどおり`unarmed | sword | magic`から生成する。`mixed`はSprint 0初期生成で使用しない。
- 創始者は存命引退者または死亡済み祖先。
- 師匠資格者45人は存命引退者。
- 資格根拠はC以上相当の実績要約。過去大会自体は作らない。
- 門下生は8〜41歳、正式師匠は存命・引退・資格あり。
- 師弟グラフの循環禁止。

## 9. 能力

00ミニ仕様で固定した基礎6能力キーと3適性キーについて、表面・顕在遺伝・潜在遺伝値を設定範囲内で生成する。Sprint 0では親子遺伝計算や成長を行わない。

## 10. 初期イベント

イベントは集約せず1エンティティ／1関係につき1件生成する。順序は次で固定する。

1. `world.started`を1件（世界1年の`world.year_started`は作らない）
2. `family.initialized`をfamilyId順
3. `lineage.initialized`をlineageId順
4. `person.initialized`をpersonId順
5. `relationship.initialized`をrelationshipId順

イベント列とIDは同一条件で完全一致させる。

## 11. サマリー

存命・死亡済み、年齢、性別、競技段階、ランク、家系、流派、師匠資格、親子、親既知率、婚姻、師弟、参照不整合を目標値と実績値で出力。

## 12. 不変条件

- 600／200／100／24／45が設定と一致し、100家すべてに存命人物が1名以上いる。
- 年齢帯・ランク分布が一致。
- 全人物の出生時期は4月第1週固定で、人物別週を持たない。
- `currentAge = 1 - birthYear` が初期状態で成立。
- 16歳未満はcurrentRankなし。
- 初期42歳以上は引退済み・currentRankなし。過去の到達ランクはhighestRank／retirementRankへ保持。
- 親子・師弟循環なし。
- 親子年齢差18歳以上。
- 配偶者関係は対称・重複なし。
- 正式師匠は存命・引退・資格あり。
- 壊れた参照0。
- 同一設定・シード・仕様版・名前版でスナップショット完全一致。

## 13. 受入テスト

1. 基準件数を生成。
2. 同一シードでID・名前・属性・関係・サマリー一致。
3. 異なるシードで一部属性または配置が異なる。
4. 存命人物にbirthYear・currentAgeがありbirthWeekフィールドがない。死亡済み人物にdeathYear・ageAtDeathがありcurrentAgeがない。
5. 初期年齢を再計算可能。
6. 親子・師弟の循環・自己参照を検出。
7. 禁止近親夫婦なし。
8. 正式師匠条件を満たす。
9. 家名100件が重複なし。
10. 参照不整合0。
11. 24流派の名称が重複せず、創始者・創始家系を追跡できる。
12. 100家すべてがactiveで、存命人物1名以上、総人数が設定範囲内。
13. relationshipIdの種別順と親役割が固定規則どおり。

## 14. 対象外

新規出生・死亡、自律行動、成長、技、大会・戦闘、昇格、新規婚姻、受入判断、MySQL保存。

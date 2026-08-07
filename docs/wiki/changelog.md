---
title: Wiki更新履歴
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/wiki/index.md
  - docs/SPRINT_1_BACKLOG.md
  - docs/SPEC_CHANGELOG.md
  - tag:sprint0-complete
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
  - commit:60d5b6b821983b047debd51bccc43389d363f953
last_verified: 2026-08-08
---

# Wiki更新履歴

## 概要

このファイルは **Wiki全体（全Sprint共通）** の更新履歴だけを記録する。ゲーム仕様の変更履歴（[`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md)）とは別である。

## 履歴

### 2026-08-08 — S1-SPEC-0.1.14 戦闘ターン入力契約の明文化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.14`へ版上げ。`BattleActionReplacementReason`完全enum、`battle-action-script-0.1.0`完全構造、技使用回数（attempted／successful）契約を正本へ固定
- Sprint1Config balance／SHAは不変。S01-006 productionターンResolverは未実装
- 次はS01-006。Sprint 1全体は未完了

### 2026-08-07 — S01-005 戦闘開始・BattleState生成を実装

- `match-id-generator-0.1.0` のproduction実装（形式・state 5キー・予約遷移・canonical state hash・枯渇sentinel）。MatchId操作でRNGを消費しない
- `RunRuleSnapshot` `0.4.0`／`BattleRulesSnapshotRef` `0.1.0`／`BattleActionSourceIdentity` `0.1.0`／`BattleState` `0.5.0`／`StartBattleRuntimeTransition` `0.1.0` を追加
- 参加資格・年齢整合・負傷続行不能閾値・`currentMental`非clamp・開始耐久の基準点整数計算を実装
- `startBattleTransaction` は未commit計画のみを返す内部純粋関数。成功時だけWorld RNGを1回進め、両next stateを1つのruntime transitionへ封入する
- `reserveNextMatchId`／`createBattleState`／`beginBattle`／`startBattleTransaction`／runtime transition適用APIはpackage rootへ公開しない
- ターン解決・BattleResult・WorldEngine登録は対象外
- 次はS01-006。Sprint 1全体は未完了

### 2026-08-07 — S1-SPEC-0.1.13 MatchId決定的生成器契約の明文化

- Sprint 1ミニ仕様を`S1-SPEC-0.1.13`へ版上げ。MatchId形式・GeneratorState・予約遷移・seed役割・canonical hashを正本へ固定
- Sprint1Config balance／SHAは不変。MatchId生成器／S01-005戦闘開始は未実装
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-07 — S01-004 最終イベント契約修正（technique unit）

- `technique.learning_progressed`へ`unit: "tenths"`、`technique.mastery_increased`へ`unit: "hundredths"`を追加
- `technique.acquired`は既存payloadのまま（unit／before／afterなし）
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 最終受入監査修正2（年齢境界／teacher CareerStatus／公開API）

- 正式訓練対象を`isFormalTrainingEligible`（8..41）へ揃え、42歳以上はrest限定
- teacher contextの`masterCareerStatus`をS01-003と同じCareerStatus列挙で完全検証
- package rootから内部draft／effect／commit前validatorを除外
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 受入監査修正（inactive state／focus／post-validation／Person境界／rng harden）

- inactiveを含む全人物へ`Sprint1PersonState`を必須化。欠落は週全体failure
- 週開始時の`normalizeWeeklyLearningFocus`、effect後の`validateProcessedWeeklyPersonRecord`、`Person`構造検証、`validateSeededRngState`を追加
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-06 — S01-004 週間行動・訓練・技習得を実装

- 週間行動列挙・強制休養／fallback理由・整数`scoreHundredths`・`multiplyBasisPointsFloor`・`drawInclusiveBasisPoints`・`TrainingProcessorRuntimeState`・`processWeeklyTrainingWeek` を追加
- 週開始スナップショット凍結、週単位の原子性、同一週再処理／週番号逆行の拒否を実装
- 正本10・14がルールを定義していない入力（planner context score、師匠推薦度、styleMatch、相性など）は sidecar 入力として受け取り、処理側で導出しない
- イベントはcandidateのみ。EventEnvelope化とWorldEngine登録は S01-008
- 次はS01-005。Sprint 1全体は未完了

### 2026-08-05 — S1-SPEC-0.1.12 最終受入監査修正（整数score・RNG BP・一括floor・acquirable・累積）

- LearningTarget／PracticeTargetの整数`scoreHundredths`、効果RNGの`drawInclusiveBasisPoints`、`multiplyBasisPointsFloor`、`acquirable`週間契約、RuntimeState累積、行動別イベントfixtureを正本へ追補
- Wikiの「Sprint 1実装未着手」旧記述を削除。`2800d3b`は`S1-SPEC-0.1.11`確定commitと明記
- **実装ではない**。仕様版は`S1-SPEC-0.1.12`のまま（0.1.13へ上げない）。次の実装着手はS01-004
- 詳細は [`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md) の同日エントリを正とする

### 2026-08-05 — S1-SPEC-0.1.12 週間処理仕様の未確定事項を明文化（clarification）

- Sprint 1ミニ仕様を`S1-SPEC-0.1.12`へ版上げ。週間Plannerの強制休養／rest fallback／scoreHundredths／RuntimeState／event責務順などを正本へ補完
- **実装ではない**。S01-004の週間Processor実装は別タスク
- 詳細は [`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md) の同日エントリを正とする

### 2026-08-05 — S01-003 最終受入監査修正2（provider境界／検証順）

- `validateTechniqueCatalogAgainstIdentity` は expectedIdentity を先に検証し、不正時は SHA provider を呼ばない
- `validateSprint1PersonTechniqueSemantics` は Sprint1PersonState 構造を catalog より先に検証し、不正時は SHA provider を呼ばない
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-003 受入監査修正（teacher定義結び付け／progress cap／safe mentalCost／context harden）

- `teacherCanTeach(definition, context)` へ変更。閾値は `TechniqueDefinition.teachingProficiencyRequired` のみ。師匠状態の TechniqueId 一致を必須
- `deriveLearningTargetStatus` は定義と state の TechniqueId 一致、および progress の `0..cap` を強制（cap+1 は failure）
- `mentalCost` を safe integer に限定。`TechniqueSemanticsPersonContext` は `spiritSurfaceValue` のみへ harden
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-003 技カタログ・熟練度・習得状態を実装

- `TechniqueDefinition`／`TechniqueCatalogIdentity`／`TechniqueCatalog`、catalog hash、参照整合、PersonTechniqueState 意味validation、習得条件、LearningTargetDerivedStatus、requiredStatsFactor、mastery 参照、teacherCanTeach、basicAttackProfiles 分離を追加
- 正式な production 技一覧は未作成。週間更新・RNG・戦闘・WorldEngine は未実装
- 次はS01-004。Sprint 1全体は未完了

### 2026-08-05 — S01-002 最終受入監査修正（fresh initial date 固定）

- `attachSprint1PersonStateToInitialWorld` は `worldDate` が 1年4月第1週・absoluteWeek=0 のときだけ成功
- 有効な途中／checkpoint world（週送り後）を adapter 固有条件で拒否。日時巻戻し・ID再採番なし
- `cloneWorldEngineState` による validate／clone／revalidate を再利用
- Sprint 1全体は未完了（次はS01-003）

### 2026-08-04 — S01-002 受入監査修正（初期化adapter入力検証）

- `attachSprint1PersonStateToInitialWorld` が付与前に `validateWorldEngineState` で世界全体を検証
- raw Person 部分読み／spread を廃止し、検証済み Person を clone してから `sprint1State` を付与
- getter／class／symbol／Proxy／必須欠落／参照壊れの negative 試験を追加
- Sprint 1全体は未完了（次はS01-003）

### 2026-08-04 — S01-002 人物能力・成長状態を実装

- `Sprint1PersonState`（4項目）／一時状態VO／成長端数／GrowthProfile／InjuryStage／factor selector／週間適格predicate／`attachSprint1PersonStateToInitialWorld`を追加
- Personへ`sprint1State?`のみ追加。growthPotential等のWorldState本統合はS01-008へ送る
- S01-003へカタログ意味validation、S01-004へ週間更新を引渡し。Sprint 1全体は未完了

### 2026-08-04 — S01-001 第5回受入監査修正（単位契約）

- weeklyPlanner の整数 score 罰／上限と strategy の整数 surrender score／threshold を `number` に修正（BasisPoints誤分類を解消）
- BasisPoints は小数 factor／ratio／multiplier／per-point 係数のみ。field名に weight があっても整数 score は number
- `countNumericLeaves` を package root から非公開化。型契約テストを追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-04 — S01-001 第4回受入監査修正（厳密basis points／API境界）

- basis points変換は `value * 10000` が safe integer の場合だけ成功（Math.round／許容差なし）
- raw／normalized ネスト型を分離。`BasisPoints` を normalized 係数 field に使用。無検証 brand API を削除
- `validateNormalizedSprint1Config` を追加。normalized clone／freeze は registry canonical 照合付き
- deprecated alias（`createDefaultSprint1Config` 等）と registry introspection を非公開化
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 第3回受入監査修正（basis points）

- raw `Sprint1ConfigInput`とnormalized `Sprint1Config`を分離。小数係数はvalidation時にbasis points整数化
- config hash／registryは正規化後canonical JSONを固定。固定SHA-256 fixtureを更新
- normalized configの全number leafはsafe integer。次はS01-002。Sprint 1全体は未完了

### 2026-08-03 — S01-001 第2回受入監査修正

- reflection全経路（getPrototypeOf／Array.isArray／length descriptor／ownKeys）をValidationResult failureへ変換
- public clone／freezeもvalidation経由の`ValidationResult`へ変更（getter／toJSON非実行）
- `sprint1-balance-0.2.0` canonical SHA-256固定fixtureとregistry不変化を追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 受入監査修正

- configVersion registryによる内容一意性、public hash入口のvalidation必須化、hardened plain-data snapshot／deep freeze、配列extra property拒否、RangeShiftAfterUse完全union、specVersions canonical正規化をWikiタスクへ反映
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 Sprint 1ドメイン型・設定基盤

- S01-001（TechniqueId／PersonTechniqueState保存型／Sprint1Config／canonical・hash／SimulationIdentity）を実装
- `PersonTechniqueState`保存型の所有境界（S01-001）を維持し、S01-003で再定義しない
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — Sprint 1実装バックログ定義 受入監査修正同期

- `PersonTechniqueState`保存構造の所有をS01-001へ明示するバックログ修正をWikiタスクへ反映
- S01-001／S01-002／S01-003の責務境界を同期
- Sprint 1 実装は未着手のまま

### 2026-08-03 — Sprint 1実装バックログ定義同期

- `docs/SPRINT_1_BACKLOG.md`（S01-001〜S01-009）定義に伴う Wiki タスク索引・ページ追加
- `tasks/index.md` の scope を `cross-sprint` へ変更
- Sprint 1 実装は未着手のまま（タスク定義のみ）

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期 受入監査修正

- `battle-result-and-log.md` の draw 記述を正本 13 の勝者決定規則へ修正
- 共通索引・運用ページの `scope` を `cross-sprint` へ変更
- 各索引概要を Sprint 0 限定表現から横断表現へ修正
- `governance.md` / `contradictions.md` を Wiki 全体・Sprint 横断の記載へ更新

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期

- Sprint 1 仕様 `S1-SPEC-0.1.11` 確定（commit `2800d3b959e575f57660c27b344507dd0e38ddb6`）に伴う Wiki 同期
- `sprint1-pending.md` を正式な `sprint1.md` へ変更
- 08〜14 の説明・索引・不変条件ページを追加
- Sprint 1 実装は未着手であることを明記

### 2026-08-01 — S00-011 LLM Wiki開発知識基盤

- `docs/wiki/` の基本構成を追加
- Sprint 0（`sprint0-complete` / `504fa3cc16346dd0c6480e8328e42518e68215d3`）の確定情報のみを収録
- 当時は Sprint 1 を pending 入口のみとしていた（本同期で正式ページへ置換）
- リンク・front matter・sources パス検証スクリプト `scripts/check-wiki.mjs` を追加

## 関連する正本

該当なし（Wikiメタ履歴）。

## 関連するコード

- `scripts/check-wiki.mjs`

## 関連するテスト

- `npm run wiki:check`

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [README.md](README.md)

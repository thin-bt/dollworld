---
title: Sprint 1処理の流れ
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/08-character-growth.md
  - docs/specs/09-technique-system.md
  - docs/specs/10-training-and-learning.md
  - docs/specs/11-battle-state.md
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/13-battle-result-and-log.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
  - commit:60d5b6b821983b047debd51bccc43389d363f953
last_verified: 2026-08-10
related:
  - battle-lifecycle.md
  - ../sprints/sprint1.md
  - ../invariants/weekly-training-and-learning.md
  - ../invariants/battle-turn-resolution.md
---

# Sprint 1処理の流れ

## 概要

08〜14 の責務関係を索引する説明ページ。正本にない processor 名、クラス名、モジュール名、フォルダ構成は作らない。

## 現在確定している内容

### 責務の流れ（概念）

```text
人物状態・能力
  ↓
週間Planner
  ↓
訓練／技習得／休養
  ↓
戦闘入力adapter
  ↓
BattleState生成
  ↓
ターン解決
  ↓
BattleResult・ログ
  ↓
戦闘後効果
```

### 区別する状態

| 概念 | 意味の入口 |
|---|---|
| World人物状態 | 08 の人物一時状態・能力など |
| 戦闘入力 | 11 の入力人物・RunRuleSnapshot 等 |
| BattleParticipantSnapshot | 11 の戦闘用スナップショット（`sourceSnapshot` baseline含む） |
| BattleState | 11・12 の試合中状態 |
| BattleResult | 13 の試合結果 |
| 戦闘後効果 | 13 の World へ反映する効果（疲労・負傷等） |

World 人物を戦闘中に直接書き換えず、snapshot と結果経由で扱う境界は 11・13 を正とする。

### 週間処理の入出力境界（S01-004実装済み）

週間処理は WorldEngine から独立した純粋関数として実装されている。Sprint1 transactional processor adapter への配線は **S01-008でproduction実装済み**（`runSprint1WeeklyStep`／`runSprint1WeeklyTrainingAdapter`）。production adapter ID／event `sourceProcessor` は `weekly-training`（`S1-SPEC-0.1.20`）。legacy `WorldProcessor`／`RunWorldOneWeekInput.processors` へは登録しない。

```text
入力（検証前）
  absoluteWeek / 人物レコード配列 / Sprint1Config / TechniqueCatalog / RuntimeState / RNG状態
  ↓ 全入力検証（RNG復元より前）
週開始スナップショット凍結（PersonId昇順・重複拒否）
  ↓ 全人物のSprint1PersonState／catalog意味整合を検証（inactive含む）
人物ごとに focus正規化 → 行動選択 → 目標選択 → 効果適用（draft複製のみ変更）
  ↓ effect後に人物構造・一時状態・remainder・Sprint1PersonState・意味整合を再検証
RuntimeState累積・出力凍結
  ↓
出力: 更新済み人物レコード / RuntimeState / RNG状態 / イベントcandidate列
```

`rngState`はdescriptor-safeな`validateSeededRngState`通過後にだけimportする。正本10・14がルールを定義していない入力値（planner context score、師匠推薦度、styleMatch、相性など）は sidecar として adapter から受け取り、処理側で導出しない。S01-008では`InitialWeeklyTrainingSidecarSnapshot`をCLIから受け取り、`Sprint1RunRuntimeState.weeklyTrainingSidecars`が所有する。missing sidecarのneutral defaultは禁止。

### Sprint1RunRuntimeState／Sprint1RunContext（S1-SPEC-0.1.20／S01-008）

mutable runtime root と immutable context（runtime checkpoint vs projection を区別）:

- `Sprint1RunRuntimeState`: `worldState`／`worldRngState`／`matchIdGeneratorState`／`weeklyTrainingSidecars`（`WeeklyTrainingSidecarState`）／`processorRuntimeStates`／`eventStream`／`eventAllocationState`／`battleResults`／`battleResultWeekState`
- `Sprint1RunContext`: `sprint1Config`／`techniqueCatalog`／`initialWeeklyTrainingSidecarSnapshot`／`simulationIdentity`(+hash)／`simulationId`／`runRuleSnapshot`(+hash)。外部`initialMatchIdGeneratorState`依存なし
- 論理`Sprint1RunSession = { context, runtimeState }`。rollbackはruntimeのみ
- weekly `TrainingProcessorRuntimeState`は`processorRuntimeStates.processorSpecificStates`（plain JSON deep-clone）
- production `[weekly-training]` = Sprint1 transactional adapter pipeline（legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`へは登録しない。二重実行禁止）。`runSprint1WeeklyStep` の `legacyProcessors` は年末集計などのWorldEngine補助hook専用であり、`weekly-training` を含むSprint1 adapter IDは拒否する
- battle World RNG label `battle/world-rng`／weekly RNG label `processor/weekly-training`
- fresh initialization promotion後: `eventStream = promoted initialEvents`、`nextSequence = promotedInitialEvents.length`、`battleResults = []`、`battleResultWeekState.results = []`
- `battleResultWeekState.absoluteWeek === worldDate.absoluteWeek`必須。week.resultsは`battleResults` current-week suffixとcanonical一致必須
- week advance成功時: week registryだけ`results=[]`へreset。`battleResults`は保持
- battleはadapter pipeline外。`commitRunBattlePlan`配線は**S01-008でproduction実装済み**（`commit-run-battle-plan.ts`）
- `matchesCompletedThisWorldWeekBeforeBattle`はweek registryのparticipant別completed件数（`battleResults.length`ではない。resolution_errorはcount+0）
- `PersonTemporaryCondition` current正本はweekly sidecar。Personへfatigue等新field追加なし
- `Sprint1RunRuntimeState`オブジェクト自体はcheckpoint非永続。`initialWeeklyTrainingSidecarSnapshot`→initial-world 0.4.0投影、`weeklyTrainingSidecars`＋`battleResults`→final-world 0.3.0投影。fixed7 exactly 7 files

### 戦闘開始の入出力境界（S01-005実装済み）

戦闘開始も WorldEngine から独立した純粋関数であり、未commitの開始計画だけを返す。

```text
入力（検証前）
  CreateBattleRequest / World RNG状態 / MatchIdGeneratorState
  ↓ 全入力検証（RunRuleSnapshot・両参加者・両ActionSourceIdentityを含む）
MatchIdGeneratorStateのcloneからMatchIdを1件予約
  ↓ 全入力成功後にだけWorld RNGから1回だけuint32を取得（battleSeed）
内部createBattleState → ready BattleState
  ↓ 内部beginBattle
in_progress BattleState + battle.started候補（EventId／sequence未割当）
  ↓
出力: BattleState / StartBattleRuntimeTransition / イベント候補（すべて未commit）
```

`RunRuleSnapshot` は run 単位で1件だけ保持し、各戦闘は `BattleRulesSnapshotRef` で hash 参照する。失敗時は3つとも `null` を返し、World RNG と MatchIdGeneratorState を進めない。

### ターン解決の入出力境界（S01-006実装済み）

ターン解決も WorldEngine から独立した純粋関数である。最終BattleResult完成は S01-007。

```text
入力（検証前）
  BattleState / BattleActionsSource（default_strategy または scripted）/ RunRuleSnapshot 参照 / RNG状態 等
  ↓ prepareBattleTurn
PreparedBattleTurn（ターン開始スナップショット／canonical hash）
  ↓ resolveBattleTurn（行動決定・置換・優先・移動・命中・ダメージ・精神・耐久・消耗・決着候補）
出力: 更新済みBattleState / ターンログ材料 / RNG状態（失敗時は部分更新なし）
```

移動状態補正は `S1-SPEC-0.1.15` の `moverStateModifier`／`opponentStateModifier`（`battle.actionOrder`係数共用）を使う。`BattleActionLog.movementChance`（floor整数パーセント0..100、RNG非消費）は `S1-SPEC-0.1.16` のproduction実装。`DefaultBattleStrategy` は default_strategy 源の行動決定に用いる。BattleResult（S01-007）はimplemented／accepted（commit `a39e476`）。World commit配線はS01-008でproduction実装済み（accepted）。

`runBattleToCompletion`（S01-007）の結果は `completed`／`resolution_error`／`pre_start_failure` の3種のみ。start成功後に正規commitPlanを構築不能なdependency／invariant failureは `BattleExecutionAbortError` としてthrowし、startRuntimeTransition／started／finishedをcommitしない（`S1-SPEC-0.1.19`）。

## 関連する正本

- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md) 〜 [`14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜008）
- `packages/simulation-core/src/sprint1/create-sprint1-run-session.ts`（fresh initialization promotion）
- `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts`／`weekly-training-adapter.ts`（outer weekly transaction）
- `packages/simulation-core/src/sprint1/commit-run-battle-plan.ts`（battle commit facade）
- `packages/simulation-core/src/sprint1/process-weekly-training-week.ts`（週間Processor純関数入口）
- `packages/simulation-core/src/sprint1/start-battle-transaction.ts`（戦闘開始入口、内部）
- `packages/simulation-core/src/sprint1/prepare-battle-turn.ts`／`resolve-battle-turn.ts`／`default-battle-strategy.ts`
- BattleResult（S01-007）はimplemented / accepted（commit `a39e476`）。WorldEngine／CLI統合（S01-008）はproduction実装済み（accepted）

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`
- `packages/simulation-core/src/sprint1-battle-start.test.ts`
- `packages/simulation-core/src/sprint1-battle-turn-resolution.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.20-s01-008-integration-contracts.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-initialization.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-weekly-step.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-commit-battle.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

S01-008は**implemented / accepted**。Sprint 1全体は未完了。次はS01-009（pending／未着手）。

## 関連Wikiページ

- [battle-lifecycle.md](battle-lifecycle.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)

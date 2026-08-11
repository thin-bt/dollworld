---
title: Sprint 1
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/SPEC.md
  - docs/SPEC_CHANGELOG.md
  - docs/SPEC_INDEX.md
  - docs/SPEC_PREPARATION_PLAN.md
  - docs/specs/00-domain-glossary.md
  - docs/specs/02-config-schema.md
  - docs/specs/08-character-growth.md
  - docs/specs/09-technique-system.md
  - docs/specs/10-training-and-learning.md
  - docs/specs/11-battle-state.md
  - docs/specs/12-battle-turn-resolution.md
  - docs/specs/13-battle-result-and-log.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
  - commit:d28d6666263f307ead492fc00256b70dc42e9ad9
  - commit:259a219d29b626c4678e5b248b8a8453861797f9
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
  - commit:3b313a5ea690351d062e751bc724e5530b835872
  - commit:60d5b6b821983b047debd51bccc43389d363f953
  - commit:7c478477a978726d2e740fe20dff1b2cd48e9f68
last_verified: 2026-08-11
related:
  - ../glossary/abilities-and-aptitudes.md
  - ../glossary/techniques-and-mastery.md
  - ../architecture/sprint1-processing-flow.md
  - ../architecture/battle-lifecycle.md
  - ../decisions/sprint1-spec-baseline.md
  - ../decisions/sprint1-identity-and-config.md
  - sprint0.md
---

# Sprint 1

## 概要

Sprint 1 の仕様は `S1-SPEC-0.1.20` が現行である。正本版は `SPEC-0.1.2`。`S1-SPEC-0.1.11` 確定 commit は `2800d3b959e575f57660c27b344507dd0e38ddb6`。`0.1.12` は週間処理契約のclarificationであり、Sprint1Config balance／hashは不変。`0.1.13` は MatchId generator契約の明文化である。`0.1.14` は戦闘ターン入力契約（replacementReason／battle-action-script／技使用回数）の明文化である。`0.1.15` は移動状態補正（`moverStateModifier`／`opponentStateModifier`）の明文化である。`0.1.16` は`BattleActionLog.movementChance`の明文化である。`0.1.17` は戦闘開始`sourceSnapshot` baselineの明文化である（BattleState schema `0.6.0`）。`0.1.18` はBattleResult決定的契約clarificationである。`0.1.19` はpost-start execution abort契約clarificationである。`0.1.20` はS01-008 integration contracts clarificationである（`weekly-training` adapter／`Sprint1RunRuntimeState`／sidecar identity／`--sprint1-input`／SimulationIdentity 0.4.0／run-metadata 0.4.0／initial-world 0.4.0／final-world 0.3.0）。

本ページは説明・索引である。実装や仕様判断の根拠には使わない。正本と矛盾する場合は正本を優先する。

## 現在確定している内容

### 仕様状態

- ミニ仕様版: `S1-SPEC-0.1.20`
- 正本版: `SPEC-0.1.2`
- `S1-SPEC-0.1.11` 確定 commit: `2800d3b959e575f57660c27b344507dd0e38ddb6`
- 08〜14 は作成・受入監査済み（[`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)）

### 対象領域

- 人物能力・成長（08, 14）
- 技定義・熟練度・習得（09, 10, 14）
- 週間行動・訓練・休養（10, 14）
- 1対1戦闘開始（11, 14）
- ターン解決（12, 14）
- 決着・結果・戦闘ログ（13, 14）
- Sprint1Config（14）
- SimulationIdentity 拡張（00, 02, 05, 14）— schemaVersion `0.4.0`／`initialWeeklyTrainingSidecarHash`

### 実装状態

- Sprint 1全体は**未完了**
- S01-001〜S01-008はimplemented / accepted（S01-007受入完了commit `a39e476`。S01-008受入完了）
- S01-009 **implemented / 受入監査中**
- 戦闘開始（11）・ターン解決（12）・BattleResult／戦闘後効果（13）は実装済み。WorldEngine／CLI本統合はS01-008でproduction実装済み（accepted）
- `prepareBattleTurn`／`resolveBattleTurn`／`DefaultBattleStrategy`／`runBattleToCompletion`／`finalizeBattleResult`／`validateBattleResult` は実装済み。移動状態補正は `S1-SPEC-0.1.15`。`BattleActionLog.movementChance` productionは `S1-SPEC-0.1.16`。BattleResult決定契約は `S1-SPEC-0.1.18`。post-start execution abort契約は `S1-SPEC-0.1.19`。S01-008統合契約は `S1-SPEC-0.1.20`
- 週間処理のSprint1 transactional adapter配線と戦闘の`commitRunBattlePlan`配線はS01-008で**production実装済み**（accepted）。legacy WorldProcessor配列へweekly-trainingを登録しない
- 本Wikiの同期や `npm run check` の成功は、Sprint 1全体の実装完了を意味しない
- S01-009の実装前clarifierは確定済み。正規完了検証入口は`npm run verify:sprint1`、same-seed 100年×2、different-seed実体差、boundary seed、10／50／100／300年、weekly＋technique＋`official` battle（default strategy）統合、存命人口 target 600／2000／5000×1年population baseline、`verify:sprint0`回帰を総合する。verifierはexit 0/1・stale report防止・atomic completion reportを契約化。verification runは`output/sprint1-verification/runs/<run-key>/`へ分離し、battle入力はS01-008 accepted public helperを再利用する
- S01-009 accepted後、clean masterで`verify:sprint1`を再実行して合格したcommitへ`Sprint 1`完了tag `sprint1-complete`を付ける

### 実装タスク

- タスク索引: [`../tasks/index.md`](../tasks/index.md)
- 正本バックログ: [`docs/SPRINT_1_BACKLOG.md`](../../SPRINT_1_BACKLOG.md)

### 今回の対象外（実装済み範囲ではない）

大会、昇格、賞金、師匠選択、恋愛、結婚、出産、Web、MySQL 永続化など。詳細な境界は各ミニ仕様の対象外節を正とする。

## 関連する正本

- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/SPEC_INDEX.md`](../../SPEC_INDEX.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md) 〜 [`14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`（S01-001〜008の公開型・validation・カタログ／成長API・週間Processor・戦闘開始・ターン解決・BattleResult・session／weekly step／battle commit）
- `packages/simulation-core/src/sprint1/create-sprint1-run-session.ts`／`sprint1-weekly-step.ts`／`weekly-training-adapter.ts`／`commit-run-battle-plan.ts`（S01-008）
- `apps/simulator/src/cli.ts`（`--sprint1-input`）／`apps/simulator/src/output/build-sprint1-run-output.ts`（fixed7 Sprint1 writers）
- `apps/simulator/fixtures/sprint1/`（検証用fixture）
- `packages/simulation-core/src/sprint1/constants.ts`（`S1_SPEC_VERSION`）
- `packages/simulation-core/src/index.ts`（package root export）

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`
- `packages/simulation-core/src/sprint1-battle-start.test.ts`
- `packages/simulation-core/src/sprint1-battle-turn-resolution.test.ts`
- `packages/simulation-core/src/sprint1-battle-result.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.13-match-id-generator-contracts.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.18-battle-result-contracts.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.19-post-start-execution-abort.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.20-s01-008-integration-contracts.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-initialization.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-weekly-step.test.ts`
- `packages/simulation-core/src/sprint1-s01-008-commit-battle.test.ts`
- `apps/simulator/src/cli.sprint1.test.ts`
- `apps/simulator/src/output/sprint1-output.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

- S01-008は**implemented / accepted**。S01-009 **implemented / 受入監査中**。Sprint 1全体は未完了。次は受入監査→accepted→clean master `verify:sprint1`→`sprint1-complete`

## 関連Wikiページ

- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [../glossary/techniques-and-mastery.md](../glossary/techniques-and-mastery.md)
- [../architecture/sprint1-processing-flow.md](../architecture/sprint1-processing-flow.md)
- [../architecture/battle-lifecycle.md](../architecture/battle-lifecycle.md)
- [../invariants/character-growth.md](../invariants/character-growth.md)
- [../invariants/weekly-training-and-learning.md](../invariants/weekly-training-and-learning.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)
- [../invariants/battle-turn-resolution.md](../invariants/battle-turn-resolution.md)
- [../invariants/battle-result-and-log.md](../invariants/battle-result-and-log.md)
- [sprint0.md](sprint0.md)

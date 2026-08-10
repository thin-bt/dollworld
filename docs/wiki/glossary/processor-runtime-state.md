---
title: ProcessorRuntimeState
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/specs/07-seeded-rng.md
  - docs/specs/03-event-envelope.md
  - docs/specs/10-training-and-learning.md
  - docs/TECHNICAL_DECISIONS.md
last_verified: 2026-08-09
related:
  - ../invariants/runtime-state.md
  - ../architecture/world-engine.md
  - ../architecture/sprint1-processing-flow.md
  - ../tasks/S01-008.md
---

# ProcessorRuntimeState

## 概要

WorldEngine 実行中に保持するプロセッサ実行時状態（RNG サブストリーム状態などを含む）への入口。

## 現在確定している内容

- 世界進行は固定順の Processor パイプラインで週単位に進む（S00-007）
- RNG 状態は復元可能であり、同一入力・同一 processor 順で決定的結果を返す
- 詳細なフィールド定義と遷移規則はコードとミニ仕様を正とする
- Sprint 1（`S1-SPEC-0.1.20`）: `TrainingProcessorRuntimeState` は既存 `ProcessorRuntimeState` 機構で `weekly-training` processor の runtime として保持する
- World RNG／`MatchIdGeneratorState`／`eventStream`／`eventAllocationState`／`battleResultWeekState` は `ProcessorRuntimeState` ではなく `Sprint1RunRuntimeState` が所有する（オブジェクト自体はcheckpoint非永続）。`weeklyTrainingSidecars`および`battleResults`はfinal-worldへ投影
- `processorRuntimeStates` field が既存 `ProcessorRuntimeState` collection を所有する。optional `processorSpecificStates` に `TrainingProcessorRuntimeState` を保持（Sprint 0は省略可または`[]`）。`specificState`はplain JSONでdescriptor-safe deep-clone（nested alias禁止）
- `Sprint1RunRuntimeState` 直下へ `TrainingProcessorRuntimeState` を重複保存しない
- production `[weekly-training]` は Sprint1 transactional adapter pipeline（legacy WorldProcessor／`RunWorldOneWeekInput.processors`へは登録しない。二重実行禁止）
- battle World RNG label `battle/world-rng`／weekly-training RNG label `processor/weekly-training`

このWikiページは型定義の代替ではない。

## 関連する正本

- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/10-training-and-learning.md`](../../specs/10-training-and-learning.md)
- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)

## 関連するコード

- `packages/simulation-core/src/world-engine/types.ts`
- `packages/simulation-core/src/world-engine/processor-runtime.ts`
- `packages/simulation-core/src/world-engine/engine.ts`
- `packages/simulation-core/src/rng.ts`
- `packages/simulation-core/src/sprint1/`（TrainingProcessorRuntimeState／S01-004）

## 関連するテスト

- `packages/simulation-core/src/world-engine/engine.test.ts`
- `packages/simulation-core/src/rng.test.ts`
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.20-s01-008-integration-contracts.test.ts`

## 関連する判断

- [../invariants/runtime-state.md](../invariants/runtime-state.md)
- [../invariants/rng-and-determinism.md](../invariants/rng-and-determinism.md)

## 未解決事項

該当なし。現在は`S1-SPEC-0.1.20` clarifier受入監査中。`Sprint1RunRuntimeState` production実装はclarifier accepted後のS01-008。

## 関連Wikiページ

- [../tasks/S00-007.md](../tasks/S00-007.md)
- [../tasks/S01-008.md](../tasks/S01-008.md)
- [../architecture/world-engine.md](../architecture/world-engine.md)

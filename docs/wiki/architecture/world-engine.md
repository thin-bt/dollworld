---
title: WorldEngine
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/01-world-calendar.md
  - docs/specs/03-event-envelope.md
  - tasks/S00-007.md
  - commit:7bf868e51027865fe73779ad2b21c7b83514b7af
last_verified: 2026-08-10
related:
  - simulation-core.md
  - sprint1-processing-flow.md
  - ../glossary/processor-runtime-state.md
  - ../tasks/S01-008.md
---

# WorldEngine

## 概要

初期世界を週単位で進める決定的 Processor パイプライン（S00-007）。

## 現在確定している内容

タスクおよび実装より確認できる範囲:

- Processor interface と固定順実行
- 現週終了 → 日時進行 → 年初処理（01）
- 年初一斉加齢
- イベント集約と RNG サブストリーム状態の保持
- N週・N年の決定的実行、年次統計確定通知の集約
- 受入の例: 100年=4800週、年次統計確定通知100回、終了は世界101年4月第1週年初後

Sprint 0 では修行・戦闘・大会・結婚・出産・死亡 processor は対象外。

### Sprint 1（S1-SPEC-0.1.20）

- production normal-week Sprint1 transactional adapter pipelineは`[weekly-training]`のみ（**S01-008でproduction実装済み**。`runSprint1WeeklyStep`がouter weekly transactionを担当）。legacy `WorldProcessor`／`RunWorldOneWeekInput.processors`へは登録しない
- `battle-simulation`はadapter pipelineへ登録しない。戦闘は明示的run／`commitRunBattlePlan` facade経由（**S01-008でproduction実装済み**）
- World RNG／MatchIdGenerator／`eventStream`／`eventAllocationState`の正規ownerは`Sprint1RunRuntimeState`（オブジェクト自体はcheckpoint非永続）。`weeklyTrainingSidecars`はfinal-worldへ投影
- `TrainingProcessorRuntimeState`は既存`ProcessorRuntimeState`経由
- fresh Sprint 1 initialization promotion（provisional→final simulationId／initial events 0.2.0）は**S01-008でproduction実装済み**（`createSprint1RunSession`）。既存骨格（current-week phase／worldDate advance／year-start／aging）の順序は変更しない
- S01-007はimplemented / accepted（commit `a39e476`）。
- S01-008はimplemented / accepted
- S01-009はimplemented / accepted（実装commit `5616f5f`、status docs `5a80268`）。Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）
- 実装順序（履歴）: clarifier accepted → S01-008 → S01-009（S01-001〜009まで完了）

## 関連する正本

- [`tasks/S00-007.md`](../../../tasks/S00-007.md)
- [`docs/specs/01-world-calendar.md`](../../specs/01-world-calendar.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)

## 関連するコード

- `packages/simulation-core/src/world-engine/engine.ts`
- `packages/simulation-core/src/world-engine/types.ts`
- `packages/simulation-core/src/world-engine/processor-runtime.ts`
- `packages/simulation-core/src/sprint1/create-sprint1-run-session.ts`／`sprint1-weekly-step.ts`／`weekly-training-adapter.ts`／`commit-run-battle-plan.ts`（S01-008）

## 関連するテスト

- `packages/simulation-core/src/world-engine/engine.test.ts`

## 関連する判断

- [../invariants/runtime-state.md](../invariants/runtime-state.md)
- [../tasks/S00-007.md](../tasks/S00-007.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/processor-runtime-state.md](../glossary/processor-runtime-state.md)
- [headless-cli.md](headless-cli.md)

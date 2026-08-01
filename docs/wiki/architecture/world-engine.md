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
last_verified: 2026-08-01
related:
  - simulation-core.md
  - ../glossary/processor-runtime-state.md
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

## 関連する正本

- [`tasks/S00-007.md`](../../../tasks/S00-007.md)
- [`docs/specs/01-world-calendar.md`](../../specs/01-world-calendar.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)

## 関連するコード

- `packages/simulation-core/src/world-engine/engine.ts`
- `packages/simulation-core/src/world-engine/types.ts`
- `packages/simulation-core/src/world-engine/processor-runtime.ts`

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

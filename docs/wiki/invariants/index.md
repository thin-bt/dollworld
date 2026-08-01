---
title: 不変条件索引
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/AI_DEVELOPMENT_RULES.md
  - docs/SPRINT_0_BACKLOG.md
  - tasks/S00-010.md
last_verified: 2026-08-01
---

# 不変条件索引

## 概要

Sprint 0 で検証される不変条件・決定性・出力契約への入口。正本はミニ仕様と検証コードである。

## 現在確定している内容

- [暦・加齢](calendar.md)
- [識別と参照整合](identity-and-reference.md)
- [RNGと決定性](rng-and-determinism.md)
- [実行時状態](runtime-state.md)
- [固定7ファイル](fixed-seven-files.md)

AI開発ルールに列挙される Sprint 0 不変条件の例: 年齢非負、死亡者非処理、16歳未満ランクなし、42歳以上引退、参照整合、親子・師弟循環なし、同一シード一致。詳細は正本と検証器を確認すること。

## 関連する正本

- [`docs/AI_DEVELOPMENT_RULES.md`](../../AI_DEVELOPMENT_RULES.md)
- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)
- [`tasks/S00-010.md`](../../../tasks/S00-010.md)

## 関連するコード

- `apps/simulator/src/sprint0-verification/invariant-verification.ts`
- `apps/simulator/src/output/world-integrity.ts`

## 関連するテスト

- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`
- `packages/simulation-core` 各領域のテスト

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../tasks/S00-010.md](../tasks/S00-010.md)
- [../architecture/index.md](../architecture/index.md)

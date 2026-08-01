---
title: アーキテクチャ索引
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
last_verified: 2026-08-01
---

# アーキテクチャ索引

## 概要

Sprint 0 の実装配置と責務分割への入口。詳細は TECHNICAL_DECISIONS とコードを正とする。

## 現在確定している内容

- [ワークスペース構成](workspace.md)
- [simulation-core](simulation-core.md)
- [WorldEngine](world-engine.md)
- [ヘッドレスCLI](headless-cli.md)
- [固定出力契約](output-contract.md)

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPEC.md`](../../SPEC.md)

## 関連するコード

- `packages/simulation-core/`
- `apps/simulator/`

## 関連するテスト

- 各パッケージの Vitest テスト（詳細は下位ページ）

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../invariants/index.md](../invariants/index.md)
- [../tasks/index.md](../tasks/index.md)

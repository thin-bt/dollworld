---
title: docs/wiki README
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/wiki/index.md
  - docs/wiki/governance.md
  - tag:sprint0-complete
last_verified: 2026-08-01
---

# docs/wiki README

## 概要

`docs/wiki` は LLM と人間が Sprint 0 の確定知識へ到達するための索引です。**正本ではありません。**

## 現在確定している内容

- Sprint 0（タグ `sprint0-complete`）の説明・索引ページが存在する
- Sprint 1 の具体仕様は収録しない（[`sprints/sprint1-pending.md`](sprints/sprint1-pending.md) の pending 入口のみ）

## 使い方

1. [`index.md`](index.md) から入る
2. [`governance.md`](governance.md) の運用規則を守る
3. 詳細は必ず正本（SPEC・ミニ仕様・コード・テスト・Git）へ戻る

## 関連する正本

- [`docs/SPEC.md`](../SPEC.md)
- [`docs/specs/`](../specs/)
- [`docs/TECHNICAL_DECISIONS.md`](../TECHNICAL_DECISIONS.md)
- [`docs/SPRINT_0_BACKLOG.md`](../SPRINT_0_BACKLOG.md)
- [`tasks/`](../../tasks/)

## 関連するコード

該当なし（Wikiはドキュメントのみ）。

## 関連するテスト

該当なし。リンク検証は `npm run wiki:check`（Node標準機能の小さなスクリプト）。

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

確認できる記録なし。

## 関連Wikiページ

- [index.md](index.md)
- [changelog.md](changelog.md)

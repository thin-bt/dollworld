---
title: docs/wiki README
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/wiki/index.md
  - docs/wiki/governance.md
  - docs/wiki/sprints/sprint1.md
  - tag:sprint0-complete
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-08
---

# docs/wiki README

## 概要

`docs/wiki` は LLM と人間が確定知識へ到達するための **Sprint横断** の索引です。**正本ではありません。** Sprint 0 限定ではありません。

## 現在確定している内容

- Sprint 0（タグ `sprint0-complete`）の説明・索引ページが存在する
- Sprint 1 仕様 `S1-SPEC-0.1.18` の説明・索引を収録する（Sprint 1全体は未完了、次はS01-007。S01-001〜006は実装済み。S01-007〜009は未着手）

## Sprint 1入口

- [Sprint 1概要](sprints/sprint1.md)
- [能力・適性](glossary/abilities-and-aptitudes.md)
- [技・熟練度](glossary/techniques-and-mastery.md)
- [週間処理](invariants/weekly-training-and-learning.md)
- [戦闘ライフサイクル](architecture/battle-lifecycle.md)
- [戦闘開始不変条件](invariants/battle-start.md)
- [ターン解決](invariants/battle-turn-resolution.md)
- [結果・ログ](invariants/battle-result-and-log.md)
- [Sprint1Config／SimulationIdentity](decisions/sprint1-identity-and-config.md)

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
- [sprints/sprint1.md](sprints/sprint1.md)

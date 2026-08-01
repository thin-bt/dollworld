---
title: LLM Wiki 入口
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
  - docs/TECHNICAL_DECISIONS.md
  - tag:sprint0-complete
  - commit:504fa3cc16346dd0c6480e8328e42518e68215d3
last_verified: 2026-08-01
related:
  - governance.md
  - sprints/sprint0.md
  - sprints/sprint1-pending.md
---

# LLM Wiki 入口

## 概要

このWikiは、Sprint 0で確定した仕様・設計判断・不変条件・タスク履歴を横断参照するための**説明・索引**です。正本ではありません。実装や仕様判断の根拠には使わないでください。

基点: タグ `sprint0-complete`（commit `504fa3cc16346dd0c6480e8328e42518e68215d3`）。

## 正本の優先順位

1. `docs/SPEC.md` および正式ミニ仕様（`docs/specs/*.md`）
2. コードと自動テスト
3. Git の commit・tag
4. `docs/wiki`（本Wiki）
5. 会話・作業報告

矛盾時は上位を優先し、Wiki側は [`contradictions.md`](contradictions.md) へ記録します。詳細な運用は [`governance.md`](governance.md) を参照してください。

## LLM／Cursor向け推奨読込順

1. 対象の SPEC またはミニ仕様
2. 本ページ（`docs/wiki/index.md`）
3. 対象領域の [invariants](invariants/index.md) ページ
4. 対象領域の [architecture](architecture/index.md) ページ
5. 対象 [task](tasks/index.md) ページ
6. 関連コードとテスト

## 概念別リンク

- [用語集](glossary/index.md)
- [アーキテクチャ](architecture/index.md)
- [不変条件](invariants/index.md)
- [設計判断](decisions/index.md)

## タスク別リンク

- [Sprint 0 タスク索引](tasks/index.md)（S00-001〜S00-010）

## Sprint別リンク

- [Sprint 0](sprints/sprint0.md) — 完了（`sprint0-complete`）
- [Sprint 1](sprints/sprint1-pending.md) — **定義修正中のため未収録**（pending入口のみ）

## その他

- [運用規則](governance.md)
- [矛盾記録](contradictions.md)
- [Wiki更新履歴](changelog.md)
- [README](README.md)

## 未解決事項

該当なし（本ページは入口のみ）。

## 関連Wikiページ

- [governance.md](governance.md)
- [sprints/sprint0.md](sprints/sprint0.md)

---
title: LLM Wiki 入口
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPEC_PREPARATION_PLAN.md
  - tag:sprint0-complete
  - commit:504fa3cc16346dd0c6480e8328e42518e68215d3
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
  - commit:259a219d29b626c4678e5b248b8a8453861797f9
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-08
related:
  - governance.md
  - sprints/sprint0.md
  - sprints/sprint1.md
---

# LLM Wiki 入口

## 概要

このWikiは、確定した仕様・設計判断・不変条件・タスク履歴を横断参照するための**説明・索引**です。正本ではありません。実装や仕様判断の根拠には使わないでください。

Sprint 0 基点: タグ `sprint0-complete`（commit `504fa3cc16346dd0c6480e8328e42518e68215d3`）。  
Sprint 1 仕様現行版: `S1-SPEC-0.1.15`（`0.1.11` 確定 commit `2800d3b959e575f57660c27b344507dd0e38ddb6`、`0.1.12` は週間処理契約clarification、`0.1.13` は MatchId generator契約明文化、`0.1.14` はターン入力契約明文化、`0.1.15` は移動状態補正明文化）。Sprint 1全体の実装は未完了（S01-001〜005は実装済み、次はS01-006。S01-006は未着手）。

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
5. 対象 [task](tasks/index.md) ページ（定義済みのもの）
6. 関連コードとテスト

## 概念別リンク

- [用語集](glossary/index.md)
- [アーキテクチャ](architecture/index.md)
- [不変条件](invariants/index.md)
- [設計判断](decisions/index.md)

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

## タスク別リンク

- [Sprint 0／Sprint 1 タスク索引](tasks/index.md)
- S01-001〜005 implemented、次は S01-006、S01-006〜009 pending（S01-006は未実装）

## Sprint別リンク

- [Sprint 0](sprints/sprint0.md) — 完了（`sprint0-complete`）
- [Sprint 1](sprints/sprint1.md) — 仕様 `S1-SPEC-0.1.15`（全体未完了、次はS01-006）

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
- [sprints/sprint1.md](sprints/sprint1.md)

---
title: Wiki更新履歴
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/wiki/index.md
  - docs/SPRINT_1_BACKLOG.md
  - docs/SPEC_CHANGELOG.md
  - tag:sprint0-complete
last_verified: 2026-08-03
---

# Wiki更新履歴

## 概要

このファイルは **Wiki全体（全Sprint共通）** の更新履歴だけを記録する。ゲーム仕様の変更履歴（[`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md)）とは別である。

## 履歴

### 2026-08-03 — Sprint 1実装バックログ定義 受入監査修正同期

- `PersonTechniqueState`保存構造の所有をS01-001へ明示するバックログ修正をWikiタスクへ反映
- S01-001／S01-002／S01-003の責務境界を同期
- Sprint 1 実装は未着手のまま

### 2026-08-03 — Sprint 1実装バックログ定義同期

- `docs/SPRINT_1_BACKLOG.md`（S01-001〜S01-009）定義に伴う Wiki タスク索引・ページ追加
- `tasks/index.md` の scope を `cross-sprint` へ変更
- Sprint 1 実装は未着手のまま（タスク定義のみ）

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期 受入監査修正

- `battle-result-and-log.md` の draw 記述を正本 13 の勝者決定規則へ修正
- 共通索引・運用ページの `scope` を `cross-sprint` へ変更
- 各索引概要を Sprint 0 限定表現から横断表現へ修正
- `governance.md` / `contradictions.md` を Wiki 全体・Sprint 横断の記載へ更新

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期

- Sprint 1 仕様 `S1-SPEC-0.1.11` 確定（commit `2800d3b959e575f57660c27b344507dd0e38ddb6`）に伴う Wiki 同期
- `sprint1-pending.md` を正式な `sprint1.md` へ変更
- 08〜14 の説明・索引・不変条件ページを追加
- Sprint 1 実装は未着手であることを明記

### 2026-08-01 — S00-011 LLM Wiki開発知識基盤

- `docs/wiki/` の基本構成を追加
- Sprint 0（`sprint0-complete` / `504fa3cc16346dd0c6480e8328e42518e68215d3`）の確定情報のみを収録
- 当時は Sprint 1 を pending 入口のみとしていた（本同期で正式ページへ置換）
- リンク・front matter・sources パス検証スクリプト `scripts/check-wiki.mjs` を追加

## 関連する正本

該当なし（Wikiメタ履歴）。

## 関連するコード

- `scripts/check-wiki.mjs`

## 関連するテスト

- `npm run wiki:check`

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [README.md](README.md)

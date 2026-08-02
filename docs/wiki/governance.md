---
title: Wiki運用規則
status: current
authority: explanatory
scope: cross-sprint
sources:
  - AGENTS.md
  - docs/AI_DEVELOPMENT_RULES.md
  - docs/SPEC.md
  - tag:sprint0-complete
last_verified: 2026-08-01
---

# Wiki運用規則

## 概要

本ページは `docs/wiki` **全体**へ適用する運用規則をまとめた説明です。Sprint 0・Sprint 1 を問わず適用する。ゲーム仕様そのものを定義しません。

## 現在確定している内容

### 正本ではない

- Wikiは説明・索引であり、正本ではない
- Wikiだけを根拠に実装しない
- 実装前に正式仕様と関連テストを確認する
- Sprint 1 仕様ページも正本ではなく、正本は `docs/SPEC.md` と `docs/specs/*.md` である

### 記録の範囲

- 未確定仕様は `current` として記録しない
- Wiki更新は仕様確定または実装 commit 後に行う
- 推測による補完は禁止する
- 情報が無い項目は「確認できる記録なし」または「該当なし」とする

### 矛盾時

- Wikiと正本が矛盾する場合は正本を優先する
- 自動的に仕様やコードを修正しない
- [`contradictions.md`](contradictions.md) へ正本候補・矛盾内容・影響範囲を記録する

### 廃止とレビュー

- 廃止情報は削除せず、必要に応じて `superseded` として残す
- Wiki更新も Git レビュー対象とする
- タスク完了時に関連ページの更新候補を確認する

### 正本優先順位

1. SPEC.md および正式ミニ仕様
2. コードと自動テスト
3. Git の commit・tag
4. docs/wiki
5. 会話・作業報告

## 関連する正本

- [`AGENTS.md`](../../AGENTS.md)
- [`docs/AI_DEVELOPMENT_RULES.md`](../AI_DEVELOPMENT_RULES.md)

## 関連するコード

該当なし。

## 関連するテスト

該当なし。

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [contradictions.md](contradictions.md)

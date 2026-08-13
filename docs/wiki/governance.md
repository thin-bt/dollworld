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
last_verified: 2026-08-13
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

### `last_verified` の意味

- `last_verified` は、そのページの**currentな記述**をfront matterの`sources`に示した正本・履歴アンカーへ最後に照合した日を表す
- ファイルのmtime、Drive更新日時、Git commit日時と一致させるための欄ではない
- currentな仕様・実装状態・不変条件の記述を変更する場合は、同じ変更で関連sourceを再確認し、`last_verified`をその確認日へ更新する
- 表記・リンク・整形だけの変更、または明示的な履歴情報だけを追記する変更は、それ自体を理由に`last_verified`を更新しない
- `last_verified`を機械的なmtime比較で検査しない。意味上の再確認を伴わない日付更新は禁止する

### 進行状態の所有

- Wikiはliveなtask進行状態の正本ではない
- 現在進行中のtask、着手可能工程、blocker、Cursorの実行中lock等は、dollworldのproject coordination / audit workflow側の正本を確認する
- Wikiに記載するtask statusは、accepted commitやcompletion snapshot等を説明するcurrentまたはhistorical情報とし、live coordination状態を上書きしない
- Wiki内に過去時点の`pending` / `implemented` / `accepted`等が履歴として残る場合は、その時点・commit・Sprint等の文脈を明示する

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

---
title: 設計判断索引
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPRINT_0_BACKLOG.md
last_verified: 2026-08-11
---

# 設計判断索引

## 概要

Sprint 0・Sprint 1を横断する設計判断索引。正本は TECHNICAL_DECISIONS・正式ミニ仕様・バックログである。

## 現在確定している内容

### Sprint 0（実装済み技術判断）

- [Sprint 0 技術判断要約](sprint0.md)
- [性能警告の扱い](performance-warnings.md)

### Sprint 1（仕様ベースライン・identity・config判断）

- [Sprint 1仕様ベースライン](sprint1-spec-baseline.md)
- [Sprint1ConfigとSimulationIdentity](sprint1-identity-and-config.md)

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)

## 関連するコード

該当なし（判断の索引）。S01-001〜S01-009はimplemented / accepted（S01-009受入完了commit `5616f5f`）。残作業は clean master `npm run verify:sprint1` と `sprint1-complete` tag 作成。

## 関連するテスト

該当なし。

## 関連する判断

該当なし。

## 未解決事項

該当なし。

## 関連Wikiページ

- [../architecture/workspace.md](../architecture/workspace.md)
- [../sprints/sprint0.md](../sprints/sprint0.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)

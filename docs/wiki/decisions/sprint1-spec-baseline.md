---
title: Sprint 1仕様ベースライン
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/SPEC.md
  - docs/SPEC_CHANGELOG.md
  - docs/SPEC_PREPARATION_PLAN.md
  - docs/specs/08-character-growth.md
  - docs/specs/09-technique-system.md
  - docs/specs/11-battle-state.md
  - docs/specs/12-battle-turn-resolution.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-01
related:
  - sprint1-identity-and-config.md
  - ../sprints/sprint1.md
---

# Sprint 1仕様ベースライン

## 概要

Sprint 1 仕様確定時点のベースライン記録。正本の変更履歴は [`docs/SPEC_CHANGELOG.md`](../../SPEC_CHANGELOG.md) を優先する。

## 現在確定している内容

- 正式版: `S1-SPEC-0.1.11`
- 正本: `SPEC-0.1.2`
- 仕様確定 commit: `2800d3b959e575f57660c27b344507dd0e38ddb6`
- 08〜14 は作成・受入監査済み
- `S1-SPEC-0.1.10-draft` は履歴であり現行版ではない
- BaseStat 旧名修正: `vitality` → `stamina`、Ability としての `technique` → `skill`
- 系統名修正: `martial` → `unarmed`
- `currentMental` の clamp 廃止（範囲外は開始前失敗）
- **Sprint 1 実装はこの時点では未着手**

## 関連する正本

- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/SPEC_CHANGELOG.md`](../../SPEC_CHANGELOG.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)

## 関連するコード

該当なし（Sprint 1 実装は未着手）。

## 関連するテスト

該当なし（Sprint 1 実装は未着手）。

## 関連する判断

- [sprint1-identity-and-config.md](sprint1-identity-and-config.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../sprints/sprint1.md](../sprints/sprint1.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)

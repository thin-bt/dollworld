---
title: 能力と適性
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/00-domain-glossary.md
  - docs/specs/08-character-growth.md
  - docs/specs/09-technique-system.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-01
related:
  - techniques-and-mastery.md
  - ../invariants/character-growth.md
  - ../sprints/sprint1.md
---

# 能力と適性

## 概要

Sprint 0 公開型と Sprint 1 仕様で共有する基礎能力キー・系統適性キーの説明入口。定義の正本は 00・08・09 である。

## 現在確定している内容

### AbilityKey（基礎能力）

```text
stamina | strength | skill | speed | spirit | magic
```

- `vitality` は AbilityKey ではない
- `technique` は AbilityKey ではない
- Sprint 1 の `BaseStat` は上記 AbilityKey と同一

### AptitudeKey（系統適性）

```text
unarmed | sword | magic
```

- `martial` は AptitudeKey／TechniqueCategory／BasicAttackProfile として使用しない
- `TechniqueCategory`、`BasicAttackProfile`、`DomainAptitude`、`AptitudeKey` は `unarmed | sword | magic` へ統一する
- 系統適性の取得は同一キーで行い、暗黙対応は禁止する（09・12・14）

### 区別する概念

正本で区別されている次を混同しない。

- 能力（Ability／BaseStat）
- 適性（Aptitude／DomainAptitude）
- 表面値・顕在遺伝値・潜在遺伝値
- 成長係数・現在値係数などの設定値

詳細な構造は 08・00 を読むこと。このページへ正本の型定義を複製しない。

## 関連する正本

- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md)
- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

該当なし（Sprint 1 実装は未着手）。Sprint 0 の公開型は `packages/simulation-core` の AbilityKey／AptitudeKey を参照。

## 関連するテスト

該当なし（Sprint 1 実装は未着手）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [techniques-and-mastery.md](techniques-and-mastery.md)
- [../invariants/character-growth.md](../invariants/character-growth.md)
- [../sprints/sprint1.md](../sprints/sprint1.md)

---
title: 人物成長の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/08-character-growth.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/00-domain-glossary.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-01
related:
  - weekly-training-and-learning.md
  - ../glossary/abilities-and-aptitudes.md
  - ../sprints/sprint1.md
---

# 人物成長の不変条件

## 概要

08・14 を根拠とする人物能力・適性・一時状態の索引。正本の式や範囲をこのページで再定義しない。

## 現在確定している内容

- AbilityKey は 6 種固定: `stamina | strength | skill | speed | spirit | magic`
- AptitudeKey は 3 種固定: `unarmed | sword | magic`
- 能力値・適性・潜在値（顕在／潜在遺伝値）を混同しない
- 範囲・整数・canonical 順は 08・14 に従う
- `[Sprint 1暫定]` の調整可能値を正本ゲームルールへ昇格させない
- Sprint 0 人物型との互換を維持し、既存公開型を独自別名へ差し替えない（08）

## 関連する正本

- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

該当なし（Sprint 1 実装は未着手）。

## 関連するテスト

該当なし（Sprint 1 実装は未着手）。

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [weekly-training-and-learning.md](weekly-training-and-learning.md)

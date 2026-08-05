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
last_verified: 2026-08-04
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
- `currentMental` は 0..(50+spirit)。上限超過は clamp せず failure
- `StatGrowthRemainder.milliPoints` は 0..999。ABILITY_KEYS ちょうど1件・昇順正規化
- `PersonTemporaryCondition` は fatigue／injury 0..100、condition／confidence -20..20
- `techniqueStates` は dense・TechniqueId 昇順・重複なし。focus は配列内参照必須
- 初期化adapterは RNG／イベントなし。二重初期化拒否
- 初期化adapterは `cloneWorldEngineState` で世界全体を検証し、raw Person spread／getter 実行をしない
- 初期化adapterは fresh initial date（1年4月第1週・absoluteWeek=0）のみ受理。途中worldは拒否し日時を巻き戻さない
- `[Sprint 1暫定]` の調整可能値を正本ゲームルールへ昇格させない
- Sprint 0 人物型との互換を維持し、既存公開型を独自別名へ差し替えない（08）

## 関連する正本

- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/sprint1-person-state.ts`
- `packages/simulation-core/src/sprint1/person-temporary-condition.ts`
- `packages/simulation-core/src/sprint1/stat-growth-remainder.ts`
- `packages/simulation-core/src/sprint1/growth-factor-selectors.ts`
- `packages/simulation-core/src/sprint1/attach-sprint1-person-state.ts`
- `packages/simulation-core/src/domain.ts`（`Person.sprint1State?`）

## 関連するテスト

- `packages/simulation-core/src/sprint1-person-growth.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [weekly-training-and-learning.md](weekly-training-and-learning.md)

---
title: 技と熟練度
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/09-technique-system.md
  - docs/specs/10-training-and-learning.md
  - docs/specs/14-sprint1-config-schema.md
  - commit:efd5ee1fcf1149d755778a031f08a9f7bba377d5
last_verified: 2026-08-05
related:
  - abilities-and-aptitudes.md
  - ../invariants/weekly-training-and-learning.md
  - ../sprints/sprint1.md
---

# 技と熟練度

## 概要

技定義・カテゴリ・熟練度・習得・基本攻撃の説明入口。正本は 09・10・14。

## 現在確定している内容

### 主な概念

- `TechniqueDefinition` / `TechniqueId` / `TechniqueCatalog`
- `TechniqueCategory` = `unarmed | sword | magic`
- mastery／effectiveMastery（表示熟練度と有効熟練度の扱いは 09 を正とする）
- 習得条件（必要適性・必要能力・前提技・前提熟練度など。詳細は 09）
- 師匠あり／独学の区別（09・10）

### 基本攻撃

- プロファイルは `unarmed | sword | magic`
- TechniqueDefinition・TechniqueCatalog へ含めない
- Sprint1Config の `basicAttackProfiles` として保持し、設定 hash 対象に含める（14）
- 人物の習得技状態・熟練度成長対象外（09）
- 精神消費 0（09）

### 名称の区別

- `learnTechnique`／`practiceTechnique` は週間行動名（10・14）
- AbilityKey の旧称としての `technique`（技量）とは別概念である。技量キーは `skill`

数値・式・既定値は 09・10・14 に実在するものだけを正とし、このページへ再定義しない。

## 関連する正本

- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)
- [`docs/specs/10-training-and-learning.md`](../../specs/10-training-and-learning.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/technique-definition.ts`
- `packages/simulation-core/src/sprint1/technique-catalog.ts`
- `packages/simulation-core/src/sprint1/technique-person-semantics.ts`
- `packages/simulation-core/src/sprint1/technique-acquisition.ts`
- `packages/simulation-core/src/sprint1/technique-mastery.ts`
- `packages/simulation-core/src/sprint1/technique-teacher.ts`
- `packages/simulation-core/src/sprint1/technique-basic-attack.ts`

S01-003でカタログ／意味validation／習得条件／熟練度参照を実装済み。正式技一覧・週間更新は未着手。数値式の正本は 09・14。

## 関連するテスト

- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

正式な production 技一覧は 09 後続事項。週間進捗・熟練加算は S01-004。RunRuleSnapshot 接続は S01-005。Sprint 1全体は未完了。

## 関連Wikiページ

- [abilities-and-aptitudes.md](abilities-and-aptitudes.md)
- [../invariants/weekly-training-and-learning.md](../invariants/weekly-training-and-learning.md)
- [../architecture/sprint1-processing-flow.md](../architecture/sprint1-processing-flow.md)

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
  - commit:259a219d29b626c4678e5b248b8a8453861797f9
  - commit:3b313a5ea690351d062e751bc724e5530b835872
last_verified: 2026-08-08
related:
  - sprint1-identity-and-config.md
  - ../sprints/sprint1.md
---

# Sprint 1仕様ベースライン

## 概要

Sprint 1 仕様のベースライン記録。正本の変更履歴は [`docs/SPEC_CHANGELOG.md`](../../SPEC_CHANGELOG.md) を優先する。

## 現在確定している内容

### 仕様版

- 現行: `S1-SPEC-0.1.20`
- 正本: `SPEC-0.1.2`
- `S1-SPEC-0.1.11` 確定 commit: `2800d3b959e575f57660c27b344507dd0e38ddb6`
- `S1-SPEC-0.1.12` は 2026-08-05 の週間処理契約clarification（受入監査追補含む）。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.13` は MatchId generator契約（`match-id-generator-0.1.0`）の明文化。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.14` は戦闘ターン入力契約（replacementReason／battle-action-script／技使用回数）の明文化。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.15` は移動状態補正（`moverStateModifier`／`opponentStateModifier`）の明文化。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.16` は`BattleActionLog.movementChance`の明文化。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.17` は戦闘開始`sourceSnapshot` baselineの明文化（常時hash検証・BattleState schema `0.6.0`）。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.18` はBattleResult決定的契約clarification（summary下位型／experienceSummary／同点比較／RNG tie-break／戦闘mastery適用順）。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.19` はpost-start execution abort契約clarification（3 result kind維持／`BattleExecutionAbortError`／dependency_failure／internal_invariant_violation／原子的abort／S01-008 commit禁止）。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.20` はS01-008 integration contracts clarification（`weekly-training`／`Sprint1RunRuntimeState`／sidecar／SimulationIdentity 0.4.0／`--sprint1-input`／run-metadata 0.4.0）。Sprint1Config balance／hashは不変
- `S1-SPEC-0.1.10-draft` は履歴であり現行版ではない

### `S1-SPEC-0.1.11` 確定時点の履歴メモ

当時（commit `2800d3b...`）の受入内容の要約:

- BaseStat 旧名修正: `vitality` → `stamina`、Ability としての `technique` → `skill`
- 系統名修正: `martial` → `unarmed`
- `currentMental` の clamp 廃止（範囲外は開始前失敗）
- その時点では Sprint 1 実装は未着手だった

### 現在の実装状態（別段落）

- S01-001〜S01-007 はimplemented / accepted（S01-007受入完了commit `a39e476`）。現在は`S1-SPEC-0.1.20` clarifier中。clarifier受入後にS01-008実装再開
- 次の実装着手は S01-008（統合契約は0.1.20で固定済み・配線未着手）
- Sprint 1 全体は未完了

## 関連する正本

- [`docs/SPEC.md`](../../SPEC.md)
- [`docs/SPEC_CHANGELOG.md`](../../SPEC_CHANGELOG.md)
- [`docs/SPEC_PREPARATION_PLAN.md`](../../SPEC_PREPARATION_PLAN.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/`
- `packages/simulation-core/src/sprint1/constants.ts`

## 関連するテスト

- `packages/simulation-core/src/sprint1-foundation.test.ts`
- `packages/simulation-core/src/sprint1-person-growth.test.ts`
- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.12-contracts.test.ts`

## 関連する判断

- [sprint1-identity-and-config.md](sprint1-identity-and-config.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../sprints/sprint1.md](../sprints/sprint1.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
- [../invariants/battle-start.md](../invariants/battle-start.md)

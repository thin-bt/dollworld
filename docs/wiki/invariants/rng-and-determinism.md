---
title: RNGと決定性
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/specs/07-seeded-rng.md
  - docs/SPEC.md
  - docs/SPRINT_0_BACKLOG.md
  - tasks/S00-003.md
  - tasks/S00-010.md
last_verified: 2026-08-01
related:
  - ../decisions/performance-warnings.md
---

# RNGと決定性

## 概要

シード付き乱数と再現性検証の索引。

## 現在確定している内容

- `Math.random()` 禁止
- アルゴリズム `xoshiro128ss-v1`（07）
- 同一 seed・同一設定で決定的出力が一致する
- 異なる seed では simulationId と実体世界内容が異なる（異 seed 比較は識別メタデータを除外して実体差を見る）
- boundary seed `0` と `4294967295` の短時間同 seed 決定性を検証（長期性能は notPerformed）
- 同 seed 100年比較は first／second の両 run を独立に不変条件・validation・termination・固定7ファイル検証する（S00-010）

## 関連する正本

- [`docs/specs/07-seeded-rng.md`](../../specs/07-seeded-rng.md)
- [`docs/SPEC.md`](../../SPEC.md)
- [`tasks/S00-003.md`](../../../tasks/S00-003.md)
- [`tasks/S00-010.md`](../../../tasks/S00-010.md)

## 関連するコード

- `packages/simulation-core/src/rng.ts`
- `apps/simulator/src/sprint0-verification/determinism-verification.ts`
- `apps/simulator/src/sprint0-verification/same-seed-verification.ts`
- `apps/simulator/src/sprint0-verification/boundary-seed-verification.ts`

## 関連するテスト

- `packages/simulation-core/src/rng.test.ts`
- `apps/simulator/src/sprint0-verification/sprint0-verification.test.ts`

## 関連する判断

- [../tasks/S00-010.md](../tasks/S00-010.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [runtime-state.md](runtime-state.md)
- [../glossary/simulation-identity.md](../glossary/simulation-identity.md)

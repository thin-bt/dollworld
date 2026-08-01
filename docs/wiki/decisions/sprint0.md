---
title: Sprint 0 技術判断要約
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/TECHNICAL_DECISIONS.md
  - docs/SPRINT_0_BACKLOG.md
  - tag:sprint0-complete
last_verified: 2026-08-01
related:
  - performance-warnings.md
  - ../architecture/workspace.md
---

# Sprint 0 技術判断要約

## 概要

TECHNICAL_DECISIONS（TECH-0.1.4）と Sprint 0 バックログから確認できる固定事項の要約。詳細は正本を読むこと。

## 現在確定している内容

- npm workspaces、ESM、TypeScript strict、Vitest、ESLint、Prettier、LF
- simulation-core に外部実行時依存なし、手書きバリデータ
- RNG = `xoshiro128ss-v1`
- Sha256 は依存注入（core は `node:crypto` 非依存）
- Sprint 0 に MySQL・ORM・Web UI なし
- 固定完了コマンド: `npm run simulate -- --years 100 --seed 12345 --config config/initial-world.config.json`
- 性能超過だけでは失敗にしない（警告）

このページは TECHNICAL_DECISIONS の代替ではない。

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`docs/SPRINT_0_BACKLOG.md`](../../SPRINT_0_BACKLOG.md)

## 関連するコード

- `package.json`
- `packages/simulation-core/`
- `apps/simulator/`

## 関連するテスト

- `npm run check`

## 関連する判断

- [performance-warnings.md](performance-warnings.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [../architecture/index.md](../architecture/index.md)
- [../sprints/sprint0.md](../sprints/sprint0.md)

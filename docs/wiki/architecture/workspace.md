---
title: ワークスペース構成
status: current
authority: explanatory
scope: sprint0
sources:
  - docs/TECHNICAL_DECISIONS.md
  - package.json
  - commit:2f61ebeebb54f3eef469d9dc7c749af06e658a2d
last_verified: 2026-08-01
related:
  - simulation-core.md
  - headless-cli.md
---

# ワークスペース構成

## 概要

npm workspaces によるモノレポ構成の説明。

## 現在確定している内容

TECHNICAL_DECISIONS（TECH-0.1.4）および実装より:

- workspaces: `packages/*`、`apps/*`
- ルートパッケージ名: `shared-world-observation-game`（private）
- Sprint 0 の中核: `@shared-world/simulation-core`（`packages/simulation-core`）
- CLI: `@shared-world/simulator`（`apps/simulator`、S00-008 以降）
- Node `>=24.18.0 <27`、npm `>=11.16.0 <12`、`packageManager: npm@11.16.0`
- ESM、`tsc` のみ（Sprint 0 にバンドラーなし）
- ルート `npm run check` = format:check → lint → typecheck → test → build

## 関連する正本

- [`docs/TECHNICAL_DECISIONS.md`](../../TECHNICAL_DECISIONS.md)
- [`package.json`](../../../package.json)
- [`tasks/S00-001.md`](../../../tasks/S00-001.md)

## 関連するコード

- `packages/simulation-core/`
- `apps/simulator/`
- ルート `tsconfig.base.json`、`eslint.config.js`、`vitest.config.ts`

## 関連するテスト

- `packages/simulation-core/src/index.test.ts`（smoke）

## 関連する判断

- [../decisions/sprint0.md](../decisions/sprint0.md)
- [../tasks/S00-001.md](../tasks/S00-001.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [simulation-core.md](simulation-core.md)
- [headless-cli.md](headless-cli.md)

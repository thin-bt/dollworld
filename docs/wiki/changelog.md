---
title: Wiki更新履歴
status: current
authority: explanatory
scope: cross-sprint
sources:
  - docs/wiki/index.md
  - docs/SPRINT_1_BACKLOG.md
  - docs/SPEC_CHANGELOG.md
  - tag:sprint0-complete
last_verified: 2026-08-04
---

# Wiki更新履歴

## 概要

このファイルは **Wiki全体（全Sprint共通）** の更新履歴だけを記録する。ゲーム仕様の変更履歴（[`docs/SPEC_CHANGELOG.md`](../SPEC_CHANGELOG.md)）とは別である。

## 履歴

### 2026-08-04 — S01-001 第5回受入監査修正（単位契約）

- weeklyPlanner の整数 score 罰／上限と strategy の整数 surrender score／threshold を `number` に修正（BasisPoints誤分類を解消）
- BasisPoints は小数 factor／ratio／multiplier／per-point 係数のみ。field名に weight があっても整数 score は number
- `countNumericLeaves` を package root から非公開化。型契約テストを追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-04 — S01-001 第4回受入監査修正（厳密basis points／API境界）

- basis points変換は `value * 10000` が safe integer の場合だけ成功（Math.round／許容差なし）
- raw／normalized ネスト型を分離。`BasisPoints` を normalized 係数 field に使用。無検証 brand API を削除
- `validateNormalizedSprint1Config` を追加。normalized clone／freeze は registry canonical 照合付き
- deprecated alias（`createDefaultSprint1Config` 等）と registry introspection を非公開化
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 第3回受入監査修正（basis points）

- raw `Sprint1ConfigInput`とnormalized `Sprint1Config`を分離。小数係数はvalidation時にbasis points整数化
- config hash／registryは正規化後canonical JSONを固定。固定SHA-256 fixtureを更新
- normalized configの全number leafはsafe integer。次はS01-002。Sprint 1全体は未完了

### 2026-08-03 — S01-001 第2回受入監査修正

- reflection全経路（getPrototypeOf／Array.isArray／length descriptor／ownKeys）をValidationResult failureへ変換
- public clone／freezeもvalidation経由の`ValidationResult`へ変更（getter／toJSON非実行）
- `sprint1-balance-0.2.0` canonical SHA-256固定fixtureとregistry不変化を追加
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 受入監査修正

- configVersion registryによる内容一意性、public hash入口のvalidation必須化、hardened plain-data snapshot／deep freeze、配列extra property拒否、RangeShiftAfterUse完全union、specVersions canonical正規化をWikiタスクへ反映
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — S01-001 Sprint 1ドメイン型・設定基盤

- S01-001（TechniqueId／PersonTechniqueState保存型／Sprint1Config／canonical・hash／SimulationIdentity）を実装
- `PersonTechniqueState`保存型の所有境界（S01-001）を維持し、S01-003で再定義しない
- Sprint 1全体は未完了（次はS01-002）

### 2026-08-03 — Sprint 1実装バックログ定義 受入監査修正同期

- `PersonTechniqueState`保存構造の所有をS01-001へ明示するバックログ修正をWikiタスクへ反映
- S01-001／S01-002／S01-003の責務境界を同期
- Sprint 1 実装は未着手のまま

### 2026-08-03 — Sprint 1実装バックログ定義同期

- `docs/SPRINT_1_BACKLOG.md`（S01-001〜S01-009）定義に伴う Wiki タスク索引・ページ追加
- `tasks/index.md` の scope を `cross-sprint` へ変更
- Sprint 1 実装は未着手のまま（タスク定義のみ）

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期 受入監査修正

- `battle-result-and-log.md` の draw 記述を正本 13 の勝者決定規則へ修正
- 共通索引・運用ページの `scope` を `cross-sprint` へ変更
- 各索引概要を Sprint 0 限定表現から横断表現へ修正
- `governance.md` / `contradictions.md` を Wiki 全体・Sprint 横断の記載へ更新

### 2026-08-01 — S01-000 Sprint 1 LLM Wiki同期

- Sprint 1 仕様 `S1-SPEC-0.1.11` 確定（commit `2800d3b959e575f57660c27b344507dd0e38ddb6`）に伴う Wiki 同期
- `sprint1-pending.md` を正式な `sprint1.md` へ変更
- 08〜14 の説明・索引・不変条件ページを追加
- Sprint 1 実装は未着手であることを明記

### 2026-08-01 — S00-011 LLM Wiki開発知識基盤

- `docs/wiki/` の基本構成を追加
- Sprint 0（`sprint0-complete` / `504fa3cc16346dd0c6480e8328e42518e68215d3`）の確定情報のみを収録
- 当時は Sprint 1 を pending 入口のみとしていた（本同期で正式ページへ置換）
- リンク・front matter・sources パス検証スクリプト `scripts/check-wiki.mjs` を追加

## 関連する正本

該当なし（Wikiメタ履歴）。

## 関連するコード

- `scripts/check-wiki.mjs`

## 関連するテスト

- `npm run wiki:check`

## 関連する判断

- [governance.md](governance.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [index.md](index.md)
- [README.md](README.md)

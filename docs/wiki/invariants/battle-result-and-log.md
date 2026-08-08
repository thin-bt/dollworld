---
title: 戦闘結果・ログの不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/13-battle-result-and-log.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/03-event-envelope.md
  - docs/specs/05-statistics-output.md
  - commit:2800d3b959e575f57660c27b344507dd0e38ddb6
last_verified: 2026-08-08
related:
  - battle-turn-resolution.md
  - ../architecture/battle-lifecycle.md
  - fixed-seven-files.md
---

# 戦闘結果・ログの不変条件

## 概要

13・14 を根拠とする決着・結果・ログの索引。大会順位・昇格・賞金は対象外。

## 現在確定している内容

- KO 等の決着、続行不能、最大ターン到達時の判定（詳細は 12・13）
- BattleResult の保持内容と整合検証（13）
- `resultKind=completed` では `winnerPersonId`／`loserPersonId` を正本規則どおり決定し、両者は別人物とする
- `endReason=judge_decision` でも同点規則により勝者を決定し、通常の引き分け（draw）状態は作らない
- `resultKind=failed` かつ `endReason=resolution_error` では `winnerPersonId`／`loserPersonId` を両方 null とする
- completed と resolution_error の状態を混同しない
- 戦闘概要ログとターン詳細ログの分離（13）
- 疲労・負傷などの戦闘後効果（13）
- 固定 7 ファイル出力との関係は、03・05 に書かれた範囲だけを根拠にする（EventEnvelope 0.2.0、RunRuleSnapshot の保存先など）
- 詳細戦闘ログ全件を世界イベントへ複製しない（SPEC・03・13）

## 関連する正本

- [`docs/specs/13-battle-result-and-log.md`](../../specs/13-battle-result-and-log.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/03-event-envelope.md`](../../specs/03-event-envelope.md)
- [`docs/specs/05-statistics-output.md`](../../specs/05-statistics-output.md)

## 関連するコード

- BattleResult productionは未実装（S01-007）
- S01-006ターンResolver／DetailedLog履歴検証（actionSequence 0始まり、RNG chain、BattleState bind）は実装済み。索引は [battle-turn-resolution.md](battle-turn-resolution.md)
- `S1-SPEC-0.1.17`のsourceSnapshot baseline、`S1-SPEC-0.1.18`のBattleResult決定的契約（summary下位型／同点比較／RNG／mastery）は13正本を参照。契約純関数は`battle-result-contracts.ts`

## 関連するテスト

- ターン詳細ログ検証: `packages/simulation-core/src/sprint1-battle-turn-resolution.test.ts`
- `S1-SPEC-0.1.18`契約: `packages/simulation-core/src/sprint1-spec-0.1.18-battle-result-contracts.test.ts`
- BattleResult完成テストは未実装（S01-007）
- `S1-SPEC-0.1.14`のターン入力契約テストは`sprint1-spec-0.1.14-turn-contracts.test.ts`

## 関連する判断

- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [battle-turn-resolution.md](battle-turn-resolution.md)
- [fixed-seven-files.md](fixed-seven-files.md)
- [../architecture/battle-lifecycle.md](../architecture/battle-lifecycle.md)

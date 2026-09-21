# SPRINT2_STATUS

state: REOPENED_FIX_REQUIRED
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-21T16:58:00+09:00
previous-binding-product-baseline: 8d52ead09e7a5a6736777ab281db21ae79f28d48
active-sprint: Sprint2
blocks-sprint3-formal-close: true

## Reopen reason

Sprint2 was previously marked CLOSED from browser/wireframe/visual evidence that did not prove the normal user-facing game loop was complete.

Newly discovered product defects invalidate that closure:

- normal weekly progression does not prove tournament lifecycle from schedule -> participant selection -> automatic staging -> battle -> completion;
- tournament UI exposes manual competition-step controls ("大会を開始して1試合進める" / "次の試合を進める") instead of demonstrating the intended normal world progression;
- participant population/visibility in ordinary play is not established;
- tournament completion -> result persistence -> annual ranking update is not established in ordinary play;
- the standalone Ranking screen is effectively unimplemented and delegates users back to the tournament screen;
- the tournament match screen does not inherit the battle presentation/UX already established in the mock-battle/battle-log presentation layer.

These are completion-breaking Sprint2 regressions / omissions, not cosmetic follow-ups.

## Required re-acceptance

Sprint2 must remain open until ordinary user operation proves this full chain without test-only/manual competition stepping:

`週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`

Battle presentation used by official tournament matches must reuse the accepted common battle presentation from the earlier battle/mock-battle work unless a documented product requirement explicitly requires a difference.

Historical READY/CLOSED artifacts remain audit history only and no longer authorize Sprint2 closure.

Sprint3 may retain completed work as history, but no Sprint3 formal-close transition may proceed while Sprint2 is reopened.

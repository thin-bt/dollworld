# SPRINT2-REOPEN-FINAL-STATUS-READINESS-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master

## Objective

Independently assemble the final Sprint2 reopen status-transition evidence on current canonical master while Cursor A remains assigned to the non-browser final root gate. Do not duplicate A's root-gate execution and do not edit Sprint2/Sprint3 status files.

## Required execution

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, `SPRINT2_STATUS.md`, `SPRINT3_STATUS.md`, both lane inboxes, newest Sprint2 reopen results, and current master.
2. Claim B2 ACTIVE using the canonical lane protocol. Do not touch Cursor A control/task state.
3. Verify current master includes the repaired ordinary weekly tournament lifecycle/ranking product lineage and the canonical targeted browser reacceptance harness publication `bc1131b68c187240b2abbe8f2b108ae92b46126a`.
4. Build a binding evidence matrix against every Required re-acceptance item in `SPRINT2_STATUS.md`: ordinary `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`, official-match common battle presentation reuse, and standalone Ranking screen.
5. Reuse existing terminal evidence where valid. Run only bounded focused checks needed to resolve an evidence ambiguity; do not duplicate A's `npm run check` final root gate.
6. If all B2/browser/product requirements are proven, publish terminal `READY_FOR_STATUS_TRANSITION_PENDING_A_GATE`, explicitly identifying A final root gate as the only remaining dependency if it is still PREPARED/non-terminal.
7. If a real product/evidence gap remains, publish the exact bounded blocker and smallest next repair task.
8. Publish result under `_handoff-artifacts/results/SPRINT2-REOPEN-FINAL-STATUS-READINESS-B2-20260921-R1/result.md`, set B2 TERMINAL, then return B2 to IDLE after canonical consumption/readback.

## Workspace hygiene

Never create transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/`. Correct any observed root-level transient defect in the same pickup.

## Terminal classes

- READY_FOR_STATUS_TRANSITION_PENDING_A_GATE — all B2/browser/product re-acceptance evidence is complete; only A final root gate remains if not terminal.
- READY_FOR_STATUS_TRANSITION — all required evidence including already-terminal A gate is complete; PM/control may perform status transition.
- BLOCKED_EVIDENCE_GAP — exact re-acceptance evidence is missing.
- BLOCKED_PRODUCT_GAP — a reproducible user-facing Sprint2 defect remains.
- BLOCKED_ENVIRONMENT — bounded verification cannot execute for a concrete environmental reason.

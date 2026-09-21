# SPRINT2-REOPEN-FORMAT-BLOCKER-REPAIR-B2-20260921-R1

lane: B2
sprint: Sprint2
mode: HYGIENE_REPAIR
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master

## Objective

Remove the only known blocker to the Sprint2 reopen final non-browser root gate: Prettier/format failures on the six already-identified Sprint2-reopen UI/presentation files. This task is hygiene-only and must not change product behavior.

## Required fresh reads

- `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
- `_handoff-artifacts/control/SPRINT2_STATUS.md`
- `_handoff-artifacts/control/SPRINT3_STATUS.md`
- `_handoff-artifacts/results/SPRINT2-REOPEN-FINAL-STATUS-READINESS-B2-20260921-R1/result.md`
- Cursor A inbox/task state; do not duplicate A's final root gate.

## Scope

Apply repository Prettier formatting only to these six paths reported by the final readiness evidence:

- `apps/web/src/client/battle-log/BattleLogView.tsx`
- `apps/web/src/client/competition/AnnualRankingTable.tsx`
- `apps/web/src/client/competition/competition-match-battle-presentation.ts`
- `apps/web/src/client/competition/CompetitionPage.tsx`
- `apps/web/src/client/ranking/RankingPage.tsx`
- `apps/web/src/server/ui009/competition-match-battle-presentation.ts`

Do not alter semantics. Verify diff is formatting-only. Run `npm run format:check`; if green, publish the bounded formatting delta to canonical `master`. Do not consume or rewrite Cursor A's PREPARED final-root-gate task; A owns the subsequent full `npm run check` gate.

Use `_handoff-artifacts/control-tmp/` for all transient scratch. Correct any root-level transient defect found during pickup.

## Terminal evidence

Publish `_handoff-artifacts/results/SPRINT2-REOPEN-FORMAT-BLOCKER-REPAIR-B2-20260921-R1/result.md` with exact commit/readback, format check outcome, changed paths, and explicit confirmation that the delta is formatting-only. Then consume B2 inbox to IDLE according to protocol.

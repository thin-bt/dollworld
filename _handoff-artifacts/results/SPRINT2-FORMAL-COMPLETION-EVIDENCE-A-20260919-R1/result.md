# SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1

state: FIX_REQUIRED
terminal: SPRINT2_FORMAL_COMPLETION_EVIDENCE_FIX_REQUIRED
lane: A
updatedAt: 2026-09-19T22:26:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: CLEAN_AT_CANONICAL_REMOTE
canonical-master-head: 722c6863610c4ff33c9e80b5b5f9f61fa065a3bc
local-worktree-head: e36179341f26f9bf960c6af1718d6def87e99dd8
publication-commit-detailed-battle-log: e1d5b3bb4e2ed50ee14114cfaa61adf69deadeaa
predecessor-task: SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2
follow-up-a-task: SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
production-change: NO (audit-only)

## Summary

Formal Sprint2 completion-evidence audit on canonical **`origin/master`** @ **`722c686`**. Fresh fetch succeeded; local `git pull` aborted due to handoff working-tree overlap (canonical HEAD taken from **`origin/master`**). Detailed battle-log publication **`e1d5b3b`** is an ancestor of canonical HEAD and match-detail paths are present. **Sprint2 wireframe implementation evidence is not complete on canonical master:** most completion-guard UI testids from `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` are **absent** from `apps/web` at HEAD despite **`SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1`** claiming READY. Paired **B2 R2** has **no published `result.md`**; audit log **`playwright-wireframe-chrome-r2-attempt1.log`** shows guard failures consistent with missing product surfaces. **Do not declare Sprint2 formally complete.** Terminal **`FIX_REQUIRED`** (implementation gap), not `READY_FOR_B2_FORMAL_CLOSE`.

## Evidence consumed

| Source | Disposition |
|--------|-------------|
| `_handoff-artifacts/control/CURSOR_A_INBOX.md` | PREPARED @ pickup |
| `_handoff-artifacts/tasks/SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1/instruction.md` | Canonical scope |
| `_handoff-artifacts/results/SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R1/result.md` | **STALE / FALSE READY** for canonical master — ledger cites modules/testids not in git @ `f9d80a9` or `722c686` |
| `_handoff-artifacts/results/SPRINT2-DETAILED-BATTLE-LOG-PUBLICATION-A-20260919-R2/result.md` | **CONSUMABLE** — battle-log slice on master @ `e1d5b3b` |
| `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1/result.md` | **CONSUMABLE** — documents missing wireframe testids on published master (still directionally valid) |
| `_handoff-artifacts/audit/current/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/playwright-wireframe-chrome-r2-attempt1.log` | Partial B2 R2 run — guard-01/03/04 **FAIL** (read-only; not B2 terminal) |

No later A `FIX_REQUIRED` result supersedes battle-log READY @ `e1d5b3b`. **`SPRINT2-WIREFRAME-UI-CLOSURE-A-20260919-R2`** remains PREPARED (not consumed); fresh follow-on **`SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1`** issued for unpublished wireframe slice recovery.

## Canonical sync

| Check | Result |
|-------|--------|
| `git fetch origin master` | **PASS** |
| `git rev-parse origin/master` | **`722c6863610c4ff33c9e80b5b5f9f61fa065a3bc`** |
| `git rev-parse HEAD` (local) | **`e36179341f26f9bf960c6af1718d6def87e99dd8`** (behind origin; handoff merge blocked) |
| `e1d5b3b` ancestor of `origin/master` | **YES** |

## Completion-guard reconciliation (`SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` vs `origin/master` `apps/web`)

Verified via `git cat-file`, `git ls-tree`, and `git grep` on **`origin/master`**.

| Guard row | Status @ `722c686` | Evidence |
|-----------|-------------------|----------|
| annual schedule | **PARTIAL** | `competition-annual-schedule`, `competition-world-time` in `competition-schedule-matrix.tsx`; **missing** `competition-schedule-year-nav`, prev/current/next year testids (B2 guard-01) |
| tournament detail | **READY** | `competition-detail`, overview/participants tabs in `CompetitionPage.tsx` |
| participant list | **PARTIAL** | `competition-participants` table only; **missing** `competition-participant-comparison` dense columns (guard-03) |
| round-robin standings | **PARTIAL** | `competition-round-robin-matrix` present; **missing** `competition-round-robin-pair-matrix` (guard-04) |
| round-robin match results | **PARTIAL** | `competition-round-robin-history`, `competition-history-match-*` links present |
| knockout bracket | **MISSING** | **no** `competition-knockout-bracket` in `apps/web`; **no** `competition-knockout-bracket-view.ts` on master |
| tournament winner / placements | **READY** | `competition-champion`, `competition-finished`, `competition-match-result` |
| historical tournament editions | **MISSING** | **no** `competition-series-history` |
| historical winners | **MISSING** | (same as series history surface) |
| annual ranking history | **MISSING** | **no** `competition-annual-ranking-table`, `competition-ranking-year-nav`; **no** `RankingPage.tsx` on master |
| promotion result | **MISSING** | **no** `competition-promotion-results`; **no** `commitPromotionWithRankHistory` in `apps/web` |
| person rank history | **MISSING** | **no** `competition-person-rank-history` |
| match detail navigation | **READY** | `competition-history-match-*` → `CompetitionMatchPage` @ `competition-match-page`; log panel testids @ `e1d5b3b` |
| person detail navigation | **UNKNOWN / likely PARTIAL** | `PersonDetailPage` exists globally; **no** participant person links verified on competition participants table @ HEAD |

### F-rank / empty-path note

Promotion and person rank history surfaces are **not projected in UI at all** on canonical master (not merely data-empty). Any empty-default path cannot hide a missing finalize/projection implementation — the canonical promotion-finalize UI path is **not demonstrably present** in product code @ HEAD.

## Mandatory formal closure gates

| Gate | Owner | Status |
|------|-------|--------|
| Wireframe product slice on canonical master | A | **OPEN — FIX_REQUIRED** (see ledger) |
| Wireframe harness on canonical master | A/PM | **OPEN** — `tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts` **not in** `origin/master` (local/unpublished) |
| B2 R2 wireframe Chrome 12/12 | B2 | **OPEN** — no `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2/result.md`; attempt1 log shows failures |
| Sprint2 formal complete declaration | PM | **BLOCKED** |

## First executable blockers (canonical master)

1. **`apps/web/src/client/competition/competition-schedule-matrix.tsx`** — add wireframe year navigation testids (`competition-schedule-year-nav`, prev/current/next) per B2 guard-01.
2. **`apps/web/src/client/competition/CompetitionPage.tsx`** (and extracted components as needed) — implement `competition-participant-comparison`, `competition-round-robin-pair-matrix`, `competition-knockout-bracket`, `competition-series-history`, `competition-ranking-year-nav`, `competition-annual-ranking-table`, `competition-promotion-results`, `competition-person-rank-history` with backing server finalize/projection modules.
3. **`tests/e2e/s2-wireframe-browser-acceptance-b2.spec.ts`** — publish to master with product slice so B2 R2 can terminal on GitHub head.

## Regression verification (bounded, audit pickup)

| When | Check | Result |
|------|-------|--------|
| 2026-09-19T22:24+09:00 | `npx vitest run apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/competition-match-view.test.ts` (local tree) | **4/4 PASS** |

No product edits in this pickup. No Playwright run (B2 owns formal browser terminal after A publication).

## Next action

1. **A:** Execute **`SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1`** — publish wireframe slice + harness to `master`, then READY with SHA + grep evidence.
2. **B2:** Complete **`SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R2`** on published head; publish terminal `result.md`.
3. **A (re-run):** Re-dispatch formal completion evidence audit only after B2 R2 **READY** and implementation ledger has no **MISSING** rows.

## Changed files (this pickup)

| File | Note |
|------|------|
| `_handoff-artifacts/audit/CURSOR_ACTIVE_TASK.md` | ACTIVE → IDLE |
| `_handoff-artifacts/results/SPRINT2-FORMAL-COMPLETION-EVIDENCE-A-20260919-R1/result.md` | Terminal audit |
| `_handoff-artifacts/tasks/SPRINT2-WIREFRAME-CANONICAL-PUBLICATION-A-20260919-R1/instruction.md` | Follow-up A task (non-conflicting with existing R2 key) |

## Terminal

**FIX_REQUIRED** — Sprint2 wireframe implementation evidence on canonical **`origin/master`** @ **`722c686`** does not satisfy the completion guard; B2 R2 formal close remains pending.

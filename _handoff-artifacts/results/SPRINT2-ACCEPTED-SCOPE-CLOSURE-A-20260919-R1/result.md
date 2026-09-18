# SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1

state: READY
terminal: SPRINT2_ACCEPTED_SCOPE_CLOSURE_A_READY
lane: A
updatedAt: 2026-09-19T01:24:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_NO_COMMIT
worktree-head: aa500b60e2c041548b42909fea23a6ae59f3373e
inbox-head-at-pickup: 2d16d51639a892a22c05573dcfc1e8626a62dfc7
predecessor-task: SPRINT2-BROWSER-FIX-A-20260918-R13
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR
production-change: NONE

## Summary

Accepted-scope closure only (no product/lifecycle edits while B2 runs paired reacceptance). Reconciled the three remaining documented browser gaps against accepted wireframe/source-evidence authority, A R13 READY, and B2 R4 FIX_REQUIRED prep harness. **No SPRINT2_MANDATORY gap remains outside the paired mandatory Chrome browser set (7/7).** Sprint2 completion is gated on B2 `SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1` fresh run against the current dirty A R13 worktree—not on further A closure slices for the three documented seams.

## Authority consumed

| Source | Role |
|--------|------|
| `_handoff-artifacts/results/SPRINT2-BROWSER-FIX-A-20260918-R13/result.md` | A R13 READY repair + vitest evidence |
| `_handoff-artifacts/results/SPRINT2-BROWSER-REGRESSION-PREP-B2-20260918-R4/result.md` | B2 R4 FIX_REQUIRED prep + documented gap list |
| `_handoff-artifacts/tasks/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/instruction.md` | Mandatory accepted browser set (7/7 Chrome) |
| `_handoff-artifacts/audit/current/SPRINT2-WIREFRAME-SOURCE-EVIDENCE-REPAIR-A-20260914/source-evidence-manifest.txt` | Accepted Sprint2 wireframe/source-evidence disposition |
| `_handoff-artifacts/audit/current/SPRINT2-FULL-PRODUCT-BROWSER-CLOSURE-B2-20260916/browser-acceptance.txt` | Integrated product seams (historical, still accurate for unlinked surfaces) |
| `_handoff-artifacts/S2_PLAYABLE_COMPETITION_UI_DEPENDENCY_MAP_G360_READY.md` | Domain integration map (non-normative; no new browser mandates) |

## Gap disposition (accepted authority only)

### 1. Knockout / group bracket progression in real browser UI

| Field | Value |
|-------|-------|
| Classification | **FUTURE_RESERVE** |
| Authority | `source-evidence-manifest.txt` § `5_knockout_bracket`: `OUT_OF_SCOPE_FOR_CURRENT_UI009_F_SLOT` — accepted browser path exercises `round_robin` (2–4 entrants); format selection for >4 in `competition-format-selection.ts` + `competition-format-selection.test.ts` |
| Repository evidence | Server: `apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts`, `competition-bracket-progress.test.ts` (vitest PASS). Client: `CompetitionPage.tsx` has no knockout/bracket UI surface |
| Mandatory browser set | Not asserted in B2 R1 Chrome set (prep + round-robin + closure) |

### 2. Competition history row → battle-log / match-detail navigation

| Field | Value |
|-------|-------|
| Classification | **FUTURE_RESERVE** |
| Authority | Not listed as a Sprint2 completion artifact in wireframe manifest; B2 20260916 documents seam #4 (history rows unlinked). Mandatory 7/7 set covers person nav + `competition-match-result` latest-match summary, not per-row battle-log routes |
| Repository evidence | `CompetitionPage.tsx` history table renders text only (no `href` / battle-log route). Server history rows carry `matchId` in `competition-round-robin-progress.ts` but UI does not expose navigation |
| Mandatory browser set | Not in paired B2 reacceptance assertions |

### 3. Larger-bracket / non-tiny standings browser fixture

| Field | Value |
|-------|-------|
| Classification | **ALREADY_SATISFIED** (accepted F-slot round-robin browser path) |
| Authority | Manifest § `4_round_robin_standings_matrix` + `3_participant_rank_coverage`; B2 R4 notes partial coverage via matrix row count >2 |
| Repository evidence | `tests/e2e/s2-ui009-round-robin-competition.spec.ts` and `tests/e2e/s2-full-product-browser-closure.spec.ts` assert `competition-participants` row count >2 and full round-robin matrix/history loop on `sprint1-tiny-accepted` |
| Note | Full >4-entrant knockout/group **browser** standings remain FUTURE_RESERVE (same F-slot boundary as gap 1) |

## SPRINT2_MANDATORY items still open (outside this task’s scope)

| Item | Owner | Surface |
|------|-------|---------|
| Fresh mandatory Chrome browser set 7/7 after A R13 worktree | B2 | `tests/e2e/s2-browser-regression-acceptance-prep.spec.ts`, `s2-ui009-round-robin-competition.spec.ts`, `s2-full-product-browser-closure.spec.ts` |
| Prior B2 R4 verdict | Superseded for acceptance | R4 FIX_REQUIRED / 0/5 prep at pre-repair probe (`2026-09-19T00:32` false-finished); not final post–A-R13 acceptance |

No additional A executable slice is required for mandatory unresolved product work beyond what B2 reacceptance validates on the current dirty tree.

## Optional future A slices (FUTURE_RESERVE only — not Sprint2 mandatory)

If PM later promotes browser knockout or history→battle-log beyond F-slot:

1. **Knockout browser slice**: wire `CompetitionPage.tsx` + `map-competition-view.ts` bracket projection for formats selected when participant count >4; preset/fixture beyond `sprint1-tiny-accepted`; extend Playwright only after wireframe authority update.
2. **History→battle-log slice**: link `roundRobinProgress.history[].matchId` to UI-007 battle-log route in `CompetitionPage.tsx`; server already projects `matchId`.

## Verification (closure lane — source coherence)

Non-overlap check only; no Playwright rerun in A lane (B2 paired task owns browser verdict).

```powershell
cd D:\xampp\htdocs\dollworld
git rev-parse HEAD
npx vitest run apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts apps/web/src/server/ui009/competition-bracket-progress.test.ts
```

| When | Result |
|------|--------|
| 2026-09-19T01:23:01+09:00 | **5/5 files, 9/9 tests PASS** @ HEAD `aa500b60e2c041548b42909fea23a6ae59f3373e` (dirty ui009/simulation/e2e mods preserved) |

## Worktree binding

Uncommitted A R13 surfaces (unchanged this task):

- `apps/web/src/server/routes-simulation.ts`
- `apps/web/src/server/ui009/*.ts` (competition engine/store/map/routes/participant paths)
- `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` (preserved non–Sprint2-ui scope)
- `tests/e2e/s2-*` (B2-owned harness deltas on tree)

## Terminal disposition

**READY** — Every remaining documented browser gap has repository-backed accepted-scope classification. Sprint2 product acceptance is **gated only by** B2 fresh full browser reacceptance on the A R13 worktree and any FIX_REQUIRED blockers that run reports.

# SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1

state: TERMINAL
terminal: CURRENT_MASTER_WIREFRAME_AUDIT_FIX_REQUIRED
verificationOutcome: FIX_REQUIRED
resultClass: WIREFRAME_COVERAGE_AUDIT
lane: A
updatedAt: 2026-09-22T15:30:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
tested-origin-master-sha: fc65e02058e23af5d2284950af7bdb3578e58c26
local-worktree-head-at-pickup: 628c2a3821cf2028b58578baadb0cac22abcaeed
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-068-SEMANTIC-INVARIANT-CANONICAL-PUBLISH-A-20260922-R1
paired-b2-reacceptance: SPRINT2-CURRENT-MASTER-FULL-REAL-UI-REACCEPTANCE-B2-20260922-R1 @ f702986 (older tip; this audit binds fc65e02)
production-change: NO
documentation-change: NO

## Summary

Independent requirement-by-requirement audit of **current `origin/master`** against Sprint2 UI wireframe authority (`TOURNAMENT_UI_WIREFRAME_DRAFT.md`), gap map (`SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md`), and S02-008 earnings-ranking user decision. Sources were fresh-read from repo mirrors of the three Google Drive file ids named in the task instruction. Real UI evidence combines **source inspection on detached worktree @ `fc65e02`**, **ordinary-flow Playwright PASS**, and **partial wireframe-guard harness failures** on preset-bootstrap paths. **PASS is not granted**: multiple wireframe acceptance items lack current-master product surfaces and/or reachable browser proof.

### First blocker (fix order)

**WF-14-01 — Player-facing tournament display name (`§14.1–§14.6`)**  
No deterministic player-facing `大会名` is projected or rendered on schedule, detail, or result surfaces. UI uses timing + rank/category labels only (`timingLabel`, `rankOrCategoryLabel`, `kindLabel`). Gap map **G-UI-S2-01 / tournament display name HIGH_RISK_GAP** remains unresolved on `fc65e02`.

## Authority consumed

| Authority | File / id | Use |
|-----------|-----------|-----|
| Primary wireframe | `_handoff-artifacts/specs/proposed/sprint2/gpt/TOURNAMENT_UI_WIREFRAME_DRAFT.md` (Drive `1gHpjYuYWwug85_Sr4VXMSFTvqBPqBVvd`) | Requirement extraction |
| UI data contract gap map | `_handoff-artifacts/specs/proposed/sprint2/gpt/SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md` (Drive `1wmgHM6B96SN7PihbaDhy3XhI7efaCYwG`) | Upstream vs UI binding |
| S02-008 ranking decision | `_handoff-artifacts/audit/current/S02-008-ANNUAL-EARNINGS-RANKING-HISTORY-A-20260901/cursor-report.txt` (Drive `1G9G0MTUpuyeIhBDlKEQ7bkxgfYilj_gMMjmxASQYdf4`) | Earnings column supersedes wireframe “Points” example |

## Verification

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| ACTIVE lock held (RECOVERY same task-key) | **PASS** |
| `git fetch origin master` → bind SHA | **PASS** — `fc65e02` |
| Detached worktree audit | **PASS** — `_handoff-artifacts/control-tmp/s2-wireframe-audit-wt-20260922` |
| Ordinary real-UI flow @ `fc65e02` | **PASS** — `playwright-s2-reopen-ordinary-chrome-fc65e02.log` |
| Wireframe guard harness (preset bootstrap) | **PARTIAL FAIL** — guard-01 PASS; guard-02/03 FAIL — `wireframe-guard-spotcheck-fc65e02.log` |
| Client vitest spot (competition match + schedule matrix) | **PASS** — 3/3 |
| Cursor B2 control files | **not read/written** |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
git worktree add _handoff-artifacts/control-tmp/s2-wireframe-audit-wt-20260922 fc65e02058e23af5d2284950af7bdb3578e58c26
cd _handoff-artifacts/control-tmp/s2-wireframe-audit-wt-20260922
$env:CI = '1'
npx playwright test tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts --project=chrome
npx vitest run apps/web/src/client/competition/competition-match-page.test.tsx apps/web/src/client/competition/competition-schedule-matrix.test.tsx
```

## Coverage ledger

Format: **wireframe requirement → source/route → UI reachability → browser evidence → verdict**

| ID | Wireframe requirement | Current source / route | Reachability | Browser evidence | Verdict |
|----|----------------------|------------------------|--------------|-------------------|---------|
| WF-0 | Observation goals: schedule, participants, category/rank, state, results, person↔tournament | `/competition`, `/people/:id`, `/ranking` | Partial | Ordinary E2E reaches competition + ranking + people links | **PARTIAL** |
| WF-1 | Dark/quiet hierarchy; no raw JSON/IDs as hero | `apps/web` competition + person CSS | Yes (ordinary path) | E2E battle + ranking PASS | **PASS** |
| WF-2 | IA: schedule → detail → participants → person | `CompetitionPage.tsx` tabs + links | Yes after week advance | E2E participants tab + `/people` links | **PASS** |
| WF-3.1–3.6 | Annual matrix: 12×48 weeks, rank rows, category marks, current week | `competition-schedule-matrix.tsx`, `competition-schedule-overview.ts` | Yes | guard-01 PASS; E2E schedule cell | **PASS** |
| WF-3.7 | Compact cell preview with participant/detail actions | Detail aside on select (no separate preview card) | Partial | Selection shows `competition-detail`; no dedicated preview strip | **PARTIAL** |
| WF-3.8 | 4×3 or 6×2 month blocks (recommended) | Single scrollable 12-month table | Yes | guard-01 month headers | **PASS** (acceptable variant) |
| WF-3.9 | Secondary “直近大会” view | Not implemented | No | — | **OMIT OK** (secondary) |
| WF-3.10 | Year nav + cell select + detail/participants | Year buttons + matrix | Yes | guard-01 + E2E | **PASS** |
| WF-3.11 | Schedule acceptance checklist | Matrix not DTO vertical list | Yes | guard-01 + source | **PASS** |
| WF-4 | Tournament detail summary fields | `CompetitionPage` overview tab | Partial | E2E overview tab; **no tournament name** | **PARTIAL** |
| WF-5.2–5.3 | Dense participant table: 6 stats + 3 aptitudes compare | `enrichParticipantLinks` + participants tab | Tab reachable | Columns: 選手/ランク/年齢/公式戦 only; **no ability/aptitude blocks** | **FAIL** |
| WF-6 | State-specific presentation (pre/finished/undecided) | lifecycle labels + hints | Yes | E2E finished champion + undecided hint copy | **PASS** |
| WF-7 | Main nav includes 大会 | UI shell menu | Yes | E2E `[data-menu-item="大会"]` | **PASS** |
| WF-10 | Series history / past winners | `wireframeObservation.tournamentSeriesHistory` | Conditional DOM | Not asserted in ordinary E2E; hidden when length 0 | **PARTIAL** |
| WF-11 | Annual ranking table + year switch + person links | `AnnualRankingTable.tsx`, `/ranking` | Yes | E2E `competition-annual-ranking-table`, `/ranking` | **PASS** |
| WF-11.2 | Ranking metric | S02-008 earnings (`年間獲得金`) not wireframe “Points” | Yes | Table header + ranking page copy | **PASS** (decision-aligned) |
| WF-12.2 | Round-robin standings + pair matrix | `CompetitionPage` matrices | Yes after progression | E2E history + matrices after finish | **PASS** |
| WF-12.3 | Knockout bracket presentation | `competition-knockout-bracket-view.ts` + UI section | Not on default playable path (`selectUi009TournamentFormat` → round_robin for normal counts) | Ordinary E2E never surfaces knockout bracket content | **FAIL** |
| WF-12.6 | Format follows canonical discriminator | `bracketFormatKind` exposed | Round-robin only evidenced in browser | — | **PARTIAL** |
| WF-13.2 | Promotion results adjacent to tournament result | `competition-promotion-results` | After finish | Empty placeholder in ordinary flow; **sourceTournamentId** shown when populated | **PARTIAL** |
| WF-13.3 | **Person detail rank history timeline** | `PersonDetailView.tsx` | **No rank history section** | Only `currentRank` rankbox; aggregate table on competition page only | **FAIL** |
| WF-14.1–14.6 | **Player-facing tournament name everywhere** | Schedule/detail labels | **Absent** | No `tournamentName` field in ui009 schedule projection | **FAIL** (first blocker) |
| WF-9 / §18 | No TournamentId/MatchId in normal hero | `CompetitionMatchPage.tsx` | Match page | **`competition-match-id` shows 試合ID + 大会: tournamentId** | **FAIL** |
| WF-16 | Gap map preflight | See gap matrix | Several HIGH_RISK remain | — | **FIX_REQUIRED** |
| WF-18 | Keyboard / non-color-only state | Matrix `aria-pressed`, buttons | Partial | Source only; not fully exercised | **PARTIAL** |

## Discovered gaps (all)

1. **WF-14-01** — Tournament display name missing (first blocker).
2. **WF-5-01** — Participant comparison lacks wireframe-mandated 6 abilities + 3 aptitudes density.
3. **WF-13-01** — Person detail has no rank history; history only on competition aggregate panel.
4. **WF-12-03** — Knockout bracket not reachable in evidenced ordinary UI flows (round-robin-only playable path).
5. **WF-9-01** — Match detail page exposes internal IDs in primary meta row.
6. **WF-3-02b** — Preset-bootstrap wireframe harness cannot reach playable cells without weekly simulation (guard-02/03 FAIL); ordinary home flow works but second entry path is broken for acceptance harness expectations.
7. **WF-10-01** — Series history / promotion / person-rank sections depend on persisted summaries; not proven populated in ordinary single-tournament E2E (UI hidden when empty).
8. **WF-13-02** — Promotion/rank history tables use raw `sourceTournamentId` instead of player-facing tournament links/names.

## Sprint2 disposition

- **Sprint2 CLOSED:** not assigned by this audit.
- B2 full-flow reacceptance @ `f702986` is **older tip** than audited `fc65e02`; control must reconcile tips before closure.
- Terminal **FIX_REQUIRED** until blockers above are resolved with independent UI evidence per wireframe acceptance.

## Non-conflict guard

- No edits to `CURSOR_B2_INBOX.md` or `CURSOR_B2_ACTIVE_TASK.md`.
- No broad stash/clean; no local spec moves/deletes.

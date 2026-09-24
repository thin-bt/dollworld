# UI-RANKING-MOCK-V01-20260924-R2

status: READY
role: Role2
sprint: Sprint2 UI recovery / product UI
mode: Cursor implementation + browser comparison
blueprint: `_handoff-artifacts/mocks/06_annual_ranking_mock_v01.html`
blueprint_blob: `a171108c325c9155c443db20169eb4bcf540f14a`
authority: GitHub `thin-bt/dollworld` master

## Purpose
Implement the already-established annual-ranking visual direction in the real user-facing `/ranking` UI. This is not a new product-semantics task. Preserve the current ranking contract and use the canonical HTML mock as the visual/layout blueprint.

## Fresh-read findings
Current master `RankingPage.tsx` already loads `CompetitionProgressView`, supports `rankingViewYear`, renders loading/error/retry, and delegates the ready state to shared `AnnualRankingTable`. `AnnualRankingTable.tsx` already provides year options, empty state, person-detail links, annual earnings, current rank, appearances, wins, and official record. Do not replace these semantics or fork a second ranking implementation.

## Required implementation
1. Bring `/ranking` materially in line with the blueprint: clear annual-ranking hero/context, compact year navigation, readable summary/context hierarchy, and a dense comparison table that remains scannable on desktop and usable at narrow width.
2. Reuse `AnnualRankingTable`; improve its presentation/shared wrappers where appropriate instead of duplicating its data mapping in `RankingPage`.
3. Preserve all current states: loading, error/retry, empty, available/unavailable year options, current-year behavior, and person-detail navigation.
4. Preserve canonical labels/meaning. Do not invent ranking fields, alternate scoring, new APIs, or fabricated summary values merely because the static mock contains illustrative values. Summary UI may only display values derivable from the existing loaded view.
5. Keep `/competition` ranking presentation coherent with `/ranking` because `AnnualRankingTable` is shared. If styling changes affect both surfaces, verify both and avoid regressions.
6. Responsive behavior: no unreadable squeezed columns. A deliberate horizontal table viewport is acceptable on narrow screens; year controls and surrounding context must remain usable without layout breakage.
7. Use existing presentation tokens/classes where feasible. Do not create a parallel visual system solely for this page.

## Verification
- Run focused ranking/competition tests covering `RankingPage` and `AnnualRankingTable`.
- Run the web production build on current task state.
- Start the real app and compare `/ranking` against the blueprint in a desktop viewport and a narrow/mobile viewport.
- Also inspect the annual-ranking section on `/competition` after shared-component/style changes.
- Exercise loading/empty/error where existing test/dev seams permit.
- Material blueprint differences or shared-table regressions are FIX_REQUIRED in this same task, not deferred documentation.

## Completion evidence
Result must record changed files, focused test commands/results, production build result, browser routes/viewports checked, comparison findings, and the exact blueprint path/blob above. Do not claim completion from tests alone.
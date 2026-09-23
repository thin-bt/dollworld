# UI-ANNUAL-RANKING-MOCK-V01-20260924-R2

status: READY
owner: Role2
visual-blueprint: `_handoff-artifacts/mocks/06_annual_ranking_mock_v01.html`
blueprint-commit: `1806abae2c532fa4b192bcda2695843694edd1b0`

## Objective
Implement the established 06 annual-ranking hierarchy on current master using the canonical mock above as the visual/layout blueprint. This is implementation work, not another approval-only mock pass.

## Current semantic anchors
- `apps/web/src/client/ranking/RankingPage.tsx`
- `apps/web/src/client/competition/AnnualRankingTable.tsx`
- existing `CompetitionProgressView`, year-option semantics, links, test IDs, loading/error/empty contracts.

## Required implementation
1. Preserve canonical ranking meaning and existing data contracts: annual rank, person, yearly cumulative earnings, current rank, tournament appearances, tournament wins, and official record excluding the current tournament where already defined.
2. Materially improve visual hierarchy to match mock v01: clear page purpose, compact year navigation, scan-friendly ranking table, strong numeric alignment/density, usable person links, and a restrained route back to competition.
3. Do not invent ranking metrics or alter competition/ranking semantics. Mock sample names/numbers are visual placeholders only.
4. Preserve disabled/no-data year behavior and loading/error/empty states; improve their presentation consistently with the page.
5. Responsive/narrow presentation must remain usable. Horizontal table scrolling is acceptable where collapsing columns would obscure ranking meaning.
6. Reuse `AnnualRankingTable` between competition and `/ranking`; do not fork a second ranking table implementation solely to match the mock.

## Verification
- focused ranking/competition UI tests
- web typecheck and production build
- start the real web app and browser-compare `/ranking` against `_handoff-artifacts/mocks/06_annual_ranking_mock_v01.html`
- compare desktop and narrow viewport
- material hierarchy/layout/state-display divergence is FIX_REQUIRED and must be corrected before terminal PASS unless canonical semantics require the difference
- terminal result: `_handoff-artifacts/results/UI-ANNUAL-RANKING-MOCK-V01-20260924-R2/result.md`, including exact product SHA, commands, browser route/viewports and blueprint revision

## Guardrails
Follow `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`. No new product semantics or DTO/schema changes for visual convenience. Preserve current test IDs/contracts unless a focused update is necessary.

## Continuation
Do not stop at mock publication or component styling. Complete implementation -> build -> browser comparison/fix, then continue to the next safe 01-15 UI workstream item.
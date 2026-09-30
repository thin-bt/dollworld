# Role2 GPT-only UI contract — Annual Ranking v02

authority: GitHub thin-bt/dollworld/master
governed-production-screen: /ranking
production-targets:
- apps/web/src/client/ranking/RankingPage.tsx
- apps/web/src/client/competition/AnnualRankingTable.tsx
- apps/web/src/client/presentation.css
reference: _handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/06_annual_ranking_mock_v01.html

## Fresh source reconciliation

The production screen already preserves the essential data/behavior contract: annual ranking rows, person-detail links, year options, disabled no-data years, selected-year aria-pressed state, and the competition-page backlink. The remaining gap is presentation hierarchy and narrow-screen behavior.

The current reference intends a dedicated ranking screen with:
1. a clear page hero,
2. year navigation attached to that hero,
3. a three-item summary strip (display year / athlete count / leader earnings),
4. one dense ranking table,
5. a footer/backlink.

Current production renders the generic panel header followed immediately by AnnualRankingTable. AnnualRankingTable owns the year navigation and table, but has no summary strip. presentation.css makes .competition-ranking itself horizontally scrollable, so on narrow viewports the heading, note and year controls can participate in the same overflow surface as the wide table instead of keeping only the table horizontally scrollable.

## Exact implementation plan

### RankingPage.tsx
- Keep the existing load/error/retry behavior and rankingViewYear state unchanged.
- Keep one network reload per selected ranking year; do not add session or competition requests.
- Promote the ready-state header to the dedicated ranking-page hierarchy represented by the reference.
- Do not duplicate year controls in RankingPage; AnnualRankingTable remains their behavior owner.
- Keep /competition backlink after the ranking content.

### AnnualRankingTable.tsx
- Preserve all existing test IDs and row semantics.
- Derive summary values only from authoritative loaded data:
  - display year = wireframeObservation.selectedRankingYear;
  - athlete count = view.rankingRows.length;
  - leader earnings = rankingRows[0]?.yearlyCumulativeEarningsLabel, only when a row exists.
- Render a summary region before the note/year/table. Do not invent totals or recompute money from formatted labels.
- Wrap only the table in a dedicated .competition-ranking-table-scroll container.
- Keep person links exactly /people/{encoded personId}.
- Keep year button disabled/aria-pressed behavior exactly as today.
- The heading/note/year controls/summary must not horizontally scroll with the table.

### presentation.css
- .competition-ranking: overflow-x visible/hidden as appropriate for the parent; it must not be the wide-table scrollport.
- .competition-ranking-table-scroll: width:100%; max-width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch.
- desktop summary: 3 equal columns; narrow <=700px: 1 column.
- ranking table may use a min-width around the existing seven-column content width; page itself must have no horizontal overflow at 390px.
- selected year must remain distinguishable by aria-pressed and visible styling; disabled years remain visibly disabled.

## Real-browser acceptance to run when browser execution resumes

Desktop 1440x900:
- /ranking loads ready state and shows page heading, summary, year controls, all seven ranking columns and competition backlink.
- summary athlete count equals rendered ranking row count.
- summary leader earnings equals first rendered row earnings.
- clicking a data-bearing adjacent year performs the existing ranking-year reload and updates selected-year aria-pressed plus table/summary consistently.
- clicking a player name reaches the corresponding /people/:id.

Narrow 390x844:
- documentElement.scrollWidth <= documentElement.clientWidth.
- heading, summary, note and year controls remain fully inside the viewport.
- the seven-column table can scroll horizontally inside its own table scroll container.
- page-level horizontal swipe does not move the document.
- competition backlink remains reachable below the table.

Network regression:
- warm year switch must not introduce loadUiSession or unrelated endpoint calls; preserve RankingPage's current loadCompetitionState(rankingYear) behavior.
- no request may be added solely to populate the three summary values.

## Residual / non-goals
- This contract does not alter ranking calculation, ordering, yearly earnings, official-record semantics, or competition progression.
- The reference's sample values (101年, 24人, 1,280,000 G) are illustrative only and MUST NOT be copied into production.
- No revised HTML mock is required for this delta: v01 is sufficient authority; this document resolves implementation ambiguity against current source.

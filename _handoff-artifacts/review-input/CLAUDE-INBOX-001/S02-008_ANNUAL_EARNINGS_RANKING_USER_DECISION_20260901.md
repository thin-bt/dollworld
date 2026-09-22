# S02-008 Annual Earnings Ranking — User Decision Bind


status: USER_DECISION / S02-008 IMPLEMENTATION AUTHORITY INPUT
recorded-at: 2026-09-01+09:00
scope: Sprint 2 annual ranking / ranking history / tournament reward display


## Decision
- Do not introduce or assume a separate user-facing or gameplay `annual points` scoring system unless a later explicit user decision creates one.
- Annual ranking is based on the yearly cumulative amount earned from tournament results: a prize-money-like / earnings-like value attached to tournament performance.
- Each tournament must provide the canonical earned amount needed for ranking aggregation; annual ranking orders participants by the cumulative earned amount for the selected world year.
- UI terminology should present this as earnings / prize-like amount / annual earnings rather than unexplained `annual points`.
- Existing UI decisions remain: year-selectable annual ranking/history and display of position, person, competitive rank, tournament appearances, tournament wins, and official match wins/losses where supported by canonical data.
- The prior generic `annual points` wording in draft/UI-gap material is superseded for product/game semantics by this decision. Existing internal field names may only remain temporarily as implementation compatibility if they are explicitly bound to the earnings amount and do not create a second scoring system.


## Narrow unresolved boundary
- Exact numeric tournament payout tables / placement-by-placement amounts are not invented by this bind. Reuse an already-accepted payout/reward table if one exists; otherwise isolate only that numeric schedule as the remaining smallest authority gap.
- Lack of a separate point-allocation formula is NOT a valid blocker after this bind.


## S02-008 implementation consequence
S02-008 should implement/readiness-check:
1. canonical yearly cumulative tournament earnings;
2. deterministic annual ranking ordered by that cumulative earnings value;
3. year-selectable historical ranking projection;
4. browser-safe display fields required by SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md;
5. no browser-side reconstruction of ranking logic.


## References
- TOURNAMENT_UI_WIREFRAME_DRAFT.md
- SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md
- current accepted Sprint 2 authority


This document records the user's current explicit product decision and is intended to resolve the ambiguity between the older generic `annual points` wording and the earnings-based annual ranking direction.


## Payout configuration decision
- Tournament payout amounts may use provisional values for the initial implementation.
- Payout values MUST be externalized/configurable so they can be changed later without changing ranking logic or rewriting historical semantics.
- The ranking algorithm consumes the canonical awarded amount produced from the configured payout table; it must not hardcode tournament-specific money constants inside ranking calculation code.
- Prefer a data/config table keyed by canonical tournament category/rank/placement identity already available from accepted authority. Exact key/type names remain implementation-owned.
- Initial provisional amounts should be internally coherent and monotonic by tournament importance/placement, but are not balance authority and may be tuned later.
- This decision removes `missing exact payout amount` as a user-decision blocker for S02-008 production readiness. Implementation may proceed with provisional configurable values.




## Equal-earnings tie handling
- Persons with exactly equal yearly cumulative earnings share the same annual rank/position. No extra gameplay scoring criterion is introduced only to break a monetary tie.
- For deterministic storage/display ordering inside the tied group, use a stable canonical person identity ascending (or equivalent stable canonical identity ordering already used by the implementation).
- This stable display ordering MUST NOT change the shared rank number and is an implementation determinism rule, not a second ranking criterion.
- This resolves `MISSING_ACCEPTED_EQUAL_EARNINGS_TIEBREAK_AUTHORITY` without new user-facing semantics.
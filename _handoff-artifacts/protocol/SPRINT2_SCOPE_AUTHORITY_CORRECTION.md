# SPRINT2_SCOPE_AUTHORITY_CORRECTION

status: ACTIVE
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-19T17:25:00+09:00

## User clarification

Sprint2 UI completion is judged against the **Sprint2 UI wireframe set**, not the whole long-term `docs/SPEC.md` observation-screen list.

Authoritative product-direction inputs for this completion check:
- Google Drive `TOURNAMENT_UI_WIREFRAME_DRAFT.md` (file id `1gHpjYuYWwug85_Sr4VXMSFTvqBPqBVvd`)
- Google Drive `SPRINT2_UI_DATA_CONTRACT_GAP_MAP.md` (file id `1wmgHM6B96SN7PihbaDhy3XhI7efaCYwG`)
- Google Drive `S02-008_ANNUAL_EARNINGS_RANKING_USER_DECISION_20260901` (file id `1G9G0MTUpuyeIhBDlKEQ7bkxgfYilj_gMMjmxASQYdf4`)
- accepted Sprint2 domain/runtime contracts

Drive remains a specification/reference source here; GitHub `_handoff-artifacts/` remains the canonical control plane for deciding work/lane/task/result state.

## Sprint2 wireframe surfaces

The wireframe/gap-map requires at least:
1. annual tournament schedule
2. tournament detail
3. participant list
4. round-robin standings / pair-result matrix
5. knockout bracket / match results
6. tournament result
7. tournament series history / historical winners
8. annual ranking
9. promotion result
10. person rank history
11. person-detail and battle-detail navigation

## Completion guard

Before Sprint2 UI-ready completion, each of these must have a direct canonical source, accepted read projection, or explicit user-approved deferral:
- annual schedule
- tournament detail
- participant list
- round-robin standings
- round-robin match results
- knockout bracket
- tournament winner / placements
- historical tournament editions
- historical winners
- annual ranking history
- promotion result
- person rank history
- match detail navigation
- person detail navigation

## Ranking decision

The older wireframe label `Points` is superseded by the explicit user decision:
- annual ranking orders by yearly cumulative tournament earnings
- year-selectable current/history view
- display, where canonical data supports it: position, person, competitive rank, tournament appearances, tournament wins, official match wins/losses
- equal earnings share the same annual rank; stable PersonId ordering is display determinism only
- no browser-side ranking reconstruction

## Important correction

Do **not** add unrelated long-term SPEC screens (family tree, teacher lineage, generic search/follow, etc.) merely because they appear in `docs/SPEC.md`; they are not part of this Sprint2 wireframe completion gate unless another accepted Sprint2 authority explicitly includes them.

Prior reduced acceptance that treated knockout UI or history->battle detail as FUTURE_RESERVE is superseded by this wireframe completion guard.


## Visual completion correction (2026-09-20)

The prior formal-close path verified functional/wireframe presence and navigation but did not establish visual-quality completion.

Sprint2 must NOT be treated as fully UI-complete until visual acceptance is also READY. Visual acceptance must cover, at minimum:
- layout integrity and overflow at the actual supported application widths, including the narrow-width constraints used by the product UI
- spacing, typography, hierarchy, alignment, table/matrix readability, and button/control clarity
- no unintended internal scrolling or clipped content where the wireframe/product direction expects full visibility
- coherent treatment of active/inactive/extinct/status states and controls
- visual consistency across annual schedule, tournament detail, participant comparison, round-robin, knockout bracket, result/history, ranking, promotion result, person rank history, person detail, and battle detail
- screenshot evidence from the canonical product build for representative states
- explicit visual-review terminal READY or FIX_REQUIRED; functional Playwright presence/navigation PASS alone is insufficient

The historical terminal `SPRINT2_FORMAL_CLOSE_READY` from `SPRINT2-FORMAL-CLOSE-A-20260920-R1` remains an audit record of the earlier gate, but is superseded for current completion status by this visual-completion correction. Sprint2 is REOPENED until visual acceptance reaches READY.

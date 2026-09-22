# SPRINT2-WF5-PARTICIPANT-COMPARISON-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint2
mode: IMPLEMENT_AND_VERIFY
authority: thin-bt/dollworld master
predecessor-audit: SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1
resolved-predecessor: SPRINT2-WF14-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1 @ 134d27e

## Goal
Resolve the next unique Sprint2 wireframe blocker after WF-14: **WF-5-01** participant comparison must expose the wireframe-required dense 6 abilities + 3 aptitudes on the ordinary tournament participant UI, using accepted browser-safe person presentation/canonical data rather than browser-side domain recomputation.

## Required work
1. Fresh-read canonical protocol/status, the wireframe audit result, current master, and existing person presentation projections before editing.
2. Preserve the accepted dense/table-first participant layout: one participant per row where practical; do not replace it with large cards.
3. Project and render the six BaseStat values (`stamina`, `strength`, `skill`, `speed`, `spirit`, `magic`) and three aptitudes (`unarmed`, `sword`, `magic`) for tournament participants using an existing accepted person presentation projection if available. Do not invent a competing stat contract or calculate new strength/win-rate values in the browser.
4. Keep person-detail navigation and existing rank/age/official-record fields intact.
5. Add focused source/unit/UI tests proving all 6+3 values are present and mapped to the correct participant; add ordinary browser evidence if feasible on the current product path.
6. Run affected typecheck/build and focused tests. If product bytes are published to master, record exact publication SHA and read back canonical master. Do not self-assign Sprint2 CLOSED.
7. Do not touch B2 control state. No broad stash/clean. All transient scratch under `_handoff-artifacts/control-tmp/`.

## Terminal result
Publish `_handoff-artifacts/results/SPRINT2-WF5-PARTICIPANT-COMPARISON-A-20260922-R1/result.md` with PASS or FIX_REQUIRED, exact changed paths, tests/build evidence, publication SHA if any, and remaining blocker if not fully resolved.

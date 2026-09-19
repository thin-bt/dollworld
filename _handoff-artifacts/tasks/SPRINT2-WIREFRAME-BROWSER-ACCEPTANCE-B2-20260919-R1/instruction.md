# SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1

state: PREPARED
sprint: Sprint2
lane: B2
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T17:36:00+09:00
authority-correction: _handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md
supersedes-as-completion-gate: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
non-overlap: ACCEPTANCE_TESTS_ONLY_NO_PRODUCT_EDITS

## Objective

Own browser acceptance for the actual Sprint2 UI wireframe while A implements product gaps. The old reduced 7/7 set is regression evidence only and is no longer the Sprint2 completion gate.

## Required browser coverage

Create/maintain a dedicated wireframe acceptance spec that verifies the real browser can reach and use:

1. annual schedule
   - year overview
   - current world time
   - previous/current/next-year switching
   - rank/category/week readability
2. tournament detail
3. dense participant comparison
4. round-robin standings + pair-result matrix
5. knockout bracket + match results
6. tournament winner / placements
7. tournament-series history / historical winners
8. annual ranking
   - earnings-based
   - year switch/history
   - position/person/current rank/appearances/wins/W-L when projected
   - person navigation
9. promotion result
10. person rank history
11. tournament match -> real battle detail
12. person detail navigation

## Execution rules

- Fresh-sync published master before each verdict.
- Do not edit production files.
- A may be actively implementing; if a required surface is not yet on published master, record the exact failing assertion as FIX_REQUIRED rather than weakening/skipping it.
- Preserve the existing reduced 7/7 tests as regression coverage but do not treat them as sufficient.
- Do not mark READY until all wireframe guard rows pass on one clean published master HEAD.
- Publish canonical terminal result.

## Output

Publish `_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260919-R1/result.md`.

READY requires one clean published master HEAD with all wireframe acceptance assertions passing.

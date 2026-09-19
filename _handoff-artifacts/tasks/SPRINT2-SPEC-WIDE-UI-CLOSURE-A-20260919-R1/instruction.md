# SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T17:03:30+09:00
authority-correction: _handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md

## Objective

Close the gap between the user's actual Sprint2 UI specification and the currently reduced UI009/F-slot implementation. Do not treat the prior 7/7 reduced browser set as full Sprint2 completion.

## Required authority

Fresh-read:
- `docs/SPEC.md` §6 観察画面の構成
- `docs/SPEC.md` 第2段階：観察用Web画面
- `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md`
- current master implementation and browser tests

Prior source-evidence/accepted-scope artifacts are historical test evidence only and may not narrow the user's specification.

## Required work

1. Build an exact spec-to-route/component/API/test ledger for every required UI surface.
2. Implement missing Sprint2 UI/data paths in non-conflicting slices, starting with highest-value missing surfaces:
   - independent ranking UI with rank-group lists, overall champion, restricted champions where domain data exists, win rate, streak and generational comparison views;
   - tournament/bracket UI for accepted tournament formats, not round-robin only;
   - competition history -> match detail / battle-log navigation;
   - remaining missing §6 / Stage2 screens and navigation.
3. Reuse existing server/domain projections where available; add missing projections/tests where necessary.
4. Do not fake unsupported data. If a required field truly lacks domain data, implement the smallest correct domain/projection support needed for the specified UI and record it.
5. Keep existing simulation/week progression and current round-robin acceptance green.
6. Add browser acceptance for each new user-visible surface.
7. Do not declare READY while any user-defined Sprint2 UI item remains MISSING/PARTIAL without explicit user-approved deferral.
8. No Sprint3/4 work.

## Output

Publish `_handoff-artifacts/results/SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1/result.md` with:
- full requirements ledger,
- exact implemented files,
- tests and browser evidence,
- remaining gaps if any.

Terminal:
- READY only if the full corrected Sprint2 UI scope is implemented and accepted.
- FIX_REQUIRED otherwise, with the next executable implementation slice.

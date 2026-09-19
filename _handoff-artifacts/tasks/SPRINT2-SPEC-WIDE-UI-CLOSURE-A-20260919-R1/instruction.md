# SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1

state: PREPARED
sprint: Sprint2
lane: A
priority: IMMEDIATE
control-authority: GitHub
updatedAt: 2026-09-19T17:20:36+09:00
authority-correction: _handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md
continuation-from-terminal: SPEC_WIDE_UI_SLICE1_KNOCKOUT_RANKING_MATCH_NAV

## Objective

Continue the same Sprint2 spec-wide UI closure after slice 1. Do not treat the prior reduced browser set or slice 1 as full Sprint2 completion.

## Required authority

Fresh-read:
- `docs/SPEC.md` §6 観察画面の構成
- `docs/SPEC.md` 第2段階：観察用Web画面
- `_handoff-artifacts/protocol/SPRINT2_SCOPE_AUTHORITY_CORRECTION.md` when present in canonical GitHub
- current master implementation and browser tests
- latest canonical result for this task

Prior source-evidence/accepted-scope artifacts are historical test evidence only and may not narrow the user's specification.

## Slice 2 — execute now

Implement the next non-conflicting Sprint2 product slice identified by the latest terminal:

1. Tournament match **full detailed battle-log UI** using the real materialized battle log; do not substitute the mock-battle-only path.
2. **World-level ranking GET/projection** that remains usable when no active competition session exists; keep the independent `/ranking` UI backed by world Sprint2 facts.
3. Implement browser-safe **家系図 / 師弟系譜 / 検索・フォロー** routes/projections/navigation required by SPEC §6 / Stage2. Reuse canonical lineage/mentor facts; do not fabricate unsupported facts.
4. Add focused unit/integration tests and Chrome Playwright acceptance for each user-visible surface added in this slice, including tournament match-detail/log navigation.
5. Keep existing simulation/week progression, competition, ranking, and round-robin acceptance green.
6. Do not edit B2 control or its acceptance-only files while B2 is PREPARED/ACTIVE.
7. No Sprint3/4 work.

## Still required after slice 2

Continue this same task immediately if gaps remain. In particular, tournament series history / 歴代王者 and streak / generational comparison remain Sprint2 obligations; implement the smallest correct domain/projection support when facts exist, and never fake unsupported data.

## Output

Update `_handoff-artifacts/results/SPRINT2-SPEC-WIDE-UI-CLOSURE-A-20260919-R1/result.md` with:
- refreshed full requirements ledger,
- exact implemented files,
- tests and browser evidence,
- remaining gaps if any.

Terminal:
- READY only if the full corrected Sprint2 UI scope is implemented and accepted.
- FIX_REQUIRED otherwise, with the next executable implementation slice explicitly identified.

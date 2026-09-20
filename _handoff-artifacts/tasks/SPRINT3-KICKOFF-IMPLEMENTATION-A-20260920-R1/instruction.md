# SPRINT3-KICKOFF-IMPLEMENTATION-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: IMMEDIATE
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor-a: SPRINT2-VISUAL-FIX-PUBLICATION-A-20260920-R1
predecessor-b2: SPRINT2-VISUAL-BROWSER-REACCEPTANCE-B2-20260920-R1
required-product-baseline: 8d52ead09e7a5a6736777ab281db21ae79f28d48
result-path: _handoff-artifacts/results/SPRINT3-KICKOFF-IMPLEMENTATION-A-20260920-R1/result.md

## Authority and transition

Sprint2 visual completion is READY: A publication READY and independent B2 reacceptance READY on canonical published product 8d52ead09e7a5a6736777ab281db21ae79f28d48. Per current user direction, do not idle after Sprint2 READY; begin Sprint3 implementation immediately.

## Work

1. Fresh-read canonical GitHub master before changes, including docs/SPEC.md, CHANGELOG.md and any repository-resident accepted planning/decision material that defines Sprint3.
2. Identify the earliest uniquely determined, accepted, unimplemented Sprint3 implementation slice. Do not invent scope and do not reopen Sprint2 unless a concrete regression blocks Sprint3.
3. Claim ACTIVE before product changes.
4. Implement that Sprint3 slice in production code with focused tests. Prefer the smallest end-to-end vertical slice that establishes real Sprint3 product progress rather than planning-only output.
5. Run the relevant build/unit/integration checks. If the slice has browser-visible behavior, add/run focused browser acceptance as appropriate.
6. Publish implementation to canonical GitHub master and publish a terminal result at the result path above containing exact published SHA, changed files, commands/results, and the next concrete Sprint3 gap.
7. If canonical accepted material does not uniquely determine any Sprint3 implementation slice, terminal must be FIX_REQUIRED with the exact conflicting/missing authorities; do not substitute speculative code.

## Non-overlap / constraints

- Sprint3 implementation only.
- Do not perform Sprint4 work.
- Do not undo the accepted Sprint2 visual fixes.
- Do not edit Cursor B2 control files.
- Drive/local are compatibility/spec mirrors only; absence/search failure is non-terminal when GitHub canonical contains sufficient authority.
- No status-only terminal: READY requires a published production implementation slice.
# SPRINT3-S03-015-CANONICAL-PUBLISH-RECOVERY-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: IMPLEMENTATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Why this recovery exists

The terminal result for `SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1` proved a real canonical product gap: generated-technique overlay registration exists, but production battle/action resolution remains base-catalog-only. The prior run also records that a bounded integration and focused tests existed locally before workspace sync loss, but no product commit reached canonical master.

This is a new recovery attempt whose success criterion is canonical publication, not another audit.

## Required work

1. Fresh-read GitHub protocol, this instruction, current master, A lane state, prior S03-015 instruction/result, Sprint3 backlog/spec and relevant source before edits.
2. Claim this exact task ACTIVE in B2 control before product changes.
3. Reconstruct the minimum deterministic S03-015 integration from canonical master. Use the prior result as design evidence, not as proof of implementation.
4. Required production behavior: a generated TechniqueId registered in the S03-010 overlay must resolve through real battle/action execution while base `TechniqueCatalogIdentity` remains immutable and existing behavior is unchanged when no overlay is bound.
5. Trace and cover the production path identified by the prior result: create-battle preflight, turn resolution/action replacement, detailed-log replay, commit preflight, and tournament handoff. Thread only the minimum optional overlay/runtime state required; do not redesign battle semantics.
6. Add/restore focused regressions proving: base technique unchanged; generated technique resolves in production battle/action path; unknown id behavior unchanged; base catalog identity/hash unchanged; deterministic replay preserved.
7. Run focused tests and package typecheck/build. Run root `npm run check` when feasible after the bounded change.
8. Publish source/tests to canonical `master` and verify GitHub readback of at least one changed production source and the regression test. READY is forbidden without canonical product commit/readback.
9. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-015-CANONICAL-PUBLISH-RECOVERY-B2-20260921-R1/result.md` with exact call chain, commands/results, product commit SHA and readback evidence; then return B2 to IDLE.

## Non-conflict guard

- Cursor A currently owns S03-016 live master qualification derivation/persistence. Do not edit that qualification/enrollment domain or A handoff artifacts.
- This recovery owns only generated-technique production battle consumption/lookup integration and its focused tests/evidence.
- Do not broaden into Sprint4 or unrelated cleanup.

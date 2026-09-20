# SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Product gap

S03-010 publishes `GeneratedTechniqueCatalogOverlay` plus `lookupTechniqueDefinitionWithOverlay`, and S03-011 persists first-use MatchId after battle commit. Canonical source currently proves overlay registration/lookup in the Sprint3 helper surface, but final B2 acceptance did not prove that generated TechniqueIds are consumable by the production battle/action-resolution lookup path. A generated technique that is registered but cannot be resolved when a battle action references its TechniqueId is not a closed product loop.

## Required work

1. Fresh-read protocol, A/B2 state, Sprint3 backlog/spec, current master and newest relevant results first.
2. Claim this exact task ACTIVE before product changes.
3. Trace production battle/action technique-definition resolution from requested/selected TechniqueId to `TechniqueDefinition`. Identify every runtime lookup that currently reads only immutable `TechniqueCatalog.definitions` / base catalog.
4. Prove whether `GeneratedTechniqueCatalogOverlay` is already supplied and consumed by that production path. Do not accept helper-only unit coverage as evidence.
5. If missing and bounded, implement the minimum deterministic integration so a generated TechniqueId registered by S03-010 can be resolved during real battle execution without mutating/changing base `TechniqueCatalogIdentity`. Preserve all existing base-catalog behavior when no overlay is bound.
6. Add focused regression tests covering at least: base technique unchanged; generated technique resolves in production battle/action path; unknown id still rejects/fails identically; base identity/hash unchanged; deterministic replay behavior is preserved.
7. Do not touch Cursor A root-format/lint recovery authority except unavoidable shared product files. Do not broaden into Sprint4.
8. Run focused tests/typecheck for changed package. If implementation is required, publish product source/tests to canonical master in this run where feasible.
9. Publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1/result.md`, including exact source call chain, commands/results, product commit SHA, and canonical readback evidence. READY requires canonical master product readback, not local-only work. If already correctly wired, READY requires concrete source-path/call-chain evidence proving it.
10. Return B2 to IDLE after terminal result publication.

## Non-conflict guard

- Cursor A owns `SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1`; do not take over root formatting/lint remediation.
- This task owns only generated-technique production consumption / battle lookup integration and its focused tests/evidence.

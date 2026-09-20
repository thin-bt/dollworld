# SPRINT3-S03-010-GENERATED-TECHNIQUE-REGISTRATION-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
priority: DEADLINE_CRITICAL

## Authority
- `docs/SPEC.md` original-technique / derivative-technique design
- `docs/SPEC_PREPARATION_PLAN.md` Sprint 3前 includes 技継承・独自技・失伝 and requires input/output/state update/process order
- `docs/specs/09-technique-system.md` TechniqueDefinition / TechniqueCatalog identity and canonical ordering contract
- `docs/SPRINT_3_BACKLOG.md` S03-008 remaining runtime scope
- `_handoff-artifacts/audit/SPRINT3-SCOPE-CLOSURE-CONTRADICTION-ROLE3-20260920-R1.md`
- B2 owns S03-009 weekly/runtime research wiring. Do not edit or duplicate S03-009-owned state/processor work.

## Fresh source-gap finding
Current master has S03-008 generation success/founding-history evaluation, but success only carries `newTechniqueId`, source ids, tier, initial mastery and history. `docs/specs/09-technique-system.md` defines the complete `TechniqueDefinition` and immutable run `TechniqueCatalogIdentity`, while the Sprint3 backlog explicitly leaves generated-technique stat synthesis / school registration unimplemented. Therefore a successful original-technique outcome still cannot become a usable registered technique.

## Scope — S03-010 bounded implementation
1. Fresh-read the exact original-technique synthesis rules in `docs/SPEC.md` before coding. Do not invent numeric synthesis formulas that are not specified.
2. Implement a deterministic generated-technique materialization boundary that converts a successful S03-008 founding outcome plus its source TechniqueDefinition(s) and explicit/config-held synthesis inputs into a valid `TechniqueDefinition` compatible with 09 contracts.
3. Preserve `originPersonId`, canonical sorted `sourceTechniqueIds`, category/range/prerequisite invariants, schema/data version rules, and deterministic TechniqueId handling. Generated content must validate through the existing TechniqueDefinition validation surface rather than bypass it.
4. Implement runtime/catalog registration as a dynamic/generated-technique overlay or other existing compatible runtime surface. Do NOT mutate the immutable initial run catalog/hash in place if that would violate 09/RunRuleSnapshot identity. If the repository already has a dynamic catalog/history surface, reuse it.
5. Connect S03-009 success output to this registration boundary only through a narrow adapter so B2-owned weekly research logic remains non-conflicting. If S03-009 is not yet on master, implement/test the adapter against the S03-008 success contract and leave the final call-site merge isolated.
6. Add focused tests for deterministic materialization, source ordering, invalid source/reference rejection, duplicate TechniqueId rejection, successful registration visibility, and unchanged initial catalog identity/hash.
7. If `docs/SPEC.md` does not define enough numeric synthesis semantics to construct stats without invention, do not fabricate them: implement all non-numeric registration/validation infrastructure that is independently valid, publish the exact missing fields/formulas as BLOCKED evidence, and leave the lane terminal rather than silently guessing.
8. Do not implement first-use MatchId persistence; that is S03-011.

## Completion
- publish product changes to `master` where specification permits
- run focused Sprint3/technique tests and simulation-core build/typecheck relevant to touched boundaries
- publish `_handoff-artifacts/results/SPRINT3-S03-010-GENERATED-TECHNIQUE-REGISTRATION-A-20260921-R1/result.md` with commit/evidence and READY/BLOCKED
- return A to IDLE only after terminal result

# ROLE3-S03-RETIREMENT-BOUNDARY-SOURCE-RESOLUTION-20260924-R23

result-class: PRODUCT_GAP_RESOLUTION_EVIDENCE
sprint: Sprint3
role: Role3
control-authority: GitHub
status: TERMINAL

## Resolution

R22's retirement-boundary ambiguity can be narrowed from a two-way unknown: master already contains a concrete retirement hook in `packages/simulation-core/src/age-status.ts`.

Exact source evidence:
- `deriveAgeEligibility()` exposes `canVoluntarilyRetire` for active competitors age 18..41 and `mustRetire` at age >=42.
- `applyAgeBasedCareerUpdates()` force-retires an `active_competitor` at age >=42 and emits both `career_status_changed` and `person_force_retired` transitions.
- `toRetired()` preserves identity, family/lineage references, abilities, aptitudes, Sprint1 state, highest rank, master qualification, and records retirement rank while changing careerStatus to `retired`.

Therefore the Sprint3 roadmap wording does not require importing Sprint4 marriage/birth/generation lifecycle merely to have a retirement boundary. The source already has the boundary needed to observe an active competitor becoming retired.

## Remaining closure question

This evidence does NOT prove the complete roadmap sentence "knowledge/techniques pass to the next generation" across retirement. Formal Sprint3 closure still needs the existing mentorship/teaching/technique-persistence evidence to be mapped across or independently of this retirement transition. Treat the retirement hook itself as `EXISTING_RETIREMENT_HOOK_ACCOUNTED`; do not create a new retirement implementation task from R22.

## Canonical consequence

- Supersede the unresolved retirement-hook branch of `ROLE3-S03-RETIREMENT-DEPENDENCY-BOUNDARY-GAP-20260924-R22` with `EXISTING_RETIREMENT_HOOK_ACCOUNTED`.
- Keep Sprint3 `REOPENED_FIX_REQUIRED` and all existing S03-006/S03-010 browser residuals unchanged.
- Do not pull marriage, birth, inheritance, or family-generation lifecycle from Sprint4 into Sprint3.
- Any follow-up should target technique/mentorship persistence evidence, not retirement mechanics.

## Dispatch decision

No A/B2 overwrite: both canonical lane inboxes were already PREPARED for distinct work when read this run.

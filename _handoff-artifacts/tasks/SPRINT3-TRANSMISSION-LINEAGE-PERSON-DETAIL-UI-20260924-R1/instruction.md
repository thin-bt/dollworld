# SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1

state: READY
role-origin: Role3
sprint: Sprint3
mode: PRODUCT_UI_IMPLEMENTATION
control-authority: GitHub `thin-bt/dollworld` / `master`
priority: DEADLINE_RECOVERY

## Product gap

Sprint3 roadmap requires `流派・系譜` and the product outcome that knowledge/techniques visibly transmit to later people. Canonical Role3 mapping `SPRINT3-RYUHA-PROVENANCE-SOURCE-MAPPING-ROLE3-20260924-R1` proved source semantics already retain the required non-family provenance, but ordinary Person Detail does not expose the transmission chain.

Current source evidence:
- `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` persists `completedExplicitWeeklyTeachOutcomes`; each entry binds `absoluteWeek`, `masterPersonId`, and disciple outcomes containing `disciplePersonId`, `techniqueId`, and `decision`.
- `apps/web/src/client/person-detail/ui005-views.ts` PersonDetailView has formal master/disciple IDs and techniques, but no teaching-event or generated-technique provenance fields.
- `apps/web/src/client/person-detail/PersonDetailView.tsx` therefore renders relationship edges and technique possession separately, not `master -> technique -> disciple` provenance.

## Required implementation

Implement the smallest ordinary Person Detail read-only transmission-lineage surface using existing Sprint3 persisted data. Do not invent new gameplay semantics.

1. Extend the server Person Detail view/read-model contract and exact-key client mirror with a deterministic transmission-lineage projection for the viewed person.
2. Include accepted explicit teaching events relevant to the viewed person. Minimum display semantics: week, master person ID, disciple person ID, technique ID. Refused/skipped outcomes must not be presented as successful inheritance.
3. Include generated/original-technique provenance relevant to the viewed person's possessed/founded techniques when the existing founding-history data is available: founder person ID, generated technique ID, source technique IDs, and founding week/history identity already persisted by Sprint3. Do not create a school-name taxonomy.
4. Render a normal-view `技の伝承・系譜` section in `PersonDetailView.tsx`, not Developer Details. Reuse existing related-person navigation/name presentation. Preserve current `師弟関係` and technique sections.
5. Empty state must be explicit and stable; do not hide the entire section merely because a person has no transmission records.
6. Projection ordering must be deterministic (week then stable IDs or existing canonical comparator).

## Scope boundaries

- No marriage, birth, biological ancestry, inheritance, or other Sprint4 family-lineage schema.
- No new `流派名`/school taxonomy.
- No widening of teaching acceptance, OTL generation, battle consumption, or loss behavior.
- Do not alter current Sprint3 live gate/status merely because implementation lands; exact-lineage gate and browser acceptance are separate release evidence.

## Required tests

Add focused tests proving at least:
- accepted teaching event projects to viewed disciple and is visible in ordinary Person Detail;
- refused/skipped teaching does not masquerade as inherited technique;
- generated-technique founder/source provenance projects when present;
- deterministic ordering;
- empty-state rendering;
- client/server exact-key contract remains synchronized.

Run the smallest relevant package/web tests plus production web build. A later exact-lineage pristine root gate remains required before replacing the current live release-gate binding.

## Browser acceptance requirement

After implementation, ordinary production web flow must prove without Developer Details that a seeded/current-world person with relevant data shows the transmission lineage and that related-person links navigate correctly. Do not substitute unit tests or source inspection for this browser evidence.

## Completion output

Publish a terminal result under `_handoff-artifacts/results/SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1/result.md` containing product commit SHA, changed paths, test/build results, exact browser evidence status, and any residual. If browser evidence cannot be completed in the implementation lane, result must say `FIX_REQUIRED` or `IMPLEMENTED_BROWSER_RESIDUAL`, not full PASS.

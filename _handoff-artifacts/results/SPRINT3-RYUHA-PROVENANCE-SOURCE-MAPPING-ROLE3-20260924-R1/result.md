# SPRINT3-RYUHA-PROVENANCE-SOURCE-MAPPING-ROLE3-20260924-R1

state: TERMINAL
result: UI_GAP
role: Role3
sprint: Sprint3
date: 2026-09-24
control-authority: GitHub `thin-bt/dollworld` / `master`

## Decision

Sprint3 source semantics already preserve enough non-family transmission provenance to account for the roadmap concept `流派・系譜` as a mentorship/technique-transmission lineage, but the ordinary user-facing UI does not expose that lineage. This is therefore **UI_GAP**, not `SOURCE_CONTRACT_GAP` and not a reason to import Sprint4 marriage/parentage/family-lineage schema.

## Spec/backlog boundary

- `_handoff-artifacts/PROJECT_ROADMAP.md` Sprint3 explicitly names `師匠・弟子`, `指導`, `技の教示・継承`, `独自技`, and `流派・系譜`; its outcome is knowledge/technique transmission to later people.
- `docs/SPRINT_3_BACKLOG.md` fixes the main implementation sequence at S03-001..011 and explicitly excludes Sprint4 retirement/inheritance/family-lineage schema expansion.
- Therefore `流派・系譜` must be accounted for using Sprint3 mentorship + technique provenance, not biological ancestry.

## Source mapping

### 1. 師匠・弟子 relationship persistence

`packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`

- `Sprint3MentorshipAssignmentEntry` persists `childPersonId`, `selectedMasterPersonId`, `mentorshipRelationKind`, `enrollmentOutcomeKind`, and `assignedAbsoluteWeek`.
- `mentorshipByChildPersonId` is part of the persisted runtime state key set.
- This is sufficient to reconstruct master -> disciple edges without family ancestry.

Ordinary UI: `apps/web/src/client/person-detail/PersonDetailView.tsx` renders `formalMasterPersonIds` and reverse `formalDisciplePersonIds` as navigable Person Detail links.

### 2. 技の教示・継承 provenance

`packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`

- `Sprint3CompletedExplicitWeeklyTeachOutcomeEntry` persists `absoluteWeek`, `masterPersonId`, and an `ExplicitWeeklyTeachActionOutcome`.
- Each disciple outcome contains `disciplePersonId`, `techniqueId`, decision, score/reasons; accepted outcomes therefore retain the master -> disciple -> technique teaching event.

`packages/simulation-core/src/sprint3/apply-explicit-weekly-teach-outcomes-to-world-state.ts`

- `applyExplicitWeeklyTeachOutcomesToWorldState` consumes accepted persisted teach outcomes and advances/acquires the disciple `PersonTechniqueState`.
- The acquired technique state itself does not duplicate teacher identity; provenance remains available in the persisted completed-teach ledger. This is acceptable source semantics because the canonical runtime state retains the teaching event.

### 3. 独自技 lineage

`packages/simulation-core/src/sprint3/types.ts`

- `OriginalTechniqueGenerationRecord` carries `founderPersonId`, `sourceTechniqueIds`, `developmentReason`, `worldWeekIndex`, `proposedNewTechniqueId`, and optional first-use match identity.
- `OriginalTechniqueFoundingHistoryRecord` records the founder/new technique/source techniques/research tier and founding history.
- Sprint3 feature flags/config bind OTL lifecycle and generated-technique materialization.

`packages/simulation-core/src/sprint3/adapt-original-technique-generation-registration.ts` and the accepted S03-009/S03-010/S03-011 chain cover generated-technique registration/materialization and founding-history handoff. `docs/SPRINT_3_BACKLOG.md` also records accepted production slices for generated-technique battle consumption and OTL loss.

### 4. `流派・系譜` accounting

The combination of:

1. persisted master -> disciple assignment,
2. persisted master -> disciple -> technique accepted teaching events,
3. founder -> generated technique -> source-technique founding history,
4. generated-technique battle consumption/loss,

forms a reconstructable **technique-transmission lineage**. No biological/family lineage extension is required for Sprint3.

## Ordinary UI gap

`apps/web/src/client/person-detail/PersonDetailView.tsx` currently exposes:

- formal master links,
- formal disciple links,
- the person's current technique list.

It does **not** expose which master taught which technique, the accepted teaching-event history, or generated-technique founder/source-technique lineage. A user can see relationship edges and technique possession separately, but cannot observe the transmission chain that makes `流派・系譜` meaningful as a product feature.

## Smallest executable follow-up

Add a read-only Sprint3 transmission-lineage section to ordinary Person Detail using existing persisted data only. It should, at minimum:

1. list accepted taught-technique events for the viewed disciple as `master -> technique -> disciple` with week when available;
2. for generated techniques possessed/founded by the person, show founder and source-technique provenance already present in founding history;
3. link related person IDs through the existing Person Detail navigation;
4. preserve current master/disciple and technique sections rather than replacing them;
5. add focused view-model/API/client tests and ordinary browser acceptance proving the lineage is visible without Developer Details;
6. introduce no school-name taxonomy, marriage, parentage, inheritance, or Sprint4 family-lineage schema.

This follow-up is UI/read-model work over accepted source semantics; it must not widen S03-001..011 gameplay behavior.

## Lane disposition

Cursor A remains PREPARED for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1` and Cursor B2 remains PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; neither inbox was overwritten.

## Release disposition

- Sprint3 remains `REOPENED_FIX_REQUIRED`.
- Live release-gate binding remains product `37d6ed4` (`1986/1986`, `139/139`, web production build PASS) because this mapping changes no product bytes.
- Closure accounting for roadmap `流派・系譜` is **not complete at product/UI level** until ordinary UI transmission-lineage visibility is implemented and browser-accepted, or PM/control explicitly narrows the roadmap wording.

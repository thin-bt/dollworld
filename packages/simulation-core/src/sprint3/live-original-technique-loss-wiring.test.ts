import { describe, expect, it } from "vitest";
import { asPersonId, asTechniqueId } from "../ids.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import type { PersonId } from "../ids.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { WorldEngineState } from "../world-engine/types.js";
import {
  applyFirstUseMatchIdToOriginalTechniqueFoundingHistories,
  collectSuccessfulBattleTechniqueUseIds,
} from "./persist-original-technique-first-use-match-id.js";
import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  validateOriginalTechniqueLifecycleRuntimeState,
} from "./original-technique-lifecycle-runtime-state.js";
import { processOriginalTechniqueLossWeek } from "./process-original-technique-loss-week.js";
import {
  buildOriginalTechniqueLossEvaluationRecord,
  countLivingPractitionersForTechnique,
} from "./derive-live-original-technique-loss-evaluation.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance090ConfigInput,
  createSprint3Balance100ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import type { BattleDevelopmentEffects } from "../sprint1/battle-result-types.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";
import { createEmptyGeneratedTechniqueCatalogOverlay } from "./generated-technique-catalog-overlay.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value;
}

function developmentEffects(
  participantA: readonly { techniqueId: string; successful: number; attempted?: number }[],
): BattleDevelopmentEffects {
  const toDelta = (entry: { techniqueId: string; successful: number; attempted?: number }) => ({
    techniqueId: asTechniqueId(entry.techniqueId),
    masteryHundredthsDelta: 0,
    attemptedUseCountDelta: entry.attempted ?? entry.successful,
    successfulUseCountDelta: entry.successful,
  });
  const participant = {
    persistentFatigueDelta: 0,
    injuryDelta: 0,
    conditionRequestedDelta: 0,
    conditionAppliedDelta: 0,
    conditionAfter: 0,
    confidenceRequestedDelta: 0,
    confidenceAppliedDelta: 0,
    confidenceAfter: 0,
    currentMentalAfter: 0,
    techniqueStateDeltas: participantA.map(toDelta),
    battleExperienceSummary: {
      outcome: "win" as const,
      endReason: "knockout" as const,
      turnsExecuted: 1,
      damageDealt: 0,
      damageReceived: 0,
      successfulHits: 0,
      successfulDefenses: 0,
      successfulEvasions: 0,
      successfulCounters: 0,
      attemptedTechniqueUseCount: 0,
      successfulTechniqueUseCount: 0,
    },
  };
  return {
    participantA: participant,
    participantB: { ...participant, techniqueStateDeltas: [] },
  };
}

function foundingHistory(
  newTechniqueId: string,
  founderPersonId: string,
): OriginalTechniqueFoundingHistoryRecord {
  return {
    eventKind: "original_technique_founded",
    founderPersonId,
    newTechniqueId,
    sourceTechniqueIds: ["tech_base"],
    researchValueAtFounding: 550,
    developmentReason: "test",
    researchTier: "full_original_technique",
    worldWeekIndex: 1,
  };
}

function personWithTechnique(personId: string, techniqueId: string, living: boolean) {
  const sprint1State = expectOk(createInitialSprint1PersonState(50));
  const withTechnique = {
    ...sprint1State,
    techniqueStates: [
      {
        techniqueId: asTechniqueId(techniqueId),
        learningProgressTenths: 1000,
        masteryHundredths: 1000,
        successfulUseCount: 0,
        attemptedUseCount: 0,
        lastPracticedAbsoluteWeek: null,
        acquiredAbsoluteWeek: 1,
      },
    ],
  };
  const base = {
    personId: asPersonId(personId) as PersonId,
    displayName: personId,
    sex: "male" as const,
    careerStatus: "disciple" as const,
    currentAge: 25,
    abilities: {
      strength: { surfaceValue: 50, potentialValue: 50 },
      agility: { surfaceValue: 50, potentialValue: 50 },
      spirit: { surfaceValue: 50, potentialValue: 50 },
    },
    sprint1State: withTechnique,
  };
  if (living) {
    return {
      ...base,
      lifeStatus: "living" as const,
      participationStatus: "active" as const,
    };
  }
  return {
    ...base,
    lifeStatus: "deceased" as const,
    deathYear: 2025,
    ageAtDeath: 25,
  };
}

function minimalWorld(persons: ReturnType<typeof personWithTechnique>[]): WorldEngineState {
  return {
    simulationId: "sim_otl_loss_test",
    seed: 1,
    configHash: "0".repeat(64),
    worldDate: createWorldDate(
      { year: 2025, month: 1, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    ),
    persons,
    families: [],
    lineages: [],
    relationships: [],
    generationSummary: {
      livingCount: { actual: persons.length, expected: persons.length },
      deceasedCount: { actual: 0, expected: 0 },
      careerStatus: {},
    },
  } as unknown as WorldEngineState;
}

function runtimeWithFounding(runSeed: number, histories: OriginalTechniqueFoundingHistoryRecord[]) {
  const initial = createInitialOriginalTechniqueLifecycleRuntimeState(runSeed);
  return expectOk(
    validateOriginalTechniqueLifecycleRuntimeState({
      ...initial,
      foundingHistories: histories,
    }),
  );
}

describe("S03-020 live original technique loss wiring", () => {
  const config = expectOk(validateSprint3Config(createSprint3Balance090ConfigInput(), provider));

  it("OTL-L001 living practitioner keeps technique from loss", () => {
    const techniqueId = "tech_alive_practitioner";
    const evaluation = buildOriginalTechniqueLossEvaluationRecord({
      techniqueId,
      founderPersonId: "person_founder",
      worldState: minimalWorld([personWithTechnique("person_founder", techniqueId, true)]),
      mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
    });
    expect(evaluation.livingPractitionerCount).toBe(1);
    const kept = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 5,
        worldState: minimalWorld([personWithTechnique("person_founder", techniqueId, true)]),
        sprint3Config: config,
        runtimeState: runtimeWithFounding(42, [foundingHistory(techniqueId, "person_founder")]),
        mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(kept.runtimeState?.lossHistories.length).toBe(0);
  });

  it("OTL-L002 living registered successor practitioner prevents loss", () => {
    const techniqueId = "tech_heir_alive";
    const world = minimalWorld([
      personWithTechnique("person_heir", techniqueId, true),
      personWithTechnique("person_founder", techniqueId, false),
    ]);
    const mentorship = expectOk(
      validateSprint3MentorshipEntrypointRuntimeState({
        ...createInitialSprint3MentorshipEntrypointRuntimeState(),
        mentorshipByChildPersonId: [
          {
            childPersonId: "person_heir",
            selectedMasterPersonId: "person_founder",
            mentorshipRelationKind: "formal_master_disciple",
            enrollmentOutcomeKind: "formal_master_assigned",
            assignedAbsoluteWeek: 1,
          },
        ],
      }),
    );
    const result = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 6,
        worldState: world,
        sprint3Config: config,
        runtimeState: runtimeWithFounding(43, [foundingHistory(techniqueId, "person_founder")]),
        mentorshipRuntime: mentorship,
      }),
    );
    expect(result.runtimeState?.lossHistories.length).toBe(0);
  });

  it("OTL-L003 no living practitioner or successor persists loss once", () => {
    const techniqueId = "tech_extinct";
    const world = minimalWorld([personWithTechnique("person_founder", techniqueId, false)]);
    const runtime = runtimeWithFounding(44, [foundingHistory(techniqueId, "person_founder")]);
    const first = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 7,
        worldState: world,
        sprint3Config: config,
        runtimeState: runtime,
        mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(first.runtimeState?.lossHistories).toEqual([
      {
        eventKind: "original_technique_lost",
        techniqueId,
        founderPersonId: "person_founder",
        worldWeekIndex: 7,
        reasons: ["technique_extinct_no_living_practitioners_or_successors"],
      },
    ]);
    const second = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 8,
        worldState: world,
        sprint3Config: config,
        runtimeState: first.runtimeState,
        mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(second.runtimeState?.lossHistories.length).toBe(1);
  });

  it("OTL-L004 death transition triggers exactly one loss record", () => {
    const techniqueId = "tech_death_once";
    const livingWorld = minimalWorld([personWithTechnique("person_founder", techniqueId, true)]);
    const deadWorld = minimalWorld([personWithTechnique("person_founder", techniqueId, false)]);
    const runtime = runtimeWithFounding(45, [foundingHistory(techniqueId, "person_founder")]);
    const beforeDeath = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 9,
        worldState: livingWorld,
        sprint3Config: config,
        runtimeState: runtime,
        mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(beforeDeath.runtimeState?.lossHistories.length).toBe(0);
    const afterDeath = expectOk(
      processOriginalTechniqueLossWeek({
        absoluteWeek: 10,
        worldState: deadWorld,
        sprint3Config: config,
        runtimeState: beforeDeath.runtimeState,
        mentorshipRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(afterDeath.runtimeState?.lossHistories.length).toBe(1);
    expect(afterDeath.runtimeState?.lossHistories[0]?.worldWeekIndex).toBe(10);
  });

  it("OTL-L005 equivalent live state yields stable practitioner counts regardless of person order", () => {
    const techniqueId = "tech_order";
    const personsA = [
      personWithTechnique("person_b", techniqueId, true),
      personWithTechnique("person_a", techniqueId, true),
    ];
    const personsB = [personsA[1]!, personsA[0]!];
    expect(countLivingPractitionersForTechnique(minimalWorld(personsA), techniqueId)).toBe(2);
    expect(countLivingPractitionersForTechnique(minimalWorld(personsB), techniqueId)).toBe(2);
  });

  it("OTL-L006 first-use MatchId persistence helper remains intact (S03-011 regression)", () => {
    const runtime = runtimeWithFounding(46, [foundingHistory("tech_match", "person_founder")]);
    const useIds = collectSuccessfulBattleTechniqueUseIds(
      developmentEffects([{ techniqueId: "tech_match", successful: 1 }]),
    );
    const updated = expectOk(
      applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
        runtimeState: runtime,
        matchId: "match_001",
        successfullyUsedTechniqueIds: useIds,
      }),
    );
    expect(updated.foundingHistories[0]?.firstUseMatchId).toBe("match_001");
    expect(updated.lossHistories.length).toBe(0);
  });

  it("OTL-L007 generated catalog overlay identity guard unchanged (S03-010 regression)", () => {
    const config100 = expectOk(
      validateSprint3Config(createSprint3Balance100ConfigInput(), provider),
    );
    expect(config100.configVersion).toBe("sprint3-balance-0.10.0");
    const overlay = createEmptyGeneratedTechniqueCatalogOverlay();
    expect(overlay.definitions.length).toBe(0);
    expect(config100.mentorshipFeatures.generatedTechniqueRegistrationEnabled).toBe(true);
  });
});

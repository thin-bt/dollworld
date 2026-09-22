import { describe, expect, it } from "vitest";
import { ABILITY_KEYS } from "../abilities.js";
import { asPersonId, asTechniqueId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import { validateTechniqueDefinition, type PersonTechniqueState } from "../index.js";
import { validateSprint1Config } from "../sprint1/validate-sprint1-config.js";
import { createDefaultSprint1ConfigInput } from "../sprint1/sprint1-config-defaults.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { advanceOneWeek, createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { applyExplicitWeeklyTeachOutcomesToWorldState } from "./apply-explicit-weekly-teach-outcomes-to-world-state.js";
import { deriveLiveExplicitWeeklyTeachDiscipleRequests } from "./derive-live-explicit-weekly-teach-disciple-requests.js";
import { materializeLiveExplicitWeeklyTeachQueueRecords } from "./materialize-live-mentorship-entrypoint-queues.js";
import { processExplicitWeeklyTeachWeek } from "./process-explicit-weekly-teach-week.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  type Sprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance070ConfigInput,
  createSprint3Balance080ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import type { TeacherCanTeachContext } from "../sprint1/technique-teacher.js";

const provider = createNodeSha256Provider();
const MASTER_ID = asPersonId("master_live_teach_wiring");
const DISCIPLE_ID = asPersonId("disciple_live_teach_wiring");
const TECH_ID = "technique_alpha";

function expectOk<T>(result: { ok: true; value: T } | { ok: false; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result)}`);
  }
  return result.value;
}

function statTriple(surfaceValue = 50) {
  return {
    surfaceValue,
    expressedGeneticValue: surfaceValue,
    latentGeneticValue: surfaceValue,
  };
}

function abilityBlock() {
  return Object.fromEntries(ABILITY_KEYS.map((key) => [key, statTriple()]));
}

function aptitudeBlock() {
  return {
    unarmed: statTriple(),
    sword: statTriple(),
    magic: statTriple(),
  };
}

function techniqueState(
  techniqueId: string,
  overrides: Partial<PersonTechniqueState> = {},
): PersonTechniqueState {
  return {
    techniqueId: asTechniqueId(techniqueId),
    acquiredAbsoluteWeek: 1,
    masteryHundredths: 8000,
    learningProgressTenths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    ...overrides,
  };
}

function teacherContext(overrides: Partial<TeacherCanTeachContext> = {}): TeacherCanTeachContext {
  return {
    activeMentorshipExists: true,
    masterLifeStatus: "living",
    masterParticipationStatus: "active",
    masterCareerStatus: "active_competitor",
    masterTechniqueState: techniqueState(TECH_ID),
    ...overrides,
  };
}

function techniqueDefinition(id: string, learningTier: "basic" | "advanced" = "basic") {
  const learningProgressRequired = learningTier === "basic" ? 100 : 320;
  return expectOk(
    validateTechniqueDefinition({
      techniqueId: id,
      schemaVersion: "0.1.0",
      dataVersion: "techniques-0.1.0",
      name: "Test Technique",
      category: "unarmed",
      primaryStats: ["strength", "skill"],
      requiredAptitude: 10,
      requiredStats: { strength: 20 },
      prerequisiteTechniqueMastery: [],
      mentalCost: 5,
      difficulty: 30,
      learningTier,
      consumptionClass: "small",
      learningProgressRequired,
      learningProgressOverrideReason: null,
      teachingProficiencyRequired: 20,
      secrecy: 0,
      power: 25,
      accuracy: 70,
      activationDifficulty: 10,
      prerequisiteTechniqueIds: [],
      originPersonId: null,
      sourceTechniqueIds: [],
      tags: ["strike"],
      usableRanges: ["contact", "close"],
      preferredRanges: ["contact"],
      rangeShiftAfterUse: "none",
      priority: 0,
      speedModifier: 0,
      injuryModifier: 0,
      actionTraits: {
        simultaneous: false,
        counterOnHit: false,
        interception: false,
        interrupt: false,
        defenseBreak: false,
      },
    }),
  );
}

export function sidecarEntry(personId: string, discipleCount = 0) {
  const byAction: Record<string, unknown> = {};
  for (const action of WEEKLY_SCORED_ACTIONS) {
    byAction[action] = {
      personality: 0,
      developmentNeed: 0,
      recentResult: 0,
      teacherAdvice: 0,
      schedule: 0,
    };
  }
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return {
    personId,
    growthProfile: "normal",
    growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
    statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    motivationFactor: 10000,
    plannerContext: { byAction },
    statTargetContext: { byAbility },
    techniqueTargetContexts: [
      {
        techniqueId: TECH_ID,
        styleMatch: 100,
        learningTrait: 100,
        teachingAbility: 100,
        compatibility: 100,
        teacherCanTeachContext: teacherContext(),
      },
    ],
    teacherFactorKey: "averageMaster",
    discipleCount,
  };
}

export function teachWorld(mentorshipKind: "formal_master_disciple" | "parent_temporary_guidance") {
  const sprint1Master = {
    ...expectOk(createInitialSprint1PersonState(50)),
    techniqueStates: [techniqueState(TECH_ID)],
  };
  const sprint1Disciple = {
    ...expectOk(createInitialSprint1PersonState(50)),
    techniqueStates: [],
  };
  const abilities = abilityBlock();
  const aptitudes = aptitudeBlock();
  return {
    world: {
      simulationId: "sim_lwt",
      seed: 9021,
      configHash: "0".repeat(64),
      worldDate: createWorldDate(
        { year: 1, month: 1, weekOfMonth: 1 },
        DEFAULT_WORLD_CALENDAR_CONFIG,
      ),
      persons: [
        {
          personId: MASTER_ID,
          displayName: "Master",
          givenName: "Master",
          familyName: "Test",
          nameDataVersion: "0.1.0",
          sex: "male",
          lifeStatus: "living",
          participationStatus: "active",
          careerStatus: "active_competitor",
          birthYear: 1,
          currentAge: 30,
          familyId: "family_000001",
          currentRank: "C",
          highestRank: "C",
          abilities,
          aptitudes,
          qualifiedMaster: false,
          sprint1State: sprint1Master,
        },
        {
          personId: DISCIPLE_ID,
          displayName: "Disciple",
          givenName: "Disciple",
          familyName: "Test",
          nameDataVersion: "0.1.0",
          sex: "male",
          lifeStatus: "living",
          participationStatus: "active",
          careerStatus: "trainee",
          birthYear: 1,
          currentAge: 16,
          familyId: "family_000001",
          abilities,
          aptitudes,
          qualifiedMaster: false,
          sprint1State: sprint1Disciple,
        },
      ],
      relationships: [],
    } as unknown as WorldEngineState,
    runtime: {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      mentorshipByChildPersonId: [
        {
          childPersonId: DISCIPLE_ID,
          selectedMasterPersonId: MASTER_ID,
          mentorshipRelationKind: mentorshipKind,
          enrollmentOutcomeKind:
            mentorshipKind === "parent_temporary_guidance"
              ? ("parent_temporary_guidance" as const)
              : ("formal_master_assigned" as const),
          assignedAbsoluteWeek: 100,
        },
      ],
    },
  };
}

describe("S03-021 live explicit weekly teach wiring", () => {
  const sprint1Config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
  const sprint3Teach = expectOk(
    validateSprint3Config(createSprint3Balance080ConfigInput(), provider),
  );
  const catalog = {
    identity: { dataVersion: "techniques-0.1.0", catalogHash: "0".repeat(64) },
    definitions: [techniqueDefinition(TECH_ID)],
  };

  it("LWT-001 accepted formal teaching persists learner progress on worldState", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 200,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: runtime,
      }),
    );
    expect(materialized.pendingExplicitWeeklyTeachRecords[0]?.discipleRequests.length).toBe(1);

    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek: 200,
        sprint3Config: sprint3Teach,
        techniqueCatalog: catalog,
        runtimeState: materialized,
      }),
    );
    const discipleOutcome =
      processed.runtimeState!.completedExplicitWeeklyTeachOutcomes[0]?.outcome.discipleOutcomes[0];
    expect(discipleOutcome?.decision).toBe("accepted");

    const applied = expectOk(
      applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: world,
        absoluteWeek: 200,
        sprint1Config,
        techniqueCatalog: catalog,
        completedEntries: processed.runtimeState!.completedExplicitWeeklyTeachOutcomes,
      }),
    );
    const disciple = applied.persons.find((person) => person.personId === DISCIPLE_ID);
    const state = disciple?.sprint1State?.techniqueStates.find(
      (entry) => entry.techniqueId === TECH_ID,
    );
    expect(state?.learningProgressTenths).toBeGreaterThan(0);
  });

  it("LWT-002 refused teaching does not mutate disciple technique state", () => {
    const { world } = teachWorld("formal_master_disciple");
    const applied = expectOk(
      applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: world,
        absoluteWeek: 201,
        sprint1Config,
        techniqueCatalog: catalog,
        completedEntries: [
          {
            absoluteWeek: 201,
            masterPersonId: MASTER_ID,
            outcome: {
              kind: "teach_week_completed",
              weeklyTeachSlotLimit: 1,
              discipleOutcomes: [
                {
                  disciplePersonId: DISCIPLE_ID,
                  techniqueId: TECH_ID,
                  decision: "refused",
                  reasons: ["tier_refusal"],
                },
              ],
              reasons: ["explicit_weekly_teach_processed"],
            },
          },
        ],
      }),
    );
    const disciple = applied.persons.find((person) => person.personId === DISCIPLE_ID);
    expect(disciple?.sprint1State?.techniqueStates.length ?? 0).toBe(0);
  });

  it("LWT-003 parent temporary guidance refuses advanced tier", () => {
    const advancedCatalog = {
      identity: catalog.identity,
      definitions: [techniqueDefinition(TECH_ID, "advanced")],
    };
    const { world, runtime } = teachWorld("parent_temporary_guidance");
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 202,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3,
        sprint1Config,
        techniqueCatalog: advancedCatalog,
        runtimeState: runtime,
      }),
    );
    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek: 202,
        sprint3Config: sprint3,
        techniqueCatalog: advancedCatalog,
        runtimeState: materialized,
      }),
    );
    expect(
      processed.runtimeState!.completedExplicitWeeklyTeachOutcomes[0]?.outcome.discipleOutcomes[0]
        ?.decision,
    ).toBe("refused");
  });

  it("LWT-004 replay does not duplicate explicit teach materialization for same master/week", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    let currentRuntime: Sprint3MentorshipEntrypointRuntimeState = runtime;
    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 203,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: currentRuntime,
      }),
    );
    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek: 203,
        sprint3Config: sprint3Teach,
        techniqueCatalog: catalog,
        runtimeState: materialized,
      }),
    );
    currentRuntime = processed.runtimeState!;
    const rematerialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 203,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: currentRuntime,
      }),
    );
    expect(rematerialized.pendingExplicitWeeklyTeachRecords).toHaveLength(0);
  });

  it("LWT-005 persisted techniqueStates remain visible on the next weekly step", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const absoluteWeek = 200;
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: runtime,
      }),
    );
    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek,
        sprint3Config: sprint3Teach,
        techniqueCatalog: catalog,
        runtimeState: materialized,
      }),
    );
    const applied = expectOk(
      applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: world,
        absoluteWeek,
        sprint1Config,
        techniqueCatalog: catalog,
        completedEntries: processed.runtimeState!.completedExplicitWeeklyTeachOutcomes,
      }),
    );
    const progressBefore =
      applied.persons
        .find((person) => person.personId === DISCIPLE_ID)
        ?.sprint1State?.techniqueStates.find((entry) => entry.techniqueId === TECH_ID)
        ?.learningProgressTenths ?? 0;
    expect(progressBefore).toBeGreaterThan(0);

    const nextWeekWorld = {
      ...applied,
      worldDate: advanceOneWeek(applied.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG),
    };
    const discipleNextWeek = nextWeekWorld.persons.find(
      (person) => person.personId === DISCIPLE_ID,
    );
    const stateNextWeek = discipleNextWeek?.sprint1State?.techniqueStates.find(
      (entry) => entry.techniqueId === TECH_ID,
    );
    expect(stateNextWeek?.learningProgressTenths).toBe(progressBefore);
  });

  it("LWT-006 replay with empty newly-completed slice does not double-apply world persistence", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const absoluteWeek = 204;
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: runtime,
      }),
    );
    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek,
        sprint3Config: sprint3Teach,
        techniqueCatalog: catalog,
        runtimeState: materialized,
      }),
    );
    const completed = processed.runtimeState!.completedExplicitWeeklyTeachOutcomes;
    const appliedOnce = expectOk(
      applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: world,
        absoluteWeek,
        sprint1Config,
        techniqueCatalog: catalog,
        completedEntries: completed,
      }),
    );
    const progressOnce =
      appliedOnce.persons
        .find((person) => person.personId === DISCIPLE_ID)
        ?.sprint1State?.techniqueStates.find((entry) => entry.techniqueId === TECH_ID)
        ?.learningProgressTenths ?? 0;

    const rematerialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek,
        worldState: appliedOnce,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
        runtimeState: processed.runtimeState!,
      }),
    );
    expect(rematerialized.pendingExplicitWeeklyTeachRecords).toHaveLength(0);

    const appliedReplay = expectOk(
      applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: appliedOnce,
        absoluteWeek,
        sprint1Config,
        techniqueCatalog: catalog,
        completedEntries: [],
      }),
    );
    const progressReplay =
      appliedReplay.persons
        .find((person) => person.personId === DISCIPLE_ID)
        ?.sprint1State?.techniqueStates.find((entry) => entry.techniqueId === TECH_ID)
        ?.learningProgressTenths ?? 0;
    expect(progressReplay).toBe(progressOnce);
  });

  it("LWT-007 S03-061 former master receives no teach requests after persisted reassignment", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const before = expectOk(
      deriveLiveExplicitWeeklyTeachDiscipleRequests({
        masterPersonId: MASTER_ID,
        absoluteWeek: 200,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        mentorshipRuntime: runtime,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
      }),
    );
    expect(before.length).toBeGreaterThan(0);

    const reassignedRuntime: Sprint3MentorshipEntrypointRuntimeState = {
      ...runtime,
      mentorshipByChildPersonId: [
        {
          childPersonId: DISCIPLE_ID,
          selectedMasterPersonId: asPersonId("master_reassignment_successor"),
          mentorshipRelationKind: "formal_master_disciple",
          enrollmentOutcomeKind: "formal_master_assigned",
          assignedAbsoluteWeek: 150,
        },
      ],
    };
    const afterFormer = expectOk(
      deriveLiveExplicitWeeklyTeachDiscipleRequests({
        masterPersonId: MASTER_ID,
        absoluteWeek: 201,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        mentorshipRuntime: reassignedRuntime,
        sprint3Config: sprint3Teach,
        sprint1Config,
        techniqueCatalog: catalog,
      }),
    );
    expect(afterFormer).toHaveLength(0);
  });
});

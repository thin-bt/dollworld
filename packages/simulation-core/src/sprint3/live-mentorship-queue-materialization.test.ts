import { describe, expect, it } from "vitest";
import { ABILITY_KEYS } from "../abilities.js";
import { asPersonId, type PersonId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { WorldEngineState } from "../world-engine/types.js";
import {
  materializeLiveEnrollmentQueueBoundaries,
  materializeLiveExplicitWeeklyTeachQueueRecords,
} from "./materialize-live-mentorship-entrypoint-queues.js";
import { processExplicitWeeklyTeachWeek } from "./process-explicit-weekly-teach-week.js";
import { processSprint3EnrollmentIntakeBoundary } from "./process-sprint3-enrollment-intake-boundary.js";
import { createInitialSprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance040ConfigInput,
  createSprint3Balance070ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: true; value: T } | { ok: false; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result)}`);
  }
  return result.value;
}

function plannerContext(): Record<string, unknown> {
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
  return { byAction };
}

function statTargetContext(): Record<string, unknown> {
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return { byAbility };
}

function sidecarEntry(personId: string, discipleCount = 0): Record<string, unknown> {
  return {
    personId,
    growthProfile: "normal",
    growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
    statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    motivationFactor: 10000,
    plannerContext: plannerContext(),
    statTargetContext: statTargetContext(),
    techniqueTargetContexts: [],
    teacherFactorKey: "averageMaster",
    discipleCount,
  };
}

const CHILD_ID = asPersonId("child_enrollment_live_001");
const PARENT_ID = asPersonId("parent_master_live_001");
const MASTER_ID = asPersonId("master_competitor_live_001");
const DISCIPLE_ID = asPersonId("disciple_live_001");

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

function enrollmentWorldWithParentLink(): WorldEngineState {
  const sprint1State = expectOk(createInitialSprint1PersonState(50));
  const abilities = abilityBlock();
  const aptitudes = aptitudeBlock();
  return {
    simulationId: "sim_live_enrollment",
    seed: 9002,
    configHash: "0".repeat(64),
    worldDate: createWorldDate(
      { year: 1, month: 1, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    ),
    persons: [
      {
        personId: CHILD_ID,
        displayName: "Child",
        givenName: "Child",
        familyName: "Test",
        nameDataVersion: "0.1.0",
        sex: "male",
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "child",
        birthYear: 1,
        currentAge: 8,
        familyId: "family_000001",
        abilities,
        aptitudes,
        qualifiedMaster: false,
        sprint1State,
      },
      {
        personId: PARENT_ID,
        displayName: "Parent",
        givenName: "Parent",
        familyName: "Test",
        nameDataVersion: "0.1.0",
        sex: "male",
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "retired",
        birthYear: 1,
        currentAge: 35,
        familyId: "family_000001",
        abilities,
        aptitudes,
        retirementRank: "C",
        highestRank: "C",
        qualifiedMaster: true,
        lineageId: "lineage_000001",
        sprint1State,
      },
    ],
    relationships: [
      {
        relationshipId: "rel_parent_child_001",
        kind: "parent_child",
        parentId: PARENT_ID,
        childId: CHILD_ID,
        parentRole: "father",
      },
    ],
  } as unknown as WorldEngineState;
}

describe("S03-013 live mentorship queue materialization", () => {
  const sprint3Enrollment = expectOk(
    validateSprint3Config(createSprint3Balance040ConfigInput(), provider),
  );
  const sprint3Teach = expectOk(
    validateSprint3Config(createSprint3Balance070ConfigInput(), provider),
  );

  it("LMQ-001 live enrollment candidate materializes boundary and persists enrollment outcome", () => {
    const world = enrollmentWorldWithParentLink();
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(CHILD_ID), sidecarEntry(PARENT_ID)],
      }),
    );
    const runtime = createInitialSprint3MentorshipEntrypointRuntimeState();
    const materialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: runtime,
      }),
    );
    expect(materialized.pendingEnrollmentBoundaries).toHaveLength(1);
    expect(materialized.pendingEnrollmentBoundaries[0]?.childPersonId).toBe(CHILD_ID);

    const processed = expectOk(
      processSprint3EnrollmentIntakeBoundary({
        absoluteWeek: 384,
        sprint3Config: sprint3Enrollment,
        weeklyTrainingSidecars: sidecars,
        runtimeState: materialized,
      }),
    );
    expect(processed.runtimeState!.completedEnrollmentOutcomes).toHaveLength(1);
    expect(processed.runtimeState!.completedEnrollmentOutcomes[0]?.outcome.kind).toBe(
      "parent_master_assigned",
    );
    expect(processed.runtimeState!.pendingEnrollmentBoundaries).toHaveLength(0);
  });

  it("LMQ-002 does not duplicate enrollment materialization after outcome persisted", () => {
    const world = enrollmentWorldWithParentLink();
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(CHILD_ID), sidecarEntry(PARENT_ID)],
      }),
    );
    let runtime = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    const processed = expectOk(
      processSprint3EnrollmentIntakeBoundary({
        absoluteWeek: 384,
        sprint3Config: sprint3Enrollment,
        weeklyTrainingSidecars: sidecars,
        runtimeState: runtime,
      }),
    );
    runtime = processed.runtimeState!;

    const rematerialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 385,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: runtime,
      }),
    );
    expect(rematerialized.pendingEnrollmentBoundaries).toHaveLength(0);
    expect(rematerialized.completedEnrollmentOutcomes).toHaveLength(1);
  });

  it("LMQ-003 live explicit teach materializes teach record and persists teach outcome", () => {
    const sprint1State = expectOk(createInitialSprint1PersonState(50));
    const abilities = abilityBlock();
    const aptitudes = aptitudeBlock();
    const world = {
      simulationId: "sim_live_teach",
      seed: 9003,
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
          sprint1State,
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
          sprint1State,
        },
      ],
      relationships: [],
    } as unknown as WorldEngineState;

    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );

    const runtime = {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      mentorshipByChildPersonId: [
        {
          childPersonId: DISCIPLE_ID,
          selectedMasterPersonId: MASTER_ID,
          mentorshipRelationKind: "formal_master_disciple" as const,
          enrollmentOutcomeKind: "formal_master_assigned" as const,
          assignedAbsoluteWeek: 100,
        },
      ],
    };

    const materialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 200,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        runtimeState: runtime,
      }),
    );
    expect(materialized.pendingExplicitWeeklyTeachRecords).toHaveLength(1);
    expect(materialized.pendingExplicitWeeklyTeachRecords[0]?.selectedWeeklyAction).toBe("teach");

    const processed = expectOk(
      processExplicitWeeklyTeachWeek({
        absoluteWeek: 200,
        sprint3Config: sprint3Teach,
        techniqueCatalog: {
          identity: { dataVersion: "techniques-0.1.0", catalogHash: "0".repeat(64) },
          definitions: [],
        },
        runtimeState: materialized,
      }),
    );
    expect(processed.runtimeState!.completedExplicitWeeklyTeachOutcomes).toHaveLength(1);
    expect(processed.runtimeState!.pendingExplicitWeeklyTeachRecords).toHaveLength(0);
  });

  it("LMQ-004 does not re-materialize explicit teach for the same master/week after processing", () => {
    const sprint1State = expectOk(createInitialSprint1PersonState(50));
    const abilities = abilityBlock();
    const aptitudes = aptitudeBlock();
    const world = {
      simulationId: "sim_live_teach_replay",
      seed: 9004,
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
          sprint1State,
        },
      ],
      relationships: [],
    } as unknown as WorldEngineState;
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const runtime = {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      mentorshipByChildPersonId: [
        {
          childPersonId: DISCIPLE_ID,
          selectedMasterPersonId: MASTER_ID,
          mentorshipRelationKind: "formal_master_disciple" as const,
          enrollmentOutcomeKind: "formal_master_assigned" as const,
          assignedAbsoluteWeek: 100,
        },
      ],
      completedExplicitWeeklyTeachOutcomes: [
        {
          absoluteWeek: 200,
          masterPersonId: MASTER_ID,
          outcome: {
            kind: "teach_week_completed" as const,
            weeklyTeachSlotLimit: 1,
            discipleOutcomes: [],
            reasons: ["explicit_weekly_teach_processed"],
          },
        },
      ],
      lastProcessedExplicitTeachAbsoluteWeek: 200,
    };

    const rematerialized = expectOk(
      materializeLiveExplicitWeeklyTeachQueueRecords({
        absoluteWeek: 200,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Teach,
        runtimeState: runtime,
      }),
    );
    expect(rematerialized.pendingExplicitWeeklyTeachRecords).toHaveLength(0);
  });
});

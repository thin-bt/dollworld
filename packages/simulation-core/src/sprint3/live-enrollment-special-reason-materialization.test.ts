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
import { materializeLiveEnrollmentQueueBoundaries } from "./materialize-live-mentorship-entrypoint-queues.js";
import { processSprint3EnrollmentIntakeBoundary } from "./process-sprint3-enrollment-intake-boundary.js";
import { createInitialSprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import { createSprint3Balance040ConfigInput } from "./sprint3-config-defaults.js";
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

const CHILD_ID = asPersonId("child_special_reason_001");
const PARENT_ID = asPersonId("parent_special_reason_001");
const EXTERNAL_MASTER_ID = asPersonId("external_special_reason_001");

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

function aptitudeBlock(surface = 50) {
  return {
    unarmed: statTriple(surface),
    sword: statTriple(surface),
    magic: statTriple(surface),
  };
}

function retiredMaster(
  personId: PersonId,
  sprint1State: ReturnType<typeof expectOk<unknown>>,
  highestRank: "B" | "C" = "C",
  aptitudes = aptitudeBlock(),
) {
  return {
    personId,
    displayName: "Master",
    givenName: "Master",
    familyName: "Test",
    nameDataVersion: "0.1.0",
    sex: "male" as const,
    lifeStatus: "living" as const,
    participationStatus: "active" as const,
    careerStatus: "retired" as const,
    birthYear: 1,
    currentAge: 40,
    familyId: "family_000002",
    abilities: abilityBlock(),
    aptitudes,
    retirementRank: highestRank,
    highestRank,
    qualifiedMaster: true,
    sprint1State,
    lineageId: "lineage_000002",
  };
}

function enrollmentWorld(options: {
  childAptitudeSurface?: number;
  parentHighestRank?: "B" | "C";
  externalHighestRank?: "B" | "C";
  childLineageId?: string;
  parentLineageId?: string;
  parentDiscipleCount?: number;
}): WorldEngineState {
  const sprint1State = expectOk(createInitialSprint1PersonState(50));
  const childAptitude = options.childAptitudeSurface ?? 50;
  const parentRank = options.parentHighestRank ?? "C";
  const externalRank = options.externalHighestRank ?? "C";
  return {
    simulationId: "sim_special_reason",
    seed: 9010,
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
        abilities: abilityBlock(),
        aptitudes: aptitudeBlock(childAptitude),
        qualifiedMaster: false,
        sprint1State,
        ...(options.childLineageId === undefined ? {} : { lineageId: options.childLineageId }),
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
        abilities: abilityBlock(),
        aptitudes: aptitudeBlock(50),
        retirementRank: parentRank,
        highestRank: parentRank,
        qualifiedMaster: true,
        sprint1State,
        lineageId: options.parentLineageId ?? "lineage_000001",
      },
      retiredMaster(EXTERNAL_MASTER_ID, sprint1State, externalRank, aptitudeBlock(childAptitude)),
    ],
    relationships: [
      {
        relationshipId: "rel_parent_child_special",
        kind: "parent_child",
        parentId: PARENT_ID,
        childId: CHILD_ID,
        parentRole: "father",
      },
    ],
  } as unknown as WorldEngineState;
}

describe("S03-028 live enrollment special reason materialization", () => {
  const sprint3Enrollment = expectOk(
    validateSprint3Config(createSprint3Balance040ConfigInput(), provider),
  );

  it("LESR-001 keeps parent-default path without special reasons when facts do not justify them", () => {
    const world = enrollmentWorld({});
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [
          sidecarEntry(CHILD_ID),
          sidecarEntry(EXTERNAL_MASTER_ID),
          sidecarEntry(PARENT_ID),
        ],
      }),
    );
    const materialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    const boundary = materialized.pendingEnrollmentBoundaries[0];
    expect(boundary?.activeSpecialReasons).toEqual([]);
    const processed = expectOk(
      processSprint3EnrollmentIntakeBoundary({
        absoluteWeek: 384,
        sprint3Config: sprint3Enrollment,
        weeklyTrainingSidecars: sidecars,
        runtimeState: materialized,
      }),
    );
    expect(processed.runtimeState!.completedEnrollmentOutcomes[0]?.outcome.kind).toBe(
      "parent_master_assigned",
    );
  });

  it("LESR-002 superior rank and compatibility facts emit special reasons and select non-parent master", () => {
    const world = enrollmentWorld({
      childAptitudeSurface: 80,
      parentHighestRank: "C",
      externalHighestRank: "B",
    });
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [
          sidecarEntry(CHILD_ID),
          sidecarEntry(EXTERNAL_MASTER_ID),
          sidecarEntry(PARENT_ID),
        ],
      }),
    );
    const materialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    const boundary = materialized.pendingEnrollmentBoundaries[0];
    expect(boundary?.activeSpecialReasons).toContain("superior_master_invitation");
    expect(boundary?.activeSpecialReasons).toContain("poor_parent_child_compatibility");
    expect(boundary?.activeSpecialReasons).not.toContain("rebellion_against_parent");

    const processed = expectOk(
      processSprint3EnrollmentIntakeBoundary({
        absoluteWeek: 384,
        sprint3Config: sprint3Enrollment,
        weeklyTrainingSidecars: sidecars,
        runtimeState: materialized,
      }),
    );
    expect(processed.runtimeState!.completedEnrollmentOutcomes[0]?.outcome.kind).toBe(
      "formal_master_assigned",
    );
    expect(
      processed.runtimeState!.completedEnrollmentOutcomes[0]?.outcome.selectedMasterPersonId,
    ).toBe(EXTERNAL_MASTER_ID);
  });

  it("LESR-003 lineage mismatch emits aptitude_lineage_mismatch only when child lineage is defined", () => {
    const world = enrollmentWorld({
      childLineageId: "lineage_child_other",
      parentLineageId: "lineage_000001",
      parentHighestRank: "C",
      externalHighestRank: "C",
    });
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [
          sidecarEntry(CHILD_ID),
          sidecarEntry(EXTERNAL_MASTER_ID),
          sidecarEntry(PARENT_ID),
        ],
      }),
    );
    const materialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    expect(materialized.pendingEnrollmentBoundaries[0]?.activeSpecialReasons).toContain(
      "aptitude_lineage_mismatch",
    );
  });

  it("LESR-004 parent intake limit emits parent_intake_limit_reached without rebellion", () => {
    const world = enrollmentWorld({});
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [
          sidecarEntry(CHILD_ID),
          sidecarEntry(EXTERNAL_MASTER_ID),
          sidecarEntry(PARENT_ID, 8),
        ],
      }),
    );
    const materialized = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      }),
    );
    const boundary = materialized.pendingEnrollmentBoundaries[0];
    expect(boundary?.activeSpecialReasons).toEqual(["parent_intake_limit_reached"]);
    expect(boundary?.activeSpecialReasons).not.toContain("rebellion_against_parent");
  });

  it("LESR-005 materialized special reasons and candidates are replay-stable", () => {
    const world = enrollmentWorld({
      childAptitudeSurface: 80,
      externalHighestRank: "B",
    });
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [
          sidecarEntry(CHILD_ID),
          sidecarEntry(EXTERNAL_MASTER_ID),
          sidecarEntry(PARENT_ID),
        ],
      }),
    );
    const runtime = createInitialSprint3MentorshipEntrypointRuntimeState();
    const first = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: runtime,
      }),
    );
    const second = expectOk(
      materializeLiveEnrollmentQueueBoundaries({
        absoluteWeek: 384,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config: sprint3Enrollment,
        runtimeState: runtime,
      }),
    );
    expect(first.pendingEnrollmentBoundaries).toEqual(second.pendingEnrollmentBoundaries);
  });
});

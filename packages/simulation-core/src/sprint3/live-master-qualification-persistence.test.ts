import { describe, expect, it } from "vitest";
import { ABILITY_KEYS } from "../abilities.js";
import { applyAgeBasedCareerUpdates } from "../age-status.js";
import type { LivingActiveCompetitorPerson } from "../domain.js";
import { createEmptyCompetitiveRecord } from "../sprint2/competitive-record-update.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { asPersonId } from "../ids.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  deriveMasterQualificationEvaluationRecordFromPerson,
  isPersonMasterQualificationEligible,
  resolvePersistedQualifiedMasterFlag,
} from "./derive-master-qualification-record.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import { materializeLiveEnrollmentQueueBoundaries } from "./materialize-live-mentorship-entrypoint-queues.js";
import { refreshQualifiedMasterFlagsInWorldState } from "./refresh-qualified-master-flags-in-world-state.js";
import { createInitialSprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance020ConfigInput,
  createSprint3Balance040ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  validateNormalizedSprint3Config,
  validateSprint3Config,
} from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

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

function sidecarEntry(personId: string): Record<string, unknown> {
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
      teacherRecommendation: 0,
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
    techniqueTargetContexts: [],
    teacherFactorKey: "averageMaster",
    discipleCount: 0,
  };
}

function activeCompetitorAt42(
  overrides: Partial<LivingActiveCompetitorPerson> = {},
): LivingActiveCompetitorPerson {
  const abilities = abilityBlock() as LivingActiveCompetitorPerson["abilities"];
  const aptitudes = aptitudeBlock();
  return {
    personId: asPersonId("person_master_001"),
    displayName: "Master",
    givenName: "Master",
    familyName: "Test",
    nameDataVersion: "0.1.0",
    sex: "male",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    birthYear: 1,
    currentAge: 42,
    familyId: "family_000001" as LivingActiveCompetitorPerson["familyId"],
    abilities,
    aptitudes,
    currentRank: "C",
    highestRank: "C",
    qualifiedMaster: false,
    lineageId: "lineage_000001" as LivingActiveCompetitorPerson["lineageId"],
    ...overrides,
  } as LivingActiveCompetitorPerson;
}

describe("S03-016 live master qualification persistence", () => {
  const config020 = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
  const config040 = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
  expect(config020.ok && config040.ok).toBe(true);
  if (!config020.ok || !config040.ok) {
    return;
  }

  it("LQP-001 qualified retired living person with lineage derives eligible record", () => {
    const retired = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    expect(retired.careerStatus).toBe("retired");
    const record = deriveMasterQualificationEvaluationRecordFromPerson({ person: retired });
    const outcome = evaluateMasterQualificationEligibility(config020.value, record);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.eligible).toBe(true);
    expect(isPersonMasterQualificationEligible(config020.value, retired)).toBe(true);
  });

  it("LQP-002 active and non-retired persons are not master-qualified", () => {
    const active = activeCompetitorAt42();
    expect(isPersonMasterQualificationEligible(config020.value, active)).toBe(false);
    const record = deriveMasterQualificationEvaluationRecordFromPerson({ person: active });
    const outcome = evaluateMasterQualificationEligibility(config020.value, record);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.eligible).toBe(false);
  });

  it("LQP-003 deceased person is not master-qualified and clears persisted flag", () => {
    const retired = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    const world = {
      simulationId: "sim_lqp",
      seed: 1,
      configHash: "0".repeat(64),
      worldDate: { year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 1 },
      persons: [
        {
          ...retired,
          lifeStatus: "deceased" as const,
          deathYear: 2,
          ageAtDeath: 50,
          qualifiedMaster: true,
        },
      ],
      relationships: [],
    };
    const refreshed = refreshQualifiedMasterFlagsInWorldState({
      worldState: world as never,
      sprint3Config: config020.value,
    });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) {
      return;
    }
    expect(refreshed.value.persons[0]?.qualifiedMaster).toBe(false);
  });

  it("LQP-004 below-threshold official wins reject eligibility when config requires wins", () => {
    const retired = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    const strictInput = createSprint3Balance020ConfigInput();
    if (
      strictInput.masterQualification.evaluationPolicyVersion !==
      "master-qualification-rank-and-records-0.1.0"
    ) {
      throw new Error("expected rank-and-records policy");
    }
    strictInput.masterQualification.eligibilityThresholds.minimumOfficialWins = 3;
    strictInput.configVersion = "sprint3-balance-0.2.0-lqp004-test";
    const strictConfig = validateNormalizedSprint3Config(strictInput);
    expect(strictConfig.ok).toBe(true);
    if (!strictConfig.ok) {
      return;
    }
    const withoutWins = deriveMasterQualificationEvaluationRecordFromPerson({ person: retired });
    const belowThreshold = evaluateMasterQualificationEligibility(strictConfig.value, withoutWins);
    expect(belowThreshold.ok).toBe(true);
    if (!belowThreshold.ok) {
      return;
    }
    expect(belowThreshold.value.eligible).toBe(false);

    const competitive = createEmptyCompetitiveRecord(retired.personId, "C", provider);
    expect(competitive.ok).toBe(true);
    if (!competitive.ok) {
      return;
    }
    const withWins = deriveMasterQualificationEvaluationRecordFromPerson({
      person: retired,
      competitiveRecord: {
        ...competitive.value,
        officialWins: 3,
      },
    });
    const eligible = evaluateMasterQualificationEligibility(strictConfig.value, withWins);
    expect(eligible.ok).toBe(true);
    if (!eligible.ok) {
      return;
    }
    expect(eligible.value.eligible).toBe(true);
  });

  it("LQP-005 derivation and refresh are deterministic for stable person ordering", () => {
    const first = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    const second = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    const recordA = deriveMasterQualificationEvaluationRecordFromPerson({ person: first });
    const recordB = deriveMasterQualificationEvaluationRecordFromPerson({ person: second });
    expect(recordA).toEqual(recordB);
    expect(resolvePersistedQualifiedMasterFlag(config020.value, first)).toBe(
      resolvePersistedQualifiedMasterFlag(config020.value, second),
    );
  });

  it("LQP-006 qualification flag refreshes after force-retirement career transition", () => {
    const before = activeCompetitorAt42({ qualifiedMaster: false });
    const afterCareer = applyAgeBasedCareerUpdates({ ...before, currentAge: 42 });
    expect(afterCareer.person.careerStatus).toBe("retired");
    const world = {
      simulationId: "sim_lqp_retire",
      seed: 1,
      configHash: "0".repeat(64),
      worldDate: { year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 1 },
      persons: [afterCareer.person],
      relationships: [],
    };
    const refreshed = refreshQualifiedMasterFlagsInWorldState({
      worldState: world as never,
      sprint3Config: config020.value,
    });
    expect(refreshed.ok).toBe(true);
    if (!refreshed.ok) {
      return;
    }
    expect(refreshed.value.persons[0]?.qualifiedMaster).toBe(true);
  });

  it("LQP-007 live enrollment materialization uses derived qualification for external masters", () => {
    const sprint1State = createInitialSprint1PersonState(50);
    expect(sprint1State.ok).toBe(true);
    if (!sprint1State.ok) {
      return;
    }
    const retired = {
      ...applyAgeBasedCareerUpdates(activeCompetitorAt42()).person,
      sprint1State: sprint1State.value,
    };
    const child = {
      personId: "person_child_001",
      displayName: "Child",
      givenName: "Child",
      familyName: "Test",
      nameDataVersion: "0.1.0",
      sex: "male" as const,
      lifeStatus: "living" as const,
      participationStatus: "active" as const,
      careerStatus: "child" as const,
      birthYear: 1,
      currentAge: 8,
      familyId: "family_000002",
      abilities: abilityBlock(),
      aptitudes: aptitudeBlock(),
      qualifiedMaster: false as const,
      sprint1State: sprint1State.value,
    };
    const world = {
      simulationId: "sim_lqp_enroll",
      seed: 1,
      configHash: "0".repeat(64),
      worldDate: createWorldDate(
        { year: 8, month: 1, weekOfMonth: 1 },
        DEFAULT_WORLD_CALENDAR_CONFIG,
      ),
      persons: [child, retired],
      relationships: [],
    };
    const sidecars = validateWeeklyTrainingSidecarState({
      schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
      entries: [sidecarEntry(child.personId), sidecarEntry(retired.personId)],
    });
    expect(sidecars.ok).toBe(true);
    if (!sidecars.ok) {
      return;
    }
    const materialized = materializeLiveEnrollmentQueueBoundaries({
      absoluteWeek: 384,
      worldState: world as never,
      weeklyTrainingSidecars: sidecars.value,
      sprint3Config: config040.value,
      runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
    });
    if (!materialized.ok) {
      throw new Error(JSON.stringify(materialized.issues));
    }
    const boundary = materialized.value.pendingEnrollmentBoundaries[0];
    const external = boundary?.masterCandidates.find(
      (candidate) => candidate.masterPersonId === retired.personId,
    );
    expect(external).toBeDefined();
    const qualification = evaluateMasterQualificationEligibility(
      config040.value,
      external!.qualificationRecord,
    );
    expect(qualification.ok).toBe(true);
    if (!qualification.ok) {
      return;
    }
    expect(qualification.value.eligible).toBe(true);
  });
});

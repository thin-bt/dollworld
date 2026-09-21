import { describe, expect, it } from "vitest";
import { applyAgeBasedCareerUpdates } from "../age-status.js";
import type { LivingActiveCompetitorPerson } from "../domain.js";
import { asPersonId } from "../ids.js";
import {
  computeCompetitiveRecordHash,
  createEmptyCompetitiveRecord,
  type CompetitiveRecord,
} from "../sprint2/competitive-record-update.js";
import {
  buildSprint2CompetitiveRecordRuntimeStateFromRecords,
  createEmptySprint2CompetitiveRecordRuntimeState,
} from "./live-sprint2-competitive-record-runtime-state.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { ABILITY_KEYS } from "../abilities.js";
import { deriveMasterQualificationEvaluationRecordFromPerson } from "./derive-master-qualification-record.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import { materializeLiveEnrollmentQueueBoundaries } from "./materialize-live-mentorship-entrypoint-queues.js";
import { refreshQualifiedMasterFlagsInWorldState } from "./refresh-qualified-master-flags-in-world-state.js";
import { resolveLiveCompetitiveRecordsForQualification } from "./resolve-live-competitive-records-for-qualification.js";
import { createInitialSprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance020ConfigInput,
  createSprint3Balance040ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  validateNormalizedSprint3Config,
  validateSprint3Config,
} from "./validate-sprint3-config.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";

const provider = createNodeSha256Provider();

function competitiveRecordWithPatch(
  base: CompetitiveRecord,
  patch: Partial<Omit<CompetitiveRecord, "recordHash">>,
): CompetitiveRecord {
  const { recordHash, ...withoutHash } = base;
  void recordHash;
  const next = { ...withoutHash, ...patch };
  const hash = computeCompetitiveRecordHash(next, provider);
  if (!hash.ok) {
    throw new Error("hash failed");
  }
  return { ...next, recordHash: hash.value };
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

const config040 = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
if (!config040.ok) {
  throw new Error("config setup failed");
}

describe("S03-017 live competitive record wiring", () => {
  it("LCR-001 resolveLiveCompetitiveRecordsForQualification returns undefined without runtime", () => {
    expect(resolveLiveCompetitiveRecordsForQualification({})).toBeUndefined();
    expect(
      resolveLiveCompetitiveRecordsForQualification({
        sprint2CompetitiveRecordRuntime: createEmptySprint2CompetitiveRecordRuntimeState(),
      }),
    ).toBeUndefined();
  });

  it("LCR-002 refresh uses authoritative runtime records when present", () => {
    const retired = applyAgeBasedCareerUpdates(activeCompetitorAt42()).person;
    const strictInput = createSprint3Balance020ConfigInput();
    if (
      strictInput.masterQualification.evaluationPolicyVersion !==
      "master-qualification-rank-and-records-0.1.0"
    ) {
      throw new Error("expected rank-and-records policy");
    }
    strictInput.masterQualification.eligibilityThresholds.minimumOfficialWins = 3;
    strictInput.configVersion = "sprint3-balance-0.2.0-lcr002-test";
    const strictConfig = validateNormalizedSprint3Config(strictInput);
    expect(strictConfig.ok).toBe(true);
    if (!strictConfig.ok) {
      return;
    }

    const empty = createEmptyCompetitiveRecord(retired.personId, "C", provider);
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      return;
    }
    const withWins = competitiveRecordWithPatch(empty.value, { officialWins: 3 });
    const runtime = buildSprint2CompetitiveRecordRuntimeStateFromRecords([withWins], provider);
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) {
      return;
    }
    const map = resolveLiveCompetitiveRecordsForQualification({
      sprint2CompetitiveRecordRuntime: runtime.value,
    });
    expect(map?.get(retired.personId)?.officialWins).toBe(3);

    const world = {
      simulationId: "sim_lcr",
      seed: 1,
      configHash: "0".repeat(64),
      worldDate: { year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 1 },
      persons: [{ ...retired, qualifiedMaster: false }],
      relationships: [],
    };
    const withoutMap = refreshQualifiedMasterFlagsInWorldState({
      worldState: world as never,
      sprint3Config: strictConfig.value,
    });
    expect(withoutMap.ok).toBe(true);
    if (!withoutMap.ok) {
      return;
    }
    expect(withoutMap.value.persons[0]?.qualifiedMaster).toBe(false);

    const eligibility = evaluateMasterQualificationEligibility(
      strictConfig.value,
      deriveMasterQualificationEvaluationRecordFromPerson({
        person: retired,
        competitiveRecord: withWins,
      }),
    );
    expect(eligibility.ok).toBe(true);
    if (!eligibility.ok) {
      return;
    }
    expect(eligibility.value.eligible).toBe(true);

    expect(map).toBeDefined();
    if (map === undefined) {
      return;
    }
    const withMap = refreshQualifiedMasterFlagsInWorldState({
      worldState: world as never,
      sprint3Config: strictConfig.value,
      competitiveRecordsByPersonId: map,
    });
    expect(withMap.ok).toBe(true);
    if (!withMap.ok) {
      return;
    }
    expect(withMap.value.persons[0]?.qualifiedMaster).toBe(true);
    expect(withoutMap.value.persons[0]?.qualifiedMaster).toBe(false);
  });

  it("LCR-003 enrollment materialization derives wins from runtime map", () => {
    const sprint1State = createInitialSprint1PersonState(50);
    expect(sprint1State.ok).toBe(true);
    if (!sprint1State.ok) {
      return;
    }
    const retired = {
      ...applyAgeBasedCareerUpdates(activeCompetitorAt42()).person,
      sprint1State: sprint1State.value,
    };
    const empty = createEmptyCompetitiveRecord(retired.personId, "C", provider);
    expect(empty.ok).toBe(true);
    if (!empty.ok) {
      return;
    }
    const record = competitiveRecordWithPatch(empty.value, {
      officialWins: 5,
      tournamentTitles: 1,
    });
    const runtime = buildSprint2CompetitiveRecordRuntimeStateFromRecords([record], provider);
    expect(runtime.ok).toBe(true);
    if (!runtime.ok) {
      return;
    }
    const map = resolveLiveCompetitiveRecordsForQualification({
      sprint2CompetitiveRecordRuntime: runtime.value,
    });

    const derived = deriveMasterQualificationEvaluationRecordFromPerson({
      person: retired,
      competitiveRecord: record,
    });
    expect(derived.officialWins).toBe(5);
    expect(derived.tournamentTitles).toBe(1);

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

    const withoutRecords = materializeLiveEnrollmentQueueBoundaries({
      absoluteWeek: 384,
      worldState: world as never,
      weeklyTrainingSidecars: sidecars.value,
      sprint3Config: config040.value,
      runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
    });
    if (!withoutRecords.ok) {
      throw new Error(JSON.stringify(withoutRecords.issues));
    }
    const externalWithout =
      withoutRecords.value.pendingEnrollmentBoundaries[0]?.masterCandidates.find(
        (candidate) => candidate.masterPersonId === retired.personId,
      );
    expect(externalWithout?.qualificationRecord.officialWins).toBe(0);

    expect(map).toBeDefined();
    if (map === undefined) {
      return;
    }
    const withRecords = materializeLiveEnrollmentQueueBoundaries({
      absoluteWeek: 384,
      worldState: world as never,
      weeklyTrainingSidecars: sidecars.value,
      sprint3Config: config040.value,
      runtimeState: createInitialSprint3MentorshipEntrypointRuntimeState(),
      competitiveRecordsByPersonId: map,
    });
    if (!withRecords.ok) {
      throw new Error(JSON.stringify(withRecords.issues));
    }
    const externalWith = withRecords.value.pendingEnrollmentBoundaries[0]?.masterCandidates.find(
      (candidate) => candidate.masterPersonId === retired.personId,
    );
    expect(externalWith?.qualificationRecord.officialWins).toBe(5);
  });
});

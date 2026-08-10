import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  RUN_METADATA_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  commitRunBattlePlan,
  computeConfigHash,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createDefaultStrategyActionSourceIdentity,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  generateInitialWorld,
  runBattleToCompletion,
  runSprint1WeeklyStep,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateNameData,
  validateTechniqueDefinition,
  type InitialWorldConfig,
  type CreateSprint1RunSessionResult,
  type Person,
  type PersonId,
  type RunId,
  type ValidationResult,
  type ValidatedNameData,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { writeRunOutputAtomic } from "./atomic-write.js";
import { buildAndWriteSprint1RunOutput } from "./build-sprint1-run-output.js";
import { FIXED_OUTPUT_FILE_NAMES } from "./fixed-files.js";
import { createNodeFsOps } from "./fs-ops.js";
import { runSprint1SimulationWithYearlyCaptureResult } from "./run-sprint1-simulation-yearly.js";
import type { Sprint1FinalWorldDocument, Sprint1RunMetadataDocument } from "./types.js";
import { createSprint1ReloadedRunOutputVerifier } from "./verify-run-output.js";
import { evaluateReferenceIntegrity } from "./world-integrity.js";
import { parseYearlyStatisticsCsv } from "./yearly-statistics.js";

const sha256Provider = createNodeSha256Provider();
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "dollworld-s01-008-output-"));
  tempDirs.push(dir);
  return dir;
}

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  expect(result.ok).toBe(true);
  return result.value;
}

function createTinyNameData(familyNameCount: number): ValidatedNameData {
  const familyNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "family_name" as const,
    count: familyNameCount,
    names: Array.from({ length: familyNameCount }, (_, i) => `Family${String(i + 1)}`),
  };
  const maleGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "male_given_name" as const,
    count: 20,
    names: Array.from({ length: 20 }, (_, i) => `Male${String(i + 1)}`),
  };
  const femaleGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "female_given_name" as const,
    count: 20,
    names: Array.from({ length: 20 }, (_, i) => `Female${String(i + 1)}`),
  };
  const neutralGivenNames = {
    schemaVersion: "1.0.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    encoding: "UTF-8" as const,
    notes: "test fixture",
    category: "neutral_given_name" as const,
    count: 10,
    names: Array.from({ length: 10 }, (_, i) => `Neutral${String(i + 1)}`),
  };
  const manifest = {
    schemaVersion: "1.1.0",
    nameDataVersion: "NAMES-TEST-0.0.1",
    locale: "ja-JP",
    style: "test",
    displayFormat: "{givenName}・{familyName}" as const,
    files: {
      family: {
        path: "family-names.json",
        count: familyNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(familyNames)),
      },
      male: {
        path: "male-given-names.json",
        count: maleGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(maleGivenNames)),
      },
      female: {
        path: "female-given-names.json",
        count: femaleGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(femaleGivenNames)),
      },
      neutral: {
        path: "neutral-given-names.json",
        count: neutralGivenNames.count,
        sha256: sha256Provider.hashUtf8(toCanonicalJson(neutralGivenNames)),
      },
    },
    selectionPolicy: {
      familyNames: "without replacement",
      givenNames: "sex pool with neutral probability",
      duplicateLivingFullNameWithinFamily: "deterministic scan",
      historicalReuse: "allowed when not overlapping living",
      rng: "seeded only",
    },
    hashAlgorithm: "sha256-canonical-json-v1" as const,
  };
  return expectOk(
    validateNameData({
      manifest,
      familyNames,
      maleGivenNames,
      femaleGivenNames,
      neutralGivenNames,
      requiredVersion: "NAMES-TEST-0.0.1",
      initialFamilyCount: familyNameCount,
      sha256Provider,
    }),
  );
}

function createSmallConfig(): InitialWorldConfig {
  return {
    schemaVersion: "0.2.3",
    profileId: "tiny-s01-008-output-v1",
    purpose: "Sprint1 output test fixture",
    world: {
      startYear: 1,
      startMonth: 4,
      startWeekOfMonth: 1,
      weeksPerMonth: 4,
      monthsPerYear: 12,
      birthMonth: 4,
      birthWeekOfMonth: 1,
    },
    population: {
      totalLiving: 10,
      initialUserFounderCount: 0,
      sexRatioMale: 0.5,
      ageBands: [
        { minAge: 0, maxAge: 7, count: 4 },
        { minAge: 8, maxAge: 15, count: 2 },
        { minAge: 16, maxAge: 41, count: 2 },
        { minAge: 42, maxAge: 70, count: 2 },
      ],
      activeRankDistribution: { F: 0, E: 0, D: 0, C: 1, B: 1, A: 0, S: 0 },
    },
    history: {
      initialDeceasedAncestors: 5,
      minimumGenerationDepth: 1,
      maximumGenerationDepth: 2,
      earliestHistoricalYear: -120,
      minimumAgeAtDeath: 18,
      maximumAgeAtDeath: 70,
      createExistingRelationships: true,
      createPastTournamentHistory: false,
    },
    relationships: {
      knownParentCoverage: 0.5,
      twoKnownParentsCoverageAmongCovered: 0.5,
      retiredSpouseCoverage: 0.4,
      formalMasterCoverageAge8To41: 0.5,
      minimumParentAgeAtChildbirth: 18,
      maximumBiologicalParents: 2,
    },
    families: {
      initialFamilyCount: 3,
      minimumMembersPerFamily: 1,
      maximumMembersPerFamily: 8,
      baseBirthRateRange: { min: 0, max: 0 },
    },
    lineages: {
      initialLineageCount: 2,
      initialQualifiedMasters: 1,
      techniqueFocusWeights: { unarmed: 0.5, sword: 0.25, magic: 0.25 },
    },
    nameData: {
      manifestPath: "data/names/name-data.manifest.json",
      requiredVersion: "NAMES-TEST-0.0.1",
      neutralGivenNameProbability: 0,
      familyNameSelection: "without_replacement",
      avoidDuplicateLivingFullNameWithinFamily: true,
      displayFormat: "{givenName}・{familyName}",
    },
    abilities: {
      minimum: 0,
      maximum: 100,
      initialSurfaceValueRange: { min: 15, max: 65 },
      initialGeneticValueRange: { min: 10, max: 90 },
      initialAptitudeRange: { min: 20, max: 80 },
      initialAptitudeGeneticValueRange: { min: 10, max: 90 },
    },
    simulation: {
      defaultSeed: 5150,
      rngAlgorithm: "xoshiro128ss-v1",
      defaultYears: 1,
      benchmarkYears: [1],
      emitWeeklyEvents: false,
    },
    validationTargets: {
      maximumInitialPopulationMismatch: 0,
      maximumBrokenReferenceCount: 0,
      sameSeedMustMatch: true,
      differentSeedShouldDiffer: true,
    },
    performanceTargets: {
      warningSecondsFor600People100Years: 30,
      warningSecondsFor2000People100Years: 120,
      measureOnlyPopulation: 5000,
    },
  };
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

function sidecarEntry(personId: string): Record<string, unknown> {
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
    discipleCount: 0,
  };
}

function techniqueDefinition(techniqueId: string): Record<string, unknown> {
  return {
    techniqueId,
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: techniqueId,
    category: "unarmed",
    primaryStats: ["strength", "skill"],
    requiredAptitude: 10,
    requiredStats: { strength: 20 },
    prerequisiteTechniqueMastery: [],
    mentalCost: 5,
    difficulty: 30,
    learningTier: "basic",
    consumptionClass: "small",
    learningProgressRequired: 100,
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
    usableRanges: ["contact", "close", "middle"],
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
  };
}

function buildSidecarForPersonIds(personIds: readonly string[]): Record<string, unknown> {
  return {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: [...personIds]
      .sort((a, b) => a.localeCompare(b))
      .map((personId) => sidecarEntry(personId)),
  };
}

function buildSprint1CliInput(sidecar: Record<string, unknown>): Record<string, unknown> {
  const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
  return {
    schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
    sprint1Config: createDefaultSprint1ConfigInput(),
    techniqueCatalog: {
      identity: { dataVersion: "techniques-0.1.0", catalogHash },
      definitions: [def],
    },
    initialWeeklyTrainingSidecar: sidecar,
  };
}

function buildFreshSession(seed = 5150): {
  createResult: CreateSprint1RunSessionResult;
  nameDataHash: string;
} {
  const config = expectOk(validateInitialWorldConfig(createSmallConfig()));
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const nameDataHash = computeNameDataHash(nameData.manifest, sha256Provider);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, sha256Provider),
    seed,
    nameData,
    nameDataHash,
    rngFactory: createSeededRng,
    sha256Provider,
  });
  const personIds = generated.snapshot.persons.map((person) => person.personId);
  const created = expectOk(
    createSprint1RunSession(
      {
        seed,
        config,
        nameData,
        sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
      },
      sha256Provider,
    ),
  );
  return {
    createResult: created,
    nameDataHash,
  };
}

function commitProductionBattle(
  session: import("@shared-world/simulation-core").Sprint1RunSession,
) {
  const worldDate = createWorldDate({ year: 21, month: 4, weekOfMonth: 1 });
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living" || person.currentAge === null) return person;
    const currentAge = worldDate.year - person.birthYear;
    if (currentAge >= 42) {
      const { currentRank: _, ...retired } = {
        ...person,
        currentAge,
        careerStatus: "retired" as const,
        retirementRank: person.careerStatus === "retired" ? person.retirementRank : "C",
        highestRank: person.careerStatus === "retired" ? person.highestRank : "B",
      } as Person & { currentRank?: string };
      void _;
      return retired as Person;
    }
    if (currentAge >= 16) {
      const { retirementRank: _, ...active } = {
        ...person,
        currentAge,
        careerStatus: "active_competitor" as const,
        currentRank: person.careerStatus === "active_competitor" ? person.currentRank : "C",
        highestRank: person.careerStatus === "active_competitor" ? person.highestRank : "B",
        qualifiedMaster: false,
      } as Person & { retirementRank?: string };
      void _;
      return active as Person;
    }
    const {
      currentRank: _,
      highestRank: __,
      retirementRank: ___,
      ...nonRanked
    } = {
      ...person,
      currentAge,
      careerStatus: currentAge <= 7 ? ("child" as const) : ("trainee" as const),
    } as Person & { currentRank?: string; highestRank?: string; retirementRank?: string };
    void _;
    void __;
    void ___;
    return nonRanked as Person;
  });
  let prepared = {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: { ...session.runtimeState.worldState, worldDate, persons },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
  const eligible = persons.filter(
    (person) =>
      person.lifeStatus === "living" &&
      person.participationStatus === "active" &&
      person.careerStatus === "active_competitor" &&
      person.currentAge !== null &&
      person.currentAge >= 16 &&
      person.currentAge <= 41,
  );
  const [first, second] = eligible;
  if (first === undefined || second === undefined) throw new Error("missing official battle pair");
  prepared = {
    ...prepared,
    runtimeState: {
      ...prepared.runtimeState,
      worldState: {
        ...prepared.runtimeState.worldState,
        persons: persons.map((person) => {
          if (person.personId === first.personId)
            return { ...person, birthYear: 1, currentAge: 20 } as Person;
          if (person.personId === second.personId)
            return { ...person, birthYear: 2, currentAge: 19 } as Person;
          return person;
        }),
      },
    },
  };
  const participantSource = (personId: PersonId) => {
    const person = prepared.runtimeState.worldState.persons.find(
      (entry) => entry.personId === personId,
    );
    const sidecar = prepared.runtimeState.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === personId,
    );
    if (person === undefined || sidecar === undefined) throw new Error("missing battle source");
    return { person, temporaryCondition: sidecar.temporaryCondition };
  };
  const identity = expectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: prepared.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: prepared.context.runRuleSnapshot.sprint1ConfigHash,
    }),
  );
  const week = prepared.runtimeState.battleResultWeekState;
  const run = runBattleToCompletion(
    {
      expectedWorldStateHash: expectOk(
        computeExpectedWorldStateHash(prepared.runtimeState.worldState, sha256Provider),
      ),
      startBattleInput: {
        createBattleRequest: {
          simulationId: prepared.context.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantSource(first.personId),
          participantB: participantSource(second.personId),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot: prepared.context.runRuleSnapshot,
        },
        worldRngState: prepared.runtimeState.worldRngState,
        matchIdGeneratorState: prepared.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: { identity },
      participantBActionsSource: { identity },
      postProcessContext: {
        participantA: {
          personId: first.personId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, first.personId),
        },
        participantB: {
          personId: second.personId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, second.personId),
        },
      },
    },
    sha256Provider,
  );
  if (run.kind !== "completed")
    throw new Error(`expected completed battle: ${JSON.stringify(run)}`);
  return expectOk(
    commitRunBattlePlan({ session: prepared, commitPlan: run.commitPlan }, sha256Provider),
  );
}

describe("S01-008 Sprint1 fixed seven-file output", () => {
  it("writes a committed battle result and sanitized battle events", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { createResult, nameDataHash } = buildFreshSession(7010);
    const committed = commitProductionBattle(createResult.session);
    const simulation = {
      finalSession: committed,
      events: committed.runtimeState.eventStream,
      yearEnds: [],
      weeksExecuted: 0,
      finalIntegrity: evaluateReferenceIntegrity(committed.runtimeState.worldState),
    };
    const result = buildAndWriteSprint1RunOutput({
      fs: createNodeFsOps(),
      outputRoot,
      runId: "run_20260801T000000000Z_0010" as RunId,
      cwd: dir,
      nameDataHash,
      nameDataVersion: createResult.initialWorldSnapshotForOutput.nameDataVersion,
      configSchemaVersion: "0.1.0",
      simulationSpecVersion: createResult.initialWorldSnapshotForOutput.simulationSpecVersion,
      performanceTargets: {
        warningSecondsFor600People100Years: 30,
        warningSecondsFor2000People100Years: 120,
        measureOnlyPopulation: 5000,
      },
      createResult,
      simulation,
      provider: sha256Provider,
      realStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
      totalMilliseconds: 1000,
    });

    expect(result.finalWorld.battleResults.length).toBeGreaterThanOrEqual(1);
    expect(result.finalWorld.battleResults).toEqual(committed.runtimeState.battleResults);
    expect(result.finalWorld.battleResults[0]?.detailedLog).toBeDefined();
    expect(
      result.validationReport.checks.find((check) => check.name === "battle_results"),
    ).toMatchObject({
      status: "passed",
      violationCount: 0,
    });
    const battleEvents = result.allEvents.filter(
      (event) => event.eventType === "battle.started" || event.eventType === "battle.finished",
    );
    expect(battleEvents.map((event) => event.sourceProcessor)).toEqual([
      "battle-simulation",
      "battle-simulation",
    ]);
    for (const event of battleEvents) expect(event.payload["detailedLog"]).toBeUndefined();
  });

  it("writes exactly seven Sprint1 files with expected schema versions and projections", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { createResult, nameDataHash } = buildFreshSession();
    const initialWorldSnapshot = createResult.initialWorldSnapshotForOutput;
    const simulation = expectOk(
      runSprint1SimulationWithYearlyCaptureResult({
        initialSession: createResult.session,
        years: 1,
        sha256Provider,
      }),
    );

    const result = buildAndWriteSprint1RunOutput({
      fs: createNodeFsOps(),
      outputRoot,
      runId: "run_20260801T000000000Z_0001" as RunId,
      cwd: dir,
      nameDataHash,
      nameDataVersion: initialWorldSnapshot.nameDataVersion,
      configSchemaVersion: "0.1.0",
      simulationSpecVersion: initialWorldSnapshot.simulationSpecVersion,
      performanceTargets: {
        warningSecondsFor600People100Years: 30,
        warningSecondsFor2000People100Years: 120,
        measureOnlyPopulation: 5000,
      },
      createResult,
      simulation,
      provider: sha256Provider,
      realStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
      totalMilliseconds: 1000,
    });

    expect(existsSync(result.atomic.runDirectory)).toBe(true);
    expect(readdirSync(result.atomic.runDirectory).sort()).toEqual(
      [...FIXED_OUTPUT_FILE_NAMES].sort(),
    );
    expect(result.validationReport.overallPassed).toBe(true);
    expect(result.runMetadata.schemaVersion).toBe(RUN_METADATA_DOCUMENT_SCHEMA_VERSION_SPRINT1);
    expect(result.runMetadata.eventEnvelopeSchemaVersion).toBe(
      SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION,
    );
    expect(result.runMetadata.simulationIdentity.schemaVersion).toBe("0.4.0");
    expect(result.runMetadata.simulationIdentityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.finalWorld.schemaVersion).toBe("0.3.0");
    expect(result.finalWorld.weeklyTrainingSidecars.entries.length).toBe(
      result.finalWorld.persons.length,
    );
    expect(Array.isArray(result.finalWorld.battleResults)).toBe(true);
    for (const battleResult of result.finalWorld.battleResults) {
      expect(battleResult.schemaVersion).toBe("0.5.0");
      expect(battleResult.detailedLog).toBeDefined();
    }
    expect(
      result.validationReport.checks.find((check) => check.name === "event_envelope_0_2_0"),
    ).toMatchObject({ status: "passed", violationCount: 0 });

    const metadata = JSON.parse(
      readFileSync(join(result.atomic.runDirectory, "run-metadata.json"), "utf8"),
    ) as Sprint1RunMetadataDocument;
    const finalWorld = JSON.parse(
      readFileSync(join(result.atomic.runDirectory, "final-world.json"), "utf8"),
    ) as Sprint1FinalWorldDocument & Record<string, unknown>;
    const initialWorld = JSON.parse(
      readFileSync(join(result.atomic.runDirectory, "initial-world.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(metadata.simulationId).toBe(result.runMetadata.simulationId);
    expect(initialWorld["schemaVersion"]).toBe("0.4.0");
    expect(initialWorld["initialWeeklyTrainingSidecarSnapshot"]).toBeDefined();
    expect(initialWorld["runRuleSnapshot"]).toBeDefined();
    expect(finalWorld["worldRngState"]).toBeUndefined();
    expect(finalWorld["matchIdGeneratorState"]).toBeUndefined();
    expect(finalWorld["processorRuntimeStates"]).toBeUndefined();
    expect(finalWorld["eventAllocationState"]).toBeUndefined();
    expect(finalWorld["battleResultWeekState"]).toBeUndefined();
    expect(finalWorld["eventStream"]).toBeUndefined();

    const csv = parseYearlyStatisticsCsv(
      readFileSync(join(result.atomic.runDirectory, "yearly-statistics.csv"), "utf8"),
    );
    expect(csv.rows).toHaveLength(1);
    expect(csv.rows[0]?.["worldYear"]).toBe("1");

    const eventsText = readFileSync(join(result.atomic.runDirectory, "events.jsonl"), "utf8");
    const eventLines = eventsText.endsWith("\n") ? eventsText.slice(0, -1).split("\n") : [];
    expect(eventLines.length).toBeGreaterThan(0);
    for (const line of eventLines) {
      const event = JSON.parse(line) as {
        schemaVersion: string;
        sequence: number;
        payload: Record<string, unknown>;
      };
      expect(event.schemaVersion).toBe(SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION);
      expect(event.payload["detailedLog"]).toBeUndefined();
      expect(event.payload["actionLogs"]).toBeUndefined();
      expect(event.payload["turnOrderLogs"]).toBeUndefined();
    }
    for (let index = 0; index < eventLines.length; index += 1) {
      expect(JSON.parse(eventLines[index]!).sequence).toBe(index);
    }
  }, 120_000);

  it("uses Sprint1 event verification on atomic reload", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { createResult, nameDataHash } = buildFreshSession();
    const initialWorldSnapshot = createResult.initialWorldSnapshotForOutput;
    const simulation = expectOk(
      runSprint1SimulationWithYearlyCaptureResult({
        initialSession: createResult.session,
        years: 1,
        sha256Provider,
      }),
    );
    const built = buildAndWriteSprint1RunOutput({
      fs: createNodeFsOps(),
      outputRoot,
      runId: "run_20260801T000000000Z_0002" as RunId,
      cwd: dir,
      nameDataHash,
      nameDataVersion: initialWorldSnapshot.nameDataVersion,
      configSchemaVersion: "0.1.0",
      simulationSpecVersion: initialWorldSnapshot.simulationSpecVersion,
      performanceTargets: {
        warningSecondsFor600People100Years: 30,
        warningSecondsFor2000People100Years: 120,
        measureOnlyPopulation: 5000,
      },
      createResult,
      simulation,
      provider: sha256Provider,
      realStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
      totalMilliseconds: 1000,
    });

    const contents = Object.fromEntries(
      FIXED_OUTPUT_FILE_NAMES.map((name) => [
        name,
        readFileSync(join(built.atomic.runDirectory, name), "utf8"),
      ]),
    ) as Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string>;

    const verifier = createSprint1ReloadedRunOutputVerifier({
      provider: sha256Provider,
      session: simulation.finalSession,
      expectedContents: contents,
      expectedRunMetadata: built.runMetadata,
      expectedFinalWorld: built.finalWorld,
      expectedValidationReport: built.validationReport,
      initialWorldSnapshot: createResult.initialWorldSnapshotForOutput,
    });
    expect(() => verifier(contents)).not.toThrow();
    expect(() =>
      writeRunOutputAtomic({
        fs: createNodeFsOps(),
        outputRoot: join(dir, "output-b"),
        runId: "run_20260801T000000000Z_0003" as RunId,
        contents,
        verifyReloadedContents: verifier,
      }),
    ).not.toThrow();
  }, 120_000);

  it.each([
    {
      label: "run-metadata simulationId",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "run-metadata.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
        document["simulationId"] = "simulation_ffffffffffffffff";
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "final-world weeklyTrainingSidecars",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "final-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          weeklyTrainingSidecars: { entries: Array<Record<string, unknown>> };
        };
        document.weeklyTrainingSidecars.entries[0] = {
          ...document.weeklyTrainingSidecars.entries[0]!,
          motivationFactor: 10001,
        };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "events simulationIds",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "events.jsonl");
        const lines = readFileSync(file, "utf8").trimEnd().split("\n");
        writeFileSync(
          file,
          `${lines
            .map((line) =>
              toCanonicalJson({
                ...(JSON.parse(line) as Record<string, unknown>),
                simulationId: "simulation_ffffffffffffffff",
              }),
            )
            .join("\n")}\n`,
          "utf8",
        );
      },
    },
    {
      label: "initial-world sidecar",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "initial-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          initialWeeklyTrainingSidecarSnapshot: { entries: Array<Record<string, unknown>> };
        };
        document.initialWeeklyTrainingSidecarSnapshot.entries[0] = {
          ...document.initialWeeklyTrainingSidecarSnapshot.entries[0]!,
          motivationFactor: 10001,
        };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "final-world worldDate",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "final-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          worldDate: Record<string, unknown>;
        };
        document.worldDate = { ...document.worldDate, weekOfMonth: 2 };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "final-world person ability",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "final-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          persons: Array<{ abilities: { strength: { surfaceValue: number } } }>;
        };
        document.persons[0]!.abilities.strength.surfaceValue += 1;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "final-world family",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "final-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          families: Array<Record<string, unknown>>;
        };
        document.families[0] = { ...document.families[0]!, displayName: "altered-family" };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "final-world relationship",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "final-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          relationships: Array<Record<string, unknown>>;
        };
        document.relationships[0] = {
          ...document.relationships[0]!,
          relationshipId: "relationship_altered",
        };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "initial-world person ability",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "initial-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          persons: Array<{ abilities: { strength: { surfaceValue: number } } }>;
        };
        document.persons[0]!.abilities.strength.surfaceValue += 1;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "initial-world family",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "initial-world.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          families: Array<Record<string, unknown>>;
        };
        document.families[0] = { ...document.families[0]!, displayName: "altered-family" };
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "events payload",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "events.jsonl");
        const lines = readFileSync(file, "utf8").trimEnd().split("\n");
        const event = JSON.parse(lines[0]!) as { payload: Record<string, unknown> };
        lines[0] = toCanonicalJson({
          ...event,
          payload: { ...event.payload, corruptionMarker: "altered" },
        });
        writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
      },
    },
    {
      label: "run-metadata seed",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "run-metadata.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as { seed: number };
        document.seed += 1;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "run-metadata weeksExecuted",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "run-metadata.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as { weeksExecuted: number };
        document.weeksExecuted += 1;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "validation-report overallPassed",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "validation-report.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as { overallPassed: boolean };
        document.overallPassed = !document.overallPassed;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
    {
      label: "yearly-statistics numeric cell",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "yearly-statistics.csv");
        const lines = readFileSync(file, "utf8").trimEnd().split("\n");
        const cells = lines[1]!.split(",");
        cells[1] = String(Number(cells[1]) + 1);
        lines[1] = cells.join(",");
        writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
      },
    },
    {
      label: "performance timing",
      mutate: (tempDirectory: string) => {
        const file = join(tempDirectory, "performance.json");
        const document = JSON.parse(readFileSync(file, "utf8")) as {
          timing: { totalMilliseconds: number };
        };
        document.timing.totalMilliseconds += 1;
        writeFileSync(file, `${toCanonicalJson(document)}\n`, "utf8");
      },
    },
  ])(
    "rejects semantic afterTempWrite corruption: $label",
    ({ mutate }) => {
      const dir = makeTempDir();
      const outputRoot = join(dir, "output");
      const runId = "run_20260801T000000000Z_0004" as RunId;
      const { createResult, nameDataHash } = buildFreshSession(7004);
      const initialWorldSnapshot = createResult.initialWorldSnapshotForOutput;
      const simulation = expectOk(
        runSprint1SimulationWithYearlyCaptureResult({
          initialSession: createResult.session,
          years: 1,
          sha256Provider,
        }),
      );

      expect(() =>
        buildAndWriteSprint1RunOutput({
          fs: createNodeFsOps(),
          outputRoot,
          runId,
          cwd: dir,
          nameDataHash,
          nameDataVersion: initialWorldSnapshot.nameDataVersion,
          configSchemaVersion: "0.1.0",
          simulationSpecVersion: initialWorldSnapshot.simulationSpecVersion,
          performanceTargets: {
            warningSecondsFor600People100Years: 30,
            warningSecondsFor2000People100Years: 120,
            measureOnlyPopulation: 5000,
          },
          createResult,
          simulation,
          provider: sha256Provider,
          realStartedAt: new Date("2026-08-01T00:00:00.000Z"),
          realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
          totalMilliseconds: 1000,
          afterTempWrite: mutate,
        }),
      ).toThrow();
      expect(existsSync(join(outputRoot, runId))).toBe(false);
    },
    120_000,
  );

  it("persists a committed battle after the following weekly step", () => {
    const dir = makeTempDir();
    const outputRoot = join(dir, "output");
    const { createResult, nameDataHash } = buildFreshSession(7011);
    const committed = commitProductionBattle(createResult.session);
    expect(committed.runtimeState.battleResultWeekState.results).toHaveLength(1);
    expect(committed.runtimeState.battleResults).toHaveLength(1);
    const storedMatchId = committed.runtimeState.battleResults[0]!.matchId;
    const detailedLog = committed.runtimeState.battleResults[0]!.detailedLog;

    const stepped = expectOk(runSprint1WeeklyStep(committed, sha256Provider));
    expect(stepped.runtimeState.battleResultWeekState.results).toHaveLength(0);
    expect(stepped.runtimeState.battleResults).toHaveLength(1);
    expect(stepped.runtimeState.battleResults[0]!.matchId).toBe(storedMatchId);
    expect(stepped.runtimeState.battleResults[0]!.detailedLog).toEqual(detailedLog);

    const simulation = {
      finalSession: stepped,
      events: stepped.runtimeState.eventStream,
      yearEnds: [],
      weeksExecuted: 1,
      finalIntegrity: evaluateReferenceIntegrity(stepped.runtimeState.worldState),
    };
    const result = buildAndWriteSprint1RunOutput({
      fs: createNodeFsOps(),
      outputRoot,
      runId: "run_20260801T000000000Z_0011" as RunId,
      cwd: dir,
      nameDataHash,
      nameDataVersion: createResult.initialWorldSnapshotForOutput.nameDataVersion,
      configSchemaVersion: "0.1.0",
      simulationSpecVersion: createResult.initialWorldSnapshotForOutput.simulationSpecVersion,
      performanceTargets: {
        warningSecondsFor600People100Years: 30,
        warningSecondsFor2000People100Years: 120,
        measureOnlyPopulation: 5000,
      },
      createResult,
      simulation,
      provider: sha256Provider,
      realStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      realEndedAt: new Date("2026-08-01T00:00:01.000Z"),
      totalMilliseconds: 1000,
    });
    const reloaded = JSON.parse(
      readFileSync(join(result.atomic.runDirectory, "final-world.json"), "utf8"),
    ) as Sprint1FinalWorldDocument;
    expect(reloaded.battleResults).toHaveLength(1);
    expect(reloaded.battleResults).toEqual(stepped.runtimeState.battleResults);
    expect(reloaded.battleResults[0]!.detailedLog).toEqual(detailedLog);
    const battleEvents = result.allEvents.filter(
      (event) => event.eventType === "battle.started" || event.eventType === "battle.finished",
    );
    expect(battleEvents.map((event) => event.eventType)).toEqual([
      "battle.started",
      "battle.finished",
    ]);
    for (const event of battleEvents) expect(event.payload["detailedLog"]).toBeUndefined();
    expect(
      result.validationReport.checks.find((check) => check.name === "battle_results"),
    ).toMatchObject({ status: "passed", violationCount: 0 });
  });
});

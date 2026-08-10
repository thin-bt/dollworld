/**
 * Contract tests for S1-SPEC-0.1.20 S01-008 integration contracts clarification.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
  EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  S1_SPEC_VERSION,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
  SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  WEEKLY_SCORED_ACTIONS,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL,
  appendBattleResultToWeekState,
  appendCommittedBattleResultToRuntimeStores,
  assertBattleResultWeekMatchesWorldDate,
  assertBattleResultsWeekSuffixInvariant,
  cloneRuntimeState,
  computeInitialWeeklyTrainingSidecarHash,
  computeSimulationIdentityHash,
  computeSprint1ConfigHash,
  computeMatchIdGeneratorStateHash,
  computeTechniqueCatalogHash,
  countCompletedMatchesForPersonThisWorldWeek,
  createEventAllocationStateAfterPromotedInitialEvents,
  createExpectedSpecVersions,
  createInitialBattleResultWeekState,
  createInitialBattleResults,
  createInitialMatchIdGeneratorState,
  createInitialSprint1BattleWorldRngState,
  createInitialSprint1WeeklyTrainingProcessorRuntimeState,
  createInitialTrainingProcessorRuntimeState,
  createInitialWeeklyTrainingProcessorRuntimeParts,
  createRunRuleSnapshot,
  createSeededRng,
  createSimulationId,
  createSimulationIdFromIdentity,
  createSprint1RunContext,
  createWeeklyTrainingSidecarStateFromInitial,
  createDefaultSprint1ConfigInput,
  getDefaultSprint1Config,
  INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  FINAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  validateAndCloneProcessorRuntimeState,
  validateBattleResultWeekState,
  validateEventAllocationState,
  validateInitialWeeklyTrainingSidecarSnapshot,
  validateRunRuleSnapshotAgainstIdentity,
  validateSimulationIdentity,
  validateSprint1CliInput,
  validateSprint1RunContext,
  validateTechniqueDefinition,
  validateWeeklyTrainingSidecarState,
  type BattleResult,
  type SimulationIdentity,
  type Sprint1RunRuntimeState,
  type Sprint1WeeklyTrainingAdapterOutput,
  type ValidationResult,
  type WeeklyTrainingEventCandidate,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expectTypeOf } from "vitest";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
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

function sidecarEntry(
  personId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
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
    ...overrides,
  };
}

function sidecarSnapshot(
  entries: ReadonlyArray<Record<string, unknown>> = [
    sidecarEntry("person_0000000000000001"),
    sidecarEntry("person_0000000000000002"),
  ],
): Record<string, unknown> {
  return {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: [...entries],
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

function sampleIdentity(overrides: Partial<SimulationIdentity> = {}): SimulationIdentity {
  const configInput = createDefaultSprint1ConfigInput();
  const sprint1ConfigHashResult = computeSprint1ConfigHash(configInput, sha256Provider);
  if (!sprint1ConfigHashResult.ok) {
    throw new Error("expected default Sprint1Config hash to succeed");
  }
  const hex = "a".repeat(64);
  return {
    schemaVersion: "0.4.0",
    seed: 12345,
    initialWorldConfigHash: hex,
    sprint1ConfigHash: sprint1ConfigHashResult.value,
    techniqueCatalogHash: hex,
    initialWeeklyTrainingSidecarHash: hex,
    battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
    matchIdGeneratorVersion: "match-id-generator-0.1.0",
    initialMatchIdGeneratorStateHash: hex,
    defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
    specVersions: createExpectedSpecVersions(),
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
    ...overrides,
  };
}

describe("S1-SPEC-0.1.20 version registry and weekly-training literal", () => {
  it("publishes S1-SPEC-0.1.20 and SimulationIdentity 0.4.0", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.20");
    expect(SIMULATION_IDENTITY_SCHEMA_VERSION).toBe("0.4.0");
    expect(SPRINT1_CLI_INPUT_SCHEMA_VERSION).toBe("0.1.0");
    expect(INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION).toBe("0.1.0");
  });

  it("fixes WEEKLY_TRAINING_PROCESSOR_ID to weekly-training", () => {
    expect(WEEKLY_TRAINING_PROCESSOR_ID).toBe("weekly-training");
  });
});

describe("InitialWeeklyTrainingSidecarSnapshot", () => {
  it("accepts a valid ascending snapshot", () => {
    const result = validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot());
    if (!result.ok) {
      throw new Error(`sidecar invalid: ${JSON.stringify(result.issues)}`);
    }
    expect(result.value.entries).toHaveLength(2);
    expect(result.value.entries[0]?.personId).toBe("person_0000000000000001");
  });

  it("rejects duplicate PersonId", () => {
    const result = validateInitialWeeklyTrainingSidecarSnapshot(
      sidecarSnapshot([
        sidecarEntry("person_0000000000000001"),
        sidecarEntry("person_0000000000000001"),
      ]),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unordered PersonId entries", () => {
    const result = validateInitialWeeklyTrainingSidecarSnapshot(
      sidecarSnapshot([
        sidecarEntry("person_0000000000000002"),
        sidecarEntry("person_0000000000000001"),
      ]),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects malformed fields", () => {
    const result = validateInitialWeeklyTrainingSidecarSnapshot(
      sidecarSnapshot([sidecarEntry("person_0000000000000001", { growthProfile: "unknown" })]),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects missing motivationFactor without defaulting to 10000", () => {
    const entry = sidecarEntry("person_0000000000000001");
    delete entry["motivationFactor"];
    const result = validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot([entry]));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.path.includes("motivationFactor"))).toBe(true);
  });
});

describe("SimulationIdentity 0.4.0 and sidecar hash binding", () => {
  it("accepts 0.4.0 identity and rejects 0.3.0 as new Sprint1 identity", () => {
    expect(validateSimulationIdentity(sampleIdentity()).ok).toBe(true);
    const legacy = {
      ...sampleIdentity(),
      schemaVersion: "0.3.0",
    };
    delete (legacy as { initialWeeklyTrainingSidecarHash?: string })
      .initialWeeklyTrainingSidecarHash;
    expect(validateSimulationIdentity(legacy).ok).toBe(false);
  });

  it("changes simulationIdentityHash and simulationId when sidecar hash changes", () => {
    const a = expectOk(validateSimulationIdentity(sampleIdentity()));
    const b = expectOk(
      validateSimulationIdentity(
        sampleIdentity({ initialWeeklyTrainingSidecarHash: "b".repeat(64) }),
      ),
    );
    const hashA = expectOk(computeSimulationIdentityHash(a, sha256Provider));
    const hashB = expectOk(computeSimulationIdentityHash(b, sha256Provider));
    expect(hashA).not.toBe(hashB);
    const idA = expectOk(createSimulationIdFromIdentity(a, sha256Provider));
    const idB = expectOk(createSimulationIdFromIdentity(b, sha256Provider));
    expect(idA).not.toBe(idB);
  });

  it("binds sidecar content hash into identity materials", () => {
    const snap = sidecarSnapshot();
    const sidecarHash = expectOk(computeInitialWeeklyTrainingSidecarHash(snap, sha256Provider));
    const identity = expectOk(
      validateSimulationIdentity(sampleIdentity({ initialWeeklyTrainingSidecarHash: sidecarHash })),
    );
    expect(identity.initialWeeklyTrainingSidecarHash).toBe(sidecarHash);
  });

  it("keeps validateRunRuleSnapshotAgainstIdentity consistent with SimulationIdentity 0.4.0", () => {
    const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
    const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
    const generator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: 12345,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const generatorHash = expectOk(computeMatchIdGeneratorStateHash(generator, sha256Provider));
    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          seed: 12345,
          techniqueCatalogHash: catalogHash,
          initialMatchIdGeneratorStateHash: generatorHash,
        }),
      ),
    );
    const identityHash = expectOk(computeSimulationIdentityHash(identity, sha256Provider));
    const snapshot = expectOk(
      createRunRuleSnapshot(
        {
          simulationIdentity: identity,
          simulationIdentityHash: identityHash,
          initialMatchIdGeneratorState: generator,
          sprint1Config: getDefaultSprint1Config(),
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions: [def],
        },
        sha256Provider,
      ),
    );
    const against = validateRunRuleSnapshotAgainstIdentity(
      snapshot,
      identity,
      identityHash,
      generator,
      sha256Provider,
    );
    expect(against.ok).toBe(true);
  });
});

describe("Sprint1CliInput", () => {
  function buildValidCliInput(): Record<string, unknown> {
    const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
    const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
    return {
      schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
      sprint1Config: createDefaultSprint1ConfigInput(),
      techniqueCatalog: {
        identity: { dataVersion: "techniques-0.1.0", catalogHash },
        definitions: [def],
      },
      initialWeeklyTrainingSidecar: sidecarSnapshot([sidecarEntry("person_0000000000000001")]),
    };
  }

  it("accepts valid Sprint1CliInput", () => {
    const result = validateSprint1CliInput(buildValidCliInput(), sha256Provider);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sprint1Config.configVersion).toBe(getDefaultSprint1Config().configVersion);
  });

  it("rejects unknown keys", () => {
    const input = { ...buildValidCliInput(), extra: true };
    expect(validateSprint1CliInput(input, sha256Provider).ok).toBe(false);
  });

  it("rejects malformed config/catalog/sidecar", () => {
    expect(
      validateSprint1CliInput(
        {
          schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
          sprint1Config: { not: "a config" },
          techniqueCatalog: { identity: {}, definitions: [] },
          initialWeeklyTrainingSidecar: { schemaVersion: "0.1.0", entries: "bad" },
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("keeps Sprint 0 createSimulationId API unchanged", () => {
    const materialHash = createHash("sha256").update("sprint0-material", "utf8").digest("hex");
    const id = createSimulationId(materialHash, 1, materialHash, sha256Provider);
    expect(id).toMatch(/^simulation_[0-9a-f]{16}$/);
  });
});

describe("EventAllocationState 0.1.0 foundation", () => {
  it("accepts a valid allocation state", () => {
    const result = validateEventAllocationState({
      schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
      nextSequence: 12,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextSequence).toBe(12);
  });

  it("sets nextSequence to promoted initial event count (0..N-1 ⇒ N)", () => {
    const result = createEventAllocationStateAfterPromotedInitialEvents(7);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nextSequence).toBe(7);
  });

  it("rejects negative nextSequence", () => {
    expect(
      validateEventAllocationState({
        schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
        nextSequence: -1,
      }).ok,
    ).toBe(false);
  });

  it("rejects unsafe integer nextSequence", () => {
    expect(
      validateEventAllocationState({
        schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
        nextSequence: Number.MAX_SAFE_INTEGER + 1,
      }).ok,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      validateEventAllocationState({
        schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
        nextSequence: 0,
        extra: true,
      }).ok,
    ).toBe(false);
  });
});

describe("S1-SPEC-0.1.20 docs contract audit (fix1)", () => {
  async function readRepo(relativePath: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
  }

  it("documents fresh Sprint1 initialization promotion (not Sprint0 migration)", async () => {
    const config = await readRepo("docs/specs/02-config-schema.md");
    expect(config).toContain("fresh Sprint 1 initialization promotion");
    expect(config).toContain("provisional simulationId");
    expect(config).toContain("entities.matchIds");
    expect(config).toContain("[]");
    expect(config).toMatch(/保存済みSprint 0|archived.*Sprint 0|migrationではない/);
    expect(config).toContain("EventAllocationState");
    expect(config).toContain("nextSequence");
    expect(config).toContain("promotedInitialEvents.length");
  });

  it("keeps current-state pages free of stale S01-007 audit wording", async () => {
    const paths = [
      "docs/SPRINT_1_BACKLOG.md",
      "docs/SPEC_PREPARATION_PLAN.md",
      "docs/wiki/index.md",
      "docs/wiki/tasks/S01-007.md",
      "docs/wiki/tasks/index.md",
      "docs/wiki/sprints/sprint1.md",
      "docs/wiki/architecture/sprint1-processing-flow.md",
      "docs/wiki/architecture/battle-lifecycle.md",
      "docs/wiki/invariants/battle-turn-resolution.md",
      "docs/wiki/invariants/index.md",
      "docs/wiki/decisions/sprint1-spec-baseline.md",
      "docs/wiki/contradictions.md",
    ];
    for (const path of paths) {
      const text = await readRepo(path);
      expect(text, path).not.toMatch(/S01-007[^\n]{0,80}受入監査中/);
      expect(text, path).not.toMatch(/S01-007[^\n]{0,80}未commit/);
      expect(text, path).not.toMatch(/次(の実装着手)?タスクは\s*S01-007/);
      expect(text, path).not.toMatch(/次はS01-007/);
      expect(text, path).not.toMatch(/BattleResultは未実装/);
      expect(text, path).toMatch(
        /a39e476|S01-007.*implemented|S01-007.*実装済み|implemented \/ accepted/,
      );
    }
  });

  it("does not invent a SimulationIdentity 0.3.0 legacy reader module", async () => {
    const config = await readRepo("docs/specs/02-config-schema.md");
    expect(config).not.toMatch(/legacy SimulationIdentity 0\.3\.0 readerは削除しない/);
    expect(config).toMatch(
      /0\.3\.0専用.*legacy reader|0\.3\.0.*public legacy reader|repositoryに0\.3\.0専用/,
    );
    expect(config).toContain("validateSimulationIdentity");
    expect(config).toContain("0.4.0");
  });
});

function stubBattleResult(input: {
  matchId: string;
  resultKind: "completed" | "failed";
  personA: string;
  personB: string;
}): BattleResult {
  return {
    matchId: input.matchId,
    resultKind: input.resultKind,
    endReason: input.resultKind === "failed" ? "resolution_error" : "knockout",
    finalState: {
      participantA: { personId: input.personA },
      participantB: { personId: input.personB },
    },
  } as unknown as BattleResult;
}

describe("BattleResultWeekState 0.1.0 foundation", () => {
  it("creates fresh state with empty results", () => {
    const result = createInitialBattleResultWeekState(12);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schemaVersion).toBe(BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION);
    expect(result.value.absoluteWeek).toBe(12);
    expect(result.value.results).toEqual([]);
  });

  it("rejects negative absoluteWeek", () => {
    expect(
      validateBattleResultWeekState(
        { schemaVersion: "0.1.0", absoluteWeek: -1, results: [] },
        undefined,
        undefined,
      ).ok,
    ).toBe(false);
  });

  it("rejects unsafe absoluteWeek", () => {
    expect(
      validateBattleResultWeekState(
        {
          schemaVersion: "0.1.0",
          absoluteWeek: Number.MAX_SAFE_INTEGER + 1,
          results: [],
        },
        undefined,
        undefined,
      ).ok,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      validateBattleResultWeekState(
        { schemaVersion: "0.1.0", absoluteWeek: 0, results: [], extra: true },
        undefined,
        undefined,
      ).ok,
    ).toBe(false);
  });

  it("counts completed matches per participant and ignores unrelated persons", () => {
    const fresh = expectOk(createInitialBattleResultWeekState(5));
    const withOne = expectOk(
      appendBattleResultToWeekState(
        fresh,
        stubBattleResult({
          matchId: "match_000000000001",
          resultKind: "completed",
          personA: "person_a",
          personB: "person_b",
        }),
      ),
    );
    expect(countCompletedMatchesForPersonThisWorldWeek(withOne, "person_a")).toBe(1);
    expect(countCompletedMatchesForPersonThisWorldWeek(withOne, "person_b")).toBe(1);
    expect(countCompletedMatchesForPersonThisWorldWeek(withOne, "person_c")).toBe(0);
  });

  it("allows different prior completed counts for A and B", () => {
    let state = expectOk(createInitialBattleResultWeekState(5));
    state = expectOk(
      appendBattleResultToWeekState(
        state,
        stubBattleResult({
          matchId: "match_000000000001",
          resultKind: "completed",
          personA: "person_a",
          personB: "person_x",
        }),
      ),
    );
    expect(countCompletedMatchesForPersonThisWorldWeek(state, "person_a")).toBe(1);
    expect(countCompletedMatchesForPersonThisWorldWeek(state, "person_b")).toBe(0);
  });

  it("registers resolution_error without counting as completed", () => {
    let state = expectOk(createInitialBattleResultWeekState(5));
    state = expectOk(
      appendBattleResultToWeekState(
        state,
        stubBattleResult({
          matchId: "match_000000000002",
          resultKind: "failed",
          personA: "person_a",
          personB: "person_b",
        }),
      ),
    );
    expect(state.results).toHaveLength(1);
    expect(state.results[0]?.resultKind).toBe("failed");
    expect(countCompletedMatchesForPersonThisWorldWeek(state, "person_a")).toBe(0);
    expect(countCompletedMatchesForPersonThisWorldWeek(state, "person_b")).toBe(0);
  });

  it("rejects duplicate matchId registration", () => {
    const fresh = expectOk(createInitialBattleResultWeekState(5));
    const first = stubBattleResult({
      matchId: "match_000000000003",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const withOne = expectOk(appendBattleResultToWeekState(fresh, first));
    expect(appendBattleResultToWeekState(withOne, first).ok).toBe(false);
  });

  it("creates empty results for a new week absoluteWeek", () => {
    const next = expectOk(createInitialBattleResultWeekState(6));
    expect(next.results).toEqual([]);
    expect(next.absoluteWeek).toBe(6);
  });
});

describe("BattleResults run-wide store / week suffix invariant (fix5)", () => {
  it("fresh: battleResults=[] and week.results=[]", () => {
    const global = createInitialBattleResults();
    const week = expectOk(createInitialBattleResultWeekState(1));
    expect(global).toEqual([]);
    expect(week.results).toEqual([]);
    expect(
      assertBattleResultsWeekSuffixInvariant({
        battleResults: global,
        battleResultWeekState: week,
      }).ok,
    ).toBe(true);
  });

  it("completed commit: both stores hold [A]", () => {
    const a = stubBattleResult({
      matchId: "match_00000000000a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const week0 = expectOk(createInitialBattleResultWeekState(1));
    const next = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: week0,
        result: a,
      }),
    );
    expect(next.battleResults).toHaveLength(1);
    expect(next.battleResultWeekState.results).toHaveLength(1);
    expect(next.battleResults[0]).toEqual(a);
    expect(next.battleResultWeekState.results[0]).toEqual(a);
  });

  it("same week two battles: both stores hold [A,B]", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    let stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(2)),
        result: a,
      }),
    );
    stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: stores.battleResults,
        battleResultWeekState: stores.battleResultWeekState,
        result: b,
      }),
    );
    expect(stores.battleResults.map((r) => r.matchId)).toEqual(["match_a", "match_b"]);
    expect(stores.battleResultWeekState.results.map((r) => r.matchId)).toEqual([
      "match_a",
      "match_b",
    ]);
  });

  it("week advance keeps global battleResults and clears week.results", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    let stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(2)),
        result: a,
      }),
    );
    stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: stores.battleResults,
        battleResultWeekState: stores.battleResultWeekState,
        result: b,
      }),
    );
    const resetWeek = expectOk(createInitialBattleResultWeekState(3));
    expect(stores.battleResults).toHaveLength(2);
    expect(resetWeek.results).toEqual([]);
    expect(
      assertBattleResultsWeekSuffixInvariant({
        battleResults: stores.battleResults,
        battleResultWeekState: resetWeek,
      }).ok,
    ).toBe(true);
  });

  it("new week one battle: global=[A,B,C] week=[C]", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    const c = stubBattleResult({
      matchId: "match_c",
      resultKind: "completed",
      personA: "person_e",
      personB: "person_f",
    });
    let stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(2)),
        result: a,
      }),
    );
    stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: stores.battleResults,
        battleResultWeekState: stores.battleResultWeekState,
        result: b,
      }),
    );
    const newWeek = expectOk(createInitialBattleResultWeekState(3));
    stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: stores.battleResults,
        battleResultWeekState: newWeek,
        result: c,
      }),
    );
    expect(stores.battleResults.map((r) => r.matchId)).toEqual(["match_a", "match_b", "match_c"]);
    expect(stores.battleResultWeekState.results.map((r) => r.matchId)).toEqual(["match_c"]);
  });

  it("rejects week.results that are not the global suffix", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    const stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(1)),
        result: a,
      }),
    );
    const mismatchedWeek = expectOk(appendBattleResultToWeekState(stores.battleResultWeekState, b));
    expect(
      assertBattleResultsWeekSuffixInvariant({
        battleResults: stores.battleResults,
        battleResultWeekState: mismatchedWeek,
      }).ok,
    ).toBe(false);
  });

  it("rejects global-only append against week suffix invariant", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    const withA = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(1)),
        result: a,
      }),
    );
    // Illegal global-only append: week still [A], global becomes [A,B]
    // suffix of length 1 is [B] !== [A]
    const globalOnly = [...withA.battleResults, b];
    expect(
      assertBattleResultsWeekSuffixInvariant({
        battleResults: globalOnly,
        battleResultWeekState: withA.battleResultWeekState,
      }).ok,
    ).toBe(false);
  });

  it("rejects week-only append against week suffix invariant", () => {
    const a = stubBattleResult({
      matchId: "match_a",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const b = stubBattleResult({
      matchId: "match_b",
      resultKind: "completed",
      personA: "person_c",
      personB: "person_d",
    });
    const withA = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(1)),
        result: a,
      }),
    );
    const weekOnly = expectOk(appendBattleResultToWeekState(withA.battleResultWeekState, b));
    expect(
      assertBattleResultsWeekSuffixInvariant({
        battleResults: withA.battleResults,
        battleResultWeekState: weekOnly,
      }).ok,
    ).toBe(false);
  });

  it("rejects duplicate matchId in global store", () => {
    const a = stubBattleResult({
      matchId: "match_dup",
      resultKind: "completed",
      personA: "person_a",
      personB: "person_b",
    });
    const withA = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(1)),
        result: a,
      }),
    );
    const before = withA.battleResults;
    const rejected = appendCommittedBattleResultToRuntimeStores({
      battleResults: withA.battleResults,
      battleResultWeekState: withA.battleResultWeekState,
      result: a,
    });
    expect(rejected.ok).toBe(false);
    expect(withA.battleResults).toBe(before);
    expect(withA.battleResults).toHaveLength(1);
  });

  it("resolution_error registers in both stores with completed count +0", () => {
    const failed = stubBattleResult({
      matchId: "match_fail",
      resultKind: "failed",
      personA: "person_a",
      personB: "person_b",
    });
    const stores = expectOk(
      appendCommittedBattleResultToRuntimeStores({
        battleResults: createInitialBattleResults(),
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(4)),
        result: failed,
      }),
    );
    expect(stores.battleResults).toHaveLength(1);
    expect(stores.battleResultWeekState.results).toHaveLength(1);
    expect(
      countCompletedMatchesForPersonThisWorldWeek(stores.battleResultWeekState, "person_a"),
    ).toBe(0);
  });

  it("documents pre_start_failure and abort as non-append (no BattleResult)", () => {
    // pre_start / abort do not produce a BattleResult; stores stay empty.
    const global = createInitialBattleResults();
    const week = expectOk(createInitialBattleResultWeekState(1));
    expect(global).toEqual([]);
    expect(week.results).toEqual([]);
  });

  it("types Sprint1RunRuntimeState.battleResults as BattleResult[]", () => {
    expectTypeOf<Sprint1RunRuntimeState["battleResults"]>().toEqualTypeOf<BattleResult[]>();
  });
});

describe("Sprint1 battle World RNG and weekly-training processor RNG", () => {
  it("fixes battle World RNG label", () => {
    expect(SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL).toBe("battle/world-rng");
  });

  it("derives stable battle World RNG state from runSeed", () => {
    const a = createInitialSprint1BattleWorldRngState(42);
    const b = createInitialSprint1BattleWorldRngState(42);
    expect(a).toEqual(b);
  });

  it("changes battle World RNG state when runSeed changes", () => {
    const a = createInitialSprint1BattleWorldRngState(42);
    const b = createInitialSprint1BattleWorldRngState(43);
    expect(a).not.toEqual(b);
  });

  it("does not consume caller/global RNG when creating battle World RNG state", () => {
    const probe = createSeededRng(99);
    const before = probe.exportState();
    createInitialSprint1BattleWorldRngState(7);
    expect(probe.exportState()).toEqual(before);
  });

  it("fixes weekly-training processor RNG label", () => {
    expect(WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL).toBe("processor/weekly-training");
  });

  it("derives stable weekly-training RNG state from runSeed", () => {
    const a = createInitialWeeklyTrainingProcessorRuntimeParts(42);
    const b = createInitialWeeklyTrainingProcessorRuntimeParts(42);
    expect(a.rngState).toEqual(b.rngState);
  });

  it("changes weekly-training RNG state when runSeed changes", () => {
    const a = createInitialWeeklyTrainingProcessorRuntimeParts(42);
    const b = createInitialWeeklyTrainingProcessorRuntimeParts(43);
    expect(a.rngState).not.toEqual(b.rngState);
  });

  it("keeps battle World RNG and weekly-training RNG streams distinct for the same seed", () => {
    const battle = createInitialSprint1BattleWorldRngState(42);
    const weekly = createInitialWeeklyTrainingProcessorRuntimeParts(42).rngState;
    expect(battle).not.toEqual(weekly);
  });

  it("reuses createInitialTrainingProcessorRuntimeState for weekly-training specific state", () => {
    const parts = createInitialWeeklyTrainingProcessorRuntimeParts(1);
    expect(parts.specificState).toEqual(createInitialTrainingProcessorRuntimeState());
    expect(parts.processorId).toBe(WEEKLY_TRAINING_PROCESSOR_ID);
    const collection = createInitialSprint1WeeklyTrainingProcessorRuntimeState(1);
    expect(collection.processorOrder).toEqual([WEEKLY_TRAINING_PROCESSOR_ID]);
    expect(collection.processorSpecificStates?.[0]?.specificState).toEqual(parts.specificState);
  });
});

describe("S1-SPEC-0.1.20 docs contract audit (fix2)", () => {
  async function readRepo(relativePath: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
  }

  it("documents processorRuntimeStates and battleResultWeekState owners", async () => {
    const training = await readRepo("docs/specs/10-training-and-learning.md");
    expect(training).toContain("processorRuntimeStates");
    expect(training).toContain("battleResultWeekState");
    expect(training).toContain("BattleResultWeekState");
  });

  it("does not equate matchesCompleted with results.length", async () => {
    const training = await readRepo("docs/specs/10-training-and-learning.md");
    const battle = await readRepo("docs/specs/12-battle-turn-resolution.md");
    const joined = `${training}\n${battle}`;
    expect(joined).not.toMatch(/matchesCompletedThisWorldWeekBeforeBattle\s*=\s*results\.length/);
    expect(joined).toMatch(/results\.length`?ではない|results\.lengthではない/);
  });

  it("documents that resolution_error is registered but not counted as completed", async () => {
    const training = await readRepo("docs/specs/10-training-and-learning.md");
    expect(training).toMatch(/resolution_error/);
    expect(training).toMatch(
      /completed.*加算しない|加算しない.*completed|matchesCompleted.*加算しない/,
    );
  });

  it("documents the 21-step fresh Sprint1 new-run initialization order", async () => {
    const config = await readRepo("docs/specs/02-config-schema.md");
    expect(config).toContain("21.");
    expect(config).toMatch(
      /weekly-training.*adapter pipeline|Sprint1 transactional processor adapter pipeline|production processor登録/,
    );
    expect(config).toContain("battle/world-rng");
    expect(config).toContain("processor/weekly-training");
    expect(config).toContain("BattleResultWeekState");
  });
});

describe("S1-SPEC-0.1.20 processorSpecificStates deep clone (fix3)", () => {
  function mutableWeeklyRuntime(): {
    processorOrder: string[];
    rngStates: {
      processorId: string;
      state: ReturnType<typeof createSeededRng>["exportState"] extends () => infer R ? R : never;
    }[];
    processorSpecificStates: {
      processorId: string;
      specificState: { schemaVersion: string; actionCounts: Record<string, number> };
    }[];
  } {
    return {
      processorOrder: [WEEKLY_TRAINING_PROCESSOR_ID],
      rngStates: [
        {
          processorId: WEEKLY_TRAINING_PROCESSOR_ID,
          state: createSeededRng(7).exportState(),
        },
      ],
      processorSpecificStates: [
        {
          processorId: WEEKLY_TRAINING_PROCESSOR_ID,
          specificState: {
            schemaVersion: "0.1.0",
            actionCounts: { train_stat: 1, rest: 0 },
          },
        },
      ],
    };
  }

  it("deep-clones nested specificState without aliasing", () => {
    const source = mutableWeeklyRuntime();
    const cloned = validateAndCloneProcessorRuntimeState(source, [WEEKLY_TRAINING_PROCESSOR_ID]);
    const sourceSpecific = source.processorSpecificStates[0]!.specificState;
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    expect(clonedSpecific).not.toBe(sourceSpecific);
    expect(clonedSpecific.actionCounts).not.toBe(sourceSpecific.actionCounts);
  });

  it("keeps clone stable when source nested values mutate", () => {
    const source = mutableWeeklyRuntime();
    const cloned = cloneRuntimeState(source);
    source.processorSpecificStates[0]!.specificState.actionCounts.train_stat = 99;
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    expect(clonedSpecific.actionCounts.train_stat).toBe(1);
  });

  it("keeps source stable when clone nested values mutate", () => {
    const source = mutableWeeklyRuntime();
    const cloned = cloneRuntimeState(source);
    const clonedSpecific = cloned.processorSpecificStates![0]!.specificState as {
      actionCounts: Record<string, number>;
    };
    clonedSpecific.actionCounts.train_stat = 77;
    expect(source.processorSpecificStates[0]!.specificState.actionCounts.train_stat).toBe(1);
  });

  it("rejects nested getters without invoking them", () => {
    let calls = 0;
    const specificState = {};
    Object.defineProperty(specificState, "actionCounts", {
      enumerable: true,
      get() {
        calls += 1;
        return {};
      },
    });
    expect(() =>
      validateAndCloneProcessorRuntimeState(
        {
          processorOrder: [WEEKLY_TRAINING_PROCESSOR_ID],
          rngStates: [
            {
              processorId: WEEKLY_TRAINING_PROCESSOR_ID,
              state: createSeededRng(1).exportState(),
            },
          ],
          processorSpecificStates: [{ processorId: WEEKLY_TRAINING_PROCESSOR_ID, specificState }],
        },
        [WEEKLY_TRAINING_PROCESSOR_ID],
      ),
    ).toThrow();
    expect(calls).toBe(0);
  });

  it("rejects throwing getters without invoking them", () => {
    let calls = 0;
    const specificState = {};
    Object.defineProperty(specificState, "x", {
      enumerable: true,
      get() {
        calls += 1;
        throw new Error("no");
      },
    });
    expect(() =>
      validateAndCloneProcessorRuntimeState(
        {
          processorOrder: [WEEKLY_TRAINING_PROCESSOR_ID],
          rngStates: [
            {
              processorId: WEEKLY_TRAINING_PROCESSOR_ID,
              state: createSeededRng(1).exportState(),
            },
          ],
          processorSpecificStates: [{ processorId: WEEKLY_TRAINING_PROCESSOR_ID, specificState }],
        },
        [WEEKLY_TRAINING_PROCESSOR_ID],
      ),
    ).toThrow();
    expect(calls).toBe(0);
  });

  it("rejects cycles, sparse arrays, function/symbol/bigint, and non-finite numbers", () => {
    const baseRng = createSeededRng(1).exportState();
    const wrap = (specificState: unknown) => ({
      processorOrder: [WEEKLY_TRAINING_PROCESSOR_ID],
      rngStates: [{ processorId: WEEKLY_TRAINING_PROCESSOR_ID, state: baseRng }],
      processorSpecificStates: [{ processorId: WEEKLY_TRAINING_PROCESSOR_ID, specificState }],
    });
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic["self"] = cyclic;
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap(cyclic), [WEEKLY_TRAINING_PROCESSOR_ID]),
    ).toThrow();
    const sparse: unknown[] = [];
    sparse[2] = 1;
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ items: sparse }), [
        WEEKLY_TRAINING_PROCESSOR_ID,
      ]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ f: () => 0 }), [WEEKLY_TRAINING_PROCESSOR_ID]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ s: Symbol("s") }), [
        WEEKLY_TRAINING_PROCESSOR_ID,
      ]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ b: 1n }), [WEEKLY_TRAINING_PROCESSOR_ID]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ n: Number.NaN }), [
        WEEKLY_TRAINING_PROCESSOR_ID,
      ]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ n: Number.POSITIVE_INFINITY }), [
        WEEKLY_TRAINING_PROCESSOR_ID,
      ]),
    ).toThrow();
    expect(() =>
      validateAndCloneProcessorRuntimeState(wrap({ n: Number.NEGATIVE_INFINITY }), [
        WEEKLY_TRAINING_PROCESSOR_ID,
      ]),
    ).toThrow();
  });

  it("keeps Sprint0 omission and empty [] compatible", () => {
    const omitted = validateAndCloneProcessorRuntimeState(
      {
        processorOrder: ["alpha"],
        rngStates: [{ processorId: "alpha", state: createSeededRng(1).exportState() }],
      },
      ["alpha"],
    );
    expect(omitted.processorSpecificStates).toBeUndefined();
    const empty = validateAndCloneProcessorRuntimeState(
      {
        processorOrder: ["alpha"],
        rngStates: [{ processorId: "alpha", state: createSeededRng(1).exportState() }],
        processorSpecificStates: [],
      },
      ["alpha"],
    );
    expect(empty.processorSpecificStates).toEqual([]);
  });
});

describe("S1-SPEC-0.1.20 Sprint1RunContext / sidecar / docs (fix3)", () => {
  function buildContextMaterials() {
    const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
    const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
    const generator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: 12345,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const generatorHash = expectOk(computeMatchIdGeneratorStateHash(generator, sha256Provider));
    const config = getDefaultSprint1Config();
    const configHash = expectOk(
      computeSprint1ConfigHash(createDefaultSprint1ConfigInput(), sha256Provider),
    );
    const sidecar = expectOk(validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot()));
    const sidecarHash = expectOk(computeInitialWeeklyTrainingSidecarHash(sidecar, sha256Provider));
    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          seed: 12345,
          sprint1ConfigHash: configHash,
          techniqueCatalogHash: catalogHash,
          initialMatchIdGeneratorStateHash: generatorHash,
          initialWeeklyTrainingSidecarHash: sidecarHash,
        }),
      ),
    );
    const identityHash = expectOk(computeSimulationIdentityHash(identity, sha256Provider));
    const simulationId = expectOk(createSimulationIdFromIdentity(identity, sha256Provider));
    const snapshot = expectOk(
      createRunRuleSnapshot(
        {
          simulationIdentity: identity,
          simulationIdentityHash: identityHash,
          initialMatchIdGeneratorState: generator,
          sprint1Config: config,
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions: [def],
        },
        sha256Provider,
      ),
    );
    return {
      def,
      catalogHash,
      generator,
      config,
      sidecar,
      sidecarHash,
      identity,
      identityHash,
      simulationId,
      snapshot,
      techniqueCatalog: {
        identity: { dataVersion: "techniques-0.1.0", catalogHash },
        definitions: [def],
      },
    };
  }

  function contextInput(m: ReturnType<typeof buildContextMaterials>) {
    return {
      sprint1Config: m.config,
      techniqueCatalog: m.techniqueCatalog,
      initialWeeklyTrainingSidecarSnapshot: m.sidecar,
      simulationIdentity: m.identity,
      simulationIdentityHash: m.identityHash,
      simulationId: m.simulationId,
      runRuleSnapshot: m.snapshot,
      runRuleSnapshotHash: m.snapshot.runRuleSnapshotHash,
    };
  }

  it("accepts Sprint1RunContext with valid cross references", () => {
    const m = buildContextMaterials();
    const result = createSprint1RunContext(contextInput(m), sha256Provider);
    expect(result.ok).toBe(true);
  });

  it("rejects Sprint1Config hash mismatch", () => {
    const m = buildContextMaterials();
    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          ...m.identity,
          sprint1ConfigHash: "c".repeat(64),
        }),
      ),
    );
    const result = createSprint1RunContext(
      { ...contextInput(m), simulationIdentity: identity },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects TechniqueCatalog hash mismatch", () => {
    const m = buildContextMaterials();
    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          ...m.identity,
          techniqueCatalogHash: "d".repeat(64),
          sprint1ConfigHash: m.identity.sprint1ConfigHash,
          initialMatchIdGeneratorStateHash: m.identity.initialMatchIdGeneratorStateHash,
          initialWeeklyTrainingSidecarHash: m.identity.initialWeeklyTrainingSidecarHash,
        }),
      ),
    );
    const result = createSprint1RunContext(
      { ...contextInput(m), simulationIdentity: identity },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects SimulationIdentity hash mismatch", () => {
    const m = buildContextMaterials();
    const result = createSprint1RunContext(
      { ...contextInput(m), simulationIdentityHash: "e".repeat(64) },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects simulationId mismatch", () => {
    const m = buildContextMaterials();
    const result = createSprint1RunContext(
      { ...contextInput(m), simulationId: "simulation_deadbeefdeadbeef" },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects RunRuleSnapshot / Identity mismatch", () => {
    const m = buildContextMaterials();
    const otherIdentity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          ...m.identity,
          seed: 99999,
          sprint1ConfigHash: m.identity.sprint1ConfigHash,
          techniqueCatalogHash: m.identity.techniqueCatalogHash,
          initialMatchIdGeneratorStateHash: m.identity.initialMatchIdGeneratorStateHash,
          initialWeeklyTrainingSidecarHash: m.identity.initialWeeklyTrainingSidecarHash,
        }),
      ),
    );
    const result = createSprint1RunContext(
      { ...contextInput(m), simulationIdentity: otherIdentity },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects runRuleSnapshotHash mismatch", () => {
    const m = buildContextMaterials();
    const result = createSprint1RunContext(
      { ...contextInput(m), runRuleSnapshotHash: "f".repeat(64) },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("fresh current sidecar deep-equals initial but does not share references", () => {
    const initial = expectOk(validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot()));
    const current = expectOk(createWeeklyTrainingSidecarStateFromInitial(initial));
    expect(current).toEqual(initial);
    expect(current).not.toBe(initial);
    expect(current.entries).not.toBe(initial.entries);
    expect(current.entries[0]).not.toBe(initial.entries[0]);
  });

  it("current sidecar mutation leaves initial snapshot unchanged", () => {
    const initial = expectOk(validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot()));
    const current = expectOk(createWeeklyTrainingSidecarStateFromInitial(initial));
    const mutable = {
      ...current,
      entries: current.entries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              temporaryCondition: {
                ...entry.temporaryCondition,
                fatigue: 42,
              },
            }
          : entry,
      ),
    };
    expect(initial.entries[0]?.temporaryCondition.fatigue).toBe(0);
    expect(mutable.entries[0]?.temporaryCondition.fatigue).toBe(42);
  });

  it("current sidecar changes do not alter initialWeeklyTrainingSidecarHash", () => {
    const snap = sidecarSnapshot();
    const hashBefore = expectOk(computeInitialWeeklyTrainingSidecarHash(snap, sha256Provider));
    const current = expectOk(createWeeklyTrainingSidecarStateFromInitial(snap));
    const mutated = {
      ...current,
      entries: current.entries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              temporaryCondition: { ...entry.temporaryCondition, fatigue: 9 },
            }
          : entry,
      ),
    };
    expect(mutated.entries[0]?.temporaryCondition.fatigue).toBe(9);
    const hashAfter = expectOk(computeInitialWeeklyTrainingSidecarHash(snap, sha256Provider));
    expect(hashAfter).toBe(hashBefore);
  });

  it("rejects missing current sidecar temporaryCondition via validator", () => {
    const missingField = sidecarEntry("person_0000000000000001");
    delete missingField["temporaryCondition"];
    expect(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [missingField],
      }).ok,
    ).toBe(false);
  });

  it("asserts battleResultWeekState.absoluteWeek matches worldDate.absoluteWeek", () => {
    expect(
      assertBattleResultWeekMatchesWorldDate({
        battleResultWeekState: { absoluteWeek: 3 },
        worldState: { worldDate: { absoluteWeek: 3 } as never },
      }).ok,
    ).toBe(true);
    expect(
      assertBattleResultWeekMatchesWorldDate({
        battleResultWeekState: { absoluteWeek: 3 },
        worldState: { worldDate: { absoluteWeek: 4 } as never },
      }).ok,
    ).toBe(false);
  });

  async function readRepo(relativePath: string): Promise<string> {
    const { readFile } = await import("node:fs/promises");
    return readFile(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
  }

  it("keeps legacy WorldProcessor signature unchanged", async () => {
    const types = await readRepo("packages/simulation-core/src/world-engine/types.ts");
    expect(types).toMatch(
      /process\(input:\s*\{\s*state:\s*WorldEngineState;\s*rng:\s*SeededRng\s*\}\):\s*WorldEngineState/,
    );
  });

  it("documents Sprint1 adapter pipeline and no dual legacy registration", async () => {
    const joined = [
      await readRepo("docs/specs/02-config-schema.md"),
      await readRepo("docs/specs/10-training-and-learning.md"),
      await readRepo("docs/TECHNICAL_DECISIONS.md"),
      await readRepo("docs/wiki/tasks/S01-008.md"),
      await readRepo("docs/wiki/architecture/sprint1-processing-flow.md"),
    ].join("\n");
    expect(joined).toContain("Sprint1 transactional processor adapter pipeline");
    expect(joined).toMatch(/二重登録しない|二重登録ではない/);
  });

  it("documents temporaryCondition sidecar ownership and no Person fatigue fields", async () => {
    const training = await readRepo("docs/specs/10-training-and-learning.md");
    expect(training).toMatch(
      /PersonTemporaryCondition.*weeklyTrainingSidecars|weeklyTrainingSidecars.*temporaryCondition/,
    );
    expect(training).toMatch(/Personへ.*fatigue|fatigue.*新field追加しない/);
    expect(training).toMatch(/conditionRequestedDelta|confidenceRequestedDelta/);
    expect(training).toMatch(/直接加算しない/);
  });

  it("documents battleResultWeekState/worldDate invariant and clarifier→S01-008→S01-009 order", async () => {
    const joined = [
      await readRepo("docs/specs/02-config-schema.md"),
      await readRepo("docs/specs/10-training-and-learning.md"),
      await readRepo("docs/wiki/tasks/S01-008.md"),
    ].join("\n");
    expect(joined).toMatch(
      /battleResultWeekState\.absoluteWeek\s*===\s*worldState\.worldDate\.absoluteWeek|battleResultWeekState\.absoluteWeek == worldDate\.absoluteWeek/,
    );
    expect(joined).toMatch(/clarifier.*S01-008.*S01-009|clarifier accepted.*S01-008.*S01-009/);
    expect(joined).not.toMatch(/未解決事項なし。次タスク: S01-009/);
  });

  it("exposes Sprint1 transactional adapter pipeline constant as weekly-training only", () => {
    expect(SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE).toEqual([
      WEEKLY_TRAINING_PROCESSOR_ID,
    ]);
  });
});

describe("S1-SPEC-0.1.20 fix4 RunContext sidecar / MatchId / output / architecture", () => {
  function buildContextMaterials() {
    const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
    const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
    const generator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: 12345,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const generatorHash = expectOk(computeMatchIdGeneratorStateHash(generator, sha256Provider));
    const config = getDefaultSprint1Config();
    const configHash = expectOk(
      computeSprint1ConfigHash(createDefaultSprint1ConfigInput(), sha256Provider),
    );
    const sidecar = expectOk(validateInitialWeeklyTrainingSidecarSnapshot(sidecarSnapshot()));
    const sidecarHash = expectOk(computeInitialWeeklyTrainingSidecarHash(sidecar, sha256Provider));
    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          seed: 12345,
          sprint1ConfigHash: configHash,
          techniqueCatalogHash: catalogHash,
          initialMatchIdGeneratorStateHash: generatorHash,
          initialWeeklyTrainingSidecarHash: sidecarHash,
        }),
      ),
    );
    const identityHash = expectOk(computeSimulationIdentityHash(identity, sha256Provider));
    const simulationId = expectOk(createSimulationIdFromIdentity(identity, sha256Provider));
    const snapshot = expectOk(
      createRunRuleSnapshot(
        {
          simulationIdentity: identity,
          simulationIdentityHash: identityHash,
          initialMatchIdGeneratorState: generator,
          sprint1Config: config,
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions: [def],
        },
        sha256Provider,
      ),
    );
    return {
      generator,
      config,
      sidecar,
      sidecarHash,
      identity,
      identityHash,
      simulationId,
      snapshot,
      techniqueCatalog: {
        identity: { dataVersion: "techniques-0.1.0", catalogHash },
        definitions: [def],
      },
    };
  }

  function contextInput(m: ReturnType<typeof buildContextMaterials>) {
    return {
      sprint1Config: m.config,
      techniqueCatalog: m.techniqueCatalog,
      initialWeeklyTrainingSidecarSnapshot: m.sidecar,
      simulationIdentity: m.identity,
      simulationIdentityHash: m.identityHash,
      simulationId: m.simulationId,
      runRuleSnapshot: m.snapshot,
      runRuleSnapshotHash: m.snapshot.runRuleSnapshotHash,
    };
  }

  it("includes frozen initialWeeklyTrainingSidecarSnapshot matching identity hash", () => {
    const m = buildContextMaterials();
    const result = expectOk(createSprint1RunContext(contextInput(m), sha256Provider));
    expect(result.initialWeeklyTrainingSidecarSnapshot).toEqual(m.sidecar);
    expect(Object.isFrozen(result.initialWeeklyTrainingSidecarSnapshot)).toBe(true);
    expect(Object.isFrozen(result.initialWeeklyTrainingSidecarSnapshot.entries)).toBe(true);
    expect(result.simulationIdentity.initialWeeklyTrainingSidecarHash).toBe(m.sidecarHash);
  });

  it("rejects sidecar body tamper and identity sidecar hash tamper", () => {
    const m = buildContextMaterials();
    const tamperedSidecar = expectOk(
      validateInitialWeeklyTrainingSidecarSnapshot(
        sidecarSnapshot([
          sidecarEntry("person_0000000000000001", {
            temporaryCondition: { fatigue: 7, injury: 0, condition: 0, confidence: 0 },
          }),
          sidecarEntry("person_0000000000000002"),
        ]),
      ),
    );
    expect(
      createSprint1RunContext(
        { ...contextInput(m), initialWeeklyTrainingSidecarSnapshot: tamperedSidecar },
        sha256Provider,
      ).ok,
    ).toBe(false);

    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          ...m.identity,
          initialWeeklyTrainingSidecarHash: "a".repeat(64),
        }),
      ),
    );
    expect(
      createSprint1RunContext({ ...contextInput(m), simulationIdentity: identity }, sha256Provider)
        .ok,
    ).toBe(false);
  });

  it("keeps context initial sidecar and simulationId stable when current sidecar mutates", () => {
    const m = buildContextMaterials();
    const ctx = expectOk(createSprint1RunContext(contextInput(m), sha256Provider));
    const current = expectOk(
      createWeeklyTrainingSidecarStateFromInitial(ctx.initialWeeklyTrainingSidecarSnapshot),
    );
    const mutated = {
      ...current,
      entries: current.entries.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              temporaryCondition: { ...entry.temporaryCondition, fatigue: 55 },
            }
          : entry,
      ),
    };
    expect(mutated.entries[0]?.temporaryCondition.fatigue).toBe(55);
    expect(ctx.initialWeeklyTrainingSidecarSnapshot.entries[0]?.temporaryCondition.fatigue).toBe(0);
    expect(ctx.simulationId).toBe(m.simulationId);
    expect(ctx.simulationIdentity.initialWeeklyTrainingSidecarHash).toBe(m.sidecarHash);
  });

  it("validateSprint1RunContext needs no external initialMatchIdGeneratorState", () => {
    const m = buildContextMaterials();
    // Two-arg API only: (input, provider)
    const result = validateSprint1RunContext(contextInput(m), sha256Provider);
    expect(result.ok).toBe(true);
    expect(createSprint1RunContext.length).toBe(2);
    expect(validateSprint1RunContext.length).toBe(2);
  });

  it("rebuilds fresh MatchId state from identity seed and rejects hash tamper", () => {
    const m = buildContextMaterials();
    const rebuilt = expectOk(
      createInitialMatchIdGeneratorState({
        seed: m.identity.seed,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const rebuiltHash = expectOk(computeMatchIdGeneratorStateHash(rebuilt, sha256Provider));
    expect(rebuiltHash).toBe(m.identity.initialMatchIdGeneratorStateHash);
    expect(rebuilt.nextSequence).toBe(1);

    const identity = expectOk(
      validateSimulationIdentity(
        sampleIdentity({
          ...m.identity,
          initialMatchIdGeneratorStateHash: "b".repeat(64),
        }),
      ),
    );
    expect(
      createSprint1RunContext({ ...contextInput(m), simulationIdentity: identity }, sha256Provider)
        .ok,
    ).toBe(false);
  });

  it("does not require runtime advanced MatchId nextSequence for context validation", () => {
    const m = buildContextMaterials();
    // Runtime may have advanced nextSequence; context validation ignores that state.
    const advancedRuntimeState = { ...m.generator, nextSequence: 42 };
    expect(advancedRuntimeState.nextSequence).toBe(42);
    const result = validateSprint1RunContext(contextInput(m), sha256Provider);
    expect(result.ok).toBe(true);
  });

  it("locks Sprint1 document schema versions and fixed7 sidecar/battleResults projection fields", async () => {
    expect(INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1).toBe("0.4.0");
    expect(FINAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1).toBe("0.3.0");
    const { readFile } = await import("node:fs/promises");
    const output = await readFile(
      new URL("../../../docs/specs/05-statistics-output.md", import.meta.url),
      "utf8",
    );
    const config = await readFile(
      new URL("../../../docs/specs/02-config-schema.md", import.meta.url),
      "utf8",
    );
    const battle = await readFile(
      new URL("../../../docs/specs/13-battle-result-and-log.md", import.meta.url),
      "utf8",
    );
    expect(output).toContain("initialWeeklyTrainingSidecarSnapshot");
    expect(output).toContain("weeklyTrainingSidecars");
    expect(output).toContain("battleResults");
    expect(output).toMatch(/initial-world\.json[`\s|]*0\.4\.0|initial-world.*0\.4\.0/);
    expect(output).toMatch(/final-world\.json[`\s|]*0\.3\.0|final-world.*0\.3\.0/);
    expect(config).toContain("initialWeeklyTrainingSidecarSnapshot");
    expect(config).toContain("weeklyTrainingSidecars");
    expect(config).toContain("battleResults");
    expect(output).toMatch(/exactly 7|固定7|7ファイル/);
    expect(output).toMatch(
      /sidecar\.json.*(禁止|追加しない|作らない)|(禁止|追加しない).*sidecar\.json/,
    );
    expect(output).toMatch(/battle-results\.json.*(禁止|追加しない)|禁止.*battle-results\.json/);
    expect(battle).toContain("detailedLog");
    expect(battle).toMatch(/events\.jsonlへturn|turn\/action詳細|turn詳細を複製しない/);
    expect(battle).toMatch(/Sprint 1では削除処理を実装しない|retention削除を実装しない/);
    // Person temporaryCondition fields must not become Person wire fields
    expect(config).toMatch(
      /Personへ.*fatigue|fatigue.*新field追加しない|Person.*新field.*追加しない/,
    );
  });

  it("locks 13-spec initiativeScore=round / damageScore=floor (S01-007 accepted sync)", async () => {
    const { readFile } = await import("node:fs/promises");
    const battle = await readFile(
      new URL("../../../docs/specs/13-battle-result-and-log.md", import.meta.url),
      "utf8",
    );
    // Extract §4.1 formula block (between "### 4.1" and "### 4.2")
    const sectionMatch = battle.match(/### 4\.1[\s\S]*?(?=### 4\.2)/);
    expect(sectionMatch).not.toBeNull();
    const section = sectionMatch![0]!;

    expect(section).toMatch(/initiativeScore[\s\S]*?\bround\b/);
    expect(section).toMatch(/battle\.judgement\.initiativeMaximum/);
    expect(section).toMatch(/damageScore[\s\S]*?\bfloor\b/);
    // Goldens for default initiativeMaximum=10, turnsExecuted=4
    expect(section).toMatch(/0\/3\/5\/8\/10|0\/1\/2\/3\/4\s*→\s*initiativeScore\s*0\/3\/5\/8\/10/);
    expect(section).toMatch(/2\.5\s*→\s*3/);
    expect(section).toMatch(/7\.5\s*→\s*8/);

    // Current initiativeScore contract must not use floor
    expect(section).not.toMatch(
      /initiativeScore\s*=\s*min\([^)]*floor\(|initiativeScore[\s\S]{0,200}最後に`floor`|initiativeScoreは[^。]{0,80}floorする/,
    );
    expect(battle).not.toMatch(/initiativeScoreのfloor/);
    // damageScore floor remains required
    expect(battle).toMatch(/damageScore[\s\S]{0,80}floor|damageScoreは`floor`/);
  });

  it("types Sprint1WeeklyTrainingAdapterOutput.eventCandidates as WeeklyTrainingEventCandidate[]", () => {
    expectTypeOf<Sprint1WeeklyTrainingAdapterOutput["eventCandidates"]>().toEqualTypeOf<
      readonly WeeklyTrainingEventCandidate[]
    >();
  });

  it("has zero world-engine imports from sprint1/", () => {
    const root = fileURLToPath(new URL("./world-engine", import.meta.url));
    const offenders: string[] = [];
    function walk(dir: string): void {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
          walk(full);
          continue;
        }
        if (!name.endsWith(".ts") || name.endsWith(".test.ts")) {
          continue;
        }
        const text = readFileSync(full, "utf8");
        if (/from\s+["'][^"']*sprint1\//.test(text) || /from\s+["']\.\.\/sprint1\//.test(text)) {
          offenders.push(full);
        }
      }
    }
    walk(root);
    expect(offenders).toEqual([]);
  });

  it("documents that weekly-training is not registered into legacy WorldProcessor processors", async () => {
    const { readFile } = await import("node:fs/promises");
    const paths = [
      "docs/specs/10-training-and-learning.md",
      "docs/specs/02-config-schema.md",
      "docs/TECHNICAL_DECISIONS.md",
      "docs/wiki/tasks/S01-008.md",
      "docs/wiki/architecture/sprint1-processing-flow.md",
    ];
    for (const relative of paths) {
      const text = await readFile(new URL(`../../../${relative}`, import.meta.url), "utf8");
      expect(text, relative).not.toMatch(
        /weekly-training`?を既存WorldProcessor契約で|RunWorldOneWeekInput\.processorsへweekly-trainingを登録|WorldProcessor配列は次の1件のみ/,
      );
      expect(text, relative).not.toMatch(
        /WorldProcessor\.processorId`?と週間訓練由来.*同一literal.*登録/,
      );
    }
  });
});

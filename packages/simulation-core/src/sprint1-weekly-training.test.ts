import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  BASIS_POINTS_SCALE,
  TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
  WEEKLY_ACTIONS,
  WEEKLY_FORCED_REST_REASONS,
  WEEKLY_REST_FALLBACK_REASONS,
  WEEKLY_SCORED_ACTIONS,
  WEEKLY_TRAINING_ACTIONS,
  WEEKLY_TRAINING_EVENT_TYPES,
  cloneTrainingProcessorRuntimeState,
  cloneWeeklyPlannerContext,
  computeLearningTargetScoreHundredths,
  computePracticeTargetScoreHundredths,
  computeRecentPracticeNeed,
  computeStatTargetScoreHundredths,
  computeTechniqueCatalogHash,
  createInitialTrainingProcessorRuntimeState,
  createSeededRng,
  drawInclusiveBasisPoints,
  freezeWeeklyPlannerContext,
  getDefaultSprint1Config,
  isWeeklyAction,
  mathematicalFloor,
  multiplyBasisPointsFloor,
  processWeeklyTrainingWeek,
  RNG_ALGORITHM_VERSION,
  SEEDED_RNG_STATE_KEYS,
  scoreWeeklyActions,
  selectNormalTrainingMasteryTarget,
  selectPracticeTechniqueTarget,
  selectTrainingStatTarget,
  selectWeeklyAction,
  validateSeededRngState,
  validateTechniqueCatalog,
  validateTechniqueTargetContext,
  validateTechniqueTargetContexts,
  validateTrainingProcessorRuntimeState,
  validateWeeklyPlannerContext,
  validateWeeklyStatTargetContext,
  validateWeeklyTrainingPersonRecord,
  weeklyActionOrderIndex,
  type AbilityKey,
  type Sha256Provider,
  type TechniqueCatalog,
  type ValidationResult,
  type WeeklyTrainingEventCandidate,
  type WeeklyTrainingPersonRecord,
  type WeeklyTrainingResult,
} from "./index.js";
import * as simulationCore from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";
import { applyRest, createWeeklyTrainingDraft } from "./sprint1/weekly-training-effects.js";
import { normalizeWeeklyLearningFocus } from "./sprint1/weekly-target-selection.js";
import { validateProcessedWeeklyPersonRecord } from "./sprint1/process-weekly-training-week.js";
import { isFormalTrainingEligible } from "./sprint1/weekly-update-eligibility.js";
import { validateTeacherCanTeachContext } from "./sprint1/technique-teacher.js";
import type { CareerStatus } from "./enums.js";

const sha256Provider: Sha256Provider = createNodeSha256Provider();
const dependencies = { sha256Provider };
const config = getDefaultSprint1Config();

function expectOkValue<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected ValidationResult success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function expectIssues<T>(
  result: ValidationResult<T>,
): readonly { path: string; message: string }[] {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected ValidationResult failure");
  }
  return result.issues;
}

/** Counts public `nextInt` calls so RNG-consumption contracts can be asserted directly. */
function countingRng(seed = 12345): { nextInt(min: number, max: number): number; calls: number } {
  const inner = createSeededRng(seed);
  const wrapper = {
    calls: 0,
    nextInt(minInclusive: number, maxExclusive: number): number {
      wrapper.calls += 1;
      return inner.nextInt(minInclusive, maxExclusive);
    },
  };
  return wrapper;
}

function rngState(seed = 20260806): unknown {
  return createSeededRng(seed).exportState();
}

/* ------------------------------------------------------------------ fixtures */

function statTriple(surfaceValue: number): Record<string, number> {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function abilities(overrides: Partial<Record<AbilityKey, number>> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result;
}

function aptitudes(overrides: Record<string, number> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of APTITUDE_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result;
}

function techniqueState(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    techniqueId: id,
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
    ...overrides,
  };
}

function definition(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    techniqueId: id,
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: id,
    category: "unarmed",
    primaryStats: ["strength", "skill"],
    requiredAptitude: 10,
    requiredStats: { strength: 20 },
    prerequisiteTechniqueMastery: [],
    mentalCost: 5,
    difficulty: 30,
    learningTier: "standard",
    consumptionClass: "small",
    learningProgressRequired: 180,
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
    ...overrides,
  };
}

function buildCatalog(definitions: readonly Record<string, unknown>[]): TechniqueCatalog {
  const hash = expectOkValue(computeTechniqueCatalogHash(definitions, sha256Provider));
  return expectOkValue(
    validateTechniqueCatalog(
      { identity: { dataVersion: "techniques-0.1.0", catalogHash: hash }, definitions },
      sha256Provider,
    ),
  );
}

function teacherContext(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    activeMentorshipExists: true,
    masterLifeStatus: "living",
    masterParticipationStatus: "active",
    masterCareerStatus: "active_competitor",
    masterTechniqueState: techniqueState("technique_alpha", {
      acquiredAbsoluteWeek: 1,
      masteryHundredths: 5000,
    }),
    ...overrides,
  };
}

function contextScore(overrides: Record<string, number> = {}): Record<string, number> {
  return {
    personality: 0,
    developmentNeed: 0,
    recentResult: 0,
    teacherAdvice: 0,
    schedule: 0,
    ...overrides,
  };
}

function plannerContext(
  overrides: Partial<Record<string, Record<string, number>>> = {},
): Record<string, unknown> {
  const byAction: Record<string, unknown> = {};
  for (const action of WEEKLY_SCORED_ACTIONS) {
    byAction[action] = contextScore(overrides[action] ?? {});
  }
  return { byAction };
}

/** `strength` is deliberately the unique best stat target so no tie RNG is consumed. */
function statTargetContext(
  overrides: Partial<Record<AbilityKey, Record<string, number>>> = {},
): Record<string, unknown> {
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
      ...(overrides[key] ?? {}),
    };
  }
  return { byAbility };
}

const DEFAULT_SPRINT1_STATE: Record<string, unknown> = {
  sprint1StateSchemaVersion: "0.1.0",
  currentMental: 100,
  techniqueStates: [],
  learningFocusTechniqueId: null,
};

/**
 * `sprint1State` overrides are merged onto the default state; any key whose override
 * value is `undefined` is removed entirely, so a test can build a person without a
 * `sprint1State`, without `participationStatus`, and so on.
 */
function person(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    personId: "person_0000000000000001",
    givenName: "Ai",
    familyName: "Doll",
    displayName: "Doll Ai",
    nameDataVersion: "names-0.1.0",
    sex: "female",
    birthYear: 1,
    familyId: "family_0000000000000001",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "trainee",
    currentAge: 20,
    qualifiedMaster: false,
    abilities: abilities(),
    aptitudes: aptitudes(),
    sprint1State: { ...DEFAULT_SPRINT1_STATE },
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete merged[key];
      continue;
    }
    merged[key] =
      key === "sprint1State"
        ? { ...DEFAULT_SPRINT1_STATE, ...(value as Record<string, unknown>) }
        : value;
  }
  return merged;
}

/** Deceased persons omit the living-only fields and carry the death pair instead. */
function deceasedPerson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return person({
    lifeStatus: "deceased",
    participationStatus: undefined,
    currentAge: undefined,
    deathYear: 21,
    ageAtDeath: 20,
    ...overrides,
  });
}

function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    person: person(),
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

function weekInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    absoluteWeek: 10,
    personRecords: [record()],
    config,
    catalog: buildCatalog([definition("technique_alpha")]),
    runtimeState: createInitialTrainingProcessorRuntimeState(),
    rngState: rngState(),
    ...overrides,
  };
}

function eventTypes(result: WeeklyTrainingResult): string[] {
  return result.eventCandidates.map((candidate) => candidate.eventType);
}

function eventsFor(
  result: WeeklyTrainingResult,
  personId: string,
): readonly WeeklyTrainingEventCandidate[] {
  return result.eventCandidates.filter((candidate) => candidate.personId === personId);
}

function sprint1StateOf(entry: WeeklyTrainingPersonRecord) {
  const state = entry.person.sprint1State;
  if (state === undefined) {
    throw new Error("expected the output person to carry a Sprint1PersonState");
  }
  return state;
}

function recordFor(result: WeeklyTrainingResult, personId: string): WeeklyTrainingPersonRecord {
  const entry = result.personRecords.find((candidate) => candidate.person.personId === personId);
  if (entry === undefined) {
    throw new Error(`expected an output record for ${personId}`);
  }
  return entry;
}

/** Plain-data copy used to inject post-effect corruption into a processed record. */
function mutableCopy(value: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function childObject(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  return parent[key] as Record<string, unknown>;
}

/* ------------------------------------------------------------------ enums */

describe("weekly action enums", () => {
  it("fixes the canonical action, forced-rest, and fallback orders", () => {
    expect([...WEEKLY_ACTIONS]).toEqual([
      "train_stat",
      "learn_technique",
      "practice_technique",
      "rest",
      "inactive",
    ]);
    expect([...WEEKLY_SCORED_ACTIONS]).toEqual([
      "train_stat",
      "learn_technique",
      "practice_technique",
      "rest",
    ]);
    expect([...WEEKLY_TRAINING_ACTIONS]).toEqual([
      "train_stat",
      "learn_technique",
      "practice_technique",
    ]);
    expect([...WEEKLY_FORCED_REST_REASONS]).toEqual(["severe_injury", "fatigue_threshold"]);
    expect([...WEEKLY_REST_FALLBACK_REASONS]).toEqual([
      "no_trainable_stat",
      "no_learning_candidate",
      "no_practice_candidate",
    ]);
    expect(isWeeklyAction("rest")).toBe(true);
    expect(isWeeklyAction("teach")).toBe(false);
    expect(weeklyActionOrderIndex("inactive")).toBe(4);
  });
});

/* --------------------------------------------------------- integer contracts */

describe("multiplyBasisPointsFloor / drawInclusiveBasisPoints", () => {
  it("floors once at the end: 500 x [6500, 9000, 11500] is 336, not the sequential 335", () => {
    expect(expectOkValue(multiplyBasisPointsFloor(500, [6500, 9000, 11500]))).toBe(336);

    let sequential = 500;
    for (const factor of [6500, 9000, 11500]) {
      sequential = Math.floor((sequential * factor) / BASIS_POINTS_SCALE);
    }
    expect(sequential).toBe(335);
  });

  it("returns the base unchanged for an empty factor list and applies a single factor exactly", () => {
    expect(expectOkValue(multiplyBasisPointsFloor(500, []))).toBe(500);
    expect(expectOkValue(multiplyBasisPointsFloor(50, [10000]))).toBe(50);
    expect(expectOkValue(multiplyBasisPointsFloor(50, [11000]))).toBe(55);
  });

  it("rejects negative, fractional, and non-safe-integer inputs", () => {
    expect(expectIssues(multiplyBasisPointsFloor(-1, [10000]))[0]?.path).toBe("/baseInteger");
    expect(expectIssues(multiplyBasisPointsFloor(1.5, [10000]))[0]?.path).toBe("/baseInteger");
    expect(expectIssues(multiplyBasisPointsFloor(1, [-10000]))[0]?.path).toBe("/factors/0");
    expect(
      expectIssues(multiplyBasisPointsFloor(Number.MAX_SAFE_INTEGER + 2, [10000])),
    ).toHaveLength(1);
  });

  it("fails instead of truncating when the exact product leaves the safe-integer range", () => {
    const issues = expectIssues(multiplyBasisPointsFloor(Number.MAX_SAFE_INTEGER, [30000]));
    expect(issues[0]?.message).toContain("safe-integer range");
  });

  it("draws inclusive basis points through a single nextInt(min, max + 1) call", () => {
    const calls: [number, number][] = [];
    const rng = {
      nextInt(minInclusive: number, maxExclusive: number): number {
        calls.push([minInclusive, maxExclusive]);
        return minInclusive;
      },
    };
    expect(drawInclusiveBasisPoints(rng, 9000, 11000)).toBe(9000);
    expect(calls).toEqual([[9000, 11001]]);

    const upper = { nextInt: (_min: number, max: number): number => max - 1 };
    expect(drawInclusiveBasisPoints(upper, 9000, 11000)).toBe(11000);
  });

  it("throws on inverted or non-integer bounds without consuming the RNG", () => {
    const rng = countingRng();
    expect(() => drawInclusiveBasisPoints(rng, 11000, 9000)).toThrow();
    expect(() => drawInclusiveBasisPoints(rng, 1.5, 9000)).toThrow();
    expect(rng.calls).toBe(0);
  });

  it("floors toward -Infinity rather than truncating toward zero", () => {
    expect(mathematicalFloor(-150, 100)).toBe(-2);
    expect(Math.trunc(-150 / 100)).toBe(-1);
    expect(mathematicalFloor(150, 100)).toBe(1);
  });
});

/* -------------------------------------------------------- planner context VO */

describe("WeeklyPlannerContext", () => {
  it("validates, clones, and deep-freezes the four scored actions", () => {
    const value = expectOkValue(validateWeeklyPlannerContext(plannerContext()));
    expect(Object.keys(value.byAction)).toEqual([...WEEKLY_SCORED_ACTIONS]);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.byAction.train_stat)).toBe(true);

    const cloned = expectOkValue(cloneWeeklyPlannerContext(value));
    expect(cloned).toEqual(value);
    expect(cloned).not.toBe(value);
    expect(Object.isFrozen(expectOkValue(freezeWeeklyPlannerContext(value)))).toBe(true);
  });

  it("rejects unknown keys, out-of-range scores, accessors, and a missing action", () => {
    const withUnknown = plannerContext() as Record<string, unknown>;
    (withUnknown["byAction"] as Record<string, unknown>)["teach"] = contextScore();
    expect(expectIssues(validateWeeklyPlannerContext(withUnknown)).length).toBeGreaterThan(0);

    expect(
      expectIssues(validateWeeklyPlannerContext(plannerContext({ rest: { personality: 21 } }))),
    ).toHaveLength(1);
    expect(
      expectIssues(validateWeeklyPlannerContext(plannerContext({ rest: { schedule: -21 } }))),
    ).toHaveLength(1);

    const missing = plannerContext() as { byAction: Record<string, unknown> };
    delete missing.byAction["practice_technique"];
    expect(expectIssues(validateWeeklyPlannerContext(missing)).length).toBeGreaterThan(0);

    const accessor = { byAction: {} as Record<string, unknown> };
    for (const action of WEEKLY_SCORED_ACTIONS) {
      accessor.byAction[action] = contextScore();
    }
    Object.defineProperty(accessor, "extra", { get: () => 1, enumerable: true });
    expect(expectIssues(validateWeeklyPlannerContext(accessor)).length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------- runtime state */

describe("TrainingProcessorRuntimeState", () => {
  it("starts empty with the fixed canonical key order and no inactive counter", () => {
    const initial = createInitialTrainingProcessorRuntimeState();
    expect(Object.keys(initial)).toEqual([
      "schemaVersion",
      "lastProcessedAbsoluteWeek",
      "processedPersonCount",
      "actionCounts",
      "totalStatGainMilliPoints",
      "totalLearningProgressGainTenths",
      "totalMasteryGainHundredths",
      "forcedRestCount",
    ]);
    expect(initial.schemaVersion).toBe(TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION);
    expect(initial.lastProcessedAbsoluteWeek).toBeNull();
    expect(Object.keys(initial.actionCounts)).not.toContain("inactive");
    expect(Object.isFrozen(initial)).toBe(true);
  });

  it("requires processedPersonCount to equal the sum of the four actionCounts", () => {
    const base = {
      ...createInitialTrainingProcessorRuntimeState(),
      processedPersonCount: 3,
      actionCounts: { train_stat: 1, learn_technique: 1, practice_technique: 0, rest: 1 },
    };
    expect(expectOkValue(validateTrainingProcessorRuntimeState(base)).processedPersonCount).toBe(3);
    expect(
      expectIssues(validateTrainingProcessorRuntimeState({ ...base, processedPersonCount: 4 }))[0]
        ?.path,
    ).toBe("/processedPersonCount");
  });

  it("rejects a forcedRestCount above the cumulative rest count and clones independently", () => {
    const base = {
      ...createInitialTrainingProcessorRuntimeState(),
      processedPersonCount: 1,
      actionCounts: { train_stat: 0, learn_technique: 0, practice_technique: 0, rest: 1 },
      forcedRestCount: 2,
    };
    expect(expectIssues(validateTrainingProcessorRuntimeState(base))[0]?.path).toBe(
      "/forcedRestCount",
    );
    const cloned = expectOkValue(
      cloneTrainingProcessorRuntimeState(createInitialTrainingProcessorRuntimeState()),
    );
    expect(cloned).toEqual(createInitialTrainingProcessorRuntimeState());
  });
});

/* --------------------------------------------------------------- sidecar I/O */

describe("weekly training sidecar inputs", () => {
  it("requires all six abilities in the stat target context", () => {
    const value = expectOkValue(validateWeeklyStatTargetContext(statTargetContext()));
    expect(Object.keys(value.byAbility)).toEqual([...ABILITY_KEYS]);

    const partial = statTargetContext() as { byAbility: Record<string, unknown> };
    delete partial.byAbility["magic"];
    expect(expectIssues(validateWeeklyStatTargetContext(partial)).length).toBeGreaterThan(0);
  });

  it("requires unique ascending TechniqueIds and treats omitted normalized inputs as absent", () => {
    const contexts = expectOkValue(
      validateTechniqueTargetContexts([
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
        {
          techniqueId: "technique_beta",
          styleMatch: 80,
          teacherPriority: 20,
          teacherCanTeachContext: teacherContext(),
        },
      ]),
    );
    expect(contexts).toHaveLength(2);
    expect(contexts[0]).not.toHaveProperty("styleMatch");
    expect(contexts[1]?.styleMatch).toBe(80);

    expect(
      expectIssues(
        validateTechniqueTargetContexts([
          { techniqueId: "technique_beta", teacherCanTeachContext: teacherContext() },
          { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
        ]),
      )[0]?.message,
    ).toContain("sorted");

    expect(
      expectIssues(
        validateTechniqueTargetContexts([
          { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
          { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
        ]),
      )[0]?.message,
    ).toContain("duplicate");
  });

  it("requires motivationFactor within 8000..11500 and never defaults it", () => {
    const missing = record();
    delete missing["motivationFactor"];
    expect(expectIssues(validateWeeklyTrainingPersonRecord(missing))[0]?.path).toBe(
      "/motivationFactor",
    );
    expect(
      expectIssues(validateWeeklyTrainingPersonRecord(record({ motivationFactor: 7999 })))[0]?.path,
    ).toBe("/motivationFactor");
    expect(
      expectOkValue(validateWeeklyTrainingPersonRecord(record({ motivationFactor: 11500 }))).record
        .motivationFactor,
    ).toBe(11500);
  });

  it("rejects an active person without Sprint1PersonState instead of initializing one", () => {
    const withoutState = person();
    delete withoutState["sprint1State"];
    const issues = expectIssues(
      validateWeeklyTrainingPersonRecord(record({ person: withoutState })),
    );
    expect(issues.some((issue) => issue.path === "/person/sprint1State")).toBe(true);
  });
});

/* ---------------------------------------------------------- action scoring */

describe("weekly action scoring and selection", () => {
  it("adds base score, weighted context, and subtracts burden penalties", () => {
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          temporaryCondition: { fatigue: 20, injury: 0, condition: 0, confidence: 0 },
          plannerContext: plannerContext({ train_stat: { developmentNeed: 10 } }),
        }),
      ),
    );
    const scores = expectOkValue(
      scoreWeeklyActions(validated.record, config, ["train_stat", "rest"]),
    );
    // trainee train base 35 -> 3500, context +10 * 10000 / 100 -> 1000,
    // fatigue penalty floor(20/5) * 1 * 10000 / 100 -> 400.
    // rest base 15 -> 1500 plus the fatigue recovery bonus floor(4 * 15000 / 100) -> 600.
    expect(scores).toEqual([
      { action: "train_stat", scoreHundredths: 4100 },
      { action: "rest", scoreHundredths: 2100 },
    ]);
  });

  it("returns candidates in the fixed action order and rejects duplicates or inactive", () => {
    const validated = expectOkValue(validateWeeklyTrainingPersonRecord(record()));
    const scores = expectOkValue(
      scoreWeeklyActions(validated.record, config, ["rest", "practice_technique", "train_stat"]),
    );
    expect(scores.map((entry) => entry.action)).toEqual([
      "train_stat",
      "practice_technique",
      "rest",
    ]);
    expect(
      expectIssues(scoreWeeklyActions(validated.record, config, ["rest", "rest"]))[0]?.message,
    ).toContain("duplicates");
    expect(scoreWeeklyActions(validated.record, config, []).ok).toBe(false);
  });

  it("forces rest on severe injury first, then on the fatigue threshold, with zero RNG", () => {
    const severe = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({ temporaryCondition: { fatigue: 90, injury: 60, condition: 0, confidence: 0 } }),
      ),
    );
    const rng = countingRng();
    const forced = expectOkValue(
      selectWeeklyAction(
        severe.record,
        config,
        { train_stat: true, learn_technique: true, practice_technique: true },
        rng,
      ),
    );
    expect(forced).toMatchObject({
      action: "rest",
      forced: true,
      forcedReason: "severe_injury",
      fallbackReasons: [],
      rngCalls: 0,
    });
    expect(rng.calls).toBe(0);

    const tired = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({ temporaryCondition: { fatigue: 81, injury: 0, condition: 0, confidence: 0 } }),
      ),
    );
    expect(
      expectOkValue(
        selectWeeklyAction(
          tired.record,
          config,
          { train_stat: true, learn_technique: true, practice_technique: true },
          rng,
        ),
      ).forcedReason,
    ).toBe("fatigue_threshold");
  });

  it("marks deceased, waiting, and stopped persons inactive without RNG or candidates", () => {
    for (const overrides of [
      { participationStatus: "waiting" },
      { participationStatus: "stopped" },
    ]) {
      const validated = expectOkValue(
        validateWeeklyTrainingPersonRecord(record({ person: person(overrides) })),
      );
      const rng = countingRng();
      const selection = expectOkValue(
        selectWeeklyAction(
          validated.record,
          config,
          { train_stat: true, learn_technique: true, practice_technique: true },
          rng,
        ),
      );
      expect(selection.action).toBe("inactive");
      expect(selection.candidateActions).toEqual([]);
      expect(rng.calls).toBe(0);
    }
  });

  it("limits ages 0..7 and retired persons to rest and records no fallback reasons", () => {
    const child = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({ person: person({ careerStatus: "trainee", currentAge: 7 }) }),
      ),
    );
    const selection = expectOkValue(
      selectWeeklyAction(
        child.record,
        config,
        { train_stat: true, learn_technique: true, practice_technique: true },
        countingRng(),
      ),
    );
    expect(selection.candidateActions).toEqual(["rest"]);
    expect(selection.action).toBe("rest");
    expect(selection.fallbackReasons).toEqual([]);

    const retired = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          person: person({
            careerStatus: "retired",
            currentAge: 45,
            retirementRank: "C",
            highestRank: "C",
            qualifiedMaster: true,
          }),
        }),
      ),
    );
    expect(
      expectOkValue(
        selectWeeklyAction(
          retired.record,
          config,
          { train_stat: true, learn_technique: true, practice_technique: true },
          countingRng(),
        ),
      ).candidateActions,
    ).toEqual(["rest"]);
  });

  it("formal training age boundary: ages 8..41 may train; ages 7 and 42+ are rest-only", () => {
    const availability = {
      train_stat: true,
      learn_technique: true,
      practice_technique: true,
    } as const;

    const age7 = expectOkValue(
      selectWeeklyAction(
        expectOkValue(
          validateWeeklyTrainingPersonRecord(
            record({ person: person({ careerStatus: "trainee", currentAge: 7 }) }),
          ),
        ).record,
        config,
        availability,
        countingRng(),
      ),
    );
    expect(age7.candidateActions).toEqual(["rest"]);
    expect(age7.fallbackReasons).toEqual([]);

    for (const [careerStatus, age] of [
      ["trainee", 8],
      ["trainee", 41],
      ["active_competitor", 41],
    ] as const) {
      const selection = expectOkValue(
        selectWeeklyAction(
          expectOkValue(
            validateWeeklyTrainingPersonRecord(
              record({
                person: person({
                  careerStatus,
                  currentAge: age,
                  ...(careerStatus === "active_competitor"
                    ? { currentRank: "C", highestRank: "C" }
                    : {}),
                }),
              }),
            ),
          ).record,
          config,
          availability,
          countingRng(),
        ),
      );
      expect(selection.candidateActions).toContain("train_stat");
      expect(selection.candidateActions).toContain("learn_technique");
      expect(selection.candidateActions).toContain("practice_technique");
      expect(selection.candidateActions).toContain("rest");
    }

    for (const [careerStatus, age] of [
      ["trainee", 42],
      ["active_competitor", 42],
      ["active_competitor", 43],
    ] as const) {
      const selection = expectOkValue(
        selectWeeklyAction(
          expectOkValue(
            validateWeeklyTrainingPersonRecord(
              record({
                person: person({
                  careerStatus,
                  currentAge: age,
                  ...(careerStatus === "active_competitor"
                    ? { currentRank: "C", highestRank: "C" }
                    : {}),
                }),
              }),
            ),
          ).record,
          config,
          availability,
          countingRng(),
        ),
      );
      expect(selection).toMatchObject({
        action: "rest",
        forced: false,
        forcedReason: null,
        fallbackReasons: [],
        candidateActions: ["rest"],
        rngCalls: 0,
      });
    }

    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "trainee",
        currentAge: 7,
      }),
    ).toBe(false);
    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "trainee",
        currentAge: 8,
      }),
    ).toBe(true);
    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "trainee",
        currentAge: 41,
      }),
    ).toBe(true);
    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "trainee",
        currentAge: 42,
      }),
    ).toBe(false);
    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "active_competitor",
        currentAge: 43,
      }),
    ).toBe(false);
  });

  it("records fallback reasons only when rest is the sole remaining candidate", () => {
    const validated = expectOkValue(validateWeeklyTrainingPersonRecord(record()));
    const selection = expectOkValue(
      selectWeeklyAction(
        validated.record,
        config,
        { train_stat: false, learn_technique: false, practice_technique: false },
        countingRng(),
      ),
    );
    expect(selection.action).toBe("rest");
    expect(selection.forced).toBe(false);
    expect(selection.fallbackReasons).toEqual([
      "no_trainable_stat",
      "no_learning_candidate",
      "no_practice_candidate",
    ]);

    const partial = expectOkValue(
      selectWeeklyAction(
        validated.record,
        config,
        { train_stat: true, learn_technique: false, practice_technique: false },
        countingRng(),
      ),
    );
    expect(partial.fallbackReasons).toEqual([]);
  });

  it("consumes exactly one RNG call for a tie and none for a unique best score", () => {
    const tie = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        // trainee train 35 vs rest 15: +20 context on rest makes them tie at 3500.
        record({ plannerContext: plannerContext({ rest: { personality: 20 } }) }),
      ),
    );
    const rng = countingRng();
    const selection = expectOkValue(
      selectWeeklyAction(
        tie.record,
        config,
        { train_stat: true, learn_technique: false, practice_technique: false },
        rng,
      ),
    );
    expect(selection.candidateScores).toEqual([
      { action: "train_stat", scoreHundredths: 3500 },
      { action: "rest", scoreHundredths: 3500 },
    ]);
    expect(selection.rngCalls).toBe(1);
    expect(rng.calls).toBe(1);

    const unique = expectOkValue(validateWeeklyTrainingPersonRecord(record()));
    const quietRng = countingRng();
    expect(
      expectOkValue(
        selectWeeklyAction(
          unique.record,
          config,
          { train_stat: true, learn_technique: false, practice_technique: false },
          quietRng,
        ),
      ).rngCalls,
    ).toBe(0);
    expect(quietRng.calls).toBe(0);
  });

  it("fails instead of dividing by zero when maxMental is not positive", () => {
    const zeroSpirit = person({ abilities: abilities({ spirit: 0 }) }) as Record<string, unknown>;
    (zeroSpirit["sprint1State"] as Record<string, unknown>)["currentMental"] = 0;
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(record({ person: zeroSpirit })),
    );
    // 50 + spirit(0) is still positive, so scoring succeeds; a non-positive maximum is
    // impossible from a valid person and is rejected by readWeeklyPlannerPersonState.
    expect(
      expectOkValue(scoreWeeklyActions(validated.record, config, ["rest"]))[0]?.scoreHundredths,
    ).toBe(1500 + 25 * 100);
  });
});

/* --------------------------------------------------------- target selection */

describe("weekly target selection", () => {
  it("computes StatTargetScoreHundredths from the normalized weights", () => {
    expect(
      expectOkValue(
        computeStatTargetScoreHundredths(
          { currentValue: 50, growthPotential: 50, relatedAptitude: 50, teacherRecommendation: 0 },
          config,
        ),
      ),
    ).toBe(12500);
    expect(
      expectOkValue(
        computeStatTargetScoreHundredths(
          { currentValue: 100, growthPotential: 0, relatedAptitude: 0, teacherRecommendation: 0 },
          config,
        ),
      ),
    ).toBe(0);
  });

  it("skips abilities already at 100 and reports no candidate when every ability is capped", () => {
    const capped = record({
      person: person({
        abilities: abilities(Object.fromEntries(ABILITY_KEYS.map((k) => [k, 100]))),
      }),
    });
    const validated = expectOkValue(validateWeeklyTrainingPersonRecord(capped));
    expect(
      expectOkValue(selectTrainingStatTarget(validated.record, config, countingRng())),
    ).toBeNull();

    const partial = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({ person: person({ abilities: abilities({ strength: 100 }) }) }),
      ),
    );
    const selection = expectOkValue(
      selectTrainingStatTarget(partial.record, config, countingRng()),
    );
    expect(selection?.candidates.map((entry) => entry.ability)).not.toContain("strength");
  });

  it("produces the golden LearningTargetScoreHundredths of 7320", () => {
    expect(
      expectOkValue(
        computeLearningTargetScoreHundredths(
          {
            domainAptitude: 80,
            requiredStatsFactorBasisPoints: 10000,
            learningProgressTenths: 900,
            learningProgressRequired: 180,
            teacherCanTeach: true,
            styleMatch: 50,
          },
          config,
        ),
      ),
    ).toBe(7320);
  });

  it("rejects learningProgressTenths outside 0..cap instead of clamping it", () => {
    const base = {
      domainAptitude: 80,
      requiredStatsFactorBasisPoints: 10000,
      learningProgressRequired: 180,
      teacherCanTeach: true,
      styleMatch: 50,
    };
    expect(
      expectIssues(
        computeLearningTargetScoreHundredths({ ...base, learningProgressTenths: 1801 }, config),
      )[0]?.path,
    ).toBe("/learningProgressTenths");
    expect(
      expectIssues(
        computeLearningTargetScoreHundredths({ ...base, learningProgressTenths: -1 }, config),
      )[0]?.path,
    ).toBe("/learningProgressTenths");
    expect(
      expectIssues(
        computeLearningTargetScoreHundredths(
          { ...base, learningProgressTenths: 0, learningProgressRequired: 0 },
          config,
        ),
      )[0]?.path,
    ).toBe("/learningProgressRequired");
  });

  it("produces the golden PracticeTargetScoreHundredths of 5050", () => {
    expect(
      expectOkValue(
        computePracticeTargetScoreHundredths(
          { masteryHundredths: 4000, recentPracticeNeed: 50, teacherPriority: 20, styleMatch: 50 },
          config,
        ),
      ),
    ).toBe(5050);
  });

  it("derives recentPracticeNeed at the 12-week boundary and rejects a future week", () => {
    expect(expectOkValue(computeRecentPracticeNeed(30, null))).toBe(100);
    expect(expectOkValue(computeRecentPracticeNeed(30, 30))).toBe(0);
    expect(expectOkValue(computeRecentPracticeNeed(30, 24))).toBe(50);
    expect(expectOkValue(computeRecentPracticeNeed(30, 19))).toBe(91);
    expect(expectOkValue(computeRecentPracticeNeed(30, 18))).toBe(100);
    expect(expectOkValue(computeRecentPracticeNeed(30, 6))).toBe(100);
    expect(expectIssues(computeRecentPracticeNeed(30, 31))[0]?.path).toBe(
      "/lastPracticedAbsoluteWeek",
    );
  });

  it("breaks practice-target ties by TechniqueId order using exactly one RNG call", () => {
    const catalog = buildCatalog([definition("technique_alpha"), definition("technique_beta")]);
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          person: person({
            sprint1State: {
              techniqueStates: [
                techniqueState("technique_alpha", {
                  acquiredAbsoluteWeek: 1,
                  masteryHundredths: 0,
                }),
                techniqueState("technique_beta", { acquiredAbsoluteWeek: 1, masteryHundredths: 0 }),
              ],
            },
          }),
        }),
      ),
    );
    const rng = countingRng();
    const selection = expectOkValue(
      selectPracticeTechniqueTarget(validated.record, catalog, config, 10, rng),
    );
    expect(selection?.candidates.map((entry) => entry.techniqueId)).toEqual([
      "technique_alpha",
      "technique_beta",
    ]);
    expect(selection?.rngCalls).toBe(1);
    expect(rng.calls).toBe(1);
  });

  it("selects the lowest-mastery related technique for normal training without RNG", () => {
    const catalog = buildCatalog([
      definition("technique_alpha", { primaryStats: ["strength", "skill"] }),
      definition("technique_beta", { primaryStats: ["strength"] }),
      definition("technique_gamma", { primaryStats: ["speed"] }),
    ]);
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          person: person({
            sprint1State: {
              techniqueStates: [
                techniqueState("technique_alpha", {
                  acquiredAbsoluteWeek: 1,
                  masteryHundredths: 3000,
                }),
                techniqueState("technique_beta", {
                  acquiredAbsoluteWeek: 1,
                  masteryHundredths: 1000,
                }),
                techniqueState("technique_gamma", {
                  acquiredAbsoluteWeek: 1,
                  masteryHundredths: 0,
                }),
              ],
            },
          }),
        }),
      ),
    );
    expect(
      expectOkValue(selectNormalTrainingMasteryTarget(validated.record, catalog, "strength"))
        ?.techniqueId,
    ).toBe("technique_beta");
    expect(
      expectOkValue(selectNormalTrainingMasteryTarget(validated.record, catalog, "magic")),
    ).toBeNull();
  });
});

/* ------------------------------------------------------------------- effects */

describe("rest effects", () => {
  it("recovers fatigue, injury, condition, and mental without touching confidence or RNG", () => {
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          person: person({ sprint1State: { currentMental: 40 } }),
          temporaryCondition: { fatigue: 30, injury: 10, condition: 19, confidence: -5 },
        }),
      ),
    );
    const draft = expectOkValue(createWeeklyTrainingDraft(validated.record));
    const outcome = expectOkValue(applyRest(draft, config, 10, null));

    expect(draft.fatigue).toBe(12);
    expect(draft.injury).toBe(5);
    expect(draft.condition).toBe(20);
    expect(draft.currentMental).toBe(60);
    expect(draft.confidence).toBe(-5);
    expect(outcome.rngCalls).toBe(0);
    expect(outcome.events.map((event) => event.eventType)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.restApplied,
    ]);
  });

  it("clamps recovery at the range bounds and emits forced_rest_applied before rest_applied", () => {
    const validated = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({ temporaryCondition: { fatigue: 5, injury: 2, condition: 0, confidence: 0 } }),
      ),
    );
    const draft = expectOkValue(createWeeklyTrainingDraft(validated.record));
    const outcome = expectOkValue(applyRest(draft, config, 10, "severe_injury"));
    expect(draft.fatigue).toBe(0);
    expect(draft.injury).toBe(0);
    expect(draft.currentMental).toBe(draft.maximumMental);
    expect(outcome.events.map((event) => event.eventType)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.forcedRestApplied,
      WEEKLY_TRAINING_EVENT_TYPES.restApplied,
    ]);
    expect(outcome.events[0]?.payload["forcedReason"]).toBe("severe_injury");
  });
});

/* ----------------------------------------------------------------- processor */

describe("processWeeklyTrainingWeek", () => {
  it("applies train_stat and emits the fixed per-person event order", () => {
    const result = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.statGrowthApplied,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);

    const selected = result.eventCandidates[0]!;
    expect(selected.payload["action"]).toBe("train_stat");
    expect(selected.payload["targetStat"]).toBe("strength");
    expect(selected.payload["targetTechniqueId"]).toBeNull();
    expect(selected.payload["forced"]).toBe(false);
    expect(selected.payload["fallbackReasons"]).toEqual([]);
    expect(selected).not.toHaveProperty("eventId");
    expect(selected).not.toHaveProperty("simulationId");
    expect(selected).not.toHaveProperty("sequence");

    const growth = result.eventCandidates[1]!;
    expect(growth.payload["targetStat"]).toBe("strength");
    expect(Number(growth.payload["appliedMilliPoints"])).toBeGreaterThan(0);

    const runtime = result.runtimeState;
    expect(runtime.lastProcessedAbsoluteWeek).toBe(10);
    expect(runtime.processedPersonCount).toBe(1);
    expect(runtime.actionCounts.train_stat).toBe(1);
    expect(runtime.totalStatGainMilliPoints).toBeGreaterThan(0);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.personRecords)).toBe(true);
  });

  it("carries the growth remainder and raises fatigue by the train_stat delta", () => {
    const result = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    const output = result.personRecords[0]!;
    expect(output.temporaryCondition.fatigue).toBe(8);

    const strength = output.statGrowthRemainders.find((entry) => entry.stat === "strength")!;
    const applied = Number(result.eventCandidates[1]!.payload["appliedMilliPoints"]);
    expect(strength.milliPoints).toBe(applied % 1000);
    const person0 = output.person as unknown as {
      abilities: Record<string, { surfaceValue: number } | undefined>;
    };
    expect(person0.abilities["strength"]?.surfaceValue).toBe(50 + Math.floor(applied / 1000));
  });

  it("never mutates the caller's input records, runtime state, or RNG state", () => {
    const input = weekInput();
    const before = JSON.stringify(input);
    expectOkValue(processWeeklyTrainingWeek(input, dependencies));
    expect(JSON.stringify(input)).toBe(before);
  });

  it("returns identical results for the same seed and different results for another seed", () => {
    const a = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    const b = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));

    const c = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ rngState: rngState(987654) }), dependencies),
    );
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it("leaves inactive persons completely untouched and out of every counter", () => {
    const inactive = record({
      person: person({
        personId: "person_0000000000000002",
        participationStatus: "stopped",
      }),
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [record(), inactive] }), dependencies),
    );
    expect(eventsFor(result, "person_0000000000000002")).toHaveLength(0);
    expect(result.runtimeState.processedPersonCount).toBe(1);
    const untouched = result.personRecords.find(
      (entry) =>
        (entry.person as unknown as { personId: string }).personId === "person_0000000000000002",
    )!;
    expect(untouched.temporaryCondition).toEqual({
      fatigue: 0,
      injury: 0,
      condition: 0,
      confidence: 0,
    });
  });

  it("processes persons in PersonId order and keeps their inputs isolated", () => {
    const first = record({ person: person({ personId: "person_00000000000000a1" }) });
    const second = record({
      person: person({
        personId: "person_00000000000000a0",
        abilities: abilities({ strength: 70 }),
      }),
    });
    const input = weekInput({ personRecords: [first, second] });
    const snapshot = JSON.stringify(input.personRecords);
    const result = expectOkValue(processWeeklyTrainingWeek(input, dependencies));

    expect(
      result.personRecords.map(
        (entry) => (entry.person as unknown as { personId: string }).personId,
      ),
    ).toEqual(["person_00000000000000a0", "person_00000000000000a1"]);
    expect(result.eventCandidates[0]?.personId).toBe("person_00000000000000a0");
    expect(JSON.stringify(input.personRecords)).toBe(snapshot);
  });

  it("emits the forced-rest event fixture and counts the forced rest", () => {
    const forced = record({
      temporaryCondition: { fatigue: 40, injury: 70, condition: 0, confidence: 0 },
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [forced] }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.forcedRestApplied,
      WEEKLY_TRAINING_EVENT_TYPES.restApplied,
    ]);
    expect(result.eventCandidates[0]?.payload["forcedReason"]).toBe("severe_injury");
    expect(result.runtimeState.forcedRestCount).toBe(1);
    expect(result.runtimeState.actionCounts.rest).toBe(1);
  });

  it("emits the practice fixture and stamps lastPracticedAbsoluteWeek without touching counts", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const practiceRecord = record({
      person: person({
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 1000,
              successfulUseCount: 3,
              attemptedUseCount: 4,
            }),
          ],
        },
      }),
      plannerContext: plannerContext({ practice_technique: { personality: 20 } }),
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [practiceRecord], catalog }),
        dependencies,
      ),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const state = (
      result.personRecords[0]!.person as unknown as {
        sprint1State: { techniqueStates: readonly Record<string, unknown>[] };
      }
    ).sprint1State.techniqueStates[0]!;
    expect(state["lastPracticedAbsoluteWeek"]).toBe(10);
    expect(state["successfulUseCount"]).toBe(3);
    expect(state["attemptedUseCount"]).toBe(4);
    expect(Number(state["masteryHundredths"])).toBeGreaterThan(1000);
    expect(result.runtimeState.totalMasteryGainHundredths).toBeGreaterThan(0);
  });

  it("emits the learn-progress fixture and keeps the learning focus while progressing", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const learnRecord = record({
      person: person({
        sprint1State: { techniqueStates: [techniqueState("technique_alpha")] },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
      ],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [learnRecord], catalog }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const sprint1State = (
      result.personRecords[0]!.person as unknown as {
        sprint1State: {
          learningFocusTechniqueId: string | null;
          techniqueStates: readonly Record<string, unknown>[];
        };
      }
    ).sprint1State;
    expect(sprint1State.learningFocusTechniqueId).toBe("technique_alpha");
    expect(Number(sprint1State.techniqueStates[0]!["learningProgressTenths"])).toBeGreaterThan(0);
    expect(result.runtimeState.totalLearningProgressGainTenths).toBeGreaterThan(0);
  });

  it("completes an acquirable technique with no progress event and no effect RNG", () => {
    const catalog = buildCatalog([
      definition("technique_alpha", { learningTier: "basic", learningProgressRequired: 100 }),
    ]);
    const acquirable = record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_alpha", { learningProgressTenths: 1000 })],
          learningFocusTechniqueId: "technique_alpha",
        },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
      ],
    });
    const input = weekInput({ personRecords: [acquirable], catalog });
    const result = expectOkValue(processWeeklyTrainingWeek(input, dependencies));

    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    expect(eventTypes(result)).not.toContain(WEEKLY_TRAINING_EVENT_TYPES.learningProgressed);

    const sprint1State = (
      result.personRecords[0]!.person as unknown as {
        sprint1State: {
          learningFocusTechniqueId: string | null;
          techniqueStates: readonly Record<string, unknown>[];
        };
      }
    ).sprint1State;
    expect(sprint1State.learningFocusTechniqueId).toBeNull();
    expect(sprint1State.techniqueStates[0]!["acquiredAbsoluteWeek"]).toBe(10);
    // basic tier initial mastery is 20 display points.
    expect(sprint1State.techniqueStates[0]!["masteryHundredths"]).toBe(2000);
    expect(sprint1State.techniqueStates[0]!["learningProgressTenths"]).toBe(1000);
    expect(result.runtimeState.totalLearningProgressGainTenths).toBe(0);
    expect(result.runtimeState.totalMasteryGainHundredths).toBe(2000);

    // Effect RNG is not consumed, so the exported state equals the untouched input state.
    expect(result.rngState).toEqual(input.rngState);
  });

  it("adds the accompanying normal-training mastery event when training a related stat", () => {
    const catalog = buildCatalog([definition("technique_alpha", { primaryStats: ["strength"] })]);
    const trainRecord = record({
      person: person({
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 1000,
            }),
          ],
        },
      }),
      techniqueTargetContexts: [],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [trainRecord], catalog }), dependencies),
    );
    expect(result.eventCandidates[0]?.payload["action"]).toBe("train_stat");
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.statGrowthApplied,
      WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    expect(result.eventCandidates[2]?.payload["rngUsage"]).toBeNull();
  });

  it("rejects duplicate PersonIds, same-week reprocessing, and week regression", () => {
    expect(
      expectIssues(
        processWeeklyTrainingWeek(weekInput({ personRecords: [record(), record()] }), dependencies),
      )[0]?.message,
    ).toContain("duplicate PersonId");

    const resumed = {
      ...createInitialTrainingProcessorRuntimeState(),
      lastProcessedAbsoluteWeek: 10,
    };
    expect(
      expectIssues(processWeeklyTrainingWeek(weekInput({ runtimeState: resumed }), dependencies))[0]
        ?.message,
    ).toContain("same absoluteWeek");
    expect(
      expectIssues(
        processWeeklyTrainingWeek(
          weekInput({ absoluteWeek: 9, runtimeState: resumed }),
          dependencies,
        ),
      )[0]?.message,
    ).toContain("monotonically");
  });

  it("rejects a missing RNG state, an unknown input key, and a missing Sha256Provider", () => {
    const noRng = weekInput();
    delete noRng["rngState"];
    expect(expectIssues(processWeeklyTrainingWeek(noRng, dependencies))[0]?.path).toBe("/rngState");

    expect(
      expectIssues(processWeeklyTrainingWeek({ ...weekInput(), simulationId: "x" }, dependencies))
        .length,
    ).toBeGreaterThan(0);

    expect(expectIssues(processWeeklyTrainingWeek(weekInput()))[0]?.path).toBe("/catalog");
  });

  it("atomicity: rolls the whole week back when a later person fails", () => {
    const good = record({ person: person({ personId: "person_00000000000000b1" }) });
    // A future lastPracticedAbsoluteWeek passes every input check and only fails while
    // the second person is being processed, after the first person already succeeded.
    const broken = record({
      person: person({
        personId: "person_00000000000000b2",
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              lastPracticedAbsoluteWeek: 999,
            }),
          ],
        },
      }),
    });
    const input = weekInput({ personRecords: [good, broken] });
    const snapshot = JSON.stringify(input);
    const issues = expectIssues(processWeeklyTrainingWeek(input, dependencies));
    expect(issues[0]?.path).toContain("person_00000000000000b2");
    expect(JSON.stringify(input)).toBe(snapshot);

    // The successful first person produced no committed output.
    const alone = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [good] }), dependencies),
    );
    expect(alone.runtimeState.processedPersonCount).toBe(1);
  });

  it("accumulates runtime counters across two consecutive weeks", () => {
    const week1 = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    const week2 = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          absoluteWeek: 11,
          personRecords: [...week1.personRecords],
          runtimeState: week1.runtimeState,
          rngState: week1.rngState,
        }),
        dependencies,
      ),
    );
    expect(week2.runtimeState.lastProcessedAbsoluteWeek).toBe(11);
    expect(week2.runtimeState.processedPersonCount).toBe(2);
    expect(week2.runtimeState.actionCounts.train_stat).toBe(2);
    expect(week2.runtimeState.totalStatGainMilliPoints).toBeGreaterThan(
      week1.runtimeState.totalStatGainMilliPoints,
    );
    expect(week2.personRecords[0]!.temporaryCondition.fatigue).toBe(16);
  });

  it("uses the weekStart snapshot for a master/disciple pair in the same week", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const masterState = techniqueState("technique_alpha", {
      acquiredAbsoluteWeek: 1,
      masteryHundredths: 5000,
    });
    const master = record({
      person: person({
        personId: "person_00000000000000c1",
        sprint1State: { techniqueStates: [masterState] },
      }),
      plannerContext: plannerContext({ practice_technique: { personality: 20 } }),
    });
    const disciple = record({
      person: person({
        personId: "person_00000000000000c2",
        sprint1State: { techniqueStates: [techniqueState("technique_alpha")] },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        {
          techniqueId: "technique_alpha",
          teacherCanTeachContext: teacherContext({ masterTechniqueState: masterState }),
        },
      ],
    });

    const together = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [master, disciple], catalog }),
        dependencies,
      ),
    );
    const masterEvents = eventsFor(together, "person_00000000000000c1");
    const discipleEvents = eventsFor(together, "person_00000000000000c2");
    expect(masterEvents[0]?.payload["action"]).toBe("practice_technique");
    expect(discipleEvents[0]?.payload["action"]).toBe("learn_technique");

    const progressed = discipleEvents.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
    )!;
    const breakdown = progressed.payload["factorBreakdown"] as Record<string, number>;
    // The master's mastery grew this week, but the disciple's teachability and factors
    // are read from the frozen weekStart snapshot, so its inputs stay neutral.
    expect(breakdown["learningTrait"]).toBe(50);
    expect(breakdown["teachingAbility"]).toBe(50);
    expect(breakdown["compatibility"]).toBe(50);
    const masterAfter = together.personRecords.find(
      (entry) =>
        (entry.person as unknown as { personId: string }).personId === "person_00000000000000c1",
    )!;
    const masterMastery = sprint1StateOf(masterAfter).techniqueStates[0]!.masteryHundredths;
    expect(Number(masterMastery)).toBeGreaterThan(5000);
  });
});

/* --------------------------------------------------------------- focus lifecycle */

describe("weekly learning focus lifecycle", () => {
  const focusCatalog = buildCatalog([definition("technique_alpha")]);

  function focusRecord(
    teacherOverrides: Record<string, unknown> = {},
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_alpha")],
          learningFocusTechniqueId: "technique_alpha",
        },
      }),
      techniqueTargetContexts: [
        {
          techniqueId: "technique_alpha",
          teacherCanTeachContext: teacherContext(teacherOverrides),
        },
      ],
      ...overrides,
    });
  }

  it("focus lifecycle: a lost knowledge source releases the focus even when train_stat runs", () => {
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [focusRecord({ activeMentorshipExists: false })],
          catalog: focusCatalog,
        }),
        dependencies,
      ),
    );
    expect(result.eventCandidates[0]?.payload["action"]).toBe("train_stat");
    expect(sprint1StateOf(result.personRecords[0]!).learningFocusTechniqueId).toBeNull();
  });

  it("focus lifecycle: releasing a focus consumes no RNG and no extra event", () => {
    const released = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [focusRecord({ activeMentorshipExists: false })],
          catalog: focusCatalog,
        }),
        dependencies,
      ),
    );
    const alreadyNull = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [
            record({
              person: person({
                sprint1State: { techniqueStates: [techniqueState("technique_alpha")] },
              }),
              techniqueTargetContexts: [
                {
                  techniqueId: "technique_alpha",
                  teacherCanTeachContext: teacherContext({ activeMentorshipExists: false }),
                },
              ],
            }),
          ],
          catalog: focusCatalog,
        }),
        dependencies,
      ),
    );
    expect(released.rngState).toEqual(alreadyNull.rngState);
    expect(JSON.stringify(released)).toBe(JSON.stringify(alreadyNull));
  });

  it("focus lifecycle: a blocked_at_cap focus is released before action selection", () => {
    const cappedCatalog = buildCatalog([
      definition("technique_beta", {
        requiredStats: { strength: 90 },
        learningTier: "basic",
        learningProgressRequired: 100,
      }),
    ]);
    const blocked = record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_beta", { learningProgressTenths: 1000 })],
          learningFocusTechniqueId: "technique_beta",
        },
      }),
      techniqueTargetContexts: [
        {
          techniqueId: "technique_beta",
          teacherCanTeachContext: teacherContext({
            masterTechniqueState: techniqueState("technique_beta", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 5000,
            }),
          }),
        },
      ],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [blocked], catalog: cappedCatalog }),
        dependencies,
      ),
    );
    expect(result.eventCandidates[0]?.payload["action"]).toBe("train_stat");
    expect(sprint1StateOf(result.personRecords[0]!).learningFocusTechniqueId).toBeNull();
  });

  it("focus lifecycle: focus release only happens when a maintain condition fails", () => {
    const resting = focusRecord(
      {},
      { temporaryCondition: { fatigue: 40, injury: 70, condition: 0, confidence: 0 } },
    );
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [resting], catalog: focusCatalog }),
        dependencies,
      ),
    );
    expect(result.eventCandidates[0]?.payload["action"]).toBe("rest");
    expect(sprint1StateOf(result.personRecords[0]!).learningFocusTechniqueId).toBe(
      "technique_alpha",
    );
  });

  it("focus lifecycle: normalizeWeeklyLearningFocus maintains, releases, and passes null through", () => {
    const maintained = expectOkValue(validateWeeklyTrainingPersonRecord(focusRecord()));
    expect(
      expectOkValue(
        normalizeWeeklyLearningFocus(
          maintained.view.sprint1State,
          focusCatalog,
          maintained.record.techniqueTargetContexts,
          maintained.view.abilities,
          maintained.view.aptitudes,
        ),
      ),
    ).toEqual({ learningFocusTechniqueId: "technique_alpha", released: false });

    const lost = expectOkValue(
      validateWeeklyTrainingPersonRecord(focusRecord({ activeMentorshipExists: false })),
    );
    expect(
      expectOkValue(
        normalizeWeeklyLearningFocus(
          lost.view.sprint1State,
          focusCatalog,
          lost.record.techniqueTargetContexts,
          lost.view.abilities,
          lost.view.aptitudes,
        ),
      ),
    ).toEqual({ learningFocusTechniqueId: null, released: true });

    const none = expectOkValue(validateWeeklyTrainingPersonRecord(record()));
    expect(
      expectOkValue(
        normalizeWeeklyLearningFocus(
          none.view.sprint1State,
          focusCatalog,
          none.record.techniqueTargetContexts,
          none.view.abilities,
          none.view.aptitudes,
        ),
      ),
    ).toEqual({ learningFocusTechniqueId: null, released: false });
  });

  it("focus lifecycle: an acquired focus is released instead of being trained again", () => {
    const acquired = expectOkValue(
      validateWeeklyTrainingPersonRecord(
        record({
          person: person({
            sprint1State: {
              techniqueStates: [
                techniqueState("technique_alpha", {
                  acquiredAbsoluteWeek: 1,
                  masteryHundredths: 1000,
                }),
              ],
              learningFocusTechniqueId: "technique_alpha",
            },
          }),
          techniqueTargetContexts: [
            { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
          ],
        }),
      ),
    );
    expect(
      expectOkValue(
        normalizeWeeklyLearningFocus(
          acquired.view.sprint1State,
          focusCatalog,
          acquired.record.techniqueTargetContexts,
          acquired.view.abilities,
          acquired.view.aptitudes,
        ),
      ),
    ).toEqual({ learningFocusTechniqueId: null, released: true });
  });

  it("focus lifecycle: a focus missing from the catalog is rejected as invalid input", () => {
    const dangling = record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_missing")],
          learningFocusTechniqueId: "technique_missing",
        },
      }),
    });
    const issues = expectIssues(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [dangling], catalog: focusCatalog }),
        dependencies,
      ),
    );
    expect(issues.some((issue) => issue.path.includes("/person/sprint1State"))).toBe(true);

    const validated = expectOkValue(validateWeeklyTrainingPersonRecord(dangling));
    expect(
      expectIssues(
        normalizeWeeklyLearningFocus(
          validated.view.sprint1State,
          focusCatalog,
          validated.record.techniqueTargetContexts,
          validated.view.abilities,
          validated.view.aptitudes,
        ),
      )[0]?.path,
    ).toContain("learningFocusTechniqueId");
  });
});

/* ------------------------------------------------------- inactive person contract */

describe("inactive person Sprint1PersonState contract", () => {
  it("inactive state contract: deceased with valid Sprint1PersonState stays untouched", () => {
    const deceased = record({ person: deceasedPerson({ personId: "person_00000000000000d2" }) });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [record(), deceased] }), dependencies),
    );
    expect(eventsFor(result, "person_00000000000000d2")).toHaveLength(0);
    expect(result.runtimeState.processedPersonCount).toBe(1);
    const untouched = recordFor(result, "person_00000000000000d2");
    expect(untouched.temporaryCondition).toEqual({
      fatigue: 0,
      injury: 0,
      condition: 0,
      confidence: 0,
    });
    expect(sprint1StateOf(untouched).currentMental).toBe(100);
  });

  it("inactive state contract: deceased without Sprint1PersonState is rejected", () => {
    const issues = expectIssues(
      validateWeeklyTrainingPersonRecord(
        record({ person: deceasedPerson({ sprint1State: undefined }) }),
      ),
    );
    expect(issues.some((issue) => issue.path === "/person/sprint1State")).toBe(true);
  });

  it("inactive state contract: waiting without Sprint1PersonState is rejected", () => {
    const issues = expectIssues(
      validateWeeklyTrainingPersonRecord(
        record({ person: person({ participationStatus: "waiting", sprint1State: undefined }) }),
      ),
    );
    expect(issues.some((issue) => issue.path === "/person/sprint1State")).toBe(true);
  });

  it("inactive state contract: stopped without Sprint1PersonState is rejected by the processor", () => {
    const issues = expectIssues(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [
            record({
              person: person({ participationStatus: "stopped", sprint1State: undefined }),
            }),
          ],
        }),
        dependencies,
      ),
    );
    expect(issues.some((issue) => issue.path.endsWith("/person/sprint1State"))).toBe(true);
  });

  it("inactive state contract: inactive with an invalid techniqueId is rejected at input", () => {
    const issues = expectIssues(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [
            record(),
            record({
              person: person({
                personId: "person_00000000000000d3",
                participationStatus: "stopped",
                sprint1State: { techniqueStates: [techniqueState("technique_missing")] },
              }),
            }),
          ],
        }),
        dependencies,
      ),
    );
    expect(
      issues.some((issue) => issue.path.includes("/person/sprint1State/techniqueStates")),
    ).toBe(true);
  });
});

/* ----------------------------------------------------------- post-update contract */

describe("processed person post-validation", () => {
  const postCatalog = buildCatalog([definition("technique_alpha")]);

  function processedRecord(): WeeklyTrainingPersonRecord {
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [
            record({
              person: person({
                sprint1State: { techniqueStates: [techniqueState("technique_alpha")] },
              }),
              plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
              techniqueTargetContexts: [
                { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
              ],
            }),
          ],
          catalog: postCatalog,
        }),
        dependencies,
      ),
    );
    return result.personRecords[0]!;
  }

  it("post-validation: every committed record passes the post-update gate", () => {
    const committed = processedRecord();
    expect(sprint1StateOf(committed).learningFocusTechniqueId).toBe("technique_alpha");
    expectOkValue(validateProcessedWeeklyPersonRecord(committed, postCatalog, sha256Provider));
  });

  it("post-validation: a focus inconsistency after effect application is rejected", () => {
    const corrupted = mutableCopy(processedRecord());
    const state = childObject(childObject(corrupted, "person"), "sprint1State");
    state["learningFocusTechniqueId"] = "technique_ghost";
    expect(
      expectIssues(validateProcessedWeeklyPersonRecord(corrupted, postCatalog, sha256Provider))
        .length,
    ).toBeGreaterThan(0);
  });

  it("post-update: progress above the learningProgressRequired cap is rejected", () => {
    const corrupted = mutableCopy(processedRecord());
    const state = childObject(childObject(corrupted, "person"), "sprint1State");
    const techniqueStates = state["techniqueStates"] as Record<string, unknown>[];
    techniqueStates[0]!["learningProgressTenths"] = 1801;
    const issues = expectIssues(
      validateProcessedWeeklyPersonRecord(corrupted, postCatalog, sha256Provider),
    );
    expect(issues.some((issue) => issue.message.includes("learningProgressRequired"))).toBe(true);
  });

  it("post-validation: a remainder out of range is rejected", () => {
    const corrupted = mutableCopy(processedRecord());
    const remainders = corrupted["statGrowthRemainders"] as Record<string, unknown>[];
    remainders[0]!["milliPoints"] = 1000;
    expect(
      expectIssues(validateProcessedWeeklyPersonRecord(corrupted, postCatalog, sha256Provider))[0]
        ?.path,
    ).toContain("/statGrowthRemainders");
  });

  it("post-validation: an out-of-range temporaryCondition after effect is rejected", () => {
    const corrupted = mutableCopy(processedRecord());
    childObject(corrupted, "temporaryCondition")["fatigue"] = 101;
    expect(
      expectIssues(validateProcessedWeeklyPersonRecord(corrupted, postCatalog, sha256Provider))[0]
        ?.path,
    ).toContain("/temporaryCondition");
  });

  it("atomicity: post-validation failure on the second person discards the whole week", () => {
    const first = record({ person: person({ personId: "person_00000000000000e1" }) });
    const second = record({ person: person({ personId: "person_00000000000000e2" }) });
    const input = weekInput({ personRecords: [first, second] });
    const catalog = input["catalog"] as TechniqueCatalog;
    const result = expectOkValue(processWeeklyTrainingWeek(input, dependencies));

    // The processor runs this gate between rebuildRecord and the personRecords push, so
    // every committed record clears it and a failing one aborts the week before any
    // record is committed (no partial result is ever returned).
    for (const committed of result.personRecords) {
      expectOkValue(validateProcessedWeeklyPersonRecord(committed, catalog, sha256Provider));
    }
    const corrupted = mutableCopy(recordFor(result, "person_00000000000000e2"));
    childObject(childObject(corrupted, "person"), "sprint1State")["currentMental"] = 999;
    expect(
      expectIssues(validateProcessedWeeklyPersonRecord(corrupted, catalog, sha256Provider)).length,
    ).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------- person boundary rules */

describe("weekly person boundary validation", () => {
  it("person boundary: a living person with deathYear is rejected", () => {
    const issues = expectIssues(
      validateWeeklyTrainingPersonRecord(
        record({ person: person({ deathYear: 21, ageAtDeath: 20 }) }),
      ),
    );
    expect(issues.some((issue) => issue.path === "/person/deathYear")).toBe(true);
  });

  it("person boundary: a deceased person with currentAge or currentRank is rejected", () => {
    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: deceasedPerson({ currentAge: 20 }) })),
      ).some((issue) => issue.path === "/person/currentAge"),
    ).toBe(true);

    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(
          record({
            person: deceasedPerson({
              careerStatus: "active_competitor",
              currentRank: "C",
              highestRank: "C",
            }),
          }),
        ),
      ).some((issue) => issue.path === "/person/currentRank"),
    ).toBe(true);
  });

  it("person boundary: an invalid career and rank combination is rejected", () => {
    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: person({ currentRank: "C" }) })),
      ).some((issue) => issue.path === "/person/currentRank"),
    ).toBe(true);

    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(
          record({ person: person({ careerStatus: "active_competitor", highestRank: "C" }) }),
        ),
      ).some((issue) => issue.path === "/person/currentRank"),
    ).toBe(true);

    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(
          record({
            person: person({
              careerStatus: "active_competitor",
              currentRank: "C",
              highestRank: "C",
              qualifiedMaster: true,
            }),
          }),
        ),
      ).some((issue) => issue.path === "/person/qualifiedMaster"),
    ).toBe(true);

    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(
          record({ person: person({ careerStatus: "child", qualifiedMaster: true }) }),
        ),
      ).some((issue) => issue.path === "/person/qualifiedMaster"),
    ).toBe(true);

    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(
          record({
            person: person({
              careerStatus: "retired",
              currentRank: "C",
              retirementRank: "C",
              highestRank: "C",
            }),
          }),
        ),
      ).some((issue) => issue.path === "/person/currentRank"),
    ).toBe(true);
  });

  it("person boundary: a missing required person field is rejected", () => {
    for (const field of ["displayName", "nameDataVersion", "familyId", "qualifiedMaster"]) {
      const issues = expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: person({ [field]: undefined }) })),
      );
      expect(issues.some((issue) => issue.path === `/person/${field}`)).toBe(true);
    }
    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: person({ sex: "other" }) })),
      ).some((issue) => issue.path === "/person/sex"),
    ).toBe(true);
  });

  it("person boundary: ageAtDeath must equal deathYear - birthYear", () => {
    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: deceasedPerson({ ageAtDeath: 19 }) })),
      ).some((issue) => issue.path === "/person/ageAtDeath"),
    ).toBe(true);
    expectOkValue(validateWeeklyTrainingPersonRecord(record({ person: deceasedPerson() })));
  });

  it("person boundary: unrelated allowed fields such as lineageId survive the rebuild", () => {
    const withLineage = record({
      person: person({ lineageId: "lineage_0000000000000001" }),
    });
    expect(
      expectOkValue(validateWeeklyTrainingPersonRecord(withLineage)).record.person.lineageId,
    ).toBe("lineage_0000000000000001");

    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [withLineage] }), dependencies),
    );
    expect(result.personRecords[0]!.person.lineageId).toBe("lineage_0000000000000001");
  });

  it("person boundary: an unknown own key on the person is rejected", () => {
    expect(
      expectIssues(
        validateWeeklyTrainingPersonRecord(record({ person: person({ nickname: "Ai" }) })),
      ).some((issue) => issue.path === "/person/nickname"),
    ).toBe(true);
  });
});

/* --------------------------------------------------------- processor input hardening */

describe("processWeeklyTrainingWeek input hardening", () => {
  it("input hardening: a root input getter is rejected without throwing", () => {
    const hostile = weekInput();
    Object.defineProperty(hostile, "absoluteWeek", { get: () => 10, enumerable: true });
    expect(expectIssues(processWeeklyTrainingWeek(hostile, dependencies)).length).toBeGreaterThan(
      0,
    );
  });

  it("input hardening: a personRecords getter is rejected without throwing", () => {
    const hostile: Record<string, unknown> = { ...weekInput() };
    delete hostile["personRecords"];
    Object.defineProperty(hostile, "personRecords", {
      get: () => [record()],
      enumerable: true,
      configurable: true,
    });
    expect(expectIssues(processWeeklyTrainingWeek(hostile, dependencies))[0]?.path).toBe(
      "/personRecords",
    );
  });

  it("input hardening: a rngState getter is rejected without throwing", () => {
    const hostile: Record<string, unknown> = { ...weekInput() };
    delete hostile["rngState"];
    Object.defineProperty(hostile, "rngState", {
      get: () => rngState(),
      enumerable: true,
      configurable: true,
    });
    expect(expectIssues(processWeeklyTrainingWeek(hostile, dependencies))[0]?.path).toBe(
      "/rngState",
    );
  });

  it("input hardening: a Symbol key on the input is rejected", () => {
    const hostile: Record<string | symbol, unknown> = { ...weekInput() };
    hostile[Symbol("hidden")] = 1;
    expect(expectIssues(processWeeklyTrainingWeek(hostile, dependencies)).length).toBeGreaterThan(
      0,
    );
  });

  it("input hardening: a throwing Proxy input fails validation instead of throwing", () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys(): string[] {
          throw new Error("hostile ownKeys trap");
        },
      },
    );
    expect(() => processWeeklyTrainingWeek(hostile, dependencies)).not.toThrow();
    expect(expectIssues(processWeeklyTrainingWeek(hostile, dependencies)).length).toBeGreaterThan(
      0,
    );
  });

  it("input hardening: a revoked Proxy input fails validation instead of throwing", () => {
    const revocable = Proxy.revocable({ absoluteWeek: 10 }, {});
    revocable.revoke();
    expect(() => processWeeklyTrainingWeek(revocable.proxy, dependencies)).not.toThrow();
    expect(
      expectIssues(processWeeklyTrainingWeek(revocable.proxy, dependencies)).length,
    ).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------- rng state hardening */

describe("SeededRngState hardening", () => {
  it("rng state hardening: a valid state round-trips through validateSeededRngState", () => {
    const state = createSeededRng(4242).exportState();
    expect(expectOkValue(validateSeededRngState(state))).toEqual(state);
    expect(Object.keys(expectOkValue(validateSeededRngState(state)))).toEqual([
      ...SEEDED_RNG_STATE_KEYS,
    ]);
  });

  it("rng state hardening: a rngState getter is rejected", () => {
    const hostile: Record<string, unknown> = { ...createSeededRng(1).exportState() };
    delete hostile["s0"];
    let reads = 0;
    Object.defineProperty(hostile, "s0", {
      get: () => {
        reads += 1;
        return 1;
      },
      enumerable: true,
      configurable: true,
    });
    expect(expectIssues(validateSeededRngState(hostile)).length).toBeGreaterThan(0);
    expect(reads).toBe(0);
  });

  it("rng state hardening: a rngState symbol key is rejected", () => {
    const hostile: Record<string | symbol, unknown> = { ...createSeededRng(1).exportState() };
    hostile[Symbol("s4")] = 1;
    expect(expectIssues(validateSeededRngState(hostile)).length).toBeGreaterThan(0);
  });

  it("rng state hardening: version, word range, unknown keys, and all-zero states are rejected", () => {
    const base = createSeededRng(7).exportState();
    expect(
      expectIssues(validateSeededRngState({ ...base, algorithmVersion: "xoshiro128ss-v2" }))[0]
        ?.path,
    ).toBe("/algorithmVersion");
    expect(expectIssues(validateSeededRngState({ ...base, s1: -1 }))[0]?.path).toBe("/s1");
    expect(expectIssues(validateSeededRngState({ ...base, s2: 4294967296 }))[0]?.path).toBe("/s2");
    expect(expectIssues(validateSeededRngState({ ...base, s3: 1.5 }))[0]?.path).toBe("/s3");
    expect(expectIssues(validateSeededRngState({ ...base, s3: Number.NaN }))[0]?.path).toBe("/s3");
    expect(expectIssues(validateSeededRngState({ ...base, extra: 1 }))[0]?.path).toBe("/extra");
    expect(
      expectIssues(
        validateSeededRngState({
          algorithmVersion: RNG_ALGORITHM_VERSION,
          s0: 0,
          s1: 0,
          s2: 0,
          s3: 0,
        }),
      )[0]?.message,
    ).toContain("all zero");
    expect(expectIssues(validateSeededRngState(null)).length).toBeGreaterThan(0);
  });

  it("rng state hardening: a revoked Proxy state fails validation instead of throwing", () => {
    const revocable = Proxy.revocable({ ...createSeededRng(3).exportState() }, {});
    revocable.revoke();
    expect(() => validateSeededRngState(revocable.proxy)).not.toThrow();
    expect(expectIssues(validateSeededRngState(revocable.proxy)).length).toBeGreaterThan(0);
  });

  it("rng state hardening: the processor rejects a state whose words are not uint32", () => {
    expect(
      expectIssues(
        processWeeklyTrainingWeek(
          weekInput({
            rngState: { ...createSeededRng(5).exportState(), s0: 4294967296 },
          }),
          dependencies,
        ),
      )[0]?.path,
    ).toBe("/rngState/s0");
  });
});

/* ------------------------------------------ formal training age boundary */

describe("formal training age boundary", () => {
  it("age 42 rest applies with zero RNG and no ability / learning / mastery change", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const before = record({
      person: person({
        careerStatus: "trainee",
        currentAge: 42,
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 2500,
            }),
          ],
        },
      }),
      temporaryCondition: { fatigue: 20, injury: 0, condition: 0, confidence: 0 },
      plannerContext: plannerContext({ train_stat: { personality: 20 } }),
    });
    const abilitySnapshot = JSON.stringify((before.person as Record<string, unknown>)["abilities"]);
    const techniqueSnapshot = JSON.stringify(
      ((before.person as Record<string, unknown>)["sprint1State"] as Record<string, unknown>)[
        "techniqueStates"
      ],
    );
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [before], catalog }), dependencies),
    );

    expect(result.eventCandidates.map((event) => event.eventType)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.restApplied,
    ]);
    expect(result.eventCandidates[0]?.payload["action"]).toBe("rest");
    expect(result.eventCandidates[0]?.payload["forcedReason"]).toBeNull();
    expect(result.runtimeState.actionCounts.rest).toBe(1);
    expect(result.runtimeState.processedPersonCount).toBe(1);
    expect(result.runtimeState.totalStatGainMilliPoints).toBe(0);
    expect(result.runtimeState.totalLearningProgressGainTenths).toBe(0);
    expect(result.runtimeState.totalMasteryGainHundredths).toBe(0);
    expect(JSON.stringify(result.personRecords[0]!.person.abilities)).toBe(abilitySnapshot);
    expect(JSON.stringify(sprint1StateOf(result.personRecords[0]!).techniqueStates)).toBe(
      techniqueSnapshot,
    );
    // Single rest candidate: action / target / effect RNG are all unused.
    expect(result.rngState).toEqual(rngState());
  });
});

/* ------------------------------------------ teacher context CareerStatus */

describe("teacher context CareerStatus enum", () => {
  const formalCareers: readonly CareerStatus[] = [
    "child",
    "trainee",
    "active_competitor",
    "retired",
  ];

  it("accepts the four formal CareerStatus values on teacher context", () => {
    for (const masterCareerStatus of formalCareers) {
      expect(
        expectOkValue(validateTeacherCanTeachContext(teacherContext({ masterCareerStatus })))
          .masterCareerStatus,
      ).toBe(masterCareerStatus);
      expect(
        validateTechniqueTargetContext({
          techniqueId: "technique_alpha",
          teacherCanTeachContext: teacherContext({ masterCareerStatus }),
        }).ok,
      ).toBe(true);
    }
  });

  it("rejects invalid masterCareerStatus values at context and record validation", () => {
    for (const masterCareerStatus of ["", "active", "invalid_career", 1, null] as const) {
      expect(
        expectIssues(validateTeacherCanTeachContext(teacherContext({ masterCareerStatus }))).some(
          (issue) => issue.path.includes("masterCareerStatus"),
        ),
      ).toBe(true);
      expect(
        validateTechniqueTargetContext({
          techniqueId: "technique_alpha",
          teacherCanTeachContext: teacherContext({ masterCareerStatus }),
        }).ok,
      ).toBe(false);
      expect(
        validateWeeklyTrainingPersonRecord(
          record({
            techniqueTargetContexts: [
              {
                techniqueId: "technique_alpha",
                teacherCanTeachContext: teacherContext({ masterCareerStatus }),
              },
            ],
          }),
        ).ok,
      ).toBe(false);
    }
  });

  it("fails the processor before any RNG when masterCareerStatus is invalid", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const before = rngState();
    const input = weekInput({
      catalog,
      personRecords: [
        record({
          techniqueTargetContexts: [
            {
              techniqueId: "technique_alpha",
              teacherCanTeachContext: teacherContext({ masterCareerStatus: "invalid_career" }),
            },
          ],
        }),
      ],
      rngState: before,
    });
    const issues = expectIssues(processWeeklyTrainingWeek(input, dependencies));
    expect(issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(issues)).toContain("masterCareerStatus");
    expect(input.rngState).toEqual(before);
  });

  it("rejects a masterCareerStatus getter without reading it", () => {
    const hostile = teacherContext();
    delete hostile["masterCareerStatus"];
    let getterCalls = 0;
    Object.defineProperty(hostile, "masterCareerStatus", {
      get: () => {
        getterCalls += 1;
        return "active_competitor";
      },
      enumerable: true,
      configurable: true,
    });
    expect(validateTeacherCanTeachContext(hostile).ok).toBe(false);
    expect(getterCalls).toBe(0);
    expect(
      validateTechniqueTargetContext({
        techniqueId: "technique_alpha",
        teacherCanTeachContext: hostile,
      }).ok,
    ).toBe(false);
    expect(getterCalls).toBe(0);
  });

  it("rejects a revoked teacherContext Proxy without an external throw", () => {
    const revocable = Proxy.revocable(teacherContext(), {});
    revocable.revoke();
    expect(() => validateTeacherCanTeachContext(revocable.proxy)).not.toThrow();
    expect(validateTeacherCanTeachContext(revocable.proxy).ok).toBe(false);
    expect(() =>
      validateTechniqueTargetContext({
        techniqueId: "technique_alpha",
        teacherCanTeachContext: revocable.proxy,
      }),
    ).not.toThrow();
    expect(
      validateTechniqueTargetContext({
        techniqueId: "technique_alpha",
        teacherCanTeachContext: revocable.proxy,
      }).ok,
    ).toBe(false);
  });
});

/* ------------------------------------------ package root public API boundary */

describe("package root public API boundary", () => {
  it("exports the weekly processor entry and RuntimeState API, not internal drafts", () => {
    expect(typeof simulationCore.processWeeklyTrainingWeek).toBe("function");
    expect(typeof simulationCore.createInitialTrainingProcessorRuntimeState).toBe("function");
    expect(typeof simulationCore.validateTrainingProcessorRuntimeState).toBe("function");
    expect(typeof simulationCore.cloneTrainingProcessorRuntimeState).toBe("function");
    expect(typeof simulationCore.freezeTrainingProcessorRuntimeState).toBe("function");
    expect("WeeklyTrainingDraft" in simulationCore).toBe(false);
    expect("createWeeklyTrainingDraft" in simulationCore).toBe(false);
    expect("applyTrainStat" in simulationCore).toBe(false);
    expect("applyLearnTechnique" in simulationCore).toBe(false);
    expect("applyLearnTechniqueAcquirable" in simulationCore).toBe(false);
    expect("applyLearnTechniqueProgressing" in simulationCore).toBe(false);
    expect("applyPracticeTechnique" in simulationCore).toBe(false);
    expect("applyPractice" in simulationCore).toBe(false);
    expect("applyRest" in simulationCore).toBe(false);
    expect("validateProcessedWeeklyPersonRecord" in simulationCore).toBe(false);
    expect("normalizeWeeklyLearningFocus" in simulationCore).toBe(false);
  });
});

/* ------------------------------------------ technique event unit contract */

describe("technique event unit contract", () => {
  it("learning progress event carries unit tenths and preserves order", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const learnRecord = record({
      person: person({
        sprint1State: { techniqueStates: [techniqueState("technique_alpha")] },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
      ],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [learnRecord], catalog }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const progressed = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
    );
    expect(progressed?.payload["unit"]).toBe("tenths");
    expect(progressed?.payload).toMatchObject({
      techniqueId: "technique_alpha",
      unit: "tenths",
    });
    expect(typeof progressed?.payload["before"]).toBe("number");
    expect(typeof progressed?.payload["after"]).toBe("number");
    expect(typeof progressed?.payload["delta"]).toBe("number");
    expect(typeof progressed?.payload["progressCapTenths"]).toBe("number");
  });

  it("learning progress + acquired keeps unit tenths on learning_progressed only", () => {
    const catalog = buildCatalog([
      definition("technique_alpha", {
        learningTier: "basic",
        learningProgressRequired: 100,
        requiredAptitude: 0,
        requiredStats: { strength: 0 },
      }),
    ]);
    const nearCap = record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_alpha", { learningProgressTenths: 990 })],
          learningFocusTechniqueId: "technique_alpha",
        },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
      ],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [nearCap], catalog }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
      WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const progressed = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.learningProgressed,
    );
    const acquired = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired,
    );
    expect(progressed?.payload["unit"]).toBe("tenths");
    expect(acquired?.payload["unit"]).toBeUndefined();
    expect(acquired?.payload).toMatchObject({
      techniqueId: "technique_alpha",
      learningTier: "basic",
      acquiredAbsoluteWeek: 10,
      initialMasteryHundredths: 2000,
    });
    expect(acquired?.payload).not.toHaveProperty("before");
    expect(acquired?.payload).not.toHaveProperty("after");
    expect(acquired?.payload).not.toHaveProperty("delta");
  });

  it("dedicated practice mastery_increased carries unit hundredths", () => {
    const catalog = buildCatalog([definition("technique_alpha")]);
    const practiceRecord = record({
      person: person({
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 1000,
              successfulUseCount: 3,
              attemptedUseCount: 4,
            }),
          ],
        },
      }),
      plannerContext: plannerContext({ practice_technique: { personality: 20 } }),
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [practiceRecord], catalog }),
        dependencies,
      ),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const mastery = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
    );
    expect(mastery?.payload["unit"]).toBe("hundredths");
    expect(mastery?.payload["reason"]).toBe("dedicated_practice");
  });

  it("normal-training accompanying mastery_increased carries unit hundredths", () => {
    const catalog = buildCatalog([definition("technique_alpha", { primaryStats: ["strength"] })]);
    const trainRecord = record({
      person: person({
        sprint1State: {
          techniqueStates: [
            techniqueState("technique_alpha", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 1000,
            }),
          ],
        },
      }),
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [trainRecord], catalog }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.statGrowthApplied,
      WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    const mastery = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased,
    );
    const growth = result.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.statGrowthApplied,
    );
    expect(mastery?.payload["unit"]).toBe("hundredths");
    expect(mastery?.payload["reason"]).toBe("normal_training");
    expect(growth?.payload["unit"]).toBeUndefined();
  });

  it("acquirable immediate emits acquired without learning_progressed or unit", () => {
    const catalog = buildCatalog([
      definition("technique_alpha", { learningTier: "basic", learningProgressRequired: 100 }),
    ]);
    const acquirable = record({
      person: person({
        sprint1State: {
          techniqueStates: [techniqueState("technique_alpha", { learningProgressTenths: 1000 })],
          learningFocusTechniqueId: "technique_alpha",
        },
      }),
      plannerContext: plannerContext({ learn_technique: { personality: 20 } }),
      techniqueTargetContexts: [
        { techniqueId: "technique_alpha", teacherCanTeachContext: teacherContext() },
      ],
    });
    const result = expectOkValue(
      processWeeklyTrainingWeek(weekInput({ personRecords: [acquirable], catalog }), dependencies),
    );
    expect(eventTypes(result)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired,
      WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    ]);
    expect(eventTypes(result)).not.toContain(WEEKLY_TRAINING_EVENT_TYPES.learningProgressed);
    expect(result.eventCandidates[1]?.payload["unit"]).toBeUndefined();
  });

  it("rest and condition_updated do not carry technique unit fields", () => {
    const restResult = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({
          personRecords: [
            record({
              person: person({ careerStatus: "trainee", currentAge: 42 }),
              temporaryCondition: { fatigue: 20, injury: 0, condition: 0, confidence: 0 },
            }),
          ],
        }),
        dependencies,
      ),
    );
    expect(eventTypes(restResult)).toEqual([
      WEEKLY_TRAINING_EVENT_TYPES.actionSelected,
      WEEKLY_TRAINING_EVENT_TYPES.restApplied,
    ]);
    for (const event of restResult.eventCandidates) {
      expect(event.payload["unit"]).toBeUndefined();
    }

    const trainResult = expectOkValue(processWeeklyTrainingWeek(weekInput(), dependencies));
    const condition = trainResult.eventCandidates.find(
      (event) => event.eventType === WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated,
    );
    expect(condition?.payload["unit"]).toBeUndefined();
  });
});

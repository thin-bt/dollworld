/**
 * Contract tests for S1-SPEC-0.1.12 weekly-training clarification.
 * Locks SimulationIdentity version, Sprint1Config hash stability, and the
 * integer formulas made explicit in 08/10/14. Does not implement S01-004.
 */
import { describe, expect, it } from "vitest";
import {
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  createDefaultSprint1ConfigInput,
  createSimulationId,
  getDefaultSprint1Config,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type SimulationIdentity,
} from "./index.js";
import { createSeededRng, deriveSeed } from "./rng.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();
const CONTRACT_RNG_PARENT_SEED = 0x0_1_12_00;

/** Mathematical floor (toward −∞), not JS truncation toward zero. */
function mathematicalFloor(value: number): number {
  return Math.floor(value);
}

function growthPotentialFactorBasisPoints(growthPotential: number): number {
  const potentialMinimumFactorBasisPoints = 6500;
  const potentialMaximumFactorBasisPoints = 13500;
  return (
    potentialMinimumFactorBasisPoints +
    mathematicalFloor(
      (growthPotential * (potentialMaximumFactorBasisPoints - potentialMinimumFactorBasisPoints)) /
        100,
    )
  );
}

function baseMentalExhaustionPenalty(
  maxMental: number,
  currentMental: number,
  maximum: number,
): number | undefined {
  if (maxMental <= 0) {
    return undefined;
  }
  return mathematicalFloor(((maxMental - currentMental) * maximum) / maxMental);
}

function contextScoreHundredths(
  contextValues: readonly number[],
  weightBasisPoints: readonly number[],
): number {
  let numerator = 0;
  for (let index = 0; index < contextValues.length; index += 1) {
    numerator += contextValues[index]! * weightBasisPoints[index]!;
  }
  return mathematicalFloor(numerator / 100);
}

function statTargetScoreHundredths(input: {
  currentValue: number;
  growthPotential: number;
  relatedAptitude: number;
  teacherRecommendation: number;
  remainingCapacity: number;
  growthPotentialWeight: number;
  relatedAptitudeWeight: number;
  teacherRecommendationWeight: number;
}): number {
  return mathematicalFloor(
    ((100 - input.currentValue) * input.remainingCapacity +
      input.growthPotential * input.growthPotentialWeight +
      input.relatedAptitude * input.relatedAptitudeWeight +
      input.teacherRecommendation * input.teacherRecommendationWeight) /
      100,
  );
}

function sampleIdentity(overrides: Partial<SimulationIdentity> = {}): SimulationIdentity {
  const hex = "a".repeat(64);
  const sprint1ConfigHashResult = (() => {
    const validated = validateSprint1Config(createDefaultSprint1ConfigInput());
    if (!validated.ok) {
      throw new Error("default Sprint1Config must validate");
    }
    return {
      value: sha256Provider.hashUtf8(toCanonicalJson(validated.value)),
    };
  })();
  return {
    schemaVersion: "0.3.0",
    seed: 12345,
    initialWorldConfigHash: hex,
    sprint1ConfigHash: sprint1ConfigHashResult.value,
    techniqueCatalogHash: hex,
    battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
    matchIdGeneratorVersion: "match-id-generator-0.1.0",
    initialMatchIdGeneratorStateHash: hex,
    defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
    specVersions: [
      { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint1", version: S1_SPEC_VERSION },
    ],
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
    ...overrides,
  };
}

describe("S1-SPEC-0.1.12 SimulationIdentity / config hash", () => {
  it("publishes weekly-training clarification contracts under the current Sprint 1 registry", () => {
    // Registry is S1-SPEC-0.1.17 after movementChance clarification; weekly formulas remain.
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.17");
  });

  it("accepts a new Sprint 1 identity with the current registry version", () => {
    const result = validateSimulationIdentity(sampleIdentity());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.specVersions[2]?.version).toBe(S1_SPEC_VERSION);
  });

  it("rejects S1-SPEC-0.1.11 as a new Sprint 1 identity version", () => {
    const result = validateSimulationIdentity(
      sampleIdentity({
        specVersions: [
          { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
          { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
          { specSetId: "sprint1", version: "S1-SPEC-0.1.11" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("keeps Sprint 0 createSimulationId API working unchanged", () => {
    const materialHash = "b".repeat(64);
    const id = createSimulationId(materialHash, 1, materialHash, sha256Provider);
    expect(id).toMatch(/^simulation_[0-9a-f]{16}$/);
  });

  it("keeps sprint1-balance-0.2.0 canonical SHA-256 unchanged", () => {
    const config = getDefaultSprint1Config();
    const canonical = toCanonicalJson(config);
    expect(sha256Provider.hashUtf8(canonical)).toBe(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256);
    expect(config.schemaVersion).toBe("0.2.0");
    expect(config.configVersion).toBe("sprint1-balance-0.2.0");
  });
});

describe("S1-SPEC-0.1.12 growthPotentialFactorBasisPoints", () => {
  it("maps growthPotential 0 / 50 / 100 to 6500 / 10000 / 13500", () => {
    expect(growthPotentialFactorBasisPoints(0)).toBe(6500);
    expect(growthPotentialFactorBasisPoints(50)).toBe(10000);
    expect(growthPotentialFactorBasisPoints(100)).toBe(13500);
  });
});

describe("S1-SPEC-0.1.12 planner integer formulas", () => {
  it("uses mathematicalFloor for negative contextScoreHundredths", () => {
    // contextValue=-1, weight=10000 → numerator=-10000 → floor(-10000/100)=-100
    expect(contextScoreHundredths([-1], [10000])).toBe(-100);
    // Truncation toward zero would wrongly yield -99 for -9999/100.
    expect(contextScoreHundredths([-1], [9999])).toBe(-100);
    expect(mathematicalFloor(-9999 / 100)).toBe(-100);
    expect(Math.trunc(-9999 / 100)).toBe(-99);
  });

  it("floors mental exhaustion penalty at boundaries and rejects maxMental<=0", () => {
    expect(baseMentalExhaustionPenalty(100, 100, 20)).toBe(0);
    expect(baseMentalExhaustionPenalty(100, 0, 20)).toBe(20);
    expect(baseMentalExhaustionPenalty(100, 50, 20)).toBe(10);
    expect(baseMentalExhaustionPenalty(0, 0, 20)).toBeUndefined();
  });

  it("matches the legacy StatTargetScore provisional formula under default weights", () => {
    const currentValue = 40;
    const growthPotential = 60;
    const relatedAptitude = 80;
    const teacherRecommendation = 10;
    const withWeights = statTargetScoreHundredths({
      currentValue,
      growthPotential,
      relatedAptitude,
      teacherRecommendation,
      remainingCapacity: 10000,
      growthPotentialWeight: 10000,
      relatedAptitudeWeight: 5000,
      teacherRecommendationWeight: 10000,
    });
    // Old 10 provisional: (100-current)+growthPotential+relatedAptitude*0.5+teacherRecommendation
    // as hundredths: that score * 100
    const provisionalHundredths = mathematicalFloor(
      ((100 - currentValue) * 10000 +
        growthPotential * 10000 +
        relatedAptitude * 5000 +
        teacherRecommendation * 10000) /
        100,
    );
    expect(withWeights).toBe(provisionalHundredths);
    expect(withWeights).toBe(
      (100 - currentValue) * 100 +
        growthPotential * 100 +
        relatedAptitude * 50 +
        teacherRecommendation * 100,
    );
  });
});

describe("S1-SPEC-0.1.12 TrainingProcessorRuntimeState contract (spec-only)", () => {
  const ACTION_COUNT_KEYS = [
    "train_stat",
    "learn_technique",
    "practice_technique",
    "rest",
  ] as const;

  it("defines actionCounts without inactive and processedPersonCount as their sum", () => {
    expect(ACTION_COUNT_KEYS).not.toContain("inactive");
    const actionCounts = {
      train_stat: 2,
      learn_technique: 1,
      practice_technique: 3,
      rest: 4,
    };
    const processedPersonCount =
      actionCounts.train_stat +
      actionCounts.learn_technique +
      actionCounts.practice_technique +
      actionCounts.rest;
    expect(processedPersonCount).toBe(10);
  });

  it("defines initial RuntimeState values", () => {
    const initial = {
      schemaVersion: "0.1.0",
      lastProcessedAbsoluteWeek: null as number | null,
      processedPersonCount: 0,
      actionCounts: {
        train_stat: 0,
        learn_technique: 0,
        practice_technique: 0,
        rest: 0,
      },
      totalStatGainMilliPoints: 0,
      totalLearningProgressGainTenths: 0,
      totalMasteryGainHundredths: 0,
      forcedRestCount: 0,
    };
    expect(initial.schemaVersion).toBe("0.1.0");
    expect(initial.lastProcessedAbsoluteWeek).toBeNull();
    expect(Object.keys(initial.actionCounts)).toEqual([...ACTION_COUNT_KEYS]);
  });

  it("accumulates RuntimeState totals across weeks instead of overwriting", () => {
    const week1 = {
      processedPersonCount: 3,
      actionCounts: {
        train_stat: 1,
        learn_technique: 1,
        practice_technique: 0,
        rest: 1,
      },
      totalStatGainMilliPoints: 500,
      totalLearningProgressGainTenths: 100,
      totalMasteryGainHundredths: 2000,
      forcedRestCount: 1,
    };
    const week2Delta = {
      processedPersonCount: 2,
      actionCounts: {
        train_stat: 1,
        learn_technique: 0,
        practice_technique: 1,
        rest: 0,
      },
      totalStatGainMilliPoints: 300,
      totalLearningProgressGainTenths: 0,
      totalMasteryGainHundredths: 150,
      forcedRestCount: 0,
    };
    const next = {
      processedPersonCount: week1.processedPersonCount + week2Delta.processedPersonCount,
      actionCounts: {
        train_stat: week1.actionCounts.train_stat + week2Delta.actionCounts.train_stat,
        learn_technique:
          week1.actionCounts.learn_technique + week2Delta.actionCounts.learn_technique,
        practice_technique:
          week1.actionCounts.practice_technique + week2Delta.actionCounts.practice_technique,
        rest: week1.actionCounts.rest + week2Delta.actionCounts.rest,
      },
      totalStatGainMilliPoints:
        week1.totalStatGainMilliPoints + week2Delta.totalStatGainMilliPoints,
      totalLearningProgressGainTenths:
        week1.totalLearningProgressGainTenths + week2Delta.totalLearningProgressGainTenths,
      totalMasteryGainHundredths:
        week1.totalMasteryGainHundredths + week2Delta.totalMasteryGainHundredths,
      forcedRestCount: week1.forcedRestCount + week2Delta.forcedRestCount,
    };
    expect(next.processedPersonCount).toBe(5);
    expect(next.actionCounts.train_stat).toBe(2);
    expect(next.totalMasteryGainHundredths).toBe(2150);
    expect(
      next.actionCounts.train_stat +
        next.actionCounts.learn_technique +
        next.actionCounts.practice_technique +
        next.actionCounts.rest,
    ).toBe(next.processedPersonCount);
  });
});

describe("S1-SPEC-0.1.12 LearningTargetScoreHundredths / PracticeTargetScoreHundredths", () => {
  const learningWeights = {
    aptitude: 25,
    requiredStats: 15,
    currentProgress: 25,
    teacherAvailability: 20,
    styleMatch: 10,
    tierAccessibility: 5,
  } as const;

  function learningTargetScoreHundredths(input: {
    domainAptitude: number;
    requiredStatsFactorBasisPoints: number;
    learningProgressTenths: number;
    learningProgressRequired: number;
    teacherCanTeach: boolean;
    styleMatch: number;
  }): number | undefined {
    const progressCapTenths = input.learningProgressRequired * 10;
    if (
      input.learningProgressTenths < 0 ||
      input.learningProgressTenths > progressCapTenths ||
      input.learningProgressRequired < 1
    ) {
      return undefined;
    }
    const aptitudeContributionHundredths = input.domainAptitude * learningWeights.aptitude;
    const requiredStatsContributionHundredths = mathematicalFloor(
      (input.requiredStatsFactorBasisPoints * learningWeights.requiredStats * 100) / 12000,
    );
    const progressContributionHundredths = mathematicalFloor(
      (input.learningProgressTenths * learningWeights.currentProgress * 100) / progressCapTenths,
    );
    const teacherContributionHundredths = input.teacherCanTeach
      ? learningWeights.teacherAvailability * 100
      : 0;
    const styleContributionHundredths = input.styleMatch * learningWeights.styleMatch;
    const tierAccessibilityBasisPoints = Math.min(
      10000,
      Math.max(0, mathematicalFloor(((500 - input.learningProgressRequired) * 10000) / 500)),
    );
    const tierContributionHundredths = mathematicalFloor(
      (tierAccessibilityBasisPoints * learningWeights.tierAccessibility) / 100,
    );
    return (
      aptitudeContributionHundredths +
      requiredStatsContributionHundredths +
      progressContributionHundredths +
      teacherContributionHundredths +
      styleContributionHundredths +
      tierContributionHundredths
    );
  }

  const practiceWeights = {
    masteryNeed: 50,
    recentPracticeNeed: 20,
    teacherPriority: 15,
    styleMatch: 15,
  } as const;

  function practiceTargetScoreHundredths(input: {
    masteryHundredths: number;
    recentPracticeNeed: number;
    teacherPriority: number;
    styleMatch: number;
  }): number {
    return (
      mathematicalFloor(((10000 - input.masteryHundredths) * practiceWeights.masteryNeed) / 100) +
      input.recentPracticeNeed * practiceWeights.recentPracticeNeed +
      input.teacherPriority * practiceWeights.teacherPriority +
      input.styleMatch * practiceWeights.styleMatch
    );
  }

  it("matches LearningTargetScoreHundredths golden total 7320", () => {
    expect(
      learningTargetScoreHundredths({
        domainAptitude: 80,
        requiredStatsFactorBasisPoints: 10000,
        learningProgressTenths: 900,
        learningProgressRequired: 180,
        teacherCanTeach: true,
        styleMatch: 50,
      }),
    ).toBe(7320);
  });

  it("rejects learningProgressTenths above progressCapTenths", () => {
    expect(
      learningTargetScoreHundredths({
        domainAptitude: 80,
        requiredStatsFactorBasisPoints: 10000,
        learningProgressTenths: 1801,
        learningProgressRequired: 180,
        teacherCanTeach: true,
        styleMatch: 50,
      }),
    ).toBeUndefined();
  });

  it("clamps tierAccessibility at learningProgressRequired boundaries 1/100/180/500/501", () => {
    function tierAccessibilityBasisPoints(learningProgressRequired: number): number {
      return Math.min(
        10000,
        Math.max(0, mathematicalFloor(((500 - learningProgressRequired) * 10000) / 500)),
      );
    }
    expect(tierAccessibilityBasisPoints(1)).toBe(9980);
    expect(tierAccessibilityBasisPoints(100)).toBe(8000);
    expect(tierAccessibilityBasisPoints(180)).toBe(6400);
    expect(tierAccessibilityBasisPoints(500)).toBe(0);
    expect(tierAccessibilityBasisPoints(501)).toBe(0);
  });

  it("matches PracticeTargetScoreHundredths golden total 5050", () => {
    expect(
      practiceTargetScoreHundredths({
        masteryHundredths: 4000,
        recentPracticeNeed: 50,
        teacherPriority: 20,
        styleMatch: 50,
      }),
    ).toBe(5050);
  });
});

describe("S1-SPEC-0.1.12 RNG BP draw and multiplyBasisPointsFloor", () => {
  function multiplyBasisPointsFloor(baseInteger: number, factors: readonly number[]): number {
    let numerator = BigInt(baseInteger);
    for (const factor of factors) {
      numerator *= BigInt(factor);
    }
    const denominator = 10000n ** BigInt(factors.length);
    return Number(numerator / denominator);
  }

  function sequentialFloor(baseInteger: number, factors: readonly number[]): number {
    let value = baseInteger;
    for (const factor of factors) {
      value = mathematicalFloor((value * factor) / 10000);
    }
    return value;
  }

  function drawInclusiveBasisPoints(
    rng: { nextInt: (minInclusive: number, maxExclusive: number) => number },
    minimumBp: number,
    maximumBp: number,
  ): number {
    return rng.nextInt(minimumBp, maximumBp + 1);
  }

  it("uses inclusive nextInt(minimumBp, maximumBp + 1) for 9000..11000", () => {
    const minimumBp = 9000;
    const maximumBp = 11000;
    expect(maximumBp + 1).toBe(11001);
    expect(maximumBp - minimumBp + 1).toBe(2001);
    const rng = createSeededRng(deriveSeed(CONTRACT_RNG_PARENT_SEED, "rng-bp-contract"));
    for (let i = 0; i < 5000; i += 1) {
      const sample = drawInclusiveBasisPoints(rng, minimumBp, maximumBp);
      expect(sample).toBeGreaterThanOrEqual(minimumBp);
      expect(sample).toBeLessThanOrEqual(maximumBp);
      expect(Number.isSafeInteger(sample)).toBe(true);
    }
  });

  it("documents nextInt(9000, 11001) as the public API contract for one RNG consume", () => {
    const rng = createSeededRng(deriveSeed(CONTRACT_RNG_PARENT_SEED, "nextInt-contract"));
    const value = rng.nextInt(9000, 11001);
    expect(value).toBeGreaterThanOrEqual(9000);
    expect(value).toBeLessThanOrEqual(11000);
  });

  it("can reach both 9000 and 11000 endpoints under the inclusive contract", () => {
    const minimumBp = 9000;
    const maximumBp = 11000;
    let sawMin = false;
    let sawMax = false;
    for (let seed = 0; seed < 400 && !(sawMin && sawMax); seed += 1) {
      const rng = createSeededRng(deriveSeed(CONTRACT_RNG_PARENT_SEED, `bp-ends-${String(seed)}`));
      for (let i = 0; i < 800; i += 1) {
        const sample = drawInclusiveBasisPoints(rng, minimumBp, maximumBp);
        if (sample === minimumBp) {
          sawMin = true;
        }
        if (sample === maximumBp) {
          sawMax = true;
        }
        if (sawMin && sawMax) {
          break;
        }
      }
    }
    expect(sawMin).toBe(true);
    expect(sawMax).toBe(true);
  });

  it("prefers exact final-floor 336 over sequential-floor 335", () => {
    const factors = [6500, 9000, 11500] as const;
    expect(multiplyBasisPointsFloor(500, factors)).toBe(336);
    expect(sequentialFloor(500, factors)).toBe(335);
    expect(multiplyBasisPointsFloor(500, factors)).not.toBe(sequentialFloor(500, factors));
  });
});

describe("S1-SPEC-0.1.12 acquirable weekly contract (spec-only)", () => {
  it("keeps learn_technique with effect RNG 0 and mastery totals updated", () => {
    const effectRngCalls = 0;
    const actionCounts = {
      train_stat: 0,
      learn_technique: 0,
      practice_technique: 0,
      rest: 0,
    };
    const totalLearningProgressGainTenths = 0;
    let totalMasteryGainHundredths = 0;
    // acquirable selection
    actionCounts.learn_technique += 1;
    const initialMasteryHundredths = 1500; // standard tier display 15
    totalMasteryGainHundredths += initialMasteryHundredths;
    expect(effectRngCalls).toBe(0);
    expect(actionCounts.learn_technique).toBe(1);
    expect(totalLearningProgressGainTenths).toBe(0);
    expect(totalMasteryGainHundredths).toBe(1500);
    expect([
      "training.action_selected",
      "technique.acquired",
      "training.condition_updated",
    ]).toEqual(["training.action_selected", "technique.acquired", "training.condition_updated"]);
  });
});

describe("S1-SPEC-0.1.12 event order / battle separation (spec-only)", () => {
  it("locks action-specific event fixtures instead of a single flat list", () => {
    const fixtures = {
      train_stat: [
        "training.action_selected",
        "training.stat_growth_applied",
        "technique.mastery_increased?",
        "training.condition_updated",
      ],
      learn_progress_only: [
        "training.action_selected",
        "technique.learning_progressed",
        "training.condition_updated",
      ],
      learn_progress_acquired: [
        "training.action_selected",
        "technique.learning_progressed",
        "technique.acquired",
        "training.condition_updated",
      ],
      acquirable_immediate: [
        "training.action_selected",
        "technique.acquired",
        "training.condition_updated",
      ],
      practice: [
        "training.action_selected",
        "technique.mastery_increased",
        "training.condition_updated",
      ],
      forced_rest: [
        "training.action_selected",
        "training.forced_rest_applied",
        "training.rest_applied",
      ],
      normal_rest: ["training.action_selected", "training.rest_applied"],
      inactive: [] as string[],
    };
    expect(fixtures.inactive).toHaveLength(0);
    expect(fixtures.acquirable_immediate).not.toContain("technique.learning_progressed");
    expect(fixtures.forced_rest[1]).toBe("training.forced_rest_applied");
    expect(fixtures.train_stat[0]).toBe("training.action_selected");
  });

  it("does not treat battle unableToContinueThreshold as a weekly forced-rest reason", () => {
    const weeklyForcedRestReasons = ["severe_injury", "fatigue_threshold"] as const;
    expect(weeklyForcedRestReasons).not.toContain("unable_to_continue");
    expect(weeklyForcedRestReasons).toHaveLength(2);
    const config = getDefaultSprint1Config();
    expect(config.battle.injury.unableToContinueThreshold).toBe(100);
    expect(config.temporaryCondition.forcedRestFatigueThreshold).toBe(81);
  });
});

describe("S1-SPEC-0.1.12 wiki state guards", () => {
  it("does not treat S1-SPEC-0.1.12 as the contents of commit 2800d3b", async () => {
    const { readFile } = await import("node:fs/promises");
    const contradictions = await readFile(
      new URL("../../../docs/wiki/contradictions.md", import.meta.url),
      "utf8",
    );
    expect(contradictions).toContain("S1-SPEC-0.1.11` 確定 commit");
    expect(contradictions).toContain("S1-SPEC-0.1.12");
    expect(contradictions).not.toMatch(/確定仕様 `S1-SPEC-0\.1\.12`（commit `2800d3b/);
    expect(contradictions).not.toContain("Sprint 1 実装は未着手");
  });

  it("removes stale「実装未着手」claims from current wiki state pages", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const wikiRoot = new URL("../../../docs/wiki/", import.meta.url);
    async function collectMarkdown(dirUrl: URL): Promise<string[]> {
      const entries = await readdir(dirUrl, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dirUrl);
        if (entry.isDirectory()) {
          files.push(...(await collectMarkdown(child)));
        } else if (entry.name.endsWith(".md") && entry.name !== "changelog.md") {
          files.push(join(dirUrl.pathname, entry.name));
        }
      }
      return files;
    }
    // Use fileURLToPath-compatible read via relative paths from known roots
    const relativeRoots = [
      "../../../docs/wiki/index.md",
      "../../../docs/wiki/contradictions.md",
      "../../../docs/wiki/sprints/sprint1.md",
      "../../../docs/wiki/decisions/sprint1-spec-baseline.md",
      "../../../docs/wiki/decisions/sprint1-identity-and-config.md",
      "../../../docs/wiki/decisions/index.md",
      "../../../docs/wiki/glossary/index.md",
      "../../../docs/wiki/glossary/abilities-and-aptitudes.md",
      "../../../docs/wiki/architecture/index.md",
      "../../../docs/wiki/architecture/sprint1-processing-flow.md",
      "../../../docs/wiki/architecture/battle-lifecycle.md",
      "../../../docs/wiki/invariants/index.md",
      "../../../docs/wiki/invariants/battle-start.md",
      "../../../docs/wiki/invariants/battle-turn-resolution.md",
      "../../../docs/wiki/invariants/battle-result-and-log.md",
      "../../../docs/wiki/tasks/S01-004.md",
      "../../../docs/wiki/tasks/S01-005.md",
      "../../../docs/wiki/tasks/S01-006.md",
      "../../../docs/wiki/tasks/S01-007.md",
      "../../../docs/wiki/tasks/S01-008.md",
      "../../../docs/wiki/tasks/S01-009.md",
    ];
    void wikiRoot;
    void collectMarkdown;
    for (const relative of relativeRoots) {
      const text = await readFile(new URL(relative, import.meta.url), "utf8");
      // Historical baseline note may say "その時点では…未着手だった" — that is allowed.
      // Current-state claims that Sprint 1 as a whole is unimplemented are not.
      expect(text).not.toMatch(/仕様確定済み・実装未着手/);
      expect(text).not.toMatch(/該当なし（Sprint 1 実装は未着手）/);
      expect(text).not.toMatch(/Sprint 1 の実装コードは未着手/);
      expect(text).not.toMatch(/Sprint 1 の実装テストは未着手/);
      expect(text).not.toMatch(/実装コードは未着手。/);
      expect(text).not.toMatch(/実装テストは未着手。/);
      if (!relative.endsWith("sprint1-spec-baseline.md")) {
        expect(text).not.toMatch(/Sprint 1 実装は未着手(?!だった)/);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  allocateByLargestRemainder,
  computeConfigHash,
  toCanonicalJson,
  validateInitialWorldConfig,
  type Sha256Provider,
} from "../index.js";
import { cloneBaselineConfig } from "../test-fixtures/baseline-config.fixture.js";

describe("validateInitialWorldConfig", () => {
  it("accepts the baseline config fixture", () => {
    const result = validateInitialWorldConfig(cloneBaselineConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.population.totalLiving).toBe(600);
      expect(result.value.schemaVersion).toBe("0.2.3");
    }
  });

  it("rejects unknown keys", () => {
    const config = cloneBaselineConfig() as Record<string, unknown>;
    config["extraKey"] = true;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/extraKey")).toBe(true);
    }
  });

  it("accepts boundary probabilities 0 and 1", () => {
    const config = cloneBaselineConfig();
    config.population.sexRatioMale = 0;
    config.relationships.knownParentCoverage = 1;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(true);
  });

  it("rejects out-of-range probabilities", () => {
    const config = cloneBaselineConfig();
    config.relationships.twoKnownParentsCoverageAmongCovered = 1.2;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) => issue.path === "/relationships/twoKnownParentsCoverageAmongCovered",
        ),
      ).toBe(true);
    }
  });

  it("rejects non-integer counts", () => {
    const config = cloneBaselineConfig();
    config.population.totalLiving = 600.5;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/population/totalLiving")).toBe(true);
    }
  });

  it("rejects age band count sum mismatches", () => {
    const config = cloneBaselineConfig();
    config.population.ageBands[0]!.count = 81;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/population/ageBands")).toBe(true);
    }
  });

  it("rejects active rank sum mismatches against the 16-41 band", () => {
    const config = cloneBaselineConfig();
    const distribution = {
      ...config.population.activeRankDistribution,
      F: 71,
    };
    config.population.activeRankDistribution = distribution;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path === "/population/activeRankDistribution"),
      ).toBe(true);
    }
  });

  it("rejects age bands that are not the fixed four ranges in order", () => {
    const crossing = cloneBaselineConfig();
    crossing.population.ageBands = [
      { minAge: 0, maxAge: 10, count: 80 },
      { minAge: 8, maxAge: 15, count: 120 },
      { minAge: 16, maxAge: 41, count: 220 },
      { minAge: 42, maxAge: 70, count: 180 },
    ];
    expect(validateInitialWorldConfig(crossing).ok).toBe(false);

    const wrongOrder = cloneBaselineConfig();
    wrongOrder.population.ageBands = [
      { minAge: 8, maxAge: 15, count: 120 },
      { minAge: 0, maxAge: 7, count: 80 },
      { minAge: 16, maxAge: 41, count: 220 },
      { minAge: 42, maxAge: 70, count: 180 },
    ];
    expect(validateInitialWorldConfig(wrongOrder).ok).toBe(false);

    const tooFew = cloneBaselineConfig();
    tooFew.population.ageBands = [
      { minAge: 0, maxAge: 7, count: 200 },
      { minAge: 8, maxAge: 15, count: 200 },
      { minAge: 16, maxAge: 41, count: 200 },
    ];
    expect(validateInitialWorldConfig(tooFew).ok).toBe(false);
  });

  it("rejects negative ages in age bands", () => {
    const config = cloneBaselineConfig();
    config.population.ageBands = [
      { minAge: -1, maxAge: 7, count: 80 },
      { minAge: 8, maxAge: 15, count: 120 },
      { minAge: 16, maxAge: 41, count: 220 },
      { minAge: 42, maxAge: 70, count: 180 },
    ];
    expect(validateInitialWorldConfig(config).ok).toBe(false);
  });

  it("rejects sex-ratio floor totals that disagree across bands", () => {
    const config = cloneBaselineConfig();
    config.population.sexRatioMale = 1 / 3;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/population/sexRatioMale")).toBe(true);
    }
  });

  it("rejects unknown rank keys", () => {
    const config = cloneBaselineConfig() as {
      population: { activeRankDistribution: Record<string, number> };
    };
    config.population.activeRankDistribution["Z"] = 1;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path === "/population/activeRankDistribution/Z"),
      ).toBe(true);
    }
  });

  it("rejects technique focus weight sum mismatches", () => {
    const config = cloneBaselineConfig();
    config.lineages.techniqueFocusWeights = {
      unarmed: 0.5,
      sword: 0.5,
      magic: 0.5,
    };
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((issue) => issue.path === "/lineages/techniqueFocusWeights")).toBe(
        true,
      );
    }
  });

  it("rejects negative ancestor counts", () => {
    const config = cloneBaselineConfig();
    config.history.initialDeceasedAncestors = -1;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
  });

  it("rejects parent minimum age below 18", () => {
    const config = cloneBaselineConfig();
    config.relationships.minimumParentAgeAtChildbirth = 17;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
  });

  it("rejects inverted or under-18 death age ranges", () => {
    const inverted = cloneBaselineConfig();
    inverted.history.minimumAgeAtDeath = 40;
    inverted.history.maximumAgeAtDeath = 30;
    expect(validateInitialWorldConfig(inverted).ok).toBe(false);

    const tooYoung = cloneBaselineConfig();
    tooYoung.history.minimumAgeAtDeath = 17;
    expect(validateInitialWorldConfig(tooYoung).ok).toBe(false);
  });

  it("rejects insufficient C-or-higher retired history slots for masters", () => {
    const config = cloneBaselineConfig();
    config.lineages.initialQualifiedMasters = 46;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path === "/lineages/initialQualifiedMasters"),
      ).toBe(true);
    }
  });

  it("rejects birthWeekOfMonth other than 1", () => {
    const config = cloneBaselineConfig();
    config.world.birthWeekOfMonth = 2;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
  });

  it("rejects out-of-range or non-integer seeds and wrong RNG names", () => {
    const nonInteger = cloneBaselineConfig();
    nonInteger.simulation.defaultSeed = 1.5;
    expect(validateInitialWorldConfig(nonInteger).ok).toBe(false);

    const tooLarge = cloneBaselineConfig();
    tooLarge.simulation.defaultSeed = 4294967296;
    expect(validateInitialWorldConfig(tooLarge).ok).toBe(false);

    const wrongRng = cloneBaselineConfig() as {
      simulation: { rngAlgorithm: string };
    };
    wrongRng.simulation.rngAlgorithm = "other-rng";
    expect(validateInitialWorldConfig(wrongRng).ok).toBe(false);
  });

  it("allocates retired ranks with largest remainder matching the baseline note", () => {
    const config = cloneBaselineConfig();
    const allocated = allocateByLargestRemainder(config.population.activeRankDistribution, 180);
    expect(allocated).toEqual({
      F: 57,
      E: 45,
      D: 33,
      C: 25,
      B: 12,
      A: 6,
      S: 2,
    });
  });

  it("rejects mismatched schemaVersion", () => {
    const config = cloneBaselineConfig();
    config.schemaVersion = "0.2.2";
    expect(validateInitialWorldConfig(config).ok).toBe(false);
  });

  it("rejects non-integer ability ranges", () => {
    const config = cloneBaselineConfig();
    config.abilities.initialSurfaceValueRange = { min: 15.5, max: 65 };
    expect(validateInitialWorldConfig(config).ok).toBe(false);
  });

  it("rejects zero active rank weights when living retirees exist", () => {
    const config = cloneBaselineConfig();
    config.population.ageBands = [
      { minAge: 0, maxAge: 7, count: 100 },
      { minAge: 8, maxAge: 15, count: 100 },
      { minAge: 16, maxAge: 41, count: 0 },
      { minAge: 42, maxAge: 70, count: 400 },
    ];
    config.population.activeRankDistribution = {
      F: 0,
      E: 0,
      D: 0,
      C: 0,
      B: 0,
      A: 0,
      S: 0,
    };
    config.lineages.initialQualifiedMasters = 0;
    const result = validateInitialWorldConfig(config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((issue) => issue.path === "/population/activeRankDistribution"),
      ).toBe(true);
    }
  });

  it("throws when allocateByLargestRemainder receives weightSum 0", () => {
    expect(() =>
      allocateByLargestRemainder({ F: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 }, 10),
    ).toThrow(/weightSum/);
  });

  it("rejects non-positive performance warning seconds", () => {
    const config = cloneBaselineConfig();
    config.performanceTargets.warningSecondsFor600People100Years = 0;
    expect(validateInitialWorldConfig(config).ok).toBe(false);
  });

  it("rejects unsafe manifestPath values", () => {
    for (const manifestPath of [
      "/abs/path.json",
      "C:\\names\\manifest.json",
      "data/../secret.json",
      "data\\names\\manifest.json",
      "",
    ]) {
      const config = cloneBaselineConfig();
      config.nameData.manifestPath = manifestPath;
      expect(validateInitialWorldConfig(config).ok).toBe(false);
    }
  });
});

describe("configHash contract", () => {
  it("passes canonical JSON of the config to the injected Sha256Provider", () => {
    const config = cloneBaselineConfig();
    const validated = validateInitialWorldConfig(config);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    const seen: string[] = [];
    const stub: Sha256Provider = {
      hashUtf8(utf8Text: string): string {
        seen.push(utf8Text);
        return "a".repeat(64);
      },
    };

    const hash = computeConfigHash(validated.value, stub);
    expect(hash).toBe("a".repeat(64));
    expect(seen).toEqual([toCanonicalJson(validated.value)]);

    const reordered = {
      purpose: validated.value.purpose,
      schemaVersion: validated.value.schemaVersion,
      profileId: validated.value.profileId,
      world: validated.value.world,
      population: validated.value.population,
      history: validated.value.history,
      relationships: validated.value.relationships,
      families: validated.value.families,
      lineages: validated.value.lineages,
      abilities: validated.value.abilities,
      nameData: validated.value.nameData,
      simulation: validated.value.simulation,
      validationTargets: validated.value.validationTargets,
      performanceTargets: validated.value.performanceTargets,
    };
    expect(toCanonicalJson(reordered)).toBe(seen[0]);
  });
});

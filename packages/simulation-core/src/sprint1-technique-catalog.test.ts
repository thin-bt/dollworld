import { createHash } from "node:crypto";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ABILITY_KEYS,
  ACTION_TRAITS_KEYS,
  APTITUDE_KEYS,
  INITIAL_TECHNIQUE_CATALOG_DATA_VERSION,
  LEARNING_PROGRESS_STANDARD_BY_TIER,
  LEARNING_TARGET_DERIVED_STATUSES,
  LEARNING_TIERS,
  SPRINT1_PERSON_STATE_SCHEMA_VERSION,
  TECHNIQUE_CATEGORIES,
  TECHNIQUE_CONSUMPTION_CLASSES,
  TECHNIQUE_DEFINITION_KEYS,
  TECHNIQUE_DEFINITION_SCHEMA_VERSION,
  TECHNIQUE_PRIORITIES,
  asTechniqueId,
  cloneTechniqueCatalog,
  cloneTechniqueDefinition,
  computeTechniqueCatalogHash,
  deriveBasicAttackEffectiveMasteryHundredths,
  deriveInitialMasteryHundredths,
  deriveLearningTargetStatus,
  deriveRequiredStatsFactor,
  deriveTechniqueEffectiveMasteryHundredths,
  evaluateTechniqueAcquisitionConditions,
  freezeTechniqueCatalog,
  freezeTechniqueDefinition,
  getBasicAttackProfile,
  getDefaultSprint1Config,
  selectMasteryCurrentValueFactor,
  teacherCanTeach,
  toCanonicalJson,
  validateSprint1PersonTechniqueSemantics,
  validateTechniqueCatalog,
  validateTechniqueCatalogAgainstIdentity,
  validateTechniqueDefinition,
  type AbilityKey,
  type AbilityScores,
  type AptitudeKey,
  type AptitudeScores,
  type PersonTechniqueState,
  type Sha256Provider,
  type StatValueTriple,
  type TeacherCanTeachContext,
  type TechniqueCategory,
  type TechniqueDefinition,
  type TechniqueLearnerContext,
  type TechniqueSemanticsPersonContext,
  type ValidationResult,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function validDefinition(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    techniqueId: "technique_alpha",
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: "Alpha Strike",
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

function withId(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return validDefinition({ techniqueId: id, ...overrides });
}

function mustValidateDefinition(overrides: Record<string, unknown> = {}): TechniqueDefinition {
  const result = validateTechniqueDefinition(validDefinition(overrides));
  if (!result.ok) {
    throw new Error(`expected valid TechniqueDefinition: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function buildCatalog(defs: unknown[], provider: Sha256Provider) {
  const hash = computeTechniqueCatalogHash(defs, provider);
  expect(hash.ok).toBe(true);
  if (!hash.ok) throw new Error("hash");
  return validateTechniqueCatalog(
    {
      identity: { dataVersion: "techniques-0.1.0", catalogHash: hash.value },
      definitions: defs,
    },
    provider,
  );
}

function techniqueState(
  id: string,
  overrides: Partial<PersonTechniqueState> = {},
): PersonTechniqueState {
  return {
    techniqueId: asTechniqueId(id),
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
    ...overrides,
  };
}

function statTriple(surfaceValue: number): StatValueTriple {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function buildAbilities(overrides: Partial<Record<AbilityKey, number>> = {}): AbilityScores {
  const result = {} as Record<AbilityKey, StatValueTriple>;
  for (const key of ABILITY_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AbilityScores;
}

function buildAptitudes(overrides: Partial<Record<AptitudeKey, number>> = {}): AptitudeScores {
  const result = {} as Record<AptitudeKey, StatValueTriple>;
  for (const key of APTITUDE_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AptitudeScores;
}

function expectOkValue<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected ValidationResult success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function countingProvider(): Sha256Provider & { calls: number } {
  const provider = {
    calls: 0,
    hashUtf8(utf8Text: string): string {
      provider.calls += 1;
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
  };
  return provider;
}

function baseTeacherCtx(overrides: Partial<TeacherCanTeachContext> = {}): TeacherCanTeachContext {
  return {
    activeMentorshipExists: true,
    masterLifeStatus: "living",
    masterParticipationStatus: "active",
    masterCareerStatus: "active_competitor",
    masterTechniqueState: techniqueState("technique_master", {
      acquiredAbsoluteWeek: 1,
      masteryHundredths: 5000,
    }),
    ...overrides,
  };
}

function baseTeacherDefinition(overrides: Record<string, unknown> = {}): TechniqueDefinition {
  return mustValidateDefinition({
    techniqueId: "technique_master",
    teachingProficiencyRequired: 50,
    ...overrides,
  });
}

describe("S01-003 public API surface", () => {
  it("exposes fixed technique enumerations without redefining shared Sprint 1 types", () => {
    expect([...LEARNING_TIERS]).toEqual(["basic", "standard", "advanced", "secret"]);
    expect(LEARNING_TIERS).toHaveLength(4);
    expect([...TECHNIQUE_CONSUMPTION_CLASSES]).toEqual(["small", "medium", "large", "ultimate"]);
    expect(TECHNIQUE_CONSUMPTION_CLASSES).toHaveLength(4);
    expect([...TECHNIQUE_PRIORITIES]).toEqual([2, 1, 0, -1]);
    expect(TECHNIQUE_PRIORITIES).toHaveLength(4);
    expect([...LEARNING_TARGET_DERIVED_STATUSES]).toEqual([
      "progressing",
      "acquirable",
      "blocked_at_cap",
    ]);
    expect(LEARNING_TARGET_DERIVED_STATUSES).toHaveLength(3);
    expect([...TECHNIQUE_CATEGORIES]).toEqual(["unarmed", "sword", "magic"]);
    expect(TECHNIQUE_CATEGORIES).toHaveLength(3);
    expect(TECHNIQUE_CATEGORIES).not.toContain("martial");
    expect([...ACTION_TRAITS_KEYS].sort()).toEqual(
      ["simultaneous", "counterOnHit", "interception", "interrupt", "defenseBreak"].sort(),
    );
    expect(TECHNIQUE_DEFINITION_KEYS).toHaveLength(31);
    expect(TECHNIQUE_DEFINITION_KEYS).toContain("actionTraits");
    expect(INITIAL_TECHNIQUE_CATALOG_DATA_VERSION).toBe("techniques-0.1.0");
    expect(TECHNIQUE_DEFINITION_SCHEMA_VERSION).toBe("0.1.0");

    expectTypeOf<TechniqueLearnerContext["techniqueStates"]>().toEqualTypeOf<
      readonly PersonTechniqueState[]
    >();
    expectTypeOf<
      TeacherCanTeachContext["masterTechniqueState"]
    >().toEqualTypeOf<PersonTechniqueState | null>();
  });

  it("exports the catalog/acquisition/mastery/teacher API and hides any BattleState surface", async () => {
    const api = await import("./index.js");
    expect(typeof api.validateTechniqueCatalog).toBe("function");
    expect(typeof api.computeTechniqueCatalogHash).toBe("function");
    expect(typeof api.validateTechniqueCatalogAgainstIdentity).toBe("function");
    expect(typeof api.validateTechniqueDefinition).toBe("function");
    expect(typeof api.validateSprint1PersonTechniqueSemantics).toBe("function");
    expect(typeof api.evaluateTechniqueAcquisitionConditions).toBe("function");
    expect(typeof api.deriveLearningTargetStatus).toBe("function");
    expect(typeof api.deriveRequiredStatsFactor).toBe("function");
    expect(typeof api.teacherCanTeach).toBe("function");
    expect(typeof api.getBasicAttackProfile).toBe("function");
    // `BattleState` joined the public surface with S01-005; turn resolution and
    // technique mutation APIs are still out of scope.
    expect(
      Object.keys(api).filter((key) =>
        /BattleResult|learnTechniqueMutation|useTechnique/.test(key),
      ),
    ).toEqual([]);
  });
});

describe("TechniqueDefinition happy path / freeze / clone", () => {
  it("accepts a minimal valid definition, freezes deeply, and matches TECHNIQUE_DEFINITION_KEYS", () => {
    const result = validateTechniqueDefinition(validDefinition());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.actionTraits)).toBe(true);
    expect(Object.isFrozen(result.value.requiredStats)).toBe(true);
    expect(Object.keys(result.value).sort()).toEqual([...TECHNIQUE_DEFINITION_KEYS].sort());
    expect(result.value.techniqueId).toBe("technique_alpha");
    expect(result.value.schemaVersion).toBe(TECHNIQUE_DEFINITION_SCHEMA_VERSION);
  });

  it("clones independently, freezes, and does not mutate the caller's input", () => {
    const input = validDefinition();
    const before = structuredClone(input);
    const validated = validateTechniqueDefinition(input);
    expect(validated.ok).toBe(true);
    expect(input).toEqual(before);
    if (!validated.ok) return;

    const cloned = cloneTechniqueDefinition(validated.value);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) return;
    expect(cloned.value).toEqual(validated.value);
    expect(cloned.value).not.toBe(validated.value);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    expect(() => {
      (validated.value as { power: number }).power = 999;
    }).toThrow();

    expect(freezeTechniqueDefinition(input).ok).toBe(true);
  });
});

describe("TechniqueDefinition numeric boundaries", () => {
  it("accepts 0..100 boundaries and rejects out-of-range for 0..100 fields", () => {
    const fields = [
      "requiredAptitude",
      "difficulty",
      "teachingProficiencyRequired",
      "secrecy",
      "power",
      "accuracy",
      "activationDifficulty",
    ] as const;
    for (const field of fields) {
      expect(validateTechniqueDefinition(validDefinition({ [field]: 0 })).ok).toBe(true);
      expect(validateTechniqueDefinition(validDefinition({ [field]: 100 })).ok).toBe(true);
      expect(validateTechniqueDefinition(validDefinition({ [field]: -1 })).ok).toBe(false);
      expect(validateTechniqueDefinition(validDefinition({ [field]: 101 })).ok).toBe(false);
    }
  });

  it("rejects learningProgressRequired outside 1..10000 and accepts boundaries with an override reason", () => {
    expect(validateTechniqueDefinition(validDefinition({ learningProgressRequired: 0 })).ok).toBe(
      false,
    );
    expect(
      validateTechniqueDefinition(validDefinition({ learningProgressRequired: 10001 })).ok,
    ).toBe(false);
    expect(
      validateTechniqueDefinition(
        validDefinition({ learningProgressRequired: 1, learningProgressOverrideReason: "tuned" }),
      ).ok,
    ).toBe(true);
    expect(
      validateTechniqueDefinition(
        validDefinition({
          learningProgressRequired: 10000,
          learningProgressOverrideReason: "tuned",
        }),
      ).ok,
    ).toBe(true);
  });

  it("rejects speedModifier/injuryModifier outside -20..20 and accepts boundaries", () => {
    for (const field of ["speedModifier", "injuryModifier"] as const) {
      expect(validateTechniqueDefinition(validDefinition({ [field]: -20 })).ok).toBe(true);
      expect(validateTechniqueDefinition(validDefinition({ [field]: 20 })).ok).toBe(true);
      expect(validateTechniqueDefinition(validDefinition({ [field]: -21 })).ok).toBe(false);
      expect(validateTechniqueDefinition(validDefinition({ [field]: 21 })).ok).toBe(false);
    }
  });

  it("rejects invalid priority, non-false actionTraits, and negative/decimal mentalCost", () => {
    expect(validateTechniqueDefinition(validDefinition({ priority: 3 })).ok).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ priority: -2 })).ok).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ priority: 1.5 })).ok).toBe(false);

    for (const key of ACTION_TRAITS_KEYS) {
      const traits: Record<string, boolean> = {
        simultaneous: false,
        counterOnHit: false,
        interception: false,
        interrupt: false,
        defenseBreak: false,
      };
      traits[key] = true;
      expect(validateTechniqueDefinition(validDefinition({ actionTraits: traits })).ok).toBe(false);
    }

    expect(validateTechniqueDefinition(validDefinition({ mentalCost: -1 })).ok).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ mentalCost: 1.5 })).ok).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ mentalCost: 0 })).ok).toBe(true);
    expect(
      validateTechniqueDefinition(validDefinition({ mentalCost: Number.MAX_SAFE_INTEGER })).ok,
    ).toBe(true);
    expect(
      validateTechniqueDefinition(validDefinition({ mentalCost: Number.MAX_SAFE_INTEGER + 1 })).ok,
    ).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ mentalCost: 1e100 })).ok).toBe(false);
  });
});

describe("TechniqueDefinition canonical array ordering", () => {
  it("normalizes reversed canonical-order arrays to the same sorted values and canonical JSON", () => {
    const forward = validDefinition({
      techniqueId: "technique_root",
      primaryStats: ["strength", "skill", "stamina"],
      usableRanges: ["contact", "close", "middle"],
      preferredRanges: ["contact", "middle"],
      prerequisiteTechniqueIds: ["technique_bravo", "technique_alpha"],
      prerequisiteTechniqueMastery: [
        { techniqueId: "technique_bravo", requiredMastery: 10 },
        { techniqueId: "technique_alpha", requiredMastery: 5 },
      ],
      sourceTechniqueIds: ["technique_delta", "technique_charlie"],
      tags: ["zeta", "alpha", "mu"],
    });
    const reversed = validDefinition({
      techniqueId: "technique_root",
      primaryStats: ["stamina", "skill", "strength"],
      usableRanges: ["middle", "close", "contact"],
      preferredRanges: ["middle", "contact"],
      prerequisiteTechniqueIds: ["technique_alpha", "technique_bravo"],
      prerequisiteTechniqueMastery: [
        { techniqueId: "technique_alpha", requiredMastery: 5 },
        { techniqueId: "technique_bravo", requiredMastery: 10 },
      ],
      sourceTechniqueIds: ["technique_charlie", "technique_delta"],
      tags: ["mu", "alpha", "zeta"],
    });

    const a = validateTechniqueDefinition(forward);
    const b = validateTechniqueDefinition(reversed);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    expect(a.value.primaryStats).toEqual(["stamina", "strength", "skill"]);
    expect(a.value.usableRanges).toEqual(["contact", "close", "middle"]);
    expect(a.value.preferredRanges).toEqual(["contact", "middle"]);
    expect(a.value.prerequisiteTechniqueIds).toEqual(["technique_alpha", "technique_bravo"]);
    expect(a.value.sourceTechniqueIds).toEqual(["technique_charlie", "technique_delta"]);
    expect(a.value.tags).toEqual(["alpha", "mu", "zeta"]);
    expect(a.value.prerequisiteTechniqueMastery).toEqual([
      { techniqueId: "technique_alpha", requiredMastery: 5 },
      { techniqueId: "technique_bravo", requiredMastery: 10 },
    ]);
    expect(toCanonicalJson(a.value)).toBe(toCanonicalJson(b.value));
  });

  it("rejects duplicate entries across every canonical-order array", () => {
    expect(
      validateTechniqueDefinition(validDefinition({ primaryStats: ["strength", "strength"] })).ok,
    ).toBe(false);
    expect(
      validateTechniqueDefinition(validDefinition({ usableRanges: ["contact", "contact"] })).ok,
    ).toBe(false);
    expect(
      validateTechniqueDefinition(
        validDefinition({ prerequisiteTechniqueIds: ["technique_x", "technique_x"] }),
      ).ok,
    ).toBe(false);
    expect(
      validateTechniqueDefinition(
        validDefinition({ sourceTechniqueIds: ["technique_y", "technique_y"] }),
      ).ok,
    ).toBe(false);
    expect(validateTechniqueDefinition(validDefinition({ tags: ["dup", "dup"] })).ok).toBe(false);
    expect(
      validateTechniqueDefinition(
        validDefinition({
          prerequisiteTechniqueIds: ["technique_x"],
          prerequisiteTechniqueMastery: [
            { techniqueId: "technique_x", requiredMastery: 1 },
            { techniqueId: "technique_x", requiredMastery: 2 },
          ],
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects sparse arrays in canonical-order fields", () => {
    const sparseStats: unknown[] = [];
    sparseStats[1] = "strength";
    expect(validateTechniqueDefinition(validDefinition({ primaryStats: sparseStats })).ok).toBe(
      false,
    );
    const sparseTags: unknown[] = [];
    sparseTags[2] = "tag";
    expect(validateTechniqueDefinition(validDefinition({ tags: sparseTags })).ok).toBe(false);
  });
});

describe("learningProgressOverrideReason tier matrix", () => {
  it("requires the reason exactly when learningProgressRequired deviates from the tier standard", () => {
    for (const tier of LEARNING_TIERS) {
      const standard = LEARNING_PROGRESS_STANDARD_BY_TIER[tier];
      expect(
        validateTechniqueDefinition(
          validDefinition({
            learningTier: tier,
            learningProgressRequired: standard,
            learningProgressOverrideReason: null,
          }),
        ).ok,
      ).toBe(true);
      expect(
        validateTechniqueDefinition(
          validDefinition({
            learningTier: tier,
            learningProgressRequired: standard,
            learningProgressOverrideReason: "unexpected",
          }),
        ).ok,
      ).toBe(false);
      expect(
        validateTechniqueDefinition(
          validDefinition({
            learningTier: tier,
            learningProgressRequired: standard + 1,
            learningProgressOverrideReason: null,
          }),
        ).ok,
      ).toBe(false);
      expect(
        validateTechniqueDefinition(
          validDefinition({
            learningTier: tier,
            learningProgressRequired: standard + 1,
            learningProgressOverrideReason: "custom tuning",
          }),
        ).ok,
      ).toBe(true);
    }
  });
});

describe("TechniqueCatalog", () => {
  it("computes the same catalogHash regardless of input definition order", () => {
    const a = withId("technique_a");
    const b = withId("technique_b");
    const forward = computeTechniqueCatalogHash([a, b], sha256Provider);
    const backward = computeTechniqueCatalogHash([b, a], sha256Provider);
    expect(forward.ok && backward.ok).toBe(true);
    if (!forward.ok || !backward.ok) return;
    expect(forward.value).toBe(backward.value);
  });

  it("rejects duplicate techniqueId across definitions", () => {
    const a = withId("technique_dup");
    const aCopy = withId("technique_dup", { name: "Different name" });
    expect(computeTechniqueCatalogHash([a, aCopy], sha256Provider).ok).toBe(false);
    expect(
      validateTechniqueCatalog(
        {
          identity: { dataVersion: "techniques-0.1.0", catalogHash: "a".repeat(64) },
          definitions: [a, aCopy],
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects a missing prerequisiteTechniqueIds / sourceTechniqueIds reference", () => {
    const missingPrereq = withId("technique_needs_ghost", {
      prerequisiteTechniqueIds: ["technique_ghost"],
    });
    expect(buildCatalog([missingPrereq], sha256Provider).ok).toBe(false);
    const missingSource = withId("technique_from_ghost", {
      sourceTechniqueIds: ["technique_ghost"],
    });
    expect(buildCatalog([missingSource], sha256Provider).ok).toBe(false);
  });

  it("detects a prerequisite cycle and a source cycle", () => {
    const a = withId("technique_cycle_a", { prerequisiteTechniqueIds: ["technique_cycle_b"] });
    const b = withId("technique_cycle_b", { prerequisiteTechniqueIds: ["technique_cycle_a"] });
    expect(buildCatalog([a, b], sha256Provider).ok).toBe(false);

    const sa = withId("technique_src_a", { sourceTechniqueIds: ["technique_src_b"] });
    const sb = withId("technique_src_b", { sourceTechniqueIds: ["technique_src_a"] });
    expect(buildCatalog([sa, sb], sha256Provider).ok).toBe(false);
  });

  it("rejects prerequisiteTechniqueMastery entries that are not a subset of prerequisiteTechniqueIds", () => {
    const invalid = withId("technique_bad_mastery", {
      prerequisiteTechniqueIds: ["technique_other"],
      prerequisiteTechniqueMastery: [{ techniqueId: "technique_unrelated", requiredMastery: 10 }],
    });
    expect(validateTechniqueDefinition(invalid).ok).toBe(false);
    expect(computeTechniqueCatalogHash([invalid], sha256Provider).ok).toBe(false);
  });

  it("rejects a definition whose dataVersion does not equal the catalog identity dataVersion", () => {
    const mismatched = withId("technique_mismatch", { dataVersion: "techniques-0.2.0" });
    const hash = computeTechniqueCatalogHash([mismatched], sha256Provider);
    expect(hash.ok).toBe(true);
    if (!hash.ok) return;
    const result = validateTechniqueCatalog(
      {
        identity: { dataVersion: "techniques-0.1.0", catalogHash: hash.value },
        definitions: [mismatched],
      },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a catalogHash that does not match the canonical sorted definitions", () => {
    const built = buildCatalog([withId("technique_a"), withId("technique_b")], sha256Provider);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const original = built.value.identity.catalogHash;
    const tamperedHash = original.startsWith("0")
      ? `1${original.slice(1)}`
      : `0${original.slice(1)}`;
    const result = validateTechniqueCatalog(
      {
        identity: { dataVersion: built.value.identity.dataVersion, catalogHash: tamperedHash },
        definitions: [withId("technique_a"), withId("technique_b")],
      },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("never calls the Sha256Provider for structurally invalid catalog input", () => {
    const provider = countingProvider();
    expect(computeTechniqueCatalogHash({ not: "an array" }, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
    expect(validateTechniqueCatalog({ identity: {}, definitions: "nope" }, provider).ok).toBe(
      false,
    );
    expect(provider.calls).toBe(0);
  });

  it("rejects validateTechniqueCatalogAgainstIdentity when content changed but the expected identity is stale", () => {
    const original = withId("technique_stable");
    const originalCatalog = buildCatalog([original], sha256Provider);
    expect(originalCatalog.ok).toBe(true);
    if (!originalCatalog.ok) return;

    const changed = withId("technique_stable", { power: original.power === 25 ? 30 : 25 });
    const changedCatalog = buildCatalog([changed], sha256Provider);
    expect(changedCatalog.ok).toBe(true);
    if (!changedCatalog.ok) return;
    expect(changedCatalog.value.identity.catalogHash).not.toBe(
      originalCatalog.value.identity.catalogHash,
    );
    expect(
      validateTechniqueCatalogAgainstIdentity(
        changedCatalog.value,
        originalCatalog.value.identity,
        sha256Provider,
      ).ok,
    ).toBe(false);

    const otherVersionDefs = [
      withId("technique_other_version", { dataVersion: "techniques-0.2.0" }),
    ];
    const otherHash = computeTechniqueCatalogHash(otherVersionDefs, sha256Provider);
    expect(otherHash.ok).toBe(true);
    if (!otherHash.ok) return;
    const otherCatalog = {
      identity: { dataVersion: "techniques-0.2.0", catalogHash: otherHash.value },
      definitions: otherVersionDefs,
    };
    expect(
      validateTechniqueCatalogAgainstIdentity(
        otherCatalog,
        originalCatalog.value.identity,
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("validates expectedIdentity before catalog hash and skips the provider on invalid identity", () => {
    const built = buildCatalog([withId("technique_a")], sha256Provider);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const provider = countingProvider();
    expect(
      validateTechniqueCatalogAgainstIdentity(
        built.value,
        { dataVersion: "techniques-0.1.0" },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    let getterCalls = 0;
    const hostileIdentity: Record<string, unknown> = {
      dataVersion: "techniques-0.1.0",
    };
    Object.defineProperty(hostileIdentity, "catalogHash", {
      get() {
        getterCalls += 1;
        return built.value.identity.catalogHash;
      },
      enumerable: true,
      configurable: true,
    });
    expect(validateTechniqueCatalogAgainstIdentity(built.value, hostileIdentity, provider).ok).toBe(
      false,
    );
    expect(getterCalls).toBe(0);
    expect(provider.calls).toBe(0);

    const { proxy, revoke } = Proxy.revocable(
      {
        dataVersion: "techniques-0.1.0",
        catalogHash: built.value.identity.catalogHash,
      },
      {},
    );
    revoke();
    expect(() =>
      validateTechniqueCatalogAgainstIdentity(built.value, proxy, provider),
    ).not.toThrow();
    expect(validateTechniqueCatalogAgainstIdentity(built.value, proxy, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);

    const successProvider = countingProvider();
    const matched = validateTechniqueCatalogAgainstIdentity(
      built.value,
      built.value.identity,
      successProvider,
    );
    expect(matched.ok).toBe(true);
    expect(successProvider.calls).toBe(1);
  });

  it("clones and freezes a validated catalog independently", () => {
    const built = buildCatalog([withId("technique_a"), withId("technique_b")], sha256Provider);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const cloned = cloneTechniqueCatalog(built.value, sha256Provider);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) return;
    expect(cloned.value).toEqual(built.value);
    expect(cloned.value).not.toBe(built.value);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    expect(Object.isFrozen(cloned.value.definitions)).toBe(true);
    expect(freezeTechniqueCatalog(built.value, sha256Provider).ok).toBe(true);
  });

  it("accepts an empty definitions array as a valid catalog", () => {
    const result = buildCatalog([], sha256Provider);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.definitions).toEqual([]);
  });
});

describe("fixed two-definition catalog fixture", () => {
  const FIXED_DEFS = [
    validDefinition({
      techniqueId: "technique_a",
      name: "Fixed Technique A",
      tags: ["fixed"],
    }),
    validDefinition({
      techniqueId: "technique_b",
      name: "Fixed Technique B",
      category: "sword",
      primaryStats: ["skill", "strength"],
      requiredAptitude: 20,
      requiredStats: { skill: 30 },
      prerequisiteTechniqueIds: ["technique_a"],
      prerequisiteTechniqueMastery: [{ techniqueId: "technique_a", requiredMastery: 30 }],
      mentalCost: 10,
      difficulty: 40,
      learningTier: "standard",
      consumptionClass: "medium",
      learningProgressRequired: 180,
      teachingProficiencyRequired: 30,
      power: 45,
      accuracy: 65,
      activationDifficulty: 20,
      usableRanges: ["close", "middle"],
      preferredRanges: ["close"],
      tags: ["fixed", "slash"],
    }),
  ];

  it("is deterministic across input order and matches the pinned SHA-256", () => {
    const forward = computeTechniqueCatalogHash(FIXED_DEFS, sha256Provider);
    const backward = computeTechniqueCatalogHash([...FIXED_DEFS].reverse(), sha256Provider);
    expect(forward.ok && backward.ok).toBe(true);
    if (!forward.ok || !backward.ok) return;
    expect(forward.value).toBe(backward.value);
    expect(forward.value).toMatch(/^[0-9a-f]{64}$/);

    const catalog = buildCatalog(FIXED_DEFS, sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const canonical = toCanonicalJson(catalog.value.definitions);
    expect(sha256Provider.hashUtf8(canonical)).toBe(forward.value);
    expect(forward.value).toBe("3bb6f27ba5e4380d7c54127f0ec6eb952e7581056f8835e80db726e7d2f2acb0");
  });
});

describe("Sprint1PersonState technique semantics against a catalog", () => {
  const personContext: TechniqueSemanticsPersonContext = {
    spiritSurfaceValue: 50,
  };

  it("accepts a valid Sprint1PersonState technique-state array against the catalog", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personState = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_alpha", { learningProgressTenths: 500 })],
      learningFocusTechniqueId: asTechniqueId("technique_alpha"),
    };
    const result = validateSprint1PersonTechniqueSemantics(
      personState,
      catalog.value,
      personContext,
      sha256Provider,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a techniqueId not present in the catalog", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personState = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_unknown")],
      learningFocusTechniqueId: null,
    };
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        personContext,
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects learningProgressTenths beyond learningProgressRequired * 10", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personState = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_alpha", { learningProgressTenths: 1001 })],
      learningFocusTechniqueId: null,
    };
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        personContext,
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects a learningFocusTechniqueId that is not present in the catalog", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personState = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_ghost")],
      learningFocusTechniqueId: asTechniqueId("technique_ghost"),
    };
    const result = validateSprint1PersonTechniqueSemantics(
      personState,
      catalog.value,
      personContext,
      sha256Provider,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.path === "/learningFocusTechniqueId")).toBe(true);
  });

  it("hardens TechniqueSemanticsPersonContext and rejects hostile or out-of-range spiritSurfaceValue", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personState = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_alpha")],
      learningFocusTechniqueId: asTechniqueId("technique_alpha"),
    };

    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: 50 },
        sha256Provider,
      ).ok,
    ).toBe(true);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: -1 },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: 101 },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: 1.5 },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: 50, abilities: buildAbilities() },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        { spiritSurfaceValue: 50, [Symbol("x")]: 1 },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        new (class Ctx {
          spiritSurfaceValue = 50;
        })(),
        sha256Provider,
      ).ok,
    ).toBe(false);

    let rootGetterCalls = 0;
    const rootHostile: Record<string, unknown> = {};
    Object.defineProperty(rootHostile, "spiritSurfaceValue", {
      get() {
        rootGetterCalls += 1;
        return 50;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        rootHostile,
        sha256Provider,
      ),
    ).not.toThrow();
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        rootHostile,
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(rootGetterCalls).toBe(0);

    let spiritGetterCalls = 0;
    const spiritHostile = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(spiritHostile, "spiritSurfaceValue", {
      get() {
        spiritGetterCalls += 1;
        return 50;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        spiritHostile,
        sha256Provider,
      ),
    ).not.toThrow();
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        spiritHostile,
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(spiritGetterCalls).toBe(0);

    const throwingProxy = new Proxy(
      { spiritSurfaceValue: 50 },
      {
        get() {
          throw new Error("get boom");
        },
        getOwnPropertyDescriptor() {
          throw new Error("descriptor boom");
        },
      },
    );
    expect(() =>
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        throwingProxy,
        sha256Provider,
      ),
    ).not.toThrow();
    expect(
      validateSprint1PersonTechniqueSemantics(
        personState,
        catalog.value,
        throwingProxy,
        sha256Provider,
      ).ok,
    ).toBe(false);

    const { proxy, revoke } = Proxy.revocable({ spiritSurfaceValue: 50 }, {});
    revoke();
    expect(() =>
      validateSprint1PersonTechniqueSemantics(personState, catalog.value, proxy, sha256Provider),
    ).not.toThrow();
    expect(
      validateSprint1PersonTechniqueSemantics(personState, catalog.value, proxy, sha256Provider).ok,
    ).toBe(false);
  });

  it("validates Sprint1PersonState before catalog hash and skips the provider on invalid person state", () => {
    const catalog = buildCatalog([validDefinition()], sha256Provider);
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    const personContext = { spiritSurfaceValue: 50 };

    const provider = countingProvider();
    expect(
      validateSprint1PersonTechniqueSemantics(
        { not: "a sprint1 person state" },
        catalog.value,
        personContext,
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    let getterCalls = 0;
    const hostileState: Record<string, unknown> = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      techniqueStates: [],
      learningFocusTechniqueId: null,
    };
    Object.defineProperty(hostileState, "currentMental", {
      get() {
        getterCalls += 1;
        return 100;
      },
      enumerable: true,
      configurable: true,
    });
    expect(
      validateSprint1PersonTechniqueSemantics(hostileState, catalog.value, personContext, provider)
        .ok,
    ).toBe(false);
    expect(getterCalls).toBe(0);
    expect(provider.calls).toBe(0);

    const { proxy, revoke } = Proxy.revocable(
      {
        sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
        currentMental: 100,
        techniqueStates: [],
        learningFocusTechniqueId: null,
      },
      {},
    );
    revoke();
    expect(() =>
      validateSprint1PersonTechniqueSemantics(proxy, catalog.value, personContext, provider),
    ).not.toThrow();
    expect(
      validateSprint1PersonTechniqueSemantics(proxy, catalog.value, personContext, provider).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      validateSprint1PersonTechniqueSemantics(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 100,
          techniqueStates: [],
          learningFocusTechniqueId: null,
        },
        catalog.value,
        { spiritSurfaceValue: -1 },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    const successProvider = countingProvider();
    const okPerson = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [techniqueState("technique_alpha")],
      learningFocusTechniqueId: asTechniqueId("technique_alpha"),
    };
    const ok = validateSprint1PersonTechniqueSemantics(
      okPerson,
      catalog.value,
      personContext,
      successProvider,
    );
    expect(ok.ok).toBe(true);
    expect(successProvider.calls).toBe(1);
  });
});

describe("Technique acquisition conditions and derived status", () => {
  it("evaluates requiredAptitude pass/fail via the category aptitude", () => {
    const learner: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes({ unarmed: 50 }),
      techniqueStates: [],
    };
    const failing = mustValidateDefinition({ requiredAptitude: 60, requiredStats: {} });
    const passing = mustValidateDefinition({ requiredAptitude: 40, requiredStats: {} });
    const failResult = evaluateTechniqueAcquisitionConditions(failing, learner);
    const passResult = evaluateTechniqueAcquisitionConditions(passing, learner);
    expect(failResult.ok && passResult.ok).toBe(true);
    if (!failResult.ok || !passResult.ok) return;
    expect(failResult.value.requiredAptitudeMet).toBe(false);
    expect(failResult.value.allConditionsMet).toBe(false);
    expect(passResult.value.requiredAptitudeMet).toBe(true);
    expect(passResult.value.allConditionsMet).toBe(true);
  });

  it("treats an empty requiredStats as always satisfied regardless of ability values", () => {
    const learner: TechniqueLearnerContext = {
      abilities: buildAbilities({ strength: 0, skill: 0 }),
      aptitudes: buildAptitudes(),
      techniqueStates: [],
    };
    const definition = mustValidateDefinition({ requiredStats: {}, requiredAptitude: 0 });
    const result = evaluateTechniqueAcquisitionConditions(definition, learner);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.unmetRequiredStats).toEqual([]);
  });

  it("reports a missing prerequisite technique as not acquired", () => {
    const learner: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [],
    };
    const definition = mustValidateDefinition({
      requiredAptitude: 0,
      requiredStats: {},
      prerequisiteTechniqueIds: ["technique_missing"],
    });
    const result = evaluateTechniqueAcquisitionConditions(definition, learner);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.missingPrerequisiteTechniqueIds).toEqual(["technique_missing"]);
    expect(result.value.allConditionsMet).toBe(false);
  });

  it("evaluates prerequisiteTechniqueMastery below, at, and above the threshold", () => {
    const definition = mustValidateDefinition({
      requiredAptitude: 0,
      requiredStats: {},
      prerequisiteTechniqueIds: ["technique_master"],
      prerequisiteTechniqueMastery: [{ techniqueId: "technique_master", requiredMastery: 50 }],
    });
    const below = evaluateTechniqueAcquisitionConditions(definition, {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [
        techniqueState("technique_master", { acquiredAbsoluteWeek: 1, masteryHundredths: 4999 }),
      ],
    });
    const at = evaluateTechniqueAcquisitionConditions(definition, {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [
        techniqueState("technique_master", { acquiredAbsoluteWeek: 1, masteryHundredths: 5000 }),
      ],
    });
    expect(below.ok && at.ok).toBe(true);
    if (!below.ok || !at.ok) return;
    expect(below.value.unmetPrerequisiteMastery).toEqual(["technique_master"]);
    expect(below.value.allConditionsMet).toBe(false);
    expect(at.value.unmetPrerequisiteMastery).toEqual([]);
    expect(at.value.allConditionsMet).toBe(true);
  });

  it("derives progressing/acquirable/blocked_at_cap by progress cap and condition state", () => {
    const learnerOk: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [],
    };
    const openDefinition = mustValidateDefinition({
      requiredAptitude: 0,
      requiredStats: {},
      learningProgressRequired: 100,
    });
    const belowCap = deriveLearningTargetStatus(
      openDefinition,
      techniqueState("technique_alpha", { learningProgressTenths: 999 }),
      learnerOk,
    );
    const acquirable = deriveLearningTargetStatus(
      openDefinition,
      techniqueState("technique_alpha", { learningProgressTenths: 1000 }),
      learnerOk,
    );

    const blockedDefinition = mustValidateDefinition({
      requiredAptitude: 60,
      requiredStats: {},
      learningProgressRequired: 100,
    });
    const learnerBlocked: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes({ unarmed: 50 }),
      techniqueStates: [],
    };
    const blocked = deriveLearningTargetStatus(
      blockedDefinition,
      techniqueState("technique_alpha", { learningProgressTenths: 1000 }),
      learnerBlocked,
    );

    expect(belowCap.ok && acquirable.ok && blocked.ok).toBe(true);
    if (!belowCap.ok || !acquirable.ok || !blocked.ok) return;
    expect(belowCap.value).toBe("progressing");
    expect(acquirable.value).toBe("acquirable");
    expect(blocked.value).toBe("blocked_at_cap");
  });

  it("rejects mismatched techniqueId and out-of-range learningProgressTenths", () => {
    const definition = mustValidateDefinition({
      requiredAptitude: 0,
      requiredStats: {},
      learningProgressRequired: 100,
    });
    const learner: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [],
    };

    expect(
      deriveLearningTargetStatus(
        definition,
        techniqueState("technique_other", { learningProgressTenths: 500 }),
        learner,
      ).ok,
    ).toBe(false);
    expect(
      deriveLearningTargetStatus(
        definition,
        techniqueState("technique_alpha", { learningProgressTenths: -1 }),
        learner,
      ).ok,
    ).toBe(false);
    expect(
      deriveLearningTargetStatus(
        definition,
        techniqueState("technique_alpha", { learningProgressTenths: 1001 }),
        learner,
      ).ok,
    ).toBe(false);
    expect(
      deriveLearningTargetStatus(
        definition,
        techniqueState("technique_alpha", {
          learningProgressTenths: 1.5 as unknown as number,
        }),
        learner,
      ).ok,
    ).toBe(false);

    const atCapMinusOne = deriveLearningTargetStatus(
      definition,
      techniqueState("technique_alpha", { learningProgressTenths: 999 }),
      learner,
    );
    expect(atCapMinusOne.ok).toBe(true);
    if (atCapMinusOne.ok) {
      expect(atCapMinusOne.value).toBe("progressing");
    }
  });

  it("treats an unheld technique as the virtual zero state and always progressing", () => {
    const definition = mustValidateDefinition({
      requiredAptitude: 0,
      requiredStats: {},
      learningProgressRequired: 100,
    });
    const learner: TechniqueLearnerContext = {
      abilities: buildAbilities(),
      aptitudes: buildAptitudes(),
      techniqueStates: [],
    };
    const result = deriveLearningTargetStatus(definition, null, learner);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe("progressing");
  });
});

describe("requiredStatsFactor", () => {
  it("derives 10000/7000/8500/10000 for empty/0%/50%/100% and averages multi-stat ratios", () => {
    const emptyDefinition = mustValidateDefinition({ requiredStats: {} });
    const singleStatDefinition = mustValidateDefinition({ requiredStats: { strength: 50 } });
    const multiStatDefinition = mustValidateDefinition({
      requiredStats: { strength: 50, skill: 50 },
    });

    const emptyResult = deriveRequiredStatsFactor(emptyDefinition, buildAbilities());
    const zeroResult = deriveRequiredStatsFactor(
      singleStatDefinition,
      buildAbilities({ strength: 0 }),
    );
    const halfResult = deriveRequiredStatsFactor(
      singleStatDefinition,
      buildAbilities({ strength: 25 }),
    );
    const fullResult = deriveRequiredStatsFactor(
      singleStatDefinition,
      buildAbilities({ strength: 50 }),
    );
    const multiResult = deriveRequiredStatsFactor(
      multiStatDefinition,
      buildAbilities({ strength: 0, skill: 50 }),
    );

    for (const result of [emptyResult, zeroResult, halfResult, fullResult, multiResult]) {
      expect(result.ok).toBe(true);
    }
    if (!emptyResult.ok || !zeroResult.ok || !halfResult.ok || !fullResult.ok || !multiResult.ok) {
      return;
    }
    expect(emptyResult.value).toBe(10000);
    expect(zeroResult.value).toBe(7000);
    expect(halfResult.value).toBe(8500);
    expect(fullResult.value).toBe(10000);
    expect(multiResult.value).toBe(8500);
  });
});

describe("Mastery bands and mastery readers", () => {
  it("selects the current-value mastery factor at the 0/3999/4000/10000 boundaries", () => {
    const config = getDefaultSprint1Config();
    const factors = config.techniqueLearning.masteryCurrentValueFactors;
    const cases: Array<[number, number]> = [
      [0, factors.mastery0to39],
      [3999, factors.mastery0to39],
      [4000, factors.mastery40to59],
      [10000, factors.mastery90to100],
    ];
    for (const [masteryHundredths, expected] of cases) {
      const result = selectMasteryCurrentValueFactor(masteryHundredths, config);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value).toBe(expected);
    }
  });

  it("derives initial mastery hundredths as 100x the tier's configured display value", () => {
    const config = getDefaultSprint1Config();
    for (const tier of LEARNING_TIERS) {
      const result = deriveInitialMasteryHundredths(tier, config);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value).toBe(config.techniqueLearning.initialMasteryByTier[tier] * 100);
    }
  });

  it("reads the effective mastery directly from a stored PersonTechniqueState", () => {
    const state = techniqueState("technique_alpha", { masteryHundredths: 1234 });
    const result = deriveTechniqueEffectiveMasteryHundredths(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(1234);
    expect(
      deriveTechniqueEffectiveMasteryHundredths({
        masteryHundredths: 10001,
      } as unknown as PersonTechniqueState).ok,
    ).toBe(false);
  });
});

describe("teacherCanTeach", () => {
  it("returns false for every disqualifying master condition", () => {
    const definition = baseTeacherDefinition();
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ activeMentorshipExists: false }))),
    ).toBe(false);
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ masterLifeStatus: "deceased" }))),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(definition, baseTeacherCtx({ masterParticipationStatus: "waiting" })),
      ),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(definition, baseTeacherCtx({ masterParticipationStatus: "stopped" })),
      ),
    ).toBe(false);
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ masterCareerStatus: "trainee" }))),
    ).toBe(false);
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ masterCareerStatus: "child" }))),
    ).toBe(false);
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ masterTechniqueState: null }))),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(
          definition,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_master", {
              acquiredAbsoluteWeek: null,
              masteryHundredths: 5000,
            }),
          }),
        ),
      ),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(
          definition,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_master", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 4999,
            }),
          }),
        ),
      ),
    ).toBe(false);
  });

  it("binds the master state to the target TechniqueDefinition and its teaching threshold", () => {
    const definitionA = baseTeacherDefinition({
      techniqueId: "technique_a",
      teachingProficiencyRequired: 80,
    });
    const matching = teacherCanTeach(
      definitionA,
      baseTeacherCtx({
        masterTechniqueState: techniqueState("technique_a", {
          acquiredAbsoluteWeek: 1,
          masteryHundredths: 8000,
        }),
      }),
    );
    expect(expectOkValue(matching)).toBe(true);

    const mismatchedState = teacherCanTeach(
      definitionA,
      baseTeacherCtx({
        masterTechniqueState: techniqueState("technique_b", {
          acquiredAbsoluteWeek: 1,
          masteryHundredths: 8000,
        }),
      }),
    );
    expect(expectOkValue(mismatchedState)).toBe(false);

    expect(
      expectOkValue(
        teacherCanTeach(
          definitionA,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_a", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 7900,
            }),
          }),
        ),
      ),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(
          definitionA,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_a", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 8000,
            }),
          }),
        ),
      ),
    ).toBe(true);

    expect("teachingProficiencyRequired" in baseTeacherCtx()).toBe(false);

    const requiredZero = baseTeacherDefinition({
      techniqueId: "technique_a",
      teachingProficiencyRequired: 0,
    });
    expect(
      expectOkValue(
        teacherCanTeach(
          requiredZero,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_a", {
              acquiredAbsoluteWeek: null,
              masteryHundredths: 0,
            }),
          }),
        ),
      ),
    ).toBe(false);
    expect(
      expectOkValue(
        teacherCanTeach(
          requiredZero,
          baseTeacherCtx({
            masterTechniqueState: techniqueState("technique_a", {
              acquiredAbsoluteWeek: 1,
              masteryHundredths: 0,
            }),
          }),
        ),
      ),
    ).toBe(true);
  });

  it("returns true for active_competitor and retired masters at/above the mastery threshold", () => {
    const definition = baseTeacherDefinition();
    expect(
      expectOkValue(
        teacherCanTeach(definition, baseTeacherCtx({ masterCareerStatus: "active_competitor" })),
      ),
    ).toBe(true);
    expect(
      expectOkValue(teacherCanTeach(definition, baseTeacherCtx({ masterCareerStatus: "retired" }))),
    ).toBe(true);
  });

  it("does not use secrecy when deciding teacherCanTeach", () => {
    const lowSecrecy = baseTeacherDefinition({ secrecy: 0 });
    const highSecrecy = baseTeacherDefinition({ secrecy: 100 });
    const ctx = baseTeacherCtx();
    expect(expectOkValue(teacherCanTeach(lowSecrecy, ctx))).toBe(
      expectOkValue(teacherCanTeach(highSecrecy, ctx)),
    );
  });
});

describe("basic attacks", () => {
  it("returns all three basic attack profiles with zero mental cost", () => {
    const config = getDefaultSprint1Config();
    for (const category of TECHNIQUE_CATEGORIES) {
      const result = getBasicAttackProfile(config, category);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value).toEqual(config.techniqueBalance.basicAttackProfiles[category]);
      expect(result.value.mentalCost).toBe(0);
    }
  });

  it("derives a fixed effective mastery of 5000 hundredths and holds no technique state", () => {
    const config = getDefaultSprint1Config();
    for (const category of TECHNIQUE_CATEGORIES) {
      const profile = getBasicAttackProfile(config, category);
      expect(profile.ok).toBe(true);
      if (!profile.ok) continue;
      const effective = deriveBasicAttackEffectiveMasteryHundredths(profile.value);
      expect(effective.ok).toBe(true);
      if (!effective.ok) continue;
      expect(effective.value).toBe(5000);
      expect("techniqueId" in profile.value).toBe(false);
    }
  });

  it("rejects an unknown/martial category and does not fabricate a profile", () => {
    const config = getDefaultSprint1Config();
    expect(getBasicAttackProfile(config, "martial" as unknown as TechniqueCategory).ok).toBe(false);
    expect(getBasicAttackProfile(config, "not-a-category" as unknown as TechniqueCategory).ok).toBe(
      false,
    );
  });
});

describe("hardening probes", () => {
  it("does not invoke getters while rejecting a hostile TechniqueDefinition input", () => {
    let getterCalls = 0;
    const input: Record<string, unknown> = validDefinition();
    Object.defineProperty(input, "power", {
      get() {
        getterCalls += 1;
        return 25;
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => validateTechniqueDefinition(input)).not.toThrow();
    expect(validateTechniqueDefinition(input).ok).toBe(false);
    expect(getterCalls).toBe(0);
  });

  it("returns a validation failure for revoked TechniqueDefinition/TechniqueCatalog Proxies without throwing", () => {
    const { proxy, revoke } = Proxy.revocable(validDefinition(), {});
    revoke();
    expect(() => validateTechniqueDefinition(proxy)).not.toThrow();
    expect(validateTechniqueDefinition(proxy).ok).toBe(false);

    const catalogProxy = Proxy.revocable({ identity: {}, definitions: [] }, {});
    catalogProxy.revoke();
    expect(() => validateTechniqueCatalog(catalogProxy.proxy, sha256Provider)).not.toThrow();
    expect(validateTechniqueCatalog(catalogProxy.proxy, sha256Provider).ok).toBe(false);
  });

  it("never calls the Sha256Provider when catalog hash computation fails on hostile input", () => {
    const provider = countingProvider();
    const hostile = new Proxy([validDefinition()], {
      getOwnPropertyDescriptor(target, prop) {
        if (prop === "length") {
          throw new Error("length descriptor boom");
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });
    expect(() => computeTechniqueCatalogHash(hostile, provider)).not.toThrow();
    expect(computeTechniqueCatalogHash(hostile, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });
});

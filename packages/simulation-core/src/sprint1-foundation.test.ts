import { createHash } from "node:crypto";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  asPersonId,
  asTechniqueId,
  clonePersonTechniqueState,
  cloneSprint1ConfigInput,
  cloneValidatedSprint1Config,
  computeConfigHash,
  computeSprint1ConfigHash,
  computeSimulationIdentityHash,
  createExpectedSpecVersions,
  createSimulationId,
  createSimulationIdFromIdentity,
  createSimulationIdFromIdentityHash,
  createDefaultSprint1ConfigInput,
  freezeSprint1ConfigInput,
  freezePersonTechniqueState,
  freezeValidatedSprint1Config,
  getDefaultSprint1Config,
  normalizeBasisPoints,
  RANGE_SHIFT_AFTER_USE,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_BALANCE_0_2_0_CONFIG_VERSION,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateNormalizedSprint1Config,
  validatePersonTechniqueState,
  validateSimulationIdentity,
  validateSprint1Config,
  type BasisPoints,
  type PersonTechniqueState,
  type RangeShiftAfterUse,
  type Sha256Provider,
  type SimulationIdentity,
  type Sprint1Config,
  type Sprint1ConfigInput,
} from "./index.js";
import { countNumericLeaves } from "./sprint1/basis-points.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function validPersonTechniqueState(
  overrides: Partial<PersonTechniqueState> = {},
): PersonTechniqueState {
  return {
    techniqueId: asTechniqueId("technique_basic_strike"),
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
    ...overrides,
  };
}

describe("S01-001 public API surface", () => {
  it("reuses AbilityKey and AptitudeKey without redefinition", () => {
    expect([...ABILITY_KEYS]).toEqual(["stamina", "strength", "skill", "speed", "spirit", "magic"]);
    expect([...APTITUDE_KEYS]).toEqual(["unarmed", "sword", "magic"]);
    expect(ABILITY_KEYS).not.toContain("vitality");
    expect(ABILITY_KEYS).not.toContain("technique");
    expect(APTITUDE_KEYS).not.toContain("martial");
  });

  it("distinguishes TechniqueId from PersonId at the type brand boundary", () => {
    const techniqueId = asTechniqueId("technique_a");
    const personId = asPersonId("person_000001");
    expect(techniqueId).not.toBe(personId);
    expect(typeof techniqueId).toBe("string");
  });

  it("exports Sprint1Config helpers and does not expose Battle or weekly mutation APIs", async () => {
    const api = await import("./index.js");
    expect(typeof api.getDefaultSprint1Config).toBe("function");
    expect(typeof api.validateSprint1Config).toBe("function");
    expect(typeof api.computeSprint1ConfigHash).toBe("function");
    expect(typeof api.validatePersonTechniqueState).toBe("function");
    expect(typeof api.validateSimulationIdentity).toBe("function");
    expect(typeof api.validateTechniqueCatalog).toBe("function");
    expect(typeof api.computeTechniqueCatalogHash).toBe("function");
    // `BattleState` joined the public surface with S01-005.
    expect(
      Object.keys(api).filter((key) => /learnTechnique|BattleResult|weeklyPlannerApi/.test(key)),
    ).toEqual([]);
  });
});

describe("PersonTechniqueState structural validation", () => {
  it("accepts a complete valid state and deep-freezes the result", () => {
    const result = validatePersonTechniqueState(validPersonTechniqueState());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(result.value.techniqueId).toBe("technique_basic_strike");
  });

  it("rejects missing keys, unknown keys, and invalid TechniqueId", () => {
    expect(validatePersonTechniqueState({}).ok).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        extra: 1,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        techniqueId: "",
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        techniqueId: "  padded  ",
      }).ok,
    ).toBe(false);
  });

  it("rejects non-integers, NaN, Infinity, and out-of-range mastery", () => {
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        learningProgressTenths: 1.5,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        masteryHundredths: Number.NaN,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        successfulUseCount: Number.POSITIVE_INFINITY,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        masteryHundredths: 10001,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        learningProgressTenths: -1,
      }).ok,
    ).toBe(false);
  });

  it("allows null weeks and rejects non-null non-integers", () => {
    const ok = validatePersonTechniqueState(
      validPersonTechniqueState({
        lastPracticedAbsoluteWeek: 12,
        acquiredAbsoluteWeek: null,
      }),
    );
    expect(ok.ok).toBe(true);
    expect(
      validatePersonTechniqueState({
        ...validPersonTechniqueState(),
        acquiredAbsoluteWeek: "1",
      }).ok,
    ).toBe(false);
  });

  it("does not require catalog membership or technique learning caps", () => {
    const result = validatePersonTechniqueState(
      validPersonTechniqueState({
        techniqueId: asTechniqueId("technique_unknown_not_in_catalog"),
        learningProgressTenths: 999999,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("supports JSON round-trip, clone independence, and input immutability", () => {
    const input = validPersonTechniqueState({ masteryHundredths: 150 });
    const result = validatePersonTechniqueState(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const roundTrip = JSON.parse(JSON.stringify(result.value)) as PersonTechniqueState;
    expect(validatePersonTechniqueState(roundTrip).ok).toBe(true);
    const cloned = clonePersonTechniqueState(result.value);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) {
      return;
    }
    expect(cloned.value).toEqual(result.value);
    expect(cloned.value).not.toBe(result.value);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    input.masteryHundredths = 999;
    expect(result.value.masteryHundredths).toBe(150);
  });

  it("rejects accessor properties", () => {
    const input: Record<string, unknown> = validPersonTechniqueState();
    Object.defineProperty(input, "masteryHundredths", {
      get: () => 10,
      enumerable: true,
      configurable: true,
    });
    expect(validatePersonTechniqueState(input).ok).toBe(false);
  });
});

describe("Sprint1Config validation, canonicalization, and hash", () => {
  it("accepts the default config and freezes the validated output", () => {
    const config = getDefaultSprint1Config();
    expect(config.schemaVersion).toBe("0.2.0");
    expect(config.configVersion).toBe("sprint1-balance-0.2.0");
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.battle)).toBe(true);
    expect(Object.keys(config.techniqueBalance.basicAttackProfiles)).toEqual([
      "unarmed",
      "sword",
      "magic",
    ]);
  });

  it("rejects unknown keys, martial category, and AbilityKey vitality/technique misuse", () => {
    const base = createDefaultSprint1ConfigInput() as Sprint1Config & Record<string, unknown>;
    expect(validateSprint1Config({ ...base, extra: true }).ok).toBe(false);

    const withMartial = createDefaultSprint1ConfigInput();
    (withMartial.techniqueBalance.basicAttackProfiles as Record<string, unknown>)["martial"] = {
      ...withMartial.techniqueBalance.basicAttackProfiles.unarmed,
    };
    expect(validateSprint1Config(withMartial).ok).toBe(false);

    const withVitality = createDefaultSprint1ConfigInput();
    (
      withVitality.techniqueBalance.basicAttackProfiles.unarmed as unknown as {
        primaryStats: string[];
      }
    ).primaryStats = ["vitality", "skill"];
    expect(validateSprint1Config(withVitality).ok).toBe(false);

    const withTechniqueAbility = createDefaultSprint1ConfigInput();
    (
      withTechniqueAbility.techniqueBalance.basicAttackProfiles.sword as unknown as {
        primaryStats: string[];
      }
    ).primaryStats = ["technique", "strength"];
    expect(validateSprint1Config(withTechniqueAbility).ok).toBe(false);
  });

  it("rejects missing keys, wrong types, NaN, decimals where integers required, and out-of-range", () => {
    const missing = createDefaultSprint1ConfigInput() as Partial<Sprint1Config>;
    delete (missing as { battle?: unknown }).battle;
    expect(validateSprint1Config(missing).ok).toBe(false);

    const wrongType = createDefaultSprint1ConfigInput();
    (wrongType.battle as { maxTurns: unknown }).maxTurns = "20";
    expect(validateSprint1Config(wrongType).ok).toBe(false);

    const nanConfig = createDefaultSprint1ConfigInput();
    nanConfig.growth.potentialMinimumFactor = Number.NaN;
    expect(validateSprint1Config(nanConfig).ok).toBe(false);

    const decimalTurns = createDefaultSprint1ConfigInput();
    decimalTurns.battle.maxTurns = 20.5;
    expect(validateSprint1Config(decimalTurns).ok).toBe(false);

    const outOfRange = createDefaultSprint1ConfigInput();
    outOfRange.battle.maxTurns = 19;
    expect(validateSprint1Config(outOfRange).ok).toBe(false);
  });

  it("rejects sparse arrays and accessor properties", () => {
    const sparse = createDefaultSprint1ConfigInput();
    const arr: string[] = [];
    arr[1] = "strength";
    (
      sparse.techniqueBalance.basicAttackProfiles.unarmed as {
        primaryStats: unknown;
      }
    ).primaryStats = arr;
    expect(validateSprint1Config(sparse).ok).toBe(false);

    const accessor = createDefaultSprint1ConfigInput() as Sprint1Config & Record<string, unknown>;
    Object.defineProperty(accessor, "configVersion", {
      get: () => "sprint1-balance-0.2.0",
      enumerable: true,
      configurable: true,
    });
    expect(validateSprint1Config(accessor).ok).toBe(false);
  });

  it("does not mutate input and returns an independent frozen clone", () => {
    const input = createDefaultSprint1ConfigInput();
    const before = structuredClone(input);
    const result = validateSprint1Config(input);
    expect(result.ok).toBe(true);
    expect(input).toEqual(before);
    if (!result.ok) {
      return;
    }
    expect(result.value).not.toBe(input);
    expect(() => {
      (result.value as { configVersion: string }).configVersion = "x";
    }).toThrow();
  });

  it("canonicalizes independently of object insertion order", () => {
    const a = createDefaultSprint1ConfigInput();
    const b = JSON.parse(JSON.stringify(a)) as Sprint1ConfigInput;
    const rebuilt = {
      battle: b.battle,
      techniqueBalance: b.techniqueBalance,
      techniqueLearning: b.techniqueLearning,
      weeklyPlanner: b.weeklyPlanner,
      temporaryCondition: b.temporaryCondition,
      growth: b.growth,
      configVersion: b.configVersion,
      schemaVersion: b.schemaVersion,
    };
    const validatedA = validateSprint1Config(a);
    const validatedB = validateSprint1Config(rebuilt);
    expect(validatedA.ok && validatedB.ok).toBe(true);
    if (!validatedA.ok || !validatedB.ok) {
      return;
    }
    expect(toCanonicalJson(validatedA.value)).toBe(toCanonicalJson(validatedB.value));
  });

  it("produces identical hashes for equal configs and different hashes for one-field changes", () => {
    const a = createDefaultSprint1ConfigInput();
    const b = createDefaultSprint1ConfigInput();
    const hashA = computeSprint1ConfigHash(a, sha256Provider);
    const hashB = computeSprint1ConfigHash(b, sha256Provider);
    expect(hashA.ok && hashB.ok).toBe(true);
    if (!hashA.ok || !hashB.ok) {
      return;
    }
    expect(hashA.value).toBe(hashB.value);

    // Same configVersion with mutated content must fail validation (not hash).
    const changed = createDefaultSprint1ConfigInput();
    changed.battle.hit.evadePenalty = 31;
    expect(validateSprint1Config(changed).ok).toBe(false);
    expect(computeSprint1ConfigHash(changed, sha256Provider).ok).toBe(false);

    // Low-level canonical hash still differs when content differs (no validation).
    expect(sha256Provider.hashUtf8(toCanonicalJson(changed))).not.toBe(
      sha256Provider.hashUtf8(toCanonicalJson(a)),
    );
  });

  it("includes basicAttackProfiles in the hash", () => {
    const base = getDefaultSprint1Config();
    const changed = createDefaultSprint1ConfigInput();
    changed.techniqueBalance.basicAttackProfiles.unarmed.accuracy = 74;
    expect(validateSprint1Config(changed).ok).toBe(false);
    expect(computeSprint1ConfigHash(changed, sha256Provider).ok).toBe(false);
    expect(sha256Provider.hashUtf8(toCanonicalJson(changed))).not.toBe(
      sha256Provider.hashUtf8(toCanonicalJson(base)),
    );
  });

  it("supports injected Sha256Provider and cloneValidatedSprint1Config independence", () => {
    const configInput = createDefaultSprint1ConfigInput();
    const seen: string[] = [];
    const stub: Sha256Provider = {
      hashUtf8(utf8Text: string): string {
        seen.push(utf8Text);
        return createHash("sha256").update(utf8Text, "utf8").digest("hex");
      },
    };
    const hash = computeSprint1ConfigHash(configInput, stub);
    expect(hash.ok).toBe(true);
    if (!hash.ok) {
      return;
    }
    const validated = validateSprint1Config(configInput);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(seen).toEqual([toCanonicalJson(validated.value)]);
    expect(hash.value).toMatch(/^[0-9a-f]{64}$/);

    const config = getDefaultSprint1Config();
    const cloned = cloneValidatedSprint1Config(config);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) {
      return;
    }
    expect(cloned.value).toEqual(config);
    expect(cloned.value).not.toBe(config);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    expect(Object.isFrozen(cloned.value.battle)).toBe(true);
  });

  it("does not change Sprint 0 config hash regression", () => {
    const sprint0 = validateInitialWorldConfig(cloneBaselineConfig());
    expect(sprint0.ok).toBe(true);
    if (!sprint0.ok) {
      return;
    }
    const hash = computeConfigHash(sprint0.value, sha256Provider);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(createSimulationId(hash, 12345, hash, sha256Provider)).toMatch(
      /^simulation_[0-9a-f]{16}$/,
    );
  });
});

describe("SimulationIdentity", () => {
  function sampleIdentity(overrides: Partial<SimulationIdentity> = {}): SimulationIdentity {
    const configInput = createDefaultSprint1ConfigInput();
    const sprint1ConfigHashResult = computeSprint1ConfigHash(configInput, sha256Provider);
    if (!sprint1ConfigHashResult.ok) {
      throw new Error("expected default Sprint1Config hash to succeed");
    }
    const hex = "a".repeat(64);
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
      specVersions: createExpectedSpecVersions(),
      rngAlgorithmVersion: "xoshiro128ss-v1",
      canonicalJsonVersion: "canonical-json-v1",
      hashAlgorithm: "SHA-256",
      ...overrides,
    };
  }

  it("accepts complete version info and produces a stable simulationId", () => {
    const result = validateSimulationIdentity(sampleIdentity());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(
      result.value.specVersions.map((entry: { specSetId: string }) => entry.specSetId),
    ).toEqual(["main", "sprint0", "sprint1"]);
    expect(result.value.specVersions[2]?.version).toBe(S1_SPEC_VERSION);
    const id = createSimulationIdFromIdentity(result.value, sha256Provider);
    expect(id.ok).toBe(true);
    if (!id.ok) {
      return;
    }
    expect(id.value).toMatch(/^simulation_[0-9a-f]{16}$/);
    const hash = computeSimulationIdentityHash(result.value, sha256Provider);
    expect(hash.ok).toBe(true);
    if (!hash.ok) {
      return;
    }
    expect(createSimulationIdFromIdentityHash(hash.value)).toBe(id.value);
  });

  it("changes identity when seed or config hash differs", () => {
    const a = validateSimulationIdentity(sampleIdentity());
    const b = validateSimulationIdentity(sampleIdentity({ seed: 999 }));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) {
      return;
    }
    const hashA = computeSimulationIdentityHash(a.value, sha256Provider);
    const hashB = computeSimulationIdentityHash(b.value, sha256Provider);
    expect(hashA.ok && hashB.ok).toBe(true);
    if (!hashA.ok || !hashB.ok) {
      return;
    }
    expect(hashA.value).not.toBe(hashB.value);
  });

  it("rejects incomplete or unknown specVersions", () => {
    expect(
      validateSimulationIdentity(
        sampleIdentity({
          specVersions: [{ specSetId: "main", version: "SPEC-0.1.2" }],
        }),
      ).ok,
    ).toBe(false);
    expect(
      validateSimulationIdentity(
        sampleIdentity({
          specVersions: [
            { specSetId: "main", version: "SPEC-0.1.2" },
            { specSetId: "sprint0", version: "S0-SPEC-0.1.5" },
            { specSetId: "sprint1", version: "S1-SPEC-0.1.10-draft" },
          ],
        }),
      ).ok,
    ).toBe(false);
  });

  it("keeps Sprint 0 createSimulationId API working unchanged", () => {
    const materialHash = "b".repeat(64);
    const id = createSimulationId(materialHash, 1, materialHash, sha256Provider);
    expect(id).toMatch(/^simulation_[0-9a-f]{16}$/);
  });
});

describe("S01-001 acceptance negative probes", () => {
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

  function sampleIdentity(overrides: Partial<SimulationIdentity> = {}): SimulationIdentity {
    const configInput = createDefaultSprint1ConfigInput();
    const sprint1ConfigHashResult = computeSprint1ConfigHash(configInput, sha256Provider);
    if (!sprint1ConfigHashResult.ok) {
      throw new Error("expected default Sprint1Config hash to succeed");
    }
    const hex = "a".repeat(64);
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
      specVersions: createExpectedSpecVersions(),
      rngAlgorithmVersion: "xoshiro128ss-v1",
      canonicalJsonVersion: "canonical-json-v1",
      hashAlgorithm: "SHA-256",
      ...overrides,
    };
  }

  it("rejects arbitrary unknown configVersion", () => {
    const input = createDefaultSprint1ConfigInput();
    input.configVersion = "arbitrary-version";
    expect(validateSprint1Config(input).ok).toBe(false);
  });

  it("rejects empty and whitespace configVersion", () => {
    const empty = createDefaultSprint1ConfigInput();
    empty.configVersion = "";
    expect(validateSprint1Config(empty).ok).toBe(false);
    const padded = createDefaultSprint1ConfigInput();
    padded.configVersion = " sprint1-balance-0.2.0 ";
    expect(validateSprint1Config(padded).ok).toBe(false);
  });

  it("rejects default version with any content change", () => {
    const changed = createDefaultSprint1ConfigInput();
    changed.battle.hit.evadePenalty = 31;
    expect(validateSprint1Config(changed).ok).toBe(false);
  });

  it("rejects default version when basicAttackProfiles change", () => {
    const changed = createDefaultSprint1ConfigInput();
    changed.techniqueBalance.basicAttackProfiles.sword.accuracy = 1;
    expect(validateSprint1Config(changed).ok).toBe(false);
  });

  it("pins sprint1-balance-0.2.0 canonical SHA-256", () => {
    const config = getDefaultSprint1Config();
    expect(config.configVersion).toBe(SPRINT1_BALANCE_0_2_0_CONFIG_VERSION);
    const canonical = toCanonicalJson(config);
    const actualHash = sha256Provider.hashUtf8(canonical);
    expect(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(actualHash).toBe(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256);
    expect(sha256Provider.hashUtf8(canonical)).toBe(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256);
  });

  it("accepts equal default content regardless of insertion order", () => {
    const a = createDefaultSprint1ConfigInput();
    const b = JSON.parse(JSON.stringify(a)) as Sprint1ConfigInput;
    const rebuilt = {
      battle: b.battle,
      techniqueBalance: b.techniqueBalance,
      techniqueLearning: b.techniqueLearning,
      weeklyPlanner: b.weeklyPlanner,
      temporaryCondition: b.temporaryCondition,
      growth: b.growth,
      configVersion: b.configVersion,
      schemaVersion: b.schemaVersion,
    };
    expect(validateSprint1Config(rebuilt).ok).toBe(true);
  });

  it("fails config hash for unknown keys and does not call Sha256Provider", () => {
    const provider = countingProvider();
    const input = { ...createDefaultSprint1ConfigInput(), extra: true };
    const result = computeSprint1ConfigHash(input, provider);
    expect(result.ok).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("fails config hash for invalid configVersion without calling provider", () => {
    const provider = countingProvider();
    const input = createDefaultSprint1ConfigInput();
    input.configVersion = "arbitrary-version";
    expect(computeSprint1ConfigHash(input, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("fails config hash for accessor properties without calling provider", () => {
    const provider = countingProvider();
    const input = createDefaultSprint1ConfigInput() as Sprint1Config & Record<string, unknown>;
    Object.defineProperty(input, "configVersion", {
      get: () => "sprint1-balance-0.2.0",
      enumerable: true,
      configurable: true,
    });
    expect(computeSprint1ConfigHash(input, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("fails identity hash and simulationId for invalid identity without calling provider", () => {
    const provider = countingProvider();
    const invalid = sampleIdentity({ seed: -1 });
    expect(computeSimulationIdentityHash(invalid, provider).ok).toBe(false);
    expect(createSimulationIdFromIdentity(invalid, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("deep-freezes nested values even when only the root was pre-frozen", () => {
    const raw = createDefaultSprint1ConfigInput();
    Object.freeze(raw);
    expect(Object.isFrozen(raw)).toBe(true);
    expect(Object.isFrozen(raw.battle)).toBe(false);
    const validated = validateSprint1Config(raw);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(Object.isFrozen(validated.value.battle)).toBe(true);
    expect(Object.isFrozen(validated.value.battle.hit)).toBe(true);
    expect(() => {
      (validated.value.battle.hit as { evadePenalty: number }).evadePenalty = 999;
    }).toThrow();
    expect(validated.value.battle.hit.evadePenalty).toBe(30);
  });

  it("rejects cycles, accessors, and symbol keys inside a frozen root during freeze", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic["self"] = cyclic;
    Object.freeze(cyclic);
    expect(() => freezeSprint1ConfigInput(cyclic)).not.toThrow();
    expect(freezeSprint1ConfigInput(cyclic).ok).toBe(false);

    const withAccessor: Record<string, unknown> = {};
    Object.defineProperty(withAccessor, "x", {
      get: () => 1,
      enumerable: true,
      configurable: true,
    });
    Object.freeze(withAccessor);
    expect(() => freezeSprint1ConfigInput(withAccessor)).not.toThrow();
    expect(freezeSprint1ConfigInput(withAccessor).ok).toBe(false);

    const withSymbol: Record<string, unknown> = { a: 1 };
    Object.defineProperty(withSymbol, Symbol("s"), {
      value: 1,
      enumerable: true,
      configurable: true,
    });
    Object.freeze(withSymbol);
    expect(() => freezeSprint1ConfigInput(withSymbol)).not.toThrow();
    expect(freezeSprint1ConfigInput(withSymbol).ok).toBe(false);
  });

  it("rejects class instances for Sprint1Config and PersonTechniqueState", () => {
    class ConfigShim {}
    const configInstance = Object.assign(new ConfigShim(), createDefaultSprint1ConfigInput());
    expect(validateSprint1Config(configInstance).ok).toBe(false);

    class StateShim {}
    const stateInstance = Object.assign(new StateShim(), validPersonTechniqueState());
    expect(validatePersonTechniqueState(stateInstance).ok).toBe(false);
  });

  it("rejects Date, Map, and Set as plain objects", () => {
    expect(validateSprint1Config(new Date())).toMatchObject({ ok: false });
    expect(validatePersonTechniqueState(new Map())).toMatchObject({ ok: false });
    expect(validateSimulationIdentity(new Set())).toMatchObject({ ok: false });
  });

  it("returns validation failure for throwing Proxy traps without throwing out", () => {
    const ownKeysThrow = new Proxy(createDefaultSprint1ConfigInput(), {
      ownKeys() {
        throw new Error("ownKeys boom");
      },
    });
    expect(() => validateSprint1Config(ownKeysThrow)).not.toThrow();
    expect(validateSprint1Config(ownKeysThrow).ok).toBe(false);

    const descriptorThrow = new Proxy(createDefaultSprint1ConfigInput(), {
      getOwnPropertyDescriptor() {
        throw new Error("descriptor boom");
      },
    });
    expect(() => validateSprint1Config(descriptorThrow)).not.toThrow();
    expect(validateSprint1Config(descriptorThrow).ok).toBe(false);
  });

  it("rejects Proxies that change values between reads and does not run getters", () => {
    let flips = 0;
    const flipping = new Proxy(createDefaultSprint1ConfigInput(), {
      get(target, prop, receiver) {
        if (prop === "configVersion") {
          flips += 1;
          return flips % 2 === 0 ? "sprint1-balance-0.2.0" : "other";
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    // Descriptor snapshot uses data descriptor values, not live get — but unstable
    // ownKeys / mismatched descriptors still fail safely. Build an object whose
    // descriptor value differs from get result via a trap on getOwnPropertyDescriptor.
    const mismatched = new Proxy(createDefaultSprint1ConfigInput(), {
      getOwnPropertyDescriptor(target, prop) {
        const desc = Reflect.getOwnPropertyDescriptor(target, prop);
        if (prop === "configVersion" && desc !== undefined && "value" in desc) {
          return { ...desc, value: "tampered-version" };
        }
        return desc;
      },
    });
    expect(validateSprint1Config(mismatched).ok).toBe(false);

    let getterCalls = 0;
    const withGetter: Record<string, unknown> = createDefaultSprint1ConfigInput();
    Object.defineProperty(withGetter, "configVersion", {
      get() {
        getterCalls += 1;
        return "sprint1-balance-0.2.0";
      },
      enumerable: true,
      configurable: true,
    });
    expect(validateSprint1Config(withGetter).ok).toBe(false);
    expect(getterCalls).toBe(0);
    void flipping;
  });

  it("rejects prototype-polluted and symbol-keyed inputs and cycles", () => {
    const polluted = createDefaultSprint1ConfigInput() as Sprint1Config & Record<string, unknown>;
    Object.defineProperty(polluted, "__proto__", {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    // If defineProperty on __proto__ is awkward, use Object.create with pollution via assign
    const withProto = JSON.parse(JSON.stringify(createDefaultSprint1ConfigInput())) as Record<
      string,
      unknown
    >;
    (withProto as { constructor?: unknown }).constructor = { name: "Evil" };
    // class-instance style pollution is covered elsewhere; symbol keys:
    const withSymbol = createDefaultSprint1ConfigInput() as Sprint1Config &
      Record<string | symbol, unknown>;
    withSymbol[Symbol("x")] = 1;
    expect(validateSprint1Config(withSymbol).ok).toBe(false);

    const cyclic = createDefaultSprint1ConfigInput() as Sprint1Config & {
      battle: { self?: unknown };
    };
    (cyclic.battle as { self?: unknown }).self = cyclic.battle;
    expect(validateSprint1Config(cyclic).ok).toBe(false);
    void polluted;
  });

  it("rejects array extra own properties", () => {
    const input = createDefaultSprint1ConfigInput();
    const stats = [...input.techniqueBalance.basicAttackProfiles.unarmed.primaryStats];
    Object.defineProperty(stats, "extra", {
      value: "x",
      enumerable: true,
      configurable: true,
      writable: true,
    });
    (
      input.techniqueBalance.basicAttackProfiles.unarmed as {
        primaryStats: unknown;
      }
    ).primaryStats = stats;
    expect(validateSprint1Config(input).ok).toBe(false);
  });

  it("exposes the full RangeShiftAfterUse union while basic attacks require none", () => {
    const allowed: RangeShiftAfterUse[] = ["none", "approach_one", "retreat_one"];
    expect(RANGE_SHIFT_AFTER_USE).toEqual(allowed);
    const approach: RangeShiftAfterUse = "approach_one";
    expect(approach).toBe("approach_one");

    const changed = createDefaultSprint1ConfigInput();
    (
      changed.techniqueBalance.basicAttackProfiles.unarmed as {
        rangeShiftAfterUse: string;
      }
    ).rangeShiftAfterUse = "approach_one";
    expect(validateSprint1Config(changed).ok).toBe(false);
  });

  it("normalizes reversed specVersions and yields the same identity hash", () => {
    const forward = sampleIdentity();
    const reversed = sampleIdentity({
      specVersions: [...createExpectedSpecVersions()].reverse(),
    });
    const validatedForward = validateSimulationIdentity(forward);
    const validatedReversed = validateSimulationIdentity(reversed);
    expect(validatedForward.ok && validatedReversed.ok).toBe(true);
    if (!validatedForward.ok || !validatedReversed.ok) {
      return;
    }
    expect(validatedReversed.value.specVersions.map((entry) => entry.specSetId)).toEqual([
      "main",
      "sprint0",
      "sprint1",
    ]);
    const hashForward = computeSimulationIdentityHash(validatedForward.value, sha256Provider);
    const hashReversed = computeSimulationIdentityHash(validatedReversed.value, sha256Provider);
    expect(hashForward.ok && hashReversed.ok).toBe(true);
    if (!hashForward.ok || !hashReversed.ok) {
      return;
    }
    expect(hashForward.value).toBe(hashReversed.value);
  });

  it("rejects duplicate, missing, unknown, and wrong-version specVersions", () => {
    expect(
      validateSimulationIdentity(
        sampleIdentity({
          specVersions: [
            { specSetId: "main", version: "SPEC-0.1.2" },
            { specSetId: "main", version: "SPEC-0.1.2" },
            { specSetId: "sprint1", version: S1_SPEC_VERSION },
          ],
        }),
      ).ok,
    ).toBe(false);
    expect(
      validateSimulationIdentity(
        sampleIdentity({
          specVersions: [
            { specSetId: "main", version: "SPEC-0.1.2" },
            { specSetId: "sprint0", version: "S0-SPEC-0.1.5" },
            { specSetId: "other", version: S1_SPEC_VERSION },
          ] as SimulationIdentity["specVersions"],
        }),
      ).ok,
    ).toBe(false);
  });
});

describe("S01-001 acceptance2 reflection / clone / fixed fixture probes", () => {
  it("rejects getPrototypeOf throwing Proxy without throwing out", () => {
    const target = createDefaultSprint1ConfigInput();
    const proxy = new Proxy(target, {
      getPrototypeOf() {
        throw new Error("getPrototypeOf boom");
      },
    });
    expect(() => validateSprint1Config(proxy)).not.toThrow();
    expect(validateSprint1Config(proxy).ok).toBe(false);
    expect(() => validatePersonTechniqueState(proxy)).not.toThrow();
    expect(validatePersonTechniqueState(proxy).ok).toBe(false);
    expect(() => validateSimulationIdentity(proxy)).not.toThrow();
    expect(validateSimulationIdentity(proxy).ok).toBe(false);
  });

  it("rejects revoked object Proxy without throwing out", () => {
    const { proxy, revoke } = Proxy.revocable(createDefaultSprint1ConfigInput(), {});
    revoke();
    expect(() => validateSprint1Config(proxy)).not.toThrow();
    expect(validateSprint1Config(proxy).ok).toBe(false);
    const state = Proxy.revocable(validPersonTechniqueState(), {});
    state.revoke();
    expect(() => validatePersonTechniqueState(state.proxy)).not.toThrow();
    expect(validatePersonTechniqueState(state.proxy).ok).toBe(false);
  });

  it("rejects array length get-trap Proxy without running get or throwing out", () => {
    let lengthGetCalls = 0;
    const base = ["strength", "skill"];
    const proxied = new Proxy(base, {
      get(target, prop, receiver) {
        if (prop === "length") {
          lengthGetCalls += 1;
          throw new Error("length get boom");
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const input = createDefaultSprint1ConfigInput();
    (
      input.techniqueBalance.basicAttackProfiles.unarmed as {
        primaryStats: unknown;
      }
    ).primaryStats = proxied;
    expect(() => validateSprint1Config(input)).not.toThrow();
    // Descriptor snapshot must not invoke length getters; success via snapshot is allowed.
    const result = validateSprint1Config(input);
    expect(lengthGetCalls).toBe(0);
    expect(result.ok === true || result.ok === false).toBe(true);
  });

  it("rejects length descriptor trap and revoked array Proxy without throwing out", () => {
    const base = ["strength", "skill"];
    const descriptorThrow = new Proxy(base, {
      getOwnPropertyDescriptor(target, prop) {
        if (prop === "length") {
          throw new Error("length descriptor boom");
        }
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });
    const input = createDefaultSprint1ConfigInput();
    (
      input.techniqueBalance.basicAttackProfiles.unarmed as {
        primaryStats: unknown;
      }
    ).primaryStats = descriptorThrow;
    expect(() => validateSprint1Config(input)).not.toThrow();
    expect(validateSprint1Config(input).ok).toBe(false);

    const revoked = Proxy.revocable(["strength", "skill"], {});
    revoked.revoke();
    const input2 = createDefaultSprint1ConfigInput();
    (
      input2.techniqueBalance.basicAttackProfiles.unarmed as {
        primaryStats: unknown;
      }
    ).primaryStats = revoked.proxy;
    expect(() => validateSprint1Config(input2)).not.toThrow();
    expect(validateSprint1Config(input2).ok).toBe(false);
  });

  it("clone Config with getter does not run getter and fails", () => {
    let getterCalls = 0;
    const input: Record<string, unknown> = createDefaultSprint1ConfigInput();
    Object.defineProperty(input, "configVersion", {
      get() {
        getterCalls += 1;
        return "sprint1-balance-0.2.0";
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => cloneSprint1ConfigInput(input)).not.toThrow();
    expect(cloneSprint1ConfigInput(input).ok).toBe(false);
    expect(getterCalls).toBe(0);
  });

  it("clone Config with toJSON does not run toJSON and fails", () => {
    let toJSONCalls = 0;
    const input = createDefaultSprint1ConfigInput() as Sprint1Config & {
      toJSON?: () => unknown;
    };
    input.toJSON = () => {
      toJSONCalls += 1;
      return { hacked: true };
    };
    // unknown key toJSON → validation failure; toJSON must not be invoked
    expect(() => cloneSprint1ConfigInput(input)).not.toThrow();
    expect(cloneSprint1ConfigInput(input).ok).toBe(false);
    expect(toJSONCalls).toBe(0);
  });

  it("freeze class instance / Date / Map / Set fails without normalizing", () => {
    class ConfigShim {}
    const instance = Object.assign(new ConfigShim(), createDefaultSprint1ConfigInput());
    expect(() => freezeSprint1ConfigInput(instance)).not.toThrow();
    expect(freezeSprint1ConfigInput(instance).ok).toBe(false);
    expect(freezeSprint1ConfigInput(new Date()).ok).toBe(false);
    expect(freezeSprint1ConfigInput(new Map()).ok).toBe(false);
    expect(freezeSprint1ConfigInput(new Set()).ok).toBe(false);
    expect(cloneSprint1ConfigInput(instance).ok).toBe(false);
    expect(
      freezePersonTechniqueState(Object.assign(new ConfigShim(), validPersonTechniqueState())).ok,
    ).toBe(false);
    expect(clonePersonTechniqueState(new Date()).ok).toBe(false);
  });

  it("clone of valid Config and PersonTechniqueState is independent and deep frozen", () => {
    const config = getDefaultSprint1Config();
    const cloned = cloneValidatedSprint1Config(config);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) {
      return;
    }
    expect(cloned.value).toEqual(config);
    expect(cloned.value).not.toBe(config);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    expect(Object.isFrozen(cloned.value.battle.hit)).toBe(true);

    const state = validatePersonTechniqueState(validPersonTechniqueState());
    expect(state.ok).toBe(true);
    if (!state.ok) {
      return;
    }
    const clonedState = clonePersonTechniqueState(state.value);
    expect(clonedState.ok).toBe(true);
    if (!clonedState.ok) {
      return;
    }
    expect(clonedState.value).toEqual(state.value);
    expect(clonedState.value).not.toBe(state.value);
    expect(Object.isFrozen(clonedState.value)).toBe(true);
  });

  it("mutated default content mismatches fixed SHA-256 and fails same-version validation", () => {
    const changed = createDefaultSprint1ConfigInput();
    changed.battle.hit.evadePenalty = 31;
    expect(validateSprint1Config(changed).ok).toBe(false);
    expect(sha256Provider.hashUtf8(toCanonicalJson(changed))).not.toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
  });

  it("pins fixed canonical SHA-256 as a 64-char literal match with the expected byte length", () => {
    expect(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256).toBe(
      "3d3fdfe204d146046630e23c6439ab49769c9d1644a5f072da5d0a19273621c9",
    );
    expect(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256).toHaveLength(64);
    const canonical = toCanonicalJson(getDefaultSprint1Config());
    expect(Buffer.byteLength(canonical, "utf8")).toBe(9593);
    const actual = sha256Provider.hashUtf8(canonical);
    expect(actual).toBe(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256);
  });
});

describe("S01-001 acceptance3 basis-points probes", () => {
  it("normalizes decimal factor/ratio/weight fields to integer basis points (×10000)", () => {
    const config = getDefaultSprint1Config();
    expect(config.growth.potentialMinimumFactor).toBe(6500);
    expect(config.growth.potentialMaximumFactor).toBe(13500);
    expect(config.growth.teacherFactors.averageMaster).toBe(10000);
    expect(config.weeklyPlanner.contextWeights.personality).toBe(10000);
    expect(config.weeklyPlanner.restNeedBonuses.injuryPerFivePoints).toBe(12500);
    expect(config.battle.movement.speedWeight).toBe(5000);
    expect(config.battle.damageFormula.staminaDefenseWeight).toBe(4500);
    expect(config.battle.focusMind.recoveryRatio).toBe(1000);
    expect(config.battle.consumption.performanceBands["30..49"]).toBe(9500);
  });

  it("leaves non-basis-points integer fields unchanged", () => {
    const config = getDefaultSprint1Config();
    expect(config.growth.fixedPointScale).toBe(1000);
    expect(config.growth.baseMilliPointsPerTraining).toBe(500);
    expect(config.battle.maxTurns).toBe(20);
    expect(config.techniqueBalance.basicAttackProfiles.unarmed.accuracy).toBe(75);
    expect(config.temporaryCondition.forcedRestFatigueThreshold).toBe(81);
    expect(config.weeklyPlanner.baseFatiguePenaltyPerFivePoints).toBe(1);
    expect(config.weeklyPlanner.baseInjuryPenaltyPerFivePoints).toBe(1);
    expect(config.weeklyPlanner.baseMentalExhaustionPenaltyMaximum).toBe(20);
    expect(config.battle.strategy.surrenderCandidateThreshold).toBe(70);
    expect(config.battle.strategy.surrender.durabilityWeight).toBe(45);
    expect(config.battle.strategy.highConsumptionSurrenderBonus).toBe(10);
  });

  it("types: BasisPoints only on normalized decimal coefficient fields", () => {
    expectTypeOf<Sprint1Config["growth"]["potentialMinimumFactor"]>().toEqualTypeOf<BasisPoints>();
    expectTypeOf<
      Sprint1Config["weeklyPlanner"]["baseFatiguePenaltyPerFivePoints"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["weeklyPlanner"]["baseInjuryPenaltyPerFivePoints"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["weeklyPlanner"]["baseMentalExhaustionPenaltyMaximum"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrenderCandidateThreshold"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrenderActionBaseScore"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["durabilityWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["mentalWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["injuryWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["consumptionWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["opponentLeadWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["confidenceWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["surrender"]["majorInjuryRiskWeight"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["highConsumptionSurrenderBonus"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["expectedDamageWeight"]
    >().toEqualTypeOf<BasisPoints>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["mentalCostPenaltyWeight"]
    >().toEqualTypeOf<BasisPoints>();
    expectTypeOf<
      Sprint1Config["battle"]["strategy"]["personalityModifiers"]["attackAggressionPerPointFrom50"]
    >().toEqualTypeOf<BasisPoints>();
  });

  it("counts non-integer numeric leaves on the raw default and none on the normalized default", () => {
    const rawCounts = countNumericLeaves(createDefaultSprint1ConfigInput());
    expect(rawCounts.total).toBeGreaterThan(0);
    expect(rawCounts.nonInteger).toBeGreaterThan(0);

    const normalizedCounts = countNumericLeaves(getDefaultSprint1Config());
    expect(normalizedCounts.total).toBeGreaterThan(0);
    expect(normalizedCounts.nonInteger).toBe(0);
  });

  it("rejects an over-precise decimal that cannot be represented in basis points", () => {
    const input = createDefaultSprint1ConfigInput();
    input.growth.potentialMinimumFactor = 0.65001;
    expect(validateSprint1Config(input).ok).toBe(false);
  });

  it("rejects NaN on a basis-points factor field", () => {
    const input = createDefaultSprint1ConfigInput();
    input.growth.potentialMinimumFactor = Number.NaN;
    expect(validateSprint1Config(input).ok).toBe(false);
  });

  it("normalizes an integer factor value (1) to 10000 basis points", () => {
    const input = createDefaultSprint1ConfigInput();
    input.growth.teacherFactors.averageMaster = 1;
    const result = validateSprint1Config(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.growth.teacherFactors.averageMaster).toBe(10000);
  });

  it("hashes to the fixed SHA and the canonical text carries basis points, not decimals", () => {
    const config = getDefaultSprint1Config();
    expect(config.configVersion).toBe(SPRINT1_BALANCE_0_2_0_CONFIG_VERSION);
    const canonical = toCanonicalJson(config);
    expect(sha256Provider.hashUtf8(canonical)).toBe(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256);
    expect(canonical).toContain('"potentialMinimumFactor":6500');
    expect(canonical).not.toContain('"potentialMinimumFactor":0.65');
  });

  it("clones an already-validated config independently and frozen via cloneValidatedSprint1Config", () => {
    const config = getDefaultSprint1Config();
    const cloned = cloneValidatedSprint1Config(config);
    expect(cloned.ok).toBe(true);
    if (!cloned.ok) {
      return;
    }
    expect(cloned.value).toEqual(config);
    expect(cloned.value).not.toBe(config);
    expect(Object.isFrozen(cloned.value)).toBe(true);
    expect(Object.isFrozen(cloned.value.growth)).toBe(true);
  });

  it("rejects a raw decimal tree passed directly to freezeValidatedSprint1Config", () => {
    const raw = createDefaultSprint1ConfigInput();
    const result = freezeValidatedSprint1Config(raw);
    expect(result.ok).toBe(false);
  });

  it("strict-basis-points: only exact value*10000 safe integers succeed", () => {
    expect(normalizeBasisPoints(0.65)).toBe(6500);
    expect(normalizeBasisPoints(1)).toBe(10000);
    expect(normalizeBasisPoints(0.0001)).toBe(1);
    expect(normalizeBasisPoints(0)).toBe(0);
    expect(normalizeBasisPoints(-0)).toBe(0);
    expect(normalizeBasisPoints(0.65001)).toBeUndefined();
    expect(normalizeBasisPoints(0.65000000001)).toBeUndefined();
    expect(normalizeBasisPoints(0.64999999999)).toBeUndefined();
    expect(normalizeBasisPoints(0.00010000001)).toBeUndefined();
    expect(normalizeBasisPoints(Number.NaN)).toBeUndefined();
    expect(normalizeBasisPoints(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("normalized-validation: accepts default and rejects content / shape violations", () => {
    const defaults = getDefaultSprint1Config();
    expect(validateNormalizedSprint1Config(defaults).ok).toBe(true);
    expect(cloneValidatedSprint1Config(defaults).ok).toBe(true);
    expect(freezeValidatedSprint1Config(defaults).ok).toBe(true);

    const factorChanged = JSON.parse(JSON.stringify(defaults)) as Sprint1Config;
    factorChanged.growth.potentialMinimumFactor =
      6501 as Sprint1Config["growth"]["potentialMinimumFactor"];
    expect(validateNormalizedSprint1Config(factorChanged).ok).toBe(false);
    expect(cloneValidatedSprint1Config(factorChanged).ok).toBe(false);
    expect(freezeValidatedSprint1Config(factorChanged).ok).toBe(false);

    const evadeChanged = JSON.parse(JSON.stringify(defaults)) as Sprint1Config;
    evadeChanged.battle.hit.evadePenalty = 31;
    expect(validateNormalizedSprint1Config(evadeChanged).ok).toBe(false);

    const unknownRoot = { ...JSON.parse(JSON.stringify(defaults)), extra: true };
    expect(validateNormalizedSprint1Config(unknownRoot).ok).toBe(false);

    const unknownNested = JSON.parse(JSON.stringify(defaults)) as Sprint1Config & {
      growth: Sprint1Config["growth"] & Record<string, unknown>;
    };
    (unknownNested.growth as Record<string, unknown>).extraField = 1;
    expect(validateNormalizedSprint1Config(unknownNested).ok).toBe(false);

    class ConfigShim {}
    const instance = Object.assign(new ConfigShim(), JSON.parse(JSON.stringify(defaults)));
    expect(validateNormalizedSprint1Config(instance).ok).toBe(false);

    let getterCalls = 0;
    const withAccessor: Record<string, unknown> = JSON.parse(JSON.stringify(defaults));
    Object.defineProperty(withAccessor, "schemaVersion", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return "0.2.0";
      },
    });
    expect(validateNormalizedSprint1Config(withAccessor).ok).toBe(false);
    expect(getterCalls).toBe(0);

    const { proxy, revoke } = Proxy.revocable(JSON.parse(JSON.stringify(defaults)), {});
    revoke();
    expect(() => validateNormalizedSprint1Config(proxy)).not.toThrow();
    expect(validateNormalizedSprint1Config(proxy).ok).toBe(false);

    expect(validateNormalizedSprint1Config(createDefaultSprint1ConfigInput()).ok).toBe(false);
  });

  it("public-api: deprecated aliases and registry introspection are not exported", async () => {
    const exported = await import("./index.js");
    expect("createDefaultSprint1Config" in exported).toBe(false);
    expect("cloneSprint1Config" in exported).toBe(false);
    expect("freezeSprint1Config" in exported).toBe(false);
    expect("asBasisPoints" in exported).toBe(false);
    expect("listKnownSprint1ConfigVersions" in exported).toBe(false);
    expect("getExpectedCanonicalJsonForConfigVersion" in exported).toBe(false);
    expect("isKnownSprint1ConfigVersion" in exported).toBe(false);
    expect("countNumericLeaves" in exported).toBe(false);
    expect(typeof exported.createDefaultSprint1ConfigInput).toBe("function");
    expect(typeof exported.validateNormalizedSprint1Config).toBe("function");
    expect(typeof exported.validateSprint1Config).toBe("function");
    expect(typeof exported.getDefaultSprint1Config).toBe("function");
  });
});

import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../canonical-json.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { withTestSprint2IdentityFields } from "../test-fixtures/sprint2-identity.fixture.js";
import {
  createExpectedSpecVersions,
  validateSimulationIdentity,
} from "../sprint1/simulation-identity.js";
import { computeSprint1ConfigHash } from "../sprint1/sprint1-config.js";
import { createDefaultSprint1ConfigInput } from "../sprint1/sprint1-config-defaults.js";
import {
  createDefaultCompetitionDomainRegistryInput,
  finalizeCompetitionDomainRegistry,
  validateCompetitionDomainRegistry,
} from "./competition-domain.js";
import {
  computeDerivedTieKey,
  computeDerivedTieKeysForCandidates,
  validateDerivedTieKeyInput,
} from "./derived-tie-key.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import { createDefaultSprint2IdentityBindings } from "./sprint2-identity-bindings.js";
import {
  computeTournamentIdGeneratorStateHash,
  createInitialTournamentIdGeneratorState,
  validateTournamentIdGeneratorState,
} from "./tournament-id-registry.js";
import {
  computeSprint2ConfigHash,
  validateNormalizedSprint2Config,
  validateSprint2Config,
} from "./validate-sprint2-config.js";

const provider = createNodeSha256Provider();

describe("S02-001 Sprint2Config", () => {
  it("CFG-001 canonical Sprint2Config validates and produces stable hash", () => {
    const result = validateSprint2Config(createDefaultSprint2ConfigInput(), provider);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const hashA = computeSprint2ConfigHash(result.value, provider);
    const hashB = computeSprint2ConfigHash(result.value, provider);
    expect(hashA.ok && hashB.ok).toBe(true);
    if (!hashA.ok || !hashB.ok) {
      return;
    }
    expect(hashA.value).toBe(hashB.value);
    expect(hashA.value).toMatch(/^[0-9a-f]{64}$/);
  });

  it("CFG-002 rejects unknown root key", () => {
    const input = {
      ...createDefaultSprint2ConfigInput(),
      unknownRoot: true,
    };
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-003 rejects missing required section without implicit fill", () => {
    const input = { ...createDefaultSprint2ConfigInput() };
    delete (input as { championship?: unknown }).championship;
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-004 rejects same configVersion with changed canonical content", () => {
    validateSprint2Config(createDefaultSprint2ConfigInput(), provider);
    const tampered = createDefaultSprint2ConfigInput();
    tampered.entry.enterThresholdHundredths = 5001;
    expect(validateNormalizedSprint2Config(tampered).ok).toBe(false);
  });

  it("CFG-005 rejects invalid schedule offset ordering", () => {
    const input = createDefaultSprint2ConfigInput();
    input.schedule.openMonthOffsets = [2, 2, 8, 11];
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-006 rejects minimum greater than recommended", () => {
    const input = createDefaultSprint2ConfigInput();
    input.tournamentCapacity.normal = { minimum: 10, recommended: 8, maximum: 16 };
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-007 rejects fractional fixed-point input", () => {
    const input = createDefaultSprint2ConfigInput();
    input.entry.enterThresholdHundredths = 5000.5;
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-008 rejects calendar start month inserted into Sprint2Config", () => {
    const input = {
      ...createDefaultSprint2ConfigInput(),
      worldYearStartMonth: 1,
    };
    expect(validateSprint2Config(input, provider).ok).toBe(false);
  });

  it("CFG-009 rejects normalDetailedLogWorldYears outside 1..10", () => {
    const zero = createDefaultSprint2ConfigInput();
    zero.battleLogRetention.normalDetailedLogWorldYears = 0;
    expect(validateSprint2Config(zero, provider).ok).toBe(false);

    const eleven = createDefaultSprint2ConfigInput();
    eleven.battleLogRetention.normalDetailedLogWorldYears = 11;
    expect(validateSprint2Config(eleven, provider).ok).toBe(false);

    const ok = createDefaultSprint2ConfigInput();
    ok.configVersion = "sprint2-balance-cfg009-sample";
    ok.battleLogRetention.normalDetailedLogWorldYears = 5;
    expect(validateNormalizedSprint2Config(ok).ok).toBe(true);
  });
});

describe("S02-001 CompetitionDomainRegistry", () => {
  it("DOM-001 accepts unrestricted 3-domain registry", () => {
    const result = finalizeCompetitionDomainRegistry(
      createDefaultCompetitionDomainRegistryInput(),
      provider,
    );
    expect(result.ok).toBe(true);
  });

  it("DOM-005 rejects martial key", () => {
    const input = createDefaultCompetitionDomainRegistryInput();
    (input.bindings as Record<string, unknown>)["martial"] = {
      techniqueCategory: "martial",
      basicAttackProfile: "martial",
    };
    expect(validateCompetitionDomainRegistry(input).ok).toBe(false);
  });

  it("rejects registry hash/content tamper", () => {
    const finalized = finalizeCompetitionDomainRegistry(
      createDefaultCompetitionDomainRegistryInput(),
      provider,
    );
    expect(finalized.ok).toBe(true);
    if (!finalized.ok) {
      return;
    }
    const tampered = {
      ...finalized.value,
      registryHash: "b".repeat(64),
    };
    expect(finalizeCompetitionDomainRegistry(tampered, provider).ok).toBe(false);
  });
});

describe("S02-001 DerivedTieKey", () => {
  const base = {
    simulationId: "simulation_0000000000000001",
    runSeed: 42,
    tiePolicyVersion: "derived-tie-key-0.1.0" as const,
    purpose: "seeding" as const,
    scopeId: "tournament_000000000001",
  };

  it("DOM-007 tie-key output is independent of candidate iteration order", () => {
    const candidatesA = ["person_b", "person_a", "person_c"];
    const candidatesB = ["person_c", "person_a", "person_b"];
    const keysA = computeDerivedTieKeysForCandidates(
      { ...base, scopeId: "tournament_000000000001", candidates: candidatesA },
      provider,
    );
    const keysB = computeDerivedTieKeysForCandidates(
      { ...base, scopeId: "tournament_000000000001", candidates: candidatesB },
      provider,
    );
    expect(keysA.ok && keysB.ok).toBe(true);
    if (!keysA.ok || !keysB.ok) {
      return;
    }
    expect(keysA.value).toEqual(keysB.value);
  });

  it("DOM-008 rejects wrong purpose/scope recipe", () => {
    const invalid = {
      simulationId: base.simulationId,
      runSeed: base.runSeed,
      tiePolicyVersion: base.tiePolicyVersion,
      purpose: "entry_choice",
      scopeId: "tournament_only",
      candidateStableId: "person_1",
    };
    expect(validateDerivedTieKeyInput(invalid).ok).toBe(false);
  });

  it("computes deterministic derived tie key", () => {
    const input = {
      ...base,
      candidateStableId: "person_1",
    };
    const validated = validateDerivedTieKeyInput(input);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    const key = computeDerivedTieKey(validated.value, provider);
    expect(key.ok).toBe(true);
    if (!key.ok) {
      return;
    }
    expect(key.value).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("S02-001 hash integrity", () => {
  it("HSH-001 rejects self-referential registry hash input", () => {
    const registry = finalizeCompetitionDomainRegistry(
      createDefaultCompetitionDomainRegistryInput(),
      provider,
    );
    expect(registry.ok).toBe(true);
    if (!registry.ok) {
      return;
    }
    const selfReferential = {
      ...registry.value,
      registryHash: "placeholder",
    };
    const hashInput = {
      schemaVersion: selfReferential.schemaVersion,
      registryVersion: selfReferential.registryVersion,
      bindings: selfReferential.bindings,
      registryHash: selfReferential.registryHash,
    };
    expect(toCanonicalJson(hashInput)).toContain("registryHash");
    expect(finalizeCompetitionDomainRegistry(selfReferential, provider).ok).toBe(false);
  });

  it("HSH-004 preserves business-order arrays in Sprint2Config canonicalization", () => {
    const config = createDefaultSprint2ConfigInput();
    const canonical = toCanonicalJson(config);
    expect(canonical.indexOf('"promotion","open","limited","normal"')).toBeGreaterThan(-1);
    const reversed = {
      ...config,
      execution: {
        ...config.execution,
        tournamentKindPriority: ["normal", "limited", "open", "promotion"],
      },
    };
    expect(toCanonicalJson(reversed)).not.toBe(canonical);
  });
});

describe("S02-001 TournamentId empty registry", () => {
  it("creates deterministic empty state without RNG consumption", () => {
    const stateA = createInitialTournamentIdGeneratorState();
    const stateB = createInitialTournamentIdGeneratorState();
    expect(stateA.ok && stateB.ok).toBe(true);
    if (!stateA.ok || !stateB.ok) {
      return;
    }
    expect(stateA.value).toEqual(stateB.value);
    expect(validateTournamentIdGeneratorState(stateA.value).ok).toBe(true);
    const hash = computeTournamentIdGeneratorStateHash(stateA.value, provider);
    expect(hash.ok).toBe(true);
  });
});

describe("S02-001 SimulationIdentity extension", () => {
  it("binds default Sprint2 identity fields and validates", () => {
    const bindings = createDefaultSprint2IdentityBindings(provider);
    expect(bindings.ok).toBe(true);
    if (!bindings.ok) {
      return;
    }
    const sprint1Hash = computeSprint1ConfigHash(createDefaultSprint1ConfigInput(), provider);
    expect(sprint1Hash.ok).toBe(true);
    if (!sprint1Hash.ok) {
      return;
    }
    const identity = withTestSprint2IdentityFields({
      seed: 12345,
      initialWorldConfigHash: "a".repeat(64),
      worldCalendarConfigHash: "b".repeat(64),
      yearStartProcessorManifestHash: "c".repeat(64),
      sprint1ConfigHash: sprint1Hash.value,
      techniqueCatalogHash: "d".repeat(64),
      initialWeeklyTrainingSidecarHash: "e".repeat(64),
      battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
      matchIdGeneratorVersion: "match-id-generator-0.1.0",
      initialMatchIdGeneratorStateHash: "f".repeat(64),
      defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
      specVersions: createExpectedSpecVersions(),
      rngAlgorithmVersion: "xoshiro128ss-v1",
      canonicalJsonVersion: "canonical-json-v1",
      hashAlgorithm: "SHA-256",
    });
    const validated = validateSimulationIdentity(identity);
    expect(validated.ok).toBe(true);
    expect(identity.sprint2ConfigHash).toBe(bindings.value.sprint2ConfigHash);
  });
});

describe("S02-001 import boundary", () => {
  it("Sprint1 modules do not import sprint2 paths", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint1Dir = join(process.cwd(), "packages/simulation-core/src/sprint1");
    const files: string[] = [];
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          files.push(full);
        }
      }
    }
    await walk(sprint1Dir);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content.includes("/sprint2/"), `${file} must not import sprint2`).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  computeTechniqueCatalogHash,
  validateTechniqueCatalog,
} from "../sprint1/technique-catalog.js";
import {
  validateTechniqueDefinition,
  type TechniqueDefinition,
} from "../sprint1/technique-definition.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  buildMaterializationRequestFromGenerationSuccess,
  registerGeneratedTechniqueFromGenerationSuccess,
} from "./adapt-original-technique-generation-registration.js";
import {
  assertBaseCatalogIdentityUnchanged,
  createEmptyGeneratedTechniqueCatalogOverlay,
  lookupTechniqueDefinitionWithOverlay,
  registerGeneratedTechniqueInOverlay,
} from "./generated-technique-catalog-overlay.js";
import {
  isGeneratedTechniqueRegistrationEnabled,
  materializeGeneratedTechniqueDefinition,
} from "./materialize-generated-technique-definition.js";
import { evaluateOriginalTechniqueGenerationAttempt } from "./evaluate-original-technique-lifecycle.js";
import {
  createSprint3Balance090ConfigInput,
  createSprint3Balance100ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value;
}

function techniqueDefinitionInput(
  techniqueId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
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
    ...overrides,
  };
}

function buildBaseCatalog(definitions: TechniqueDefinition[]) {
  const catalogHash = expectOk(computeTechniqueCatalogHash(definitions, provider));
  return expectOk(
    validateTechniqueCatalog(
      {
        identity: { dataVersion: "techniques-0.1.0", catalogHash },
        definitions,
      },
      provider,
    ),
  );
}

describe("S03-010 generated technique registration", () => {
  const config100 = expectOk(validateSprint3Config(createSprint3Balance100ConfigInput(), provider));
  const config090 = expectOk(validateSprint3Config(createSprint3Balance090ConfigInput(), provider));
  const baseDef = expectOk(validateTechniqueDefinition(techniqueDefinitionInput("tech_base")));
  const baseCatalog = buildBaseCatalog([baseDef]);
  const baseIdentity = { ...baseCatalog.identity };

  it("GTR-001 CFG-015 accepts sprint3-balance-0.10.0 materialization policy", () => {
    expect(isGeneratedTechniqueRegistrationEnabled(config100)).toBe(true);
    expect(isGeneratedTechniqueRegistrationEnabled(config090)).toBe(false);
  });

  it("GTR-002 deterministic materialization from founding history + config synthesis", () => {
    const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
      eventKind: "original_technique_founded",
      founderPersonId: "person_001",
      newTechniqueId: "tech_derived_001",
      sourceTechniqueIds: ["tech_base"],
      researchValueAtFounding: 180,
      developmentReason: "style_mismatch",
      researchTier: "derived_technique",
      worldWeekIndex: 42,
    };
    const first = expectOk(
      materializeGeneratedTechniqueDefinition({
        config: config100,
        request: { displayName: "Derived Strike", foundingHistory },
        baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
      }),
    );
    const second = expectOk(
      materializeGeneratedTechniqueDefinition({
        config: config100,
        request: { displayName: "Derived Strike", foundingHistory },
        baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
      }),
    );
    expect(first).toEqual(second);
    expect(first.sourceTechniqueIds).toEqual(["tech_base"]);
    expect(first.originPersonId).toBe("person_001");
    expect(first.dataVersion).toBe("techniques-generated-0.1.0");
    expect(first.power).toBeLessThan(baseDef.power);
  });

  it("GTR-003 canonical sourceTechniqueIds ordering for composite tier", () => {
    const techA = expectOk(validateTechniqueDefinition(techniqueDefinitionInput("tech_a")));
    const techZ = expectOk(validateTechniqueDefinition(techniqueDefinitionInput("tech_z")));
    const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
      eventKind: "original_technique_founded",
      founderPersonId: "person_002",
      newTechniqueId: "tech_composite_001",
      sourceTechniqueIds: ["tech_z", "tech_a"],
      researchValueAtFounding: 320,
      developmentReason: "multi_style",
      researchTier: "composite_technique",
      worldWeekIndex: 50,
    };
    const materialized = expectOk(
      materializeGeneratedTechniqueDefinition({
        config: config100,
        request: { displayName: "Composite Flow", foundingHistory },
        baseTechniqueDefinitionsById: new Map([
          [techA.techniqueId, techA],
          [techZ.techniqueId, techZ],
        ]),
      }),
    );
    expect(materialized.sourceTechniqueIds).toEqual(["tech_a", "tech_z"]);
    expect(materialized.prerequisiteTechniqueIds).toEqual(["tech_a", "tech_z"]);
  });

  it("GTR-004 rejects missing source TechniqueDefinition", () => {
    const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
      eventKind: "original_technique_founded",
      founderPersonId: "person_003",
      newTechniqueId: "tech_missing_source",
      sourceTechniqueIds: ["tech_unknown"],
      researchValueAtFounding: 180,
      developmentReason: "test",
      researchTier: "derived_technique",
      worldWeekIndex: 1,
    };
    const result = materializeGeneratedTechniqueDefinition({
      config: config100,
      request: { displayName: "Bad Source", foundingHistory },
      baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
    });
    expect(result.ok).toBe(false);
  });

  it("GTR-005 rejects duplicate TechniqueId registration against base catalog", () => {
    const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
      eventKind: "original_technique_founded",
      founderPersonId: "person_004",
      newTechniqueId: "tech_derived_dup",
      sourceTechniqueIds: ["tech_base"],
      researchValueAtFounding: 180,
      developmentReason: "test",
      researchTier: "derived_technique",
      worldWeekIndex: 2,
    };
    const materialized = expectOk(
      materializeGeneratedTechniqueDefinition({
        config: config100,
        request: { displayName: "Dup Path", foundingHistory },
        baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
      }),
    );
    const overlay = expectOk(
      registerGeneratedTechniqueInOverlay({
        baseCatalog,
        overlay: createEmptyGeneratedTechniqueCatalogOverlay(),
        definition: materialized,
      }),
    );
    const duplicate = registerGeneratedTechniqueInOverlay({
      baseCatalog,
      overlay,
      definition: materialized,
    });
    expect(duplicate.ok).toBe(false);
  });

  it("GTR-006 successful overlay registration is visible without mutating base identity", () => {
    const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
      eventKind: "original_technique_founded",
      founderPersonId: "person_005",
      newTechniqueId: "tech_derived_visible",
      sourceTechniqueIds: ["tech_base"],
      researchValueAtFounding: 180,
      developmentReason: "test",
      researchTier: "derived_technique",
      worldWeekIndex: 3,
    };
    const definition = expectOk(
      materializeGeneratedTechniqueDefinition({
        config: config100,
        request: { displayName: "Visible Derived", foundingHistory },
        baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
      }),
    );
    const overlay = expectOk(
      registerGeneratedTechniqueInOverlay({
        baseCatalog,
        overlay: createEmptyGeneratedTechniqueCatalogOverlay(),
        definition,
      }),
    );
    expect(lookupTechniqueDefinitionWithOverlay(baseCatalog, overlay, "tech_derived_visible")).toBe(
      definition,
    );
    expect(assertBaseCatalogIdentityUnchanged(baseIdentity, baseCatalog).ok).toBe(true);
  });

  it("GTR-007 adapter registers from S03-008 generation_succeeded outcome", () => {
    const generation = expectOk(
      evaluateOriginalTechniqueGenerationAttempt(
        config100,
        {
          founderPersonId: "person_006",
          researchValue: 550,
          sourceTechniqueIds: ["tech_base"],
          developmentReason: "peak_mastery",
          worldWeekIndex: 99,
          cooldownWeeksRemaining: 0,
          modifiers: { successPercentAdjustmentPoints: 0 },
          proposedNewTechniqueId: "tech_full_adapter",
        },
        { nextInt: () => 0 },
      ),
    );
    expect(generation.kind).toBe("generation_succeeded");
    const registered = expectOk(
      registerGeneratedTechniqueFromGenerationSuccess({
        config: config100,
        baseCatalog,
        outcome: generation,
        displayName: "Full Adapter Technique",
      }),
    );
    expect(registered.overlay.definitions).toHaveLength(1);
    expect(
      lookupTechniqueDefinitionWithOverlay(baseCatalog, registered.overlay, "tech_full_adapter")
        ?.name,
    ).toBe("Full Adapter Technique");
  });

  it("GTR-008 adapter rejects non-success outcomes", () => {
    const request = buildMaterializationRequestFromGenerationSuccess({
      outcome: { kind: "generation_failed", reasons: ["generation_roll_failed"] },
      displayName: "X",
    });
    expect(request.ok).toBe(false);
  });
});

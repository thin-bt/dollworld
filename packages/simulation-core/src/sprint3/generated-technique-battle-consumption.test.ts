import { describe, expect, it } from "vitest";
import {
  asTechniqueId,
  computeTechniqueCatalogHash,
  normalizeBasisPoints,
  replaceIllegalBattleAction,
  validateTechniqueCatalog,
  validateTechniqueDefinition,
  type TechniqueDefinition,
} from "../index.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  assertBaseCatalogIdentityUnchanged,
  createEmptyGeneratedTechniqueCatalogOverlay,
  registerGeneratedTechniqueInOverlay,
  validateGeneratedTechniqueCatalogOverlay,
} from "./generated-technique-catalog-overlay.js";
import {
  buildBattleTechniqueDefinitionCatalogMap,
  collectKnownTechniqueIdsForBattle,
} from "./generated-technique-battle-catalog.js";
import {
  createSprint3Balance100ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import { materializeGeneratedTechniqueDefinition } from "./materialize-generated-technique-definition.js";
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

describe("S03-015 generated technique battle consumption", () => {
  const config100 = expectOk(validateSprint3Config(createSprint3Balance100ConfigInput(), provider));
  const baseDef = expectOk(validateTechniqueDefinition(techniqueDefinitionInput("tech_base")));
  const baseCatalog = buildBaseCatalog([baseDef]);
  const baseIdentity = { ...baseCatalog.identity };

  const foundingHistory: OriginalTechniqueFoundingHistoryRecord = {
    eventKind: "original_technique_founded",
    founderPersonId: "person_001",
    newTechniqueId: "tech_derived_battle",
    sourceTechniqueIds: ["tech_base"],
    researchValueAtFounding: 180,
    developmentReason: "style_mismatch",
    researchTier: "derived_technique",
    worldWeekIndex: 42,
  };

  const generatedDef = expectOk(
    materializeGeneratedTechniqueDefinition({
      config: config100,
      request: { displayName: "Derived Battle Strike", foundingHistory },
      baseTechniqueDefinitionsById: new Map([[baseDef.techniqueId, baseDef]]),
    }),
  );

  const overlay = expectOk(
    registerGeneratedTechniqueInOverlay({
      baseCatalog,
      overlay: createEmptyGeneratedTechniqueCatalogOverlay(),
      definition: generatedDef,
    }),
  );

  it("GBC-001 base catalog map unchanged when overlay is absent", () => {
    const catalog = buildBattleTechniqueDefinitionCatalogMap(baseCatalog.definitions);
    expect(catalog.size).toBe(1);
    expect(catalog.get("tech_base")).toStrictEqual(baseDef);
    expect(catalog.has("tech_derived_battle")).toBe(false);
  });

  it("GBC-002 generated technique resolves on production replaceIllegalBattleAction path", () => {
    const catalog = buildBattleTechniqueDefinitionCatalogMap(baseCatalog.definitions, overlay);
    expect(catalog.get("tech_derived_battle")?.techniqueId).toBe("tech_derived_battle");

    const stat = (value: number) => ({ surfaceValue: value, effectiveValue: value, modifiers: [] });
    const actor = {
      personId: "person_a" as const,
      techniques: [
        {
          techniqueId: asTechniqueId("tech_derived_battle"),
          acquiredAbsoluteWeek: 1,
          masteryPercent: 100,
          learningProgress: 100,
        },
      ],
      stats: {
        strength: stat(50),
        skill: stat(50),
        speed: stat(50),
        toughness: stat(50),
        mental: stat(50),
      },
      aptitudes: {
        unarmed: stat(50),
        sword: stat(0),
        spear: stat(0),
        archery: stat(0),
        magic: stat(0),
      },
      canAct: true,
    } as const;

    const replaced = expectOk(
      replaceIllegalBattleAction(
        { kind: "use_technique", techniqueId: asTechniqueId("tech_derived_battle") },
        {
          actor: actor as never,
          range: "contact",
          catalogById: catalog,
          maximumMasteryReductionRatioBp: normalizeBasisPoints(0)!,
        },
      ),
    );
    expect(replaced.replacementReason).not.toBe("unknown_technique");
    expect(replaced.replacementReason).not.toBe("unlearned_technique");
  });

  it("GBC-003 unknown generated id still yields unknown_technique without overlay", () => {
    const catalog = buildBattleTechniqueDefinitionCatalogMap(baseCatalog.definitions);
    const actor = {
      personId: "person_a" as const,
      techniques: [
        {
          techniqueId: asTechniqueId("tech_derived_battle"),
          acquiredAbsoluteWeek: 1,
          masteryPercent: 100,
          learningProgress: 100,
        },
      ],
      stats: { strength: 50, skill: 50, speed: 50, toughness: 50, mental: 50 },
      aptitudes: { unarmed: 50, sword: 0, spear: 0, archery: 0, magic: 0 },
      canAct: true,
    } as const;

    const replaced = expectOk(
      replaceIllegalBattleAction(
        { kind: "use_technique", techniqueId: asTechniqueId("tech_derived_battle") },
        {
          actor: actor as never,
          range: "contact",
          catalogById: catalog,
          maximumMasteryReductionRatioBp: normalizeBasisPoints(0)!,
        },
      ),
    );
    expect(replaced.replacementReason).toBe("unknown_technique");
  });

  it("GBC-004 overlay registration leaves base TechniqueCatalogIdentity unchanged", () => {
    expect(assertBaseCatalogIdentityUnchanged(baseIdentity, baseCatalog).ok).toBe(true);
  });

  it("GBC-005 collectKnownTechniqueIdsForBattle merges overlay ids for create-battle preflight", () => {
    const withoutOverlay = collectKnownTechniqueIdsForBattle(baseCatalog.definitions);
    expect(withoutOverlay.has("tech_derived_battle")).toBe(false);

    const withOverlay = collectKnownTechniqueIdsForBattle(baseCatalog.definitions, overlay);
    expect(withOverlay.has("tech_base")).toBe(true);
    expect(withOverlay.has("tech_derived_battle")).toBe(true);
  });

  it("GBC-006 validateGeneratedTechniqueCatalogOverlay roundtrips overlay definitions", () => {
    const validated = validateGeneratedTechniqueCatalogOverlay(overlay);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.value.definitions[0]?.techniqueId).toBe("tech_derived_battle");
    }
  });
});

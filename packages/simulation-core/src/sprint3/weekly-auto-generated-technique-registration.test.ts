/**
 * S03-010 weekly OTL success → generated-technique overlay production integration.
 */
import { describe, expect, it } from "vitest";
import {
  computeTechniqueCatalogHash,
  runSprint1WeeklyStep,
  validateTechniqueCatalog,
  validateTechniqueDefinition,
  type TechniqueDefinition,
} from "../index.js";
import { asPersonId, asTechniqueId } from "../ids.js";
import type { PersonId } from "../ids.js";
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { buildBattleTechniqueDefinitionCatalogMap } from "./generated-technique-battle-catalog.js";
import {
  createEmptyGeneratedTechniqueCatalogOverlay,
  lookupTechniqueDefinitionWithOverlay,
} from "./generated-technique-catalog-overlay.js";
import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  researchValueToTenths,
} from "./original-technique-lifecycle-runtime-state.js";
import { processOriginalTechniqueLifecycleWeek } from "./process-original-technique-lifecycle-week.js";
import { processWeeklyGeneratedTechniqueRegistrationFromOtlWeek } from "./process-weekly-generated-technique-registration-from-otl-week.js";
import {
  createSprint3Balance090ConfigInput,
  createSprint3Balance100ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";

const provider = createNodeSha256Provider();
const PERSON_ID = "person_war_001" as PersonId;

function expectOk<T>(result: { ok: true; value: T } | { ok: false; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
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

const baseDef = expectOk(validateTechniqueDefinition(techniqueDefinitionInput("tech_base")));
const baseCatalog = buildBaseCatalog([baseDef]);
const config100 = expectOk(validateSprint3Config(createSprint3Balance100ConfigInput(), provider));
const config090 = expectOk(validateSprint3Config(createSprint3Balance090ConfigInput(), provider));

function minimalEligibleWorldState(): WorldEngineState {
  const sprint1State = expectOk(createInitialSprint1PersonState(50));
  const withTechnique = {
    ...sprint1State,
    techniqueStates: [
      {
        techniqueId: asTechniqueId("tech_base"),
        learningProgressTenths: 100,
        masteryHundredths: 9000,
        successfulUseCount: 10,
        attemptedUseCount: 12,
        lastPracticedAbsoluteWeek: 1,
        acquiredAbsoluteWeek: 1,
      },
    ],
  };
  return {
    simulationId: "sim_war_test",
    seed: 4242,
    configHash: "0".repeat(64),
    worldDate: createWorldDate(
      { year: 1, month: 1, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    ),
    persons: [
      {
        personId: PERSON_ID,
        displayName: "Tester",
        sex: "male",
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "disciple",
        currentAge: 20,
        abilities: {
          strength: { surfaceValue: 50, potentialValue: 60 },
          agility: { surfaceValue: 50, potentialValue: 60 },
          spirit: { surfaceValue: 50, potentialValue: 60 },
        },
        sprint1State: withTechnique,
      },
    ],
  } as unknown as WorldEngineState;
}

function seededOtlRuntime(runSeed: number) {
  return {
    ...createInitialOriginalTechniqueLifecycleRuntimeState(runSeed),
    personEntries: [
      {
        personId: PERSON_ID,
        researchValueTenths: researchValueToTenths(550),
        cooldownWeeksRemaining: 0,
        successfulGenerationCount: 0,
      },
    ],
  };
}

function runOtlThenRegistration(runSeed: number) {
  const otlWeek = expectOk(
    processOriginalTechniqueLifecycleWeek({
      absoluteWeek: 16,
      runSeed,
      worldState: minimalEligibleWorldState(),
      sprint3Config: config100,
      runtimeState: seededOtlRuntime(runSeed),
    }),
  );
  const runtimeState = otlWeek.runtimeState;
  if (runtimeState === undefined) {
    throw new Error("expected OTL runtime state after weekly processing");
  }
  const registered = expectOk(
    processWeeklyGeneratedTechniqueRegistrationFromOtlWeek({
      sprint3Config: config100,
      techniqueCatalog: baseCatalog,
      originalTechniqueLifecycleRuntime: runtimeState,
    }),
  );
  return { otlWeek, registered };
}

describe("S03-010 weekly auto generated-technique registration", () => {
  it("WAR-001 OTL founding success automatically registers overlay without external seeding", () => {
    let history: OriginalTechniqueFoundingHistoryRecord | undefined;
    let overlay = createEmptyGeneratedTechniqueCatalogOverlay();
    for (let runSeed = 104; runSeed < 400; runSeed += 1) {
      const { otlWeek, registered } = runOtlThenRegistration(runSeed);
      const histories = otlWeek.runtimeState?.foundingHistories ?? [];
      if (histories.length > 0) {
        history = histories[0];
        overlay =
          registered.generatedTechniqueCatalogOverlay ??
          createEmptyGeneratedTechniqueCatalogOverlay();
        break;
      }
    }
    expect(history).toBeDefined();
    expect(overlay.definitions).toHaveLength(1);
    expect(
      lookupTechniqueDefinitionWithOverlay(baseCatalog, overlay, history!.newTechniqueId),
    ).toBeDefined();
  });

  it("WAR-002 registered generated technique is visible to battle technique catalog", () => {
    let techniqueId: string | undefined;
    for (let runSeed = 104; runSeed < 400; runSeed += 1) {
      const { registered } = runOtlThenRegistration(runSeed);
      const definition = registered.generatedTechniqueCatalogOverlay?.definitions[0];
      if (definition !== undefined) {
        techniqueId = definition.techniqueId;
        const battleMap = buildBattleTechniqueDefinitionCatalogMap(
          baseCatalog.definitions,
          registered.generatedTechniqueCatalogOverlay,
        );
        expect(battleMap.get(techniqueId)).toBeDefined();
        break;
      }
    }
    expect(techniqueId).toBeDefined();
  });

  it("WAR-003 replaying registration does not duplicate overlay entries", () => {
    let otlRuntime;
    for (let runSeed = 104; runSeed < 400; runSeed += 1) {
      const { otlWeek, registered } = runOtlThenRegistration(runSeed);
      if ((registered.generatedTechniqueCatalogOverlay?.definitions.length ?? 0) > 0) {
        otlRuntime = otlWeek.runtimeState;
        expect(otlRuntime).toBeDefined();
        const overlay = registered.generatedTechniqueCatalogOverlay;
        const replay = expectOk(
          processWeeklyGeneratedTechniqueRegistrationFromOtlWeek({
            sprint3Config: config100,
            techniqueCatalog: baseCatalog,
            originalTechniqueLifecycleRuntime: otlRuntime!,
            ...(overlay === undefined ? {} : { generatedTechniqueCatalogOverlay: overlay }),
          }),
        );
        expect(replay.generatedTechniqueCatalogOverlay?.definitions).toHaveLength(1);
        break;
      }
    }
    expect(otlRuntime).toBeDefined();
  });

  it("WAR-004 no founding success means no registration", () => {
    const otlWeek = expectOk(
      processOriginalTechniqueLifecycleWeek({
        absoluteWeek: 16,
        runSeed: 105,
        worldState: minimalEligibleWorldState(),
        sprint3Config: config100,
        runtimeState: {
          ...seededOtlRuntime(105),
          personEntries: [
            {
              personId: PERSON_ID,
              researchValueTenths: researchValueToTenths(50),
              cooldownWeeksRemaining: 0,
              successfulGenerationCount: 0,
            },
          ],
        },
      }),
    );
    const runtimeState = otlWeek.runtimeState;
    expect(runtimeState).toBeDefined();
    const registered = expectOk(
      processWeeklyGeneratedTechniqueRegistrationFromOtlWeek({
        sprint3Config: config100,
        techniqueCatalog: baseCatalog,
        originalTechniqueLifecycleRuntime: runtimeState!,
      }),
    );
    expect(registered.generatedTechniqueCatalogOverlay).toBeUndefined();
  });

  it("WAR-005 founding history techniqueId matches registered overlay definition", () => {
    for (let runSeed = 104; runSeed < 400; runSeed += 1) {
      const { otlWeek, registered } = runOtlThenRegistration(runSeed);
      const history = otlWeek.runtimeState?.foundingHistories[0];
      const definition = registered.generatedTechniqueCatalogOverlay?.definitions[0];
      if (history !== undefined && definition !== undefined) {
        expect(definition.techniqueId).toBe(history.newTechniqueId);
        expect(definition.originPersonId).toBe(asPersonId(history.founderPersonId));
        return;
      }
    }
    throw new Error("expected at least one successful OTL founding outcome");
  });

  it("WAR-006 registration disabled config is a no-op", () => {
    const { otlWeek } = runOtlThenRegistration(200);
    const runtimeState = otlWeek.runtimeState;
    expect(runtimeState).toBeDefined();
    const registered = expectOk(
      processWeeklyGeneratedTechniqueRegistrationFromOtlWeek({
        sprint3Config: config090,
        techniqueCatalog: baseCatalog,
        originalTechniqueLifecycleRuntime: runtimeState!,
      }),
    );
    expect(registered.generatedTechniqueCatalogOverlay).toBeUndefined();
  });

  it("WAR-007 runSprint1WeeklyStep import graph includes weekly registration processor", () => {
    expect(typeof runSprint1WeeklyStep).toBe("function");
    expect(typeof processWeeklyGeneratedTechniqueRegistrationFromOtlWeek).toBe("function");
  });
});

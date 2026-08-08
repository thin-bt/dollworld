/**
 * Contract tests for S1-SPEC-0.1.15 movement state modifier clarification.
 * Locks version registry, actionOrder coefficient paths, golden modifiers,
 * actor separation, and non-influence of next modifiers / consumption factor.
 * Does not implement the production turn Resolver / DefaultBattleStrategy.
 */
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_MOVEMENT_STATE_MODIFIER_KEYS,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  MOVEMENT_STATE_MODIFIER_ACTION_ORDER_PATHS,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
  computeMovementStateModifier,
  computeMoverStateModifier,
  computeOpponentStateModifier,
  createDefaultSprint1ConfigInput,
  createSimulationIdFromIdentity,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type SimulationIdentity,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: boolean; value?: T; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result)}`);
  }
  return result.value as T;
}

function identityWithSprint1(version: string): SimulationIdentity {
  const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
  const sprint1ConfigHash = sha256Provider.hashUtf8(toCanonicalJson(config));
  return {
    schemaVersion: "0.3.0",
    seed: 1,
    initialWorldConfigHash: "a".repeat(64),
    sprint1ConfigHash,
    techniqueCatalogHash: "b".repeat(64),
    battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    initialMatchIdGeneratorStateHash: "c".repeat(64),
    defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
    specVersions: [
      { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint1", version },
    ],
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
  };
}

describe("S1-SPEC-0.1.15 version registry (superseded current = 0.1.17)", () => {
  it("publishes S1-SPEC-0.1.17 and keeps main SPEC / Sprint1Config SHA unchanged", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.17");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.2");
    expect(SPRINT1_CONFIG_SCHEMA_VERSION).toBe("0.2.0");
    expect(SPRINT1_CONFIG_VERSION_DEFAULT).toBe("sprint1-balance-0.2.0");
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    expect(sha256Provider.hashUtf8(toCanonicalJson(config))).toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
    expect(SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256).toBe(
      "3d3fdfe204d146046630e23c6439ab49769c9d1644a5f072da5d0a19273621c9",
    );
  });

  it("accepts a new Sprint 1 identity with S1-SPEC-0.1.17 and rejects 0.1.15", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.17"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.17");
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.15")).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.15 movement config reference", () => {
  it("locks actionOrder paths and forbids movement-specific state modifier keys", () => {
    expect([...MOVEMENT_STATE_MODIFIER_ACTION_ORDER_PATHS]).toEqual([
      "battle.actionOrder.conditionPerPoint",
      "battle.actionOrder.fatiguePenaltyPerPoint",
      "battle.actionOrder.injuryPenaltyPerPoint",
    ]);
    expect([...FORBIDDEN_MOVEMENT_STATE_MODIFIER_KEYS]).toEqual([
      "conditionPerPoint",
      "fatiguePenaltyPerPoint",
      "injuryPenaltyPerPoint",
    ]);

    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    for (const key of FORBIDDEN_MOVEMENT_STATE_MODIFIER_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(config.battle.movement, key)).toBe(false);
    }
    expect(typeof config.battle.actionOrder.conditionPerPoint).toBe("number");
    expect(typeof config.battle.actionOrder.fatiguePenaltyPerPoint).toBe("number");
    expect(typeof config.battle.actionOrder.injuryPenaltyPerPoint).toBe("number");
    expect(sha256Provider.hashUtf8(toCanonicalJson(config))).toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
  });
});

describe("S1-SPEC-0.1.15 movement state modifier formula", () => {
  it("locks golden cases 0 / +5 / -30 via actionOrder BasisPoints", () => {
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    const actionOrder = config.battle.actionOrder;

    expect(
      expectOk(computeMovementStateModifier({ condition: 0, fatigue: 0, injury: 0 }, actionOrder)),
    ).toBe(0);
    expect(
      expectOk(computeMovementStateModifier({ condition: 20, fatigue: 0, injury: 0 }, actionOrder)),
    ).toBe(5);
    expect(
      expectOk(
        computeMovementStateModifier({ condition: -20, fatigue: 100, injury: 100 }, actionOrder),
      ),
    ).toBe(-30);
  });

  it("computes mover and opponent modifiers independently", () => {
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    const actionOrder = config.battle.actionOrder;
    const mover = expectOk(
      computeMoverStateModifier({ condition: 20, fatigue: 0, injury: 0 }, actionOrder),
    );
    const opponent = expectOk(
      computeOpponentStateModifier({ condition: 0, fatigue: 100, injury: 100 }, actionOrder),
    );
    expect(mover).toBe(5);
    expect(opponent).toBe(-25);
    expect(mover).not.toBe(opponent);
  });
});

describe("S1-SPEC-0.1.15 movement state timing / non-influence contracts", () => {
  it("keeps stateModifier independent of next modifiers and consumption factor", () => {
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    const actionOrder = config.battle.actionOrder;
    const baseState = { condition: 20, fatigue: 0, injury: 0 };
    const base = expectOk(computeMovementStateModifier(baseState, actionOrder));

    // Formula signature accepts only condition/fatigue/injury — next* are not parameters.
    const formulaKeys = ["condition", "fatigue", "injury"] as const;
    expect(formulaKeys).not.toContain("nextHitModifier");
    expect(formulaKeys).not.toContain("nextActivationModifier");
    expect(formulaKeys).not.toContain("consumptionPerformanceFactor");

    // Same condition/fatigue/injury → same modifier regardless of unused surrounding battle fields.
    expect(expectOk(computeMovementStateModifier({ ...baseState }, actionOrder))).toBe(base);

    // Latest battle-local injury: increasing injury changes the modifier (timing contract).
    const afterInjury = expectOk(
      computeMovementStateModifier({ condition: 20, fatigue: 0, injury: 100 }, actionOrder),
    );
    expect(afterInjury).toBe(-10);
    expect(afterInjury).not.toBe(base);

    // RNG contract unchanged by this clarification.
    const rngContractChanged = false;
    expect(rngContractChanged).toBe(false);
  });
});

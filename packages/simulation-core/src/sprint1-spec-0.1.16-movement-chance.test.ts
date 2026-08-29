/**
 * Contract tests for S1-SPEC-0.1.17 movementChance clarification.
 * Locks version registry, golden chances, config-bound (non-literal) bounds,
 * and RNG-free computation. Does not implement the production turn Resolver.
 */
import { describe, expect, it } from "vitest";
import {
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
  computeMovementChance,
  computePossibleRollCount,
  computeRequiredMoveRoll,
  computeSuccessfulRollCount,
  createDefaultSprint1ConfigInput,
  createSimulationIdFromIdentity,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type SimulationIdentity,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";
import { withTestSprint2IdentityFields } from "./test-fixtures/sprint2-identity.fixture.js";

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
  return withTestSprint2IdentityFields(
    {
      seed: 1,
      initialWorldConfigHash: "a".repeat(64),
      worldCalendarConfigHash: "a".repeat(64),
      yearStartProcessorManifestHash: "a".repeat(64),
      sprint1ConfigHash,
      techniqueCatalogHash: "b".repeat(64),
      initialWeeklyTrainingSidecarHash: "c".repeat(64),
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
    },
    sha256Provider,
  );
}

describe("S1-SPEC-0.1.18 version registry", () => {
  it("publishes S1-SPEC-0.1.20 and keeps main SPEC / Sprint1Config SHA unchanged", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.3");
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

  it("accepts a new Sprint 1 identity with S1-SPEC-0.1.20 and rejects 0.1.18", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.21"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.21");
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.18")).ok).toBe(false);
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.16")).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.16 movementChance golden (default bounds from config)", () => {
  it("locks 100 / 52 / 4 / 0 using battle.movement.randomMinimum/Maximum", () => {
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    const { randomMinimum, randomMaximum } = config.battle.movement;
    expect(randomMinimum).toBe(-10);
    expect(randomMaximum).toBe(10);
    expect(expectOk(computePossibleRollCount({ randomMinimum, randomMaximum }))).toBe(21);

    // Always success: requiredMoveRoll <= randomMinimum  (e.g. required = -10)
    // Opponent - Mover = -10 → mover ahead by 10 at roll min.
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 20,
          opponentBaseScore: 10,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(100);
    expect(expectOk(computeRequiredMoveRoll(20, 10))).toBe(-10);

    // required roll 0: Opponent - Mover = 0 → rolls 0..10 succeed (11/21) → 52
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 10,
          opponentBaseScore: 10,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(52);
    expect(
      expectOk(
        computeSuccessfulRollCount({
          moverBaseScore: 10,
          opponentBaseScore: 10,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(11);

    // required roll 10: Opponent - Mover = 10 → only roll 10 (1/21) → 4
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 0,
          opponentBaseScore: 10,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(4);

    // Impossible: requiredMoveRoll > randomMaximum
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 0,
          opponentBaseScore: 11,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(0);
  });
});

describe("S1-SPEC-0.1.16 movementChance custom bounds (no -10..10 literal dependency)", () => {
  it("uses supplied randomMinimum/randomMaximum for chance math", () => {
    // Custom window [-2, 2] → 5 possible rolls.
    const randomMinimum = -2;
    const randomMaximum = 2;
    expect(expectOk(computePossibleRollCount({ randomMinimum, randomMaximum }))).toBe(5);

    // required 0 → rolls 0,1,2 → 3/5 → floor(300/5)=60
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 5,
          opponentBaseScore: 5,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(60);

    // always success when required <= -2
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 10,
          opponentBaseScore: 8,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(100);

    // impossible when required > 2
    expect(
      expectOk(
        computeMovementChance({
          moverBaseScore: 0,
          opponentBaseScore: 3,
          randomMinimum,
          randomMaximum,
        }),
      ),
    ).toBe(0);
  });

  it("documents that movementChance computation consumes zero RNG draws", () => {
    // Pure function: no SeededRng parameter exists on the public API.
    expect(computeMovementChance.length).toBe(1);
    const result = expectOk(
      computeMovementChance({
        moverBaseScore: 10,
        opponentBaseScore: 10,
        randomMinimum: -10,
        randomMaximum: 10,
      }),
    );
    expect(result).toBe(52);
  });
});

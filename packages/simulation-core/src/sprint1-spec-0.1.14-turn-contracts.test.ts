/**
 * Contract tests for S1-SPEC-0.1.14 turn input contracts.
 * Locks replacementReason enum, BattleAction shapes, battle-action-script-0.1.0,
 * canonical fixture, binding, and technique use-count rules.
 * Does not implement the production turn Resolver / DefaultBattleStrategy.
 */
import { describe, expect, it } from "vitest";
import {
  BATTLE_ACTION_KINDS,
  BATTLE_ACTION_REPLACEMENT_REASONS,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  FIXED_BASIC_DEFENSE_ACTION_SCRIPT_BYTE_LENGTH,
  FIXED_BASIC_DEFENSE_ACTION_SCRIPT_SHA256,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  battleActionScriptToCanonicalScript,
  buildFixedBasicDefenseBattleActionScript,
  clonePersonTechniqueState,
  computeActionScriptHash,
  createDefaultSprint1ConfigInput,
  createScriptedActionsSourceIdentity,
  createSimulationIdFromIdentity,
  freezePersonTechniqueState,
  getBattleActionFromScript,
  invalidActionCountDeltaForReplacementReason,
  toCanonicalJson,
  validateBattleAction,
  validateBattleActionReplacementReason,
  validateBattleActionScript,
  validateCanonicalBattleActionScriptString,
  validatePersonTechniqueState,
  validateResolvedBattleAction,
  validateScriptedBothSideBinding,
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
    schemaVersion: "0.5.0",
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
  };
}

describe("S1-SPEC-0.1.14 version registry (superseded current = 0.1.17)", () => {
  it("publishes S1-SPEC-0.1.20 and keeps main SPEC / Sprint1Config SHA unchanged", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.3");
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    expect(sha256Provider.hashUtf8(toCanonicalJson(config))).toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
  });

  it("accepts a new Sprint 1 identity with S1-SPEC-0.1.20 and rejects 0.1.14", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.21"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.21");
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.18")).ok).toBe(false);
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.14")).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.14 BattleActionReplacementReason", () => {
  it("locks the complete enum and rejects unknown strings / empty string", () => {
    expect([...BATTLE_ACTION_REPLACEMENT_REASONS]).toEqual([
      "unknown_technique",
      "unlearned_technique",
      "requirements_not_met",
      "insufficient_mental",
      "unusable_range",
      "unable_to_act",
      "opponent_ended_battle",
    ]);
    expect(validateBattleActionReplacementReason(null).ok).toBe(true);
    expect(validateBattleActionReplacementReason("").ok).toBe(false);
    expect(validateBattleActionReplacementReason("invented_reason").ok).toBe(false);
    for (const reason of BATTLE_ACTION_REPLACEMENT_REASONS) {
      expect(validateBattleActionReplacementReason(reason).ok).toBe(true);
    }
  });

  it("locks invalidActionCountDelta rules", () => {
    expect(invalidActionCountDeltaForReplacementReason(null)).toBe(0);
    expect(invalidActionCountDeltaForReplacementReason("opponent_ended_battle")).toBe(0);
    for (const reason of [
      "unknown_technique",
      "unlearned_technique",
      "requirements_not_met",
      "insufficient_mental",
      "unusable_range",
      "unable_to_act",
    ] as const) {
      expect(invalidActionCountDeltaForReplacementReason(reason)).toBe(1);
    }
  });
});

describe("S1-SPEC-0.1.14 BattleAction canonical shapes", () => {
  it("accepts all eight requested variants and rejects no_action / unknown keys", () => {
    const fixtures = [
      { kind: "use_technique", techniqueId: "technique_alpha" },
      { kind: "basic_attack", profile: "unarmed" },
      { kind: "basic_defense" },
      { kind: "evade", direction: "hold" },
      { kind: "approach" },
      { kind: "retreat" },
      { kind: "focus_mind" },
      { kind: "surrender" },
    ] as const;
    expect([...BATTLE_ACTION_KINDS]).toEqual(fixtures.map((f) => f.kind));
    for (const fixture of fixtures) {
      expect(validateBattleAction(fixture).ok).toBe(true);
    }
    expect(validateBattleAction({ kind: "no_action" }).ok).toBe(false);
    expect(validateResolvedBattleAction({ kind: "no_action" }).ok).toBe(true);
    expect(validateBattleAction({ kind: "basic_defense", extra: 1 }).ok).toBe(false);
    expect(validateBattleAction({ kind: "use_technique" }).ok).toBe(false);
    expect(validateBattleAction({ kind: "basic_attack", profile: "martial" }).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.14 BattleActionScript schema", () => {
  it("requires exact keys, 20 contiguous turns, and rejects sparse / wrong counts", () => {
    const script = buildFixedBasicDefenseBattleActionScript(20);
    expect(validateBattleActionScript(script, 20).ok).toBe(true);
    expect(validateBattleActionScript({ ...script, extra: true }, 20).ok).toBe(false);
    expect(
      validateBattleActionScript(
        {
          ...script,
          turns: script.turns.slice(0, 19),
        },
        20,
      ).ok,
    ).toBe(false);
    const sparse: unknown[] = [...script.turns];
    delete sparse[5];
    expect(validateBattleActionScript({ ...script, turns: sparse }, 20).ok).toBe(false);
    expect(
      validateBattleActionScript(
        {
          ...script,
          turns: [
            { turnNumber: 1, sideA: { kind: "no_action" }, sideB: { kind: "basic_defense" } },
            ...script.turns.slice(1),
          ],
        },
        20,
      ).ok,
    ).toBe(false);
  });

  it("retrieves turn/side actions uniquely and rejects turn 0 / 21", () => {
    const script = expectOk(
      validateBattleActionScript(buildFixedBasicDefenseBattleActionScript(20), 20),
    );
    expect(expectOk(getBattleActionFromScript(script, 1, "sideA"))).toEqual({
      kind: "basic_defense",
    });
    expect(expectOk(getBattleActionFromScript(script, 1, "sideB"))).toEqual({
      kind: "basic_defense",
    });
    expect(expectOk(getBattleActionFromScript(script, 20, "sideA"))).toEqual({
      kind: "basic_defense",
    });
    expect(expectOk(getBattleActionFromScript(script, 20, "sideB"))).toEqual({
      kind: "basic_defense",
    });
    expect(getBattleActionFromScript(script, 0, "sideA").ok).toBe(false);
    expect(getBattleActionFromScript(script, 21, "sideA").ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.14 action script canonical fixture", () => {
  it("locks UTF-8 byte length 1733 and published SHA-256", () => {
    const script = buildFixedBasicDefenseBattleActionScript(20);
    const canonical = battleActionScriptToCanonicalScript(script);
    expect(Buffer.byteLength(canonical, "utf8")).toBe(
      FIXED_BASIC_DEFENSE_ACTION_SCRIPT_BYTE_LENGTH,
    );
    expect(Buffer.byteLength(canonical, "utf8")).toBe(1733);
    const hash = expectOk(computeActionScriptHash(canonical, sha256Provider));
    expect(hash).toBe(FIXED_BASIC_DEFENSE_ACTION_SCRIPT_SHA256);
    expect(hash).toBe("67abb9d717f4ae6a21650d16e9b7da3e166fdfc1d89616f6342e258595e7cf6f");
    expect(BATTLE_ACTION_SCRIPT_FORMAT_VERSION).toBe("battle-action-script-0.1.0");
  });

  it("rejects non-canonical script strings", () => {
    const script = buildFixedBasicDefenseBattleActionScript(20);
    const canonical = battleActionScriptToCanonicalScript(script);
    expect(validateCanonicalBattleActionScriptString(` ${canonical}`, 20).ok).toBe(false);
    expect(validateCanonicalBattleActionScriptString(`${canonical}\n`, 20).ok).toBe(false);
    expect(validateCanonicalBattleActionScriptString(JSON.stringify(script, null, 2), 20).ok).toBe(
      false,
    );
    // Pretty / key-order drift via object rebuilt with reverse key order at root.
    const wrongOrder = `{"turns":${toCanonicalJson(script.turns)},"scriptFormatVersion":"battle-action-script-0.1.0"}`;
    expect(wrongOrder === canonical).toBe(false);
    expect(validateCanonicalBattleActionScriptString(wrongOrder, 20).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.14 scripted both-side binding", () => {
  it("rejects hash mismatch, format mismatch, mixed default/scripted, and differing scripts", () => {
    const script = buildFixedBasicDefenseBattleActionScript(20);
    const canonical = battleActionScriptToCanonicalScript(script);
    const hash = expectOk(computeActionScriptHash(canonical, sha256Provider));
    const identity = expectOk(
      createScriptedActionsSourceIdentity({
        actionScriptHash: hash,
      }),
    );
    expect(
      validateScriptedBothSideBinding(
        {
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          canonicalScript: canonical,
          expectedMaxTurns: 20,
        },
        sha256Provider,
      ).ok,
    ).toBe(true);

    const wrongHash = expectOk(
      createScriptedActionsSourceIdentity({
        actionScriptHash: "0".repeat(64),
      }),
    );
    expect(
      validateScriptedBothSideBinding(
        {
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: wrongHash,
          canonicalScript: canonical,
          expectedMaxTurns: 20,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);

    const defaultA = {
      schemaVersion: "0.1.0" as const,
      kind: "default_strategy" as const,
      strategyId: "default-battle-strategy" as const,
      strategyVersion: "default-battle-strategy-0.1.0",
      strategyConfigHash: SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
      scriptFormatVersion: null,
      actionScriptHash: null,
    };
    expect(
      validateScriptedBothSideBinding(
        {
          participantAActionSourceIdentity: defaultA,
          participantBActionSourceIdentity: identity,
          canonicalScript: canonical,
          expectedMaxTurns: 20,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });
});

describe("S1-SPEC-0.1.14 technique use count contracts", () => {
  it("documents activation failure / miss / hit deltas without implementing the Resolver", () => {
    // Contract table locked by S1-SPEC-0.1.14 — production increments live in S01-006.
    const cases = [
      { label: "activation failure", attemptedDelta: 1, successfulDelta: 0 },
      { label: "activation success miss", attemptedDelta: 1, successfulDelta: 1 },
      { label: "activation success hit", attemptedDelta: 1, successfulDelta: 1 },
      { label: "replacement", attemptedDelta: 0, successfulDelta: 0 },
      { label: "opponent ended", attemptedDelta: 0, successfulDelta: 0 },
      { label: "basic attack", attemptedDelta: 0, successfulDelta: 0 },
    ] as const;
    for (const row of cases) {
      expect(row.successfulDelta).toBeLessThanOrEqual(row.attemptedDelta);
      if (row.label.startsWith("activation")) {
        expect(row.attemptedDelta).toBe(1);
      }
      if (row.label === "activation failure") {
        expect(row.successfulDelta).toBe(0);
      }
      if (row.label === "activation success miss" || row.label === "activation success hit") {
        expect(row.successfulDelta).toBe(1);
      }
    }
  });

  it("rejects successfulUseCount > attemptedUseCount via production PersonTechniqueState validators", () => {
    const base = {
      techniqueId: "technique_alpha",
      learningProgressTenths: 0,
      masteryHundredths: 0,
      lastPracticedAbsoluteWeek: null,
      acquiredAbsoluteWeek: null,
    };

    expect(
      validatePersonTechniqueState({ ...base, successfulUseCount: 0, attemptedUseCount: 0 }).ok,
    ).toBe(true);
    expect(
      validatePersonTechniqueState({ ...base, successfulUseCount: 1, attemptedUseCount: 1 }).ok,
    ).toBe(true);
    expect(
      validatePersonTechniqueState({ ...base, successfulUseCount: 1, attemptedUseCount: 2 }).ok,
    ).toBe(true);
    expect(
      validatePersonTechniqueState({
        ...base,
        successfulUseCount: Number.MAX_SAFE_INTEGER,
        attemptedUseCount: Number.MAX_SAFE_INTEGER,
      }).ok,
    ).toBe(true);

    const inverted = { ...base, successfulUseCount: 2, attemptedUseCount: 1 };
    const validated = validatePersonTechniqueState(inverted);
    expect(validated.ok).toBe(false);
    if (!validated.ok) {
      expect(validated.issues.some((issue) => issue.path === "/successfulUseCount")).toBe(true);
    }
    expect(clonePersonTechniqueState(inverted).ok).toBe(false);
    expect(freezePersonTechniqueState(inverted).ok).toBe(false);

    expect(
      validatePersonTechniqueState({
        ...base,
        successfulUseCount: -1,
        attemptedUseCount: 0,
      }).ok,
    ).toBe(false);
    expect(
      validatePersonTechniqueState({
        ...base,
        successfulUseCount: 0,
        attemptedUseCount: Number.POSITIVE_INFINITY,
      }).ok,
    ).toBe(false);
  });
});

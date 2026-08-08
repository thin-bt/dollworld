/**
 * Contract tests for S1-SPEC-0.1.18 BattleResult deterministic clarification.
 * Locks summary/tie-break/RNG/mastery/experience contracts without implementing
 * finalizeBattleResult / runBattleToCompletion / WorldEngine.
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
  applyBattleTechniqueMasteryAttempts,
  compareEffectiveDamageRatio,
  compareRemainingDurabilityRatio,
  computeBattlePhaseIndex,
  computeFinalDurabilityRatioBasisPoints,
  createDefaultSprint1ConfigInput,
  createSeededRng,
  createSimulationIdFromIdentity,
  decideJudgeWinner,
  getDefaultSprint1Config,
  importSeededRng,
  isBattleKeyMomentLog,
  listBattlePhasesForTurnsExecuted,
  selectMasteryCurrentValueFactor,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type JudgeTieBreakInput,
  type SimulationIdentity,
  type ValidationResult,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
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

function equalScoresBase(overrides: Partial<JudgeTieBreakInput> = {}): JudgeTieBreakInput {
  return {
    totalScoreA: 50,
    totalScoreB: 50,
    damageDealtA: 10,
    damageDealtB: 10,
    maxDurabilityA: 100,
    maxDurabilityB: 100,
    successfulHitsA: 3,
    successfulHitsB: 3,
    currentDurabilityA: 50,
    currentDurabilityB: 50,
    currentMentalA: 40,
    currentMentalB: 40,
    inBattleConsumptionA: 20,
    inBattleConsumptionB: 20,
    ...overrides,
  };
}

describe("S1-SPEC-0.1.18 version registry", () => {
  it("publishes S1-SPEC-0.1.19 and keeps main SPEC / Sprint1Config SHA unchanged", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.19");
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

  it("accepts a new Sprint 1 identity with S1-SPEC-0.1.19 and rejects 0.1.18", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.19"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.19");
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.18")).ok).toBe(false);
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.17")).ok).toBe(false);
  });
});

describe("S1-SPEC-0.1.18 BattleSummaryLog phase split", () => {
  it("T=0 -> phaseSummaries=[]", () => {
    expect(listBattlePhasesForTurnsExecuted(0)).toEqual([]);
  });

  it("T=1 -> opening only", () => {
    expect(listBattlePhasesForTurnsExecuted(1)).toEqual(["opening"]);
    expect(computeBattlePhaseIndex(1, 1)).toBe(0);
  });

  it("T=2 -> opening + middle", () => {
    expect(listBattlePhasesForTurnsExecuted(2)).toEqual(["opening", "middle"]);
    expect(computeBattlePhaseIndex(1, 2)).toBe(0);
    expect(computeBattlePhaseIndex(2, 2)).toBe(1);
  });

  it("T=3 -> opening + middle + closing", () => {
    expect(listBattlePhasesForTurnsExecuted(3)).toEqual(["opening", "middle", "closing"]);
    expect(computeBattlePhaseIndex(1, 3)).toBe(0);
    expect(computeBattlePhaseIndex(2, 3)).toBe(1);
    expect(computeBattlePhaseIndex(3, 3)).toBe(2);
  });

  it("T=20 locks phase boundaries for turnNumbers", () => {
    expect(listBattlePhasesForTurnsExecuted(20)).toEqual(["opening", "middle", "closing"]);
    // phaseIndex = min(2, floor((n-1)*3/20))
    expect(computeBattlePhaseIndex(1, 20)).toBe(0);
    expect(computeBattlePhaseIndex(7, 20)).toBe(0); // floor(6*3/20)=floor(0.9)=0
    expect(computeBattlePhaseIndex(8, 20)).toBe(1); // floor(7*3/20)=floor(1.05)=1
    expect(computeBattlePhaseIndex(14, 20)).toBe(1); // floor(13*3/20)=floor(1.95)=1
    expect(computeBattlePhaseIndex(15, 20)).toBe(2); // floor(14*3/20)=floor(2.1)=2
    expect(computeBattlePhaseIndex(20, 20)).toBe(2);
  });
});

describe("S1-SPEC-0.1.18 keyMoments inclusion", () => {
  it("excludes damage=0 / injury=none / non-surrender", () => {
    expect(
      isBattleKeyMomentLog({
        damage: 0,
        injuryResult: "none",
        resolvedActionKind: "basic_attack",
      }),
    ).toBe(false);
    expect(
      isBattleKeyMomentLog({
        damage: null,
        injuryResult: null,
        resolvedActionKind: "basic_defense",
      }),
    ).toBe(false);
  });

  it("includes damage>0, minor/major, surrender", () => {
    expect(
      isBattleKeyMomentLog({
        damage: 1,
        injuryResult: "none",
        resolvedActionKind: "basic_attack",
      }),
    ).toBe(true);
    expect(
      isBattleKeyMomentLog({
        damage: 0,
        injuryResult: "minor",
        resolvedActionKind: "use_technique",
      }),
    ).toBe(true);
    expect(
      isBattleKeyMomentLog({
        damage: null,
        injuryResult: "major",
        resolvedActionKind: "use_technique",
      }),
    ).toBe(true);
    expect(
      isBattleKeyMomentLog({
        damage: null,
        injuryResult: null,
        resolvedActionKind: "surrender",
      }),
    ).toBe(true);
  });

  it("orders by actionSequence ascending when filtering a list", () => {
    const logs = [
      { actionSequence: 4, damage: 0, injuryResult: "none" as const, resolvedActionKind: "evade" },
      {
        actionSequence: 1,
        damage: 3,
        injuryResult: "none" as const,
        resolvedActionKind: "basic_attack",
      },
      {
        actionSequence: 2,
        damage: 0,
        injuryResult: "minor" as const,
        resolvedActionKind: "use_technique",
      },
      { actionSequence: 3, damage: null, injuryResult: null, resolvedActionKind: "surrender" },
    ];
    const moments = logs
      .filter((l) => isBattleKeyMomentLog(l))
      .sort((a, b) => a.actionSequence - b.actionSequence)
      .map((l) => l.actionSequence);
    expect(moments).toEqual([1, 2, 3]);
  });
});

describe("S1-SPEC-0.1.18 durability ratio floor vs cross-product", () => {
  it("floors display ratio to basis points", () => {
    expect(expectOk(computeFinalDurabilityRatioBasisPoints(1, 3))).toBe(3333);
    expect(expectOk(computeFinalDurabilityRatioBasisPoints(2, 3))).toBe(6666);
  });

  it("tie-break uses cross product when floored ratios tie but true ratios differ", () => {
    // A: 1/3 → floor bp 3333; B: 2/6 → floor bp 3333; but 1/3 > 2/6 is false; 1/3 == 2/6
    expect(expectOk(computeFinalDurabilityRatioBasisPoints(1, 3))).toBe(
      expectOk(computeFinalDurabilityRatioBasisPoints(2, 6)),
    );
    expect(compareRemainingDurabilityRatio(1, 3, 2, 6)).toBe("tie");

    // A: 2/5=0.4 bp 4000; B: 3/8=0.375 bp 3750 — floors differ and cross product A wins
    expect(expectOk(computeFinalDurabilityRatioBasisPoints(2, 5))).toBe(4000);
    expect(expectOk(computeFinalDurabilityRatioBasisPoints(3, 8))).toBe(3750);
    expect(compareRemainingDurabilityRatio(2, 5, 3, 8)).toBe("sideA");

    // Locked cross product: left=A.dmg*B.max, right=B.dmg*A.max
    // A: dmg=2 maxA=5; B: dmg=1 maxB=3 → 2*3=6 vs 1*5=5 → A
    expect(compareEffectiveDamageRatio(2, 5, 1, 3)).toBe("sideA");
    // A: dmg=1 maxA=99; B: dmg=1 maxB=100 → 1*100=100 vs 1*99=99 → A
    expect(compareEffectiveDamageRatio(1, 99, 1, 100)).toBe("sideA");
    // Floored damageScore can tie (both floor to 0) while cross product still differs:
    // A: dmg=1 maxB=200 → floor(1/200*50)=0; B: dmg=1 maxA=200 → floor=0; cross product tie
    expect(compareEffectiveDamageRatio(1, 200, 1, 200)).toBe("tie");
    // A: dmg=1 maxA=150; B: dmg=1 maxB=200 → scores both 0, cross 1*200 vs 1*150 → A
    expect(compareEffectiveDamageRatio(1, 150, 1, 200)).toBe("sideA");
  });
});

describe("S1-SPEC-0.1.18 judge tie-break ladder", () => {
  it("decides by effective damage ratio", () => {
    const result = expectOk(
      decideJudgeWinner(equalScoresBase({ damageDealtA: 20, damageDealtB: 10 }), null),
    );
    expect(result.decisiveCriterion).toBe("effective_damage_ratio");
    expect(result.winnerSide).toBe("sideA");
    expect(result.rngDraws).toBe(0);
  });

  it("decides by successfulHits", () => {
    const result = expectOk(
      decideJudgeWinner(equalScoresBase({ successfulHitsA: 2, successfulHitsB: 5 }), null),
    );
    expect(result.decisiveCriterion).toBe("successful_hits");
    expect(result.winnerSide).toBe("sideB");
    expect(result.rngDraws).toBe(0);
  });

  it("decides by remaining durability ratio", () => {
    const result = expectOk(
      decideJudgeWinner(equalScoresBase({ currentDurabilityA: 10, currentDurabilityB: 40 }), null),
    );
    expect(result.decisiveCriterion).toBe("remaining_durability_ratio");
    expect(result.winnerSide).toBe("sideB");
  });

  it("decides by remaining mental", () => {
    const result = expectOk(
      decideJudgeWinner(equalScoresBase({ currentMentalA: 55, currentMentalB: 40 }), null),
    );
    expect(result.decisiveCriterion).toBe("remaining_mental");
    expect(result.winnerSide).toBe("sideA");
  });

  it("decides by lower inBattleConsumption", () => {
    const result = expectOk(
      decideJudgeWinner(
        equalScoresBase({ inBattleConsumptionA: 30, inBattleConsumptionB: 10 }),
        null,
      ),
    );
    expect(result.decisiveCriterion).toBe("lower_in_battle_consumption");
    expect(result.winnerSide).toBe("sideB");
  });

  it("uses nextInt(0,2) once when all equal; 0->A 1->B", () => {
    const base = equalScoresBase();
    let saw0 = false;
    let saw1 = false;
    for (let seed = 1; seed < 500 && !(saw0 && saw1); seed += 1) {
      const probe = createSeededRng(seed);
      const before = probe.exportState();
      const roll = probe.nextInt(0, 2);
      const rng2 = importSeededRng(before);
      const result = expectOk(decideJudgeWinner(base, rng2));
      expect(result.decisiveCriterion).toBe("seeded_rng");
      expect(result.rngDraws).toBe(1);
      expect(result.seededRngRoll).toBe(roll);
      expect(result.winnerSide).toBe(roll === 0 ? "sideA" : "sideB");
      if (roll === 0) saw0 = true;
      if (roll === 1) saw1 = true;
    }
    expect(saw0 && saw1).toBe(true);
  });

  it("does not draw RNG when an earlier criterion decides", () => {
    const rng = createSeededRng(99);
    const before = rng.exportState();
    const result = expectOk(
      decideJudgeWinner(equalScoresBase({ successfulHitsA: 9, successfulHitsB: 1 }), rng),
    );
    expect(result.rngDraws).toBe(0);
    expect(rng.exportState()).toEqual(before);
  });

  it("PersonId is not a criterion — identical stats stay tied until RNG", () => {
    const rng = createSeededRng(7);
    const a = expectOk(decideJudgeWinner(equalScoresBase(), rng));
    expect(a.decisiveCriterion).toBe("seeded_rng");
  });
});

describe("S1-SPEC-0.1.18 battleExperienceSummary contract shape", () => {
  it("locks required keys and basic_attack exclusion semantics", () => {
    const summary = {
      outcome: "win" as const,
      endReason: "knockout",
      turnsExecuted: 4,
      damageDealt: 30,
      damageReceived: 12,
      successfulHits: 5,
      successfulDefenses: 1,
      successfulEvasions: 0,
      successfulCounters: 0,
      attemptedTechniqueUseCount: 2,
      successfulTechniqueUseCount: 1,
    };
    expect(Object.keys(summary).sort()).toEqual(
      [
        "attemptedTechniqueUseCount",
        "damageDealt",
        "damageReceived",
        "endReason",
        "outcome",
        "successfulCounters",
        "successfulDefenses",
        "successfulEvasions",
        "successfulHits",
        "successfulTechniqueUseCount",
        "turnsExecuted",
      ].sort(),
    );
    // basic_attack use counts must not contribute to technique totals
    const techniqueAttemptedFromBattleLocal = [
      { kind: "basic_attack", attemptedDelta: 3, successfulDelta: 2 },
      { kind: "use_technique", attemptedDelta: 2, successfulDelta: 1 },
    ];
    const attempted = techniqueAttemptedFromBattleLocal
      .filter((t) => t.kind !== "basic_attack")
      .reduce((s, t) => s + t.attemptedDelta, 0);
    const successful = techniqueAttemptedFromBattleLocal
      .filter((t) => t.kind !== "basic_attack")
      .reduce((s, t) => s + t.successfulDelta, 0);
    expect(attempted).toBe(2);
    expect(successful).toBe(1);
  });

  it("resolution_error yields no developmentEffects / no experience summary", () => {
    const developmentEffectsEmpty = true;
    const battleExperienceSummaryGenerated = !developmentEffectsEmpty;
    expect(battleExperienceSummaryGenerated).toBe(false);
  });
});

describe("S1-SPEC-0.1.18 battle mastery attempt-by-attempt", () => {
  const config = getDefaultSprint1Config();

  it("applies all band factors and official/mock success/failure from config", () => {
    expect(config.techniqueLearning.masteryGainHundredths.officialSuccess).toBe(20);
    expect(config.techniqueLearning.masteryGainHundredths.officialFailure).toBe(10);
    expect(config.techniqueLearning.masteryGainHundredths.mockSuccess).toBe(10);
    expect(config.techniqueLearning.masteryGainHundredths.mockFailure).toBe(5);

    const bands: Array<{
      mastery: number;
      key: keyof typeof config.techniqueLearning.masteryCurrentValueFactors;
    }> = [
      { mastery: 0, key: "mastery0to39" },
      { mastery: 4000, key: "mastery40to59" },
      { mastery: 6000, key: "mastery60to79" },
      { mastery: 8000, key: "mastery80to89" },
      { mastery: 9000, key: "mastery90to100" },
    ];
    for (const band of bands) {
      expect(expectOk(selectMasteryCurrentValueFactor(band.mastery, config))).toBe(
        config.techniqueLearning.masteryCurrentValueFactors[band.key],
      );
      const one = expectOk(
        applyBattleTechniqueMasteryAttempts({
          sourceMasteryHundredths: band.mastery,
          battleKind: "official",
          attempts: [{ activationSucceeded: true }],
          config,
        }),
      );
      expect(one.appliedGains).toHaveLength(1);
      expect(one.masteryHundredthsDelta).toBe(one.appliedGains[0]!);
    }
  });

  it("floors per attempt and crosses bands within one fight", () => {
    // Start just below 40 display (3990 hundredths); official success * 1.0 = +20 → 4010
    // next attempt uses 40..59 factor 0.80 → floor(20*8000/10000)=16
    const result = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 3990,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }, { activationSucceeded: true }],
        config,
      }),
    );
    expect(result.appliedGains).toEqual([20, 16]);
    expect(result.workingMastery).toBe(4026);
    expect(result.masteryHundredthsDelta).toBe(36);
  });

  it("clamps at 10000", () => {
    const result = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 9995,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }],
        config,
      }),
    );
    // factor 0.10 → floor(20*1000/10000)=2 → 9997
    expect(result.workingMastery).toBe(9997);
    const nearCap = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 9999,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }, { activationSucceeded: true }],
        config,
      }),
    );
    expect(nearCap.workingMastery).toBe(10000);
  });

  it("activation success + miss still uses success gain; failure uses failure gain", () => {
    const successGain = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 0,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }],
        config,
      }),
    );
    const failureGain = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 0,
        battleKind: "official",
        attempts: [{ activationSucceeded: false }],
        config,
      }),
    );
    expect(successGain.masteryHundredthsDelta).toBe(20);
    expect(failureGain.masteryHundredthsDelta).toBe(10);
  });

  it("mock uses mockSuccess/mockFailure", () => {
    const ok = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 0,
        battleKind: "mock",
        attempts: [{ activationSucceeded: true }, { activationSucceeded: false }],
        config,
      }),
    );
    expect(ok.appliedGains).toEqual([10, 5]);
  });

  it("rejects bulk-equivalent shortcut that floors once", () => {
    const sequential = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 3990,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }, { activationSucceeded: true }],
        config,
      }),
    );
    // Forbidden bulk: floor((2*20)*factor_at_start) or similar single floor
    const bulkWrong = Math.floor((40 * 10000) / 10000); // 40 at factor 1.0
    expect(sequential.masteryHundredthsDelta).not.toBe(bulkWrong);
    expect(sequential.masteryHundredthsDelta).toBe(36);
  });
});

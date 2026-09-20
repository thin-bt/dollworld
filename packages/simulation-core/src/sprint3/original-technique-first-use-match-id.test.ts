import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../canonical-json.js";
import type { BattleDevelopmentEffects } from "../sprint1/battle-result-types.js";
import { asTechniqueId } from "../ids.js";
import { createInitialOriginalTechniqueLifecycleRuntimeState } from "./original-technique-lifecycle-runtime-state.js";
import {
  applyFirstUseMatchIdToOriginalTechniqueFoundingHistories,
  collectSuccessfulBattleTechniqueUseIds,
} from "./persist-original-technique-first-use-match-id.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";

function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value;
}

function foundingHistory(
  newTechniqueId: string,
  overrides: Partial<OriginalTechniqueFoundingHistoryRecord> = {},
): OriginalTechniqueFoundingHistoryRecord {
  return {
    eventKind: "original_technique_founded",
    founderPersonId: "person_founder",
    newTechniqueId,
    sourceTechniqueIds: ["tech_base"],
    researchValueAtFounding: 550,
    developmentReason: "test",
    researchTier: "full_original_technique",
    worldWeekIndex: 10,
    ...overrides,
  };
}

function developmentEffects(
  participantA: readonly { techniqueId: string; successful: number; attempted?: number }[],
  participantB: readonly { techniqueId: string; successful: number; attempted?: number }[] = [],
): BattleDevelopmentEffects {
  const toDelta = (entry: { techniqueId: string; successful: number; attempted?: number }) => ({
    techniqueId: asTechniqueId(entry.techniqueId),
    masteryHundredthsDelta: 0,
    attemptedUseCountDelta: entry.attempted ?? entry.successful,
    successfulUseCountDelta: entry.successful,
  });
  return {
    participantA: {
      persistentFatigueDelta: 0,
      injuryDelta: 0,
      conditionRequestedDelta: 0,
      conditionAppliedDelta: 0,
      conditionAfter: 0,
      confidenceRequestedDelta: 0,
      confidenceAppliedDelta: 0,
      confidenceAfter: 0,
      currentMentalAfter: 0,
      techniqueStateDeltas: participantA.map(toDelta),
      battleExperienceSummary: {
        outcome: "win",
        endReason: "knockout",
        turnsExecuted: 1,
        damageDealt: 0,
        damageReceived: 0,
        successfulHits: 0,
        successfulDefenses: 0,
        successfulEvasions: 0,
        successfulCounters: 0,
        attemptedTechniqueUseCount: 0,
        successfulTechniqueUseCount: 0,
      },
    },
    participantB: {
      persistentFatigueDelta: 0,
      injuryDelta: 0,
      conditionRequestedDelta: 0,
      conditionAppliedDelta: 0,
      conditionAfter: 0,
      confidenceRequestedDelta: 0,
      confidenceAppliedDelta: 0,
      confidenceAfter: 0,
      currentMentalAfter: 0,
      techniqueStateDeltas: participantB.map(toDelta),
      battleExperienceSummary: {
        outcome: "loss",
        endReason: "knockout",
        turnsExecuted: 1,
        damageDealt: 0,
        damageReceived: 0,
        successfulHits: 0,
        successfulDefenses: 0,
        successfulEvasions: 0,
        successfulCounters: 0,
        attemptedTechniqueUseCount: 0,
        successfulTechniqueUseCount: 0,
      },
    },
  };
}

describe("S03-011 original-technique first-use MatchId persistence FUM-001..005", () => {
  it("FUM-001 records MatchId on first successful qualifying use", () => {
    const runtime = createInitialOriginalTechniqueLifecycleRuntimeState(42);
    const withHistory = expectOk(
      applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
        runtimeState: {
          ...runtime,
          foundingHistories: [foundingHistory("tech_generated_a")],
        },
        matchId: "match_first_use_001",
        successfullyUsedTechniqueIds: ["tech_generated_a"],
      }),
    );
    expect(withHistory.foundingHistories[0]?.firstUseMatchId).toBe("match_first_use_001");
  });

  it("FUM-002 does not overwrite an existing firstUseMatchId on later battles", () => {
    const runtime = createInitialOriginalTechniqueLifecycleRuntimeState(43);
    const seeded = {
      ...runtime,
      foundingHistories: [
        foundingHistory("tech_generated_a", { firstUseMatchId: "match_original" }),
      ],
    };
    const after = expectOk(
      applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
        runtimeState: seeded,
        matchId: "match_later_battle",
        successfullyUsedTechniqueIds: ["tech_generated_a"],
      }),
    );
    expect(after).toBe(seeded);
    expect(after.foundingHistories[0]?.firstUseMatchId).toBe("match_original");
  });

  it("FUM-003 leaves history unchanged when technique was not successfully used", () => {
    const runtime = createInitialOriginalTechniqueLifecycleRuntimeState(44);
    const seeded = {
      ...runtime,
      foundingHistories: [foundingHistory("tech_generated_a")],
    };
    const ids = collectSuccessfulBattleTechniqueUseIds(
      developmentEffects([{ techniqueId: "tech_generated_a", successful: 0, attempted: 1 }]),
    );
    expect(ids).toEqual([]);
    const after = expectOk(
      applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
        runtimeState: seeded,
        matchId: "match_no_success",
        successfullyUsedTechniqueIds: ids,
      }),
    );
    expect(after).toBe(seeded);
    expect(after.foundingHistories[0]?.firstUseMatchId).toBeUndefined();
  });

  it("FUM-004 collectSuccessfulBattleTechniqueUseIds is deterministic and omits empty effects", () => {
    expect(collectSuccessfulBattleTechniqueUseIds([])).toEqual([]);
    expect(
      collectSuccessfulBattleTechniqueUseIds(
        developmentEffects(
          [{ techniqueId: "z_technique", successful: 1 }],
          [{ techniqueId: "a_technique", successful: 2 }],
        ),
      ),
    ).toEqual(["a_technique", "z_technique"]);
  });

  it("FUM-005 runtime serialization remains stable aside from firstUseMatchId field", () => {
    const runtime = createInitialOriginalTechniqueLifecycleRuntimeState(45);
    const before = {
      ...runtime,
      foundingHistories: [foundingHistory("tech_generated_a"), foundingHistory("tech_generated_b")],
    };
    const beforeJson = toCanonicalJson(before);
    const after = expectOk(
      applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
        runtimeState: before,
        matchId: "match_canonical",
        successfullyUsedTechniqueIds: ["tech_generated_b"],
      }),
    );
    expect(after.foundingHistories[0]?.firstUseMatchId).toBeUndefined();
    expect(after.foundingHistories[1]?.firstUseMatchId).toBe("match_canonical");
    expect(toCanonicalJson(after.foundingHistories[0])).toBe(
      toCanonicalJson(before.foundingHistories[0]),
    );
    expect(beforeJson).not.toBe(toCanonicalJson(after));
  });
});

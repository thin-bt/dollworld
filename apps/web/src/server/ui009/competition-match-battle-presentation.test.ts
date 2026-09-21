import { describe, expect, it } from "vitest";
import type { BattleDetailedLog, StoredBattleResultRecord } from "@shared-world/simulation-core";
import { projectCompetitionBattleLogSummary } from "./competition-match-battle-presentation.js";

describe("projectCompetitionBattleLogSummary", () => {
  it("builds presentation summary from retained action logs", () => {
    const record = {
      matchId: "m1",
      simulationId: "sim1",
      participantAId: "a",
      participantBId: "b",
      winnerPersonId: "a",
      loserPersonId: "b",
      resultKind: "completed",
    } as unknown as StoredBattleResultRecord;

    const detailedLog = {
      turnOrderLogs: [],
      actionLogs: [
        {
          actionSequence: 1,
          turnNumber: 1,
          actorSide: "sideA",
          actorPersonId: "a",
          strategySeed: null,
          strategyCandidateScores: null,
          strategyTieBreakUsed: null,
          requestedAction: { kind: "attack" },
          resolvedAction: { kind: "attack" },
          replacementReason: null,
          priority: 0,
          actionOrderScore: null,
          rangeBefore: "mid",
          rangeAfter: "mid",
          rangeShiftApplied: null,
          rangeShiftBlockChance: null,
          rangeShiftBlockRoll: null,
          movementChance: null,
          movementRoll: null,
          evadeDirection: null,
          actorDurabilityBefore: 100,
          actorDurabilityAfter: 90,
          actorMentalBefore: 50,
          actorMentalAfter: 45,
          targetDurabilityBefore: 100,
          targetDurabilityAfter: 0,
          targetMentalBefore: 50,
          targetMentalAfter: 20,
          guardingBefore: false,
          guardingAfter: false,
          evadingBefore: false,
          evadingAfter: false,
          activationChance: null,
          activationRoll: null,
          activationSucceeded: null,
          activationFailureReason: null,
          hitChance: null,
          hitRoll: null,
          hit: true,
          damageVariance: null,
          damage: 10,
          focusBaseRecovery: null,
          focusAppliedRecovery: null,
          injuryChance: null,
          injuryRoll: null,
          majorInjuryChance: null,
          majorInjuryRoll: null,
          injuryResult: "none",
          inBattleConsumptionBefore: 0,
          inBattleConsumptionDelta: 0,
          inBattleConsumptionAfter: 0,
          passiveActionCountDelta: 0,
          invalidActionCountDelta: 0,
          advantageTurnAwardedTo: null,
          nextHitModifierBefore: 0,
          nextHitModifierAfter: 0,
          nextActivationModifierBefore: 0,
          nextActivationModifierAfter: 0,
          surrenderedAfter: false,
          unableToContinueAfter: false,
          canActAfter: true,
          rngStateBefore: { counter: 0 },
          rngStateAfter: { counter: 1 },
        },
      ],
    } as unknown as BattleDetailedLog;

    const summary = projectCompetitionBattleLogSummary(record, detailedLog);
    expect(summary).not.toBeNull();
    expect(summary?.logTotalCount).toBe(1);
    expect(summary?.winnerPersonId).toBe("a");
    expect(summary?.finalState.status).toBe("completed");
  });
});

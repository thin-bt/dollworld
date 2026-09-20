import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CompetitionMatchDetailedLog } from "./CompetitionMatchDetailedLog.js";
import type { CompetitionMatchDetailView } from "./ui009-views.js";

function baseDetail(overrides: Partial<CompetitionMatchDetailView>): CompetitionMatchDetailView {
  return {
    matchId: "m1",
    participantAId: "a",
    participantBId: "b",
    participantADisplayName: "Alpha",
    participantBDisplayName: "Beta",
    winnerPersonId: "a",
    loserPersonId: "b",
    winnerDisplayName: "Alpha",
    loserDisplayName: "Beta",
    resultKind: "decision",
    tournamentId: "t1",
    detailedLogAvailable: false,
    detailedLogUnavailableReason: "pruned",
    detailedLogActionCount: 0,
    turnOrderLogs: [],
    logItems: [],
    ...overrides,
  };
}

describe("CompetitionMatchDetailedLog", () => {
  it("renders unavailable state for pruned logs", () => {
    const html = renderToStaticMarkup(<CompetitionMatchDetailedLog detail={baseDetail({})} />);
    expect(html).toContain('data-testid="competition-match-log-unavailable"');
    expect(html).toContain("保持期間を過ぎ");
  });

  it("renders turn order and combat log when retained data is present", () => {
    const html = renderToStaticMarkup(
      <CompetitionMatchDetailedLog
        detail={baseDetail({
          detailedLogAvailable: true,
          detailedLogUnavailableReason: null,
          detailedLogActionCount: 1,
          turnOrderLogs: [
            {
              turnNumber: 1,
              resolvedFirstSide: "sideA",
              sideAPriority: 0,
              sideBPriority: 0,
            },
          ],
          logItems: [
            {
              sequenceInBattle: 1,
              actionSequence: 1,
              turnNumber: 1,
              actorPersonId: "a",
              actorSide: "sideA",
              strategySeed: null,
              strategyCandidateScores: null,
              strategyTieBreakUsed: null,
              requestedAction: { kind: "guard" },
              resolvedAction: { kind: "guard" },
              replacementReason: null,
              techniqueId: null,
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
              activationChance: null,
              activationRoll: null,
              activationSucceeded: null,
              activationFailureReason: null,
              hitChance: null,
              hitRoll: null,
              hit: null,
              damageVariance: null,
              damage: null,
              focusBaseRecovery: null,
              focusAppliedRecovery: null,
              injuryChance: null,
              injuryRoll: null,
              majorInjuryChance: null,
              majorInjuryRoll: null,
              injuryResult: null,
              advantageTurnAwardedTo: null,
              sourceLogEntry: {},
            },
          ],
        })}
      />,
    );
    expect(html).toContain('data-testid="competition-match-turn-order-1"');
    expect(html).toContain('data-testid="battle-log-turn-1"');
  });
});

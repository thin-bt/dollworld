import { describe, expect, it } from "vitest";
import {
  createEmptyDetailedLogPayloadStore,
  executeTournamentBattleAtomic,
  formatTournamentSlotId,
} from "@shared-world/simulation-core";
import { buildTournamentMatchPlan } from "@shared-world/simulation-core";
import {
  buildRoundRobinBracketForPersons,
  defaultCompetitionRuleHash,
  defaultTournamentBattleActionIdentity,
  prepareTournamentBattleSession,
  tournamentBattleFixtureProvider,
} from "@shared-world/simulation-core";

const provider = tournamentBattleFixtureProvider;

describe("UI-009 competition engine domain smoke", () => {
  it("executes one tournament atomic match on prepared session (BAT-001 parity)", () => {
    const { session, personA, personB } = prepareTournamentBattleSession(6001);
    const bracket = buildRoundRobinBracketForPersons(personA, personB);
    const plan = buildTournamentMatchPlan(
      {
        tournamentId: bracket.tournament.tournamentId,
        bracketDefinition: bracket.built.definition,
        runtimeState: bracket.built.runtimeState,
        structuralSlot: { kind: "round_robin", pairIndex: 0 },
        scheduleLifecycleIdentity: bracket.lifecycle,
        slotBindings: [],
        matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
      },
      provider,
    );
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    const actionIdentity = defaultTournamentBattleActionIdentity(session);
    const atomic = executeTournamentBattleAtomic(
      {
        handoff: {
          matchPlan: plan.value,
          session,
          participantAActionSourceIdentity: actionIdentity,
          participantBActionSourceIdentity: actionIdentity,
          participantAActionsSource: { identity: actionIdentity },
          participantBActionsSource: { identity: actionIdentity },
          slotBindings: [],
        },
        matchPlan: plan.value,
        slotIdentity: { slotId: formatTournamentSlotId(0), matchOrdinal: 0 },
        competitionRuleHash: defaultCompetitionRuleHash(session),
        payloadStore: createEmptyDetailedLogPayloadStore(),
        storedRecords: [],
      },
      provider,
    );
    expect(atomic.kind).toBe("completed");
  });
});

/**
 * S02-011 EVT/OUT test fixtures.
 */
import { createWorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../../world-date.js";
import { asMatchId, asPersonId, asSimulationId, asTournamentId } from "../../ids.js";
import { BATTLE_FINISHED_EVENT_TYPE } from "../../sprint1/battle-finished-event.js";
import { BATTLE_SIMULATION_SOURCE_PROCESSOR, BATTLE_STARTED_EVENT_TYPE } from "../../sprint1/battle-started-event.js";
import { SPRINT2_TOURNAMENT_EVENT_PROCESSOR } from "../constants.js";
import {
  PERSON_RANK_PROMOTED_EVENT_TYPE,
  PERSON_S_RANK_PROMOTED_EVENT_TYPE,
  PERSON_S_RANK_QUALIFIED_EVENT_TYPE,
  TOURNAMENT_FINISHED_EVENT_TYPE,
  TOURNAMENT_MATCH_BYE_EVENT_TYPE,
  TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
  TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE,
} from "../tournament-event-payloads.js";
import {
  allocateSprint2EventEnvelope,
  type Sprint2EventEnvelope,
  type Sprint2EventEntities,
} from "../tournament-event-envelope-sprint2.js";

export const fixtureSimulationId = asSimulationId("simulation_0000000000000001");
export const fixtureTournamentId = asTournamentId("tournament_000000000001");
export const fixtureMatchId = asMatchId("match_000000000001");
export const fixturePersonA = asPersonId("person_000000000001");
export const fixturePersonB = asPersonId("person_000000000002");

export const fixtureWorldDate = createWorldDate(
  { year: 1, month: 3, weekOfMonth: 2 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);

function baseEntities(overrides: Partial<Sprint2EventEntities> = {}): Sprint2EventEntities {
  return {
    personIds: [],
    familyIds: [],
    lineageIds: [],
    relationshipIds: [],
    matchIds: [],
    tournamentIds: [],
    ...overrides,
  };
}

function expectEnvelope(envelope: ReturnType<typeof allocateSprint2EventEnvelope>): Sprint2EventEnvelope {
  if (!envelope.ok) {
    throw new Error(`fixture envelope failed: ${JSON.stringify(envelope.issues)}`);
  }
  return envelope.value;
}

export function buildEvt001BattleCompletedSequence(): Sprint2EventEnvelope[] {
  let sequence = 0;
  const started = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "normal",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: BATTLE_SIMULATION_SOURCE_PROCESSOR,
      eventType: BATTLE_STARTED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA, fixturePersonB],
        matchIds: [fixtureMatchId],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: { matchId: fixtureMatchId, battleKind: "official" },
    }),
  );
  const finished = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "normal",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: BATTLE_SIMULATION_SOURCE_PROCESSOR,
      eventType: BATTLE_FINISHED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA, fixturePersonB],
        matchIds: [fixtureMatchId],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: { matchId: fixtureMatchId, battleKind: "official", resultKind: "completed" },
    }),
  );
  const recorded = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "normal",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA, fixturePersonB],
        matchIds: [fixtureMatchId],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: {
        matchId: fixtureMatchId,
        tournamentId: fixtureTournamentId,
        storedBattleResultRefHash: "a".repeat(64),
        winnerPersonId: fixturePersonA,
        loserPersonId: fixturePersonB,
      },
    }),
  );
  return [started, finished, recorded];
}

export function buildEvt002RoundTournamentCompleteSequence(): Sprint2EventEnvelope[] {
  const base = buildEvt001BattleCompletedSequence();
  let sequence = base.length;
  const roundCompleted = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "major",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE,
      entities: baseEntities({ tournamentIds: [fixtureTournamentId] }),
      payload: { tournamentId: fixtureTournamentId, roundIndex: 1 },
    }),
  );
  const finished = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "major",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: TOURNAMENT_FINISHED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: {
        tournamentId: fixtureTournamentId,
        completionKind: "winner_determined",
        resultHash: "b".repeat(64),
        winnerPersonId: fixturePersonA,
      },
    }),
  );
  return [...base, roundCompleted, finished];
}

export function buildEvt003PromotionSequence(): Sprint2EventEnvelope[] {
  const base = buildEvt002RoundTournamentCompleteSequence();
  let sequence = base.length;
  const promoted = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "major",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: PERSON_RANK_PROMOTED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: {
        personId: fixturePersonA,
        tournamentId: fixtureTournamentId,
        previousRank: "B",
        newRank: "A",
        promotionResultHash: "c".repeat(64),
      },
    }),
  );
  return [...base, promoted];
}

export function buildEvt006SQualificationSequence(): Sprint2EventEnvelope[] {
  const base = buildEvt002RoundTournamentCompleteSequence();
  let sequence = base.length;
  const qualified = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "historic",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: PERSON_S_RANK_QUALIFIED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: {
        personId: fixturePersonA,
        tournamentId: fixtureTournamentId,
        sourceQualificationReferenceHash: "d".repeat(64),
        entryHash: "e".repeat(64),
      },
    }),
  );
  const promoted = expectEnvelope(
    allocateSprint2EventEnvelope({
      sequence: sequence++,
      simulationId: fixtureSimulationId,
      importance: "historic",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: PERSON_S_RANK_PROMOTED_EVENT_TYPE,
      entities: baseEntities({
        personIds: [fixturePersonA],
        tournamentIds: [fixtureTournamentId],
      }),
      payload: {
        personId: fixturePersonA,
        tournamentId: fixtureTournamentId,
        sourceQualificationReferenceHash: "d".repeat(64),
        promotionResultHash: "f".repeat(64),
      },
    }),
  );
  return [...base, qualified, promoted];
}

export function buildEvt004ByeSequence(): Sprint2EventEnvelope[] {
  return [
    expectEnvelope(
      allocateSprint2EventEnvelope({
        sequence: 0,
        simulationId: fixtureSimulationId,
        importance: "normal",
        worldDate: fixtureWorldDate,
        origin: "simulation",
        sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
        eventType: TOURNAMENT_MATCH_BYE_EVENT_TYPE,
        entities: baseEntities({
          personIds: [fixturePersonA],
          matchIds: [fixtureMatchId],
          tournamentIds: [fixtureTournamentId],
        }),
        payload: {
          matchId: fixtureMatchId,
          tournamentId: fixtureTournamentId,
          advancedPersonId: fixturePersonA,
        },
      }),
    ),
  ];
}

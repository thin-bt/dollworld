import { describe, expect, it } from "vitest";
import {
  buildEvt001BattleCompletedSequence,
  buildEvt002RoundTournamentCompleteSequence,
  buildEvt003PromotionSequence,
  buildEvt004ByeSequence,
  buildEvt006SQualificationSequence,
} from "./fixtures/sprint2-fixed-seven.fixture.js";
import {
  allocateSprint2EventEnvelope,
  rejectDuplicateSprint2EventCandidate,
  validateSprint2EventSequence,
  validateSprint2TournamentEventOrdering,
} from "./tournament-event-envelope-sprint2.js";
import {
  fixtureMatchId,
  fixturePersonA,
  fixtureSimulationId,
  fixtureTournamentId,
  fixtureWorldDate,
} from "./fixtures/sprint2-fixed-seven.fixture.js";
import { SPRINT2_TOURNAMENT_EVENT_PROCESSOR } from "./constants.js";
import { TOURNAMENT_MATCH_RECORDED_EVENT_TYPE } from "./tournament-event-payloads.js";

describe("S02-011 tournament event envelope EVT-001..006", () => {
  it("EVT-001 battle completed ordering: battle.started -> battle.finished -> tournament.match_recorded", () => {
    const events = buildEvt001BattleCompletedSequence();
    const sequence = validateSprint2EventSequence(events);
    expect(sequence.ok).toBe(true);
    const ordering = validateSprint2TournamentEventOrdering(events);
    expect(ordering.ok).toBe(true);
    expect(events.map((event) => event.eventType)).toEqual([
      "battle.started",
      "battle.finished",
      "tournament.match_recorded",
    ]);
  });

  it("EVT-002 round/tournament complete ordering after match_recorded", () => {
    const events = buildEvt002RoundTournamentCompleteSequence();
    const ordering = validateSprint2TournamentEventOrdering(events);
    expect(ordering.ok).toBe(true);
    const matchRecordedIndex = events.findIndex(
      (event) => event.eventType === "tournament.match_recorded",
    );
    expect(events[matchRecordedIndex + 1]?.eventType).toBe("tournament.round_completed");
    expect(events[matchRecordedIndex + 2]?.eventType).toBe("tournament.finished");
    expect(events[matchRecordedIndex + 2]?.payload.completionKind).toBe("winner_determined");
  });

  it("EVT-003 promotion occurs after tournament.finished", () => {
    const events = buildEvt003PromotionSequence();
    const ordering = validateSprint2TournamentEventOrdering(events);
    expect(ordering.ok).toBe(true);
    const finishedIndex = events.findIndex((event) => event.eventType === "tournament.finished");
    expect(events[finishedIndex + 1]?.eventType).toBe("person.rank_promoted");
  });

  it("EVT-006 S conditions first met: person.s_rank_qualified -> person.s_rank_promoted", () => {
    const events = buildEvt006SQualificationSequence();
    const ordering = validateSprint2TournamentEventOrdering(events);
    expect(ordering.ok).toBe(true);
    const finishedIndex = events.findIndex((event) => event.eventType === "tournament.finished");
    expect(events[finishedIndex + 1]?.eventType).toBe("person.s_rank_qualified");
    expect(events[finishedIndex + 2]?.eventType).toBe("person.s_rank_promoted");
  });

  it("EVT-004 bye emits no battle events and emits tournament.match_bye", () => {
    const events = buildEvt004ByeSequence();
    const ordering = validateSprint2TournamentEventOrdering(events);
    expect(ordering.ok).toBe(true);
    expect(events.some((event) => event.eventType.startsWith("battle."))).toBe(false);
    expect(events[0]?.eventType).toBe("tournament.match_bye");
  });

  it("EVT-005 duplicate event candidate rejects", () => {
    const events = buildEvt001BattleCompletedSequence();
    const duplicateCandidate = allocateSprint2EventEnvelope({
      sequence: events.length,
      simulationId: fixtureSimulationId,
      importance: "normal",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
      entities: events[2]!.entities,
      payload: events[2]!.payload,
    });
    expect(duplicateCandidate.ok).toBe(true);
    if (!duplicateCandidate.ok) {
      throw new Error("expected candidate allocation to succeed");
    }
    const rejected = rejectDuplicateSprint2EventCandidate(events, duplicateCandidate.value);
    expect(rejected.ok).toBe(false);
    if (rejected.ok) {
      throw new Error("expected duplicate rejection");
    }
    expect(rejected.issues.some((issue) => issue.message.includes("duplicate"))).toBe(true);
  });

  it("rejects out-of-order battle completion sequence", () => {
    const events = buildEvt001BattleCompletedSequence();
    const broken = [events[0]!, events[2]!, events[1]!];
    const ordering = validateSprint2TournamentEventOrdering(broken);
    expect(ordering.ok).toBe(false);
  });

  it("requires tournamentIds on match_recorded payload fields", () => {
    const result = allocateSprint2EventEnvelope({
      sequence: 0,
      simulationId: fixtureSimulationId,
      importance: "normal",
      worldDate: fixtureWorldDate,
      origin: "simulation",
      sourceProcessor: SPRINT2_TOURNAMENT_EVENT_PROCESSOR,
      eventType: TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
      entities: {
        personIds: [fixturePersonA],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
        matchIds: [fixtureMatchId],
        tournamentIds: [fixtureTournamentId],
      },
      payload: {
        matchId: fixtureMatchId,
        tournamentId: fixtureTournamentId,
        storedBattleResultRefHash: "a".repeat(64),
      },
    });
    expect(result.ok).toBe(true);
  });
});

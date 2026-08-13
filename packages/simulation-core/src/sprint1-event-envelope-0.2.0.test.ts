/**
 * Focused tests for Sprint 1 EventEnvelope 0.2.0 (03 mini-spec §7 / S01-008).
 */
import { describe, expect, it } from "vitest";
import {
  asPersonId,
  asSimulationId,
  createInitialWorldDate,
  createPersonInitializedEvent,
  createWorldStartedEvent,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  eventIdFromSequence,
  EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
  promoteProvisionalEventToSprint1,
  allocateWeeklyTrainingEventCandidates,
  validateSprint1EventEnvelope,
  type ValidationResult,
  WEEKLY_TRAINING_PROCESSOR_ID,
} from "./index.js";

const provisionalSimulationId = asSimulationId("simulation_provisional00001");
const finalSimulationId = asSimulationId("simulation_a1b2c3d4e5f60718");

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

describe("Sprint1 EventEnvelope 0.2.0", () => {
  it("promote keeps sequence and eventId unchanged", () => {
    const provisional = createPersonInitializedEvent({
      simulationId: provisionalSimulationId,
      sequence: 7,
      importance: "normal",
      sourceProcessor: "initial-world",
      payload: { personId: asPersonId("person_000001") },
    });

    const promoted = expectOk(promoteProvisionalEventToSprint1(provisional, finalSimulationId));

    expect(promoted.sequence).toBe(7);
    expect(promoted.eventId).toBe(provisional.eventId);
    expect(promoted.eventId).toBe(eventIdFromSequence(7));
    expect(promoted.simulationId).toBe(finalSimulationId);
    expect(promoted.schemaVersion).toBe(EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1);
    expect(promoted.sourceProcessor).toBe("initial-world");
    expect(promoted.eventType).toBe("person.initialized");
  });

  it("promote sets matchIds to an empty array", () => {
    const provisional = createWorldStartedEvent({
      simulationId: provisionalSimulationId,
      sequence: 0,
      importance: "major",
      sourceProcessor: "initial-world",
    });

    const promoted = expectOk(promoteProvisionalEventToSprint1(provisional, finalSimulationId));

    expect(promoted.entities.matchIds).toEqual([]);
    expect(promoted.entities.personIds).toEqual([]);
  });

  it("allocateWeeklyTrainingEventCandidates assigns consecutive sequences", () => {
    const worldDate = createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG);
    const personA = asPersonId("person_0000000000000001");
    const personB = asPersonId("person_0000000000000002");

    const result = expectOk(
      allocateWeeklyTrainingEventCandidates({
        candidates: [
          {
            eventType: "training.action_selected",
            personId: personA,
            absoluteWeek: worldDate.absoluteWeek,
            payload: { action: "practice" },
          },
          {
            eventType: "training.stat_growth_applied",
            personId: personB,
            absoluteWeek: worldDate.absoluteWeek,
            payload: { stat: "strength", delta: 1 },
          },
        ],
        startSequence: 42,
        simulationId: finalSimulationId,
        worldDate,
        sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
      }),
    );

    expect(result.nextSequence).toBe(44);
    expect(result.envelopes).toHaveLength(2);
    expect(result.envelopes[0]?.sequence).toBe(42);
    expect(result.envelopes[0]?.eventId).toBe(eventIdFromSequence(42));
    expect(result.envelopes[1]?.sequence).toBe(43);
    expect(result.envelopes[1]?.eventId).toBe(eventIdFromSequence(43));
    expect(result.envelopes[0]?.sourceProcessor).toBe(WEEKLY_TRAINING_PROCESSOR_ID);
    expect(result.envelopes[0]?.entities.personIds).toEqual([personA]);
    expect(result.envelopes[0]?.entities.matchIds).toEqual([]);
    expect(result.envelopes[0]?.origin).toBe("simulation");
    expect(result.envelopes[0]?.importance).toBe("normal");
  });

  it("allocateWeeklyTrainingEventCandidates rejects absoluteWeek mismatch", () => {
    const worldDate = createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG);

    const result = allocateWeeklyTrainingEventCandidates({
      candidates: [
        {
          eventType: "training.rest_applied",
          personId: asPersonId("person_0000000000000001"),
          absoluteWeek: worldDate.absoluteWeek + 1,
          payload: {},
        },
      ],
      startSequence: 0,
      simulationId: finalSimulationId,
      worldDate,
      sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.issues.some((issue) => issue.path.includes("absoluteWeek"))).toBe(true);
  });

  it("requires valid unique canonically ordered matchIds in 0.2.0", () => {
    const base = expectOk(
      promoteProvisionalEventToSprint1(
        createWorldStartedEvent({
          simulationId: provisionalSimulationId,
          sequence: 0,
          importance: "major",
          sourceProcessor: "initial-world",
        }),
        finalSimulationId,
      ),
    );
    const missing = {
      ...base,
      entities: {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
    };
    const duplicate = {
      ...base,
      entities: {
        ...base.entities,
        matchIds: ["match_000000000002", "match_000000000002"],
      },
    };
    const unsorted = {
      ...base,
      entities: {
        ...base.entities,
        matchIds: ["match_000000000002", "match_000000000001"],
      },
    };
    const malformed = {
      ...base,
      entities: { ...base.entities, matchIds: ["match_bad"] },
    };

    expect(validateSprint1EventEnvelope(base).ok).toBe(true);
    expect(validateSprint1EventEnvelope(missing).ok).toBe(false);
    expect(validateSprint1EventEnvelope(duplicate).ok).toBe(false);
    expect(validateSprint1EventEnvelope(unsorted).ok).toBe(false);
    expect(validateSprint1EventEnvelope(malformed).ok).toBe(false);
  });
});

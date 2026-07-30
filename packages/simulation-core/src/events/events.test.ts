import { describe, expect, it } from "vitest";
import {
  EVENT_ENVELOPE_SCHEMA_VERSION,
  MINIMUM_RANK,
  ABILITY_KEYS,
  APTITUDE_KEYS,
  asFamilyId,
  asLineageId,
  asPersonId,
  asRelationshipId,
  asSimulationId,
  convertWorldCalendarTransitions,
  createFamilyInitializedEvent,
  createInitialWorldCalendarState,
  createInitialWorldDate,
  createLineageInitializedEvent,
  createPersonInitializedEvent,
  createRelationshipInitializedEvent,
  createSimulationCompletedEvent,
  createValidationFailedEvent,
  createWorldDate,
  createWorldStartedEvent,
  eventIdFromSequence,
  eventsToJsonl,
  stepWeeks,
  validateEventEnvelope,
  validateEventSequence,
  type AbilityScores,
  type AptitudeScores,
  type EventEnvelope,
  type LivingTraineePerson,
  type Person,
  type WorldCalendarTransition,
} from "../index.js";

const simulationId = asSimulationId("simulation_a1b2c3d4e5f60718");

const emptyTriple = {
  surfaceValue: 10,
  expressedGeneticValue: 10,
  latentGeneticValue: 10,
};

const abilities: AbilityScores = Object.fromEntries(
  ABILITY_KEYS.map((key) => [key, emptyTriple]),
) as AbilityScores;

const aptitudes: AptitudeScores = Object.fromEntries(
  APTITUDE_KEYS.map((key) => [key, emptyTriple]),
) as AptitudeScores;

function livingTrainee(age: number): LivingTraineePerson {
  return {
    personId: asPersonId("person_000001"),
    givenName: "Arden",
    familyName: "Ashford",
    displayName: "Arden・Ashford",
    nameDataVersion: "NAMES-0.1.2",
    sex: "male",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "trainee",
    birthYear: 1 - age,
    currentAge: age,
    familyId: asFamilyId("family_000001"),
    qualifiedMaster: false,
    abilities,
    aptitudes,
  };
}

describe("eventIdFromSequence", () => {
  it("maps sequence 0 to event_000000001", () => {
    expect(eventIdFromSequence(0)).toBe("event_000000001");
  });

  it("maps sequence 1 to event_000000002", () => {
    expect(eventIdFromSequence(1)).toBe("event_000000002");
  });

  it("rejects negative, non-integer, and unsafe sequences", () => {
    expect(() => eventIdFromSequence(-1)).toThrow(/sequence/);
    expect(() => eventIdFromSequence(1.5)).toThrow(/sequence/);
    expect(() => eventIdFromSequence(Number.MAX_SAFE_INTEGER + 1)).toThrow(/sequence/);
  });
});

describe("initialization factories", () => {
  it("creates world.started at world year 1 April week 1 without year_started", () => {
    const event = createWorldStartedEvent({
      simulationId,
      sequence: 0,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
    expect(event.eventType).toBe("world.started");
    expect(event.origin).toBe("initialization");
    expect(event.schemaVersion).toBe(EVENT_ENVELOPE_SCHEMA_VERSION);
    expect(event.eventId).toBe("event_000000001");
    expect(event.worldDate).toEqual(createInitialWorldDate());
    expect(event.entities).toEqual({
      personIds: [],
      familyIds: [],
      lineageIds: [],
      relationshipIds: [],
    });
  });

  it("creates initialization events with entity references", () => {
    const family = createFamilyInitializedEvent({
      simulationId,
      sequence: 1,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { familyId: asFamilyId("family_000001") },
    });
    expect(family.eventType).toBe("family.initialized");
    expect(family.entities.familyIds).toEqual([asFamilyId("family_000001")]);

    const person = createPersonInitializedEvent({
      simulationId,
      sequence: 2,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { personId: asPersonId("person_000001") },
    });
    expect(person.eventType).toBe("person.initialized");
    expect(person.entities.personIds).toEqual([asPersonId("person_000001")]);
  });
});

describe("convertWorldCalendarTransitions", () => {
  it("converts year boundary transitions with fixed order and dates", () => {
    const person = livingTrainee(15);
    const stepped = stepWeeks(createInitialWorldCalendarState([person]), 48);
    const events = convertWorldCalendarTransitions({
      transitions: stepped.transitions,
      simulationId,
      worldDate: stepped.state.worldDate,
      startSequence: 0,
    });

    expect(events[0]?.eventType).toBe("world.year_stats_finalized");
    expect(events[0]?.payload).toEqual({ worldYear: 1 });
    expect(events[0]?.worldDate).toEqual({
      year: 1,
      month: 3,
      weekOfMonth: 4,
      absoluteWeek: 47,
    });
    expect(events[0]?.entities).toEqual({
      personIds: [],
      familyIds: [],
      lineageIds: [],
      relationshipIds: [],
    });

    expect(events[1]?.eventType).toBe("world.year_started");
    expect(events[1]?.payload).toEqual({ worldYear: 2 });
    expect(events[1]?.worldDate).toEqual(stepped.state.worldDate);

    const agedIndex = events.findIndex((e) => e.eventType === "person.aged");
    const careerIndex = events.findIndex((e) => e.eventType === "person.career_status_changed");
    const debutIndex = events.findIndex((e) => e.eventType === "person.debuted");
    expect(agedIndex).toBeGreaterThan(1);
    expect(careerIndex).toBeGreaterThan(agedIndex);
    expect(debutIndex).toBe(careerIndex + 1);

    const debut = events[debutIndex]!;
    expect(debut.eventType).toBe("person.debuted");
    expect(debut.payload).toEqual({
      previousCareerStatus: "trainee",
      nextCareerStatus: "active_competitor",
      rank: MINIMUM_RANK,
    });
    expect(debut.entities.personIds).toEqual([person.personId]);
    expect("previousRank" in debut.payload).toBe(false);

    expect(events.every((e, i) => e.sequence === i)).toBe(true);
    expect(events[0]?.eventId).toBe("event_000000001");
  });

  it("preserves career_status_changed before force_retired", () => {
    const active: Person = {
      personId: asPersonId("person_000002"),
      givenName: "Bryn",
      familyName: "Ashford",
      displayName: "Bryn・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "active_competitor",
      birthYear: 1 - 41,
      currentAge: 41,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      currentRank: "B",
      highestRank: "A",
      abilities,
      aptitudes,
    };
    const stepped = stepWeeks(createInitialWorldCalendarState([active]), 48);
    const events = convertWorldCalendarTransitions({
      transitions: stepped.transitions,
      simulationId,
      worldDate: stepped.state.worldDate,
      startSequence: 10,
    });

    const careerIndex = events.findIndex((e) => e.eventType === "person.career_status_changed");
    const retireIndex = events.findIndex((e) => e.eventType === "person.force_retired");
    expect(careerIndex).toBeGreaterThan(-1);
    expect(retireIndex).toBe(careerIndex + 1);
    expect(events[retireIndex]?.payload).toMatchObject({
      retirementRank: "B",
      highestRank: "A",
      nextCareerStatus: "retired",
    });
    expect(events[0]?.sequence).toBe(10);
    expect(events[0]?.eventId).toBe(eventIdFromSequence(10));
  });

  it("does not mutate input transitions", () => {
    const transitions: WorldCalendarTransition[] = [
      { kind: "year_stats_finalized", worldYear: 1 },
      { kind: "year_started", worldYear: 2 },
    ];
    const snapshot = structuredClone(transitions);
    convertWorldCalendarTransitions({
      transitions,
      simulationId,
      worldDate: createWorldDate({ year: 2, month: 4, weekOfMonth: 1 }),
      startSequence: 0,
    });
    expect(transitions).toEqual(snapshot);
  });

  it("rejects non-April week 1 for year-start derived events", () => {
    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_started", worldYear: 2 }],
        simulationId,
        worldDate: createWorldDate({ year: 2, month: 5, weekOfMonth: 1 }),
        startSequence: 0,
      }),
    ).toThrow(/April week 1/);
  });

  it("is deterministic for the same input", () => {
    const person = livingTrainee(15);
    const stepped = stepWeeks(createInitialWorldCalendarState([person]), 48);
    const input = {
      transitions: stepped.transitions,
      simulationId,
      worldDate: stepped.state.worldDate,
      startSequence: 0,
    };
    expect(convertWorldCalendarTransitions(input)).toEqual(convertWorldCalendarTransitions(input));
  });
});

describe("validateEventSequence and references", () => {
  it("rejects eventId/sequence mismatch, gaps, and reverse order", () => {
    const ok = createWorldStartedEvent({
      simulationId,
      sequence: 0,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
    const mismatched: EventEnvelope = {
      ...ok,
      eventId: eventIdFromSequence(99),
    };
    expect(() => validateEventEnvelope(mismatched)).toThrow(/eventId/);

    const second = createWorldStartedEvent({
      simulationId,
      sequence: 2,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
    expect(() => validateEventSequence([ok, second])).toThrow(/sequence/);

    const one = createWorldStartedEvent({
      simulationId,
      sequence: 1,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
    expect(() => validateEventSequence([one, ok])).toThrow(/sequence/);
  });

  it("rejects unknown and duplicate entity IDs", () => {
    const person = createPersonInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { personId: asPersonId("person_000001") },
    });

    expect(() =>
      validateEventEnvelope(person, {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      }),
    ).toThrow(/unknown ID/);

    const dup = {
      ...person,
      entities: {
        ...person.entities,
        personIds: [asPersonId("person_000001"), asPersonId("person_000001")],
      },
    };
    expect(() => validateEventEnvelope(dup)).toThrow(/duplicate/);
  });

  it("accepts known IDs across entity kinds", () => {
    const familyId = asFamilyId("family_000001");
    const personId = asPersonId("person_000001");
    const lineageId = asLineageId("lineage_000001");
    const relationshipId = asRelationshipId("relationship_000001");

    validateEventEnvelope(
      createFamilyInitializedEvent({
        simulationId,
        sequence: 0,
        importance: "normal",
        sourceProcessor: "world-initialization",
        payload: { familyId },
      }),
      {
        personIds: [],
        familyIds: [familyId],
        lineageIds: [],
        relationshipIds: [],
      },
    );
    validateEventEnvelope(
      createPersonInitializedEvent({
        simulationId,
        sequence: 1,
        importance: "normal",
        sourceProcessor: "world-initialization",
        payload: { personId },
      }),
      {
        personIds: [personId],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
    );
    validateEventEnvelope(
      createLineageInitializedEvent({
        simulationId,
        sequence: 2,
        importance: "normal",
        sourceProcessor: "world-initialization",
        payload: { lineageId },
      }),
      {
        personIds: [],
        familyIds: [],
        lineageIds: [lineageId],
        relationshipIds: [],
      },
    );
    validateEventEnvelope(
      createRelationshipInitializedEvent({
        simulationId,
        sequence: 3,
        importance: "normal",
        sourceProcessor: "world-initialization",
        payload: { relationshipId },
      }),
      {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [relationshipId],
      },
    );
  });
});

describe("eventsToJsonl", () => {
  it("writes canonical JSONL with trailing LF and empty string for zero events", () => {
    expect(eventsToJsonl([])).toBe("");

    const events = [
      createWorldStartedEvent({
        simulationId,
        sequence: 0,
        importance: "historic",
        sourceProcessor: "world-initialization",
      }),
      createPersonInitializedEvent({
        simulationId,
        sequence: 1,
        importance: "normal",
        sourceProcessor: "world-initialization",
        payload: { personId: asPersonId("person_000001") },
      }),
    ];
    const jsonl = eventsToJsonl(events, {
      knownIds: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
    });
    expect(jsonl.endsWith("\n")).toBe(true);
    const lines = jsonl.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).eventType).toBe("world.started");
    expect(JSON.parse(lines[1]!).sequence).toBe(1);

    expect(
      eventsToJsonl(events, {
        knownIds: {
          personIds: [asPersonId("person_000001")],
          familyIds: [],
          lineageIds: [],
          relationshipIds: [],
        },
      }),
    ).toBe(jsonl);
  });

  it("does not mutate input events", () => {
    const events = [
      createWorldStartedEvent({
        simulationId,
        sequence: 0,
        importance: "historic",
        sourceProcessor: "world-initialization",
      }),
    ];
    const snapshot = structuredClone(events);
    eventsToJsonl(events);
    expect(events).toEqual(snapshot);
  });
});

describe("factory fixed origin and worldDate", () => {
  const common = {
    simulationId,
    importance: "normal" as const,
    sourceProcessor: "test",
  };

  it("locks initialization factories to year 1 April week 1 and initialization origin", () => {
    const started = createWorldStartedEvent({ ...common, sequence: 0 });
    expect(started.origin).toBe("initialization");
    expect(started.worldDate).toEqual(createInitialWorldDate());

    const lineage = createLineageInitializedEvent({
      ...common,
      sequence: 1,
      payload: { lineageId: asLineageId("lineage_000001") },
    });
    expect(lineage.eventType).toBe("lineage.initialized");
    expect(lineage.origin).toBe("initialization");
    expect(lineage.worldDate).toEqual(createInitialWorldDate());

    const relationship = createRelationshipInitializedEvent({
      ...common,
      sequence: 2,
      payload: { relationshipId: asRelationshipId("relationship_000001") },
    });
    expect(relationship.eventType).toBe("relationship.initialized");
    expect(relationship.origin).toBe("initialization");
  });

  it("locks simulation.completed and validation.failed origins", () => {
    const date = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    const completed = createSimulationCompletedEvent({
      ...common,
      sequence: 0,
      worldDate: date,
      payload: { finalAbsoluteWeek: date.absoluteWeek },
    });
    expect(completed.origin).toBe("simulation");
    expect(completed.eventType).toBe("simulation.completed");

    const failed = createValidationFailedEvent({
      ...common,
      sequence: 1,
      worldDate: date,
      payload: { reason: "invariant broken" },
    });
    expect(failed.origin).toBe("validation");
    expect(failed.eventType).toBe("validation.failed");
  });

  it("rejects empty simulationId, sourceProcessor, reason, and mismatched finalAbsoluteWeek", () => {
    expect(() =>
      createWorldStartedEvent({
        simulationId: asSimulationId(""),
        sequence: 0,
        importance: "normal",
        sourceProcessor: "test",
      }),
    ).toThrow(/simulationId/);

    expect(() =>
      createWorldStartedEvent({
        simulationId,
        sequence: 0,
        importance: "normal",
        sourceProcessor: "",
      }),
    ).toThrow(/sourceProcessor/);

    expect(() =>
      createWorldStartedEvent({
        simulationId,
        sequence: 0,
        importance: "urgent" as "normal",
        sourceProcessor: "test",
      }),
    ).toThrow(/importance/);

    const date = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    expect(() =>
      createSimulationCompletedEvent({
        simulationId,
        sequence: 0,
        importance: "normal",
        sourceProcessor: "test",
        worldDate: date,
        payload: { finalAbsoluteWeek: date.absoluteWeek + 1 },
      }),
    ).toThrow(/finalAbsoluteWeek/);

    expect(() =>
      createValidationFailedEvent({
        simulationId,
        sequence: 0,
        importance: "major",
        sourceProcessor: "test",
        worldDate: date,
        payload: { reason: "" },
      }),
    ).toThrow(/reason/);
  });
});

describe("validateEventEnvelope strict checks", () => {
  function baseWorldStarted(): EventEnvelope {
    return createWorldStartedEvent({
      simulationId,
      sequence: 0,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
  }

  it("rejects invalid importance, origin, tournamentIds, and matchIds", () => {
    const event = baseWorldStarted();
    expect(() => validateEventEnvelope({ ...event, importance: "urgent" as "normal" })).toThrow(
      /importance/,
    );
    expect(() => validateEventEnvelope({ ...event, origin: "manual" as "initialization" })).toThrow(
      /origin/,
    );
    expect(() =>
      validateEventEnvelope({
        ...event,
        entities: { ...event.entities, tournamentIds: [] },
      }),
    ).toThrow(/tournamentIds/);
    expect(() =>
      validateEventEnvelope({
        ...event,
        entities: { ...event.entities, matchIds: [] },
      }),
    ).toThrow(/matchIds/);
  });

  it("rejects invalid ranks, career statuses, and person.aged in May", () => {
    const april = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    const aged: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.aged",
      importance: "minor",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: createWorldDate({ year: 2, month: 5, weekOfMonth: 1 }),
      entities: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousAge: 15,
        nextAge: 16,
        birthYear: -14,
        worldYear: 2,
      },
    };
    expect(() => validateEventEnvelope(aged)).toThrow(/April week 1/);

    const debut: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.debuted",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: april,
      entities: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousCareerStatus: "trainee",
        nextCareerStatus: "active_competitor",
        rank: "Z" as typeof MINIMUM_RANK,
      },
    };
    expect(() => validateEventEnvelope(debut)).toThrow(/MINIMUM_RANK/);

    const career: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.career_status_changed",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: april,
      entities: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousCareerStatus: "hero" as "child",
        nextCareerStatus: "trainee",
      },
    };
    expect(() => validateEventEnvelope(career)).toThrow(/CareerStatus/);
  });

  it("rejects invalid worldYear values and payload/entity ID mismatches", () => {
    const stats: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "world.year_stats_finalized",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: createWorldDate({ year: 1, month: 3, weekOfMonth: 4 }),
      entities: {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: { worldYear: Number.NaN },
    };
    expect(() => validateEventEnvelope(stats)).toThrow(/worldYear/);

    const family = createFamilyInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { familyId: asFamilyId("family_000001") },
    });
    const mismatchedFamily: EventEnvelope = {
      schemaVersion: family.schemaVersion,
      eventId: family.eventId,
      simulationId: family.simulationId,
      sequence: family.sequence,
      eventType: "family.initialized",
      importance: family.importance,
      origin: family.origin,
      sourceProcessor: family.sourceProcessor,
      worldDate: family.worldDate,
      entities: family.entities,
      payload: { familyId: asFamilyId("family_000002") },
    };
    expect(() => validateEventEnvelope(mismatchedFamily)).toThrow(/match/);
  });

  it("rejects person events with zero or multiple personIds", () => {
    const april = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    const aged: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.aged",
      importance: "minor",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: april,
      entities: {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousAge: 15,
        nextAge: 16,
        birthYear: -14,
        worldYear: 2,
      },
    };
    expect(() => validateEventEnvelope(aged)).toThrow(/exactly one personId/);

    expect(() =>
      validateEventEnvelope({
        ...aged,
        entities: {
          personIds: [asPersonId("person_000001"), asPersonId("person_000002")],
          familyIds: [],
          lineageIds: [],
          relationshipIds: [],
        },
      }),
    ).toThrow(/exactly one personId/);
  });

  it("rejects unknown IDs for each entity kind and duplicate IDs", () => {
    const person = createPersonInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { personId: asPersonId("person_000001") },
    });
    expect(() =>
      validateEventEnvelope(person, {
        personIds: [asPersonId("person_999999")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      }),
    ).toThrow(/unknown ID/);

    const family = createFamilyInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { familyId: asFamilyId("family_000001") },
    });
    expect(() =>
      validateEventEnvelope(family, {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      }),
    ).toThrow(/unknown ID/);

    const lineage = createLineageInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { lineageId: asLineageId("lineage_000001") },
    });
    expect(() =>
      validateEventEnvelope(lineage, {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      }),
    ).toThrow(/unknown ID/);

    const relationship = createRelationshipInitializedEvent({
      simulationId,
      sequence: 0,
      importance: "normal",
      sourceProcessor: "world-initialization",
      payload: { relationshipId: asRelationshipId("relationship_000001") },
    });
    expect(() =>
      validateEventEnvelope(relationship, {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      }),
    ).toThrow(/unknown ID/);

    expect(() =>
      validateEventEnvelope({
        ...person,
        entities: {
          ...person.entities,
          personIds: [asPersonId("person_000001"), asPersonId("person_000001")],
        },
      }),
    ).toThrow(/duplicate/);
  });
});

describe("convertWorldCalendarTransitions consistency", () => {
  it("rejects year_started / person_aged worldYear mismatches and bad age math", () => {
    const worldDate = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_started", worldYear: 3 }],
        simulationId,
        worldDate,
        startSequence: 0,
      }),
    ).toThrow(/worldYear/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [
          {
            kind: "person_aged",
            personId: asPersonId("person_000001"),
            previousAge: 15,
            nextAge: 16,
            birthYear: -14,
            worldYear: 3,
          },
        ],
        simulationId,
        worldDate,
        startSequence: 0,
      }),
    ).toThrow(/worldYear/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [
          {
            kind: "person_aged",
            personId: asPersonId("person_000001"),
            previousAge: 15,
            nextAge: 99,
            birthYear: -14,
            worldYear: 2,
          },
        ],
        simulationId,
        worldDate,
        startSequence: 0,
      }),
    ).toThrow(/nextAge/);
  });

  it("rejects startSequence that overflows safe integer range", () => {
    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [
          { kind: "year_stats_finalized", worldYear: 1 },
          { kind: "year_started", worldYear: 2 },
        ],
        simulationId,
        worldDate: createWorldDate({ year: 2, month: 4, weekOfMonth: 1 }),
        startSequence: Number.MAX_SAFE_INTEGER,
      }),
    ).toThrow(/safe integer/);
  });
});

describe("payload plain-object and key rules", () => {
  function started(): EventEnvelope {
    return createWorldStartedEvent({
      simulationId,
      sequence: 0,
      importance: "historic",
      sourceProcessor: "world-initialization",
    });
  }

  function withPayload(event: EventEnvelope, payload: unknown): EventEnvelope {
    return Object.assign({}, event, { payload }) as EventEnvelope;
  }

  it("rejects null, array, Date, empty worldId, and extra keys", () => {
    const base = started();
    expect(() => validateEventEnvelope(withPayload(base, null))).toThrow(/null/);
    expect(() => validateEventEnvelope(withPayload(base, []))).toThrow(/array/);
    expect(() => validateEventEnvelope(withPayload(base, new Date(0)))).toThrow(/Date/);
    expect(() => validateEventEnvelope(withPayload(base, { worldId: "" }))).toThrow(/worldId/);
    expect(() => validateEventEnvelope(withPayload(base, { retirementRank: "C" }))).toThrow(
      /retirementRank/,
    );
  });

  it("rejects missing required keys and extra keys per event type via JSONL too", () => {
    const april = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    const agedBase: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.aged",
      importance: "minor",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: april,
      entities: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousAge: 15,
        nextAge: 16,
        birthYear: -14,
        worldYear: 2,
      },
    };
    const agedMissing = withPayload(agedBase, {
      previousAge: 15,
      nextAge: 16,
      birthYear: -14,
    });
    expect(() => validateEventEnvelope(agedMissing)).toThrow(/worldYear/);
    expect(() => eventsToJsonl([agedMissing])).toThrow(/worldYear/);

    const statsBase: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "world.year_stats_finalized",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: createWorldDate({ year: 1, month: 3, weekOfMonth: 4 }),
      entities: {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: { worldYear: 1 },
    };
    expect(() =>
      validateEventEnvelope(withPayload(statsBase, { worldYear: 1, note: "x" })),
    ).toThrow(/note/);
  });
});

describe("world.year_started from world year 2", () => {
  it("rejects year-1 envelopes and transitions, allows year 2 April week 1", () => {
    const year1: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "world.year_started",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: createInitialWorldDate(),
      entities: {
        personIds: [],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: { worldYear: 1 },
    };
    expect(() => validateEventEnvelope(year1)).toThrow(/>= 2/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_started", worldYear: 1 }],
        simulationId,
        worldDate: createInitialWorldDate(),
        startSequence: 0,
      }),
    ).toThrow(/>= 2/);

    const events = convertWorldCalendarTransitions({
      transitions: [{ kind: "year_started", worldYear: 2 }],
      simulationId,
      worldDate: createWorldDate({ year: 2, month: 4, weekOfMonth: 1 }),
      startSequence: 0,
    });
    expect(events[0]?.eventType).toBe("world.year_started");
    expect(events[0]?.payload).toEqual({ worldYear: 2 });
  });
});

describe("year_stats_finalized post-step WorldDate alignment", () => {
  it("allows Y=1 with post-step year 2 April week 1 and rejects mismatches", () => {
    const ok = convertWorldCalendarTransitions({
      transitions: [{ kind: "year_stats_finalized", worldYear: 1 }],
      simulationId,
      worldDate: createWorldDate({ year: 2, month: 4, weekOfMonth: 1 }),
      startSequence: 0,
    });
    expect(ok[0]?.worldDate).toEqual({
      year: 1,
      month: 3,
      weekOfMonth: 4,
      absoluteWeek: 47,
    });

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_stats_finalized", worldYear: 1 }],
        simulationId,
        worldDate: createWorldDate({ year: 99, month: 5, weekOfMonth: 1 }),
        startSequence: 0,
      }),
    ).toThrow(/April week 1/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_stats_finalized", worldYear: 1 }],
        simulationId,
        worldDate: createWorldDate({ year: 3, month: 4, weekOfMonth: 1 }),
        startSequence: 0,
      }),
    ).toThrow(/worldYear \+ 1/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [{ kind: "year_stats_finalized", worldYear: Number.MAX_SAFE_INTEGER }],
        simulationId,
        worldDate: createWorldDate({ year: 2, month: 4, weekOfMonth: 1 }),
        startSequence: 0,
      }),
    ).toThrow(/safe integer/);
  });
});

describe("person.debuted MINIMUM_RANK", () => {
  it("allows MINIMUM_RANK and rejects other ranks on envelope and transition", () => {
    const april = createWorldDate({ year: 2, month: 4, weekOfMonth: 1 });
    const ok: EventEnvelope = {
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
      eventId: eventIdFromSequence(0),
      simulationId,
      sequence: 0,
      eventType: "person.debuted",
      importance: "normal",
      origin: "simulation",
      sourceProcessor: "world-calendar",
      worldDate: april,
      entities: {
        personIds: [asPersonId("person_000001")],
        familyIds: [],
        lineageIds: [],
        relationshipIds: [],
      },
      payload: {
        previousCareerStatus: "trainee",
        nextCareerStatus: "active_competitor",
        rank: MINIMUM_RANK,
      },
    };
    validateEventEnvelope(ok);

    expect(() =>
      validateEventEnvelope({
        ...ok,
        payload: {
          previousCareerStatus: "trainee",
          nextCareerStatus: "active_competitor",
          rank: "S",
        },
      }),
    ).toThrow(/MINIMUM_RANK/);

    expect(() =>
      convertWorldCalendarTransitions({
        transitions: [
          {
            kind: "person_debuted",
            personId: asPersonId("person_000001"),
            rank: "S",
            previousCareerStatus: "trainee",
            nextCareerStatus: "active_competitor",
          },
        ],
        simulationId,
        worldDate: april,
        startSequence: 0,
      }),
    ).toThrow(/MINIMUM_RANK/);
  });
});

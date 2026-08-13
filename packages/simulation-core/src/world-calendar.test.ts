import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  MINIMUM_RANK,
  RANK_ORDER,
  applyYearStart,
  asFamilyId,
  asPersonId,
  createInitialWorldCalendarState,
  createWorldDate,
  deriveAgeEligibility,
  stepOneWeek,
  stepWeeks,
  type AbilityScores,
  type AptitudeScores,
  type LivingActiveCompetitorPerson,
  type LivingChildPerson,
  type LivingPerson,
  type LivingRetiredPerson,
  type LivingTraineePerson,
  type Person,
  type WorldCalendarTransition,
} from "./index.js";

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

function livingChild(
  overrides: Partial<LivingChildPerson> & Pick<LivingChildPerson, "personId">,
): LivingChildPerson {
  const age = overrides.currentAge ?? 0;
  const birthYear = overrides.birthYear ?? 1 - age;
  return {
    givenName: "Arden",
    familyName: "Ashford",
    displayName: "Arden・Ashford",
    nameDataVersion: "NAMES-0.1.2",
    sex: "male",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "child",
    familyId: asFamilyId("family_000001"),
    qualifiedMaster: false,
    abilities,
    aptitudes,
    ...overrides,
    birthYear,
    currentAge: age,
  };
}

function livingTrainee(
  overrides: Partial<LivingTraineePerson> & Pick<LivingTraineePerson, "personId" | "currentAge">,
): LivingTraineePerson {
  const age = overrides.currentAge;
  const birthYear = overrides.birthYear ?? 1 - age;
  return {
    givenName: "Bryn",
    familyName: "Ashford",
    displayName: "Bryn・Ashford",
    nameDataVersion: "NAMES-0.1.2",
    sex: "female",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "trainee",
    familyId: asFamilyId("family_000001"),
    qualifiedMaster: false,
    abilities,
    aptitudes,
    ...overrides,
    birthYear,
    currentAge: age,
  };
}

function livingActive(
  overrides: Partial<LivingActiveCompetitorPerson> &
    Pick<LivingActiveCompetitorPerson, "personId" | "currentAge" | "currentRank" | "highestRank">,
): LivingActiveCompetitorPerson {
  const age = overrides.currentAge;
  const birthYear = overrides.birthYear ?? 1 - age;
  return {
    givenName: "Cade",
    familyName: "Ashford",
    displayName: "Cade・Ashford",
    nameDataVersion: "NAMES-0.1.2",
    sex: "male",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    familyId: asFamilyId("family_000001"),
    qualifiedMaster: false,
    abilities,
    aptitudes,
    ...overrides,
    birthYear,
    currentAge: age,
  };
}

function countByKind(
  transitions: readonly WorldCalendarTransition[],
  kind: WorldCalendarTransition["kind"],
): number {
  return transitions.filter((t) => t.kind === kind).length;
}

describe("MINIMUM_RANK", () => {
  it("equals RANK_ORDER[0]", () => {
    expect(RANK_ORDER).toEqual(["F", "E", "D", "C", "B", "A", "S"]);
    expect(MINIMUM_RANK).toBe(RANK_ORDER[0]);
  });
});

describe("initial world calendar boundary", () => {
  it("does not age or emit year_started at world year 1 January week 1", () => {
    const child = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    const state = createInitialWorldCalendarState([child]);
    expect(state.worldDate).toEqual({ year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 0 });
    expect((state.persons[0] as LivingChildPerson).currentAge).toBe(5);

    const stepped = stepOneWeek(state);
    expect(countByKind(stepped.transitions, "year_started")).toBe(0);
    expect(countByKind(stepped.transitions, "person_aged")).toBe(0);
    expect(countByKind(stepped.transitions, "year_stats_finalized")).toBe(0);
  });

  it("first mass aging is world year 2 January week 1 after 48 steps", () => {
    const child = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    const initial = createInitialWorldCalendarState([child]);
    const result = stepWeeks(initial, 48);

    expect(result.state.worldDate).toEqual({ year: 2, month: 1, weekOfMonth: 1, absoluteWeek: 48 });
    expect(countByKind(result.transitions, "year_started")).toBe(1);
    expect(result.transitions.some((t) => t.kind === "year_started" && t.worldYear === 2)).toBe(
      true,
    );
    expect(countByKind(result.transitions, "year_stats_finalized")).toBe(1);
    expect(
      result.transitions.some((t) => t.kind === "year_stats_finalized" && t.worldYear === 1),
    ).toBe(true);

    const aged = result.state.persons[0] as LivingChildPerson;
    expect(aged.currentAge).toBe(6);
    expect(aged.birthYear).toBe(1 - 5);
  });
});

describe("aging", () => {
  it("matches birthYear=1-A for initial age A", () => {
    for (const age of [0, 1, 7, 15, 41, 70]) {
      const person = livingChild({ personId: asPersonId("person_000010"), currentAge: age });
      expect(person.birthYear).toBe(1 - age);
      expect(person.currentAge).toBe(1 - person.birthYear);
    }
  });

  it("ages all eligible persons by 1 at world year 2 January week 1", () => {
    const persons: Person[] = [
      livingChild({ personId: asPersonId("person_000001"), currentAge: 3 }),
      livingTrainee({ personId: asPersonId("person_000002"), currentAge: 10 }),
      livingActive({
        personId: asPersonId("person_000003"),
        currentAge: 20,
        currentRank: "C",
        highestRank: "B",
      }),
    ];
    const result = stepWeeks(createInitialWorldCalendarState(persons), 48);
    expect(result.state.persons.map((p) => (p as LivingPerson).currentAge)).toEqual([4, 11, 21]);
  });

  it("recalculates age as targetYear - birthYear when advancing multiple years", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    const once = applyYearStart([person], 4);
    expect((once.persons[0] as LivingChildPerson).currentAge).toBe(4 - person.birthYear);
    expect((once.persons[0] as LivingChildPerson).currentAge).toBe(8);
  });

  it("does not double-age when the same year-start is applied twice", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    const first = applyYearStart([person], 2);
    const second = applyYearStart(first.persons, 2);
    expect((first.persons[0] as LivingChildPerson).currentAge).toBe(6);
    expect((second.persons[0] as LivingChildPerson).currentAge).toBe(6);
    expect(second.persons[0]).toEqual(first.persons[0]);
    expect(countByKind(second.transitions, "person_aged")).toBe(0);
    expect(second.transitions).toEqual([]);
  });

  it("rejects regressing a person to a past world year", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    // birthYear + currentAge = world year 1 equivalent; applying year 2 advances, then year 1 must fail.
    const advanced = applyYearStart([person], 2);
    const snapshot = structuredClone(advanced.persons);
    expect(() => applyYearStart(advanced.persons, 1)).toThrow(/regress/);
    expect(advanced.persons).toEqual(snapshot);
    expect((advanced.persons[0] as LivingChildPerson).currentAge).toBe(6);
  });

  it("does not age deceased, waiting, or stopped persons", () => {
    const active = livingChild({ personId: asPersonId("person_000001"), currentAge: 5 });
    const waiting = livingChild({
      personId: asPersonId("person_000002"),
      currentAge: 5,
      participationStatus: "waiting",
    });
    const stopped = livingChild({
      personId: asPersonId("person_000003"),
      currentAge: 5,
      participationStatus: "stopped",
    });
    const deceased: Person = {
      personId: asPersonId("person_000004"),
      givenName: "Dee",
      familyName: "Ashford",
      displayName: "Dee・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "deceased",
      careerStatus: "child",
      birthYear: -4,
      deathYear: 1,
      ageAtDeath: 5,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      abilities,
      aptitudes,
    };

    const result = applyYearStart([active, waiting, stopped, deceased], 2);
    expect((result.persons[0] as LivingChildPerson).currentAge).toBe(6);
    expect((result.persons[1] as LivingChildPerson).currentAge).toBe(5);
    expect((result.persons[2] as LivingChildPerson).currentAge).toBe(5);
    expect(result.persons[3]).toEqual(deceased);
  });

  it("does not age same-year births", () => {
    const newborn = livingChild({
      personId: asPersonId("person_000001"),
      currentAge: 0,
      birthYear: 2,
    });
    const result = applyYearStart([newborn], 2);
    expect((result.persons[0] as LivingChildPerson).currentAge).toBe(0);
    expect(countByKind(result.transitions, "person_aged")).toBe(0);
  });
});

describe("age-based career updates", () => {
  it("changes child to trainee at age 8", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 7 });
    const result = applyYearStart([person], 2);
    const updated = result.persons[0] as LivingTraineePerson;
    expect(updated.currentAge).toBe(8);
    expect(updated.careerStatus).toBe("trainee");
    expect(result.transitions.some((t) => t.kind === "career_status_changed")).toBe(true);
  });

  it("debuts at 16 with MINIMUM_RANK on currentRank and highestRank", () => {
    const person = livingTrainee({ personId: asPersonId("person_000001"), currentAge: 15 });
    const result = applyYearStart([person], 2);
    const updated = result.persons[0] as LivingActiveCompetitorPerson;
    expect(updated.currentAge).toBe(16);
    expect(updated.careerStatus).toBe("active_competitor");
    expect(updated.currentRank).toBe(MINIMUM_RANK);
    expect(updated.highestRank).toBe(MINIMUM_RANK);
    expect(updated.qualifiedMaster).toBe(false);

    const debut = result.transitions.find((t) => t.kind === "person_debuted");
    expect(debut).toEqual({
      kind: "person_debuted",
      personId: person.personId,
      rank: MINIMUM_RANK,
      previousCareerStatus: "trainee",
      nextCareerStatus: "active_competitor",
    });
  });

  it("enables canVoluntarilyRetire at 18 without auto-retiring", () => {
    const person = livingActive({
      personId: asPersonId("person_000001"),
      currentAge: 17,
      currentRank: "D",
      highestRank: "C",
    });
    const result = applyYearStart([person], 2);
    const updated = result.persons[0] as LivingActiveCompetitorPerson;
    expect(updated.currentAge).toBe(18);
    expect(updated.careerStatus).toBe("active_competitor");
    expect(deriveAgeEligibility(updated).canVoluntarilyRetire).toBe(true);
    expect(countByKind(result.transitions, "person_force_retired")).toBe(0);
  });

  it("force-retires at 42, moves currentRank to retirementRank, keeps highestRank", () => {
    const person = livingActive({
      personId: asPersonId("person_000001"),
      currentAge: 41,
      currentRank: "B",
      highestRank: "A",
    });
    const result = applyYearStart([person], 2);
    const updated = result.persons[0] as LivingRetiredPerson;
    expect(updated.currentAge).toBe(42);
    expect(updated.careerStatus).toBe("retired");
    expect(updated.retirementRank).toBe("B");
    expect(updated.highestRank).toBe("A");
    expect("currentRank" in updated).toBe(false);

    const retired = result.transitions.find((t) => t.kind === "person_force_retired");
    expect(retired).toMatchObject({
      kind: "person_force_retired",
      personId: person.personId,
      retirementRank: "B",
      highestRank: "A",
    });
  });

  it("leaves no active_competitor at age 42 or above", () => {
    const person = livingActive({
      personId: asPersonId("person_000001"),
      currentAge: 50,
      currentRank: "C",
      highestRank: "C",
      birthYear: 1 - 50,
    });
    // Age already 50 relative to year 1; apply year 1 start should still force retire.
    const result = applyYearStart([person], 1);
    expect((result.persons[0] as LivingPerson).careerStatus).toBe("retired");
  });
});

describe("age eligibility", () => {
  it("derives lineage/debut/retire flags from living person state", () => {
    const child7 = livingChild({ personId: asPersonId("person_000001"), currentAge: 7 });
    expect(deriveAgeEligibility(child7)).toEqual({
      canEnterLineage: false,
      canDebut: false,
      canVoluntarilyRetire: false,
      mustRetire: false,
    });

    const trainee10 = livingTrainee({ personId: asPersonId("person_000002"), currentAge: 10 });
    expect(deriveAgeEligibility(trainee10).canEnterLineage).toBe(true);
    expect(deriveAgeEligibility(trainee10).canDebut).toBe(false);

    const trainee16 = livingTrainee({ personId: asPersonId("person_000003"), currentAge: 16 });
    expect(deriveAgeEligibility(trainee16).canDebut).toBe(true);

    const child16 = livingChild({ personId: asPersonId("person_000004"), currentAge: 16 });
    expect(deriveAgeEligibility(child16).canDebut).toBe(true);

    const active16 = livingActive({
      personId: asPersonId("person_000005"),
      currentAge: 16,
      currentRank: MINIMUM_RANK,
      highestRank: MINIMUM_RANK,
    });
    expect(deriveAgeEligibility(active16).canDebut).toBe(false);
    expect(deriveAgeEligibility(active16).canVoluntarilyRetire).toBe(false);

    const active18 = livingActive({
      personId: asPersonId("person_000006"),
      currentAge: 18,
      currentRank: MINIMUM_RANK,
      highestRank: MINIMUM_RANK,
    });
    expect(deriveAgeEligibility(active18).canDebut).toBe(false);
    expect(deriveAgeEligibility(active18).canVoluntarilyRetire).toBe(true);
    expect(deriveAgeEligibility(active18).mustRetire).toBe(false);

    const active42 = livingActive({
      personId: asPersonId("person_000007"),
      currentAge: 42,
      currentRank: "C",
      highestRank: "C",
    });
    expect(deriveAgeEligibility(active42).mustRetire).toBe(true);
    expect(deriveAgeEligibility(active42).canDebut).toBe(false);
    expect(deriveAgeEligibility(active42).canVoluntarilyRetire).toBe(false);

    const retired: LivingRetiredPerson = {
      personId: asPersonId("person_000008"),
      givenName: "Rin",
      familyName: "Ashford",
      displayName: "Rin・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "living",
      participationStatus: "active",
      careerStatus: "retired",
      birthYear: 1 - 42,
      currentAge: 42,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      retirementRank: "C",
      highestRank: "B",
      abilities,
      aptitudes,
    };
    expect(deriveAgeEligibility(retired).canDebut).toBe(false);
  });

  it("requires active participation for lineage/debut/voluntary retire", () => {
    const waiting = livingTrainee({
      personId: asPersonId("person_000001"),
      currentAge: 16,
      participationStatus: "waiting",
    });
    expect(deriveAgeEligibility(waiting).canEnterLineage).toBe(false);
    expect(deriveAgeEligibility(waiting).canDebut).toBe(false);

    const stopped = livingTrainee({
      personId: asPersonId("person_000002"),
      currentAge: 16,
      participationStatus: "stopped",
    });
    expect(deriveAgeEligibility(stopped).canDebut).toBe(false);

    const stoppedActive = livingActive({
      personId: asPersonId("person_000003"),
      currentAge: 20,
      currentRank: MINIMUM_RANK,
      highestRank: MINIMUM_RANK,
      participationStatus: "stopped",
    });
    expect(deriveAgeEligibility(stoppedActive)).toEqual({
      canEnterLineage: false,
      canDebut: false,
      canVoluntarilyRetire: false,
      mustRetire: false,
    });
  });

  it("returns all false for deceased persons", () => {
    const deceasedChild: Person = {
      personId: asPersonId("person_000010"),
      givenName: "Dee",
      familyName: "Ashford",
      displayName: "Dee・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "female",
      lifeStatus: "deceased",
      careerStatus: "child",
      birthYear: -4,
      deathYear: 1,
      ageAtDeath: 5,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      abilities,
      aptitudes,
    };
    expect(deriveAgeEligibility(deceasedChild)).toEqual({
      canEnterLineage: false,
      canDebut: false,
      canVoluntarilyRetire: false,
      mustRetire: false,
    });

    const deceasedActive: Person = {
      personId: asPersonId("person_000011"),
      givenName: "Edd",
      familyName: "Ashford",
      displayName: "Edd・Ashford",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      lifeStatus: "deceased",
      careerStatus: "active_competitor",
      birthYear: -20,
      deathYear: 1,
      ageAtDeath: 21,
      familyId: asFamilyId("family_000001"),
      qualifiedMaster: false,
      highestRank: "C",
      abilities,
      aptitudes,
    };
    expect(deriveAgeEligibility(deceasedActive)).toEqual({
      canEnterLineage: false,
      canDebut: false,
      canVoluntarilyRetire: false,
      mustRetire: false,
    });
  });
});

describe("long-run 100 years", () => {
  it("runs 4800 steps to world year 101 January week 1 after year-start", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 0 });
    const initial = createInitialWorldCalendarState([person]);
    const result = stepWeeks(initial, 4800);

    expect(result.state.worldDate).toEqual({
      year: 101,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 4800,
    });

    const finalizedYears = result.transitions
      .filter((t) => t.kind === "year_stats_finalized")
      .map((t) => (t.kind === "year_stats_finalized" ? t.worldYear : -1));
    expect(finalizedYears).toHaveLength(100);
    expect(finalizedYears).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(finalizedYears).not.toContain(101);

    const startedYears = result.transitions
      .filter((t) => t.kind === "year_started")
      .map((t) => (t.kind === "year_started" ? t.worldYear : -1));
    expect(startedYears[0]).toBe(2);
    expect(startedYears.at(-1)).toBe(101);
    expect(startedYears).toHaveLength(100);

    const agedPerson = result.state.persons[0] as LivingRetiredPerson;
    expect(agedPerson.currentAge).toBe(100);
    expect(agedPerson.careerStatus).toBe("retired");
  });

  it("is deterministic for the same input", () => {
    const persons: Person[] = [
      livingChild({ personId: asPersonId("person_000001"), currentAge: 7 }),
      livingActive({
        personId: asPersonId("person_000002"),
        currentAge: 41,
        currentRank: "B",
        highestRank: "A",
      }),
    ];
    const a = stepWeeks(createInitialWorldCalendarState(persons), 96);
    const b = stepWeeks(createInitialWorldCalendarState(persons), 96);
    expect(a.state.worldDate).toEqual(b.state.worldDate);
    expect(a.state.persons).toEqual(b.state.persons);
    expect(a.transitions).toEqual(b.transitions);
  });
});

describe("transition purity and typing", () => {
  it("exposes distinguishable typed transitions without EventEnvelope", () => {
    const person = livingTrainee({ personId: asPersonId("person_000001"), currentAge: 15 });
    const result = stepWeeks(createInitialWorldCalendarState([person]), 48);
    const kinds = new Set(result.transitions.map((t) => t.kind));
    expect(kinds.has("year_stats_finalized")).toBe(true);
    expect(kinds.has("year_started")).toBe(true);
    expect(kinds.has("person_aged")).toBe(true);
    expect(kinds.has("person_debuted")).toBe(true);
    expect(result.transitions.every((t) => !("eventId" in t))).toBe(true);
  });

  it("does not mutate input person array or objects", () => {
    const person = livingChild({ personId: asPersonId("person_000001"), currentAge: 7 });
    const persons: Person[] = [person];
    const snapshot = structuredClone(persons);
    const state = createInitialWorldCalendarState(persons);
    stepWeeks(state, 48);
    expect(persons).toEqual(snapshot);
    expect(person.currentAge).toBe(7);
    expect(person.careerStatus).toBe("child");
  });

  it("rejects invalid step week counts", () => {
    const state = createInitialWorldCalendarState();
    expect(() => stepWeeks(state, -1)).toThrow(/weeks/);
    expect(() => stepWeeks(state, 1.5)).toThrow(/weeks/);
  });

  it("can construct dates without relying on host Date", () => {
    const date = createWorldDate(
      { year: 5, month: 12, weekOfMonth: 3 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    expect(date.year).toBe(5);
    expect(typeof Date).toBe("function");
  });
});

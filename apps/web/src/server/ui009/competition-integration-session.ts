import {
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type Person,
  type Rank,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";

/** World year used by UI009 integration tests and shell bootstrap acceptance. */
export const UI009_COMPETITION_PLANNING_WORLD_YEAR = 21;

const VALID_RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;

function asRank(value: unknown, fallback: Rank): Rank {
  return typeof value === "string" && (VALID_RANKS as readonly string[]).includes(value)
    ? (value as Rank)
    : fallback;
}

function stripDisallowedRankFields(person: Person): Person {
  const copy = {
    ...(person as Person & {
      currentRank?: unknown;
      highestRank?: unknown;
      retirementRank?: unknown;
    }),
  };
  delete copy.currentRank;
  delete copy.highestRank;
  delete copy.retirementRank;
  return copy as Person;
}

function normalizeCareerStatusForAge(person: Person, currentAge: number): Person {
  if (person.lifeStatus !== "living") {
    return person;
  }
  if (person.participationStatus !== "active") {
    return { ...stripDisallowedRankFields(person), currentAge } as Person;
  }
  let careerStatus = person.careerStatus;
  if (currentAge <= 7) {
    careerStatus = "child";
  } else if (currentAge <= 15) {
    careerStatus = "trainee";
  } else if (currentAge >= 42) {
    careerStatus = "retired";
  } else if (careerStatus === "child" || careerStatus === "trainee") {
    careerStatus = "active_competitor";
  }
  if (careerStatus === "active_competitor") {
    const currentRank =
      person.careerStatus === "active_competitor" ? asRank(person.currentRank, "F") : "F";
    const highestRank =
      person.careerStatus === "active_competitor"
        ? asRank(person.highestRank, currentRank)
        : currentRank;
    return {
      ...person,
      currentAge,
      careerStatus: "active_competitor",
      qualifiedMaster: false,
      currentRank,
      highestRank,
    } as Person;
  }
  if (careerStatus === "retired") {
    const retirementRank =
      person.careerStatus === "active_competitor"
        ? asRank(person.currentRank, "F")
        : asRank("retirementRank" in person ? person.retirementRank : undefined, "F");
    return {
      ...stripDisallowedRankFields(person),
      currentAge,
      careerStatus: "retired",
      qualifiedMaster: false,
      highestRank: asRank("highestRank" in person ? person.highestRank : undefined, retirementRank),
      retirementRank,
    } as Person;
  }
  return {
    ...stripDisallowedRankFields(person),
    currentAge,
    careerStatus,
    qualifiedMaster: false,
  } as Person;
}

/**
 * In-memory projection used only for UI009 participant planning / isolated competition
 * execution. Canonical simulation runtime in the UI session is not mutated.
 */
export function projectUi009CompetitionPlanningSession(
  session: Sprint1RunSession,
): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: UI009_COMPETITION_PLANNING_WORLD_YEAR, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living") {
      return person;
    }
    const currentAge = worldDate.year - person.birthYear;
    return normalizeCareerStatusForAge(person as Person, currentAge);
  });
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        worldDate,
        persons,
      },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
}

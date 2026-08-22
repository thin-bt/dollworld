/**
 * Build people / mock-candidate source rows from UiReadSnapshot runtime (DB-002/004/008).
 */

import {
  computeCurrentAge,
  type Person,
  type Sprint1RunSession,
  validatePersonTemporaryCondition,
  validateSprint1PersonState,
} from "@shared-world/simulation-core";
import type { MockCandidateSourceRow } from "./mock-candidates/filter-sort-page-candidates.js";
import type { PeopleListPerson } from "./people/page-people.js";
import { projectPersonListItem, toPeopleListPerson } from "./project-person.js";

export type PeopleSourceBuild =
  | {
      ok: true;
      people: PeopleListPerson[];
      itemsById: Map<string, NonNullable<ReturnType<typeof projectPersonListItem>>>;
      projected: NonNullable<ReturnType<typeof projectPersonListItem>>[];
    }
  | { ok: false; reason: "corruption" };

export type CandidatesSourceBuild =
  | { ok: true; rows: MockCandidateSourceRow[]; threshold: number }
  | { ok: false; reason: "corruption" };

function sidecarByPersonId(
  session: Sprint1RunSession,
): Map<string, { temporaryCondition: unknown }> {
  const map = new Map<string, { temporaryCondition: unknown }>();
  const entries = session.runtimeState.weeklyTrainingSidecars.entries;
  for (const entry of entries) {
    map.set(entry.personId, { temporaryCondition: entry.temporaryCondition });
  }
  return map;
}

export function buildPeopleSource(session: Sprint1RunSession): PeopleSourceBuild {
  const persons = session.runtimeState.worldState.persons;
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const people: PeopleListPerson[] = [];
  const projected: NonNullable<ReturnType<typeof projectPersonListItem>>[] = [];
  const itemsById = new Map<string, NonNullable<ReturnType<typeof projectPersonListItem>>>();

  const seen = new Set<string>();
  for (const person of persons as readonly Person[]) {
    if (seen.has(person.personId)) {
      return { ok: false, reason: "corruption" };
    }
    seen.add(person.personId);
    const item = projectPersonListItem(person, worldYear);
    if (item === null) {
      return { ok: false, reason: "corruption" };
    }
    projected.push(item);
    itemsById.set(item.personId, item);
    people.push(toPeopleListPerson(person, item));
  }
  return { ok: true, people, itemsById, projected };
}

export function buildMockCandidateSourceRows(session: Sprint1RunSession): CandidatesSourceBuild {
  const persons = session.runtimeState.worldState.persons as readonly Person[];
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const threshold =
    session.context.runRuleSnapshot.sprint1Config.battle.injury.unableToContinueThreshold;
  if (
    typeof threshold !== "number" ||
    !Number.isInteger(threshold) ||
    !Number.isSafeInteger(threshold)
  ) {
    return { ok: false, reason: "corruption" };
  }

  const sidecars = sidecarByPersonId(session);
  const rows: MockCandidateSourceRow[] = [];

  for (const person of persons) {
    // Structural Person / age / sprint1State / temporaryCondition must all validate.
    // Failure => corruption (500), not silent ineligible (TX-045 / ACC-124).
    if (typeof person.personId !== "string" || person.personId.length === 0) {
      return { ok: false, reason: "corruption" };
    }
    if (typeof person.displayName !== "string" || person.displayName.length === 0) {
      return { ok: false, reason: "corruption" };
    }
    if (person.sprint1State === undefined) {
      return { ok: false, reason: "corruption" };
    }
    const sprint1 = validateSprint1PersonState(person.sprint1State, {
      spiritSurfaceValue: person.abilities.spirit.surfaceValue,
    });
    if (!sprint1.ok) {
      return { ok: false, reason: "corruption" };
    }

    const sidecar = sidecars.get(person.personId);
    if (sidecar === undefined) {
      return { ok: false, reason: "corruption" };
    }
    const temp = validatePersonTemporaryCondition(sidecar.temporaryCondition);
    if (!temp.ok) {
      return { ok: false, reason: "corruption" };
    }

    let derivedAge: number;
    if (person.lifeStatus === "living") {
      if (typeof person.currentAge !== "number" || !Number.isInteger(person.currentAge)) {
        return { ok: false, reason: "corruption" };
      }
      derivedAge = computeCurrentAge(worldYear, person.birthYear);
      if (person.currentAge !== derivedAge) {
        return { ok: false, reason: "corruption" };
      }
    } else if (person.lifeStatus === "deceased") {
      // Deceased are validated as source-ok then classified ineligible by predicate.
      if (
        typeof person.deathYear !== "number" ||
        typeof person.ageAtDeath !== "number" ||
        person.ageAtDeath !== person.deathYear - person.birthYear
      ) {
        return { ok: false, reason: "corruption" };
      }
      derivedAge = person.ageAtDeath;
    } else {
      return { ok: false, reason: "corruption" };
    }

    rows.push({
      personId: person.personId,
      displayName: person.displayName,
      sourceValidationOk: true,
      eligibleInput: {
        lifeStatus: person.lifeStatus,
        participationStatus: person.participationStatus,
        careerStatus: person.careerStatus,
        derivedAgeAtWorldDate: derivedAge,
        birthYear: person.birthYear,
        injury: temp.value.injury,
        unableToContinueThreshold: threshold,
      },
    });
  }

  return { ok: true, rows, threshold };
}

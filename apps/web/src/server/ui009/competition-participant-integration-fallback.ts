import {
  isEligibleForBattleKind,
  type Person,
  type PersonId,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { buildMockCandidateSourceRows } from "../ui004/source-from-runtime.js";
import { mockCandidateEligible } from "../ui004/mock-candidates/mock-candidate-eligible.js";

/** Accepted UI009 integration participant cap (round-robin max and knockout minimum range). */
export const UI009_INTEGRATION_PARTICIPANT_CAP = 16;

/** @deprecated use UI009_INTEGRATION_PARTICIPANT_CAP */
export const UI009_INTEGRATION_ROUND_ROBIN_MAX = UI009_INTEGRATION_PARTICIPANT_CAP;

function isOfficialBattleEligiblePerson(person: Person, worldYear: number): boolean {
  if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
    return false;
  }
  const age = person.currentAge;
  return isEligibleForBattleKind("official", person.careerStatus, age);
}

/**
 * When domain entry selection returns an empty roster at early world dates, UI009 still
 * needs a deterministic official-eligible roster so preview and execution stay aligned.
 * This mirrors the pre-0dacb0e mock-candidate path, capped for round-robin integration.
 */
export function selectUi009IntegrationFallbackParticipantIds(
  session: Sprint1RunSession,
): readonly PersonId[] {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const source = buildMockCandidateSourceRows(session);
  if (!source.ok) {
    return [];
  }
  const personsById = new Map(
    session.runtimeState.worldState.persons.map((person) => [person.personId, person as Person]),
  );
  const eligible = source.rows
    .filter((row) => row.sourceValidationOk && row.eligibleInput !== undefined)
    .filter((row) => mockCandidateEligible(row.eligibleInput!))
    .filter((row) => {
      const person = personsById.get(row.personId as PersonId);
      return person !== undefined && isOfficialBattleEligiblePerson(person, worldYear);
    })
    .map((row) => row.personId as PersonId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  if (eligible.length >= 2) {
    return eligible.slice(0, UI009_INTEGRATION_PARTICIPANT_CAP);
  }

  const fallback = session.runtimeState.worldState.persons
    .filter((person) => isOfficialBattleEligiblePerson(person as Person, worldYear))
    .map((person) => person.personId as PersonId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return fallback.slice(0, UI009_INTEGRATION_PARTICIPANT_CAP);
}

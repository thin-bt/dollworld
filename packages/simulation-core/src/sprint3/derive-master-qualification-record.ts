/**
 * S03-016 live derivation of master qualification evaluation input from persisted person state.
 */
import type { Person } from "../domain.js";
import type { PersonId } from "../ids.js";
import type { CompetitiveRecord } from "../sprint2/competitive-record-update.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import type { MasterQualificationEvaluationRecord, Sprint3Config } from "./types.js";

export type DeriveMasterQualificationRecordInput = {
  person: Person;
  competitiveRecord?: CompetitiveRecord;
};

export function deriveMasterQualificationEvaluationRecordFromPerson(
  input: DeriveMasterQualificationRecordInput,
): MasterQualificationEvaluationRecord {
  const { person, competitiveRecord } = input;
  const officialWins = competitiveRecord?.officialWins ?? 0;
  const limitedOfficialWins = competitiveRecord?.winsByTournamentKind.limited ?? 0;
  const tournamentTitles = competitiveRecord?.tournamentTitles ?? 0;

  if (person.lifeStatus !== "living") {
    return {
      careerStatus: person.careerStatus,
      lifeStatus: person.lifeStatus,
      highestRank: person.careerStatus === "retired" ? person.highestRank : "F",
      officialWins,
      limitedOfficialWins,
      tournamentTitles,
    };
  }
  if (person.careerStatus === "retired") {
    return {
      careerStatus: person.careerStatus,
      lifeStatus: person.lifeStatus,
      retirementRank: person.retirementRank,
      highestRank: person.highestRank,
      officialWins,
      limitedOfficialWins,
      tournamentTitles,
    };
  }
  if (person.careerStatus === "active_competitor") {
    return {
      careerStatus: person.careerStatus,
      lifeStatus: person.lifeStatus,
      highestRank: person.highestRank,
      officialWins,
      limitedOfficialWins,
      tournamentTitles,
    };
  }
  return {
    careerStatus: person.careerStatus,
    lifeStatus: person.lifeStatus,
    highestRank: "F",
    officialWins,
    limitedOfficialWins,
    tournamentTitles,
  };
}

export function isPersonMasterQualificationEligible(
  config: Sprint3Config,
  person: Person,
  competitiveRecord?: CompetitiveRecord,
): boolean {
  if (person.lifeStatus !== "living" || person.careerStatus !== "retired") {
    return false;
  }
  const record = deriveMasterQualificationEvaluationRecordFromPerson({
    person,
    ...(competitiveRecord === undefined ? {} : { competitiveRecord }),
  });
  const outcome = evaluateMasterQualificationEligibility(config, record);
  return outcome.ok && outcome.value.eligible;
}

export function resolvePersistedQualifiedMasterFlag(
  config: Sprint3Config,
  person: Person,
  competitiveRecord?: CompetitiveRecord,
): boolean {
  if (person.lineageId === undefined) {
    return false;
  }
  return isPersonMasterQualificationEligible(config, person, competitiveRecord);
}

export type CompetitiveRecordsByPersonId = ReadonlyMap<PersonId, CompetitiveRecord>;

export function competitiveRecordForPerson(
  personId: PersonId,
  records: CompetitiveRecordsByPersonId | undefined,
): CompetitiveRecord | undefined {
  return records?.get(personId);
}

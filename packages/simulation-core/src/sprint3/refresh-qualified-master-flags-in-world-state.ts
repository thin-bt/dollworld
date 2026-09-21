/**
 * S03-016 refresh persisted qualifiedMaster from Sprint3 evaluation at life/career boundaries.
 */
import type { Person } from "../domain.js";
import { success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { WorldEngineState } from "../world-engine/types.js";
import {
  competitiveRecordForPerson,
  resolvePersistedQualifiedMasterFlag,
  type CompetitiveRecordsByPersonId,
} from "./derive-master-qualification-record.js";
import type { Sprint3Config } from "./types.js";

export type RefreshQualifiedMasterFlagsInput = {
  worldState: WorldEngineState;
  sprint3Config: Sprint3Config;
  competitiveRecordsByPersonId?: CompetitiveRecordsByPersonId;
};

function withQualifiedMasterFlag(person: Person, qualifiedMaster: boolean): Person {
  if (person.lifeStatus === "living" && person.careerStatus === "retired") {
    if (person.qualifiedMaster === qualifiedMaster) {
      return person;
    }
    return { ...person, qualifiedMaster };
  }
  if (person.qualifiedMaster === false) {
    return person;
  }
  return { ...person, qualifiedMaster: false as const };
}

export function refreshQualifiedMasterFlagsInWorldState(
  input: RefreshQualifiedMasterFlagsInput,
): ValidationResult<WorldEngineState> {
  const { worldState, sprint3Config, competitiveRecordsByPersonId } = input;
  const persons = worldState.persons.map((person) => {
    if (person.lifeStatus !== "living" || person.careerStatus !== "retired") {
      return withQualifiedMasterFlag(person, false);
    }
    const competitiveRecord = competitiveRecordForPerson(
      person.personId,
      competitiveRecordsByPersonId,
    );
    const nextFlag = resolvePersistedQualifiedMasterFlag(sprint3Config, person, competitiveRecord);
    return withQualifiedMasterFlag(person, nextFlag);
  });
  return success({ ...worldState, persons });
}

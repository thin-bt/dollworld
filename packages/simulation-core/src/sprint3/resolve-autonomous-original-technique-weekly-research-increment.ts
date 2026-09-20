/**
 * S03-009 autonomous weekly research increment boundary (no WeeklyAction).
 * Uses SPEC §独自技の発生 interim +1.0 per eligible week as the minimal deterministic tick.
 */
import type { PersonId } from "../ids.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { isFormalTrainingEligible } from "../sprint1/weekly-update-eligibility.js";

/** Tenths per week (+1.0 research value). */
export const AUTONOMOUS_ORIGINAL_TECHNIQUE_WEEKLY_RESEARCH_INCREMENT_TENTHS = 10 as const;

export type AutonomousOriginalTechniqueWeeklyResearchInput = {
  worldState: WorldEngineState;
  personId: PersonId;
};

/**
 * Deterministic increment for one person on one world week.
 * Returns 0 when the person is not eligible for formal weekly progression.
 */
export function resolveAutonomousOriginalTechniqueWeeklyResearchIncrementTenths(
  input: AutonomousOriginalTechniqueWeeklyResearchInput,
): number {
  const person = input.worldState.persons.find(
    (candidate) => candidate.personId === input.personId,
  );
  if (person === undefined) {
    return 0;
  }
  if (
    !isFormalTrainingEligible({
      lifeStatus: person.lifeStatus,
      ...(person.participationStatus === undefined
        ? {}
        : { participationStatus: person.participationStatus }),
      careerStatus: person.careerStatus,
      ...(person.currentAge === undefined ? {} : { currentAge: person.currentAge }),
    })
  ) {
    return 0;
  }
  return AUTONOMOUS_ORIGINAL_TECHNIQUE_WEEKLY_RESEARCH_INCREMENT_TENTHS;
}

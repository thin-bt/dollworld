/**
 * Weekly update / formal training eligibility predicates (08 / 10 / S01-002).
 * Pure predicates — do not mutate person state or duplicate age-status transitions.
 */
import type { CareerStatus, LifeStatus, ParticipationStatus } from "../enums.js";

export type WeeklyEligibilityPerson = {
  lifeStatus: LifeStatus;
  participationStatus?: ParticipationStatus;
  careerStatus: CareerStatus;
  currentAge?: number;
};

/** Weekly temporary-state / action updates (10 inactive set). */
export function isWeeklyStateUpdateEligible(person: WeeklyEligibilityPerson): boolean {
  if (person.lifeStatus === "deceased") {
    return false;
  }
  if (person.participationStatus === "waiting" || person.participationStatus === "stopped") {
    return false;
  }
  return true;
}

/**
 * Formal training eligibility (08 age / career rules).
 * Age 41 may still train; age 42+ and 0..7 do not.
 */
export function isFormalTrainingEligible(person: WeeklyEligibilityPerson): boolean {
  if (!isWeeklyStateUpdateEligible(person)) {
    return false;
  }
  if (person.careerStatus === "retired") {
    return false;
  }
  if (typeof person.currentAge !== "number" || !Number.isInteger(person.currentAge)) {
    return false;
  }
  if (person.currentAge <= 7 || person.currentAge >= 42) {
    return false;
  }
  return true;
}

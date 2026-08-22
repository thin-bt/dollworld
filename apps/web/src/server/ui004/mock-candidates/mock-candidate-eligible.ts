/**
 * §7A.1.1 exact mock candidate eligibility predicate (BRIDGE-074 / FIX-040 / DB-008).
 * Future production owner: UI-004 API-011.
 *
 * Career/age portion binds to production `isEligibleForBattleKind("mock", ...)`.
 * life / participation / injury are additional exact conjuncts from §7A.1.1.
 * birthYear follows Person/calendar semantics (may be <= 0); no ad-hoc birthYear >= 1 floor.
 */

import {
  isEligibleForBattleKind,
  type CareerStatus,
  type LifeStatus,
  type ParticipationStatus,
} from "@shared-world/simulation-core";

export type MockCandidateEligibleInput = {
  lifeStatus: LifeStatus;
  participationStatus: ParticipationStatus | undefined;
  careerStatus: CareerStatus;
  derivedAgeAtWorldDate: number;
  birthYear: number;
  injury: number;
  unableToContinueThreshold: number;
};

/**
 * Exact predicate on an already-validated Person + temporaryCondition + worldDate age.
 * Corruption / strict validation failures are NOT handled here — see classify-candidate-source.
 */
export function mockCandidateEligible(input: MockCandidateEligibleInput): boolean {
  if (input.lifeStatus !== "living") {
    return false;
  }
  if (input.participationStatus !== "active") {
    return false;
  }
  if (!Number.isSafeInteger(input.birthYear)) {
    return false;
  }
  if (!isEligibleForBattleKind("mock", input.careerStatus, input.derivedAgeAtWorldDate)) {
    return false;
  }
  if (!(input.injury < input.unableToContinueThreshold)) {
    return false;
  }
  return true;
}

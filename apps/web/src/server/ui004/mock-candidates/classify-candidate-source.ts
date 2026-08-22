/**
 * TX-045 / ACC-124 — corruption vs ineligible vs eligible classification.
 * Future production owner: UI-004 API-011.
 *
 * Does NOT implement full Person / sprint1State validators.
 * Caller injects validation outcome; this module only classifies membership semantics.
 *
 * Historical compatibility: candidate source is abstract — do not require scanning
 * all deceased/history records inside this helper.
 */

import { mockCandidateEligible } from "./mock-candidate-eligible.js";
import type { MockCandidateEligibleInput } from "./mock-candidate-eligible.js";

export type CandidateSourceClass = "eligible" | "ineligible" | "corruption";

export type CandidateClassificationInput = {
  /**
   * Result of strict Person / sprint1State / temporaryCondition / age cross-check
   * (and any other §7A.1.2 validation). Failure => whole GET is 500, not silent exclude.
   */
  sourceValidationOk: boolean;
  /** Present only when sourceValidationOk is true. */
  eligibleInput?: MockCandidateEligibleInput;
};

export type CandidateClassification = {
  class: CandidateSourceClass;
  /**
   * Route-layer hint only. Pure module does not emit HTTP.
   * corruption -> 500 INTERNAL_ERROR (no partial list)
   * ineligible -> exclude from membership, response still 200 when all sources valid
   * eligible -> include
   */
  httpMembershipHint: "include" | "exclude" | "fail_all_500";
};

export function classifyCandidateSource(
  input: CandidateClassificationInput,
): CandidateClassification {
  if (!input.sourceValidationOk) {
    return { class: "corruption", httpMembershipHint: "fail_all_500" };
  }
  if (input.eligibleInput === undefined) {
    return { class: "corruption", httpMembershipHint: "fail_all_500" };
  }
  if (mockCandidateEligible(input.eligibleInput)) {
    return { class: "eligible", httpMembershipHint: "include" };
  }
  return { class: "ineligible", httpMembershipHint: "exclude" };
}

/**
 * Build membership from an abstract validated candidate source collection.
 * If any row is corruption, returns { ok: false } — caller maps to 500 without partial items.
 */
export function selectEligibleCandidates<T extends { classification: CandidateClassification }>(
  rows: readonly T[],
): { ok: true; eligible: readonly T[] } | { ok: false; reason: "corruption" } {
  for (const row of rows) {
    if (row.classification.class === "corruption") {
      return { ok: false, reason: "corruption" };
    }
  }
  return {
    ok: true,
    eligible: rows.filter((row) => row.classification.class === "eligible"),
  };
}

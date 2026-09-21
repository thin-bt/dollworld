/**
 * S03-028 live-world derivation for enrollment `activeSpecialReasons` (docs/SPEC.md §8歳時の師匠決定).
 * Uses only canonical materialized candidate facts and person lineage/rank records — no undocumented thresholds.
 */
import { RANK_ORDER, type Rank } from "../enums.js";
import type { Person } from "../domain.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import type { EnrollmentMasterCandidate, EnrollmentSpecialReason, Sprint3Config } from "./types.js";

const ENROLLMENT_SPECIAL_REASON_ORDER: readonly EnrollmentSpecialReason[] = [
  "superior_master_invitation",
  "rebellion_against_parent",
  "poor_parent_child_compatibility",
  "aptitude_lineage_mismatch",
  "parent_intake_limit_reached",
];

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function isQualifiedAcceptCandidate(
  config: Sprint3Config,
  candidate: EnrollmentMasterCandidate,
): boolean {
  if (candidate.intakeAcceptance !== "accept") {
    return false;
  }
  const qualification = evaluateMasterQualificationEligibility(
    config,
    candidate.qualificationRecord,
  );
  return qualification.ok && qualification.value.eligible;
}

export function deriveLiveEnrollmentActiveSpecialReasons(
  config: Sprint3Config,
  childPerson: Person,
  masterCandidates: readonly EnrollmentMasterCandidate[],
  parentPersonById: ReadonlyMap<string, Person>,
): readonly EnrollmentSpecialReason[] {
  const active = new Set<EnrollmentSpecialReason>();

  for (const candidate of masterCandidates) {
    if (!candidate.isBiologicalParent) {
      continue;
    }
    const qualification = evaluateMasterQualificationEligibility(
      config,
      candidate.qualificationRecord,
    );
    if (!qualification.ok || !qualification.value.eligible) {
      continue;
    }
    if (candidate.intakeAcceptance === "reject" || candidate.intakeAcceptance === "defer") {
      active.add("parent_intake_limit_reached");
      break;
    }
  }

  const childLineageId = childPerson.lineageId;
  if (childLineageId !== undefined) {
    for (const candidate of masterCandidates) {
      if (!candidate.isBiologicalParent || candidate.intakeAcceptance !== "accept") {
        continue;
      }
      const qualification = evaluateMasterQualificationEligibility(
        config,
        candidate.qualificationRecord,
      );
      if (!qualification.ok || !qualification.value.eligible) {
        continue;
      }
      const parentPerson = parentPersonById.get(candidate.masterPersonId);
      const parentLineageId = parentPerson?.lineageId;
      if (parentLineageId !== undefined && parentLineageId !== childLineageId) {
        active.add("aptitude_lineage_mismatch");
        break;
      }
    }
  }

  const qualifiedAccept = masterCandidates.filter((candidate) =>
    isQualifiedAcceptCandidate(config, candidate),
  );
  const qualifiedAcceptParents = qualifiedAccept.filter(
    (candidate) => candidate.isBiologicalParent,
  );
  const qualifiedAcceptNonParents = qualifiedAccept.filter(
    (candidate) => !candidate.isBiologicalParent,
  );

  if (qualifiedAcceptParents.length > 0 && qualifiedAcceptNonParents.length > 0) {
    const maxParentRank = Math.max(
      ...qualifiedAcceptParents.map((candidate) =>
        rankIndex(candidate.qualificationRecord.highestRank),
      ),
    );
    const maxNonParentRank = Math.max(
      ...qualifiedAcceptNonParents.map((candidate) =>
        rankIndex(candidate.qualificationRecord.highestRank),
      ),
    );
    if (maxNonParentRank > maxParentRank) {
      active.add("superior_master_invitation");
    }

    const maxParentCompatibility = Math.max(
      ...qualifiedAcceptParents.map((candidate) => candidate.parentChildCompatibilityScore),
    );
    const maxNonParentCompatibility = Math.max(
      ...qualifiedAcceptNonParents.map((candidate) => candidate.parentChildCompatibilityScore),
    );
    if (maxNonParentCompatibility > maxParentCompatibility) {
      active.add("poor_parent_child_compatibility");
    }
  }

  return ENROLLMENT_SPECIAL_REASON_ORDER.filter((reason) => active.has(reason));
}

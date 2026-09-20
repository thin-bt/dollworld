import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { evaluateEnrollmentAssignment } from "./evaluate-enrollment-assignment.js";
import {
  createSprint3Balance020ConfigInput,
  createSprint3Balance030ConfigInput,
} from "./sprint3-config-defaults.js";
import type {
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  MasterQualificationEvaluationRecord,
} from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function qualifiedMasterRecord(
  overrides: Partial<MasterQualificationEvaluationRecord> = {},
): MasterQualificationEvaluationRecord {
  return {
    careerStatus: "retired",
    lifeStatus: "living",
    retirementRank: "C",
    highestRank: "C",
    officialWins: 0,
    limitedOfficialWins: 0,
    tournamentTitles: 0,
    ...overrides,
  };
}

function masterCandidate(
  overrides: Partial<EnrollmentMasterCandidate> & Pick<EnrollmentMasterCandidate, "masterPersonId">,
): EnrollmentMasterCandidate {
  return {
    isBiologicalParent: false,
    qualificationRecord: qualifiedMasterRecord(),
    parentChildCompatibilityScore: 0,
    lineageAptitudeScore: 0,
    schoolFitScore: 0,
    teachingEfficiencyScore: 0,
    intakeAcceptance: "accept",
    ...overrides,
  };
}

function enrollmentRecord(
  overrides: Partial<EnrollmentAssignmentRecord> = {},
): EnrollmentAssignmentRecord {
  return {
    childPersonId: "child-001",
    childAge: 8,
    activeSpecialReasons: [],
    masterCandidates: [],
    ...overrides,
  };
}

describe("S03-003 enrollment assignment", () => {
  it("EN-001 sprint3-balance-0.3.0 validates with stable hash", () => {
    const result = validateSprint3Config(createSprint3Balance030ConfigInput(), provider);
    expect(result.ok).toBe(true);
  });

  it("EN-002 returns not_at_enrollment_boundary when child age is not formalEnrollmentMinAge", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(config.value, enrollmentRecord({ childAge: 7 }));
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("not_at_enrollment_boundary");
  });

  it("EN-003 assigns default qualified parent as parent_master_disciple", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        masterCandidates: [
          masterCandidate({
            masterPersonId: "parent-a",
            isBiologicalParent: true,
            parentChildCompatibilityScore: 10,
          }),
        ],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("parent_master_assigned");
    expect(outcome.value.selectedMasterPersonId).toBe("parent-a");
    expect(outcome.value.mentorshipRelationKind).toBe("parent_master_disciple");
  });

  it("EN-004 picks higher composite score between two qualified parents", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        masterCandidates: [
          masterCandidate({
            masterPersonId: "parent-a",
            isBiologicalParent: true,
            teachingEfficiencyScore: 5,
          }),
          masterCandidate({
            masterPersonId: "parent-b",
            isBiologicalParent: true,
            teachingEfficiencyScore: 20,
          }),
        ],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.selectedMasterPersonId).toBe("parent-b");
  });

  it("EN-005 breaks equal parent scores by lexicographic masterPersonId", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        masterCandidates: [
          masterCandidate({ masterPersonId: "parent-z", isBiologicalParent: true }),
          masterCandidate({ masterPersonId: "parent-a", isBiologicalParent: true }),
        ],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.selectedMasterPersonId).toBe("parent-a");
  });

  it("EN-006 filters non-eligible masters from selection", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        masterCandidates: [
          masterCandidate({
            masterPersonId: "parent-a",
            isBiologicalParent: true,
            qualificationRecord: qualifiedMasterRecord({ careerStatus: "active_competitor" }),
          }),
        ],
        temporaryGuidanceParentPersonId: "parent-a",
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("parent_temporary_guidance");
  });

  it("EN-007 excludes intake reject/defer masters without global cap (S03-004 boundary)", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const rejectedParent = masterCandidate({
      masterPersonId: "parent-a",
      isBiologicalParent: true,
      intakeAcceptance: "reject",
    });
    const external = masterCandidate({
      masterPersonId: "master-ext",
      teachingEfficiencyScore: 1,
    });
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        activeSpecialReasons: ["parent_intake_limit_reached"],
        masterCandidates: [rejectedParent, external],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("formal_master_assigned");
    expect(outcome.value.selectedMasterPersonId).toBe("master-ext");
  });

  it("EN-008 special reason permits non-parent formal master", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        activeSpecialReasons: ["rebellion_against_parent"],
        masterCandidates: [
          masterCandidate({
            masterPersonId: "parent-a",
            isBiologicalParent: true,
            teachingEfficiencyScore: 50,
          }),
          masterCandidate({
            masterPersonId: "master-ext",
            teachingEfficiencyScore: 100,
          }),
        ],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("formal_master_assigned");
    expect(outcome.value.selectedMasterPersonId).toBe("master-ext");
  });

  it("EN-009 returns no_eligible_or_accepted_master without corrupting state fields", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateEnrollmentAssignment(
      config.value,
      enrollmentRecord({
        masterCandidates: [
          masterCandidate({
            masterPersonId: "master-x",
            intakeAcceptance: "defer",
          }),
        ],
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("no_eligible_or_accepted_master");
    expect(outcome.value.selectedMasterPersonId).toBeUndefined();
    expect(outcome.value.mentorshipRelationKind).toBeUndefined();
  });

  it("EN-010 evaluation is deterministic for identical inputs", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const record = enrollmentRecord({
      masterCandidates: [
        masterCandidate({ masterPersonId: "parent-b", isBiologicalParent: true }),
        masterCandidate({ masterPersonId: "parent-a", isBiologicalParent: true }),
      ],
    });
    const first = evaluateEnrollmentAssignment(config.value, record);
    const second = evaluateEnrollmentAssignment(config.value, record);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) {
      return;
    }
    expect(first.value).toEqual(second.value);
  });
});

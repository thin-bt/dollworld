import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import {
  cloneMentorshipEntrypointRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import { ENROLLMENT_ASSIGNMENT_KINDS, type EnrollmentAssignmentKind } from "./types.js";

const CHILD_ID = asPersonId("child_enrollment_outcome_kind_validation");
const MASTER_ID = asPersonId("master_enrollment_outcome_kind_validation");

function coherentAssignmentEntry(
  enrollmentOutcomeKind: EnrollmentAssignmentKind,
): Record<string, unknown> {
  switch (enrollmentOutcomeKind) {
    case "formal_master_assigned":
      return {
        childPersonId: CHILD_ID,
        enrollmentOutcomeKind,
        assignedAbsoluteWeek: 1,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "formal_master_disciple",
      };
    case "parent_master_assigned":
      return {
        childPersonId: CHILD_ID,
        enrollmentOutcomeKind,
        assignedAbsoluteWeek: 1,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "parent_master_disciple",
      };
    case "parent_temporary_guidance":
      return {
        childPersonId: CHILD_ID,
        enrollmentOutcomeKind,
        assignedAbsoluteWeek: 1,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "parent_temporary_guidance",
      };
    case "not_at_enrollment_boundary":
    case "no_eligible_or_accepted_master":
      return {
        childPersonId: CHILD_ID,
        enrollmentOutcomeKind,
        assignedAbsoluteWeek: 1,
      };
    default: {
      const _exhaustive: never = enrollmentOutcomeKind;
      throw new Error(String(_exhaustive));
    }
  }
}

function runtimeWithEnrollmentOutcomeKind(
  enrollmentOutcomeKind: EnrollmentAssignmentKind,
): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    mentorshipByChildPersonId: [coherentAssignmentEntry(enrollmentOutcomeKind)],
  };
}

describe("S03-063 enrollmentOutcomeKind runtime validation", () => {
  it.each(ENROLLMENT_ASSIGNMENT_KINDS)("accepts persisted enrollmentOutcomeKind %s", (kind) => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithEnrollmentOutcomeKind(kind),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.mentorshipByChildPersonId[0]?.enrollmentOutcomeKind).toBe(kind);
  });

  it("rejects unknown persisted enrollmentOutcomeKind with precise path", () => {
    const payload = runtimeWithEnrollmentOutcomeKind("parent_master_assigned");
    const entry = (payload.mentorshipByChildPersonId as Record<string, unknown>[])[0]!;
    entry.enrollmentOutcomeKind = "not_a_real_outcome_kind";

    const result = validateSprint3MentorshipEntrypointRuntimeState(payload);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/mentorshipByChildPersonId/0/enrollmentOutcomeKind",
          message: "enrollmentOutcomeKind must be a known EnrollmentAssignmentOutcome kind",
          actual: "not_a_real_outcome_kind",
        }),
      ]),
    );
  });

  it("clone round-trip preserves validated enrollmentOutcomeKind", () => {
    const validated = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithEnrollmentOutcomeKind("formal_master_assigned"),
    );
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      throw new Error(JSON.stringify(validated.issues));
    }

    const cloned = cloneMentorshipEntrypointRuntimeState(validated.value);
    const roundTrip = validateSprint3MentorshipEntrypointRuntimeState(cloned);
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) {
      throw new Error(JSON.stringify(roundTrip.issues));
    }
    expect(roundTrip.value.mentorshipByChildPersonId[0]?.enrollmentOutcomeKind).toBe(
      "formal_master_assigned",
    );
  });
});

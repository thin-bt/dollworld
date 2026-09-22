import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { EnrollmentAssignmentKind } from "./types.js";

const CHILD_ID = asPersonId("child_semantic_invariant");
const MASTER_ID = asPersonId("master_semantic_invariant");

function runtimeWithAssignmentEntry(entry: Record<string, unknown>): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    mentorshipByChildPersonId: [
      {
        childPersonId: CHILD_ID,
        assignedAbsoluteWeek: 1,
        ...entry,
      },
    ],
  };
}

function coherentEntryForKind(kind: EnrollmentAssignmentKind): Record<string, unknown> {
  switch (kind) {
    case "formal_master_assigned":
      return {
        enrollmentOutcomeKind: kind,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "formal_master_disciple",
      };
    case "parent_master_assigned":
      return {
        enrollmentOutcomeKind: kind,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "parent_master_disciple",
      };
    case "parent_temporary_guidance":
      return {
        enrollmentOutcomeKind: kind,
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "parent_temporary_guidance",
      };
    case "not_at_enrollment_boundary":
    case "no_eligible_or_accepted_master":
      return { enrollmentOutcomeKind: kind };
    default: {
      const _exhaustive: never = kind;
      throw new Error(String(_exhaustive));
    }
  }
}

describe("S03-067 mentorship assignment semantic invariant", () => {
  it.each([
    "formal_master_assigned",
    "parent_master_assigned",
    "parent_temporary_guidance",
    "not_at_enrollment_boundary",
    "no_eligible_or_accepted_master",
  ] as const)("accepts coherent persisted entry for %s", (kind) => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithAssignmentEntry(coherentEntryForKind(kind)),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.mentorshipByChildPersonId[0]?.enrollmentOutcomeKind).toBe(kind);
  });

  it.each([
    ["formal_master_assigned", "formal_master_disciple"],
    ["parent_master_assigned", "parent_master_disciple"],
  ] as const)(
    "rejects active assignment outcome %s without selectedMasterPersonId",
    (outcomeKind, relationKind) => {
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithAssignmentEntry({
          enrollmentOutcomeKind: outcomeKind,
          mentorshipRelationKind: relationKind,
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/mentorshipByChildPersonId/0/selectedMasterPersonId",
            message: `${outcomeKind} requires selectedMasterPersonId`,
          }),
        ]),
      );
    },
  );

  it.each([
    ["formal_master_assigned", "formal_master_disciple"],
    ["parent_master_assigned", "parent_master_disciple"],
  ] as const)(
    "rejects active assignment outcome %s without mentorshipRelationKind",
    (outcomeKind, relationKind) => {
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithAssignmentEntry({
          enrollmentOutcomeKind: outcomeKind,
          selectedMasterPersonId: MASTER_ID,
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/mentorshipByChildPersonId/0/mentorshipRelationKind",
            message: `${outcomeKind} requires mentorshipRelationKind`,
          }),
        ]),
      );
      void relationKind;
    },
  );

  it("rejects formal_master_assigned with parent_master_disciple relation", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithAssignmentEntry({
        enrollmentOutcomeKind: "formal_master_assigned",
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "parent_master_disciple",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/mentorshipByChildPersonId/0/mentorshipRelationKind",
          message: "formal_master_assigned requires mentorshipRelationKind formal_master_disciple",
          actual: "parent_master_disciple",
        }),
      ]),
    );
  });

  it("rejects parent_master_assigned with formal_master_disciple relation", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithAssignmentEntry({
        enrollmentOutcomeKind: "parent_master_assigned",
        selectedMasterPersonId: MASTER_ID,
        mentorshipRelationKind: "formal_master_disciple",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/mentorshipByChildPersonId/0/mentorshipRelationKind",
          message: "parent_master_assigned requires mentorshipRelationKind parent_master_disciple",
          actual: "formal_master_disciple",
        }),
      ]),
    );
  });

  it.each(["not_at_enrollment_boundary", "no_eligible_or_accepted_master"] as const)(
    "rejects non-assignment outcome %s carrying assignment payload",
    (outcomeKind) => {
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithAssignmentEntry({
          enrollmentOutcomeKind: outcomeKind,
          selectedMasterPersonId: MASTER_ID,
          mentorshipRelationKind: "formal_master_disciple",
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/mentorshipByChildPersonId/0/selectedMasterPersonId",
            message: `${outcomeKind} must not include selectedMasterPersonId`,
          }),
          expect.objectContaining({
            path: "/mentorshipByChildPersonId/0/mentorshipRelationKind",
            message: `${outcomeKind} must not include mentorshipRelationKind`,
          }),
        ]),
      );
    },
  );
});

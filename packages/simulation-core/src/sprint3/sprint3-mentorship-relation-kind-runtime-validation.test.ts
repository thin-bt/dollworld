import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import {
  cloneMentorshipEntrypointRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import { MENTORSHIP_RELATION_KINDS, type MentorshipRelationKind } from "./types.js";

const CHILD_ID = asPersonId("child_relation_kind_validation");

function runtimeWithAssignment(
  mentorshipRelationKind: MentorshipRelationKind | undefined,
): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    mentorshipByChildPersonId: [
      {
        childPersonId: CHILD_ID,
        enrollmentOutcomeKind: "parent_master_assigned",
        assignedAbsoluteWeek: 1,
        ...(mentorshipRelationKind === undefined ? {} : { mentorshipRelationKind }),
      },
    ],
  };
}

describe("S03-058 mentorshipRelationKind runtime validation", () => {
  it.each(MENTORSHIP_RELATION_KINDS)("accepts persisted mentorshipRelationKind %s", (kind) => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(runtimeWithAssignment(kind));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.mentorshipByChildPersonId[0]?.mentorshipRelationKind).toBe(kind);
  });

  it("accepts assignment entries with mentorshipRelationKind omitted", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithAssignment(undefined),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.mentorshipByChildPersonId[0]?.mentorshipRelationKind).toBeUndefined();
  });

  it("rejects unknown persisted mentorshipRelationKind with precise path", () => {
    const payload = runtimeWithAssignment(undefined);
    const entry = (payload.mentorshipByChildPersonId as Record<string, unknown>[])[0]!;
    entry.mentorshipRelationKind = "not_a_real_relation_kind";

    const result = validateSprint3MentorshipEntrypointRuntimeState(payload);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/mentorshipByChildPersonId/0/mentorshipRelationKind",
          message: "mentorshipRelationKind must be a known MentorshipRelationKind",
          actual: "not_a_real_relation_kind",
        }),
      ]),
    );
  });

  it("clone round-trip preserves validated mentorshipRelationKind", () => {
    const validated = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithAssignment("parent_temporary_guidance"),
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
    expect(roundTrip.value.mentorshipByChildPersonId[0]?.mentorshipRelationKind).toBe(
      "parent_temporary_guidance",
    );
  });
});

import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import {
  cloneMentorshipEntrypointRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";

const CHILD_ID = asPersonId("child_completed_outcome_validation");
const MASTER_ID = asPersonId("master_completed_outcome_validation");

function validEnrollmentHistoryEntry(): Record<string, unknown> {
  return {
    absoluteWeek: 8,
    childPersonId: CHILD_ID,
    outcome: {
      kind: "formal_master_assigned",
      selectedMasterPersonId: MASTER_ID,
      mentorshipRelationKind: "formal_master_disciple",
      reasons: ["formal_master_assigned"],
    },
  };
}

function validIntakeHistoryEntry(): Record<string, unknown> {
  return {
    absoluteWeek: 8,
    masterPersonId: MASTER_ID,
    childPersonId: CHILD_ID,
    outcome: {
      acceptance: "accept",
      autonomousMaxDisciples: 3,
      reasons: ["under_autonomous_limit"],
    },
  };
}

function validExplicitTeachHistoryEntry(): Record<string, unknown> {
  return {
    absoluteWeek: 10,
    masterPersonId: MASTER_ID,
    outcome: {
      kind: "teach_week_completed",
      weeklyTeachSlotLimit: 1,
      discipleOutcomes: [
        {
          disciplePersonId: CHILD_ID,
          techniqueId: "tech_001",
          decision: "accepted",
          compositeScore: 42.5,
          reasons: ["teach_accepted"],
        },
      ],
      reasons: ["explicit_weekly_teach_processed"],
    },
  };
}

function runtimeWithCompletedHistories(
  overrides: Partial<{
    completedEnrollmentOutcomes: unknown[];
    completedMasterIntakeOutcomes: unknown[];
    completedExplicitWeeklyTeachOutcomes: unknown[];
  }> = {},
): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    completedEnrollmentOutcomes: overrides.completedEnrollmentOutcomes ?? [
      validEnrollmentHistoryEntry(),
    ],
    completedMasterIntakeOutcomes: overrides.completedMasterIntakeOutcomes ?? [
      validIntakeHistoryEntry(),
    ],
    completedExplicitWeeklyTeachOutcomes: overrides.completedExplicitWeeklyTeachOutcomes ?? [
      validExplicitTeachHistoryEntry(),
    ],
  };
}

describe("Sprint3 completed-history persisted runtime validation", () => {
  it("accepts valid completed enrollment, intake, and explicit teach histories", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(runtimeWithCompletedHistories());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.completedEnrollmentOutcomes[0]?.outcome.kind).toBe(
      "formal_master_assigned",
    );
    expect(result.value.completedMasterIntakeOutcomes[0]?.outcome.acceptance).toBe("accept");
    expect(result.value.completedExplicitWeeklyTeachOutcomes[0]?.outcome.kind).toBe(
      "teach_week_completed",
    );
  });

  it("rejects scalar completed enrollment entry", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedEnrollmentOutcomes: ["not-an-object"] }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unknown keys on completed enrollment entry", () => {
    const entry = validEnrollmentHistoryEntry();
    entry.extraField = "surprise";
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedEnrollmentOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/completedEnrollmentOutcomes/0/extraField",
          message: "unknown key is not allowed",
        }),
      ]),
    );
  });

  it("rejects unknown enrollment outcome kind in completed history", () => {
    const entry = validEnrollmentHistoryEntry();
    (entry.outcome as Record<string, unknown>).kind = "bogus_enrollment_kind";
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedEnrollmentOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/completedEnrollmentOutcomes/0/outcome/kind",
          actual: "bogus_enrollment_kind",
        }),
      ]),
    );
  });

  it("rejects malformed absoluteWeek on completed intake entry", () => {
    const entry = validIntakeHistoryEntry();
    entry.absoluteWeek = -1;
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedMasterIntakeOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects unknown master intake acceptance in completed history", () => {
    const entry = validIntakeHistoryEntry();
    (entry.outcome as Record<string, unknown>).acceptance = "maybe";
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedMasterIntakeOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/completedMasterIntakeOutcomes/0/outcome/acceptance",
          actual: "maybe",
        }),
      ]),
    );
  });

  it("rejects unknown explicit weekly teach outcome kind", () => {
    const entry = validExplicitTeachHistoryEntry();
    (entry.outcome as Record<string, unknown>).kind = "not_a_teach_kind";
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedExplicitWeeklyTeachOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/completedExplicitWeeklyTeachOutcomes/0/outcome/kind",
          actual: "not_a_teach_kind",
        }),
      ]),
    );
  });

  it("rejects non-string reason elements in nested enrollment outcome", () => {
    const entry = validEnrollmentHistoryEntry();
    (entry.outcome as Record<string, unknown>).reasons = [123];
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories({ completedEnrollmentOutcomes: [entry] }),
    );
    expect(result.ok).toBe(false);
  });

  it("clone round-trip preserves validated completed histories", () => {
    const validated = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedHistories(),
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
    expect(roundTrip.value.completedEnrollmentOutcomes[0]?.childPersonId).toBe(CHILD_ID);
  });
});

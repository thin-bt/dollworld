import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { evaluateMasterIntakeDecision } from "./evaluate-master-intake.js";
import { createSprint3Balance040ConfigInput } from "./sprint3-config-defaults.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { MasterIntakeEvaluationRecord } from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const MASTER_ID = asPersonId("master_intake_semantic_invariant");
const CHILD_ID = asPersonId("child_intake_semantic_invariant");
const provider = createNodeSha256Provider();

function intakeRecord(
  overrides: Partial<MasterIntakeEvaluationRecord> = {},
): MasterIntakeEvaluationRecord {
  return {
    masterPersonId: "master-1",
    currentFormalDiscipleCount: 0,
    teachingAbilityScore: 50,
    successorOrientationScore: 0,
    massDiscipleToleranceScore: 0,
    ...overrides,
  };
}

function runtimeWithCompletedIntakeOutcome(
  outcome: Record<string, unknown>,
): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    completedEnrollmentOutcomes: [],
    completedExplicitWeeklyTeachOutcomes: [],
    completedMasterIntakeOutcomes: [
      {
        absoluteWeek: 8,
        masterPersonId: MASTER_ID,
        childPersonId: CHILD_ID,
        outcome,
      },
    ],
  };
}

describe("Sprint3 completed master intake outcome semantic invariant", () => {
  it.each([
    ["accept", "at_or_over_autonomous_limit_reject"],
    ["accept", "at_autonomous_limit_high_aptitude_defer"],
    ["defer", "under_autonomous_limit"],
    ["defer", "at_or_over_autonomous_limit_reject"],
    ["reject", "under_autonomous_limit"],
    ["reject", "at_autonomous_limit_high_aptitude_defer"],
  ] as const)(
    "rejects %s with incompatible producer branch reason %s",
    (acceptance, foreignReason) => {
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithCompletedIntakeOutcome({
          acceptance,
          autonomousMaxDisciples: 8,
          reasons: [foreignReason],
        }),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/completedMasterIntakeOutcomes/0/outcome/reasons",
          }),
        ]),
      );
    },
  );

  it("rejects accept with non-producer reason only", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedIntakeOutcome({
        acceptance: "accept",
        autonomousMaxDisciples: 8,
        reasons: ["legacy_unknown_reason"],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects producer-valid reason with extra unknown reason element", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedIntakeOutcome({
        acceptance: "accept",
        autonomousMaxDisciples: 8,
        reasons: ["under_autonomous_limit", "legacy_unknown_reason"],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it.each([
    {
      label: "accept under limit",
      record: intakeRecord({ currentFormalDiscipleCount: 2 }),
    },
    {
      label: "reject at limit",
      record: intakeRecord({ currentFormalDiscipleCount: 8 }),
    },
    {
      label: "defer high aptitude at limit",
      record: intakeRecord({
        currentFormalDiscipleCount: 8,
        applicant: {
          childPersonId: "child-1",
          lineageAptitudeScore: 80,
          parentChildCompatibilityScore: 0,
        },
      }),
    },
  ])("accepts S03-004 producer round-trip ($label)", ({ record }) => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      throw new Error("expected valid sprint3 config");
    }
    const evaluated = evaluateMasterIntakeDecision(config.value, record);
    expect(evaluated.ok).toBe(true);
    if (!evaluated.ok) {
      throw new Error(JSON.stringify(evaluated.issues));
    }
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedIntakeOutcome(evaluated.value as unknown as Record<string, unknown>),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.completedMasterIntakeOutcomes[0]?.outcome).toEqual(evaluated.value);
  });
});

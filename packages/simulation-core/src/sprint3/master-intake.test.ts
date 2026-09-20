import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { evaluateEnrollmentAssignment } from "./evaluate-enrollment-assignment.js";
import {
  computeAutonomousMaxDisciples,
  evaluateMasterIntakeDecision,
} from "./evaluate-master-intake.js";
import {
  createSprint3Balance030ConfigInput,
  createSprint3Balance040ConfigInput,
} from "./sprint3-config-defaults.js";
import type { MasterIntakeEvaluationRecord } from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

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

describe("S03-004 master intake", () => {
  it("IN-001 sprint3-balance-0.4.0 validates with stable hash", () => {
    const result = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(result.ok).toBe(true);
  });

  it("IN-002 fail-closed when autonomous intake policy is absent (0.3.0)", () => {
    const config = validateSprint3Config(createSprint3Balance030ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterIntakeDecision(config.value, intakeRecord());
    expect(outcome.ok).toBe(false);
  });

  it("IN-003 accepts when current disciples are under autonomous max", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ currentFormalDiscipleCount: 2 }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.acceptance).toBe("accept");
    expect(outcome.value.autonomousMaxDisciples).toBe(8);
    expect(outcome.value.reasons).toContain("under_autonomous_limit");
  });

  it("IN-004 rejects at limit without high-aptitude applicant (no world-global cap)", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ currentFormalDiscipleCount: 8 }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.acceptance).toBe("reject");
    expect(outcome.value.reasons).toContain("at_or_over_autonomous_limit_reject");
  });

  it("IN-005 defers at limit when applicant aptitude meets threshold (hold)", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({
        currentFormalDiscipleCount: 8,
        applicant: {
          childPersonId: "child-1",
          lineageAptitudeScore: 80,
          parentChildCompatibilityScore: 0,
        },
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.acceptance).toBe("defer");
    expect(outcome.value.reasons).toContain("at_autonomous_limit_high_aptitude_defer");
  });

  it("IN-006 deterministic autonomous max from config formula and traits", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok || config.value.masterIntake === undefined) {
      return;
    }
    if (
      config.value.masterIntake.evaluationPolicyVersion !== "master-intake-autonomous-limit-0.1.0"
    ) {
      return;
    }
    const formula = config.value.masterIntake.limitFormula;
    const maxA = computeAutonomousMaxDisciples(
      formula,
      intakeRecord({
        teachingAbilityScore: 50,
        massDiscipleToleranceScore: 50,
        successorOrientationScore: 50,
      }),
    );
    const maxB = computeAutonomousMaxDisciples(
      formula,
      intakeRecord({
        teachingAbilityScore: 50,
        massDiscipleToleranceScore: 50,
        successorOrientationScore: 50,
      }),
    );
    expect(maxA).toBe(maxB);
    expect(maxA).toBe(13);
  });

  it("IN-007 clamps per-master max without introducing a world-global disciple cap", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok || config.value.masterIntake === undefined) {
      return;
    }
    if (
      config.value.masterIntake.evaluationPolicyVersion !== "master-intake-autonomous-limit-0.1.0"
    ) {
      return;
    }
    const formula = config.value.masterIntake.limitFormula;
    const elite = computeAutonomousMaxDisciples(
      formula,
      intakeRecord({
        teachingAbilityScore: 0,
        massDiscipleToleranceScore: 0,
        successorOrientationScore: 100,
      }),
    );
    const mass = computeAutonomousMaxDisciples(
      formula,
      intakeRecord({
        teachingAbilityScore: 100,
        massDiscipleToleranceScore: 100,
        successorOrientationScore: 0,
      }),
    );
    expect(elite).toBe(1);
    expect(mass).toBe(33);
    expect(elite).not.toBe(mass);
  });

  it("IN-008 boundary accepts at count max-1 and rejects at max without defer context", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const under = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ currentFormalDiscipleCount: 7 }),
    );
    const at = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ currentFormalDiscipleCount: 8 }),
    );
    expect(under.ok && at.ok).toBe(true);
    if (!under.ok || !at.ok) {
      return;
    }
    expect(under.value.acceptance).toBe("accept");
    expect(at.value.acceptance).toBe("reject");
  });

  it("IN-009 intake outcome feeds S03-003 enrollment intakeAcceptance boundary", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const intake = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ currentFormalDiscipleCount: 8 }),
    );
    expect(intake.ok).toBe(true);
    if (!intake.ok) {
      return;
    }
    const enrollment = evaluateEnrollmentAssignment(config.value, {
      childPersonId: "child-1",
      childAge: 8,
      activeSpecialReasons: [],
      masterCandidates: [
        {
          masterPersonId: "master-1",
          isBiologicalParent: true,
          qualificationRecord: {
            careerStatus: "retired",
            lifeStatus: "living",
            retirementRank: "C",
            highestRank: "C",
            officialWins: 0,
            limitedOfficialWins: 0,
            tournamentTitles: 0,
          },
          parentChildCompatibilityScore: 50,
          lineageAptitudeScore: 50,
          schoolFitScore: 50,
          teachingEfficiencyScore: 50,
          intakeAcceptance: intake.value.acceptance,
        },
      ],
    });
    expect(enrollment.ok).toBe(true);
    if (!enrollment.ok) {
      return;
    }
    expect(enrollment.value.kind).toBe("no_eligible_or_accepted_master");
  });

  it("IN-010 rejects invalid trait scores fail-closed", () => {
    const config = validateSprint3Config(createSprint3Balance040ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterIntakeDecision(
      config.value,
      intakeRecord({ teachingAbilityScore: 101 }),
    );
    expect(outcome.ok).toBe(false);
  });
});

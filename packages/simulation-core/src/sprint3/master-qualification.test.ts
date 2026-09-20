import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import {
  createDefaultSprint3ConfigInput,
  createSprint3Balance020ConfigInput,
} from "./sprint3-config-defaults.js";
import type { MasterQualificationEvaluationRecord } from "./types.js";
import {
  validateNormalizedSprint3Config,
  validateSprint3Config,
} from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function retiredRecord(
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

describe("S03-002 master qualification", () => {
  it("MQ-001 sprint3-balance-0.2.0 validates with stable hash", () => {
    const result = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(result.ok).toBe(true);
  });

  it("MQ-002 qualifies retired living person at minimum rank boundary", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterQualificationEligibility(config.value, retiredRecord());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.eligible).toBe(true);
    expect(outcome.value.reasons).toEqual([]);
  });

  it("MQ-003 rejects rank below configured minimum", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterQualificationEligibility(
      config.value,
      retiredRecord({ retirementRank: "D", highestRank: "D" }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.eligible).toBe(false);
    expect(outcome.value.reasons).toContain("retirement_rank_below_minimum");
  });

  it("MQ-004 rejects active competitor even with high rank", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterQualificationEligibility(
      config.value,
      retiredRecord({
        careerStatus: "active_competitor",
        highestRank: "S",
      }),
    );
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.eligible).toBe(false);
    expect(outcome.value.reasons).toContain("career_status_not_retired");
  });

  it("MQ-005 rejects child and trainee career statuses", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    for (const careerStatus of ["child", "trainee"] as const) {
      const outcome = evaluateMasterQualificationEligibility(
        config.value,
        retiredRecord({ careerStatus }),
      );
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) {
        continue;
      }
      expect(outcome.value.eligible).toBe(false);
      expect(outcome.value.reasons).toContain("career_status_not_retired");
    }
  });

  it("MQ-006 fails closed on deferred policy without thresholds", () => {
    const config = validateSprint3Config(createDefaultSprint3ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const outcome = evaluateMasterQualificationEligibility(config.value, retiredRecord());
    expect(outcome.ok).toBe(false);
  });

  it("MQ-007 rejects rank-and-records policy missing eligibilityThresholds", () => {
    const input = createSprint3Balance020ConfigInput();
    delete (input.masterQualification as { eligibilityThresholds?: unknown }).eligibilityThresholds;
    expect(validateNormalizedSprint3Config(input).ok).toBe(false);
  });

  it("MQ-008 enforces win/title thresholds from config", () => {
    const input = createSprint3Balance020ConfigInput();
    if (
      input.masterQualification.evaluationPolicyVersion !==
      "master-qualification-rank-and-records-0.1.0"
    ) {
      throw new Error("unexpected policy fixture");
    }
    input.masterQualification.eligibilityThresholds.minimumOfficialWins = 5;
    input.masterQualification.eligibilityThresholds.minimumTournamentTitles = 1;
    input.configVersion = "sprint3-balance-0.2.0-mq008-test";
    const config = validateNormalizedSprint3Config(input);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const below = evaluateMasterQualificationEligibility(
      config.value,
      retiredRecord({ officialWins: 4, tournamentTitles: 0 }),
    );
    expect(below.ok).toBe(true);
    if (!below.ok) {
      return;
    }
    expect(below.value.eligible).toBe(false);
    expect(below.value.reasons).toEqual(
      expect.arrayContaining(["official_wins_below_minimum", "tournament_titles_below_minimum"]),
    );

    const meets = evaluateMasterQualificationEligibility(
      config.value,
      retiredRecord({ officialWins: 5, tournamentTitles: 1 }),
    );
    expect(meets.ok).toBe(true);
    if (!meets.ok) {
      return;
    }
    expect(meets.value.eligible).toBe(true);
  });

  it("MQ-009 evaluation is deterministic for identical inputs", () => {
    const config = validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    expect(config.ok).toBe(true);
    if (!config.ok) {
      return;
    }
    const record = retiredRecord({ officialWins: 2, limitedOfficialWins: 1 });
    const first = evaluateMasterQualificationEligibility(config.value, record);
    const second = evaluateMasterQualificationEligibility(config.value, record);
    expect(first).toEqual(second);
  });

  it("MQ-010 rejects tampering sprint3-balance-0.2.0 registered body", () => {
    validateSprint3Config(createSprint3Balance020ConfigInput(), provider);
    const tampered = createSprint3Balance020ConfigInput();
    if (
      tampered.masterQualification.evaluationPolicyVersion !==
      "master-qualification-rank-and-records-0.1.0"
    ) {
      throw new Error("unexpected policy fixture");
    }
    tampered.masterQualification.eligibilityThresholds.minimumRetirementRank = "B";
    expect(validateNormalizedSprint3Config(tampered).ok).toBe(false);
  });
});

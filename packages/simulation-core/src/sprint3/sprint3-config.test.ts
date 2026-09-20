import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  createDefaultSprint3ConfigInput,
  createSprint3Balance030ConfigInput,
  createSprint3Balance040ConfigInput,
  createSprint3Balance050ConfigInput,
  createSprint3Balance060ConfigInput,
  createSprint3Balance070ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  computeSprint3ConfigHash,
  validateNormalizedSprint3Config,
  validateSprint3Config,
} from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

describe("S03-001 Sprint3Config", () => {
  it("CFG-001 canonical Sprint3Config validates and produces stable hash", () => {
    const result = validateSprint3Config(createDefaultSprint3ConfigInput(), provider);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const hashA = computeSprint3ConfigHash(result.value, provider);
    const hashB = computeSprint3ConfigHash(result.value, provider);
    expect(hashA.ok && hashB.ok).toBe(true);
    if (!hashA.ok || !hashB.ok) {
      return;
    }
    expect(hashA.value).toBe(hashB.value);
    expect(hashA.value).toMatch(/^[0-9a-f]{64}$/);
  });

  it("CFG-002 rejects unknown root key", () => {
    const input = {
      ...createDefaultSprint3ConfigInput(),
      unknownRoot: true,
    };
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("CFG-003 rejects enrollment age boundary mismatch", () => {
    const input = createDefaultSprint3ConfigInput();
    input.enrollment.childhoodInfluenceMaxAge = 6;
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("CFG-004 rejects same configVersion with changed canonical content", () => {
    validateSprint3Config(createDefaultSprint3ConfigInput(), provider);
    const tampered = createDefaultSprint3ConfigInput();
    tampered.teachingEfficiency.discipleCountFactorBrackets[0]!.factorTenThousandths = 9999;
    expect(validateNormalizedSprint3Config(tampered).ok).toBe(false);
  });

  it("CFG-005 rejects non-contiguous disciple brackets", () => {
    const input = createDefaultSprint3ConfigInput();
    input.teachingEfficiency.discipleCountFactorBrackets = [
      { minDisciplesInclusive: 1, maxDisciplesInclusive: 3, factorTenThousandths: 10000 },
      { minDisciplesInclusive: 5, maxDisciplesInclusive: 6, factorTenThousandths: 9200 },
    ];
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("CFG-006 rejects enabling deferred mentorship feature flags", () => {
    const input = createDefaultSprint3ConfigInput();
    input.mentorshipFeatures.explicitWeeklyTeachActionEnabled = true;
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("CFG-007 rejects fractional fixed-point input", () => {
    const input = createDefaultSprint3ConfigInput();
    input.teachingEfficiency.parentTemporaryGuidanceFactorTenThousandths = 7500.5;
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("CFG-008 accepts enrollmentAssignmentAiEnabled on sprint3-balance-0.3.0", () => {
    expect(validateSprint3Config(createSprint3Balance030ConfigInput(), provider).ok).toBe(true);
  });

  it("CFG-009 accepts masterIntake autonomous policy on sprint3-balance-0.4.0", () => {
    expect(validateSprint3Config(createSprint3Balance040ConfigInput(), provider).ok).toBe(true);
  });

  it("CFG-010 accepts weekly training teachingEfficiency binding on sprint3-balance-0.5.0", () => {
    expect(validateSprint3Config(createSprint3Balance050ConfigInput(), provider).ok).toBe(true);
  });

  it("CFG-011 accepts parent temporary guidance weekly binding on sprint3-balance-0.6.0", () => {
    expect(validateSprint3Config(createSprint3Balance060ConfigInput(), provider).ok).toBe(true);
  });

  it("CFG-012 accepts explicit weekly teach action on sprint3-balance-0.7.0", () => {
    expect(validateSprint3Config(createSprint3Balance070ConfigInput(), provider).ok).toBe(true);
  });
});

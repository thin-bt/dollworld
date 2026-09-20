/**
 * Sprint3Config structural validation and canonical hash (S3-SPEC-0.3.0-draft §1–3).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { RANK_ORDER, type Rank } from "../enums.js";
import {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
  SPRINT3_CONFIG_SCHEMA_VERSION,
  SPRINT3_CONFIG_VERSION_DEFAULT,
  MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
  MASTER_INTAKE_EVALUATION_POLICY_DEFERRED,
  SPRINT3_CONFIG_VERSION_ENROLLMENT,
  SPRINT3_CONFIG_VERSION_INTAKE,
  SPRINT3_CONFIG_VERSION_QUALIFICATION,
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
  TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
} from "./constants.js";
import {
  createDefaultSprint3ConfigInput,
  createSprint3Balance020ConfigInput,
  createSprint3Balance030ConfigInput,
  createSprint3Balance040ConfigInput,
  createSprint3Balance050ConfigInput,
  createSprint3Balance060ConfigInput,
  createSprint3Balance070ConfigInput,
  createSprint3Balance080ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  getExpectedCanonicalJsonForSprint3ConfigVersion,
  isKnownSprint3ConfigVersion,
  registerKnownSprint3ConfigVersion,
} from "./sprint3-config-version-registry.js";
import type {
  DiscipleCountFactorBracket,
  MasterIntakeLimitFormula,
  MasterQualificationEligibilityThresholds,
  Sprint3Config,
  Sprint3ConfigInput,
  Sprint3MasterIntakeConfig,
  Sprint3TeachingSelectionConfig,
  Sprint3WeeklyTeachActionConfig,
  WeeklyTeachAllocationFormula,
  WeeklyTeachEvaluationWeights,
  WeeklyTeachTierThresholds,
} from "./types.js";
import {
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireBoolean,
  requireIntegerInRange,
  requireLiteralString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";

const ROOT_KEYS = [
  "schemaVersion",
  "configVersion",
  "enrollment",
  "teachingEfficiency",
  "masterQualification",
  "mentorshipFeatures",
  "masterIntake",
  "weeklyTeachAction",
  "teachingSelection",
] as const;

const LEARNING_TIER_KEYS = ["basic", "standard", "advanced", "secret"] as const;

const CONFIG_VERSIONS_WITH_WEEKLY_TEACH_ACTION = new Set<string>([
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
]);

function configVersionRequiresWeeklyTeachAction(configVersion: string): boolean {
  return CONFIG_VERSIONS_WITH_WEEKLY_TEACH_ACTION.has(configVersion);
}

function requireSafeInteger(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): number | undefined {
  if (!(key in object)) {
    issues.push({
      path: parentPath === "" ? `/${key}` : `${parentPath}/${key}`,
      message: "required key is missing",
      actual: undefined,
      expected: "safe integer",
    });
    return undefined;
  }
  const raw = object[key];
  if (typeof raw !== "number" || !Number.isFinite(raw) || !Number.isInteger(raw)) {
    issues.push({
      path: parentPath === "" ? `/${key}` : `${parentPath}/${key}`,
      message: "value must be a safe integer without fractional/NaN/Infinity input",
      actual: raw,
      expected: "safe integer",
    });
    return undefined;
  }
  return raw;
}

function parseEnrollment(
  value: unknown,
  issues: ValidationIssue[],
): Sprint3ConfigInput["enrollment"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/enrollment", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["childhoodInfluenceMaxAge", "formalEnrollmentMinAge", "parentTemporaryGuidanceAllowed"],
    "/enrollment",
    issues,
  );
  const childhoodInfluenceMaxAge = requireIntegerInRange(
    object,
    "childhoodInfluenceMaxAge",
    "/enrollment",
    0,
    15,
    issues,
  );
  const formalEnrollmentMinAge = requireIntegerInRange(
    object,
    "formalEnrollmentMinAge",
    "/enrollment",
    8,
    15,
    issues,
  );
  const parentTemporaryGuidanceAllowed = requireBoolean(
    object,
    "parentTemporaryGuidanceAllowed",
    "/enrollment",
    issues,
  );
  if (
    childhoodInfluenceMaxAge === undefined ||
    formalEnrollmentMinAge === undefined ||
    parentTemporaryGuidanceAllowed === undefined
  ) {
    return undefined;
  }
  if (formalEnrollmentMinAge !== childhoodInfluenceMaxAge + 1) {
    issues.push({
      path: "/enrollment/formalEnrollmentMinAge",
      message:
        "formalEnrollmentMinAge must equal childhoodInfluenceMaxAge + 1 per SPEC enrollment boundary",
      actual: formalEnrollmentMinAge,
      expected: String(childhoodInfluenceMaxAge + 1),
    });
    return undefined;
  }
  return {
    childhoodInfluenceMaxAge,
    formalEnrollmentMinAge,
    parentTemporaryGuidanceAllowed,
  };
}

function parseDiscipleBracket(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): DiscipleCountFactorBracket | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["minDisciplesInclusive", "maxDisciplesInclusive", "factorTenThousandths"],
    path,
    issues,
  );
  const minDisciplesInclusive = requireSafeInteger(object, "minDisciplesInclusive", path, issues);
  const maxDisciplesInclusive = requireSafeInteger(object, "maxDisciplesInclusive", path, issues);
  const factorTenThousandths = requireSafeInteger(object, "factorTenThousandths", path, issues);
  if (
    minDisciplesInclusive === undefined ||
    maxDisciplesInclusive === undefined ||
    factorTenThousandths === undefined
  ) {
    return undefined;
  }
  if (minDisciplesInclusive < 1) {
    issues.push({
      path: `${path}/minDisciplesInclusive`,
      message: "minDisciplesInclusive must be at least 1",
      actual: minDisciplesInclusive,
      expected: ">= 1",
    });
    return undefined;
  }
  if (maxDisciplesInclusive < minDisciplesInclusive) {
    issues.push({
      path: `${path}/maxDisciplesInclusive`,
      message: "maxDisciplesInclusive must not be less than minDisciplesInclusive",
      actual: maxDisciplesInclusive,
      expected: `>= ${String(minDisciplesInclusive)}`,
    });
    return undefined;
  }
  if (factorTenThousandths < 1 || factorTenThousandths > 20000) {
    issues.push({
      path: `${path}/factorTenThousandths`,
      message: "factorTenThousandths must be in 1..20000 (0.0001..2.0 fixed-point scale)",
      actual: factorTenThousandths,
      expected: "1..20000",
    });
    return undefined;
  }
  return { minDisciplesInclusive, maxDisciplesInclusive, factorTenThousandths };
}

function parseTeachingEfficiency(
  value: unknown,
  issues: ValidationIssue[],
): Sprint3ConfigInput["teachingEfficiency"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/teachingEfficiency", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["discipleCountFactorBrackets", "parentTemporaryGuidanceFactorTenThousandths"],
    "/teachingEfficiency",
    issues,
  );
  const parentTemporaryGuidanceFactorTenThousandths = requireSafeInteger(
    object,
    "parentTemporaryGuidanceFactorTenThousandths",
    "/teachingEfficiency",
    issues,
  );
  const rawBrackets = snapshotDenseArrayOrFail(
    object["discipleCountFactorBrackets"],
    "/teachingEfficiency/discipleCountFactorBrackets",
    issues,
  );
  if (rawBrackets === undefined || parentTemporaryGuidanceFactorTenThousandths === undefined) {
    return undefined;
  }
  if (
    parentTemporaryGuidanceFactorTenThousandths < 1 ||
    parentTemporaryGuidanceFactorTenThousandths > 20000
  ) {
    issues.push({
      path: "/teachingEfficiency/parentTemporaryGuidanceFactorTenThousandths",
      message: "parentTemporaryGuidanceFactorTenThousandths must be in 1..20000",
      actual: parentTemporaryGuidanceFactorTenThousandths,
      expected: "1..20000",
    });
    return undefined;
  }
  if (rawBrackets.length === 0) {
    issues.push({
      path: "/teachingEfficiency/discipleCountFactorBrackets",
      message: "at least one disciple count bracket is required",
      actual: rawBrackets.length,
      expected: ">= 1",
    });
    return undefined;
  }
  const brackets: DiscipleCountFactorBracket[] = [];
  for (let index = 0; index < rawBrackets.length; index += 1) {
    const parsed = parseDiscipleBracket(
      rawBrackets[index],
      `/teachingEfficiency/discipleCountFactorBrackets/${String(index)}`,
      issues,
    );
    if (parsed !== undefined) {
      brackets.push(parsed);
    }
  }
  if (brackets.length !== rawBrackets.length) {
    return undefined;
  }
  if (brackets[0]!.minDisciplesInclusive !== 1) {
    issues.push({
      path: "/teachingEfficiency/discipleCountFactorBrackets/0/minDisciplesInclusive",
      message: "first bracket must start at minDisciplesInclusive 1",
      actual: brackets[0]!.minDisciplesInclusive,
      expected: "1",
    });
    return undefined;
  }
  for (let index = 1; index < brackets.length; index += 1) {
    const previous = brackets[index - 1]!;
    const current = brackets[index]!;
    if (current.minDisciplesInclusive !== previous.maxDisciplesInclusive + 1) {
      issues.push({
        path: `/teachingEfficiency/discipleCountFactorBrackets/${String(index)}/minDisciplesInclusive`,
        message: "brackets must be contiguous without gaps or overlaps",
        actual: current.minDisciplesInclusive,
        expected: String(previous.maxDisciplesInclusive + 1),
      });
      return undefined;
    }
  }
  return {
    discipleCountFactorBrackets: Object.freeze(brackets),
    parentTemporaryGuidanceFactorTenThousandths,
  };
}

function parseEligibilityThresholds(
  value: unknown,
  issues: ValidationIssue[],
): MasterQualificationEligibilityThresholds | undefined {
  const object = snapshotPlainObjectOrFail(
    value,
    "/masterQualification/eligibilityThresholds",
    issues,
  );
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    [
      "minimumRetirementRank",
      "minimumOfficialWins",
      "minimumLimitedOfficialWins",
      "minimumTournamentTitles",
    ],
    "/masterQualification/eligibilityThresholds",
    issues,
  );
  const minimumRetirementRankRaw = object["minimumRetirementRank"];
  if (typeof minimumRetirementRankRaw !== "string") {
    issues.push({
      path: "/masterQualification/eligibilityThresholds/minimumRetirementRank",
      message: "minimumRetirementRank must be a rank literal",
      actual: minimumRetirementRankRaw,
      expected: RANK_ORDER.join("|"),
    });
    return undefined;
  }
  if (!(RANK_ORDER as readonly string[]).includes(minimumRetirementRankRaw)) {
    issues.push({
      path: "/masterQualification/eligibilityThresholds/minimumRetirementRank",
      message: "minimumRetirementRank must be a known rank",
      actual: minimumRetirementRankRaw,
      expected: RANK_ORDER.join("|"),
    });
    return undefined;
  }
  const minimumOfficialWins = requireSafeInteger(
    object,
    "minimumOfficialWins",
    "/masterQualification/eligibilityThresholds",
    issues,
  );
  const minimumLimitedOfficialWins = requireSafeInteger(
    object,
    "minimumLimitedOfficialWins",
    "/masterQualification/eligibilityThresholds",
    issues,
  );
  const minimumTournamentTitles = requireSafeInteger(
    object,
    "minimumTournamentTitles",
    "/masterQualification/eligibilityThresholds",
    issues,
  );
  if (
    minimumOfficialWins === undefined ||
    minimumLimitedOfficialWins === undefined ||
    minimumTournamentTitles === undefined
  ) {
    return undefined;
  }
  if (minimumOfficialWins < 0 || minimumOfficialWins > 1_000_000) {
    issues.push({
      path: "/masterQualification/eligibilityThresholds/minimumOfficialWins",
      message: "minimumOfficialWins must be in 0..1000000",
      actual: minimumOfficialWins,
      expected: "0..1000000",
    });
    return undefined;
  }
  if (minimumLimitedOfficialWins < 0 || minimumLimitedOfficialWins > 1_000_000) {
    issues.push({
      path: "/masterQualification/eligibilityThresholds/minimumLimitedOfficialWins",
      message: "minimumLimitedOfficialWins must be in 0..1000000",
      actual: minimumLimitedOfficialWins,
      expected: "0..1000000",
    });
    return undefined;
  }
  if (minimumTournamentTitles < 0 || minimumTournamentTitles > 10_000) {
    issues.push({
      path: "/masterQualification/eligibilityThresholds/minimumTournamentTitles",
      message: "minimumTournamentTitles must be in 0..10000",
      actual: minimumTournamentTitles,
      expected: "0..10000",
    });
    return undefined;
  }
  return {
    minimumRetirementRank: minimumRetirementRankRaw as Rank,
    minimumOfficialWins,
    minimumLimitedOfficialWins,
    minimumTournamentTitles,
  };
}

function parseMasterQualification(
  value: unknown,
  issues: ValidationIssue[],
): Sprint3ConfigInput["masterQualification"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/masterQualification", issues);
  if (object === undefined) {
    return undefined;
  }

  const evaluationPolicyVersionRaw = object["evaluationPolicyVersion"];
  if (typeof evaluationPolicyVersionRaw !== "string") {
    issues.push({
      path: "/masterQualification/evaluationPolicyVersion",
      message: "evaluationPolicyVersion must be a string literal",
      actual: evaluationPolicyVersionRaw,
      expected: "string",
    });
    return undefined;
  }

  if (evaluationPolicyVersionRaw === MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED) {
    rejectUnknownKeys(object, ["evaluationPolicyVersion"], "/masterQualification", issues);
    return { evaluationPolicyVersion: MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED };
  }

  if (evaluationPolicyVersionRaw === MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS) {
    rejectUnknownKeys(
      object,
      ["evaluationPolicyVersion", "eligibilityThresholds"],
      "/masterQualification",
      issues,
    );
    if (!("eligibilityThresholds" in object)) {
      issues.push({
        path: "/masterQualification/eligibilityThresholds",
        message: "eligibilityThresholds is required for rank-and-records evaluation policy",
        actual: undefined,
        expected: "object",
      });
      return undefined;
    }
    const eligibilityThresholds = parseEligibilityThresholds(
      object["eligibilityThresholds"],
      issues,
    );
    if (eligibilityThresholds === undefined) {
      return undefined;
    }
    return {
      evaluationPolicyVersion: MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
      eligibilityThresholds,
    };
  }

  issues.push({
    path: "/masterQualification/evaluationPolicyVersion",
    message: "unsupported masterQualification.evaluationPolicyVersion",
    actual: evaluationPolicyVersionRaw,
    expected: `${MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED}|${MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS}`,
  });
  return undefined;
}

function parseLimitFormula(
  value: unknown,
  issues: ValidationIssue[],
): MasterIntakeLimitFormula | undefined {
  const object = snapshotPlainObjectOrFail(value, "/masterIntake/limitFormula", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    [
      "baseAutonomousMaxDisciples",
      "teachingAbilityBonusPerTenPoints",
      "massDiscipleToleranceBonusPerTenPoints",
      "successorOrientationPenaltyPerTenPoints",
      "minimumAutonomousMaxDisciples",
      "maximumAutonomousMaxDisciples",
    ],
    "/masterIntake/limitFormula",
    issues,
  );
  const baseAutonomousMaxDisciples = requireSafeInteger(
    object,
    "baseAutonomousMaxDisciples",
    "/masterIntake/limitFormula",
    issues,
  );
  const teachingAbilityBonusPerTenPoints = requireSafeInteger(
    object,
    "teachingAbilityBonusPerTenPoints",
    "/masterIntake/limitFormula",
    issues,
  );
  const massDiscipleToleranceBonusPerTenPoints = requireSafeInteger(
    object,
    "massDiscipleToleranceBonusPerTenPoints",
    "/masterIntake/limitFormula",
    issues,
  );
  const successorOrientationPenaltyPerTenPoints = requireSafeInteger(
    object,
    "successorOrientationPenaltyPerTenPoints",
    "/masterIntake/limitFormula",
    issues,
  );
  const minimumAutonomousMaxDisciples = requireSafeInteger(
    object,
    "minimumAutonomousMaxDisciples",
    "/masterIntake/limitFormula",
    issues,
  );
  const maximumAutonomousMaxDisciples = requireSafeInteger(
    object,
    "maximumAutonomousMaxDisciples",
    "/masterIntake/limitFormula",
    issues,
  );
  if (
    baseAutonomousMaxDisciples === undefined ||
    teachingAbilityBonusPerTenPoints === undefined ||
    massDiscipleToleranceBonusPerTenPoints === undefined ||
    successorOrientationPenaltyPerTenPoints === undefined ||
    minimumAutonomousMaxDisciples === undefined ||
    maximumAutonomousMaxDisciples === undefined
  ) {
    return undefined;
  }
  if (minimumAutonomousMaxDisciples < 1) {
    issues.push({
      path: "/masterIntake/limitFormula/minimumAutonomousMaxDisciples",
      message: "minimumAutonomousMaxDisciples must be at least 1",
      actual: minimumAutonomousMaxDisciples,
      expected: ">= 1",
    });
    return undefined;
  }
  if (maximumAutonomousMaxDisciples < minimumAutonomousMaxDisciples) {
    issues.push({
      path: "/masterIntake/limitFormula/maximumAutonomousMaxDisciples",
      message: "maximumAutonomousMaxDisciples must be >= minimumAutonomousMaxDisciples",
      actual: maximumAutonomousMaxDisciples,
      expected: `>= ${minimumAutonomousMaxDisciples}`,
    });
    return undefined;
  }
  return {
    baseAutonomousMaxDisciples,
    teachingAbilityBonusPerTenPoints,
    massDiscipleToleranceBonusPerTenPoints,
    successorOrientationPenaltyPerTenPoints,
    minimumAutonomousMaxDisciples,
    maximumAutonomousMaxDisciples,
  };
}

function parseMasterIntake(
  value: unknown,
  configVersion: string,
  issues: ValidationIssue[],
): Sprint3MasterIntakeConfig | undefined {
  if (value === undefined) {
    if (configVersion === SPRINT3_CONFIG_VERSION_INTAKE) {
      issues.push({
        path: "/masterIntake",
        message: "masterIntake is required for sprint3-balance-0.4.0",
        actual: undefined,
        expected: "object",
      });
    }
    return undefined;
  }
  const object = snapshotPlainObjectOrFail(value, "/masterIntake", issues);
  if (object === undefined) {
    return undefined;
  }
  const evaluationPolicyVersionRaw = object["evaluationPolicyVersion"];
  if (typeof evaluationPolicyVersionRaw !== "string") {
    issues.push({
      path: "/masterIntake/evaluationPolicyVersion",
      message: "evaluationPolicyVersion must be a string literal",
      actual: evaluationPolicyVersionRaw,
      expected: "string",
    });
    return undefined;
  }
  if (evaluationPolicyVersionRaw === MASTER_INTAKE_EVALUATION_POLICY_DEFERRED) {
    rejectUnknownKeys(object, ["evaluationPolicyVersion"], "/masterIntake", issues);
    return { evaluationPolicyVersion: MASTER_INTAKE_EVALUATION_POLICY_DEFERRED };
  }
  if (evaluationPolicyVersionRaw === MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT) {
    rejectUnknownKeys(
      object,
      ["evaluationPolicyVersion", "limitFormula", "deferApplicantAptitudeThreshold"],
      "/masterIntake",
      issues,
    );
    if (!("limitFormula" in object)) {
      issues.push({
        path: "/masterIntake/limitFormula",
        message: "limitFormula is required for autonomous limit intake policy",
        actual: undefined,
        expected: "object",
      });
      return undefined;
    }
    const limitFormula = parseLimitFormula(object["limitFormula"], issues);
    const deferApplicantAptitudeThreshold = requireIntegerInRange(
      object,
      "deferApplicantAptitudeThreshold",
      "/masterIntake",
      0,
      100,
      issues,
    );
    if (limitFormula === undefined || deferApplicantAptitudeThreshold === undefined) {
      return undefined;
    }
    return {
      evaluationPolicyVersion: MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
      limitFormula,
      deferApplicantAptitudeThreshold,
    };
  }
  issues.push({
    path: "/masterIntake/evaluationPolicyVersion",
    message: "unsupported masterIntake.evaluationPolicyVersion",
    actual: evaluationPolicyVersionRaw,
    expected: `${MASTER_INTAKE_EVALUATION_POLICY_DEFERRED}|${MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT}`,
  });
  return undefined;
}

function parseWeeklyTeachTierThresholds(
  value: unknown,
  tierPath: string,
  issues: ValidationIssue[],
): WeeklyTeachTierThresholds | undefined {
  const object = snapshotPlainObjectOrFail(value, tierPath, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["minimumCompositeScore", "minimumTrustScore", "minimumMasterMasteryHundredths"],
    tierPath,
    issues,
  );
  const minimumCompositeScore = requireIntegerInRange(
    object,
    "minimumCompositeScore",
    tierPath,
    0,
    100,
    issues,
  );
  let minimumTrustScore: number | undefined;
  if ("minimumTrustScore" in object) {
    minimumTrustScore = requireIntegerInRange(
      object,
      "minimumTrustScore",
      tierPath,
      0,
      100,
      issues,
    );
  }
  let minimumMasterMasteryHundredths: number | undefined;
  if ("minimumMasterMasteryHundredths" in object) {
    minimumMasterMasteryHundredths = requireIntegerInRange(
      object,
      "minimumMasterMasteryHundredths",
      tierPath,
      0,
      10_000,
      issues,
    );
  }
  if (minimumCompositeScore === undefined) {
    return undefined;
  }
  return {
    minimumCompositeScore,
    ...(minimumTrustScore === undefined ? {} : { minimumTrustScore }),
    ...(minimumMasterMasteryHundredths === undefined
      ? {}
      : { minimumMasterMasteryHundredths }),
  };
}

function parseWeeklyTeachAction(
  value: unknown,
  configVersion: string,
  issues: ValidationIssue[],
): Sprint3WeeklyTeachActionConfig | undefined {
  if (value === undefined) {
    if (configVersionRequiresWeeklyTeachAction(configVersion)) {
      issues.push({
        path: "/weeklyTeachAction",
        message: "weeklyTeachAction is required on sprint3-balance-0.7.0 and sprint3-balance-0.8.0",
        actual: undefined,
        expected: "object",
      });
    }
    return undefined;
  }
  if (!configVersionRequiresWeeklyTeachAction(configVersion)) {
    issues.push({
      path: "/weeklyTeachAction",
      message: "weeklyTeachAction is only allowed on sprint3-balance-0.7.0 and sprint3-balance-0.8.0",
      actual: configVersion,
      expected: `${SPRINT3_CONFIG_VERSION_WEEKLY_TEACH}|${SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION}`,
    });
    return undefined;
  }
  const object = snapshotPlainObjectOrFail(value, "/weeklyTeachAction", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["evaluationPolicyVersion", "evaluationWeights", "tierThresholds", "allocationFormula"],
    "/weeklyTeachAction",
    issues,
  );
  const evaluationPolicyVersion = requireLiteralString(
    object,
    "evaluationPolicyVersion",
    "/weeklyTeachAction",
    WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
    issues,
  );
  const weightsObject = snapshotPlainObjectOrFail(
    object["evaluationWeights"],
    "/weeklyTeachAction/evaluationWeights",
    issues,
  );
  let evaluationWeights: WeeklyTeachEvaluationWeights | undefined;
  if (weightsObject !== undefined) {
    rejectUnknownKeys(
      weightsObject,
      [
        "styleMatchMaxPoints",
        "requirementsMetMaxPoints",
        "trustAndCompatibilityMaxPoints",
        "tacticalNeedMaxPoints",
        "successionPriorityMaxPoints",
        "secrecyAndLoyaltyPenaltyMaxPoints",
      ],
      "/weeklyTeachAction/evaluationWeights",
      issues,
    );
    const styleMatchMaxPoints = requireIntegerInRange(
      weightsObject,
      "styleMatchMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    const requirementsMetMaxPoints = requireIntegerInRange(
      weightsObject,
      "requirementsMetMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    const trustAndCompatibilityMaxPoints = requireIntegerInRange(
      weightsObject,
      "trustAndCompatibilityMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    const tacticalNeedMaxPoints = requireIntegerInRange(
      weightsObject,
      "tacticalNeedMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    const successionPriorityMaxPoints = requireIntegerInRange(
      weightsObject,
      "successionPriorityMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    const secrecyAndLoyaltyPenaltyMaxPoints = requireIntegerInRange(
      weightsObject,
      "secrecyAndLoyaltyPenaltyMaxPoints",
      "/weeklyTeachAction/evaluationWeights",
      0,
      100,
      issues,
    );
    if (
      styleMatchMaxPoints === undefined ||
      requirementsMetMaxPoints === undefined ||
      trustAndCompatibilityMaxPoints === undefined ||
      tacticalNeedMaxPoints === undefined ||
      successionPriorityMaxPoints === undefined ||
      secrecyAndLoyaltyPenaltyMaxPoints === undefined
    ) {
      evaluationWeights = undefined;
    } else {
      evaluationWeights = {
        styleMatchMaxPoints,
        requirementsMetMaxPoints,
        trustAndCompatibilityMaxPoints,
        tacticalNeedMaxPoints,
        successionPriorityMaxPoints,
        secrecyAndLoyaltyPenaltyMaxPoints,
      };
    }
  }
  const tierObject = snapshotPlainObjectOrFail(
    object["tierThresholds"],
    "/weeklyTeachAction/tierThresholds",
    issues,
  );
  const tierThresholds: Partial<Record<(typeof LEARNING_TIER_KEYS)[number], WeeklyTeachTierThresholds>> =
    {};
  if (tierObject !== undefined) {
    rejectUnknownKeys(tierObject, [...LEARNING_TIER_KEYS], "/weeklyTeachAction/tierThresholds", issues);
    for (const tier of LEARNING_TIER_KEYS) {
      const parsed = parseWeeklyTeachTierThresholds(
        tierObject[tier],
        `/weeklyTeachAction/tierThresholds/${tier}`,
        issues,
      );
      if (parsed !== undefined) {
        tierThresholds[tier] = parsed;
      }
    }
  }
  const allocationObject = snapshotPlainObjectOrFail(
    object["allocationFormula"],
    "/weeklyTeachAction/allocationFormula",
    issues,
  );
  let allocationFormula: WeeklyTeachAllocationFormula | undefined;
  if (allocationObject !== undefined) {
    rejectUnknownKeys(
      allocationObject,
      [
        "baseWeeklyTeachSlots",
        "teachingAbilityBonusPerTenPoints",
        "minimumWeeklyTeachSlots",
        "maximumWeeklyTeachSlots",
      ],
      "/weeklyTeachAction/allocationFormula",
      issues,
    );
    const baseWeeklyTeachSlots = requireIntegerInRange(
      allocationObject,
      "baseWeeklyTeachSlots",
      "/weeklyTeachAction/allocationFormula",
      0,
      100,
      issues,
    );
    const teachingAbilityBonusPerTenPoints = requireIntegerInRange(
      allocationObject,
      "teachingAbilityBonusPerTenPoints",
      "/weeklyTeachAction/allocationFormula",
      0,
      100,
      issues,
    );
    const minimumWeeklyTeachSlots = requireIntegerInRange(
      allocationObject,
      "minimumWeeklyTeachSlots",
      "/weeklyTeachAction/allocationFormula",
      0,
      100,
      issues,
    );
    const maximumWeeklyTeachSlots = requireIntegerInRange(
      allocationObject,
      "maximumWeeklyTeachSlots",
      "/weeklyTeachAction/allocationFormula",
      0,
      100,
      issues,
    );
    if (
      baseWeeklyTeachSlots === undefined ||
      teachingAbilityBonusPerTenPoints === undefined ||
      minimumWeeklyTeachSlots === undefined ||
      maximumWeeklyTeachSlots === undefined
    ) {
      allocationFormula = undefined;
    } else if (minimumWeeklyTeachSlots > maximumWeeklyTeachSlots) {
      issues.push({
        path: "/weeklyTeachAction/allocationFormula/minimumWeeklyTeachSlots",
        message: "minimumWeeklyTeachSlots must not exceed maximumWeeklyTeachSlots",
        actual: minimumWeeklyTeachSlots,
        expected: `<= ${String(maximumWeeklyTeachSlots)}`,
      });
    } else {
      allocationFormula = {
        baseWeeklyTeachSlots,
        teachingAbilityBonusPerTenPoints,
        minimumWeeklyTeachSlots,
        maximumWeeklyTeachSlots,
      };
    }
  }
  if (
    evaluationPolicyVersion === undefined ||
    evaluationWeights === undefined ||
    allocationFormula === undefined ||
    LEARNING_TIER_KEYS.some((tier) => tierThresholds[tier] === undefined)
  ) {
    return undefined;
  }
  return {
    evaluationPolicyVersion,
    evaluationWeights,
    tierThresholds: tierThresholds as Sprint3WeeklyTeachActionConfig["tierThresholds"],
    allocationFormula,
  };
}

function parseTeachingSelection(
  value: unknown,
  configVersion: string,
  issues: ValidationIssue[],
): Sprint3TeachingSelectionConfig | undefined {
  if (value === undefined) {
    if (configVersion === SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION) {
      issues.push({
        path: "/teachingSelection",
        message: "teachingSelection is required on sprint3-balance-0.8.0",
        actual: undefined,
        expected: "object",
      });
    }
    return undefined;
  }
  if (configVersion !== SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION) {
    issues.push({
      path: "/teachingSelection",
      message: "teachingSelection is only allowed on sprint3-balance-0.8.0",
      actual: configVersion,
      expected: SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
    });
    return undefined;
  }
  const object = snapshotPlainObjectOrFail(value, "/teachingSelection", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    ["evaluationPolicyVersion", "evaluationWeights", "tierThresholds", "reEvaluationTriggers"],
    "/teachingSelection",
    issues,
  );
  const evaluationPolicyVersion = requireLiteralString(
    object,
    "evaluationPolicyVersion",
    "/teachingSelection",
    TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
    issues,
  );
  const weightsObject = snapshotPlainObjectOrFail(
    object["evaluationWeights"],
    "/teachingSelection/evaluationWeights",
    issues,
  );
  let evaluationWeights: WeeklyTeachEvaluationWeights | undefined;
  if (weightsObject !== undefined) {
    rejectUnknownKeys(
      weightsObject,
      [
        "styleMatchMaxPoints",
        "requirementsMetMaxPoints",
        "trustAndCompatibilityMaxPoints",
        "tacticalNeedMaxPoints",
        "successionPriorityMaxPoints",
        "secrecyAndLoyaltyPenaltyMaxPoints",
      ],
      "/teachingSelection/evaluationWeights",
      issues,
    );
    const styleMatchMaxPoints = requireIntegerInRange(
      weightsObject,
      "styleMatchMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    const requirementsMetMaxPoints = requireIntegerInRange(
      weightsObject,
      "requirementsMetMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    const trustAndCompatibilityMaxPoints = requireIntegerInRange(
      weightsObject,
      "trustAndCompatibilityMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    const tacticalNeedMaxPoints = requireIntegerInRange(
      weightsObject,
      "tacticalNeedMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    const successionPriorityMaxPoints = requireIntegerInRange(
      weightsObject,
      "successionPriorityMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    const secrecyAndLoyaltyPenaltyMaxPoints = requireIntegerInRange(
      weightsObject,
      "secrecyAndLoyaltyPenaltyMaxPoints",
      "/teachingSelection/evaluationWeights",
      0,
      100,
      issues,
    );
    if (
      styleMatchMaxPoints === undefined ||
      requirementsMetMaxPoints === undefined ||
      trustAndCompatibilityMaxPoints === undefined ||
      tacticalNeedMaxPoints === undefined ||
      successionPriorityMaxPoints === undefined ||
      secrecyAndLoyaltyPenaltyMaxPoints === undefined
    ) {
      evaluationWeights = undefined;
    } else {
      evaluationWeights = {
        styleMatchMaxPoints,
        requirementsMetMaxPoints,
        trustAndCompatibilityMaxPoints,
        tacticalNeedMaxPoints,
        successionPriorityMaxPoints,
        secrecyAndLoyaltyPenaltyMaxPoints,
      };
    }
  }
  const tierObject = snapshotPlainObjectOrFail(
    object["tierThresholds"],
    "/teachingSelection/tierThresholds",
    issues,
  );
  const tierThresholds: Partial<Record<(typeof LEARNING_TIER_KEYS)[number], WeeklyTeachTierThresholds>> =
    {};
  if (tierObject !== undefined) {
    rejectUnknownKeys(tierObject, [...LEARNING_TIER_KEYS], "/teachingSelection/tierThresholds", issues);
    for (const tier of LEARNING_TIER_KEYS) {
      const parsed = parseWeeklyTeachTierThresholds(
        tierObject[tier],
        `/teachingSelection/tierThresholds/${tier}`,
        issues,
      );
      if (parsed !== undefined) {
        tierThresholds[tier] = parsed;
      }
    }
  }
  const triggersObject = snapshotPlainObjectOrFail(
    object["reEvaluationTriggers"],
    "/teachingSelection/reEvaluationTriggers",
    issues,
  );
  let reEvaluationTriggers: Sprint3TeachingSelectionConfig["reEvaluationTriggers"] | undefined;
  if (triggersObject !== undefined) {
    rejectUnknownKeys(
      triggersObject,
      [
        "fourWeekCadenceWeeks",
        "triggerOnNewEnrollment",
        "triggerOnCurrentTechniqueAcquisitionComplete",
      ],
      "/teachingSelection/reEvaluationTriggers",
      issues,
    );
    const fourWeekCadenceWeeks = requireIntegerInRange(
      triggersObject,
      "fourWeekCadenceWeeks",
      "/teachingSelection/reEvaluationTriggers",
      1,
      520,
      issues,
    );
    const triggerOnNewEnrollment = requireBoolean(
      triggersObject,
      "triggerOnNewEnrollment",
      "/teachingSelection/reEvaluationTriggers",
      issues,
    );
    const triggerOnCurrentTechniqueAcquisitionComplete = requireBoolean(
      triggersObject,
      "triggerOnCurrentTechniqueAcquisitionComplete",
      "/teachingSelection/reEvaluationTriggers",
      issues,
    );
    if (
      fourWeekCadenceWeeks === undefined ||
      triggerOnNewEnrollment === undefined ||
      triggerOnCurrentTechniqueAcquisitionComplete === undefined
    ) {
      reEvaluationTriggers = undefined;
    } else {
      reEvaluationTriggers = {
        fourWeekCadenceWeeks,
        triggerOnNewEnrollment,
        triggerOnCurrentTechniqueAcquisitionComplete,
      };
    }
  }
  if (
    evaluationPolicyVersion === undefined ||
    evaluationWeights === undefined ||
    reEvaluationTriggers === undefined ||
    LEARNING_TIER_KEYS.some((tier) => tierThresholds[tier] === undefined)
  ) {
    return undefined;
  }
  return {
    evaluationPolicyVersion,
    evaluationWeights,
    tierThresholds: tierThresholds as Sprint3TeachingSelectionConfig["tierThresholds"],
    reEvaluationTriggers,
  };
}

function parseMentorshipFeatures(
  value: unknown,
  issues: ValidationIssue[],
): Sprint3ConfigInput["mentorshipFeatures"] | undefined {
  const object = snapshotPlainObjectOrFail(value, "/mentorshipFeatures", issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(
    object,
    [
      "explicitWeeklyTeachActionEnabled",
      "enrollmentAssignmentAiEnabled",
      "weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
      "weeklyTrainingParentTemporaryGuidanceEnabled",
      "techniqueTeachingSelectionEnabled",
    ],
    "/mentorshipFeatures",
    issues,
  );
  const explicitWeeklyTeachActionEnabled = requireBoolean(
    object,
    "explicitWeeklyTeachActionEnabled",
    "/mentorshipFeatures",
    issues,
  );
  const enrollmentAssignmentAiEnabled = requireBoolean(
    object,
    "enrollmentAssignmentAiEnabled",
    "/mentorshipFeatures",
    issues,
  );
  let weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: boolean | undefined;
  if ("weeklyTrainingDiscipleCountTeachingEfficiencyEnabled" in object) {
    weeklyTrainingDiscipleCountTeachingEfficiencyEnabled = requireBoolean(
      object,
      "weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
      "/mentorshipFeatures",
      issues,
    );
  }
  let weeklyTrainingParentTemporaryGuidanceEnabled: boolean | undefined;
  if ("weeklyTrainingParentTemporaryGuidanceEnabled" in object) {
    weeklyTrainingParentTemporaryGuidanceEnabled = requireBoolean(
      object,
      "weeklyTrainingParentTemporaryGuidanceEnabled",
      "/mentorshipFeatures",
      issues,
    );
  }
  let techniqueTeachingSelectionEnabled: boolean | undefined;
  if ("techniqueTeachingSelectionEnabled" in object) {
    techniqueTeachingSelectionEnabled = requireBoolean(
      object,
      "techniqueTeachingSelectionEnabled",
      "/mentorshipFeatures",
      issues,
    );
  }
  if (explicitWeeklyTeachActionEnabled === undefined ||
    enrollmentAssignmentAiEnabled === undefined
  ) {
    return undefined;
  }
  return {
    explicitWeeklyTeachActionEnabled,
    enrollmentAssignmentAiEnabled,
    ...(weeklyTrainingDiscipleCountTeachingEfficiencyEnabled === undefined
      ? {}
      : { weeklyTrainingDiscipleCountTeachingEfficiencyEnabled }),
    ...(weeklyTrainingParentTemporaryGuidanceEnabled === undefined
      ? {}
      : { weeklyTrainingParentTemporaryGuidanceEnabled }),
    ...(techniqueTeachingSelectionEnabled === undefined
      ? {}
      : { techniqueTeachingSelectionEnabled }),
  };
}

export function validateNormalizedSprint3Config(input: unknown): ValidationResult<Sprint3Config> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }

  rejectUnknownKeys(object, ROOT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    SPRINT3_CONFIG_SCHEMA_VERSION,
    issues,
  );
  const configVersionRaw = object["configVersion"];
  if (typeof configVersionRaw !== "string" || configVersionRaw.length === 0) {
    issues.push({
      path: "/configVersion",
      message: "required non-empty string is missing",
      actual: configVersionRaw,
      expected: "string",
    });
  }
  const configVersion = typeof configVersionRaw === "string" ? configVersionRaw : "";

  const enrollment = parseEnrollment(object["enrollment"], issues);
  const teachingEfficiency = parseTeachingEfficiency(object["teachingEfficiency"], issues);
  const masterQualification = parseMasterQualification(object["masterQualification"], issues);
  const mentorshipFeatures = parseMentorshipFeatures(object["mentorshipFeatures"], issues);
  const masterIntake = parseMasterIntake(object["masterIntake"], configVersion, issues);
  const weeklyTeachAction = parseWeeklyTeachAction(object["weeklyTeachAction"], configVersion, issues);
  const teachingSelection = parseTeachingSelection(object["teachingSelection"], configVersion, issues);

  if (
    schemaVersion === undefined ||
    configVersion.length === 0 ||
    enrollment === undefined ||
    teachingEfficiency === undefined ||
    masterQualification === undefined ||
    mentorshipFeatures === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (configVersion === SPRINT3_CONFIG_VERSION_INTAKE && masterIntake === undefined) {
    return failure(issues);
  }

  const weeklyTeachingEfficiencyEnabled =
    mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled === true;
  const weeklyTeachingEfficiencyConfigVersions = [
    SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
    SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
    SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
    SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  ] as const;
  if (
    weeklyTeachingEfficiencyEnabled &&
    !weeklyTeachingEfficiencyConfigVersions.includes(
      configVersion as (typeof weeklyTeachingEfficiencyConfigVersions)[number],
    )
  ) {
    issues.push({
      path: "/mentorshipFeatures/weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
      message:
        "weekly training teachingEfficiency binding is only enabled on sprint3-balance-0.5.0 through sprint3-balance-0.8.0",
      actual: configVersion,
      expected: weeklyTeachingEfficiencyConfigVersions.join("|"),
    });
  }
  if (
    configVersion === SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY &&
    !weeklyTeachingEfficiencyEnabled
  ) {
    issues.push({
      path: "/mentorshipFeatures/weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
      message: "sprint3-balance-0.5.0 requires weekly training teachingEfficiency binding",
      actual: mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
      expected: "true",
    });
  }
  const parentGuidanceWeeklyEnabled =
    mentorshipFeatures.weeklyTrainingParentTemporaryGuidanceEnabled === true;
  const parentGuidanceConfigVersions = [
    SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
    SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
    SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  ] as const;
  if (
    parentGuidanceWeeklyEnabled &&
    !parentGuidanceConfigVersions.includes(
      configVersion as (typeof parentGuidanceConfigVersions)[number],
    )
  ) {
    issues.push({
      path: "/mentorshipFeatures/weeklyTrainingParentTemporaryGuidanceEnabled",
      message:
        "parent temporary guidance weekly binding is only enabled on sprint3-balance-0.6.0 through sprint3-balance-0.8.0",
      actual: configVersion,
      expected: parentGuidanceConfigVersions.join("|"),
    });
  }
  if (
    configVersion === SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE &&
    !parentGuidanceWeeklyEnabled
  ) {
    issues.push({
      path: "/mentorshipFeatures/weeklyTrainingParentTemporaryGuidanceEnabled",
      message: "sprint3-balance-0.6.0 requires parent temporary guidance weekly binding",
      actual: mentorshipFeatures.weeklyTrainingParentTemporaryGuidanceEnabled,
      expected: "true",
    });
  }
  if (configVersion === SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE) {
    if (!weeklyTeachingEfficiencyEnabled) {
      issues.push({
        path: "/mentorshipFeatures/weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
        message: "sprint3-balance-0.6.0 retains weekly disciple-count teachingEfficiency binding",
        actual: mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
        expected: "true",
      });
    }
    if (!parentGuidanceWeeklyEnabled) {
      issues.push({
        path: "/mentorshipFeatures/weeklyTrainingParentTemporaryGuidanceEnabled",
        message: "sprint3-balance-0.6.0 requires parent temporary guidance weekly binding",
        actual: mentorshipFeatures.weeklyTrainingParentTemporaryGuidanceEnabled,
        expected: "true",
      });
    }
    if (!mentorshipFeatures.enrollmentAssignmentAiEnabled) {
      issues.push({
        path: "/mentorshipFeatures/enrollmentAssignmentAiEnabled",
        message: "sprint3-balance-0.6.0 retains enrollment assignment AI gate",
        actual: mentorshipFeatures.enrollmentAssignmentAiEnabled,
        expected: "true",
      });
    }
    if (mentorshipFeatures.explicitWeeklyTeachActionEnabled) {
      issues.push({
        path: "/mentorshipFeatures/explicitWeeklyTeachActionEnabled",
        message: "explicit weekly teach action is only enabled on sprint3-balance-0.7.0",
        actual: mentorshipFeatures.explicitWeeklyTeachActionEnabled,
        expected: "false",
      });
    }
  }
  const weeklyTeachRetentionVersions = [
    SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
    SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  ] as const;
  if (
    weeklyTeachRetentionVersions.includes(
      configVersion as (typeof weeklyTeachRetentionVersions)[number],
    )
  ) {
    if (!weeklyTeachingEfficiencyEnabled) {
      issues.push({
        path: "/mentorshipFeatures/weeklyTrainingDiscipleCountTeachingEfficiencyEnabled",
        message: `${configVersion} retains weekly disciple-count teachingEfficiency binding`,
        actual: mentorshipFeatures.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
        expected: "true",
      });
    }
    if (!parentGuidanceWeeklyEnabled) {
      issues.push({
        path: "/mentorshipFeatures/weeklyTrainingParentTemporaryGuidanceEnabled",
        message: `${configVersion} retains parent temporary guidance weekly binding`,
        actual: mentorshipFeatures.weeklyTrainingParentTemporaryGuidanceEnabled,
        expected: "true",
      });
    }
    if (!mentorshipFeatures.enrollmentAssignmentAiEnabled) {
      issues.push({
        path: "/mentorshipFeatures/enrollmentAssignmentAiEnabled",
        message: `${configVersion} retains enrollment assignment AI gate`,
        actual: mentorshipFeatures.enrollmentAssignmentAiEnabled,
        expected: "true",
      });
    }
    if (!mentorshipFeatures.explicitWeeklyTeachActionEnabled) {
      issues.push({
        path: "/mentorshipFeatures/explicitWeeklyTeachActionEnabled",
        message: `${configVersion} requires explicit weekly teach action gate`,
        actual: mentorshipFeatures.explicitWeeklyTeachActionEnabled,
        expected: "true",
      });
    }
    if (weeklyTeachAction === undefined) {
      issues.push({
        path: "/weeklyTeachAction",
        message: `${configVersion} requires weeklyTeachAction policy body`,
        actual: undefined,
        expected: "object",
      });
    }
  }
  if (configVersion === SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION) {
    if (mentorshipFeatures.techniqueTeachingSelectionEnabled !== true) {
      issues.push({
        path: "/mentorshipFeatures/techniqueTeachingSelectionEnabled",
        message: "sprint3-balance-0.8.0 requires technique teaching selection gate",
        actual: mentorshipFeatures.techniqueTeachingSelectionEnabled,
        expected: "true",
      });
    }
    if (teachingSelection === undefined) {
      issues.push({
        path: "/teachingSelection",
        message: "sprint3-balance-0.8.0 requires teachingSelection policy body",
        actual: undefined,
        expected: "object",
      });
    }
  }
  if (
    mentorshipFeatures.techniqueTeachingSelectionEnabled === true &&
    configVersion !== SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION
  ) {
    issues.push({
      path: "/mentorshipFeatures/techniqueTeachingSelectionEnabled",
      message: "technique teaching selection remains disabled until sprint3-balance-0.8.0",
      actual: configVersion,
      expected: SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
    });
  }
  if (
    mentorshipFeatures.explicitWeeklyTeachActionEnabled &&
    !configVersionRequiresWeeklyTeachAction(configVersion)
  ) {
    issues.push({
      path: "/mentorshipFeatures/explicitWeeklyTeachActionEnabled",
      message: "explicit weekly teach action remains disabled until sprint3-balance-0.7.0",
      actual: configVersion,
      expected: `${SPRINT3_CONFIG_VERSION_WEEKLY_TEACH}|${SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION}`,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const normalized: Sprint3Config = {
    schemaVersion,
    configVersion,
    enrollment,
    teachingEfficiency,
    masterQualification,
    mentorshipFeatures,
    ...(masterIntake !== undefined ? { masterIntake } : {}),
    ...(weeklyTeachAction !== undefined ? { weeklyTeachAction } : {}),
    ...(teachingSelection !== undefined ? { teachingSelection } : {}),
  };

  if (isKnownSprint3ConfigVersion(configVersion)) {
    const expected = getExpectedCanonicalJsonForSprint3ConfigVersion(configVersion);
    const actual = toCanonicalJson(normalized);
    if (expected !== undefined && expected !== actual) {
      return failure([
        {
          path: "/configVersion",
          message: "canonical Sprint3Config body does not match registered configVersion integrity",
          actual: configVersion,
          expected: "registered canonical body",
        },
      ]);
    }
  }

  return success(deepFreezePlainJson(normalized));
}

export function computeSprint3ConfigHash(
  config: Sprint3Config,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(config), "/sprint3ConfigHash");
}

let defaultRegistryInitialized = false;

function ensureDefaultSprint3ConfigRegistry(provider: Sha256Provider): void {
  if (defaultRegistryInitialized) {
    return;
  }
  const validated = validateNormalizedSprint3Config(createDefaultSprint3ConfigInput());
  if (!validated.ok) {
    throw new Error("default Sprint3Config failed validation during registry bootstrap");
  }
  const canonical = toCanonicalJson(validated.value);
  registerKnownSprint3ConfigVersion(SPRINT3_CONFIG_VERSION_DEFAULT, canonical);
  const qualificationValidated = validateNormalizedSprint3Config(
    createSprint3Balance020ConfigInput(),
  );
  if (!qualificationValidated.ok) {
    throw new Error("Sprint3 balance 0.2.0 config failed validation during registry bootstrap");
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_QUALIFICATION,
    toCanonicalJson(qualificationValidated.value),
  );
  const enrollmentValidated = validateNormalizedSprint3Config(createSprint3Balance030ConfigInput());
  if (!enrollmentValidated.ok) {
    throw new Error("Sprint3 balance 0.3.0 config failed validation during registry bootstrap");
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_ENROLLMENT,
    toCanonicalJson(enrollmentValidated.value),
  );
  const intakeValidated = validateNormalizedSprint3Config(createSprint3Balance040ConfigInput());
  if (!intakeValidated.ok) {
    throw new Error("Sprint3 balance 0.4.0 config failed validation during registry bootstrap");
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_INTAKE,
    toCanonicalJson(intakeValidated.value),
  );
  const teachingEfficiencyValidated = validateNormalizedSprint3Config(
    createSprint3Balance050ConfigInput(),
  );
  if (!teachingEfficiencyValidated.ok) {
    throw new Error(
      "Sprint3 balance 0.5.0 config failed validation during registry bootstrap",
    );
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
    toCanonicalJson(teachingEfficiencyValidated.value),
  );
  const parentGuidanceValidated = validateNormalizedSprint3Config(
    createSprint3Balance060ConfigInput(),
  );
  if (!parentGuidanceValidated.ok) {
    throw new Error(
      "Sprint3 balance 0.6.0 config failed validation during registry bootstrap",
    );
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
    toCanonicalJson(parentGuidanceValidated.value),
  );
  const weeklyTeachValidated = validateNormalizedSprint3Config(createSprint3Balance070ConfigInput());
  if (!weeklyTeachValidated.ok) {
    throw new Error("Sprint3 balance 0.7.0 config failed validation during registry bootstrap");
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
    toCanonicalJson(weeklyTeachValidated.value),
  );
  const teachingSelectionValidated = validateNormalizedSprint3Config(
    createSprint3Balance080ConfigInput(),
  );
  if (!teachingSelectionValidated.ok) {
    throw new Error(
      "Sprint3 balance 0.8.0 config failed validation during registry bootstrap",
    );
  }
  registerKnownSprint3ConfigVersion(
    SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
    toCanonicalJson(teachingSelectionValidated.value),
  );
  defaultRegistryInitialized = true;
  void provider;
}

export function validateSprint3Config(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint3Config> {
  ensureDefaultSprint3ConfigRegistry(provider);
  return validateNormalizedSprint3Config(input);
}

export function createDefaultSprint3Config(
  provider: Sha256Provider,
): ValidationResult<Sprint3Config> {
  return validateSprint3Config(createDefaultSprint3ConfigInput(), provider);
}

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
  SPRINT3_CONFIG_VERSION_QUALIFICATION,
} from "./constants.js";
import {
  createDefaultSprint3ConfigInput,
  createSprint3Balance020ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  getExpectedCanonicalJsonForSprint3ConfigVersion,
  isKnownSprint3ConfigVersion,
  registerKnownSprint3ConfigVersion,
} from "./sprint3-config-version-registry.js";
import type {
  DiscipleCountFactorBracket,
  MasterQualificationEligibilityThresholds,
  Sprint3Config,
  Sprint3ConfigInput,
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
] as const;

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
    ["explicitWeeklyTeachActionEnabled", "enrollmentAssignmentAiEnabled"],
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
  if (
    explicitWeeklyTeachActionEnabled === undefined ||
    enrollmentAssignmentAiEnabled === undefined
  ) {
    return undefined;
  }
  if (explicitWeeklyTeachActionEnabled) {
    issues.push({
      path: "/mentorshipFeatures/explicitWeeklyTeachActionEnabled",
      message:
        "explicit weekly teach action remains disabled until a later Sprint3 slice enables it",
      actual: explicitWeeklyTeachActionEnabled,
      expected: "false",
    });
    return undefined;
  }
  if (enrollmentAssignmentAiEnabled) {
    issues.push({
      path: "/mentorshipFeatures/enrollmentAssignmentAiEnabled",
      message:
        "enrollment assignment AI remains disabled until S03-003+ implements processor contracts",
      actual: enrollmentAssignmentAiEnabled,
      expected: "false",
    });
    return undefined;
  }
  return {
    explicitWeeklyTeachActionEnabled,
    enrollmentAssignmentAiEnabled,
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

  const normalized: Sprint3Config = {
    schemaVersion,
    configVersion,
    enrollment,
    teachingEfficiency,
    masterQualification,
    mentorshipFeatures,
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

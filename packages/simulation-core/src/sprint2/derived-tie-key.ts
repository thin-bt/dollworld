/**
 * DerivedTieKey stateless SHA-256 contract (G069 / S2-SPEC-0.2.2-draft §3.4).
 * No RNG, ID generator, or event counter consumption.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  DERIVED_TIE_KEY_POLICY_VERSION,
  DERIVED_TIE_KEY_PURPOSES,
  type DerivedTieKeyPurpose,
} from "./constants.js";
import {
  hasOwn,
  rejectUnknownKeys,
  requireInteger,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  requireString,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type { DerivedTieKeyInput } from "./types.js";

const INPUT_KEYS = [
  "simulationId",
  "runSeed",
  "tiePolicyVersion",
  "purpose",
  "scopeId",
  "candidateStableId",
] as const;

function isPurpose(value: string): value is DerivedTieKeyPurpose {
  return (DERIVED_TIE_KEY_PURPOSES as readonly string[]).includes(value);
}

function validateEntryChoiceScope(
  scopeId: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const object = snapshotPlainObjectOrFail(scopeId, path, issues);
  if (object === undefined) {
    return false;
  }
  rejectUnknownKeys(
    object,
    ["absoluteWorldMonth", "personId", "allocationRound"],
    path,
    issues,
  );
  return (
    requireInteger(object, "absoluteWorldMonth", path, issues) !== undefined &&
    requireNonEmptyTrimmedString(object, "personId", path, issues) !== undefined &&
    requireInteger(object, "allocationRound", path, issues) !== undefined &&
    issues.length === 0
  );
}

function validateEntryCapacityScope(
  scopeId: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const object = snapshotPlainObjectOrFail(scopeId, path, issues);
  if (object === undefined) {
    return false;
  }
  rejectUnknownKeys(
    object,
    ["absoluteWorldMonth", "tournamentId", "allocationRound"],
    path,
    issues,
  );
  return (
    requireInteger(object, "absoluteWorldMonth", path, issues) !== undefined &&
    requireNonEmptyTrimmedString(object, "tournamentId", path, issues) !== undefined &&
    requireInteger(object, "allocationRound", path, issues) !== undefined
  );
}

function validateStandingsScope(
  scopeId: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const object = snapshotPlainObjectOrFail(scopeId, path, issues);
  if (object === undefined) {
    return false;
  }
  const allowed = ["tournamentId", "stage", "groupId", "tiedSetHash", "restartOrdinal"];
  rejectUnknownKeys(object, allowed, path, issues);
  if (requireNonEmptyTrimmedString(object, "tournamentId", path, issues) === undefined) {
    return false;
  }
  if (requireNonEmptyTrimmedString(object, "stage", path, issues) === undefined) {
    return false;
  }
  if (hasOwn(object, "groupId") && typeof object["groupId"] !== "string") {
    issues.push({
      path: `${path}/groupId`,
      message: "groupId must be a string when present",
      actual: object["groupId"],
      expected: "string",
    });
    return false;
  }
  if (requireNonEmptyTrimmedString(object, "tiedSetHash", path, issues) === undefined) {
    return false;
  }
  return requireInteger(object, "restartOrdinal", path, issues) !== undefined;
}

function validatePromotionSelectionScope(
  scopeId: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const object = snapshotPlainObjectOrFail(scopeId, path, issues);
  if (object === undefined) {
    return false;
  }
  rejectUnknownKeys(object, ["tournamentId", "boundaryBandHash"], path, issues);
  return (
    requireNonEmptyTrimmedString(object, "tournamentId", path, issues) !== undefined &&
    requireNonEmptyTrimmedString(object, "boundaryBandHash", path, issues) !== undefined
  );
}

function validateKnockoutPlacementScope(
  scopeId: unknown,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const object = snapshotPlainObjectOrFail(scopeId, path, issues);
  if (object === undefined) {
    return false;
  }
  rejectUnknownKeys(object, ["tournamentId", "knockoutRound", "targetSlotId"], path, issues);
  return (
    requireNonEmptyTrimmedString(object, "tournamentId", path, issues) !== undefined &&
    requireInteger(object, "knockoutRound", path, issues) !== undefined &&
    requireNonEmptyTrimmedString(object, "targetSlotId", path, issues) !== undefined
  );
}

function validatePurposeScopeRecipe(
  purpose: DerivedTieKeyPurpose,
  scopeId: unknown,
  candidateStableId: unknown,
  issues: ValidationIssue[],
): boolean {
  switch (purpose) {
    case "entry_choice":
      return (
        validateEntryChoiceScope(scopeId, "/scopeId", issues) &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    case "entry_capacity":
      return (
        validateEntryCapacityScope(scopeId, "/scopeId", issues) &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    case "seeding":
      return (
        typeof scopeId === "string" &&
        scopeId.length > 0 &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    case "standings":
      return (
        validateStandingsScope(scopeId, "/scopeId", issues) &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    case "promotion_selection":
      return (
        validatePromotionSelectionScope(scopeId, "/scopeId", issues) &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    case "knockout_placement":
      return (
        validateKnockoutPlacementScope(scopeId, "/scopeId", issues) &&
        typeof candidateStableId === "string" &&
        candidateStableId.length > 0
      );
    default:
      issues.push({
        path: "/purpose",
        message: "unsupported derived tie-key purpose",
        actual: purpose,
        expected: DERIVED_TIE_KEY_PURPOSES.join(" | "),
      });
      return false;
  }
}

export function validateDerivedTieKeyInput(input: unknown): ValidationResult<DerivedTieKeyInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  rejectUnknownKeys(object, INPUT_KEYS, "", issues);

  const simulationId = requireNonEmptyTrimmedString(object, "simulationId", "", issues);
  const runSeed = requireInteger(object, "runSeed", "", issues);
  const tiePolicyVersion = requireLiteralString(
    object,
    "tiePolicyVersion",
    "",
    DERIVED_TIE_KEY_POLICY_VERSION,
    issues,
  );
  const purposeRaw = requireString(object, "purpose", "", issues);
  if (purposeRaw === undefined || !isPurpose(purposeRaw)) {
    issues.push({
      path: "/purpose",
      message: "purpose must be a fixed DerivedTieKey purpose enum value",
      actual: purposeRaw,
      expected: DERIVED_TIE_KEY_PURPOSES.join(" | "),
    });
    return failure(issues);
  }
  const purpose = purposeRaw;
  const scopeId = object["scopeId"];
  const candidateStableId = object["candidateStableId"];

  if (
    simulationId === undefined ||
    runSeed === undefined ||
    tiePolicyVersion === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (!validatePurposeScopeRecipe(purpose, scopeId, candidateStableId, issues)) {
    return failure(issues);
  }

  return success({
    simulationId,
    runSeed,
    tiePolicyVersion,
    purpose,
    scopeId,
    candidateStableId,
  });
}

export function computeDerivedTieKey(
  input: DerivedTieKeyInput,
  provider: Sha256Provider,
): ValidationResult<string> {
  const hashInput = {
    simulationId: input.simulationId,
    runSeed: input.runSeed,
    tiePolicyVersion: input.tiePolicyVersion,
    purpose: input.purpose,
    scopeId: input.scopeId,
    candidateStableId: input.candidateStableId,
  };
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/derivedTieKey");
}

export function computeDerivedTieKeysForCandidates(
  baseInput: Omit<DerivedTieKeyInput, "candidateStableId" | "scopeId"> & {
    scopeId: unknown;
    candidates: readonly unknown[];
  },
  provider: Sha256Provider,
): ValidationResult<readonly string[]> {
  const keys: string[] = [];
  const sortedCandidates = [...baseInput.candidates];
  for (const candidateStableId of sortedCandidates) {
    const validated = validateDerivedTieKeyInput({
      simulationId: baseInput.simulationId,
      runSeed: baseInput.runSeed,
      tiePolicyVersion: baseInput.tiePolicyVersion,
      purpose: baseInput.purpose,
      scopeId: baseInput.scopeId,
      candidateStableId,
    });
    if (!validated.ok) {
      return failure(validated.issues);
    }
    const key = computeDerivedTieKey(validated.value, provider);
    if (!key.ok) {
      return key;
    }
    keys.push(key.value);
  }
  keys.sort();
  return success(Object.freeze(keys));
}

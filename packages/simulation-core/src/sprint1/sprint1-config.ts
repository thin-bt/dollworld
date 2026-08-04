/**
 * Sprint1Config lifecycle helpers: validated default, clone, freeze, and hash
 * (14 mini-spec §1.1 configHash contract / basis-points normalization).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { createDefaultSprint1ConfigInput } from "./sprint1-config-defaults.js";
import type { Sprint1Config } from "./types.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import {
  validateNormalizedSprint1Config,
  validateSprint1Config,
} from "./validate-sprint1-config.js";

/**
 * Validated, frozen, basis-points-normalized Sprint1Config from the 14 defaults.
 * Throws if the compiled-in defaults ever fail validation (a programmer error).
 */
export function getDefaultSprint1Config(): Sprint1Config {
  const result = validateSprint1Config(createDefaultSprint1ConfigInput());
  if (!result.ok) {
    throw new Error(
      `default Sprint1Config failed validation: ${result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }
  return result.value;
}

/**
 * Clone an already-normalized Sprint1Config via `validateNormalizedSprint1Config`
 * (structural + canonical registry lock). Does not accept raw decimal input.
 */
export function cloneValidatedSprint1Config(input: unknown): ValidationResult<Sprint1Config> {
  const validated = validateNormalizedSprint1Config(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

/**
 * Deep-freeze an already-normalized Sprint1Config via
 * `validateNormalizedSprint1Config` (structural + canonical registry lock).
 */
export function freezeValidatedSprint1Config(input: unknown): ValidationResult<Sprint1Config> {
  return validateNormalizedSprint1Config(input);
}

/**
 * Raw-input convenience: validate (including basis-points normalization) then
 * return an independent frozen clone.
 */
export function cloneSprint1ConfigInput(input: unknown): ValidationResult<Sprint1Config> {
  const validated = validateSprint1Config(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

/**
 * Raw-input convenience: validate then return the frozen normalized value.
 */
export function freezeSprint1ConfigInput(input: unknown): ValidationResult<Sprint1Config> {
  return validateSprint1Config(input);
}

/**
 * `configHash` per 14 §1.1: validate raw input → basis-points normalize → SHA-256
 * of normalized canonical JSON. Invalid input never calls `provider`.
 */
export function computeSprint1ConfigHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateSprint1Config(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(provider.hashUtf8(toCanonicalJson(validated.value)));
}

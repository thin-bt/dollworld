/**
 * Sprint1CliInput — single Sprint 1 CLI aggregate file for `--sprint1-input`
 * (S1-SPEC-0.1.20). Path/mtime are not identity materials; only validated contents.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { SPRINT1_CLI_INPUT_SCHEMA_VERSION } from "./constants.js";
import {
  validateInitialWeeklyTrainingSidecarSnapshot,
  type InitialWeeklyTrainingSidecarSnapshot,
} from "./initial-weekly-training-sidecar.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validateTechniqueCatalog, type TechniqueCatalog } from "./technique-catalog.js";
import type { Sprint1Config } from "./types.js";
import { validateSprint1Config } from "./validate-sprint1-config.js";

export const SPRINT1_CLI_INPUT_KEYS = [
  "schemaVersion",
  "sprint1Config",
  "techniqueCatalog",
  "initialWeeklyTrainingSidecar",
] as const;

export type Sprint1CliInput = {
  schemaVersion: typeof SPRINT1_CLI_INPUT_SCHEMA_VERSION;
  sprint1Config: Sprint1Config;
  techniqueCatalog: TechniqueCatalog;
  initialWeeklyTrainingSidecar: InitialWeeklyTrainingSidecarSnapshot;
};

/**
 * Validate Sprint1CliInput with existing Sprint1Config / TechniqueCatalog /
 * InitialWeeklyTrainingSidecarSnapshot validators. Unknown keys rejected.
 * Invalid nested materials never call `provider` for catalog hash when structure fails first.
 */
export function validateSprint1CliInput(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint1CliInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "Sprint1CliInput must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SPRINT1_CLI_INPUT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    SPRINT1_CLI_INPUT_SCHEMA_VERSION,
    issues,
  );
  if (schemaVersion === undefined || issues.length > 0) {
    return failure(issues);
  }

  const configResult = validateSprint1Config(object["sprint1Config"]);
  if (!configResult.ok) {
    issues.push(
      ...configResult.issues.map((issue) => ({
        ...issue,
        path: `/sprint1Config${issue.path}`,
      })),
    );
  }

  const catalogResult = validateTechniqueCatalog(object["techniqueCatalog"], provider);
  if (!catalogResult.ok) {
    issues.push(
      ...catalogResult.issues.map((issue) => ({
        ...issue,
        path: `/techniqueCatalog${issue.path}`,
      })),
    );
  }

  const sidecarResult = validateInitialWeeklyTrainingSidecarSnapshot(
    object["initialWeeklyTrainingSidecar"],
  );
  if (!sidecarResult.ok) {
    issues.push(
      ...sidecarResult.issues.map((issue) => ({
        ...issue,
        path: `/initialWeeklyTrainingSidecar${issue.path}`,
      })),
    );
  }

  if (!configResult.ok || !catalogResult.ok || !sidecarResult.ok || issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
      sprint1Config: configResult.value,
      techniqueCatalog: catalogResult.value,
      initialWeeklyTrainingSidecar: sidecarResult.value,
    }),
  );
}

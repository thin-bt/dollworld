/**
 * TechniqueCatalog validation, catalogHash computation/verification, and
 * cross-definition reference/cycle checks (09 mini-spec §4.1, §13 / S01-003).
 * Single-definition structural + semantic validation lives in
 * ./technique-definition.ts; this module only adds catalog-level concerns:
 * dedup + sort by TechniqueId, catalogHash, and prerequisite/source reference
 * existence + cycle detection across the whole catalog.
 */
import { compareUnicodeCodePoints, toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  childPath,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireNonEmptyString,
  SHA256_HEX_PATTERN,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validateTechniqueDefinition } from "./technique-definition.js";
import type { TechniqueDefinition } from "./technique-definition.js";

export type TechniqueCatalogIdentity = {
  dataVersion: string;
  catalogHash: string;
};

export type TechniqueCatalog = {
  identity: TechniqueCatalogIdentity;
  definitions: readonly TechniqueDefinition[];
};

const CATALOG_KEYS = ["identity", "definitions"] as const;
const CATALOG_IDENTITY_KEYS = ["dataVersion", "catalogHash"] as const;

type ReferenceGraphField = "prerequisiteTechniqueIds" | "sourceTechniqueIds";

function requireCatalogHashHex(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "64 lowercase hex chars" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    issues.push({
      path,
      message: "value must be a 64 lowercase hex character SHA-256 digest",
      actual: value,
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  return value;
}

function parseCatalogIdentityShape(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueCatalogIdentity | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, CATALOG_IDENTITY_KEYS, path, issues);

  const dataVersion = requireNonEmptyString(object, "dataVersion", path, issues);
  const catalogHash = requireCatalogHashHex(object, "catalogHash", path, issues);

  if (dataVersion === undefined || catalogHash === undefined) {
    return undefined;
  }
  return { dataVersion, catalogHash };
}

/**
 * Validate every raw TechniqueDefinition input, sort by TechniqueId, and reject
 * duplicate techniqueIds. Returns `undefined` (with issues pushed) on any
 * per-definition or duplicate failure. Never partially returns a catalog.
 */
function parseSortedDefinitions(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueDefinition[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }

  const collected: TechniqueDefinition[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const result = validateTechniqueDefinition(items[index]);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.push({
          ...issue,
          path: `${path}/${String(index)}${issue.path}`,
        });
      }
      ok = false;
      continue;
    }
    collected.push(result.value);
  }
  if (!ok) {
    return undefined;
  }

  collected.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));

  for (let index = 1; index < collected.length; index += 1) {
    if (collected[index]!.techniqueId === collected[index - 1]!.techniqueId) {
      issues.push({
        path,
        message: "duplicate techniqueId is not allowed in a TechniqueCatalog",
        actual: collected[index]!.techniqueId,
        expected: "unique techniqueId values",
      });
      return undefined;
    }
  }

  return collected;
}

function hashSortedDefinitions(
  definitions: readonly TechniqueDefinition[],
  provider: Sha256Provider,
): string {
  return provider.hashUtf8(toCanonicalJson(definitions));
}

/**
 * `catalogHash` per 09 §4.1: validate + sort every raw TechniqueDefinition input,
 * reject duplicate techniqueIds, then SHA-256 of the canonical JSON of the
 * TechniqueId-ascending array only. Invalid input never calls `provider`.
 */
export function computeTechniqueCatalogHash(
  definitionsInput: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const issues: ValidationIssue[] = [];
  const sorted = parseSortedDefinitions(definitionsInput, "", issues);
  if (sorted === undefined) {
    return failure(issues);
  }
  return success(hashSortedDefinitions(sorted, provider));
}

/**
 * Reports every referenced TechniqueId in `field` that does not exist in the
 * catalog, then DFS-detects cycles in that field's reference graph (separate
 * graphs for prerequisiteTechniqueIds and sourceTechniqueIds). Missing-reference
 * edges are skipped during cycle traversal (already reported above).
 */
function checkReferenceGraph(
  definitions: readonly TechniqueDefinition[],
  field: ReferenceGraphField,
  issues: ValidationIssue[],
): void {
  const byId = new Map<string, TechniqueDefinition>();
  for (const definition of definitions) {
    byId.set(definition.techniqueId, definition);
  }

  for (const definition of definitions) {
    for (const referencedId of definition[field]) {
      if (!byId.has(referencedId)) {
        issues.push({
          path: `/definitions/${field}`,
          message: `${field} references a techniqueId that does not exist in the catalog`,
          actual: { techniqueId: definition.techniqueId, referencedId },
          expected: "techniqueId present in TechniqueCatalog.definitions",
        });
      }
    }
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const definition of definitions) {
    color.set(definition.techniqueId, WHITE);
  }
  const stack: string[] = [];
  const reportedCycles = new Set<string>();

  const visit = (techniqueId: string): void => {
    color.set(techniqueId, GRAY);
    stack.push(techniqueId);
    const definition = byId.get(techniqueId);
    if (definition !== undefined) {
      for (const referencedId of definition[field]) {
        const state = color.get(referencedId);
        if (state === undefined) {
          continue;
        }
        if (state === WHITE) {
          visit(referencedId);
        } else if (state === GRAY) {
          const cycleStartIndex = stack.indexOf(referencedId);
          const cycleParticipants = stack.slice(cycleStartIndex);
          const cycleKey = [...new Set(cycleParticipants)].sort(compareUnicodeCodePoints).join(",");
          if (!reportedCycles.has(cycleKey)) {
            reportedCycles.add(cycleKey);
            issues.push({
              path: `/definitions/${field}`,
              message: `cycle detected in ${field} reference graph`,
              actual: { techniqueId, field, cycleParticipants },
              expected: "acyclic reference graph",
            });
          }
        }
      }
    }
    stack.pop();
    color.set(techniqueId, BLACK);
  };

  for (const definition of definitions) {
    if (color.get(definition.techniqueId) === WHITE) {
      visit(definition.techniqueId);
    }
  }
}

/**
 * Full TechniqueCatalog validation (09 §4.1, §13): structural shape, per-definition
 * validation, dataVersion consistency, catalogHash verification, and cross-definition
 * reference existence + cycle checks for both prerequisiteTechniqueIds and
 * sourceTechniqueIds (separate graphs). `prerequisiteTechniqueMastery.techniqueId`
 * existence follows transitively: it is already a subset of `prerequisiteTechniqueIds`
 * (enforced per-definition), whose existence is checked here. An empty
 * `definitions` array is a valid catalog. Any failure returns only issues — never
 * a partial catalog. Invalid structural input never calls `provider`.
 */
export function validateTechniqueCatalog(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<TechniqueCatalog> {
  const issues: ValidationIssue[] = [];

  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TechniqueCatalog must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, CATALOG_KEYS, "", issues);

  const identity = parseCatalogIdentityShape(object["identity"], "/identity", issues);
  const definitions = parseSortedDefinitions(object["definitions"], "/definitions", issues);

  if (identity === undefined || definitions === undefined) {
    return failure(issues);
  }

  for (const definition of definitions) {
    if (definition.dataVersion !== identity.dataVersion) {
      issues.push({
        path: "/definitions",
        message:
          "every TechniqueDefinition.dataVersion must equal TechniqueCatalogIdentity.dataVersion",
        actual: { techniqueId: definition.techniqueId, dataVersion: definition.dataVersion },
        expected: identity.dataVersion,
      });
    }
  }

  checkReferenceGraph(definitions, "prerequisiteTechniqueIds", issues);
  checkReferenceGraph(definitions, "sourceTechniqueIds", issues);

  if (issues.length > 0) {
    return failure(issues);
  }

  const computedHash = hashSortedDefinitions(definitions, provider);
  if (computedHash !== identity.catalogHash) {
    return failure([
      {
        path: "/identity/catalogHash",
        message: "catalogHash does not match the SHA-256 of the canonical sorted definitions",
        actual: identity.catalogHash,
        expected: computedHash,
      },
    ]);
  }

  const value: TechniqueCatalog = { identity, definitions };
  return success(deepFreezePlainJson(value));
}

/**
 * Validate `expectedIdentity` first (no SHA), then fully validate `catalog`
 * (which computes hash), then require `catalog.identity` to deeply equal
 * `expectedIdentity` (both `dataVersion` and `catalogHash`). Two catalogs sharing
 * the same `dataVersion` but different content fail here because their computed
 * `catalogHash` values differ from the fixed expected identity.
 *
 * Invalid `expectedIdentity` never invokes the Sha256Provider.
 */
export function validateTechniqueCatalogAgainstIdentity(
  catalog: unknown,
  expectedIdentity: unknown,
  provider: Sha256Provider,
): ValidationResult<TechniqueCatalog> {
  const identityIssues: ValidationIssue[] = [];
  const parsedExpectedIdentity = parseCatalogIdentityShape(expectedIdentity, "", identityIssues);
  if (parsedExpectedIdentity === undefined || identityIssues.length > 0) {
    return failure(
      identityIssues.length > 0
        ? identityIssues
        : [
            {
              path: "",
              message: "expectedIdentity must be a valid TechniqueCatalogIdentity",
              actual: expectedIdentity,
              expected: "TechniqueCatalogIdentity",
            },
          ],
    );
  }

  const catalogResult = validateTechniqueCatalog(catalog, provider);
  if (!catalogResult.ok) {
    return failure(catalogResult.issues);
  }

  if (
    catalogResult.value.identity.dataVersion !== parsedExpectedIdentity.dataVersion ||
    catalogResult.value.identity.catalogHash !== parsedExpectedIdentity.catalogHash
  ) {
    return failure([
      {
        path: "/identity",
        message:
          "TechniqueCatalog.identity must deeply equal the expected TechniqueCatalogIdentity",
        actual: catalogResult.value.identity,
        expected: JSON.stringify(parsedExpectedIdentity),
      },
    ]);
  }

  return catalogResult;
}

/**
 * Public clone: validate unknown input, then independently clone and deep-freeze.
 * Never normalizes invalid inputs to success.
 */
export function cloneTechniqueCatalog(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<TechniqueCatalog> {
  const validated = validateTechniqueCatalog(input, provider);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

/**
 * Public freeze: validate unknown input and return the deep-frozen rebuilt value.
 */
export function freezeTechniqueCatalog(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<TechniqueCatalog> {
  return validateTechniqueCatalog(input, provider);
}

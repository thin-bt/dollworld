/**
 * S03-010 runtime generated-technique catalog overlay (immutable base catalog unchanged).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { TechniqueCatalog, TechniqueCatalogIdentity } from "../sprint1/technique-catalog.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { GENERATED_TECHNIQUE_CATALOG_OVERLAY_SCHEMA_VERSION } from "./constants.js";

export type GeneratedTechniqueCatalogOverlay = {
  schemaVersion: typeof GENERATED_TECHNIQUE_CATALOG_OVERLAY_SCHEMA_VERSION;
  /** TechniqueId ascending registration order. */
  definitions: readonly TechniqueDefinition[];
};

export function createEmptyGeneratedTechniqueCatalogOverlay(): GeneratedTechniqueCatalogOverlay {
  return {
    schemaVersion: GENERATED_TECHNIQUE_CATALOG_OVERLAY_SCHEMA_VERSION,
    definitions: [],
  };
}

export function lookupTechniqueDefinitionWithOverlay(
  baseCatalog: TechniqueCatalog,
  overlay: GeneratedTechniqueCatalogOverlay,
  techniqueId: string,
): TechniqueDefinition | undefined {
  const fromBase = baseCatalog.definitions.find((def) => def.techniqueId === techniqueId);
  if (fromBase !== undefined) {
    return fromBase;
  }
  return overlay.definitions.find((def) => def.techniqueId === techniqueId);
}

export function registerGeneratedTechniqueInOverlay(input: {
  baseCatalog: TechniqueCatalog;
  overlay: GeneratedTechniqueCatalogOverlay;
  definition: TechniqueDefinition;
}): ValidationResult<GeneratedTechniqueCatalogOverlay> {
  const issues: ValidationIssue[] = [];
  const techniqueId = input.definition.techniqueId;

  if (input.baseCatalog.definitions.some((definition) => definition.techniqueId === techniqueId)) {
    issues.push({
      path: "/definition/techniqueId",
      message: "generated techniqueId collides with immutable base catalog entry",
      actual: techniqueId,
      expected: "unique TechniqueId",
    });
  }
  if (input.overlay.definitions.some((definition) => definition.techniqueId === techniqueId)) {
    issues.push({
      path: "/definition/techniqueId",
      message: "duplicate generated techniqueId in overlay",
      actual: techniqueId,
      expected: "unique TechniqueId",
    });
  }

  const lookup = new Map<string, TechniqueDefinition>();
  for (const definition of input.baseCatalog.definitions) {
    lookup.set(definition.techniqueId, definition);
  }
  for (const definition of input.overlay.definitions) {
    lookup.set(definition.techniqueId, definition);
  }

  for (const prerequisiteId of input.definition.prerequisiteTechniqueIds) {
    if (!lookup.has(prerequisiteId)) {
      issues.push({
        path: "/definition/prerequisiteTechniqueIds",
        message: "prerequisite technique must exist in base catalog or overlay",
        actual: prerequisiteId,
        expected: "known TechniqueId",
      });
    }
  }
  for (const sourceId of input.definition.sourceTechniqueIds) {
    if (!lookup.has(sourceId)) {
      issues.push({
        path: "/definition/sourceTechniqueIds",
        message: "source technique must exist in base catalog or overlay",
        actual: sourceId,
        expected: "known TechniqueId",
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const definitions = [...input.overlay.definitions, input.definition].sort((a, b) =>
    compareUnicodeCodePoints(a.techniqueId, b.techniqueId),
  );
  return success({
    schemaVersion: GENERATED_TECHNIQUE_CATALOG_OVERLAY_SCHEMA_VERSION,
    definitions,
  });
}

/** Base catalog identity is unchanged; overlay is auxiliary runtime surface only. */
export function assertBaseCatalogIdentityUnchanged(
  before: TechniqueCatalogIdentity,
  after: TechniqueCatalog,
): ValidationResult<TechniqueCatalogIdentity> {
  if (
    before.dataVersion !== after.identity.dataVersion ||
    before.catalogHash !== after.identity.catalogHash
  ) {
    return failure([
      {
        path: "/techniqueCatalog/identity",
        message: "base TechniqueCatalogIdentity must remain unchanged when registering overlay",
        actual: after.identity,
        expected: `${before.dataVersion}/${before.catalogHash}`,
      },
    ]);
  }
  return success(before);
}

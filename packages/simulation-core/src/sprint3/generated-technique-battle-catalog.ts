/**
 * S03-015 production battle technique lookup: merge immutable base catalog with optional overlay.
 */
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { hasOwn, snapshotPlainObjectOrFail } from "../sprint1/plain-data.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  type GeneratedTechniqueCatalogOverlay,
  validateGeneratedTechniqueCatalogOverlay,
} from "./generated-technique-catalog-overlay.js";

export function collectKnownTechniqueIdsForBattle(
  baseDefinitions: readonly TechniqueDefinition[],
  overlay?: GeneratedTechniqueCatalogOverlay,
): Set<string> {
  const ids = new Set(baseDefinitions.map((definition) => definition.techniqueId));
  if (overlay !== undefined) {
    for (const definition of overlay.definitions) {
      ids.add(definition.techniqueId);
    }
  }
  return ids;
}

export function buildBattleTechniqueDefinitionCatalogMap(
  baseDefinitions: readonly TechniqueDefinition[],
  overlay?: GeneratedTechniqueCatalogOverlay,
): Map<string, TechniqueDefinition> {
  const catalog = new Map<string, TechniqueDefinition>();
  for (const definition of baseDefinitions) {
    catalog.set(definition.techniqueId, definition);
  }
  if (overlay !== undefined) {
    for (const definition of overlay.definitions) {
      if (!catalog.has(definition.techniqueId)) {
        catalog.set(definition.techniqueId, definition);
      }
    }
  }
  return catalog;
}

export function mergeTechniqueDefinitionsForBattlePreflight(
  baseDefinitions: readonly TechniqueDefinition[],
  overlay?: GeneratedTechniqueCatalogOverlay,
): readonly TechniqueDefinition[] {
  if (overlay === undefined || overlay.definitions.length === 0) {
    return baseDefinitions;
  }
  return [...baseDefinitions, ...overlay.definitions];
}

export function readOptionalGeneratedTechniqueCatalogOverlay(
  container: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): GeneratedTechniqueCatalogOverlay | undefined {
  const object = snapshotPlainObjectOrFail(container, pathPrefix, issues);
  if (object === undefined) {
    return undefined;
  }
  if (!hasOwn(object, "generatedTechniqueCatalogOverlay")) {
    return undefined;
  }
  const overlayResult = validateGeneratedTechniqueCatalogOverlay(
    object["generatedTechniqueCatalogOverlay"],
    `${pathPrefix}/generatedTechniqueCatalogOverlay`,
  );
  if (!overlayResult.ok) {
    issues.push(...overlayResult.issues);
    return undefined;
  }
  return overlayResult.value;
}

export function readOptionalGeneratedTechniqueCatalogOverlayFromCreateBattleRequest(
  createBattleRequest: unknown,
): ValidationResult<GeneratedTechniqueCatalogOverlay | undefined> {
  const issues: ValidationIssue[] = [];
  const overlay = readOptionalGeneratedTechniqueCatalogOverlay(createBattleRequest, "", issues);
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(overlay);
}

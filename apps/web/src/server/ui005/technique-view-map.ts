/**
 * TechniqueView / TechniqueDefinitionView mapping (BRIDGE-045/069/080/081/098, TX-039/051/052/069).
 * Future owner: UI-005. Held techniqueStates only; TechniqueId asc; no synthetic catalog rows.
 */

import { TECHNIQUE_DEFINITION_KEYS, compareUnicodeCodePoints } from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import type { TechniqueDefinitionView, TechniqueView } from "./types.js";

export type PersonTechniqueStateSource = {
  techniqueId: string;
  learningProgressTenths: number;
  masteryHundredths: number;
  successfulUseCount: number;
  attemptedUseCount: number;
  lastPracticedAbsoluteWeek: number | null;
  acquiredAbsoluteWeek: number | null;
};

export type TechniqueCatalogEntry = {
  techniqueId: string;
  definition: Record<string, unknown>;
  learningProgressRequired: number;
};

function cloneDefinitionExact31(
  definition: Record<string, unknown>,
): PureResult<TechniqueDefinitionView> {
  const keys = Object.keys(definition);
  if (keys.length !== TECHNIQUE_DEFINITION_KEYS.length) {
    return fail("TechniqueDefinition key count drift");
  }
  for (const key of TECHNIQUE_DEFINITION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(definition, key)) {
      return fail(`TechniqueDefinition missing key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!(TECHNIQUE_DEFINITION_KEYS as readonly string[]).includes(key)) {
      return fail(`TechniqueDefinition extra key: ${key}`);
    }
  }
  const out: TechniqueDefinitionView = {};
  for (const key of TECHNIQUE_DEFINITION_KEYS) {
    out[key] = definition[key];
  }
  return ok(out);
}

export function mapTechniquesView(input: {
  techniqueStates: readonly PersonTechniqueStateSource[];
  catalogById: ReadonlyMap<string, TechniqueCatalogEntry>;
  learningFocusTechniqueId: string | null;
}): PureResult<{
  techniques: TechniqueView[];
  learningFocusTechniqueId: string | null;
}> {
  const seen = new Set<string>();
  for (const state of input.techniqueStates) {
    if (seen.has(state.techniqueId)) {
      return fail(`duplicate techniqueId: ${state.techniqueId}`);
    }
    seen.add(state.techniqueId);
  }

  const ordered = [...input.techniqueStates].sort((a, b) =>
    compareUnicodeCodePoints(a.techniqueId, b.techniqueId),
  );

  const techniques: TechniqueView[] = [];
  for (const state of ordered) {
    const entry = input.catalogById.get(state.techniqueId);
    if (entry === undefined) {
      return fail(`technique missing from catalog: ${state.techniqueId}`);
    }
    const definition = cloneDefinitionExact31(entry.definition);
    if (!definition.ok) {
      return definition;
    }
    const cap = entry.learningProgressRequired * 10;
    if (
      !Number.isInteger(state.learningProgressTenths) ||
      state.learningProgressTenths < 0 ||
      state.learningProgressTenths > cap
    ) {
      return fail(`learningProgressTenths out of range for ${state.techniqueId}`);
    }
    if (
      !Number.isInteger(state.masteryHundredths) ||
      state.masteryHundredths < 0 ||
      state.masteryHundredths > 10000
    ) {
      return fail(`masteryHundredths out of range for ${state.techniqueId}`);
    }
    const learnedState = state.acquiredAbsoluteWeek === null ? "learning" : "acquired";
    techniques.push({
      techniqueId: state.techniqueId,
      learnedState,
      learningProgressTenths: state.learningProgressTenths,
      masteryHundredths: state.masteryHundredths,
      successfulUseCount: state.successfulUseCount,
      attemptedUseCount: state.attemptedUseCount,
      lastPracticedAbsoluteWeek: state.lastPracticedAbsoluteWeek,
      acquiredAbsoluteWeek: state.acquiredAbsoluteWeek,
      definition: definition.value,
    });
  }

  const focus = input.learningFocusTechniqueId;
  if (focus !== null) {
    const held = techniques.filter((t) => t.techniqueId === focus);
    if (held.length !== 1) {
      return fail("learningFocusTechniqueId must match exactly one held technique");
    }
    if (!input.catalogById.has(focus)) {
      return fail("learningFocusTechniqueId not in catalog");
    }
  }

  return ok({ techniques, learningFocusTechniqueId: focus });
}
